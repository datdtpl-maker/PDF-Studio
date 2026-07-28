const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const isDevelopment = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 760,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f6f7fb",
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: isDevelopment,
    },
  });

  window.once("ready-to-show", () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    const currentUrl = window.webContents.getURL();
    if (currentUrl && url !== currentUrl) {
      event.preventDefault();
    }
  });

  if (isDevelopment && process.env.PDF_STUDIO_DEV_URL) {
    void window.loadURL(process.env.PDF_STUDIO_DEV_URL);
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.pdfstudio.desktop");
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
