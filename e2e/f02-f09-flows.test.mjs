// F02–F09: karakter, gezinme, işaretleme, silme, özet, takvim, tema, genel
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload, stored, sheetClosed, a11yAudit } from "./harness.mjs";

let srv, app;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });
beforeEach(async () => { app = await openApp({ base: srv.base }); });
afterEach(async () => {
  const p = app.problems; await app.browser.close();
  assert.deepEqual(p, [], "konsol / sayfa hatası olmamalı");
});
const day = async (k) => (await stored(app.page)).days[k];
const sceneBtn = (p, no) => p.locator("#main").getByRole("button", { name: new RegExp("^" + no.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s") });
async function setChar(p, name) {
  await p.locator("#charChip").click();
  await p.locator("#charIn2").fill(name);
  await p.getByRole("button", { name: "Kaydet" }).click();
  await p.waitForTimeout(400);
}
async function openMore(p) {
  if ((await p.locator("#wkToggle").getAttribute("aria-expanded")) !== "true") await p.locator("#wkToggle").click();
  await p.waitForTimeout(300);
}
async function swipe(p, loc, dx) {
  await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  const b = await loc.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(x + (dx * i) / 8, y);
  await p.mouse.up(); await p.waitForTimeout(400);
}

// ---------- F02 ----------
test("F02-H1 karakter değişince sahneler ve çağrı saati yenilenir", async () => {
  const p = app.page;
  await upload(p, ["gunluk.pdf"]);
  await setChar(p, "Rıza");
  let d = await day("2026-11-09");
  assert.deepEqual(d.scenes.map((s) => s.sceneNo), ["1-2A-3", "4", "5"]);
  assert.equal(d.callTime, "07:45", "Rıza'nın saati boş → set saati");
  await setChar(p, "Kaptan");
  d = await day("2026-11-09");
  assert.deepEqual(d.scenes.map((s) => s.sceneNo), ["1-2A-3", "5"]);
  assert.equal(d.callTime, "08:15");
});

test("F02-E1 karakter değişse de çekildi işareti korunur", async () => {
  const p = app.page;
  await upload(p, ["gunluk.pdf"]);
  await sceneBtn(p, "5").click();
  await p.getByRole("button", { name: /Çekildi olarak işaretle/ }).click();
  await setChar(p, "Nazlı"); await setChar(p, "Kaptan");
  assert.equal((await day("2026-11-09")).scenes.find((s) => s.sceneNo === "5").done, true);
});

test("F02-E2 çok uzun karakter adı düzeni taşırmaz", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await setChar(p, "Kaptan, Kaptan Mehmet Ali Rıza Şükrü Çağlayan Oğlu Büyük Deniz Reisi");
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.equal(sw, 0);
});

// ---------- F03 ----------
test("F03-H1 hafta gezinme, Bugün, gün şeridi", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await assert.doesNotReject(p.getByText("9 – 15 Kasım").waitFor());
  await openMore(p);
  await p.getByRole("button", { name: "Bugün" }).click();
  await assert.doesNotReject(p.getByText("2 – 8 Kasım").waitFor());
  await p.getByRole("button", { name: "Sonraki hafta" }).click();
  await assert.doesNotReject(p.getByText("9 – 15 Kasım").waitFor());
  await p.getByRole("button", { name: "Önceki hafta" }).click();
  await assert.doesNotReject(p.getByText("2 – 8 Kasım").waitFor());
});

test("F03-H2 Tüm program: bütün sahneler, ekip başlıkları, benimkiler vurgulu; seçim yenilemede hatırlanır", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await openMore(p);
  await p.getByRole("button", { name: "Tüm program" }).click();
  const sec = p.locator("#day-2026-11-09");
  assert.equal(await sec.locator(".scene").count(), 6);
  assert.equal(await sec.locator(".scene.mine").count(), 4);
  assert.equal(await sec.locator(".teamhead").count(), 2);
  await p.reload(); await p.waitForTimeout(600);
  await openMore(p);
  assert.match(await p.getByRole("button", { name: "Tüm program" }).getAttribute("class"), /on/);
});

// ---------- F04 ----------
test("F04-H1/H2 düğmeyle ve kaydırarak işaretleme", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await sceneBtn(p, "20").click();
  await p.getByRole("button", { name: /Çekildi olarak işaretle/ }).click();
  await sheetClosed(p, "#sceneSheet");
  assert.equal((await day("2026-11-09")).scenes.find((s) => s.sceneNo === "20").done, true);
  await swipe(p, sceneBtn(p, "31"), -120);
  assert.equal((await day("2026-11-09")).scenes.find((s) => s.sceneNo === "31").done, true);
  await swipe(p, sceneBtn(p, "31"), 120);
  assert.equal((await day("2026-11-09")).scenes.find((s) => s.sceneNo === "31").done, false);
});

test("F04-E1 kısa kaydırma hiçbir şey değiştirmez, detay açmaz", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await swipe(p, sceneBtn(p, "31"), -40);
  assert.equal((await day("2026-11-09")).scenes.find((s) => s.sceneNo === "31").done, false);
  assert.equal(await p.locator("#sceneSheet").evaluate((e) => e.classList.contains("on")), false);
});

test("F04-E2 Tüm programda başkasının sahnesi işaretlenir", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await openMore(p);
  await p.getByRole("button", { name: "Tüm program" }).click();
  await swipe(p, sceneBtn(p, "30"), -120);
  assert.equal((await day("2026-11-09")).all.find((s) => s.sceneNo === "30").done, true);
});

// ---------- F05 ----------
test("F05-H1 gün, program ve hepsini silme (iki dokunuş onayı)", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await upload(p, ["gunluk.pdf"]); // 9 Kasım artık günlükten
  await p.locator("#day-2026-11-11").getByRole("button", { name: "Gün seçenekleri" }).click();
  const del = p.getByRole("button", { name: "Bu günü sil" });
  await del.click();
  assert.ok(await day("2026-11-11"), "ilk dokunuş silmemeli");
  await p.getByRole("button", { name: /Emin misin/ }).click();
  await p.waitForTimeout(300);
  assert.equal(await day("2026-11-11"), undefined);
  await openMore(p);
  await p.getByRole("button", { name: "Yüklenen programlar" }).click();
  const row = p.locator(".prog", { hasText: "haftalik.pdf" });
  await row.getByRole("button", { name: "Sil" }).click();
  await row.getByRole("button", { name: "Emin misin?" }).click();
  await p.waitForTimeout(400);
  const keys = Object.keys((await stored(p)).days).sort();
  assert.deepEqual(keys, ["2026-11-09"], "sadece günlükten gelen gün kalmalı");
});

// ---------- F06 ----------
test("F06-H1 haftalık özet toplamları ve aç/kapa hatırlanır", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  const head = p.locator("#sumToggle");
  assert.match(await head.innerText(), /^5\s*sahne bu hafta/);
  assert.match(await head.innerText(), /2 çekim günü · 7,5 sayfa/); // 1,25+2,25+0,25+0,75 + 3
  await head.click();
  assert.equal(await head.getAttribute("aria-expanded"), "true");
  await p.reload(); await p.waitForTimeout(600);
  await openMore(p); await p.getByRole("button", { name: "Sonraki hafta" }).click();
  assert.equal(await p.locator("#sumToggle").getAttribute("aria-expanded"), "true");
});

// ---------- F07 ----------
test("F07-H1 takvim dosyası: etkinlik sayısı, saat, kaçış, satır sınırı", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await upload(p, ["gunluk.pdf"]);
  await openMore(p);
  await p.getByRole("button", { name: "Haftayı takvime ekle" }).click();
  const href = await p.locator("#calOpen").getAttribute("href");
  const ics = await p.evaluate(async (h) => await (await fetch(h)).text(), href);
  const lines = ics.split("\r\n");
  assert.ok(!/[^\r]\n/.test(ics), "satırlar CRLF ile bitmeli");
  for (const l of lines) assert.ok(new TextEncoder().encode(l).length <= 75, "satır 75 baytı aşmamalı: " + l);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2, "Pzt + Çar (Salı'da sahnem yok)");
  assert.match(ics, /DTSTART;TZID=Europe\/Istanbul:20261109T081500/);
  const unfolded = ics.replace(/\r\n /g, "");
  assert.match(unfolded, /KAPTAN\\; HASTANEDE\\, NAZLI'NIN/);
});

test("F07-E1 sahnesiz hafta: uyarı", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await openMore(p);
  await p.getByRole("button", { name: "Bugün" }).click();
  await p.getByRole("button", { name: "Haftayı takvime ekle" }).click();
  await assert.doesNotReject(p.getByText("Takvime eklenecek çekim günü yok").waitFor());
});

// ---------- F08 ----------
test("F08-H1 tema seçimi uygulanır ve hatırlanır", async () => {
  const p = app.page;
  await p.getByRole("button", { name: "Ayarlar" }).click();
  await p.locator("#themes").getByRole("button", { name: /Açık/ }).click();
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), "light");
  await p.reload(); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), "light");
});

// ---------- F09 ----------
test("F09-H1 veriler sayfa yenilemede kalır", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await p.reload(); await p.waitForTimeout(600);
  await p.getByText("9 – 15 Kasım").waitFor().catch(async () => { await openMore(p); await p.getByRole("button", { name: "Sonraki hafta" }).click(); });
  assert.equal(await p.locator("#day-2026-11-09 .scene").count(), 4);
});

test("F09-E1 390px ve 1440px'te yatay taşma yok", async () => {
  await upload(app.page, ["haftalik.pdf"]);
  assert.equal(await app.page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  await app.browser.close();
  app = await openApp({ base: srv.base, viewport: "desktop" });
  await upload(app.page, ["haftalik.pdf"]);
  assert.equal(await app.page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
});

test("F09-E2 erişilebilirlik: düğme adları, giriş etiketleri, sahne adı temiz", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  assert.deepEqual(await a11yAudit(p), []);
  const snap = await p.locator("#day-2026-11-09").ariaSnapshot();
  assert.ok(!/Çekilmedi|✓ Çekildi/.test(snap), "kaydırma ipucu yazıları sahne adına karışmamalı");
  assert.equal(await p.locator(".wsum .wbody").evaluate((e) => e.inert), true, "kapalı özet ekran okuyucudan gizli (inert) olmalı");
  await p.locator("#sumToggle").click();
  assert.equal(await p.locator(".wsum .wbody").evaluate((e) => e.inert), false, "açılınca okunmalı");
});

test("F09-E3 klavye: + düğmesine ulaşılır, Esc pencereyi kapatır", async () => {
  const p = app.page;
  await p.locator("#fab").focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(300);
  assert.equal(await p.locator("#upSheet").evaluate((e) => e.classList.contains("on")), true);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  assert.equal(await p.locator("#upSheet").evaluate((e) => e.classList.contains("on")), false);
});
