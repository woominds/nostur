const { app, BrowserWindow, session, shell, ipcMain, screen, Notification } = require("electron");
const path = require("path");

let mainWindow = null;

const isDev = !app.isPackaged;

function sendNewTab(url) {
  if (!url) return;
  if (url === "about:blank") return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send("nostur:new-tab-from-main", { url });
}

function sendOpenConversationFromNotification(conversationId) {
  if (!conversationId) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();

  mainWindow.webContents.send("nostur:open-conversation-from-notification", {
    conversationId
  });
}

function configureWindowOpenHandling() {
  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      sendNewTab(url);
      return { action: "deny" };
    });

    contents.on("will-navigate", (event, url) => {
      const currentUrl = contents.getURL();

      if (!url || url === currentUrl) return;

      if (url.startsWith("http://127.0.0.1:5173")) return;
      if (url.startsWith("file://")) return;

      if (contents.getType() === "window") {
        return;
      }

      event.preventDefault();
      sendNewTab(url);
    });

    contents.on("did-create-window", (childWindow, details) => {
      const url = details?.url;

      if (childWindow && !childWindow.isDestroyed()) {
        childWindow.close();
      }

      sendNewTab(url);
    });
  });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  const width = workArea.width;
  const height = workArea.height;
  const x = workArea.x;
  const y = workArea.y;

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#eef1f6",
    title: "NOSTUR",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: {
      x: 16,
      y: 16
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    sendNewTab(url);
    return { action: "deny" };
  });
}

function configureSessions() {
  const partitions = [
    "persist:web",
    "persist:experts",
    "persist:abaco",
    "persist:krooze",
    "persist:liveconnect",
    "persist:aivo",
    "persist:amadeus",
    "persist:sabre",
    "persist:office",
    "persist:chatgpt",
    "persist:crm"
  ];

  for (const partitionName of partitions) {
    const ses = session.fromPartition(partitionName);

    ses.setPermissionRequestHandler((_webContents, permission, callback) => {
      const allowed = [
        "notifications",
        "media",
        "geolocation",
        "clipboard-read",
        "clipboard-sanitized-write",
        "fullscreen"
      ];

      callback(allowed.includes(permission));
    });

    ses.on("will-download", (_event, item) => {
      item.once("done", (_doneEvent, state) => {
        if (state === "completed") {
          console.log("Download completed:", item.getSavePath());
        }
      });
    });
  }
}

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.nossix.nostur");
  }

  configureWindowOpenHandling();
  configureSessions();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("nostur:clear-cache", async (_event, partitionName) => {
  const ses = session.fromPartition(partitionName || "persist:web");

  await ses.clearCache();
  await ses.clearStorageData({
    storages: [
      "appcache",
      "cookies",
      "filesystem",
      "indexdb",
      "localstorage",
      "shadercache",
      "websql",
      "serviceworkers",
      "cachestorage"
    ]
  });

  return true;
});

ipcMain.handle("nostur:open-external", async (_event, url) => {
  if (!url) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("nostur:notify", async (_event, payload) => {
  if (!payload) return false;

  const title = String(payload.title || "NOSTUR");
  const body = String(payload.body || "Nuevo mensaje");
  const conversationId = payload.conversationId ? String(payload.conversationId) : "";

  if (!Notification.isSupported()) {
    return false;
  }

  const notification = new Notification({
    title,
    body,
    silent: false
  });

  notification.on("click", () => {
    sendOpenConversationFromNotification(conversationId);
  });

  notification.show();

  return true;
});