const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, Notification, ipcMain, shell, dialog } = require("electron");
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
const OPENAI_BRIEF_MODEL = "gpt-4.1";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const OPENAI_IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || "2048x1152";

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

function escapeInvoiceHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseInvoiceAmount(value) {
  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function formatInvoiceMoney(value) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function buildInvoiceHtml(payload = {}) {
  const rows = Array.isArray(payload.lines) && payload.lines.length ? payload.lines : [];
  const vatRate = Math.max(0, Number(payload.vatRate) || 0);
  const subtotal = rows.reduce((sum, row) => sum + parseInvoiceAmount(row.amount), 0);
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;
  const safeRows = rows.map((row) => ({
    description: escapeInvoiceHtml(row.description || ""),
    name: escapeInvoiceHtml(row.name || ""),
    period: escapeInvoiceHtml(row.period || ""),
    quantity: escapeInvoiceHtml(row.quantity || ""),
    amount: formatInvoiceMoney(parseInvoiceAmount(row.amount))
  }));

  return `<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #ffffff;
        color: #050b2b;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 8mm 11mm 7mm;
        position: relative;
        background: #fff;
      }
      .bar {
        height: 5mm;
        margin: -8mm -11mm 13mm;
        background: #030833;
      }
      .top {
        display: grid;
        grid-template-columns: 1fr 78mm;
        gap: 16mm;
        align-items: start;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 5mm;
        margin-top: 4mm;
      }
      .brand-mark {
        width: 12mm;
        height: 14mm;
        position: relative;
      }
      .brand-mark::before,
      .brand-mark::after {
        content: "";
        position: absolute;
        width: 3.2mm;
        background: #050b2b;
        border-radius: 0.7mm;
        transform: skewY(-35deg);
      }
      .brand-mark::before {
        left: 1mm;
        top: 4mm;
        height: 8mm;
      }
      .brand-mark::after {
        right: 1mm;
        top: 1mm;
        height: 12mm;
      }
      .brand strong {
        font-size: 18px;
        letter-spacing: -0.2px;
      }
      h1 {
        margin: 0 0 5mm;
        font-size: 22px;
        line-height: 1;
      }
      .address-block {
        margin-top: 18mm;
        line-height: 1.42;
      }
      .label {
        display: block;
        margin-bottom: 1.8mm;
        font-weight: 700;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4.2mm 9mm;
        line-height: 1.35;
      }
      .meta-grid b {
        display: block;
        font-size: 9px;
      }
      .rows {
        margin-top: 23mm;
        border-top: 1px solid #b8bdca;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        padding: 5mm 1.4mm 2.4mm;
        color: #050b6f;
        font-size: 10px;
        text-align: left;
      }
      th:nth-child(3),
      th:nth-child(4),
      th:nth-child(5),
      td:nth-child(3),
      td:nth-child(4),
      td:nth-child(5) {
        text-align: right;
      }
      td {
        padding: 2.4mm 1.4mm;
        border-top: 1px solid #eceef4;
        vertical-align: top;
      }
      tbody tr:first-child td {
        border-top: 0;
      }
      .totals {
        width: 58mm;
        margin: 10mm 0 0 auto;
        font-size: 10px;
      }
      .totals .line,
      .totals .total {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6mm;
        padding: 1.9mm 0;
      }
      .totals .total {
        margin-top: 5mm;
        font-size: 13px;
        font-weight: 700;
      }
      .footer {
        position: absolute;
        left: 11mm;
        right: 11mm;
        bottom: 12mm;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18mm;
        padding-top: 5mm;
        border-top: 1px solid #9da5b5;
        line-height: 1.55;
      }
      .footer b {
        display: inline-block;
        min-width: 39mm;
      }
      .bottom-bar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 5mm;
        background: #030833;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <div class="bar"></div>
      <section class="top">
        <div>
          <div class="brand">
            <span class="brand-mark"></span>
            <strong>Nord MediaPartner</strong>
          </div>
          <div class="address-block">
            <span class="label">Fakturaadress:</span>
            <div>${escapeInvoiceHtml(payload.customerName)}</div>
            <div>${escapeInvoiceHtml(payload.customerOrgNumber)}</div>
            <div>${escapeInvoiceHtml(payload.customerAddress)}</div>
            <div>${escapeInvoiceHtml(payload.customerEmail)}</div>
          </div>
        </div>
        <div>
          <h1>Faktura</h1>
          <div class="meta-grid">
            <div><b>Fakturanummer</b>${escapeInvoiceHtml(payload.invoiceNumber)}</div>
            <div><b>Orderdatum</b>${escapeInvoiceHtml(payload.orderDate)}</div>
            <div><b>Vår referens</b>${escapeInvoiceHtml(payload.referenceName)}<br />${escapeInvoiceHtml(payload.referencePhone)}<br />${escapeInvoiceHtml(payload.referenceEmail)}</div>
            <div><b>Förfallodatum</b>${escapeInvoiceHtml(payload.dueDate)}</div>
            <div><b>Er referens</b>${escapeInvoiceHtml(payload.customerReference)}<br />${escapeInvoiceHtml(payload.customerReferencePhone)}</div>
          </div>
        </div>
      </section>

      <section class="rows">
        <table>
          <thead>
            <tr>
              <th>Beskrivning</th>
              <th>Benämning</th>
              <th>Period</th>
              <th>Längd</th>
              <th>Belopp</th>
            </tr>
          </thead>
          <tbody>
            ${safeRows.map((row) => `
              <tr>
                <td>${row.description}</td>
                <td>${row.name}</td>
                <td>${row.period}</td>
                <td>${row.quantity}</td>
                <td>${row.amount}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>

      <section class="totals">
        <div class="line"><strong>Momssats</strong><span>${vatRate}%</span></div>
        <div class="line"><strong>Moms</strong><span>${formatInvoiceMoney(vat)}</span></div>
        <div class="total"><span>Totalt:</span><span>${formatInvoiceMoney(total)}</span></div>
      </section>

      <section class="footer">
        <div>
          <div><b>Organisationsnummer:</b> ${escapeInvoiceHtml(payload.companyOrgNumber || "559365-4709")}</div>
          <div><b>Momsregistreringsnummer:</b> ${escapeInvoiceHtml(payload.companyVatNumber || "SE559365470901")}</div>
          <div><b>Godkänd för F-skatt</b></div>
          <div><b>Adress:</b> ${escapeInvoiceHtml(payload.companyAddress || "Solbackavägen 9F, 632 22, Eskilstuna")}</div>
        </div>
        <div>
          <div><b>Betalningsuppgifter</b></div>
          <div><b>Bank:</b> ${escapeInvoiceHtml(payload.bankName)}</div>
          <div><b>Bankgiro:</b> ${escapeInvoiceHtml(payload.bankgiro)}</div>
          <div><b>Kontonummer:</b> ${escapeInvoiceHtml(payload.accountNumber)}</div>
          <div><b>Ägare av bankkonto:</b> ${escapeInvoiceHtml(payload.accountOwner)}</div>
        </div>
      </section>
      <div class="bottom-bar"></div>
    </main>
  </body>
</html>`;
}

async function createInvoicePdf(payload = {}) {
  const defaultName = `faktura-${payload.invoiceNumber || Date.now()}.pdf`;
  const defaultPath = path.join(app.getPath("downloads"), defaultName);
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: "Spara faktura",
    defaultPath,
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });
  if (saveResult.canceled || !saveResult.filePath) {
    return { canceled: true, filePath: "" };
  }

  const printWindow = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: {
      sandbox: true
    }
  });

  try {
    const html = buildInvoiceHtml(payload);
    await printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: { marginType: "none" }
    });
    await fs.promises.writeFile(saveResult.filePath, pdf);
    return { canceled: false, filePath: saveResult.filePath };
  } finally {
    printWindow.destroy();
  }
}

function getOpenAiApiKey(payload = {}) {
  return String(payload.openaiApiKey || store?.state?.settings?.openaiApiKey || process.env.OPENAI_API_KEY || "").trim();
}

async function saveAdStudioAsset(payload = {}) {
  const dataUrl = String(payload.dataUrl || "");
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match || !match[1].startsWith("image/")) {
    throw new Error("Kunde inte spara annonsbilden lokalt.");
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const extension = getImageExtensionFromMime(mimeType);
  const assetId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const directory = getAdStudioAssetDirectory();
  await fs.promises.mkdir(directory, { recursive: true });
  await fs.promises.writeFile(path.join(directory, assetId), buffer);
  return {
    assetStorageId: assetId,
    mimeType,
    size: buffer.length,
    name: payload.name || assetId
  };
}

async function getAdStudioAssetDataUrl(payload = {}) {
  const assetStorageId = path.basename(String(payload.assetStorageId || ""));
  if (!assetStorageId) {
    throw new Error("Bildreferens saknas.");
  }
  const filePath = path.join(getAdStudioAssetDirectory(), assetStorageId);
  const resolvedDirectory = path.resolve(getAdStudioAssetDirectory());
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(resolvedDirectory)) {
    throw new Error("Ogiltig bildreferens.");
  }
  const buffer = await fs.promises.readFile(resolvedPath);
  const mimeType = getImageMimeFromExtension(path.extname(assetStorageId));
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function getAdStudioAssetDirectory() {
  return path.join(app.getPath("userData"), "annonsstudio-assets");
}

function getImageExtensionFromMime(mimeType = "") {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }
  if (mimeType.includes("webp")) {
    return "webp";
  }
  return "png";
}

function getImageMimeFromExtension(extension = "") {
  const value = extension.toLowerCase();
  if (value === ".jpg" || value === ".jpeg") {
    return "image/jpeg";
  }
  if (value === ".webp") {
    return "image/webp";
  }
  return "image/png";
}

async function researchAdStudioCustomer(payload = {}) {
  const providedUrls = collectAdStudioResearchUrls(payload);
  const urls = providedUrls.length ? providedUrls : await discoverAdStudioCustomerUrls(payload);
  const pages = [];
  const imageCandidates = [];
  for (const url of urls.slice(0, 5)) {
    try {
      const page = await fetchAdStudioResearchPage(url);
      if (page) {
        pages.push(page);
        imageCandidates.push(...page.images);
      }
    } catch (error) {
      pages.push({ url, title: "", description: "", text: "", images: [], error: error.message || "Kunde inte l\u00e4sa sidan." });
    }
  }
  const images = [];
  for (const imageUrl of uniqueStrings(imageCandidates).slice(0, 12)) {
    if (images.length >= 6) {
      break;
    }
    try {
      const image = await fetchAdStudioResearchImage(imageUrl);
      if (image) {
        images.push(image);
      }
    } catch {}
  }
  return {
    researchedAt: new Date().toISOString(),
    query: payload.brand || "",
    urls,
    summary: buildAdStudioResearchSummary(pages),
    pages: pages.map((page) => ({
      url: page.url,
      title: page.title,
      description: page.description,
      text: page.text,
      error: page.error || ""
    })),
    images
  };
}

function collectAdStudioResearchUrls(payload = {}) {
  return uniqueStrings([
    payload.website,
    ...(Array.isArray(payload.urls) ? payload.urls : []),
    ...String(payload.researchUrls || "").split(/\s+/)
  ])
    .map(normalizeAdStudioResearchUrl)
    .filter(Boolean)
    .slice(0, 6);
}

async function discoverAdStudioCustomerUrls(payload = {}) {
  const query = [payload.brand, payload.city, payload.category].filter(Boolean).join(" ").trim();
  if (!query) {
    return [];
  }
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchTextWithTimeout(searchUrl, { headers: { "User-Agent": "Mozilla/5.0 SalesSystemResearch/1.0" } });
  const urls = [];
  const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi;
  let match;
  while ((match = regex.exec(html)) && urls.length < 5) {
    const url = unwrapDuckDuckGoUrl(decodeHtmlEntities(match[1]));
    const normalized = normalizeAdStudioResearchUrl(url);
    if (normalized && !/duckduckgo\.com|google\.com\/search/i.test(normalized)) {
      urls.push(normalized);
    }
  }
  return uniqueStrings(urls).slice(0, 5);
}

async function fetchAdStudioResearchPage(url) {
  const html = await fetchTextWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0 SalesSystemResearch/1.0" } });
  const title = extractHtmlTitle(html);
  const description = extractMetaContent(html, "description") || extractMetaProperty(html, "og:description");
  const text = extractReadableHtmlText(html);
  const images = extractHtmlImages(html, url);
  return {
    url,
    title,
    description,
    text: text.slice(0, 2600),
    images
  };
}

async function fetchAdStudioResearchImage(url) {
  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": "Mozilla/5.0 SalesSystemResearch/1.0" }
  });
  if (!response.ok) {
    return null;
  }
  const contentType = response.headers.get("content-type") || "";
  const length = Number(response.headers.get("content-length") || 0);
  if (!contentType.startsWith("image/") || /svg|gif/i.test(contentType) || length > 6_000_000) {
    return null;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 6_000_000) {
    return null;
  }
  const extension = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
  return {
    name: `webb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${extension}`,
    sourceUrl: url,
    dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
    type: "research"
  };
}

async function fetchTextWithTimeout(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  if (!response.ok) {
    throw new Error(`Kunde inte l\u00e4sa ${url} (${response.status}).`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) {
    throw new Error("Sidan verkar inte vara en l\u00e4sbar webbsida.");
  }
  return response.text();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 14000);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAdStudioResearchUrl(value) {
  const raw = String(value || "").trim().replace(/[),.]+$/g, "");
  if (!raw) {
    return "";
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.href;
  } catch {
    return "";
  }
}

function unwrapDuckDuckGoUrl(value) {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    return uddg || url.href;
  } catch {
    return value;
  }
}

function extractHtmlTitle(html) {
  return decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim().slice(0, 180);
}

function extractMetaContent(html, name) {
  const regex = new RegExp(`<meta[^>]+name=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return decodeHtmlEntities(html.match(regex)?.[1] || "").trim();
}

function extractMetaProperty(html, property) {
  const regex = new RegExp(`<meta[^>]+property=["']${escapeRegExp(property)}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return decodeHtmlEntities(html.match(regex)?.[1] || "").trim();
}

function extractReadableHtmlText(html) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  return decodeHtmlEntities(withoutNoise.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractHtmlImages(html, baseUrl) {
  const images = [];
  [extractMetaProperty(html, "og:image"), extractMetaContent(html, "twitter:image")].filter(Boolean).forEach((src) => images.push(resolveResearchUrl(src, baseUrl)));
  const regex = /<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) && images.length < 18) {
    const src = resolveResearchUrl(decodeHtmlEntities(match[1]), baseUrl);
    if (src && !/logo|icon|sprite|placeholder|tracking/i.test(src)) {
      images.push(src);
    }
  }
  return uniqueStrings(images).filter(Boolean);
}

function resolveResearchUrl(value, baseUrl) {
  const src = String(value || "").trim();
  if (!src || src.startsWith("data:")) {
    return "";
  }
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return "";
  }
}

function buildAdStudioResearchSummary(pages = []) {
  const readable = pages.filter((page) => !page.error);
  if (!readable.length) {
    return "Ingen publik webbtext kunde h\u00e4mtas.";
  }
  return readable.map((page, index) => [
    `K\u00e4lla ${index + 1}: ${page.title || page.url}`,
    page.description ? `Beskrivning: ${page.description}` : "",
    page.text ? `Utdrag: ${page.text.slice(0, 900)}` : ""
  ].filter(Boolean).join("\n")).join("\n\n");
}

function uniqueStrings(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number.parseInt(code, 10)));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildAdStudioPrompt(payload = {}) {
  const lead = payload.lead || {};
  const imageNames = (payload.images || []).map((image, index) => `${index + 1}. ${image.name || "kundbild"}`).join("\n");
  return [
    "Du \u00e4r en senior svensk art director och produktionsledare f\u00f6r lokala digitala annonser.",
    "Analysera kundens mejl, CRM-data och bifogade bilder. Skapa INTE kopior av tidigare exempelannonser, Canva-mallar eller generiska layoutfamiljer.",
    "Du ska skapa egna originalannonser f\u00f6r varje kund. Inga fasta mallnamn, inga \u00e5teranv\u00e4nda rubriker, inga standardfraser som inte kommer fr\u00e5n kundmaterialet.",
    "Undvik uttryck, kompositioner och visuella grepp fr\u00e5n tidigare exempelannonser. Tidigare exempel ska bara vara kvalitetsniv\u00e5, aldrig mall.",
    "Viktigt: annonserna ska k\u00e4nnas gjorda av en mediabyr\u00e5, inte AI-genererade. Prioritera riktiga kundbilder, trov\u00e4rdig svensk copy, luft, l\u00e4sbarhet och tydlig kontakt.",
    "Du \u00e4r mediateamet: kunden beh\u00f6ver inte veta exakt vilken bild, rubrik eller vinkel som \u00e4r b\u00e4st. Du ska f\u00f6rst\u00e5 m\u00e5let, v\u00e4lja bort svagt material och f\u00f6resl\u00e5 de riktningar som mest sannolikt s\u00e4ljer.",
    "Om kunden skickar flera bilder \u00e4r de referensmaterial, inte en kravlista. V\u00e4lj sj\u00e4lv vilka bilder som passar m\u00e5let och s\u00e4g i bildtolkningen vilka du skulle prioritera eller ignorera.",
    "Varje concept \u00e4r en kreativ riktning f\u00f6r GPT Image 2, inte en mall som appen ska rendera sj\u00e4lv.",
    "Design-specifikationen \u00e4r endast fallback om bildmodellen inte anv\u00e4nds. L\u00e4gg mest omsorg p\u00e5 strategi, budskap, bildval och varf\u00f6r riktningen passar.",
    "Returnera enbart JSON utan markdown.",
    "",
    "CRM-data:",
    JSON.stringify({
      companyName: lead.companyName || payload.brand || "",
      phone: lead.phone || payload.phone || "",
      email: lead.email || payload.email || "",
      website: lead.website || payload.website || "",
      city: lead.targetMarketCity || lead.normalizedCity || lead.city || "",
      category: lead.normalizedBranch || lead.category || ""
    }, null, 2),
    "",
    "Kundens instruktioner/mejl:",
    payload.instructions || "",
    "",
    "Din kreativa styrning/feedback:",
    payload.creativeFeedback || "",
    "",
    "AI-h\u00e4mtat webbunderslag:",
    payload.webResearch?.summary || "Inget webbunderslag h\u00e4mtat.",
    "",
    "Bilagor/bilder:",
    imageNames || "Inga bilder bifogade.",
    "",
    "JSON-format:",
    JSON.stringify({
      brief: {
        customerName: "F\u00f6retagsnamn",
        contactName: "Kontaktperson eller tomt",
        phone: "Telefon",
        email: "E-post",
        website: "Webb",
        objective: "M\u00e5l med annonsen",
        audience: "M\u00e5lgrupp",
        offer: "Erbjudande/budskap",
        tone: "Ton",
        mustHave: ["Saker som m\u00e5ste vara med"],
        avoid: ["Saker att undvika"],
        format: "16:9 landskap",
        imageRead: ["Vad bilderna verkar visa och vilka som passar"]
      },
      concepts: [
        {
          id: "concept-1",
          title: "Kort namn p\u00e5 riktning",
          rationale: "Varf\u00f6r den passar kunden",
          imageIndex: 0,
          headline: "Rubrik",
          subheadline: "Underrubrik",
          bullets: ["2-4 korta texter"],
          cta: "CTA",
          palette: { primary: "#0f172a", accent: "#f97316", surface: "#ffffff", text: "#ffffff" },
          design: {
            background: {
              imageIndex: 0,
              color: "#0f172a",
              fit: "cover",
              focalX: 50,
              focalY: 50,
              overlayColor: "#000000",
              overlayOpacity: 0.35
            },
            layers: [
              {
                type: "shape",
                shape: "rect",
                x: 5,
                y: 8,
                w: 42,
                h: 78,
                color: "#ffffff",
                opacity: 0.88,
                radius: 2
              },
              {
                type: "text",
                role: "headline",
                text: "Rubrik",
                x: 8,
                y: 22,
                w: 34,
                h: 22,
                fontSize: 78,
                weight: 900,
                color: "#0f172a",
                align: "left",
                lineHeight: 1.04,
                transform: "none"
              },
              {
                type: "text",
                role: "subheadline",
                text: "Underrubrik",
                x: 8,
                y: 48,
                w: 34,
                h: 12,
                fontSize: 38,
                weight: 800,
                color: "#f97316",
                align: "left",
                lineHeight: 1.12,
                transform: "none"
              },
              {
                type: "text",
                role: "bullets",
                text: "Kort punkt\\nKort punkt",
                x: 8,
                y: 64,
                w: 34,
                h: 12,
                fontSize: 28,
                weight: 700,
                color: "#334155",
                align: "left",
                lineHeight: 1.25,
                transform: "none"
              },
              {
                type: "text",
                role: "cta",
                text: "CTA",
                x: 8,
                y: 82,
                w: 32,
                h: 7,
                fontSize: 30,
                weight: 850,
                color: "#0f172a",
                align: "left",
                lineHeight: 1.1,
                transform: "uppercase"
              }
            ]
          }
        }
      ]
    }, null, 2)
  ].join("\n");
}

async function generateAdStudioBrief(payload = {}) {
  const apiKey = getOpenAiApiKey(payload);
  if (!apiKey) {
    throw new Error("OpenAI API-nyckel saknas. Klistra in den i Annonsstudio och prova igen.");
  }

  const content = [{ type: "text", text: buildAdStudioPrompt(payload) }];
  (payload.images || []).slice(0, 8).forEach((image) => {
    if (image?.dataUrl?.startsWith("data:image/")) {
      content.push({ type: "image_url", image_url: { url: image.dataUrl, detail: "low" } });
    }
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: payload.model || OPENAI_BRIEF_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Du returnerar strikt JSON f\u00f6r en svensk annonsstudio. Ingen markdown, inga f\u00f6rklaringar utanf\u00f6r JSON."
        },
        { role: "user", content }
      ],
      temperature: 0.8
    })
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "Kunde inte skapa AI-brief.");
  }

  const text = json?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(text);
  return normalizeAdStudioAiResult(parsed, payload);
}

function normalizeAdStudioAiResult(result = {}, payload = {}) {
  const brief = result.brief || {};
  const fallbackBrand = payload.brand || payload.lead?.companyName || "";
  const fallbackPhone = payload.phone || payload.lead?.phone || "";
  const fallbackEmail = payload.email || payload.lead?.email || "";
  const fallbackWebsite = payload.website || payload.lead?.website || "";
  const concepts = Array.isArray(result.concepts) ? result.concepts : [];
  return {
    brief: {
      customerName: brief.customerName || fallbackBrand,
      contactName: brief.contactName || "",
      phone: brief.phone || fallbackPhone,
      email: brief.email || fallbackEmail,
      website: brief.website || fallbackWebsite,
      objective: brief.objective || "Skapa en tydlig lokal annons.",
      audience: brief.audience || "Potentiella kunder i n\u00e4romr\u00e5det.",
      offer: brief.offer || "",
      tone: brief.tone || "Professionell och trygg.",
      mustHave: Array.isArray(brief.mustHave) ? brief.mustHave : [],
      avoid: Array.isArray(brief.avoid) ? brief.avoid : [],
      format: brief.format || "16:9 landskap",
      imageRead: Array.isArray(brief.imageRead) ? brief.imageRead : []
    },
    concepts: concepts.slice(0, 4).map((concept, index) => normalizeAdStudioConcept(concept, index))
  };
}

function normalizeAdStudioConcept(concept = {}, index = 0) {
  const normalized = {
    id: concept.id || `concept-${index + 1}`,
    title: concept.title || `Utkast ${index + 1}`,
    rationale: concept.rationale || "",
    imageIndex: Number.isInteger(concept.imageIndex) ? concept.imageIndex : index,
    headline: concept.headline || "Tydligt budskap",
    subheadline: concept.subheadline || "",
    bullets: Array.isArray(concept.bullets) ? concept.bullets.slice(0, 4) : [],
    cta: concept.cta || "Kontakta oss",
    palette: normalizeAdStudioPalette(concept.palette),
    design: normalizeAdStudioDesign(concept.design, concept, index)
  };
  return normalized;
}

function normalizeAdStudioPalette(palette = {}) {
  return {
    primary: normalizeHexColor(palette.primary, "#0f172a"),
    accent: normalizeHexColor(palette.accent, "#f97316"),
    surface: normalizeHexColor(palette.surface, "#ffffff"),
    text: normalizeHexColor(palette.text, "#ffffff")
  };
}

function normalizeAdStudioDesign(design = {}, concept = {}, index = 0) {
  const palette = normalizeAdStudioPalette(concept.palette);
  const background = design.background || {};
  const layers = Array.isArray(design.layers) ? design.layers.map(normalizeAdStudioLayer).filter(Boolean) : [];
  return {
    background: {
      imageIndex: Number.isInteger(background.imageIndex) ? background.imageIndex : Number.isInteger(concept.imageIndex) ? concept.imageIndex : index,
      color: normalizeHexColor(background.color, palette.primary),
      fit: background.fit === "contain" ? "contain" : "cover",
      focalX: clampNumber(background.focalX, 0, 100, 50),
      focalY: clampNumber(background.focalY, 0, 100, 50),
      overlayColor: normalizeHexColor(background.overlayColor, "#000000"),
      overlayOpacity: clampNumber(background.overlayOpacity, 0, 0.9, 0.32)
    },
    layers: layers.length ? layers : buildFallbackAdStudioLayers(concept, palette, index)
  };
}

function normalizeAdStudioLayer(layer = {}) {
  const type = ["text", "shape", "line"].includes(layer.type) ? layer.type : "";
  if (!type) {
    return null;
  }
  const normalized = {
    type,
    role: String(layer.role || ""),
    x: clampNumber(layer.x, 0, 100, 6),
    y: clampNumber(layer.y, 0, 100, 8),
    w: clampNumber(layer.w, 4, 100, 30),
    h: clampNumber(layer.h, 1, 100, 10),
    color: normalizeHexColor(layer.color, type === "text" ? "#ffffff" : "#000000"),
    opacity: clampNumber(layer.opacity, 0, 1, 1),
    radius: clampNumber(layer.radius, 0, 20, 0)
  };
  if (type === "text") {
    normalized.text = String(layer.text || "");
    normalized.fontSize = clampNumber(layer.fontSize, 18, 150, 48);
    normalized.weight = clampNumber(layer.weight, 300, 950, 800);
    normalized.align = ["left", "center", "right"].includes(layer.align) ? layer.align : "left";
    normalized.lineHeight = clampNumber(layer.lineHeight, 0.9, 1.6, 1.12);
    normalized.transform = ["none", "uppercase"].includes(layer.transform) ? layer.transform : "none";
  }
  if (type === "shape") {
    normalized.shape = layer.shape === "circle" ? "circle" : "rect";
  }
  return normalized;
}

function buildFallbackAdStudioLayers(concept = {}, palette = {}, index = 0) {
  const left = index % 2 === 0;
  const panel = left ? { x: 5, y: 9, w: 43, h: 78 } : { x: 52, y: 9, w: 43, h: 78 };
  const textX = panel.x + 4;
  return [
    { type: "shape", shape: "rect", x: panel.x, y: panel.y, w: panel.w, h: panel.h, color: palette.surface || "#ffffff", opacity: 0.88, radius: 2 },
    { type: "line", x: textX, y: panel.y + 9, w: 14, h: 0.6, color: palette.accent || "#f97316", opacity: 1, radius: 0.3 },
    { type: "text", role: "brand", text: "", x: textX, y: panel.y + 13, w: panel.w - 8, h: 7, fontSize: 34, weight: 850, color: palette.primary || "#0f172a", align: "left", lineHeight: 1.05, transform: "none", opacity: 1 },
    { type: "text", role: "headline", text: concept.headline || "", x: textX, y: panel.y + 25, w: panel.w - 8, h: 26, fontSize: 72, weight: 900, color: palette.primary || "#0f172a", align: "left", lineHeight: 1.02, transform: "none", opacity: 1 },
    { type: "text", role: "subheadline", text: concept.subheadline || "", x: textX, y: panel.y + 54, w: panel.w - 8, h: 12, fontSize: 34, weight: 850, color: palette.accent || "#f97316", align: "left", lineHeight: 1.12, transform: "none", opacity: 1 },
    { type: "text", role: "bullets", text: (concept.bullets || []).join("\n"), x: textX, y: panel.y + 68, w: panel.w - 8, h: 10, fontSize: 25, weight: 700, color: "#334155", align: "left", lineHeight: 1.25, transform: "none", opacity: 1 },
    { type: "text", role: "cta", text: concept.cta || "", x: textX, y: panel.y + 81, w: panel.w - 8, h: 6, fontSize: 28, weight: 900, color: palette.primary || "#0f172a", align: "left", lineHeight: 1.1, transform: "uppercase", opacity: 1 }
  ];
}

function normalizeHexColor(value, fallback) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

async function generateAdStudioImage(payload = {}) {
  const apiKey = getOpenAiApiKey(payload);
  if (!apiKey) {
    throw new Error("OpenAI API-nyckel saknas.");
  }

  const prompt = buildCompleteAdImagePrompt(payload);
  const references = (payload.images || [])
    .filter((image) => image?.dataUrl?.startsWith("data:image/"))
    .slice(0, 6);
  let json;
  let safetyFallbackUsed = false;
  try {
    json = references.length
      ? await requestOpenAiAdImageEdit(apiKey, prompt, references)
      : await requestOpenAiAdImageGeneration(apiKey, prompt);
  } catch (error) {
    if (!isOpenAiSafetyRejection(error)) {
      throw error;
    }
    safetyFallbackUsed = true;
    const safePrompt = buildCompleteAdImagePrompt({
      ...payload,
      safetyFallback: true,
      images: []
    });
    json = await requestOpenAiAdImageGeneration(apiKey, safePrompt);
  }
  const image = json?.data?.[0];
  if (!image?.b64_json) {
    throw new Error("Bildsvaret saknade bilddata.");
  }
  return {
    name: "AI-genererad komplett annons",
    dataUrl: `data:image/png;base64,${image.b64_json}`,
    completeAd: true,
    model: OPENAI_IMAGE_MODEL,
    size: OPENAI_IMAGE_SIZE,
    safetyFallbackUsed
  };
}

function buildCompleteAdImagePrompt(payload = {}) {
  const fields = payload.fields || {};
  const brief = parseAdStudioJsonMaybe(payload.brief) || {};
  const concept = parseAdStudioJsonMaybe(payload.concept) || {};
  const webResearch = payload.webResearch || {};
  const compactConcept = {
    title: concept.title || "",
    rationale: concept.rationale || "",
    headline: concept.headline || fields.headline || "",
    subheadline: concept.subheadline || fields.subheadline || "",
    bullets: Array.isArray(concept.bullets) ? concept.bullets.slice(0, 4) : splitAdStudioLines(fields.body).slice(0, 4),
    cta: concept.cta || fields.cta || "",
    palette: concept.palette || { accent: fields.accent || "" }
  };
  const contact = {
    phone: fields.phone || brief.phone || "",
    email: fields.email || brief.email || "",
    website: fields.website || brief.website || ""
  };
  const hasPreviousAd = Boolean((payload.images || []).find((image) => image?.type === "finished-ad"));
  const revisionFeedback = String(fields.creativeFeedback || payload.creativeFeedback || "").trim();
  const isRevision = hasPreviousAd && revisionFeedback;
  const safetyFallback = Boolean(payload.safetyFallback);
  return [
    "Du \u00e4r en senior svensk art director p\u00e5 en mediabyr\u00e5.",
    "Skapa en komplett, f\u00e4rdig digital annonsbild i 16:9. Bilden ska vara klar att anv\u00e4nda direkt, inte en bakgrund och inte en mall.",
    "Du \u00e4r mediateamet. Kunden kan ha skickat r\u00f6rigt eller f\u00f6r mycket material. Du ska sj\u00e4lv f\u00f6rst\u00e5 m\u00e5let, v\u00e4lja vinkel, prioritera bild och skapa slutresultatet.",
    safetyFallback ? "SAFE VISUAL FALLBACK: tidigare bildreferenser stoppades av safety-filter. Det kan fortfarande vara ett legitimt gym-, coachnings- eller progress-case, men skapa annonsen utan att anv\u00e4nda de uppladdade kroppsbilderna som direkta referenser." : "",
    safetyFallback ? "F\u00f6r gym, h\u00e4lsa, coachning, kost, tr\u00e4ning, kiropraktik eller metabolic balance: anv\u00e4nd professionellt och tryggt bildspr\u00e5k som p\u00e5kl\u00e4dd tr\u00e4ning i gym, coachningssamtal, h\u00e4lsosam mat, m\u00e5ttband/tr\u00e4ningsutrustning, silhuett i sportkl\u00e4der, premium wellness-grafik eller abstrakta former. Undvik underkl\u00e4der, nakna magar som huvudmotiv, sexuellt fokus, explicit f\u00f6re/efter-komposition och medicinskt chockerande bildspr\u00e5k." : "",
    isRevision ? "REVISION MODE: anv\u00e4ndarens feedback \u00e4r en \u00e4ndringsbest\u00e4llning. Skapa inte samma annons igen. Den nya bilden m\u00e5ste tydligt visa att feedbacken har p\u00e5verkat resultatet." : "",
    isRevision ? "N\u00e4r en tidigare komplett annons finns som referens ska du anv\u00e4nda den f\u00f6r att f\u00f6rst\u00e5 vad som ska f\u00f6rb\u00e4ttras, inte f\u00f6r att kopiera layouten. Byt minst tre tydliga saker om feedbacken inte s\u00e4ger exakt annat: komposition, bildbesk\u00e4rning, typografisk hierarki, f\u00e4rgk\u00e4nsla, CTA-placering eller visuellt fokus." : "",
    isRevision ? `Feedback som m\u00e5ste synas i n\u00e4sta version: ${revisionFeedback}` : "",
    isRevision ? `Revision-id f\u00f6r variation: ${payload.revisionId || Date.now()}` : "",
    "Du ska sj\u00e4lv komponera hela annonsen: bildurval, besk\u00e4rning, typografi, f\u00e4rger, kontrast, badges, enkla ikoniska element, CTA-yta och kontaktinformation.",
    "Kundens bifogade bilder \u00e4r referensmaterial, inte en checklista. Du ska sj\u00e4lv v\u00e4lja den eller de bilder som b\u00e4st s\u00e4ljer m\u00e5let och budskapet. Ignorera svaga, dubbla eller irrelevanta bilder.",
    "Anv\u00e4nd inte alla bilder bara f\u00f6r att de finns. Om en enda bild ger starkast annons, anv\u00e4nd en enda. Om flera bilder beh\u00f6vs f\u00f6r att ber\u00e4tta r\u00e4tt sak, kombinera dem snyggt.",
    "V\u00e4lj det mest s\u00e4ljande utsnittet och g\u00f6r det visuellt premium, lokalt och trov\u00e4rdigt.",
    "Undvik Canva-k\u00e4nsla, generiska AI-detaljer, plastiga 3D-ikoner, fejkade logotyper, vattenst\u00e4mplar, stockbildsk\u00e4nsla och layout som ser kopierad ut fr\u00e5n tidigare annonser.",
    "Viktigt: annonstexten m\u00e5ste vara p\u00e5 korrekt svenska. H\u00e5ll texten kort, s\u00e4ljande och l\u00e4sbar p\u00e5 digital sk\u00e4rm.",
    "L\u00e4gg all viktig text inom en trygg marginal p\u00e5 cirka 6 procent fr\u00e5n kanterna. Inga kapade ord, inga halvklara bokst\u00e4ver, ingen text som krockar med motivet.",
    isRevision ? "" : "Om f\u00f6rsta referensbilden \u00e4r en tidigare AI-genererad komplett annons: anv\u00e4nd den som utg\u00e5ngspunkt och g\u00f6r en b\u00e4ttre, mer premium version enligt feedbacken. Kopiera inte misstag.",
    hasPreviousAd ? (isRevision ? "Det finns en tidigare komplett annons i referenserna, men den nya versionen ska vara tydligt uppdaterad enligt feedbacken." : "Det finns en tidigare komplett annons i referenserna. F\u00f6rb\u00e4ttra den hellre \u00e4n att starta helt om, om det passar briefen.") : "Det finns ingen tidigare komplett annons. Skapa ett starkt f\u00f6rsta originalf\u00f6rslag.",
    "Din kreativa feedback/styrning fr\u00e5n anv\u00e4ndaren v\u00e4ger tyngst efter faktiska kontaktuppgifter. Anv\u00e4nd den f\u00f6r att g\u00f6ra n\u00e4sta version mer r\u00e4tt.",
    "",
    "Format och leverans:",
    `- 16:9 landskap, ${OPENAI_IMAGE_SIZE}.`,
    "- F\u00e4rdig annonsbild med text och grafik inbyggt i bilden.",
    "- Ingen extern redigering ska kr\u00e4vas f\u00f6r att kunden ska kunna granska den.",
    "",
    "Kund och material:",
    JSON.stringify({
      brand: fields.brand || payload.brand || brief.customerName || "",
      customerInstructions: fields.instructions || payload.instructions || "",
      creativeFeedbackFromMediaTeam: fields.creativeFeedback || payload.creativeFeedback || "",
      publicWebResearch: webResearch.summary || "",
      interpretedBrief: brief,
      selectedDirection: compactConcept,
      contact
    }, null, 2),
    "",
    "Text som ska prioriteras i annonsen om det passar kompositionen:",
    `- Varum\u00e4rke: ${fields.brand || payload.brand || brief.customerName || ""}`,
    `- Rubrik: ${compactConcept.headline}`,
    `- Underrubrik: ${compactConcept.subheadline}`,
    compactConcept.bullets.length ? `- St\u00f6dpunkter: ${compactConcept.bullets.join(" | ")}` : "",
    `- CTA/kontakt: ${compactConcept.cta || contact.phone || contact.website || contact.email}`,
    contact.phone ? `- Telefon exakt: ${contact.phone}` : "",
    contact.email ? `- E-post exakt: ${contact.email}` : "",
    contact.website ? `- Webb exakt: ${contact.website}` : "",
    "",
    "Kvalitetsribba:",
    "- Resultatet ska se ut som att en riktig designer gjort det, inte som att ett system lagt text ovanp\u00e5 en bild.",
    "- Hellre f\u00e5, tydliga designelement \u00e4n m\u00e5nga dekorationer.",
    "- Om du \u00e4r os\u00e4ker: prioritera kundens riktiga bild, tydlig rubrik, premiumk\u00e4nsla och exakt kontakt."
  ].filter(Boolean).join("\n");
}

async function requestOpenAiAdImageGeneration(apiKey, prompt) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: OPENAI_IMAGE_SIZE,
      quality: "high",
      output_format: "png",
      background: "opaque",
      n: 1
    })
  });
  return readOpenAiImageResponse(response);
}

async function requestOpenAiAdImageEdit(apiKey, prompt, images) {
  const form = new FormData();
  form.set("model", OPENAI_IMAGE_MODEL);
  form.set("prompt", prompt);
  form.set("size", OPENAI_IMAGE_SIZE);
  form.set("quality", "high");
  form.set("output_format", "png");
  form.set("background", "opaque");
  images.forEach((image, index) => {
    const blob = dataUrlToImageBlob(image.dataUrl);
    const name = sanitizeAdStudioUploadName(image.name || `referens-${index + 1}.png`, blob.type);
    form.append("image[]", blob, name);
  });
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });
  return readOpenAiImageResponse(response);
}

async function readOpenAiImageResponse(response) {
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!response.ok) {
    throw new Error(formatOpenAiImageError(json?.error?.message || text || "Kunde inte generera komplett annonsbild."));
  }
  return json;
}

function dataUrlToImageBlob(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match || !match[1].startsWith("image/")) {
    throw new Error("En referensbild kunde inte l\u00e4sas av AI-generatorn.");
  }
  return new Blob([Buffer.from(match[2], "base64")], { type: match[1] });
}

function sanitizeAdStudioUploadName(name, mimeType = "image/png") {
  const fallbackExtension = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
  const cleaned = String(name || `referens.${fallbackExtension}`)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 90);
  return /\.[a-z0-9]{2,5}$/i.test(cleaned) ? cleaned : `${cleaned || "referens"}.${fallbackExtension}`;
}

function parseAdStudioJsonMaybe(value) {
  if (!value) {
    return {};
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

function splitAdStudioLines(value) {
  return String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function isOpenAiSafetyRejection(error) {
  return /safety system|safety_violations|sexual|request was rejected/i.test(String(error?.message || ""));
}

function formatOpenAiImageError(message) {
  const text = String(message || "");
  if (/safety system|safety_violations|sexual|request was rejected/i.test(text)) {
    return "OpenAI stoppade bildreferenserna av safety-sk\u00e4l, troligen p\u00e5 grund av kropp/progress-bilder. Prova utan de bilderna eller anv\u00e4nd ett mer neutralt h\u00e4lsa/coaching-bildspr\u00e5k.";
  }
  if (/billing hard limit/i.test(text)) {
    return "OpenAI stoppar bildgenereringen eftersom billing hard limit \u00e4r n\u00e5dd. H\u00f6j eller ta bort gr\u00e4nsen i OpenAI Billing och f\u00f6rs\u00f6k igen.";
  }
  if (/tokens per min|TPM|rate limit|Limit 0/i.test(text)) {
    return `${text} Kontrollera att projektet har aktiv billing och att bildmodellen har rate limit i OpenAI-kontot.`;
  }
  return text;
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
  ipcMain.handle("statistics:get", (_event, payload) => store.getStatistics(payload));
  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("app:save-settings", (_event, payload) => store.saveSettings(payload));
  ipcMain.handle("campaigns:create", (_event, payload) => store.createCampaign(payload));
  ipcMain.handle("campaigns:update", (_event, payload) => store.upsertCampaign(payload));
  ipcMain.handle("campaigns:delete", (_event, payload) => store.deleteCampaign(payload.campaignId));
  ipcMain.handle("leads:create", (_event, payload) => store.createLead(payload));
  ipcMain.handle("leads:import", (_event, payload) => store.importLeads(payload.leads, payload.options));
  ipcMain.handle("leads:update", (_event, payload) => store.updateLead(payload.leadId, payload.patch));
  ipcMain.handle("leads:action", (_event, payload) => store.applyLeadAction(payload));
  ipcMain.handle("leads:log-event", (_event, payload) => store.addTimelineEvent(payload));
  ipcMain.handle("calls:create-intent", (_event, payload) => store.createCallIntent(payload));
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
  ipcMain.handle("places:search", async (event, payload = {}) => {
    const searchId = payload.searchId || "";
    const sendProgress = (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send("places:progress", { searchId, ...progress });
      }
    };
    return searchPlaces({ ...payload, onProgress: sendProgress });
  });
  ipcMain.handle("ads:research-customer", async (_event, payload) => researchAdStudioCustomer(payload));
  ipcMain.handle("ads:save-asset", async (_event, payload) => saveAdStudioAsset(payload));
  ipcMain.handle("ads:get-asset-data-url", async (_event, payload) => getAdStudioAssetDataUrl(payload));
  ipcMain.handle("ads:generate-brief", async (_event, payload) => generateAdStudioBrief(payload));
  ipcMain.handle("ads:generate-image", async (_event, payload) => generateAdStudioImage(payload));
  ipcMain.handle("invoices:create-pdf", (_event, payload) => createInvoicePdf(payload));
  ipcMain.handle("telavox:sync-lead", (_event, payload) => store.syncTelavoxLeadCalls(payload));
  ipcMain.handle("telavox:sync-period", (_event, payload) => store.syncTelavoxPeriodCalls(payload));
  ipcMain.handle("telavox:resolve-call", (_event, payload) => store.resolveTelavoxCall(payload));
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
