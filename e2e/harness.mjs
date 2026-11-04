// Test harness: serves the app locally, swaps the pdf.js CDN for a local copy,
// and opens it in an iPhone-sized browser. Uses only `playwright` + node:test.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FIX = path.join(ROOT, "e2e", "fixtures");

function findPlaywright() {
  for (const p of ["playwright", "/opt/npm-tools/node_modules/playwright"]) {
    try { return require(p); } catch (_) {}
  }
  throw new Error("playwright not found: npm i -D playwright");
}
const { chromium, devices } = findPlaywright();

function findPdfjs() {
  const cands = [
    path.join(ROOT, "node_modules/pdfjs-dist/legacy/build"),
    "/opt/npm-tools/node_modules/pdfjs-dist/legacy/build",
  ];
  for (const c of cands) if (fs.existsSync(path.join(c, "pdf.mjs"))) return c;
  throw new Error("pdfjs-dist not found: npm i -D pdfjs-dist");
}
const PDFJS = findPdfjs();

const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".mjs": "text/javascript",
  ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json", ".pdf": "application/pdf" };

export async function startServer() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    let file;
    if (u.pathname.startsWith("/__pdfjs/")) file = path.join(PDFJS, path.basename(u.pathname));
    else file = path.join(ROOT, decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname));
    if (!file.startsWith(ROOT) && !file.startsWith(PDFJS)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end("nf"); }
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(buf);
    });
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  return { base, close: () => new Promise((r) => srv.close(r)) };
}

// classic-script shim that exposes the local ESM pdf.js as window.pdfjsLib
function pdfShim(base) {
  return `(()=>{const mod=import("${base}__pdfjs/pdf.mjs").then(m=>{m.GlobalWorkerOptions.workerSrc="${base}__pdfjs/pdf.worker.mjs";return m;});
  window.pdfjsLib={GlobalWorkerOptions:{},getDocument:(o)=>({promise:mod.then(m=>m.getDocument({data:o.data}).promise)})};})();`;
}

export async function openApp({ base, now, offlineCdn = false, libBroken = false, safariStreams = false, viewport = "iphone", colorScheme = "dark", storageState } = {}) {
  const browser = await chromium.launch();
  const opts = viewport === "iphone" ? { ...devices["iPhone 13"] } : { viewport: { width: 1440, height: 900 } };
  const ctx = await browser.newContext({ ...opts, colorScheme, storageState, timezoneId: "Europe/Istanbul" });
  // Safari (iOS) cannot iterate ReadableStream with for-await: simulate it
  if (safariStreams) await ctx.addInitScript(() => { delete ReadableStream.prototype[Symbol.asyncIterator]; delete ReadableStream.prototype.values; });
  const page = await ctx.newPage();
  // freeze "today" so year inference and week view are deterministic (Mon 2 Nov 2026)
  if (page.clock) await page.clock.install({ time: new Date(now || "2026-11-02T10:00:00+03:00") });
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/fonts\.(googleapis|gstatic)|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|net::ERR_FAILED/.test(t) || /Failed to load resource/.test(t)) return; // offline fonts in CI
    problems.push("console: " + t);
  });
  page.on("response", (r) => { if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // bundled pdf.js (lib/) — "offlineCdn" simulates it failing to download
  await ctx.route(/\/lib\/pdf[^/]*\.mjs(\?.*)?$/, (route) => (offlineCdn || libBroken) ? route.abort("failed") : route.fallback());
  await ctx.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\//, (route) => {
    if (offlineCdn) return route.abort("internetdisconnected");
    const u = route.request().url();
    if (u.endsWith("pdf.min.js")) return route.fulfill({ contentType: "text/javascript", body: pdfShim(base) });
    return route.fulfill({ contentType: "text/javascript", body: "/* worker not needed in tests */" });
  });
  await page.goto(base);
  await page.waitForLoadState("domcontentloaded");
  return { browser, ctx, page, problems, setCdnOffline: (v) => { offlineCdn = v; }, setOffline: (v) => ctx.setOffline(v) };
}

// Upload one or more fixture PDFs through the real UI
export async function upload(page, files, { character = "Kaptan", replace = true, wait = true } = {}) {
  await page.getByRole("button", { name: "Program yükle" }).click();
  await page.locator("#upSheet").getByLabel("Karakter adın").fill(character);
  await page.locator("#fileIn").setInputFiles(files.map((f) => (path.isAbsolute(f) ? f : path.join(FIX, f))));
  const chk = page.getByLabel(/eski programını yenisiyle değiştir/);
  if ((await chk.isChecked()) !== replace) await chk.click();
  await page.getByRole("button", { name: "Programı Oku" }).click();
  if (wait) await sheetClosed(page, "#upSheet");
}

export async function sheetClosed(page, sel, timeout = 20000) {
  await page.waitForFunction((s) => !document.querySelector(s).classList.contains("on"), sel, { timeout });
  await page.waitForTimeout(350); // slide-out animation
}

export async function stored(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("setprog.v1") || "{}"));
}

// tiny accessibility audit (axe is not installed in this environment):
// every visible button/link has a name, every input has a label
export async function a11yAudit(page) {
  return page.evaluate(() => {
    const bad = [];
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
    document.querySelectorAll("button, a[href]").forEach((e) => {
      if (!vis(e)) return;
      const name = (e.getAttribute("aria-label") || e.textContent || e.title || "").trim();
      if (!name) bad.push("unnamed " + e.tagName.toLowerCase() + (e.id ? "#" + e.id : "." + e.className));
    });
    document.querySelectorAll("input:not([type=hidden]):not([hidden])").forEach((e) => {
      if (!vis(e) && e.type !== "file") return;
      const lab = e.labels?.length || e.getAttribute("aria-label");
      if (!lab) bad.push("unlabelled input#" + e.id);
    });
    return bad;
  });
}
