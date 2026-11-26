// F20 abonelik (yalnızca iPhone uygulaması): ödeme duvarı, satın alma, geri yükleme, 1.0 alanlar
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp } from "./harness.mjs";

let srv, app;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });
beforeEach(async () => { app = await openApp({ base: srv.base }); });
afterEach(async () => { const p = app.problems; await app.browser.close(); assert.deepEqual(p, []); });

const W = "com.burakyoruk.setprogramim.haftalik", M = "com.burakyoruk.setprogramim.aylik";
// a fake StoreKit behind window.Capacitor; purchases survive reloads like the real store
async function native(p, cfg = {}) {
  await p.addInitScript((cfg) => {
    const KEY = "__iap"; const st = () => JSON.parse(localStorage.getItem(KEY) || "null") || { purchases: [] };
    const put = (v) => localStorage.setItem(KEY, JSON.stringify(v));
    const trial = { price: 0, priceString: "₺0,00", period: { numberOfUnits: 1, unit: 1 } };
    const products = [
      { identifier: cfg.W, title: "Haftalık", price: 49.99, priceString: "₺49,99", introductoryPrice: trial, introEligibility: cfg.noTrial ? 1 : 2 },
      { identifier: cfg.M, title: "Aylık", price: 149.99, priceString: "₺149,99", introductoryPrice: trial, introEligibility: cfg.noTrial ? 1 : 2 },
    ];
    window.__calls = [];
    window.Capacitor = { isNativePlatform: () => true, nativePromise: async (plugin, method, o) => {
      window.__calls.push(plugin + "." + method);
      if (plugin === "LocalNotifications") return method === "getPending" ? { notifications: [] } : { display: "granted" };
      if (method === "getAppTransaction") return { appTransaction: { originalAppVersion: cfg.orig || "1.0", environment: cfg.env || "Sandbox" } };
      if (method === "getPurchases") return { purchases: st().purchases };
      if (method === "getProducts") { if (cfg.noProducts && !window.__productsOk) throw new Error("offline"); return { products }; }
      if (method === "purchaseProduct") { if (window.__cancel) throw new Error("User cancelled");
        const v = st(); v.purchases.push({ productIdentifier: o.productIdentifier, isActive: true, expirationDate: new Date(Date.now() + 7 * 864e5).toISOString() }); put(v); return {}; }
      if (method === "restorePurchases") { if (window.__restore) { const v = st(); v.purchases.push({ productIdentifier: window.__restore, isActive: true, expirationDate: new Date(Date.now() + 3 * 864e5).toISOString() }); put(v); } return {}; }
      return {};
    } };
  }, { W, M, ...cfg });
  await p.reload(); await p.waitForTimeout(700);
}
const fab = (p) => p.getByRole("button", { name: "Program yükle" });
const uploadOpen = (p) => p.locator("#upSheet").evaluate((e) => e.classList.contains("on"));
const paywallOpen = (p) => p.locator("#subSheet").evaluate((e) => e.classList.contains("on"));

test("F20-H1 abone değilken + ödeme duvarını açar: iki plan, fiyat, deneme, koşullar; örnek program ücretsiz", async () => {
  const p = app.page;
  await native(p);
  await fab(p).click(); await p.waitForTimeout(500);
  assert.equal(await paywallOpen(p), true); assert.equal(await uploadOpen(p), false);
  const plans = await p.locator("#subPlans .sub-p").allInnerTexts();
  assert.equal(plans.length, 2);
  assert.match(plans[0], /Haftalık[\s\S]*₺49,99 \/ hafta[\s\S]*İlk 7 gün ücretsiz/);
  assert.match(plans[1], /Aylık[\s\S]*₺149,99 \/ ay/);
  assert.equal(await p.getByRole("button", { name: "7 gün ücretsiz dene" }).count(), 1);
  assert.match(await p.locator("#subLegal").innerText(), /7 gün ücretsiz deneme bitince ₺149,99 \/ ay olarak ücretlendirilir[\s\S]*kendiliğinden yenilenir[\s\S]*iptal/);
  assert.equal(await p.locator("#subBody .sub-links a").count(), 2);
  assert.match(await p.locator("#subBody .sub-links a").first().getAttribute("href"), /apple\.com\/legal\/internet-services\/itunes\/dev\/stdeula/);
  await p.locator("#subPlans .sub-p").first().click();
  assert.match(await p.locator("#subLegal").innerText(), /₺49,99 \/ hafta/);
  // the sample program needs no subscription
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Örnek programla dene" }).click();
  await p.waitForFunction(() => document.querySelectorAll("#main .scene").length > 0, null, { timeout: 15000 });
});

test("F20-H2 satın alma: abonelik başlar, yükleme açılır, ayarlarda görünür, yenilemede kalır", async () => {
  const p = app.page;
  await native(p);
  await fab(p).click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "7 gün ücretsiz dene" }).click();
  await assert.doesNotReject(p.getByText("Aboneliğin başladı 🎬").waitFor({ timeout: 5000 }));
  await p.waitForTimeout(700);
  assert.equal(await uploadOpen(p), true);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  assert.match(await p.locator("#subState").innerText(), /Aylık abonelik etkin · 9 Kasım/);
  assert.equal(await p.getByRole("button", { name: "Aboneliği yönet" }).isVisible(), true);
  await p.reload(); await p.waitForTimeout(800);
  await fab(p).click(); await p.waitForTimeout(500);
  assert.equal(await uploadOpen(p), true); assert.equal(await paywallOpen(p), false);
});

test("F20-E1 vazgeçince ödeme duvarı açık kalır, hata gösterilmez", async () => {
  const p = app.page;
  await native(p);
  await p.evaluate(() => { window.__cancel = true; });
  await fab(p).click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "7 gün ücretsiz dene" }).click(); await p.waitForTimeout(500);
  assert.equal(await paywallOpen(p), true);
  assert.equal(await p.locator("#toast.on").count(), 0);
  assert.equal(await p.getByRole("button", { name: "7 gün ücretsiz dene" }).isEnabled(), true);
});

test("F20-H3 geri yükle: abonelik bulunursa açılır, yoksa söyler", async () => {
  const p = app.page;
  await native(p);
  await fab(p).click(); await p.waitForTimeout(500);
  await p.locator("#subBody").getByRole("button", { name: "Satın alımları geri yükle" }).click();
  await assert.doesNotReject(p.getByText("Aktif abonelik bulunamadı").waitFor({ timeout: 4000 }));
  await p.evaluate((W) => { window.__restore = W; }, W);
  await p.locator("#subBody").getByRole("button", { name: "Satın alımları geri yükle" }).click();
  await assert.doesNotReject(p.getByText("Aboneliğin geri yüklendi").waitFor({ timeout: 4000 }));
  await p.waitForTimeout(400);
  assert.equal(await paywallOpen(p), false);
  await fab(p).click(); await p.waitForTimeout(500);
  assert.equal(await uploadOpen(p), true);
});

test("F20-H4 1.0'ı satın alan (mağaza, yapı 119) abonelik olmadan devam eder", async () => {
  const p = app.page;
  await native(p, { env: "Production", orig: "119" });
  await fab(p).click(); await p.waitForTimeout(500);
  assert.equal(await uploadOpen(p), true); assert.equal(await paywallOpen(p), false);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  assert.match(await p.locator("#subState").innerText(), /satın aldığın için tüm özellikler sende/);
  assert.equal(await p.locator("#subOpen").isHidden(), true);
});

test("F20-E2 abonelik döneminde indiren (yapı 140) ödeme duvarını görür; deneme hakkı yoksa deneme yazmaz", async () => {
  const p = app.page;
  await native(p, { env: "Production", orig: "140", noTrial: true });
  await fab(p).click(); await p.waitForTimeout(500);
  assert.equal(await paywallOpen(p), true);
  assert.doesNotMatch(await p.locator("#subBody").innerText(), /ücretsiz dene|İlk 7 gün/);
  assert.equal(await p.getByRole("button", { name: "Abone ol · ₺149,99 / ay" }).count(), 1);
});

test("F20-E3 planlar yüklenemezse açıklar, tekrar denenir", async () => {
  const p = app.page;
  await native(p, { noProducts: true });
  await fab(p).click(); await p.waitForTimeout(500);
  assert.match(await p.locator("#subPlans").innerText(), /Abonelik bilgisi yüklenemedi/);
  assert.equal(await p.locator("#subBuy").isDisabled(), true);
  await p.evaluate(() => { window.__productsOk = true; });
  await p.getByRole("button", { name: "Tekrar dene" }).click(); await p.waitForTimeout(500);
  assert.equal(await p.locator("#subPlans .sub-p").count(), 2);
});

test("F20-E4 web sürümünde abonelik yok: + doğrudan yüklemeyi açar, ayarlarda bölüm gizli", async () => {
  const p = app.page;
  await fab(p).click(); await p.waitForTimeout(400);
  assert.equal(await uploadOpen(p), true);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  assert.equal(await p.locator("#subBox").isHidden(), true);
});
