const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nostur", {
  clearCache: (partitionName) => ipcRenderer.invoke("nostur:clear-cache", partitionName),

  openExternal: (url) => ipcRenderer.invoke("nostur:open-external", url),

  notify: (payload) => ipcRenderer.invoke("nostur:notify", payload),

  onNewTabFromMain: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("nostur:new-tab-from-main", handler);

    return () => {
      ipcRenderer.removeListener("nostur:new-tab-from-main", handler);
    };
  },

  onOpenConversationFromNotification: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("nostur:open-conversation-from-notification", handler);

    return () => {
      ipcRenderer.removeListener("nostur:open-conversation-from-notification", handler);
    };
  }
});