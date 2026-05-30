const { app, BrowserWindow, session, shell, ipcMain, screen, Notification } = require("electron");
const path = require("path");

let mainWindow = null;

const isDev = !app.isPackaged;

function log(...args) {
  console.log("[NOSTUR MAIN]", ...args);
}

function warn(...args) {
  console.warn("[NOSTUR MAIN WARNING]", ...args);
}

function errorLog(...args) {
  console.error("[NOSTUR MAIN ERROR]", ...args);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendNewTab(url) {
  log("sendNewTab recibido:", url);

  if (!url) {
    warn("sendNewTab cancelado: url vacía");
    return;
  }

  if (url === "about:blank") {
    warn("sendNewTab cancelado: about:blank");
    return;
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    warn("sendNewTab cancelado: mainWindow no disponible");
    return;
  }

  mainWindow.webContents.send("nostur:new-tab-from-main", { url });
}

function sendOpenConversationFromNotification(conversationId) {
  log("sendOpenConversationFromNotification:", conversationId);

  if (!conversationId) {
    warn("No hay conversationId para abrir desde notificación.");
    return;
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    warn("No se pudo abrir conversación: mainWindow no disponible.");
    return;
  }

  if (mainWindow.isMinimized()) {
    log("Ventana minimizada. Restaurando...");
    mainWindow.restore();
  }

  log("Mostrando y enfocando ventana...");
  mainWindow.show();
  mainWindow.focus();

  mainWindow.webContents.send("nostur:open-conversation-from-notification", {
    conversationId
  });

  log("Evento enviado al renderer: nostur:open-conversation-from-notification");
}

function configureWindowOpenHandling() {
  log("Configurando manejo de ventanas/navegación...");

  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      log("setWindowOpenHandler global:", url);
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

      log("will-navigate interceptado:", url);
      event.preventDefault();
      sendNewTab(url);
    });

    contents.on("did-create-window", (childWindow, details) => {
      const url = details?.url;

      log("did-create-window interceptado:", url);

      if (childWindow && !childWindow.isDestroyed()) {
        childWindow.close();
      }

      sendNewTab(url);
    });
  });
}

function createWindow() {
  log("Creando ventana principal...");
  log("isDev:", isDev);

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

  mainWindow.on("ready-to-show", () => {
    log("mainWindow ready-to-show");
  });

  mainWindow.on("show", () => {
    log("mainWindow show");
  });

  mainWindow.on("focus", () => {
    log("mainWindow focus");
  });

  mainWindow.on("minimize", () => {
    log("mainWindow minimized");
  });

  mainWindow.on("restore", () => {
    log("mainWindow restored");
  });

  mainWindow.on("closed", () => {
    log("mainWindow closed");
    mainWindow = null;
  });

  mainWindow.webContents.on("did-finish-load", () => {
    log("Renderer terminó de cargar.");
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    errorLog("Renderer falló al cargar:", {
      errorCode,
      errorDescription,
      validatedURL
    });
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log("[RENDERER CONSOLE]", {
      level,
      message,
      line,
      sourceId
    });
  });

  if (isDev) {
    log("Cargando Vite dev server: http://127.0.0.1:5173");
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    log("Cargando archivo build:", indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    log("setWindowOpenHandler mainWindow:", url);
    sendNewTab(url);
    return { action: "deny" };
  });
}

function configureSessions() {
  log("Configurando permisos de sesiones...");

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

      const isAllowed = allowed.includes(permission);

      log("Permiso solicitado:", {
        partitionName,
        permission,
        isAllowed
      });

      callback(isAllowed);
    });

    ses.on("will-download", (_event, item) => {
      log("Descarga iniciada:", item.getFilename());

      item.once("done", (_doneEvent, state) => {
        log("Descarga finalizada:", {
          filename: item.getFilename(),
          state,
          path: item.getSavePath()
        });
      });
    });
  }
}

app.whenReady().then(() => {
  log("Electron app ready.");
  log("platform:", process.platform);
  log("Notification.isSupported():", Notification.isSupported());

  if (process.platform === "win32") {
    app.setAppUserModelId("com.nossix.nostur");
    log("AppUserModelId configurado para Windows.");
  }

  configureWindowOpenHandling();
  configureSessions();
  createWindow();

  app.on("activate", () => {
    log("app activate");

    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  log("window-all-closed");

  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("nostur:clear-cache", async (_event, partitionName) => {
  log("IPC nostur:clear-cache recibido:", partitionName);

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

  log("Cache limpiada:", partitionName || "persist:web");

  return true;
});

ipcMain.handle("nostur:open-external", async (_event, url) => {
  log("IPC nostur:open-external recibido:", url);

  if (!url) {
    warn("openExternal cancelado: url vacía");
    return false;
  }

  await shell.openExternal(url);
  return true;
});

ipcMain.handle("nostur:notify", async (_event, payload) => {
  log("IPC nostur:notify recibido:", payload);

  if (!payload) {
    warn("nostur:notify cancelado: payload vacío");
    return false;
  }

  const title = String(payload.title || "NOSTUR");
  const body = String(payload.body || "Nuevo mensaje");
  const conversationId = payload.conversationId ? String(payload.conversationId) : "";

  const supported = Notification.isSupported();

  log("Notification support:", supported);

  if (!supported) {
    warn("Electron Notification no está soportado en este sistema/contexto.");
    return false;
  }

  try {
    const notification = new Notification({
      title,
      body,
      silent: false
    });

    notification.on("show", () => {
      log("Notificación mostrada:", {
        title,
        body,
        conversationId
      });
    });

    notification.on("click", () => {
      log("Click en notificación:", {
        conversationId
      });

      sendOpenConversationFromNotification(conversationId);
    });

    notification.on("close", () => {
      log("Notificación cerrada:", {
        conversationId
      });
    });

    notification.on("failed", (_event, errorMessage) => {
      errorLog("Notificación falló:", errorMessage);
    });

    notification.show();

    log("notification.show() ejecutado.");

    return true;
  } catch (err) {
    errorLog("Error creando/mostrando notificación:", err);
    return false;
  }
});

ipcMain.handle("nostur:play-notification-sound", async (_event, payload) => {
  log("IPC nostur:play-notification-sound recibido:", payload);

  const kind = String(payload?.kind || "gestion");

  let repeats = 1;
  let gap = 160;

  if (kind === "nuevo") {
    repeats = 2;
    gap = 180;
  }

  if (kind === "cande_transfer") {
    repeats = 3;
    gap = 130;
  }

  log("Reproduciendo beep:", {
    kind,
    repeats,
    gap
  });

  try {
    for (let index = 0; index < repeats; index += 1) {
      log(`Beep ${index + 1}/${repeats}`);
      shell.beep();

      if (index < repeats - 1) {
        await wait(gap);
      }
    }

    log("Beep finalizado OK.");
    return true;
  } catch (err) {
    errorLog("Error reproduciendo beep:", err);
    return false;
  }
});