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
  const btn = p.getByRole("button", { name: /Senaryoyu oku · 5\. bölüm · Sahne 1, 2, 3 · 2 replik/ });
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
  await p.getByRole("button", { name: /Senaryoyu oku · 5\. bölüm · Sahne 10 · 1 replik/ }).click(); await p.waitForTimeout(300);
  assert.deepEqual(await p.locator("#scriptBody .scr-dlg.me").allInnerTexts(), ["Liman karıştı, Nazlı. Uzun hikâye; yarın anlatırım, söz."]);
  await p.keyboard.press("Escape"); await sheetClosed(p, "#scriptSheet");
  await openDetail(p, "20");
  assert.equal(await p.getByRole("button", { name: /Senaryoyu oku · 5\. bölüm · Sahne 20 · 1 replik/ }).count(), 1);
});

test("F14-E1 senaryo yoksa ipucu, yanlış bölüm eşleşmez", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await openDetail(p, "20");
  await assert.doesNotReject(p.getByText("5. bölüm senaryosunu yüklersen").waitFor());
});

test("F14-E2 senaryo yenilemede kalır, Yüklenen programlar'dan silinir", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf", "senaryo-5.pdf"]);
  await p.reload(); await p.waitForTimeout(800);
  await p.locator("#wkToggle").click(); await p.getByRole("button", { name: "Sonraki hafta" }).click(); await p.locator("#wkToggle").click();
  await p.waitForTimeout(300);
  await openDetail(p, "50");
  assert.equal(await p.getByRole("button", { name: /Senaryoyu oku · 5\. bölüm · Sahne 50/ }).count(), 1, "senaryo telefonda kalmalı");
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

// ---- bölüm eşleştirme: "4-5" (önceki bölümden kalan), FİNAL, blok ve gün okuma ----
const sceneAny = (p, no) => p.locator("#main").getByRole("button", { name: new RegExp("^(● ŞİMDİ( · BLOK)? |SIRADAKİ )?" + no + "\\s") }).first();

test("F14-H5 BLM '4-5': önceki bölümden kalan sahne 4. bölüm senaryosunda açılır, bölümler arası geçilir", async () => {
  const p = app.page;
  await upload(p, ["karisik.pdf", "senaryo-4.pdf", "senaryo-5.pdf"]);
  await sceneAny(p, "20").locator(".chev").click(); await p.waitForTimeout(350);
  const btn = p.getByRole("button", { name: /Senaryoyu oku · 4\. bölüm · Sahne 20/ });
  assert.equal(await btn.count(), 1);
  await btn.click(); await p.waitForTimeout(400);
  assert.match(await p.locator("#scriptBody").innerText(), /Dördüncü bölümden kalan veda/);
  // both scripts have a scene 20: chips let the actor switch
  await p.locator("#scriptBody .scr-alts").getByRole("button", { name: "5. bölüm" }).click(); await p.waitForTimeout(300);
  assert.match(await p.locator("#scriptBody").innerText(), /Hoşça kal/);
});

test("F14-H6 FİNAL: başlığı 'FİNAL' olan senaryo, programda FİNAL yazan sahneye bağlanır", async () => {
  const p = app.page;
  await upload(p, ["karisik.pdf", "senaryo-final.pdf"]);
  await assert.doesNotReject(p.getByText(/Final senaryosu/).waitFor({ timeout: 8000 }));
  await sceneAny(p, "7").locator(".chev").click(); await p.waitForTimeout(350);
  await p.getByRole("button", { name: /Senaryoyu oku · Final · Sahne 7/ }).click(); await p.waitForTimeout(300);
  assert.match(await p.locator("#scriptBody").innerText(), /Son kez yanıyor/);
});

test("F14-H7 blok: ŞİMDİ bloğundaki sahnelerin senaryosu art arda okunur", async () => {
  const p = app.page;
  await upload(p, ["karisik.pdf", "senaryo-4.pdf", "senaryo-5.pdf", "senaryo-final.pdf"]);
  for (const no of ["20", "4"]) { await sceneAny(p, no).locator(".body").dblclick(); await p.waitForTimeout(450); }
  await p.getByRole("button", { name: "Bloğun senaryosunu oku" }).click(); await p.waitForTimeout(400);
  const body = p.locator("#scriptBody");
  assert.match(await body.innerText(), /Blok · 2 sahne/i);
  assert.equal(await body.locator(".scr-sep").count(), 2);
  assert.match(await body.innerText(), /Dördüncü bölümden kalan veda[\s\S]*Kaptan yine inat etti/);
});

test("F14-H8 gün menüsü: günün bütün sahnelerinin senaryosu", async () => {
  const p = app.page;
  await upload(p, ["karisik.pdf", "senaryo-4.pdf", "senaryo-5.pdf", "senaryo-final.pdf"]);
  await p.locator("#day-2026-11-09 [data-daymenu]").click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: /Bu günün senaryosunu oku · 3 sahne/ }).click(); await p.waitForTimeout(400);
  assert.equal(await p.locator("#scriptBody .scr-sep").count(), 3);
  assert.match(await p.locator("#scriptBody").innerText(), /Son kez yanıyor/);
});

test("F14-H9 elle seçim: senaryo bulunamazsa yüklü senaryolardan seçilir ve hatırlanır", async () => {
  const p = app.page;
  await upload(p, ["karisik.pdf", "senaryo-4.pdf"]);
  // scene 7 is FİNAL but only episode 4 is loaded, which has no scene 7 -> pick disabled; scene 4 (ep 5) not loaded
  await sceneAny(p, "4").locator(".chev").click(); await p.waitForTimeout(350);
  assert.match(await p.locator("#sceneBody").innerText(), /5\. bölüm senaryosunu yüklersen/);
  assert.equal(await p.getByRole("button", { name: /Yüklü senaryolardan seç/ }).count(), 1);
});
