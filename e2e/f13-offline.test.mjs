// F13 İnternetsiz kullanım (GitHub Pages / ana ekran uygulaması)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload, stored } from "./harness.mjs";

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });

test("F13-H1 bir kez açıldıktan sonra internetsiz açılır ve PDF okur", async () => {
  const app = await openApp({ base: srv.base });
  const p = app.page;
  try {
    // first visit online: service worker installs and caches the app + PDF reader
    await p.waitForFunction(async () => !!(await navigator.serviceWorker?.getRegistration())?.active, null, { timeout: 15000 });
    await p.waitForFunction(async () => (await caches.keys()).length > 0, null, { timeout: 15000 });
    await p.reload(); await p.waitForTimeout(800);
    await app.setOffline(true);
    await p.reload(); await p.waitForTimeout(800);
    assert.equal(await p.getByRole("button", { name: "Program yükle" }).isVisible(), true, "internetsiz açılmalı");
    await upload(p, ["haftalik.pdf"]);
    assert.equal((await stored(p)).days?.["2026-11-09"]?.scenes.length, 4, "internetsiz PDF okunmalı");
  } finally { await app.browser.close(); }
});

test("F13-H2 PDF okuyucu uygulamayla birlikte gelir (dış sunucuya gitmez)", async () => {
  const app = await openApp({ base: srv.base });
  const p = app.page; const ext = [];
  p.on("request", (r) => { const u = new URL(r.url()); if (/pdf/.test(u.pathname) && u.origin !== new URL(srv.base).origin) ext.push(r.url()); });
  try {
    await upload(p, ["haftalik.pdf"]);
    assert.deepEqual(ext, []);
    assert.equal((await stored(p)).days["2026-11-09"].scenes.length, 4);
  } finally { await app.browser.close(); }
});
