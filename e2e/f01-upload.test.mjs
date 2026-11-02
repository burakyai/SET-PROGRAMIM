// F01 Program yükle ve oku
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload, stored, sheetClosed, FIX } from "./harness.mjs";

let srv, app;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });
beforeEach(async () => { app = await openApp({ base: srv.base }); });
afterEach(async () => {
  const p = app.problems; await app.browser.close();
  assert.deepEqual(p, [], "konsol / sayfa hatası olmamalı");
});

const mine = (d) => d.scenes.map((s) => s.sceneNo);

test("F01-H1 haftalık program: günler, sahnelerim, ekipler, ekip içi sıra", async () => {
  await upload(app.page, ["haftalik.pdf"]);
  const { days } = await stored(app.page);
  assert.deepEqual(Object.keys(days).sort(), ["2026-11-09", "2026-11-10", "2026-11-11"]);
  const pzt = days["2026-11-09"];
  assert.equal(pzt.totalScenes, 6);
  assert.deepEqual(mine(pzt), ["1-2A-3", "10-11A-12-13A-14-15A-16", "20", "31"]);
  assert.deepEqual(pzt.scenes.map((s) => s.team), ["1. EKİP", "1. EKİP", "1. EKİP", "2. EKİP"]);
  assert.equal(pzt.scenes[3].order, "2 / 2", "2. ekibin 2. sahnesi");
  assert.equal(pzt.scenes[0].synopsis, "KAPTAN TEKNEYİ LİMANA YANAŞTIRIR.");
  assert.equal(days["2026-11-10"].scenes.length, 0);
  // UI shows the week of the first uploaded day
  await assert.doesNotReject(app.page.getByText("9 – 15 Kasım").first().waitFor());
});

test("F01-H2 günlük call sheet: set saati ve benim çağrı saatim", async () => {
  await upload(app.page, ["gunluk.pdf"]);
  const d = (await stored(app.page)).days["2026-11-09"];
  assert.equal(d.setTime, "07:45");
  assert.equal(d.callTime, "08:15");
  assert.deepEqual(mine(d), ["1-2A-3", "5"]);
});

test("F01-E1 ad sadece özette geçiyorsa sahne benim sayılmaz", async () => {
  await upload(app.page, ["haftalik.pdf"]);
  const d = (await stored(app.page)).days["2026-11-09"];
  assert.ok(!mine(d).includes("4"));
});

test("F01-E2 büyük/küçük harf ve Türkçe karakter farkı; kısmi ad eşleşmez", async () => {
  for (const name of ["kaptan", "KAPTAN", "  Kaptan  "]) {
    await upload(app.page, ["haftalik.pdf"], { character: name });
    assert.equal((await stored(app.page)).days["2026-11-09"].scenes.length, 4, name);
  }
  await upload(app.page, ["haftalik.pdf"], { character: "Kap" });
  assert.equal((await stored(app.page)).days["2026-11-09"].scenes.length, 0);
  await upload(app.page, ["haftalik.pdf"], { character: "sukru caglayan" });
  assert.deepEqual(mine((await stored(app.page)).days["2026-11-11"]), ["50"], "ş/ç/ğ yazmadan da bulmalı");
});

test("F01-E3 adının yanında soru işareti varsa 'teyit et'", async () => {
  await upload(app.page, ["haftalik.pdf"]);
  const d = (await stored(app.page)).days["2026-11-09"];
  const s20 = d.scenes.find((s) => s.sceneNo === "20");
  assert.equal(s20.uncertain, true);
  assert.equal(d.scenes.filter((s) => s.uncertain).length, 1);
});

test("F01-E4 aynı sayfada iki gün: tablo başlığı sahne sanılmaz, gün etiketi doğru", async () => {
  await upload(app.page, ["haftalik.pdf"]);
  const { days } = await stored(app.page);
  const car = days["2026-11-11"];
  assert.equal(car.totalScenes, 1);
  assert.deepEqual(mine(car), ["50"]);
  assert.equal(car.scenes[0].set, "HASTANE");
  assert.equal(days["2026-11-10"].dayLabel, "10 KASIM SALI");
});

test("F01-E5 çok satırlı hücreler birleşir", async () => {
  await upload(app.page, ["haftalik.pdf"]);
  const s = (await stored(app.page)).days["2026-11-09"].scenes[1];
  assert.equal(s.sceneNo, "10-11A-12-13A-14-15A-16");
  assert.deepEqual(s.characters, ["NAZLI", "KAPTAN", "RIZA", "SELİM", "HATİCE", "MEHMET"]);
  assert.equal(s.synopsis, "NAZLI EVİ TOPLAR, KAPTAN KAPIDA BEKLER.");
});

test("F01-E6 'Programı Oku'ya çift tıklama sahneleri çoğaltmaz", async () => {
  const p = app.page;
  await p.getByRole("button", { name: "Program yükle" }).click();
  await p.locator("#upSheet").getByLabel("Karakter adın").fill("Kaptan");
  await p.locator("#fileIn").setInputFiles(`${FIX}/haftalik.pdf`);
  const go = p.getByRole("button", { name: "Programı Oku" });
  await go.dblclick();
  await sheetClosed(p, "#upSheet");
  await p.waitForTimeout(500);
  const d = (await stored(p)).days["2026-11-09"];
  assert.equal(d.scenes.length, 4);
  assert.equal(d.all.length, 6);
});

test("F01-E7 revize (değiştir): silinen sahne gider, sıra yenilenir, işaret korunur", async () => {
  const p = app.page;
  await upload(p, ["gunluk.pdf"]);
  await p.getByRole("button", { name: /^1…3/ }).first().click();
  await p.getByRole("button", { name: /Çekildi olarak işaretle/ }).click();
  await upload(p, ["revize.pdf"]);
  const d = (await stored(p)).days["2026-11-09"];
  assert.deepEqual(mine(d), ["5", "1-2A-3"]);
  assert.equal(d.scenes.find((s) => s.sceneNo === "1-2A-3").done, true);
  assert.equal(d.all.length, 3);
});

test("F01-E8 revize (ekle modu): eskiler kalır, tekrar yok", async () => {
  await upload(app.page, ["haftalik.pdf"]);
  await upload(app.page, ["gunluk.pdf"], { replace: false });
  const d = (await stored(app.page)).days["2026-11-09"];
  const nos = mine(d);
  assert.equal(new Set(nos).size, nos.length, "tekrar eden sahne olmamalı");
  assert.ok(nos.includes("31") && nos.includes("5"));
});

test("F01-E9 okuma sırasında yenileme yarım kayıt bırakmaz", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"], { wait: false });
  await p.reload();
  await p.waitForTimeout(800);
  const st = await stored(p);
  for (const d of Object.values(st.days || {})) assert.ok(Array.isArray(d.scenes));
  await assert.doesNotReject(p.getByRole("button", { name: "Program yükle" }).waitFor());
});

test("F01-E10 PDF + fotoğraf birlikte (Claude dışı): PDF kaydedilir, fotoğraf için uyarı", async () => {
  await upload(app.page, ["haftalik.pdf", "foto.png"]);
  const { days } = await stored(app.page);
  assert.equal(days?.["2026-11-09"]?.scenes.length, 4, "okunan PDF kaybolmamalı");
  await assert.doesNotReject(app.page.getByText(/foto\.png okunamadı/).waitFor({ timeout: 8000 }));
});

test("F01-N1 karakter adı boşsa uyarır", async () => {
  await upload(app.page, ["haftalik.pdf"], { character: "", wait: false });
  await assert.doesNotReject(app.page.getByText("Önce karakter adını yaz.").waitFor());
  assert.deepEqual((await stored(app.page)).days || {}, {});
});

test("F01-N2 Claude dışında fotoğraf: anlaşılır hata, kayıt yok", async () => {
  await upload(app.page, ["foto.png"], { wait: false });
  await assert.doesNotReject(app.page.getByText(/Fotoğraftan okuma yapay zekâ ister/).waitFor({ timeout: 15000 }));
  assert.deepEqual((await stored(app.page)).days || {}, {});
});

test("F01-N3 internet yokken anlaşılır hata, internet gelince tekrar deneme çalışır", async () => {
  await app.browser.close();
  app = await openApp({ base: srv.base, offlineCdn: true });
  const p = app.page;
  await upload(p, ["haftalik.pdf"], { wait: false });
  await assert.doesNotReject(p.getByText(/İnternet bağlantını kontrol/).waitFor({ timeout: 15000 }), "hata mesajı interneti söylemeli");
  app.setCdnOffline(false);
  await p.getByRole("button", { name: "Programı Oku" }).click();
  await sheetClosed(p, "#upSheet");
  assert.equal((await stored(p)).days["2026-11-09"].scenes.length, 4);
});

test("F01-N4 program olmayan PDF: anlaşılır hata, kayıt yok", async () => {
  await upload(app.page, ["bos.pdf"], { wait: false });
  await assert.doesNotReject(app.page.getByText(/set programı tablosu bulunamadı/i).waitFor({ timeout: 15000 }));
  assert.deepEqual((await stored(app.page)).days || {}, {});
});
