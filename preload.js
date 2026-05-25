const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  getState: () => ipcRenderer.invoke("app:get-state"),
  getStatistics: (payload) => ipcRenderer.invoke("statistics:get", payload),
  saveSettings: (payload) => ipcRenderer.invoke("app:save-settings", payload),
  createCampaign: (payload) => ipcRenderer.invoke("campaigns:create", payload),
  updateCampaign: (payload) => ipcRenderer.invoke("campaigns:update", payload),
  deleteCampaign: (payload) => ipcRenderer.invoke("campaigns:delete", payload),
  createLead: (payload) => ipcRenderer.invoke("leads:create", payload),
  importLeads: (payload) => ipcRenderer.invoke("leads:import", payload),
  updateLead: (payload) => ipcRenderer.invoke("leads:update", payload),
  applyLeadAction: (payload) => ipcRenderer.invoke("leads:action", payload),
  logLeadEvent: (payload) => ipcRenderer.invoke("leads:log-event", payload),
  createCallIntent: (payload) => ipcRenderer.invoke("calls:create-intent", payload),
  getNextLead: (payload) => ipcRenderer.invoke("leads:next", payload),
  deleteLead: (payload) => ipcRenderer.invoke("leads:delete", payload),
  restoreLead: (payload) => ipcRenderer.invoke("leads:restore", payload),
  purgeLead: (payload) => ipcRenderer.invoke("leads:purge", payload),
  completeReminder: (payload) => ipcRenderer.invoke("reminders:complete", payload),
  showNotification: (payload) => ipcRenderer.invoke("notifications:show", payload),
  planSchedule: (payload) => ipcRenderer.invoke("schedule:plan", payload),
  clearSchedule: (payload) => ipcRenderer.invoke("schedule:clear", payload),
  searchPlaces: (payload) => ipcRenderer.invoke("places:search", payload),
  onPlacesProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("places:progress", listener);
    return () => ipcRenderer.removeListener("places:progress", listener);
  },
  researchAdCustomer: (payload) => ipcRenderer.invoke("ads:research-customer", payload),
  saveAdAsset: (payload) => ipcRenderer.invoke("ads:save-asset", payload),
  getAdAssetDataUrl: (payload) => ipcRenderer.invoke("ads:get-asset-data-url", payload),
  generateAdBrief: (payload) => ipcRenderer.invoke("ads:generate-brief", payload),
  generateAdImage: (payload) => ipcRenderer.invoke("ads:generate-image", payload),
  createInvoicePdf: (payload) => ipcRenderer.invoke("invoices:create-pdf", payload),
  syncTelavoxLead: (payload) => ipcRenderer.invoke("telavox:sync-lead", payload),
  syncTelavoxPeriod: (payload) => ipcRenderer.invoke("telavox:sync-period", payload),
  resolveTelavoxCall: (payload) => ipcRenderer.invoke("telavox:resolve-call", payload),
  downloadTelavoxRecording: (payload) => ipcRenderer.invoke("telavox:download-recording", payload),
  openExternal: (url) => ipcRenderer.invoke("link:open-external", url),
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getUpdateStatus: () => ipcRenderer.invoke("updates:status"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  downloadUpdate: () => ipcRenderer.invoke("updates:download"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  }
});
