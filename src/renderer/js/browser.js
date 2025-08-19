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
        this.applyTheme();
        
        // Mostrar controles do Windows se necessário
        if (window.electronAPI && window.electronAPI.platform === 'win32') {
            const titlebar = document.getElementById('titlebar');
            if (titlebar) titlebar.style.display = 'flex';
        }
        
        // Criar primeira aba
        this.createNewTab('https://www.google.com');
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
        if (addressInput) {
            addressInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.navigateToUrl(addressInput.value);
                }
            });

            addressInput.addEventListener('input', (e) => {
                this.showSuggestions(e.target.value);
            });
        }

        // Botões de navegação
        const backBtn = document.getElementById('back-btn');
        const forwardBtn = document.getElementById('forward-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        
        if (backBtn) backBtn.addEventListener('click', () => this.goBack());
        if (forwardBtn) forwardBtn.addEventListener('click', () => this.goForward());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refresh());

        // Bookmarks
        const bookmarkBtn = document.getElementById('bookmark-btn');
        const bookmarksBtn = document.getElementById('bookmarks-btn');
        
        if (bookmarkBtn) bookmarkBtn.addEventListener('click', () => this.toggleBookmark());
        if (bookmarksBtn) bookmarksBtn.addEventListener('click', () => this.showBookmarks());

        // Histórico
        const historyBtn = document.getElementById('history-btn');
        if (historyBtn) historyBtn.addEventListener('click', () => this.showHistory());

        // Configurações
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettings());

        // Nova aba
        const newTabBtn = document.getElementById('new-tab-btn');
        if (newTabBtn) {
            newTabBtn.addEventListener('click', () => {
                this.createNewTab();
            });
        }

        // Sidebar
        const closeSidebarBtn = document.getElementById('close-sidebar-btn');
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => {
                this.hideSidebar();
            });
        }

        // Controles da barra de título (Windows)
        if (window.electronAPI && window.electronAPI.platform === 'win32') {
            const minimizeBtn = document.getElementById('minimize-btn');
            const maximizeBtn = document.getElementById('maximize-btn');
            const closeBtn = document.getElementById('close-btn');
            
            if (minimizeBtn) minimizeBtn.addEventListener('click', () => {
                // Implementar minimizar via IPC se necessário
                console.log('Minimize clicked');
            });
            if (maximizeBtn) maximizeBtn.addEventListener('click', () => {
                // Implementar maximizar via IPC se necessário
                console.log('Maximize clicked');
            });
            if (closeBtn) closeBtn.addEventListener('click', () => {
                window.close();
            });
        }

        // Listeners para eventos do main process
        if (window.electronAPI) {
            window.electronAPI.on('new-tab', () => {
                this.createNewTab();
            });

            window.electronAPI.on('navigate-to', (event, url) => {
                this.navigateToUrl(url);
            });
            
            window.electronAPI.on('go-back', () => this.goBack());
            window.electronAPI.on('go-forward', () => this.goForward());
            window.electronAPI.on('reload-page', () => this.refresh());
            
            window.electronAPI.on('theme-changed', (event, theme) => {
                this.applyTheme(theme);
            });
        }
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
            
            // Ctrl/Cmd + L - Focar barra de endereços
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                const addressInput = document.getElementById('address-input');
                if (addressInput) {
                    addressInput.focus();
                    addressInput.select();
                }
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
        webview.allowpopups = true;
        webview.style.display = 'none'; // Oculto inicialmente
        
        // Adicionar webview ao container
        const webviewContainer = document.getElementById('webview-container');
        if (webviewContainer) {
            webviewContainer.appendChild(webview);
        }
        
        // Criar elemento de aba
        const tabElement = this.createTabElement(tabId, 'Nova aba', null);
        
        // Adicionar ao mapa de abas
        this.tabs.set(tabId, {
            element: tabElement,
            webview: webview,
            url: initialUrl,
            title: 'Nova aba',
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
        if (!tabsContainer) return null;
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.setAttribute('data-tab-id', tabId);
        
        const faviconElement = document.createElement('img');
        faviconElement.className = 'tab-favicon';
        faviconElement.src = favicon || this.getDefaultFavicon();
        faviconElement.onerror = () => {
            faviconElement.src = this.getDefaultFavicon();
        };
        
        const titleElement = document.createElement('span');
        titleElement.className = 'tab-title';
        titleElement.textContent = title;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'tab-close';
        closeButton.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" fill="none"/></svg>';
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
        
        tabsContainer.appendChild(tab);
        
        return tab;
    }

    getDefaultFavicon() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMkM0LjY4NiAyIDIgNC42ODYgMiA4QzIgMTEuMzE0IDQuNjg2IDE0IDggMTRDMTEuMzE0IDE0IDE0IDExLjMxNCAxNCA4QzE0IDQuNjg2IDExLjMxNCAyIDggMloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+';
    }

    setupWebviewEvents(webview, tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        
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
            tab.title = e.title || 'Sem título';
            const titleElement = tab.element?.querySelector('.tab-title');
            if (titleElement) {
                titleElement.textContent = tab.title;
            }
            
            if (tabId === this.activeTabId) {
                document.title = `${tab.title} - Glass Browser`;
            }
        });
        
        webview.addEventListener('page-favicon-updated', (e) => {
            if (e.favicons && e.favicons.length > 0) {
                tab.favicon = e.favicons[0];
                const faviconElement = tab.element?.querySelector('.tab-favicon');
                if (faviconElement) {
                    faviconElement.src = e.favicons[0];
                }
            }
        });
        
        webview.addEventListener('will-navigate', (e) => {
            tab.url = e.url;
            if (tabId === this.activeTabId) {
                const addressInput = document.getElementById('address-input');
                if (addressInput) {
                    addressInput.value = e.url;
                }
            }
        });
        
        webview.addEventListener('did-navigate', (e) => {
            tab.url = e.url;
            if (tabId === this.activeTabId) {
                const addressInput = document.getElementById('address-input');
                if (addressInput) {
                    addressInput.value = e.url;
                }
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
    }

    switchToTab(tabId) {
        // Desativar aba atual
        if (this.activeTabId) {
            const currentTab = this.tabs.get(this.activeTabId);
            if (currentTab) {
                currentTab.element?.classList.remove('active');
                if (currentTab.webview) {
                    currentTab.webview.style.display = 'none';
                }
            }
        }
        
        // Ativar nova aba
        const newTab = this.tabs.get(tabId);
        if (newTab) {
            newTab.element?.classList.add('active');
            if (newTab.webview) {
                newTab.webview.style.display = 'block';
            }
            this.activeTabId = tabId;
            
            // Atualizar UI
            const addressInput = document.getElementById('address-input');
            if (addressInput) {
                addressInput.value = newTab.url;
            }
            
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
        if (tab.element && tab.element.parentNode) {
            tab.element.parentNode.removeChild(tab.element);
        }
        if (tab.webview && tab.webview.parentNode) {
            tab.webview.parentNode.removeChild(tab.webview);
        }
        
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
        
        const addressInput = document.getElementById('address-input');
        if (addressInput) {
            addressInput.value = url;
        }
    }

    isValidUrl(string) {
        try {
            new URL(string.startsWith('http') ? string : 'https://' + string);
            return string.includes('.');
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
        
        if (backBtn) backBtn.disabled = !tab.webview.canGoBack();
        if (forwardBtn) forwardBtn.disabled = !tab.webview.canGoForward();
    }

    updateSecurityIndicator(url) {
        const indicator = document.getElementById('security-indicator');
        if (!indicator) return;
        
        const isSecure = url.startsWith('https://');
        
        indicator.style.color = isSecure ? 'var(--success-color)' : 'var(--warning-color)';
        indicator.title = isSecure ? 'Conexão segura' : 'Conexão não segura';
        indicator.style.display = 'flex';
    }

    async updateBookmarkButton() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (!tab) return;
        
        const bookmarkBtn = document.getElementById('bookmark-btn');
        if (!bookmarkBtn) return;
        
        const isBookmarked = this.bookmarks.some(bookmark => bookmark.url === tab.url);
        
        bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
        bookmarkBtn.title = isBookmarked ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    }

    async toggleBookmark() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (!tab || !window.electronAPI) return;
        
        try {
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
        } catch (error) {
            console.error('Erro ao gerenciar bookmark:', error);
        }
    }

    async saveToHistory(item) {
        if (!window.electronAPI) return;
        
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
        
        if (!sidebar || !sidebarTitle || !sidebarContent) return;
        
        sidebarTitle.textContent = 'Favoritos';
        sidebarContent.innerHTML = '';
        
        if (this.bookmarks.length === 0) {
            sidebarContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin: 20px;">Nenhum favorito encontrado</p>';
        } else {
            this.bookmarks.forEach(bookmark => {
                const item = document.createElement('div');
                item.className = 'bookmark-item';
                item.innerHTML = `
                    <img src="${bookmark.favicon || this.getDefaultFavicon()}" alt="Favicon" style="width: 16px; height: 16px; margin-right: 12px; border-radius: 2px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bookmark.title}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bookmark.url}</div>
                    </div>
                    <button class="remove-bookmark-btn" style="width: 20px; height: 20px; border: none; background: transparent; color: var(--text-secondary); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
                `;
                
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('remove-bookmark-btn')) {
                        this.navigateToUrl(bookmark.url);
                        this.hideSidebar();
                    }
                });
                
                const removeBtn = item.querySelector('.remove-bookmark-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        try {
                            this.bookmarks = await window.electronAPI.removeBookmark(bookmark.id);
                            this.showBookmarks();
                            this.updateBookmarkButton();
                        } catch (error) {
                            console.error('Erro ao remover bookmark:', error);
                        }
                    });
                }
                
                sidebarContent.appendChild(item);
            });
        }
        
        sidebar.classList.add('visible');
    }

    showHistory() {
        const sidebar = document.getElementById('sidebar');
        const sidebarTitle = document.getElementById('sidebar-title');
        const sidebarContent = document.getElementById('sidebar-content');
        
        if (!sidebar || !sidebarTitle || !sidebarContent) return;
        
        sidebarTitle.textContent = 'Histórico';
        sidebarContent.innerHTML = '';
        
        if (this.history.length === 0) {
            sidebarContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin: 20px;">Nenhum histórico encontrado</p>';
        } else {
            // Agrupar por data
            const groupedHistory = this.groupHistoryByDate(this.history.slice(0, 50));
            
            Object.keys(groupedHistory).forEach(date => {
                const dateHeader = document.createElement('h4');
                dateHeader.textContent = date;
                dateHeader.style.cssText = 'color: var(--text-primary); font-size: 14px; font-weight: 600; margin: 16px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid var(--border-color);';
                sidebarContent.appendChild(dateHeader);
                
                groupedHistory[date].forEach(item => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    historyItem.style.cssText = 'display: flex; align-items: center; padding: 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s; margin-bottom: 8px;';
                    
                    // Tentar extrair favicon da URL
                    const favicon = this.getFaviconFromUrl(item.url);
                    
                    historyItem.innerHTML = `
                        <img src="${favicon}" alt="Favicon" style="width: 16px; height: 16px; margin-right: 12px; border-radius: 2px;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.url}</div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${new Date(item.visitedAt).toLocaleTimeString()}</div>
                        </div>
                    `;
                    
                    historyItem.addEventListener('mouseenter', () => {
                        historyItem.style.background = 'var(--secondary-bg)';
                    });
                    
                    historyItem.addEventListener('mouseleave', () => {
                        historyItem.style.background = 'transparent';
                    });
                    
                    historyItem.addEventListener('click', () => {
                        this.navigateToUrl(item.url);
                        this.hideSidebar();
                    });
                    
                    sidebarContent.appendChild(historyItem);
                });
            });
            
            // Botão para limpar histórico
            const clearBtn = document.createElement('button');
            clearBtn.className = 'btn-secondary';
            clearBtn.style.cssText = 'width: 100%; margin-top: 16px;';
            clearBtn.textContent = 'Limpar Histórico';
            clearBtn.addEventListener('click', async () => {
                if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
                    try {
                        this.history = await window.electronAPI.clearHistory();
                        this.showHistory();
                    } catch (error) {
                        console.error('Erro ao limpar histórico:', error);
                    }
                }
            });
            sidebarContent.appendChild(clearBtn);
        }
        
        sidebar.classList.add('visible');
    }

    getFaviconFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`;
        } catch {
            return this.getDefaultFavicon();
        }
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
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('visible');
        }
    }

    showSettings() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;
        
        // Carregar valores atuais nos campos
        const searchEngine = document.getElementById('search-engine');
        const homepage = document.getElementById('homepage');
        const theme = document.getElementById('theme');
        const blockAds = document.getElementById('block-ads');
        const blockTrackers = document.getElementById('block-trackers');
        
        if (searchEngine) searchEngine.value = this.settings.searchEngine || 'google';
        if (homepage) homepage.value = this.settings.homepage || 'https://www.google.com';
        if (theme) theme.value = this.settings.theme || 'auto';
        if (blockAds) blockAds.checked = this.settings.privacy?.blockAds ?? true;
        if (blockTrackers) blockTrackers.checked = this.settings.privacy?.blockTrackers ?? true;
        
        modal.classList.add('visible');
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('visible');
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('visible');
        }
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

    showSuggestions(query) {
        if (!query.trim()) return;
        // TODO: Implementar sugestões baseadas no histórico e bookmarks
    }
}

// Inicializar aplicativo quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.browserApp = new GlassBrowserApp();
});
