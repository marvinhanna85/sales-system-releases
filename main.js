const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, Notification, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

const { DataStore } = require("./src/main/data-store");
const { searchPlaces } = require("./src/main/engines/lead-engine");

let mainWindow;
let store;
const updateState = {
  status: "idle",
  message: "",
  version: app.getVersion(),
  availableVersion: "",
  progress: 0,
  isPackaged: app.isPackaged
};
const runtimeLogPath = path.join(__dirname, "runtime-debug.log");
const DEBUG_MAIN = process.env.SALES_SYSTEM_DEBUG === "1";

function logRuntime(...parts) {
  if (!DEBUG_MAIN) {
    return;
  }
  const line = `[${new Date().toISOString()}] ${parts.join(" ")}\n`;
  try {
    fs.appendFileSync(runtimeLogPath, line, "utf8");
  } catch {}
  try {
    process.stdout.write(`${parts.join(" ")}\n`);
  } catch {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 760,
    minHeight: 620,
    autoHideMenuBar: true,
    backgroundColor: "#f1ede5",
    title: "Outbound Sales System",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (DEBUG_MAIN) {
    mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      logRuntime(`[renderer:${level}]`, `${sourceId}:${line}`, message);
    });
    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      logRuntime("[renderer:gone]", JSON.stringify(details));
    });
    mainWindow.webContents.on("did-finish-load", () => {
      logRuntime("[main] window finished load");
    });
  }
  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
}

function publishUpdateState(patch = {}) {
  Object.assign(updateState, patch, {
    version: app.getVersion(),
    isPackaged: app.isPackaged
  });
  logRuntime("[updates]", JSON.stringify(updateState));
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updates:status", updateState);
  }
  return updateState;
}

function getUpdaterUnavailableState() {
  return publishUpdateState({
    status: "dev",
    message: "Auto-update används i installerad version.",
    availableVersion: "",
    progress: 0
  });
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    publishUpdateState({ status: "checking", message: "Söker efter uppdatering...", progress: 0 });
  });

  autoUpdater.on("update-available", (info) => {
    publishUpdateState({
      status: "downloading",
      message: `Version ${info.version} finns tillgänglig och laddas ner automatiskt.`,
      availableVersion: info.version || "",
      progress: 0
    });
  });

  autoUpdater.on("update-not-available", () => {
    publishUpdateState({
      status: "current",
      message: "Appen är redan uppdaterad.",
      availableVersion: "",
      progress: 0
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    publishUpdateState({
      status: "downloading",
      message: `Laddar ner uppdatering ${Math.round(progress.percent || 0)}%.`,
      progress: Math.round(progress.percent || 0)
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    publishUpdateState({
      status: "downloaded",
      message: `Version ${info.version} är nedladdad. Starta om för att installera.`,
      availableVersion: info.version || updateState.availableVersion,
      progress: 100
    });
  });

  autoUpdater.on("error", (error) => {
    publishUpdateState({
      status: "error",
      message: error?.message || "Kunde inte kontrollera uppdatering.",
      progress: 0
    });
  });
}

async function checkForUpdates() {
  if (!app.isPackaged) {
    return getUpdaterUnavailableState();
  }
  try {
    publishUpdateState({ status: "checking", message: "Söker efter uppdatering...", progress: 0 });
    await autoUpdater.checkForUpdates();
  } catch (error) {
    publishUpdateState({
      status: "error",
      message: error?.message || "Kunde inte kontrollera uppdatering.",
      progress: 0
    });
  }
  return updateState;
}

async function downloadUpdate() {
  if (!app.isPackaged) {
    return getUpdaterUnavailableState();
  }
  try {
    publishUpdateState({ status: "downloading", message: "Laddar ner uppdatering...", progress: 0 });
    await autoUpdater.downloadUpdate();
  } catch (error) {
    publishUpdateState({
      status: "error",
      message: error?.message || "Kunde inte ladda ner uppdatering.",
      progress: 0
    });
  }
  return updateState;
}

function registerIpc() {
  ipcMain.handle("app:get-state", () => store.getState());
  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("app:save-settings", (_event, payload) => store.saveSettings(payload));
  ipcMain.handle("campaigns:create", (_event, payload) => store.createCampaign(payload));
  ipcMain.handle("campaigns:update", (_event, payload) => store.upsertCampaign(payload));
  ipcMain.handle("leads:create", (_event, payload) => store.createLead(payload));
  ipcMain.handle("leads:import", (_event, payload) => store.importLeads(payload.leads, payload.options));
  ipcMain.handle("leads:update", (_event, payload) => store.updateLead(payload.leadId, payload.patch));
  ipcMain.handle("leads:action", (_event, payload) => store.applyLeadAction(payload));
  ipcMain.handle("leads:log-event", (_event, payload) => store.addTimelineEvent(payload));
  ipcMain.handle("leads:next", (_event, payload) => store.getNextLead(payload));
  ipcMain.handle("leads:delete", (_event, payload) => store.softDeleteLead(payload.leadId));
  ipcMain.handle("leads:restore", (_event, payload) => store.restoreLead(payload.leadId));
  ipcMain.handle("leads:purge", (_event, payload) => store.purgeLead(payload.leadId));
  ipcMain.handle("reminders:complete", (_event, payload) => store.setReminderCompleted(payload.reminderId, payload.completed));
  ipcMain.handle("notifications:show", (_event, payload) => {
    if (!Notification.isSupported()) {
      return false;
    }
    new Notification({
      title: payload?.title || "Sales System",
      body: payload?.body || ""
    }).show();
    return true;
  });
  ipcMain.handle("schedule:plan", (_event, payload) => store.planSchedule(payload));
  ipcMain.handle("schedule:clear", (_event, payload) => store.clearSchedule(payload));
  ipcMain.handle("places:search", async (_event, payload) => searchPlaces(payload));
  ipcMain.handle("telavox:sync-lead", (_event, payload) => store.syncTelavoxLeadCalls(payload));
  ipcMain.handle("telavox:download-recording", (_event, payload) => store.downloadTelavoxRecording(payload));
  ipcMain.handle("link:open-external", (_event, targetUrl) => {
    if (!targetUrl) {
      return false;
    }
    shell.openExternal(targetUrl);
    return true;
  });
  ipcMain.handle("updates:status", () => updateState);
  ipcMain.handle("updates:check", () => checkForUpdates());
  ipcMain.handle("updates:download", () => downloadUpdate());
  ipcMain.handle("updates:install", () => {
    if (app.isPackaged && updateState.status === "downloaded") {
      autoUpdater.quitAndInstall(false, true);
      return true;
    }
    return false;
  });
}

app.whenReady().then(async () => {
  if (DEBUG_MAIN) {
    try {
      fs.writeFileSync(runtimeLogPath, "", "utf8");
    } catch {}
  }
  logRuntime("[main] app ready");
  store = new DataStore(path.join(app.getPath("userData"), "sales-system"));
  await store.init();
  logRuntime("[main] store initialized");
  configureAutoUpdater();
  registerIpc();
  logRuntime("[main] ipc registered");
  createWindow();
  logRuntime("[main] window created");
  publishUpdateState();
  if (app.isPackaged) {
    setTimeout(() => {
      void checkForUpdates();
    }, 4000);
  }

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
