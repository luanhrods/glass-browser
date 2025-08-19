class GlassBrowserApp {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
        this.settings = {};
        this.bookmarks = [];
        this.history = [];
        this.searchEngines = {
            google: 'https://www.google.com/search?q=',
            bing: 'https://www.bing.com/search?q=',
            duckduckgo: 'https://duckduckgo.com/?q='
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadBookmarks();
        await this.loadHistory();
        
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.createNewTab('https://www.google.com');
        this.applyTheme();
    }

    async loadSettings() {
        try {
            this.settings = await window.electronAPI.getSettings();
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            this.settings = {
                searchEngine: 'google',
                homepage: 'https://www.google.com',
                theme: 'auto',
                privacy: {
                    blockAds: true,
                    blockTrackers: true,
                    cookiePolicy: 'block-third-party'
                }
            };
        }
    }

    async loadBookmarks() {
        try {
            this.bookmarks = await window.electronAPI.getBookmarks();
        } catch (error) {
            console.error('Erro ao carregar bookmarks:', error);
            this.bookmarks = [];
        }
    }

    async loadHistory() {
        try {
            this.history = await window.electronAPI.getHistory();
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            this.history = [];
        }
    }

    setupEventListeners() {
        // Barra de endereços
        const addressInput = document.getElementById('address-input');
        addressInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.navigateToUrl(addressInput.value);
            }
        });

        addressInput.addEventListener('input', (e) => {
            this.showSuggestions(e.target.value);
        });

        // Botões de navegação
        document.getElementById('back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('forward-btn').addEventListener('click', () => this.goForward());
        document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());

        // Bookmarks
        document.getElementById('bookmark-btn').addEventListener('click', () => this.toggleBookmark());
        document.getElementById('bookmarks-btn').addEventListener('click', () => this.showBookmarks());

        // Histórico
        document.getElementById('history-btn').addEventListener('click', () => this.showHistory());

        // Configurações
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());

        // Nova aba
        document.getElementById('new-tab-btn').addEventListener('click', () => {
            this.createNewTab();
        });

        // Sidebar
        document.getElementById('close-sidebar-btn').addEventListener('click', () => {
            this.hideSidebar();
        });

        // Controles da barra de título (Windows)
        if (window.electronAPI.platform === 'win32') {
            document.getElementById('minimize-btn')?.addEventListener('click', () => {
                // Implementar minimizar
            });
            document.getElementById('maximize-btn')?.addEventListener('click', () => {
                // Implementar maximizar
            });
            document.getElementById('close-btn')?.addEventListener('click', () => {
                window.close();
            });
        }

        // Listener para mudanças de tema
        window.electronAPI.on('theme-changed', (event, theme) => {
            this.applyTheme(theme);
        });

        // Listener para nova aba externa
        window.electronAPI.on('new-tab', () => {
            this.createNewTab();
        });

        // Listener para navegação externa
        window.electronAPI.on('navigate-to', (event, url) => {
            this.navigateToUrl(url);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + T - Nova aba
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.createNewTab();
            }
            
            // Ctrl/Cmd + W - Fechar aba
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                if (this.tabs.size > 1) {
                    this.closeTab(this.activeTabId);
                }
            }
            
            // Ctrl/Cmd + N - Nova janela
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                window.electronAPI.newWindow();
            }
            
            // Ctrl/Cmd + L - Focar barra de endereços
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                document.getElementById('address-input').focus();
                document.getElementById('address-input').select();
            }
            
            // Ctrl/Cmd + R - Refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refresh();
            }
            
            // Alt + Left - Voltar
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goBack();
            }
            
            // Alt + Right - Avançar
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                this.goForward();
            }
            
            // Ctrl/Cmd + D - Adicionar bookmark
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleBookmark();
            }
            
            // Ctrl/Cmd + H - Mostrar histórico
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.showHistory();
            }
            
            // Ctrl/Cmd + Shift + B - Mostrar bookmarks
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                this.showBookmarks();
            }
            
            // Ctrl/Cmd + 1-9 - Mudar para aba específica
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabIds = Array.from(this.tabs.keys());
                if (tabIds[tabIndex]) {
                    this.switchToTab(tabIds[tabIndex]);
                }
            }
            
            // F12 - DevTools
            if (e.key === 'F12') {
                e.preventDefault();
                this.toggleDevTools();
            }
        });
    }

    createNewTab(url = null) {
        const tabId = ++this.tabCounter;
        const initialUrl = url || this.settings.homepage || 'https://www.google.com';
        
        // Criar webview
        const webview = document.createElement('webview');
        webview.id = `webview-${tabId}`;
        webview.className = 'webview';
        webview.src = initialUrl;
        webview.preload = './js/webview-preload.js';
        webview.allowpopups = true;
        webview.nodeintegration = false;
        webview.contextIsolation = true;
        
        // Adicionar webview ao container
        document.getElementById('webview-container').appendChild(webview);
        
        // Criar elemento de aba
        const tabElement = this.createTabElement(tabId, 'Carregando...', null);
        
        // Adicionar ao mapa de abas
        this.tabs.set(tabId, {
            element: tabElement,
            webview: webview,
            url: initialUrl,
            title: 'Carregando...',
            favicon: null,
            canGoBack: false,
            canGoForward: false,
            isLoading: true
        });
        
        // Configurar eventos da webview
        this.setupWebviewEvents(webview, tabId);
        
        // Ativar nova aba
        this.switchToTab(tabId);
        
        return tabId;
    }

    createTabElement(tabId, title, favicon) {
        const tabsContainer = document.getElementById('tabs-container');
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.setAttribute('data-tab-id', tabId);
        
        const faviconElement = document.createElement('img');
        faviconElement.className = 'tab-favicon';
        faviconElement.src = favicon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMkM0LjY4NiAyIDIgNC42ODYgMiA4QzIgMTEuMzE0IDQuNjg2IDE0IDggMTRDMTEuMzE0IDE0IDE0IDExLjMxNCAxNCA4QzE0IDQuNjg2IDExLjMxNCAyIDggMloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+';
        faviconElement.onerror = () => {
            faviconElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMkM0LjY4NiAyIDIgNC42ODYgMiA4QzIgMTEuMzE0IDQuNjg2IDE0IDggMTRDMTEuMzE0IDE0IDE0IDExLjMxNCAxNCA4QzE0IDQuNjg2IDExLjMxNCAyIDggMloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+';
        };
        
        const titleElement = document.createElement('span');
        titleElement.className = 'tab-title';
        titleElement.textContent = title;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'tab-close';
        closeButton.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" fill="none"/></svg>';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tabId);
        });
        
        tab.appendChild(faviconElement);
        tab.appendChild(titleElement);
        tab.appendChild(closeButton);
        
        tab.addEventListener('click', () => {
            this.switchToTab(tabId);
        });
        
        // Adicionar context menu para abas
        tab.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showTabContextMenu(e, tabId);
        });
        
        tabsContainer.appendChild(tab);
        
        return tab;
    }

    setupWebviewEvents(webview, tabId) {
        const tab = this.tabs.get(tabId);
        
        webview.addEventListener('dom-ready', () => {
            tab.isLoading = false;
            this.updateTabState(tabId);
        });
        
        webview.addEventListener('did-start-loading', () => {
            tab.isLoading = true;
            this.showLoading();
        });
        
        webview.addEventListener('did-stop-loading', () => {
            tab.isLoading = false;
            this.hideLoading();
            this.updateTabState(tabId);
        });
        
        webview.addEventListener('page-title-updated', (e) => {
            tab.title = e.title;
            tab.element.querySelector('.tab-title').textContent = e.title;
            if (tabId === this.activeTabId) {
                document.title = `${e.title} - Glass Browser`;
            }
        });
        
        webview.addEventListener('page-favicon-updated', (e) => {
            if (e.favicons && e.favicons.length > 0) {
                tab.favicon = e.favicons[0];
                tab.element.querySelector('.tab-favicon').src = e.favicons[0];
            }
        });
        
        webview.addEventListener('will-navigate', (e) => {
            tab.url = e.url;
            if (tabId === this.activeTabId) {
                document.getElementById('address-input').value = e.url;
            }
        });
        
        webview.addEventListener('did-navigate', (e) => {
            tab.url = e.url;
            if (tabId === this.activeTabId) {
                document.getElementById('address-input').value = e.url;
                this.updateNavigationButtons();
                this.updateSecurityIndicator(e.url);
                
                // Salvar no histórico
                this.saveToHistory({
                    url: e.url,
                    title: tab.title
                });
            }
        });
        
        webview.addEventListener('new-window', (e) => {
            e.preventDefault();
            this.createNewTab(e.url);
        });
        
        webview.addEventListener('context-menu', (e) => {
            this.showContextMenu(e);
        });
    }

    switchToTab(tabId) {
        // Desativar aba atual
        if (this.activeTabId) {
            const currentTab = this.tabs.get(this.activeTabId);
            if (currentTab) {
                currentTab.element.classList.remove('active');
                currentTab.webview.style.display = 'none';
            }
        }
        
        // Ativar nova aba
        const newTab = this.tabs.get(tabId);
        if (newTab) {
            newTab.element.classList.add('active');
            newTab.webview.style.display = 'block';
            this.activeTabId = tabId;
            
            // Atualizar UI
            document.getElementById('address-input').value = newTab.url;
            document.title = `${newTab.title} - Glass Browser`;
            this.updateNavigationButtons();
            this.updateSecurityIndicator(newTab.url);
            this.updateBookmarkButton();
        }
    }

    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        
        // Remover elementos do DOM
        tab.element.remove();
        tab.webview.remove();
        
        // Remover do mapa
        this.tabs.delete(tabId);
        
        // Se era a aba ativa, mudar para outra
        if (tabId === this.activeTabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchToTab(remainingTabs[remainingTabs.length - 1]);
            } else {
                // Se não há mais abas, criar uma nova
                this.createNewTab();
            }
        }
    }

    navigateToUrl(input) {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (!tab) return;
        
        let url = input.trim();
        
        // Se não parece uma URL, pesquisar
        if (!this.isValidUrl(url)) {
            const searchEngine = this.searchEngines[this.settings.searchEngine] || this.searchEngines.google;
            url = searchEngine + encodeURIComponent(url);
        } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        tab.webview.src = url;
        tab.url = url;
        document.getElementById('address-input').value = url;
    }

    isValidUrl(string) {
        try {
            new URL(string.startsWith('http') ? string : 'https://' + string);
            return true;
        } catch (_) {
            return false;
        }
    }

    goBack() {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.webview.canGoBack()) {
            tab.webview.goBack();
        }
    }

    goForward() {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.webview.canGoForward()) {
            tab.webview.goForward();
        }
    }

    refresh() {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab) {
            tab.webview.reload();
        }
    }

    updateNavigationButtons() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (!tab) return;
        
        const backBtn = document.getElementById('back-btn');
        const forwardBtn = document.getElementById('forward-btn');
        
        backBtn.disabled = !tab.webview.canGoBack();
        forwardBtn.disabled = !tab.webview.canGoForward();
    }

    updateSecurityIndicator(url) {
        const indicator = document.getElementById('security-indicator');
        const isSecure = url.startsWith('https://');
        
        indicator.style.color = isSecure ? 'var(--success-color)' : 'var(--warning-color)';
        indicator.title = isSecure ? 'Conexão segura' : 'Conexão não segura';
    }

    async updateBookmarkButton() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (!tab) return;
        
        const bookmarkBtn = document.getElementById('bookmark-btn');
        const isBookmarked = this.bookmarks.some(bookmark => bookmark.url === tab.url);
        
        bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
        bookmarkBtn.title = isBookmarked ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    }

    async toggleBookmark() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (!tab) return;
        
        const existingBookmark = this.bookmarks.find(b => b.url === tab.url);
        
        if (existingBookmark) {
            // Remover bookmark
            this.bookmarks = await window.electronAPI.removeBookmark(existingBookmark.id);
        } else {
            // Adicionar bookmark
            this.bookmarks = await window.electronAPI.saveBookmark({
                url: tab.url,
                title: tab.title,
                favicon: tab.favicon
            });
        }
        
        this.updateBookmarkButton();
    }

    async saveToHistory(item) {
        try {
            this.history = await window.electronAPI.saveHistory(item);
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    showBookmarks() {
        const sidebar = document.getElementById('sidebar');
        const sidebarTitle = document.getElementById('sidebar-title');
        const sidebarContent = document.getElementById('sidebar-content');
        
        sidebarTitle.textContent = 'Favoritos';
        sidebarContent.innerHTML = '';
        
        if (this.bookmarks.length === 0) {
            sidebarContent.innerHTML = '<p>Nenhum favorito encontrado</p>';
        } else {
            this.bookmarks.forEach(bookmark => {
                const item = document.createElement('div');
                item.className = 'bookmark-item';
                item.innerHTML = `
                    <img src="${bookmark.favicon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMkM0LjY4NiAyIDIgNC42ODYgMiA4QzIgMTEuMzE0IDQuNjg2IDE0IDggMTRDMTEuMzE0IDE0IDE0IDExLjMxNCAxNCA4QzE0IDQuNjg2IDExLjMxNCAyIDggMloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+'}" alt="Favicon">
                    <div class="bookmark-info">
                        <div class="bookmark-title">${bookmark.title}</div>
                        <div class="bookmark-url">${bookmark.url}</div>
                    </div>
                    <button class="remove-bookmark-btn" data-id="${bookmark.id}">×</button>
                `;
                
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('remove-bookmark-btn')) {
                        this.navigateToUrl(bookmark.url);
                        this.hideSidebar();
                    }
                });
                
                const removeBtn = item.querySelector('.remove-bookmark-btn');
                removeBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    this.bookmarks = await window.electronAPI.removeBookmark(bookmark.id);
                    this.showBookmarks();
                    this.updateBookmarkButton();
                });
                
                sidebarContent.appendChild(item);
            });
        }
        
        sidebar.classList.add('visible');
    }

    showHistory() {
        const sidebar = document.getElementById('sidebar');
        const sidebarTitle = document.getElementById('sidebar-title');
        const sidebarContent = document.getElementById('sidebar-content');
        
        sidebarTitle.textContent = 'Histórico';
        sidebarContent.innerHTML = '';
        
        if (this.history.length === 0) {
            sidebarContent.innerHTML = '<p>Nenhum histórico encontrado</p>';
        } else {
            // Agrupar por data
            const groupedHistory = this.groupHistoryByDate(this.history);
            
            Object.keys(groupedHistory).forEach(date => {
                const dateHeader = document.createElement('h4');
                dateHeader.textContent = date;
                dateHeader.className = 'history-date-header';
                sidebarContent.appendChild(dateHeader);
                
                groupedHistory[date].forEach(item => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    historyItem.innerHTML = `
                        <div class="history-info">
                            <div class="history-title">${item.title}</div>
                            <div class="history-url">${item.url}</div>
                            <div class="history-time">${new Date(item.visitedAt).toLocaleTimeString()}</div>
                        </div>
                    `;
                    
                    historyItem.addEventListener('click', () => {
                        this.navigateToUrl(item.url);
                        this.hideSidebar();
                    });
                    
                    sidebarContent.appendChild(historyItem);
                });
            });
            
            // Botão para limpar histórico
            const clearBtn = document.createElement('button');
            clearBtn.className = 'btn-secondary clear-history-btn';
            clearBtn.textContent = 'Limpar Histórico';
            clearBtn.addEventListener('click', async () => {
                if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
                    this.history = await window.electronAPI.clearHistory();
                    this.showHistory();
                }
            });
            sidebarContent.appendChild(clearBtn);
        }
        
        sidebar.classList.add('visible');
    }

    groupHistoryByDate(history) {
        const groups = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        history.forEach(item => {
            const itemDate = new Date(item.visitedAt).toDateString();
            let dateLabel;
            
            if (itemDate === today) {
                dateLabel = 'Hoje';
            } else if (itemDate === yesterday) {
                dateLabel = 'Ontem';
            } else {
                dateLabel = new Date(item.visitedAt).toLocaleDateString();
            }
            
            if (!groups[dateLabel]) {
                groups[dateLabel] = [];
            }
            groups[dateLabel].push(item);
        });
        
        return groups;
    }

    hideSidebar() {
        document.getElementById('sidebar').classList.remove('visible');
    }

    showSettings() {
        const modal = document.getElementById('settings-modal');
        
        // Carregar valores atuais
        document.getElementById('search-engine').value = this.settings.searchEngine;
        document.getElementById('homepage').value = this.settings.homepage;
        document.getElementById('theme').value = this.settings.theme;
        document.getElementById('block-ads').checked = this.settings.privacy.blockAds;
        document.getElementById('block-trackers').checked = this.settings.privacy.blockTrackers;
        
        modal.classList.add('visible');
    }

    showLoading() {
        document.getElementById('loading-overlay').classList.add('visible');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('visible');
    }

    updateTabState(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        
        // Atualizar estado de navegação
        if (tabId === this.activeTabId) {
            this.updateNavigationButtons();
        }
    }

    applyTheme(theme = null) {
        const targetTheme = theme || this.settings.theme;
        const body = document.body;
        
        body.removeAttribute('data-theme');
        
        if (targetTheme === 'light') {
            body.setAttribute('data-theme', 'light');
        } else if (targetTheme === 'dark') {
            body.setAttribute('data-theme', 'dark');
        } else {
            // Auto theme - usar preferência do sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    }

    toggleDevTools() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (tab) {
            if (tab.webview.isDevToolsOpened()) {
                tab.webview.closeDevTools();
            } else {
                tab.webview.openDevTools();
            }
        }
    }

    showSuggestions(query) {
        if (!query.trim()) return;
        
        // Implementar sugestões baseadas no histórico e bookmarks
        // Por agora, apenas um placeholder
    }

    showContextMenu(e) {
        // Implementar menu de contexto personalizado
        e.preventDefault();
    }

    showTabContextMenu(e, tabId) {
        // Implementar menu de contexto para abas
        e.preventDefault();
    }
}

// Inicializar aplicativo quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.browserApp = new GlassBrowserApp();
});
