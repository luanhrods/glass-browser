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
        
        this.showNotification('Configurações exportadas com sucesso', '
