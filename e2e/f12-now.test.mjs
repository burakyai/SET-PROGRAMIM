// F12 Şimdi çekiliyor: karta dokun → yanar, tekrar dokun → söner. Zincirleme yok, "Sıradaki" isteğe bağlı.
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload, stored, sheetClosed } from "./harness.mjs";

let srv, app;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });
beforeEach(async () => { app = await openApp({ base: srv.base }); });
afterEach(async () => { const p = app.problems; await app.browser.close(); assert.deepEqual(p, []); });

const scene = (p, no) => p.locator("#main").getByRole("button", { name: new RegExp("^(● ŞİMDİ |SIRADAKİ )?" + no + "\\s") }).first();
const nowKey = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("setprog.now") || "null")?.key || null);
async function tap(p, no) { await scene(p, no).locator(".body").click(); await p.waitForTimeout(300); }
async function allView(p) {
  await p.locator("#wkToggle").click(); await p.waitForTimeout(250);
  await p.getByRole("button", { name: "Tüm program" }).click();
  await p.locator("#wkToggle").click(); await p.waitForTimeout(250);
}

test("F12-H1 dokununca yanar: şerit, vurgu, sıradaki, tüm bilgi kartta", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await allView(p);
  await tap(p, "4");
  const bar = p.locator("#nowbar");
  assert.equal(await bar.isVisible(), true);
  assert.match(await bar.innerText(), /Sahne 4 · KAHVEHANE/);
  assert.match(await bar.innerText(), /Sıradaki: 10-11A-12-13A-14-15A-16/);
  const now = p.locator("#day-2026-11-09 .scene.now");
  assert.equal(await now.count(), 1);
  assert.match(await now.innerText(), /RIZA KAPTANDAN BAHSEDER/, "özet kartta tam görünür");
  assert.match(await now.innerText(), /RIZA · SELİM/, "oyuncular kartta görünür");
  assert.equal(await p.locator("#day-2026-11-09 .scene.nextup").count(), 1);
  assert.equal(await p.locator("#sceneSheet").evaluate((e) => e.classList.contains("on")), false, "dokunuş detay açmaz");
});

test("F12-H2 aynı karta tekrar dokununca söner; başka karta dokununca o yanar", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await tap(p, "20");
  assert.equal(await nowKey(p), "20|1. EKİP");
  await tap(p, "31");
  assert.equal(await nowKey(p), "31|2. EKİP");
  await tap(p, "31");
  assert.equal(await nowKey(p), null);
  assert.equal(await p.locator("#nowbar").isVisible(), false);
  assert.equal(await p.locator(".scene.now").count(), 0);
});

test("F12-H3 › detay açar, yakmaz", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await scene(p, "20").locator(".chev").click(); await p.waitForTimeout(300);
  assert.equal(await p.locator("#sceneSheet").evaluate((e) => e.classList.contains("on")), true);
  assert.equal(await nowKey(p), null);
});

test("F12-E1 ✓ çekildi işaretler ve söner (zincirleme yok)", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await allView(p);
  await tap(p, "4");
  await p.getByRole("button", { name: "Çekildi, modu kapat" }).click(); await p.waitForTimeout(400);
  assert.equal(await nowKey(p), null);
  assert.equal((await stored(p)).days["2026-11-09"].all.find((s) => s.sceneNo === "4").done, true);
});

test("F12-E2 'Sıradaki ›' isteğe bağlı: çekildi + sıradakine geçer, çekilmişleri atlar", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await allView(p);
  await scene(p, "10…16").locator(".chev").click();
  await p.getByRole("button", { name: /Çekildi olarak işaretle/ }).click(); await sheetClosed(p, "#sceneSheet");
  await tap(p, "4");
  await p.getByRole("button", { name: "Sıradaki ›" }).click(); await p.waitForTimeout(500);
  assert.equal(await nowKey(p), "20|1. EKİP");
  assert.equal(await p.getByRole("button", { name: "Sıradaki ›" }).count(), 0, "ekibin son sahnesinde Sıradaki yok");
});

test("F12-E3 kaydırarak çekildi de söndürür; yenilemede hatırlanır", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await tap(p, "20");
  await p.reload(); await p.waitForTimeout(600);
  assert.match(await p.locator("#nowbar").innerText(), /Sahne 20/, "başka haftadayken de şerit görünür");
  await p.getByRole("button", { name: "Şimdi çekilen sahneye git" }).click(); await p.waitForTimeout(500);
  const loc = scene(p, "20"); await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(x - (120 * i) / 8, y);
  await p.mouse.up(); await p.waitForTimeout(500);
  assert.equal(await nowKey(p), null);
});
