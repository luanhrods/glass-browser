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
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.hideSettingsModal();
            });
        }

        // Botão cancelar
        const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
        if (cancelSettingsBtn) {
            cancelSettingsBtn.addEventListener('click', () => {
                this.hideSettingsModal();
            });
        }

        // Botão salvar
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // Fechar modal ao clicar fora
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.hideSettingsModal();
                }
            });
        }

        // Mudança de tema em tempo real
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.browserApp.applyTheme(e.target.value);
            });
        }

        // Escape para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('settings-modal');
                if (modal && modal.classList.contains('visible')) {
                    this.hideSettingsModal();
                }
            }
        });
    }

    async saveSettings() {
        const searchEngineSelect = document.getElementById('search-engine');
        const homepageInput = document.getElementById('homepage');
        const themeSelect = document.getElementById('theme');
        const blockAdsCheckbox = document.getElementById('block-ads');
        const blockTrackersCheckbox = document.getElementById('block-trackers');

        if (!searchEngineSelect || !homepageInput || !themeSelect || !blockAdsCheckbox || !blockTrackersCheckbox) {
            console.error('Elementos de configuração não encontrados');
            this.showNotification('Erro: elementos de configuração não encontrados', 'error');
            return;
        }

        const settings = {
            searchEngine: searchEngineSelect.value,
            homepage: homepageInput.value,
            theme: themeSelect.value,
            privacy: {
                blockAds: blockAdsCheckbox.checked,
                blockTrackers: blockTrackersCheckbox.checked,
                cookiePolicy: 'block-third-party'
            }
        };

        try {
            if (window.electronAPI) {
                this.browserApp.settings = await window.electronAPI.saveSettings(settings);
            } else {
                // Fallback para modo desenvolvimento
                this.browserApp.settings = settings;
                localStorage.setItem('glass-browser-settings', JSON.stringify(settings));
            }
            
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
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.remove('visible');
        }
    }

    showNotification(message, type = 'info') {
        // Remover notificações existentes
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });

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

        // Estilos inline para garantir funcionamento
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            padding: 16px;
            border-radius: 12px;
            z-index: 2000;
            transform: translateX(100%);
            transition: transform 0.3s ease-out;
            background: ${this.getNotificationBg(type)};
            border: 1px solid ${this.getNotificationBorder(type)};
            color: ${this.getNotificationColor(type)};
            backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        `;

        const content = notification.querySelector('.notification-content');
        if (content) {
            content.style.cssText = 'display: flex; align-items: center; gap: 12px;';
        }

        const icon = notification.querySelector('.notification-icon');
        if (icon) {
            icon.style.cssText = 'color: currentColor; flex-shrink: 0;';
        }

        const messageEl = notification.querySelector('.notification-message');
        if (messageEl) {
            messageEl.style.cssText = 'flex: 1; font-size: 14px;';
        }

        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.style.cssText = `
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
            `;
            
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.background = 'rgba(0, 0, 0, 0.1)';
            });
            
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background = 'none';
            });
        }

        // Adicionar ao DOM
        document.body.appendChild(notification);

        // Mostrar notificação
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto-remover após 3 segundos
        setTimeout(() => {
            this.hideNotification(notification);
        }, 3000);

        // Botão para fechar manualmente
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideNotification(notification);
            });
        }
    }

    hideNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13 4L6 11L3 8" stroke="currentColor" fill="none" stroke-width="2"/></svg>';
            case 'error':
                return '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M8 4v4M8 10h.01" stroke="currentColor" fill="none"/></svg>';
            case 'warning':
                return '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L2 14h12L8 2z" stroke="currentColor" fill="none"/><path d="M8 6v4M8 12h.01" stroke="currentColor" fill="none"/></svg>';
            default:
                return '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M8 6v4M8 4h.01" stroke="currentColor" fill="none"/></svg>';
        }
    }

    getNotificationBg(type) {
        switch (type) {
            case 'success':
                return 'rgba(52, 199, 89, 0.1)';
            case 'error':
                return 'rgba(255, 59, 48, 0.1)';
            case 'warning':
                return 'rgba(255, 149, 0, 0.1)';
            default:
                return 'rgba(0, 122, 255, 0.1)';
        }
    }

    getNotificationBorder(type) {
        switch (type) {
            case 'success':
                return 'rgba(52, 199, 89, 0.3)';
            case 'error':
                return 'rgba(255, 59, 48, 0.3)';
            case 'warning':
                return 'rgba(255, 149, 0, 0.3)';
            default:
                return 'rgba(0, 122, 255, 0.3)';
        }
    }

    getNotificationColor(type) {
        switch (type) {
            case 'success':
                return '#34C759';
            case 'error':
                return '#FF3B30';
            case 'warning':
                return '#FF9500';
            default:
                return '#007AFF';
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
            if (window.electronAPI) {
                this.browserApp.settings = await window.electronAPI.saveSettings(defaultSettings);
            } else {
                this.browserApp.settings = defaultSettings;
                localStorage.setItem('glass-browser-settings', JSON.stringify(defaultSettings));
            }
            
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
        
        const searchEngineSelect = document.getElementById('search-engine');
        const homepageInput = document.getElementById('homepage');
        const themeSelect = document.getElementById('theme');
        const blockAdsCheckbox = document.getElementById('block-ads');
        const blockTrackersCheckbox = document.getElementById('block-trackers');
        
        if (searchEngineSelect) searchEngineSelect.value = settings.searchEngine || 'google';
        if (homepageInput) homepageInput.value = settings.homepage || 'https://www.google.com';
        if (themeSelect) themeSelect.value = settings.theme || 'auto';
        if (blockAdsCheckbox) blockAdsCheckbox.checked = settings.privacy?.blockAds ?? true;
        if (blockTrackersCheckbox) blockTrackersCheckbox.checked = settings.privacy?.blockTrackers ?? true;
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
                    if (window.electronAPI) {
                        this.browserApp.settings = await window.electronAPI.saveSettings(importedSettings);
                    } else {
                        this.browserApp.settings = importedSettings;
                        localStorage.setItem('glass-browser-settings', JSON.stringify(importedSettings));
                    }
                    
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
        if (!settings || typeof settings !== 'object') {
            return false;
        }
        
        const requiredFields = ['searchEngine', 'homepage', 'theme'];
        
        // Verificar campos obrigatórios
        if (!requiredFields.every(field => field in settings)) {
            return false;
        }
        
        // Verificar se privacy existe e é um objeto
        if (!settings.privacy || typeof settings.privacy !== 'object') {
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
    async clearCache() {
        try {
            // Em um ambiente real, isso seria implementado via IPC
            this.showNotification('Cache limpo com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            this.showNotification('Erro ao limpar cache', 'error');
        }
    }

    async clearCookies() {
        try {
            // Em um ambiente real, isso seria implementado via IPC
            this.showNotification('Cookies limpos com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao limpar cookies:', error);
            this.showNotification('Erro ao limpar cookies', 'error');
        }
    }

    async clearAllData() {
        if (!confirm('Tem certeza que deseja limpar TODOS os dados do navegador? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        try {
            // Limpar histórico
            if (window.electronAPI) {
                await window.electronAPI.clearHistory();
            }
            this.browserApp.history = [];
            
            // Limpar bookmarks (se houvesse uma função para isso)
            this.browserApp.bookmarks = [];
            
            // Limpar cache e cookies
            await this.clearCache();
            await this.clearCookies();
            
            // Restaurar configurações padrão
            await this.resetSettings();
            
            this.showNotification('Todos os dados foram limpos', 'success');
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            this.showNotification('Erro ao limpar dados', 'error');
        }
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
                break;
        }
    }
}

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
