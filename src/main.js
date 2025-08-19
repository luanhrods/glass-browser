const { app, BrowserWindow, Menu, ipcMain, shell, dialog, session } = require('electron');
const path = require('path');

// Importações condicionais para evitar erros
let Store, autoUpdater;
try {
    Store = require('electron-store');
} catch (error) {
    console.log('electron-store não encontrado, usando fallback');
    // Fallback simples se electron-store não estiver disponível
    Store = class {
        constructor() { this.data = {}; }
        get(key, defaultValue) { return this.data[key] || defaultValue; }
        set(key, value) { this.data[key] = value; }
    };
}

try {
    autoUpdater = require('electron-updater').autoUpdater;
} catch (error) {
    console.log('electron-updater não encontrado');
    autoUpdater = null;
}

// Configuração de armazenamento
const store = new Store();

class GlassBrowser {
    constructor() {
        this.windows = new Set();
        this.isReady = false;
        this.setupApp();
    }

    setupApp() {
        // Configuração de segurança
        app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
        app.commandLine.appendSwitch('ignore-certificate-errors-spki-list');
        app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

        app.whenReady().then(() => {
            this.isReady = true;
            this.setupSession();
            this.createMainWindow();
            this.setupIPC();
            this.setupMenu();
            
            // Auto-updater (se disponível)
            if (autoUpdater) {
                autoUpdater.checkForUpdatesAndNotify();
            }
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createMainWindow();
            }
        });

        app.on('web-contents-created', (event, contents) => {
            // Configurações de segurança para webContents
            contents.setWindowOpenHandler(({ url }) => {
                // Permitir que links se abram na mesma janela ou criar nova
                shell.openExternal(url);
                return { action: 'deny' };
            });
        });
    }

    setupSession() {
        const ses = session.defaultSession;
        
        // Configurar permissões
        ses.setPermissionRequestHandler((webContents, permission, callback) => {
            const allowedPermissions = ['notifications', 'fullscreen', 'pointerLock', 'media'];
            callback(allowedPermissions.includes(permission));
        });

        // Bloquear anúncios básicos
        ses.webRequest.onBeforeRequest({ urls: ['*://*.doubleclick.net/*', '*://*.googlesyndication.com/*'] }, (details, callback) => {
            callback({ cancel: true });
        });

        // Headers de segurança
        ses.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': ['script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https:']
                }
            });
        });
    }

    createMainWindow() {
        const windowState = store.get('windowState', {
            width: 1200,
            height: 800,
            x: undefined,
            y: undefined
        });

        const mainWindow = new BrowserWindow({
            ...windowState,
            minWidth: 800,
            minHeight: 600,
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            titleBarOverlay: process.platform === 'win32' ? {
                color: '#1a1a1a',
                symbolColor: '#ffffff',
                height: 32
            } : false,
            frame: process.platform !== 'darwin', // Frame apenas no Windows/Linux
            backgroundColor: '#1a1a1a',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: true,
                allowRunningInsecureContent: false,
                webviewTag: true // Necessário para usar webview
            },
            show: false,
            icon: this.getAppIcon()
        });

        // Mostrar janela quando estiver pronta
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            
            // Abrir DevTools apenas em desenvolvimento
            if (process.env.NODE_ENV === 'development') {
                mainWindow.webContents.openDevTools();
            }
        });

        // Carregar a interface principal
        mainWindow.loadFile(path.join(__dirname, 'index.html'));

        // Salvar estado da janela
        const saveWindowState = () => {
            if (!mainWindow.isDestroyed()) {
                const bounds = mainWindow.getBounds();
                store.set('windowState', bounds);
            }
        };

        mainWindow.on('close', saveWindowState);
        mainWindow.on('resize', saveWindowState);
        mainWindow.on('move', saveWindowState);

        this.windows.add(mainWindow);

        mainWindow.on('closed', () => {
            this.windows.delete(mainWindow);
        });

        // Remover menu padrão no Windows/Linux
        if (process.platform !== 'darwin') {
            mainWindow.setMenuBarVisibility(false);
        }

        // Interceptar tentativas de navegação da janela principal
        mainWindow.webContents.on('will-navigate', (event, url) => {
            if (url !== mainWindow.webContents.getURL()) {
                event.preventDefault();
            }
        });

        return mainWindow;
    }

    getAppIcon() {
        // Tentar encontrar ícone da aplicação
        const iconPaths = [
            path.join(__dirname, '../assets/icon.png'),
            path.join(__dirname, '../assets/icon.ico'),
            path.join(__dirname, 'assets/icon.png'),
            path.join(__dirname, 'assets/icon.ico')
        ];

        for (const iconPath of iconPaths) {
            try {
                require('fs').accessSync(iconPath);
                return iconPath;
            } catch (error) {
                continue;
            }
        }
        
        return undefined; // Usar ícone padrão do sistema
    }

    createNewWindow(url = null) {
        const newWindow = this.createMainWindow();
        if (url) {
            newWindow.webContents.once('ready-to-show', () => {
                newWindow.webContents.send('navigate-to', url);
            });
        }
        return newWindow;
    }

    setupIPC() {
        // Bookmarks
        ipcMain.handle('get-bookmarks', () => {
            return store.get('bookmarks', []);
        });

        ipcMain.handle('save-bookmark', (event, bookmark) => {
            const bookmarks = store.get('bookmarks', []);
            const newBookmark = {
                ...bookmark,
                id: Date.now(),
                createdAt: new Date().toISOString()
            };
            bookmarks.push(newBookmark);
            store.set('bookmarks', bookmarks);
            return bookmarks;
        });

        ipcMain.handle('remove-bookmark', (event, id) => {
            const bookmarks = store.get('bookmarks', []);
            const filtered = bookmarks.filter(b => b.id !== id);
            store.set('bookmarks', filtered);
            return filtered;
        });

        // History
        ipcMain.handle('get-history', () => {
            return store.get('history', []);
        });

        ipcMain.handle('save-history', (event, historyItem) => {
            const history = store.get('history', []);
            const existingIndex = history.findIndex(h => h.url === historyItem.url);
            
            const newItem = {
                ...historyItem,
                visitedAt: new Date().toISOString(),
                id: existingIndex >= 0 ? history[existingIndex].id : Date.now()
            };
            
            if (existingIndex >= 0) {
                history[existingIndex] = newItem;
            } else {
                history.unshift(newItem);
            }
            
            // Manter apenas os últimos 1000 itens
            const trimmedHistory = history.slice(0, 1000);
            store.set('history', trimmedHistory);
            return trimmedHistory;
        });

        ipcMain.handle('clear-history', () => {
            store.set('history', []);
            return [];
        });

        // Settings
        ipcMain.handle('get-settings', () => {
            return store.get('settings', {
                searchEngine: 'google',
                homepage: 'https://www.google.com',
                theme: 'auto',
                privacy: {
                    blockAds: true,
                    blockTrackers: true,
                    cookiePolicy: 'block-third-party'
                },
                general: {
                    showBookmarksBar: true,
                    openLinksInNewTab: false,
                    downloadLocation: app.getPath('downloads')
                }
            });
        });

        ipcMain.handle('save-settings', (event, settings) => {
            const currentSettings = store.get('settings', {});
            const newSettings = { ...currentSettings, ...settings };
            store.set('settings', newSettings);
            return newSettings;
        });

        // Window management
        ipcMain.handle('new-window', (event, url) => {
            return this.createNewWindow(url);
        });

        ipcMain.handle('close-window', (event) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window) {
                window.close();
            }
        });

        // External links
        ipcMain.handle('open-external', (event, url) => {
            shell.openExternal(url);
        });

        // File operations
        ipcMain.handle('show-save-dialog', async (event, options) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            const result = await dialog.showSaveDialog(window, options);
            return result;
        });

        ipcMain.handle('show-open-dialog', async (event, options) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            const result = await dialog.showOpenDialog(window, options);
            return result;
        });

        // App info
        ipcMain.handle('get-app-version', () => {
            return app.getVersion();
        });

        ipcMain.handle('get-app-name', () => {
            return app.getName();
        });

        // Zoom controls
        ipcMain.handle('zoom-in', (event) => {
            const webContents = event.sender;
            webContents.setZoomLevel(webContents.getZoomLevel() + 0.5);
        });

        ipcMain.handle('zoom-out', (event) => {
            const webContents = event.sender;
            webContents.setZoomLevel(webContents.getZoomLevel() - 0.5);
        });

        ipcMain.handle('zoom-reset', (event) => {
            const webContents = event.sender;
            webContents.setZoomLevel(0);
        });
    }

    setupMenu() {
        if (process.platform === 'darwin') {
            const template = [
                {
                    label: app.getName(),
                    submenu: [
                        { role: 'about' },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide' },
                        { role: 'hideothers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit' }
                    ]
                },
                {
                    label: 'Arquivo',
                    submenu: [
                        {
                            label: 'Nova Janela',
                            accelerator: 'CmdOrCtrl+N',
                            click: () => this.createNewWindow()
                        },
                        {
                            label: 'Nova Aba',
                            accelerator: 'CmdOrCtrl+T',
                            click: () => {
                                const focusedWindow = BrowserWindow.getFocusedWindow();
                                if (focusedWindow) {
                                    focusedWindow.webContents.send('new-tab');
                                }
                            }
                        },
                        { type: 'separator' },
                        {
                            label: 'Fechar Aba',
                            accelerator: 'CmdOrCtrl+W',
                            click: () => {
                                const focusedWindow = BrowserWindow.getFocusedWindow();
                                if (focusedWindow) {
                                    focusedWindow.webContents.send('close-tab');
                                }
                            }
                        }
                    ]
                },
                {
                    label: 'Editar',
                    submenu: [
                        { role: 'undo' },
                        { role: 'redo' },
                        { type: 'separator' },
                        { role: 'cut' },
                        { role: 'copy' },
                        { role: 'paste' },
                        { role: 'selectall' }
                    ]
                },
                {
                    label: 'Visualizar',
                    submenu: [
                        { role: 'reload' },
                        { role: 'forceReload' },
                        { role: 'toggleDevTools' },
                        { type: 'separator' },
                        { role: 'resetZoom' },
                        { role: 'zoomIn' },
                        { role: 'zoomOut' },
                        { type: 'separator' },
                        { role: 'togglefullscreen' }
                    ]
                },
                {
                    label: 'Ir',
                    submenu: [
                        {
                            label: 'Voltar',
                            accelerator: 'CmdOrCtrl+Left',
                            click: () => {
                                const focusedWindow = BrowserWindow.getFocusedWindow();
                                if (focusedWindow) {
                                    focusedWindow.webContents.send('go-back');
                                }
                            }
                        },
                        {
                            label: 'Avançar',
                            accelerator: 'CmdOrCtrl+Right',
                            click: () => {
                                const focusedWindow = BrowserWindow.getFocusedWindow();
                                if (focusedWindow) {
                                    focusedWindow.webContents.send('go-forward');
                                }
                            }
                        },
                        {
                            label: 'Recarregar',
                            accelerator: 'CmdOrCtrl+R',
                            click: () => {
                                const focusedWindow = BrowserWindow.getFocusedWindow();
                                if (focusedWindow) {
                                    focusedWindow.webContents.send('reload-page');
                                }
                            }
                        }
                    ]
                }
            ];

            Menu.setApplicationMenu(Menu.buildFromTemplate(template));
        } else {
            // Menu vazio para Windows/Linux (usando custom menu bar)
            Menu.setApplicationMenu(null);
        }
    }
}

// Inicializar aplicativo
new GlassBrowser();

// Tratamento de erros globais
process.on('uncaughtException', (error) => {
    console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promise rejeitada não tratada:', reason);
});
