// F20 abonelik (yalnızca iPhone uygulaması): ödeme duvarı, satın alma, geri yükleme, 1.0 alanlar
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload, stored } from "./harness.mjs";

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
      if (method === "getAppTransaction") return { appTransaction: { originalAppVersion: cfg.orig || "1.0", environment: cfg.env || "Sandbox", originalPurchaseDate: cfg.bought || "2026-11-27T01:00:00Z" } };
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
const days = async (p) => Object.keys((await stored(p)).days).sort();
const scripts = (p) => p.evaluate(() => new Promise((res) => { const r = indexedDB.open("setprog-scripts",1); r.onsuccess = () => { try { const q = r.result.transaction("scripts").objectStore("scripts").getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => res([]); } catch (e) { res([]); } }; r.onerror = () => res([]); }));

test("F20-H1 ilk program ve ilk senaryo ücretsiz; ikinci program ödeme duvarına takılır ve kaydedilmez", async () => {
  const p = app.page;
  await native(p);
  await fab(p).click(); await p.waitForTimeout(300);
  assert.equal(await uploadOpen(p), true, "+ her zaman yüklemeyi açar");
  assert.match(await p.locator("#freeNote").innerText(), /İlk programın ve ilk senaryon ücretsiz/);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await upload(p, ["haftalik.pdf", "senaryo-5.pdf"]);
  const tue = async () => (await stored(p)).days["2026-11-10"].scenes.length;
  assert.equal(await tue(), 0, "haftalık programda salı günü sahnem yok");
  // second program: blocked, nothing saved
  await upload(p, ["ertesi.pdf"], { wait: false }); await p.waitForTimeout(1500);
  assert.equal(await paywallOpen(p), true);
  assert.match(await p.locator("#subBody").innerText(), /İlk programın ücretsizdi\. Yeni program yüklemek için abonelik gerekir/);
  assert.equal(await tue(), 0, "engellenen program kaydedilmez");
  const plans = await p.locator("#subPlans .sub-p").allInnerTexts();
  assert.match(plans[0], /Haftalık[\s\S]*₺49,99 \/ hafta[\s\S]*İlk 7 gün ücretsiz/);
  assert.match(plans[1], /Aylık[\s\S]*₺149,99 \/ ay/);
  assert.match(await p.locator("#subLegal").innerText(), /7 gün ücretsiz deneme bitince ₺149,99 \/ ay olarak ücretlendirilir[\s\S]*kendiliğinden yenilenir[\s\S]*iptal/);
  assert.match(await p.locator("#subBody .sub-links a").first().getAttribute("href"), /apple\.com\/legal\/internet-services\/itunes\/dev\/stdeula/);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await fab(p).click(); await p.waitForTimeout(300);
  assert.match(await p.locator("#freeNote").innerText(), /Ücretsiz program ve senaryo hakkını kullandın/);
});

test("F20-H2 ikinci senaryo da abonelik ister; yalnız program hakkı kullanıldıysa ilk senaryo hâlâ ücretsiz", async () => {
  const p = app.page;
  await native(p);
  await upload(p, ["karisik.pdf"]);
  await upload(p, ["senaryo-4.pdf"]);          // first script: free
  assert.deepEqual(await scripts(p), ["4"]);
  await upload(p, ["senaryo-5.pdf"], { wait: false }); await p.waitForTimeout(1500);
  assert.equal(await paywallOpen(p), true);
  assert.match(await p.locator("#subBody").innerText(), /İlk senaryon ücretsizdi/);
  assert.deepEqual(await scripts(p), ["4"], "engellenen senaryo kaydedilmez");
});

test("F20-H3 satın alma: bekleyen yükleme kendiliğinden tamamlanır, ayarlarda görünür, yenilemede kalır", async () => {
  const p = app.page;
  await native(p);
  await upload(p, ["haftalik.pdf"]);
  await upload(p, ["ertesi.pdf"], { wait: false }); await p.waitForTimeout(1500);
  await p.getByRole("button", { name: "7 gün ücretsiz dene" }).click();
  await assert.doesNotReject(p.getByText("Aboneliğin başladı 🎬").waitFor({ timeout: 5000 }));
  await p.waitForFunction(() => ((JSON.parse(localStorage.getItem("setprog.v1") || "{}").days || {})["2026-11-10"] || { scenes: [] }).scenes.length === 2, null, { timeout: 15000 });
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  assert.match(await p.locator("#subState").innerText(), /Aylık abonelik etkin · 9 Kasım/);
  assert.equal(await p.getByRole("button", { name: "Aboneliği yönet" }).isVisible(), true);
  await p.reload(); await p.waitForTimeout(800);
  await upload(p, ["gunluk.pdf"]);
  assert.equal(await paywallOpen(p), false, "abone yüklemeye devam eder");
});

test("F20-E1 vazgeçince ödeme duvarı açık kalır, hata gösterilmez", async () => {
  const p = app.page;
  await native(p);
  await upload(p, ["haftalik.pdf"]);
  await p.waitForTimeout(3600);
  await p.evaluate(() => { window.__cancel = true; });
  await upload(p, ["ertesi.pdf"], { wait: false }); await p.waitForTimeout(1500);
  await p.getByRole("button", { name: "7 gün ücretsiz dene" }).click(); await p.waitForTimeout(500);
  assert.equal(await paywallOpen(p), true);
  assert.equal(await p.locator("#toast.on").count(), 0);
  assert.equal(await p.getByRole("button", { name: "7 gün ücretsiz dene" }).isEnabled(), true);
});

test("F20-H4 geri yükle: abonelik bulunursa açılır, yoksa söyler", async () => {
  const p = app.page;
  await native(p);
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Satın alımları geri yükle" }).click();
  await assert.doesNotReject(p.getByText("Aktif abonelik bulunamadı").waitFor({ timeout: 4000 }));
  await p.evaluate((W) => { window.__restore = W; }, W);
  await p.getByRole("button", { name: "Satın alımları geri yükle" }).click();
  await assert.doesNotReject(p.getByText("Aboneliğin geri yüklendi").waitFor({ timeout: 4000 }));
  assert.match(await p.locator("#subState").innerText(), /Haftalık abonelik etkin/);
});

test("F20-H5 uygulamayı parayla alan (mağaza, yapı 119, ücretsiz olmadan önce) abonelik olmadan devam eder", async () => {
  const p = app.page;
  await native(p, { env: "Production", orig: "119", bought: "2026-11-27T01:00:00Z" });
  await upload(p, ["haftalik.pdf"]);
  await upload(p, ["ertesi.pdf"]);
  assert.equal(await paywallOpen(p), false);
  assert.deepEqual(await days(p), ["2026-11-09", "2026-11-10", "2026-11-11"]);
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  assert.match(await p.locator("#subState").innerText(), /satın aldığın için tüm özellikler sende/);
  assert.equal(await p.locator("#subOpen").isHidden(), true);
});

test("F20-E2 ücretsiz olduktan sonra indiren (aynı yapı 119) muaf değildir; deneme hakkı yoksa deneme yazmaz", async () => {
  const p = app.page;
  await native(p, { env: "Production", orig: "119", bought: "2026-11-29T10:00:00Z", noTrial: true });
  await upload(p, ["haftalik.pdf"]);
  await upload(p, ["ertesi.pdf"], { wait: false }); await p.waitForTimeout(1500);
  assert.equal(await paywallOpen(p), true);
  assert.doesNotMatch(await p.locator("#subBody").innerText(), /ücretsiz dene|İlk 7 gün/);
  assert.equal(await p.getByRole("button", { name: "Abone ol · ₺149,99 / ay" }).count(), 1);
});

test("F20-E3 planlar yüklenemezse açıklar, tekrar denenir; örnek program hakkı tüketmez", async () => {
  const p = app.page;
  await native(p, { noProducts: true });
  await p.getByRole("button", { name: "Örnek programla dene" }).click();
  await p.waitForFunction(() => document.querySelectorAll("#main .scene").length > 0, null, { timeout: 15000 });
  assert.equal(await p.evaluate(() => localStorage.getItem("setprog.free")), null, "örnek program ücretsiz hakkı kullanmaz");
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Planları gör" }).click(); await p.waitForTimeout(500);
  assert.match(await p.locator("#subPlans").innerText(), /Abonelik bilgisi yüklenemedi/);
  assert.equal(await p.locator("#subBuy").isDisabled(), true);
  await p.evaluate(() => { window.__productsOk = true; });
  await p.getByRole("button", { name: "Tekrar dene" }).click(); await p.waitForTimeout(500);
  assert.equal(await p.locator("#subPlans .sub-p").count(), 2);
});

test("F20-E4 web sürümünde abonelik yok: istediğin kadar yüklenir, ayarlarda bölüm gizli", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  await upload(p, ["ertesi.pdf"]);
  assert.deepEqual(await days(p), ["2026-11-09", "2026-11-10", "2026-11-11"]);
  await fab(p).click(); await p.waitForTimeout(300);
  assert.equal(await p.locator("#freeNote").isHidden(), true);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  assert.equal(await p.locator("#subBox").isHidden(), true);
});
