// F14 Senaryo: PDF yükle -> sahne detayında "Senaryoyu oku", benim repliklerim vurgulu
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload, sheetClosed } from "./harness.mjs";

let srv, app;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });
beforeEach(async () => { app = await openApp({ base: srv.base }); });
afterEach(async () => { const p = app.problems; await app.browser.close(); assert.deepEqual(p, []); });

const scene = (p, no) => p.locator("#main").getByRole("button", { name: new RegExp("^" + no + "\\s") }).first();
async function openDetail(p, no) { await scene(p, no).locator(".chev").click(); await p.waitForTimeout(350); }

test("F14-H1 senaryo yüklenir: bölüm ve sahne sayısı bildirilir", async () => {
  const p = app.page;
  await upload(p, ["senaryo-5.pdf"]);
  await assert.doesNotReject(p.getByText("5. bölüm senaryosu eklendi · 9 sahne").waitFor({ timeout: 8000 }));
});

test("F14-H2 sahne detayında senaryo: parçalı sahne, replik sayısı, vurgu", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf", "senaryo-5.pdf"]);
  await openDetail(p, "1…3");
  const btn = p.getByRole("button", { name: /Senaryoyu oku · Sahne 1, 2, 3 · 2 replik/ });
  assert.equal(await btn.count(), 1, "1-2A-3 → sahne 1, 2, 3; ÇOCUK KAPTAN sayılmaz, KAPTAN(V.O) sayılır");
  await btn.click(); await p.waitForTimeout(400);
  const body = p.locator("#scriptBody");
  assert.equal(await body.locator(".scr-h").count(), 3);
  assert.match(await body.innerText(), /DIŞ\.GÜN\.LİMAN/);
  const mine = await body.locator(".scr-dlg.me").allInnerTexts();
  assert.deepEqual(mine, ["Tut şu halatı Rıza, kaçırma!", "Deniz bugün sert; kimse çıkmayacak."]);
  assert.equal(await body.locator(".scr-cue.me").count(), 2);
});

test("F14-H3 çok satırlı replik birleşir, ortak replik (KAPTAN-NAZLI) benim sayılır", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf", "senaryo-5.pdf"]);
  await openDetail(p, "10…16");
  await p.getByRole("button", { name: /Senaryoyu oku · Sahne 10 · 1 replik/ }).click(); await p.waitForTimeout(300);
  assert.deepEqual(await p.locator("#scriptBody .scr-dlg.me").allInnerTexts(), ["Liman karıştı, Nazlı. Uzun hikâye; yarın anlatırım, söz."]);
  await p.keyboard.press("Escape"); await sheetClosed(p, "#scriptSheet");
  await openDetail(p, "20");
  assert.equal(await p.getByRole("button", { name: /Senaryoyu oku · Sahne 20 · 1 replik/ }).count(), 1);
});

test("F14-E1 senaryo yoksa ipucu, yanlış bölüm eşleşmez", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await openDetail(p, "20");
  await assert.doesNotReject(p.getByText("5. bölümün senaryo PDF'ini yüklersen").waitFor());
});

test("F14-E2 senaryo yenilemede kalır, Yüklenen programlar'dan silinir", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf", "senaryo-5.pdf"]);
  await p.reload(); await p.waitForTimeout(800);
  await p.locator("#wkToggle").click(); await p.getByRole("button", { name: "Sonraki hafta" }).click(); await p.locator("#wkToggle").click();
  await p.waitForTimeout(300);
  await openDetail(p, "50");
  assert.equal(await p.getByRole("button", { name: /Senaryoyu oku · Sahne 50/ }).count(), 1, "senaryo telefonda kalmalı");
  await p.keyboard.press("Escape"); await sheetClosed(p, "#sceneSheet");
  await p.locator("#wkToggle").click(); await p.getByRole("button", { name: "Yüklenen programlar" }).click();
  const row = p.locator(".prog", { hasText: "5. bölüm" });
  await row.getByRole("button", { name: "Sil" }).click(); await row.getByRole("button", { name: "Emin misin?" }).click();
  await p.waitForTimeout(400);
  assert.equal(await p.locator(".prog", { hasText: "5. bölüm" }).count(), 0);
  await p.reload(); await p.waitForTimeout(800);
  const n = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open("setprog-scripts", 1); r.onsuccess = () => { const q = r.result.transaction("scripts").objectStore("scripts").count(); q.onsuccess = () => res(q.result); }; }));
  assert.equal(n, 0);
});
