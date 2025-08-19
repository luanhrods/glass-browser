const { contextBridge, ipcRenderer } = require('electron');

// API segura exposta para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Navegação - usar invoke para consistência
    navigate: (url) => ipcRenderer.invoke('navigate', url),
    goBack: () => ipcRenderer.invoke('go-back'),
    goForward: () => ipcRenderer.invoke('go-forward'),
    refresh: () => ipcRenderer.invoke('refresh'),
    
    // Bookmarks
    getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
    saveBookmark: (bookmark) => ipcRenderer.invoke('save-bookmark', bookmark),
    removeBookmark: (id) => ipcRenderer.invoke('remove-bookmark', id),
    
    // Histórico
    getHistory: () => ipcRenderer.invoke('get-history'),
    saveHistory: (item) => ipcRenderer.invoke('save-history', item),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    
    // Configurações
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    
    // Janelas e Abas
    newWindow: (url) => ipcRenderer.invoke('new-window', url),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    newTab: () => ipcRenderer.invoke('new-tab'),
    closeTab: (id) => ipcRenderer.invoke('close-tab', id),
    
    // Zoom controls
    zoomIn: () => ipcRenderer.invoke('zoom-in'),
    zoomOut: () => ipcRenderer.invoke('zoom-out'),
    zoomReset: () => ipcRenderer.invoke('zoom-reset'),
    
    // Diálogos
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppName: () => ipcRenderer.invoke('get-app-name'),
    
    // Eventos
    on: (channel, callback) => {
        const validChannels = [
            'navigate-to', 
            'new-tab', 
            'close-tab',
            'go-back',
            'go-forward',
            'reload-page',
            'theme-changed'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        }
    },
    
    off: (channel, callback) => {
        const validChannels = [
            'navigate-to', 
            'new-tab', 
            'close-tab',
            'go-back',
            'go-forward',
            'reload-page',
            'theme-changed'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.off(channel, callback);
        }
    },
    
    // Sistema
    platform: process.platform,
    versions: process.versions
});
