const { contextBridge, ipcRenderer } = require('electron');

// API segura exposta para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Navegação
    navigate: (url) => ipcRenderer.send('navigate', url),
    goBack: () => ipcRenderer.send('go-back'),
    goForward: () => ipcRenderer.send('go-forward'),
    refresh: () => ipcRenderer.send('refresh'),
    
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
    newTab: () => ipcRenderer.send('new-tab'),
    closeTab: (id) => ipcRenderer.send('close-tab', id),
    
    // Diálogos
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Eventos
    on: (channel, callback) => {
        const validChannels = ['navigate-to', 'new-tab', 'theme-changed'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        }
    },
    
    off: (channel, callback) => {
        ipcRenderer.off(channel, callback);
    },
    
    // Sistema
    platform: process.platform,
    versions: process.versions
});
