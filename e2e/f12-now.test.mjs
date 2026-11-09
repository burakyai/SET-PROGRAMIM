// F12 Şimdi çekiliyor: tek dokunuş = detay, çift dokunuş = yak / söndür, birden çok sahne = blok.
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload, stored, sheetClosed, FIX } from "./harness.mjs";
import path from "node:path";

let srv, app;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });
beforeEach(async () => { app = await openApp({ base: srv.base }); });
afterEach(async () => { const p = app.problems; await app.browser.close(); assert.deepEqual(p, []); });

const scene = (p, no) => p.locator("#main").getByRole("button", { name: new RegExp("^(● ŞİMDİ( · BLOK)? |SIRADAKİ )?" + no + "\\s") }).first();
const nowKeys = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("setprog.now") || "null")?.keys || []);
const sheetOn = (p) => p.locator("#sceneSheet").evaluate((e) => e.classList.contains("on"));
async function dbl(p, no) { await scene(p, no).locator(".body").dblclick(); await p.waitForTimeout(450); }
async function allView(p) {
  await p.locator("#wkToggle").click(); await p.waitForTimeout(250);
  await p.getByRole("button", { name: "Tüm program" }).click();
  await p.locator("#wkToggle").click(); await p.waitForTimeout(250);
}

test("F12-H0 tek dokunuş detayı açar, yakmaz", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await scene(p, "20").locator(".body").click(); await p.waitForTimeout(500);
  assert.equal(await sheetOn(p), true);
  assert.deepEqual(await nowKeys(p), []);
});

test("F12-H1 çift dokunuş yakar: şerit, vurgu, sıradaki, bilgi kartta; detay açılmaz", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await allView(p);
  await dbl(p, "4");
  assert.equal(await sheetOn(p), false, "çift dokunuş detay açmamalı");
  const bar = p.locator("#nowbar");
  assert.match(await bar.innerText(), /Sahne 4 · KAHVEHANE/);
  assert.match(await bar.innerText(), /Sıradaki: 10-11A-12-13A-14-15A-16/);
  const now = p.locator("#day-2026-11-09 .scene.now");
  assert.equal(await now.count(), 1);
  assert.match(await now.innerText(), /RIZA KAPTANDAN BAHSEDER/);
  assert.match(await now.innerText(), /RIZA · SELİM/);
  assert.equal(await p.locator("#day-2026-11-09 .scene.nextup").count(), 1);
});

test("F12-H2 blok: çift dokunuşla eklenir, tekrar çift dokunuşla tek tek söner", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await allView(p);
  await dbl(p, "4"); await dbl(p, "20");
  assert.deepEqual(await nowKeys(p), ["4|1. EKİP", "20|1. EKİP"]);
  assert.match(await p.locator("#nowbar").innerText(), /BLOK 2 SAHNE/);
  assert.match(await p.locator("#nowbar").innerText(), /Sahne 4 \+ 20/);
  assert.equal(await p.locator("#day-2026-11-09 .scene.now").count(), 2);
  await dbl(p, "4");
  assert.deepEqual(await nowKeys(p), ["20|1. EKİP"]);
  await dbl(p, "20");
  assert.deepEqual(await nowKeys(p), []);
  assert.equal(await p.locator("#nowbar").isVisible(), false);
});

test("F12-E1 ✓ bloğun hepsini çekildi yapar ve söner", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await allView(p);
  await dbl(p, "4"); await dbl(p, "30");
  await p.getByRole("button", { name: "Çekildi, modu kapat" }).click(); await p.waitForTimeout(500);
  assert.deepEqual(await nowKeys(p), []);
  const d = (await stored(p)).days["2026-11-09"];
  assert.equal(d.all.find((s) => s.sceneNo === "4").done, true);
  assert.equal(d.all.find((s) => s.sceneNo === "30").done, true);
});

test("F12-E2 'Sıradaki ›' isteğe bağlı: bloğu bitirir, son sahneden sonrakine geçer, çekilmişleri atlar", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await allView(p);
  await scene(p, "10…16").locator(".chev").click();
  await p.getByRole("button", { name: /Çekildi olarak işaretle/ }).click(); await sheetClosed(p, "#sceneSheet");
  await dbl(p, "1…3"); await dbl(p, "4");
  await p.getByRole("button", { name: "Sıradaki ›" }).click(); await p.waitForTimeout(500);
  assert.deepEqual(await nowKeys(p), ["20|1. EKİP"]);
  assert.equal(await p.getByRole("button", { name: "Sıradaki ›" }).count(), 0, "ekibin son sahnesinde Sıradaki yok");
});

test("F12-E3 bloktan biri kaydırılarak çekilirse sadece o söner; yenilemede hatırlanır", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await dbl(p, "20"); await dbl(p, "1…3");
  await p.reload(); await p.waitForTimeout(600);
  assert.match(await p.locator("#nowbar").innerText(), /BLOK 2 SAHNE/, "başka haftadayken de şerit görünür");
  await p.getByRole("button", { name: "Şimdi çekilen sahneye git" }).click(); await p.waitForTimeout(500);
  const loc = scene(p, "20"); await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(x - (120 * i) / 8, y);
  await p.mouse.up(); await p.waitForTimeout(500);
  assert.deepEqual(await nowKeys(p), ["1-2A-3|1. EKİP"]);
});

test("F12-E4 başka güne çift dokunmak yeni blok başlatır", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await dbl(p, "20"); await dbl(p, "50");
  assert.deepEqual(await nowKeys(p), ["50|1. EKİP"]);
  assert.equal(await p.locator("#day-2026-11-09 .scene.now").count(), 0);
});

test("F12-E5 eski kayıt biçimi (tek sahne) okunur", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await p.evaluate(() => localStorage.setItem("setprog.now", JSON.stringify({ date: "2026-11-09", key: "20|1. EKİP" })));
  await p.reload(); await p.waitForTimeout(600);
  assert.match(await p.locator("#nowbar").innerText(), /Sahne 20/);
});

test("BUG-013 iPhone çentik payı geç gelince ilk gün başlığı üst barın altında kalmaz", async () => {
  const p = app.page;
  await upload(p, [path.join(FIX, "haftalik.pdf")]);
  await p.evaluate(() => scrollTo(0, 0));
  // iOS app web views report the top inset only after first paint
  await p.evaluate(() => document.documentElement.style.setProperty("--safe-t", "59px"));
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({
    header: document.querySelector("header").getBoundingClientRect().bottom,
    content: document.querySelector("#main").getBoundingClientRect().top,
  }));
  assert.ok(r.content >= r.header - 1, `içerik üst barın altında kalmamalı (header ${r.header}, içerik ${r.content})`);
});
