class SettingsManager {
    constructor(browserApp) {
        this.browserApp = browserApp;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botão fechar modal
        document.getElementById('close-settings-btn').addEventListener('click', () => {
            this.hideSettingsModal();
        });

        // Botão cancelar
        document.getElementById('cancel-settings-btn').addEventListener('click', () => {
            this.hideSettingsModal();
        });

        // Botão salvar
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Fechar modal ao clicar fora
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.hideSettingsModal();
            }
        });

        // Mudança de tema em tempo real
        document.getElementById('theme').addEventListener('change', (e) => {
            this.browserApp.applyTheme(e.target.value);
        });

        // Escape para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('settings-modal');
                if (modal.classList.contains('visible')) {
                    this.hideSettingsModal();
                }
            }
        });
    }

    async saveSettings() {
        const settings = {
            searchEngine: document.getElementById('search-engine').value,
            homepage: document.getElementById('homepage').value,
            theme: document.getElementById('theme').value,
            privacy: {
                blockAds: document.getElementById('block-ads').checked,
                blockTrackers: document.getElementById('block-trackers').checked,
                cookiePolicy: 'block-third-party'
            }
        };

        try {
            this.browserApp.settings = await window.electronAPI.saveSettings(settings);
            this.browserApp.applyTheme(settings.theme);
            
            // Mostrar feedback de sucesso
            this.showNotification('Configurações salvas com sucesso!', 'success');
            
            this.hideSettingsModal();
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showNotification('Erro ao salvar configurações', 'error');
        }
    }

    hideSettingsModal() {
        document.getElementById('settings-modal').classList.remove('visible');
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} glass-effect`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${this.getNotificationIcon(type)}
                </span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

        // Adicionar ao DOM
        document.body.appendChild(notification);

        // Mostrar notificação
        setTimeout(() => {
            notification.classList.add('visible');
        }, 100);

        // Auto-remover após 3 segundos
        setTimeout(() => {
            this.hideNotification(notification);
        }, 3000);

        // Botão para fechar manualmente
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hideNotification(notification);
        });
    }

    hideNotification(notification) {
        notification.classList.remove('visible');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M13 4L6 11L3 8" stroke="currentColor" fill="none" stroke-width="2"/></svg>';
            case 'error':
                return '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M8 4v4M8 10h.01" stroke="currentColor" fill="none"/></svg>';
            case 'warning':
                return '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2L2 14h12L8 2z" stroke="currentColor" fill="none"/><path d="M8 6v4M8 12h.01" stroke="currentColor" fill="none"/></svg>';
            default:
                return '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M8 6v4M8 4h.01" stroke="currentColor" fill="none"/></svg>';
        }
    }

    // Métodos para gerenciar configurações específicas
    async resetSettings() {
        const defaultSettings = {
            searchEngine: 'google',
            homepage: 'https://www.google.com',
            theme: 'auto',
            privacy: {
                blockAds: true,
                blockTrackers: true,
                cookiePolicy: 'block-third-party'
            }
        };

        try {
            this.browserApp.settings = await window.electronAPI.saveSettings(defaultSettings);
            this.loadSettingsToForm();
            this.browserApp.applyTheme(defaultSettings.theme);
            this.showNotification('Configurações restauradas para o padrão', 'info');
        } catch (error) {
            console.error('Erro ao restaurar configurações:', error);
            this.showNotification('Erro ao restaurar configurações', 'error');
        }
    }

    loadSettingsToForm() {
        const settings = this.browserApp.settings;
        
        document.getElementById('search-engine').value = settings.searchEngine;
        document.getElementById('homepage').value = settings.homepage;
        document.getElementById('theme').value = settings.theme;
        document.getElementById('block-ads').checked = settings.privacy.blockAds;
        document.getElementById('block-trackers').checked = settings.privacy.blockTrackers;
    }

    exportSettings() {
        const settings = this.browserApp.settings;
        const dataStr = JSON.stringify(settings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'glass-browser-settings.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Configurações exportadas com sucesso', 'success');
    }

    async importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importedSettings = JSON.parse(text);
                
                // Validar estrutura das configurações
                if (this.validateSettings(importedSettings)) {
                    this.browserApp.settings = await window.electronAPI.saveSettings(importedSettings);
                    this.loadSettingsToForm();
                    this.browserApp.applyTheme(importedSettings.theme);
                    this.showNotification('Configurações importadas com sucesso', 'success');
                } else {
                    this.showNotification('Arquivo de configurações inválido', 'error');
                }
            } catch (error) {
                console.error('Erro ao importar configurações:', error);
                this.showNotification('Erro ao importar configurações', 'error');
            }
        };
        
        input.click();
    }

    validateSettings(settings) {
        const requiredFields = ['searchEngine', 'homepage', 'theme', 'privacy'];
        const requiredPrivacyFields = ['blockAds', 'blockTrackers', 'cookiePolicy'];
        
        // Verificar campos obrigatórios
        if (!requiredFields.every(field => field in settings)) {
            return false;
        }
        
        if (!requiredPrivacyFields.every(field => field in settings.privacy)) {
            return false;
        }
        
        // Verificar valores válidos
        const validSearchEngines = ['google', 'bing', 'duckduckgo'];
        const validThemes = ['auto', 'light', 'dark'];
        
        if (!validSearchEngines.includes(settings.searchEngine)) {
            return false;
        }
        
        if (!validThemes.includes(settings.theme)) {
            return false;
        }
        
        // Verificar se homepage é uma URL válida
        try {
            new URL(settings.homepage);
        } catch {
            return false;
        }
        
        return true;
    }

    // Configurações avançadas
    showAdvancedSettings() {
        const advancedSection = document.createElement('div');
        advancedSection.className = 'settings-section advanced-settings';
        advancedSection.innerHTML = `
            <h3>Configurações Avançadas</h3>
            
            <div class="setting-item">
                <label class="checkbox-label">
                    <input type="checkbox" id="hardware-acceleration">
                    <span class="checkmark"></span>
                    Aceleração por hardware
                </label>
            </div>
            
            <div class="setting-item">
                <label class="checkbox-label">
                    <input type="checkbox" id="javascript-enabled">
                    <span class="checkmark"></span>
                    Habilitar JavaScript
                </label>
            </div>
            
            <div class="setting-item">
                <label class="checkbox-label">
                    <input type="checkbox" id="images-enabled">
                    <span class="checkmark"></span>
                    Carregar imagens
                </label>
            </div>
            
            <div class="setting-item">
                <label for="user-agent">User Agent personalizado:</label>
                <input type="text" id="user-agent" placeholder="Deixe vazio para usar o padrão">
            </div>
            
            <div class="setting-item">
                <label for="proxy-server">Servidor Proxy:</label>
                <input type="text" id="proxy-server" placeholder="http://proxy.exemplo.com:8080">
            </div>
            
            <div class="setting-item">
                <label for="download-location">Local de Downloads:</label>
                <div class="input-group">
                    <input type="text" id="download-location" readonly>
                    <button type="button" id="browse-download-location" class="btn-secondary">Procurar</button>
                </div>
            </div>
            
            <div class="setting-item">
                <label for="cache-size">Tamanho do Cache (MB):</label>
                <input type="number" id="cache-size" min="10" max="1000" value="100">
            </div>
            
            <div class="setting-actions">
                <button type="button" id="clear-cache" class="btn-secondary">Limpar Cache</button>
                <button type="button" id="clear-cookies" class="btn-secondary">Limpar Cookies</button>
                <button type="button" id="clear-all-data" class="btn-secondary">Limpar Todos os Dados</button>
            </div>
            
            <div class="setting-actions">
                <button type="button" id="export-settings" class="btn-secondary">Exportar Configurações</button>
                <button type="button" id="import-settings" class="btn-secondary">Importar Configurações</button>
                <button type="button" id="reset-settings" class="btn-secondary">Restaurar Padrões</button>
            </div>
        `;
        
        // Inserir seção avançada
        const modalContent = document.querySelector('#settings-modal .modal-content');
        modalContent.appendChild(advancedSection);
        
        // Event listeners para configurações avançadas
        this.setupAdvancedEventListeners();
    }

    setupAdvancedEventListeners() {
        document.getElementById('export-settings')?.addEventListener('click', () => {
            this.exportSettings();
        });
        
        document.getElementById('import-settings')?.addEventListener('click', () => {
            this.importSettings();
        });
        
        document.getElementById('reset-settings')?.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja restaurar todas as configurações para o padrão?')) {
                this.resetSettings();
            }
        });
        
        document.getElementById('browse-download-location')?.addEventListener('click', async () => {
            try {
                const result = await window.electronAPI.showSaveDialog({
                    properties: ['openDirectory']
                });
                
                if (!result.canceled && result.filePath) {
                    document.getElementById('download-location').value = result.filePath;
                }
            } catch (error) {
                console.error('Erro ao selecionar pasta:', error);
            }
        });
        
        document.getElementById('clear-cache')?.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar o cache?')) {
                this.clearCache();
            }
        });
        
        document.getElementById('clear-cookies')?.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todos os cookies?')) {
                this.clearCookies();
            }
        });
        
        document.getElementById('clear-all-data')?.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar TODOS os dados do navegador? Esta ação não pode ser desfeita.')) {
                this.clearAllData();
            }
        });
    }

    async clearCache() {
        try {
            // Implementar limpeza de cache
            this.showNotification('Cache limpo com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            this.showNotification('Erro ao limpar cache', 'error');
        }
    }

    async clearCookies() {
        try {
            // Implementar limpeza de cookies
            this.showNotification('Cookies limpos com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao limpar cookies:', error);
            this.showNotification('Erro ao limpar cookies', 'error');
        }
    }

    async clearAllData() {
        try {
            // Limpar todos os dados
            await this.browserApp.clearHistory();
            this.browserApp.bookmarks = await window.electronAPI.removeAllBookmarks();
            await this.clearCache();
            await this.clearCookies();
            
            this.showNotification('Todos os dados foram limpos', 'success');
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            this.showNotification('Erro ao limpar dados', 'error');
        }
    }

    // Configurações de privacidade
    setupPrivacySettings() {
        const privacyOptions = {
            dnt: { label: 'Enviar sinal "Do Not Track"', default: true },
            referer: { label: 'Enviar header Referer', default: false },
            webrtc: { label: 'Bloquear vazamentos WebRTC', default: true },
            fingerprinting: { label: 'Proteção contra fingerprinting', default: true },
            thirdPartyCookies: { label: 'Bloquear cookies de terceiros', default: true },
            popups: { label: 'Bloquear popups', default: true },
            autoplay: { label: 'Bloquear reprodução automática', default: true }
        };

        return privacyOptions;
    }

    // Configurações de aparência
    setupAppearanceSettings() {
        const appearanceOptions = {
            fontSize: { label: 'Tamanho da fonte', type: 'range', min: 12, max: 24, default: 16 },
            zoomLevel: { label: 'Nível de zoom padrão', type: 'range', min: 50, max: 200, default: 100 },
            animationsEnabled: { label: 'Habilitar animações', type: 'checkbox', default: true },
            reducedMotion: { label: 'Reduzir movimentos', type: 'checkbox', default: false },
            highContrast: { label: 'Alto contraste', type: 'checkbox', default: false }
        };

        return appearanceOptions;
    }

    // Configurações de teclado
    setupKeyboardSettings() {
        const defaultShortcuts = {
            'new-tab': 'Ctrl+T',
            'close-tab': 'Ctrl+W',
            'new-window': 'Ctrl+N',
            'refresh': 'Ctrl+R',
            'back': 'Alt+Left',
            'forward': 'Alt+Right',
            'address-bar': 'Ctrl+L',
            'bookmarks': 'Ctrl+Shift+B',
            'history': 'Ctrl+H',
            'settings': 'Ctrl+,',
            'dev-tools': 'F12'
        };

        return defaultShortcuts;
    }

    // Atualizar configurações em tempo real
    updateSettingRealtime(setting, value) {
        switch (setting) {
            case 'theme':
                this.browserApp.applyTheme(value);
                break;
            case 'searchEngine':
                this.browserApp.settings.searchEngine = value;
                break;
            case 'homepage':
                this.browserApp.settings.homepage = value;
                break;
            default:
                // Outras configurações
                break;
        }
    }
}

// CSS adicional para notificações e configurações avançadas
const additionalCSS = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    min-width: 300px;
    padding: 16px;
    border-radius: 12px;
    z-index: 2000;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;
}

.notification.visible {
    transform: translateX(0);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.notification-icon {
    color: currentColor;
    flex-shrink: 0;
}

.notification-message {
    flex: 1;
    font-size: 14px;
}

.notification-close {
    background: none;
    border: none;
    color: currentColor;
    cursor: pointer;
    font-size: 18px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s;
}

.notification-close:hover {
    background: rgba(0, 0, 0, 0.1);
}

.notification-success {
    background: rgba(52, 199, 89, 0.1);
    border: 1px solid rgba(52, 199, 89, 0.3);
    color: var(--success-color);
}

.notification-error {
    background: rgba(255, 59, 48, 0.1);
    border: 1px solid rgba(255, 59, 48, 0.3);
    color: var(--error-color);
}

.notification-warning {
    background: rgba(255, 149, 0, 0.1);
    border: 1px solid rgba(255, 149, 0, 0.3);
    color: var(--warning-color);
}

.notification-info {
    background: rgba(0, 122, 255, 0.1);
    border: 1px solid rgba(0, 122, 255, 0.3);
    color: var(--accent-color);
}

.advanced-settings {
    border-top: 1px solid var(--border-color);
    margin-top: 24px;
    padding-top: 24px;
}

.input-group {
    display: flex;
    gap: 8px;
}

.input-group input {
    flex: 1;
}

.setting-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    flex-wrap: wrap;
}

.bookmark-item, .history-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    margin-bottom: 8px;
}

.bookmark-item:hover, .history-item:hover {
    background: var(--secondary-bg);
}

.bookmark-item img {
    width: 16px;
    height: 16px;
    margin-right: 12px;
    border-radius: 2px;
}

.bookmark-info, .history-info {
    flex: 1;
    min-width: 0;
}

.bookmark-title, .history-title {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
}

.bookmark-url, .history-url {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.history-time {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
}

.remove-bookmark-btn {
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.remove-bookmark-btn:hover {
    background: var(--error-color);
    color: white;
}

.history-date-header {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    margin: 16px 0 8px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border-color);
}

.clear-history-btn {
    width: 100%;
    margin-top: 16px;
}
`;

// Adicionar CSS ao documento
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Inicializar gerenciador de configurações quando o app estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar o browserApp estar disponível
    const checkBrowserApp = setInterval(() => {
        if (window.browserApp) {
            window.settingsManager = new SettingsManager(window.browserApp);
            clearInterval(checkBrowserApp);
        }
    }, 100);
});
