const { app, BrowserWindow, Menu, ipcMain, shell, dialog, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

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
            
            // Auto-updater
            autoUpdater.checkForUpdatesAndNotify();
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
            contents.on('new-window', (event, navigationUrl) => {
                event.preventDefault();
                this.createNewWindow(navigationUrl);
            });

            contents.setWindowOpenHandler(({ url }) => {
                this.createNewWindow(url);
                return { action: 'deny' };
            });
        });
    }

    setupSession() {
        const ses = session.defaultSession;
        
        // Configurar extensões
        ses.setPermissionRequestHandler((webContents, permission, callback) => {
            const allowedPermissions = ['notifications', 'fullscreen', 'pointerLock'];
            callback(allowedPermissions.includes(permission));
        });

        // Bloquear anúncios básicos
        ses.webRequest.onBeforeRequest({ urls: ['*://*.doubleclick.net/*'] }, (details, callback) => {
            callback({ cancel: true });
        });

        // Suporte a extensões do Chrome
        this.setupExtensions(ses);
    }

    async setupExtensions(session) {
        try {
            // Carregar extensões do Chrome (se instaladas)
            const extensionsPath = path.join(app.getPath('userData'), 'extensions');
            // Implementação básica para extensões
        } catch (error) {
            console.log('Extensões não carregadas:', error.message);
        }
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
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
            titleBarOverlay: process.platform === 'win32' ? {
                color: 'rgba(255, 255, 255, 0.1)',
                symbolColor: '#ffffff'
            } : false,
            frame: process.platform !== 'win32',
            transparent: true,
            vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
            backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: true,
                allowRunningInsecureContent: false
            },
            icon: path.join(__dirname, '../assets/icon.png')
        });

        mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

        // Salvar estado da janela
        const saveWindowState = () => {
            const bounds = mainWindow.getBounds();
            store.set('windowState', bounds);
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

        return mainWindow;
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
        ipcMain.handle('get-bookmarks', () => {
            return store.get('bookmarks', []);
        });

        ipcMain.handle('save-bookmark', (event, bookmark) => {
            const bookmarks = store.get('bookmarks', []);
            bookmarks.push({
                ...bookmark,
                id: Date.now(),
                createdAt: new Date().toISOString()
            });
            store.set('bookmarks', bookmarks);
            return bookmarks;
        });

        ipcMain.handle('remove-bookmark', (event, id) => {
            const bookmarks = store.get('bookmarks', []);
            const filtered = bookmarks.filter(b => b.id !== id);
            store.set('bookmarks', filtered);
            return filtered;
        });

        ipcMain.handle('get-history', () => {
            return store.get('history', []);
        });

        ipcMain.handle('save-history', (event, historyItem) => {
            const history = store.get('history', []);
            const existingIndex = history.findIndex(h => h.url === historyItem.url);
            
            if (existingIndex >= 0) {
                history[existingIndex] = { ...historyItem, visitedAt: new Date().toISOString() };
            } else {
                history.unshift({ ...historyItem, visitedAt: new Date().toISOString() });
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

        ipcMain.handle('get-settings', () => {
            return store.get('settings', {
                searchEngine: 'google',
                homepage: 'https://www.google.com',
                theme: 'auto',
                privacy: {
                    blockAds: true,
                    blockTrackers: true,
                    cookiePolicy: 'block-third-party'
                }
            });
        });

        ipcMain.handle('save-settings', (event, settings) => {
            store.set('settings', settings);
            return settings;
        });

        ipcMain.handle('new-window', (event, url) => {
            this.createNewWindow(url);
        });

        ipcMain.handle('show-save-dialog', async (event, options) => {
            const result = await dialog.showSaveDialog(options);
            return result;
        });

        ipcMain.handle('open-external', (event, url) => {
            shell.openExternal(url);
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
                }
            ];

            Menu.setApplicationMenu(Menu.buildFromTemplate(template));
        }
    }
}

// Inicializar aplicativo
new GlassBrowser();
