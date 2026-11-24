// F17 notlar, partner filtresi, sezon özeti, paylaş, revize farkı, hatırlatma planı, ezber/prova
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload } from "./harness.mjs";

let srv, app;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });
beforeEach(async () => { app = await openApp({ base: srv.base }); });
afterEach(async () => { const p = app.problems; await app.browser.close(); assert.deepEqual(p, []); });

const scene = (p, no) => p.locator("#main").getByRole("button", { name: new RegExp("^(YENİ )?" + no + "\\s") }).first();
async function detail(p, no) { await scene(p, no).locator(".chev").click(); await p.waitForTimeout(350); }
async function demo(p) {
  await p.getByRole("button", { name: "Örnek programla dene" }).click();
  await p.waitForFunction(() => document.querySelectorAll("#main .scene").length > 0, null, { timeout: 15000 });
}

test("F17-H1 sahne notu: yazılır, kartta işaret çıkar, yenilemede kalır", async () => {
  const p = app.page;
  await demo(p);
  await detail(p, "8");
  await p.locator("#noteIn").fill("Mavi ceket, sol elde halat");
  await p.locator("#sceneBody .sd-set").click(); // blur
  await p.waitForTimeout(200);
  assert.match(await scene(p, "8").innerText(), /📝 not/);
  await p.reload(); await p.waitForTimeout(800);
  await detail(p, "8");
  assert.equal(await p.locator("#noteIn").inputValue(), "Mavi ceket, sol elde halat");
  await p.locator("#noteIn").fill(""); await p.locator("#sceneBody .sd-set").click(); await p.waitForTimeout(200);
  assert.doesNotMatch(await scene(p, "8").innerText(), /📝/);
});

test("F17-H2 partner: karaktere dokununca onunla olan sahneler listelenir, sahneye gidilir", async () => {
  const p = app.page;
  await demo(p);
  await detail(p, "1…3");
  await p.locator("#sceneBody").getByRole("button", { name: "NAZLI" }).click(); await p.waitForTimeout(300);
  const body = p.locator("#dayBody");
  assert.match(await body.innerText(), /NAZLI ile sahnelerin/);
  assert.equal(await body.locator("[data-go]").count(), 5, "1-2-3, 12, 20, 41, 60");
  await body.locator("[data-go]").nth(3).click(); await p.waitForTimeout(700);
  assert.match(await p.locator("#sceneBody").innerText(), /HASTANE ODA/);
});

test("F17-H3 sezon özeti: toplamlar, bölüm satırları, en çok birlikte oynananlar", async () => {
  const p = app.page;
  await demo(p);
  await p.locator("#wkToggle").click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: /Sezon özeti/ }).click(); await p.waitForTimeout(300);
  const t = await p.locator("#dayBody").innerText();
  assert.match(t, /6\s*set günü/); assert.match(t, /11\s*sahne/); assert.match(t, /14,5\s*sayfa/);
  assert.match(t, /7\. bölüm[\s\S]*8\. bölüm|8\. bölüm[\s\S]*7\. bölüm/);
  assert.match(t, /RIZA · 5/);
});

test("F17-H4 günü paylaş: paylaşım metni gün ve sahneleri içerir", async () => {
  const p = app.page;
  await p.addInitScript(() => { navigator.share = async (d) => { window.__shared = d.text; }; });
  await p.reload(); await p.waitForTimeout(500);
  await demo(p);
  await p.locator("#day-2026-11-02 [data-daymenu]").click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: /Günü paylaş/ }).click(); await p.waitForTimeout(300);
  const text = await p.evaluate(() => window.__shared);
  assert.match(text, /Pazartesi 2 Kasım/);
  assert.match(text, /• Sahne 1-2-3 – LİMAN \(DIŞ\/GÜN\) · 1,5 sf/);
  assert.equal(text.split("\n").length, 4);
});

test("F17-H5 revize farkı: eklenen, çıkan, sıra; YENİ etiketi; kapatılır", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf"]);
  assert.equal(await p.locator(".rev").count(), 0, "ilk yüklemede revize yok");
  await upload(p, ["gunluk.pdf"]);
  await assert.doesNotReject(p.getByText(/1 günde revize var/).waitFor({ timeout: 8000 }));
  const rev = p.locator("#day-2026-11-09 .rev");
  const t = await rev.innerText();
  assert.match(t, /＋ Sahne 5/); assert.match(t, /− Sahne 10…16, 20, 31/);
  assert.match(await scene(p, "5").innerText(), /YENİ/);
  await upload(p, ["revize.pdf"]);
  assert.match(await rev.innerText(), /Revize: sıra değişti/);
  await rev.getByRole("button", { name: "Revize notunu kapat" }).click(); await p.waitForTimeout(300);
  assert.equal(await p.locator(".rev").count(), 0);
  await p.reload(); await p.waitForTimeout(800);
  assert.equal(await p.locator(".rev").count(), 0);
});

test("F17-H6 hatırlatma planı: sahne olan günlerden önceki akşam; uygulama dışında ayar gizli", async () => {
  const p = app.page;
  await demo(p);
  const plan = await p.evaluate(() => window.__remPlan());
  assert.equal(plan.length, 5, "3–7 Kasım için; 2 Kasım'ın akşamı geçmişte");
  assert.deepEqual({ when: plan[0].when, title: plan[0].title, body: plan[0].body },
    { when: "2026-11-02 21:00", title: "Yarın 2 sahnen var", body: "İlk sahnen 20 – KAPTAN EV SALON" });
  assert.equal(new Set(plan.map((x) => x.id)).size, 5);
  await p.getByRole("button", { name: "Ayarlar" }).click(); await p.waitForTimeout(300);
  assert.equal(await p.locator("#remBox").isHidden(), true);
});

test("F17-H7 ezber modu ve prova: repliklerim gizlenir, dokununca açılır; prova sırayla ilerler", async () => {
  const p = app.page;
  await p.addInitScript(() => { try { localStorage.setItem("setprog.rehMute", "1"); } catch (_) {} });
  await p.reload(); await p.waitForTimeout(500);
  await upload(p, ["haftalik.pdf", "senaryo-5.pdf"]);
  await detail(p, "1…3");
  await p.getByRole("button", { name: /Senaryoyu oku/ }).click(); await p.waitForTimeout(400);
  const sb = p.locator("#scriptBody");
  await p.getByRole("button", { name: "🙈 Ezber modu" }).click();
  const mine = sb.locator(".scr-dlg.me").first();
  assert.equal(await mine.evaluate((e) => getComputedStyle(e).color), "rgba(0, 0, 0, 0)", "repliğim gizli");
  await mine.click();
  assert.notEqual(await mine.evaluate((e) => getComputedStyle(e).color), "rgba(0, 0, 0, 0)");
  await p.getByRole("button", { name: "👁 Replikleri göster" }).click();
  // rehearsal (muted): my line -> reveal -> next ...
  await p.getByRole("button", { name: "▶ Prova" }).click(); await p.waitForTimeout(200);
  const msg = p.locator("#rehMsg"); const next = p.getByRole("button", { name: "Devam ›" });
  assert.match(await msg.innerText(), /Sıra sende · 1\/4/);
  await next.click(); assert.match(await msg.innerText(), /Repliğin bu/);
  await next.click(); assert.match(await msg.innerText(), /Karşı replik · 2\/4/);
  await next.click(); assert.match(await msg.innerText(), /Karşı replik · 3\/4/);
  await next.click(); assert.match(await msg.innerText(), /Sıra sende · 4\/4/);
  await next.click(); await next.click(); await p.waitForTimeout(200);
  assert.equal(await p.locator("#rehBar").count(), 0);
  await assert.doesNotReject(p.getByText("Prova bitti 👏").waitFor({ timeout: 3000 }));
});

test("F17-H8 renk etiketi: detayda seçilir, kart o renkle işaretlenir, kalır, kaldırılır", async () => {
  const p = app.page;
  await demo(p);
  await detail(p, "8");
  await p.locator("#sceneBody").getByRole("button", { name: "Mavi" }).click(); await p.waitForTimeout(150);
  assert.equal(await p.locator("#sceneBody").getByRole("button", { name: "Mavi" }).getAttribute("aria-pressed"), "true");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const card = scene(p, "8");
  assert.equal(await card.evaluate((e) => getComputedStyle(e).borderLeftColor), "rgb(77, 163, 255)");
  assert.equal(await p.locator("#main .scene.tag").count(), 1, "yalnızca o sahne");
  await p.reload(); await p.waitForTimeout(800);
  assert.equal(await scene(p, "8").evaluate((e) => e.classList.contains("tag")), true);
  await detail(p, "8");
  await p.locator("#sceneBody").getByRole("button", { name: "Renk yok" }).click(); await p.waitForTimeout(150);
  assert.equal(await p.locator("#main .scene.tag").count(), 0);
});

test("F17-H9 ertelenen sahne: iki güne yazılan sahne bir kez sayılır, kartlarda belirtilir", async () => {
  const p = app.page;
  await upload(p, ["haftalik.pdf", "ertesi.pdf"]);
  const mon = p.locator("#day-2026-11-09"), tue = p.locator("#day-2026-11-10");
  // Monday: 20 and 31 moved to Tuesday
  assert.match(await scene(p, "20").innerText(), /Ertelendi → Sal 10 Kas/);
  assert.equal(await mon.locator(".scene.postponed").count(), 2);
  assert.match(await mon.locator(".dayhead").innerText(), /✓ 0\/2[\s\S]*↪ 2 ertelendi/);
  assert.match(await tue.locator(".scene").first().innerText(), /Kalan sahne ← Pzt 9 Kas/);
  // week summary counts each scene once: Mon 1-2A-3, 10…16, 20, 31 + Wed 50 = 5 (not 7)
  assert.match(await p.locator("#sumToggle").innerText(), /^5\s/);
  // shot on Tuesday -> one scene done; Monday's copy is not marked but shows the tick
  await tue.locator(".scene").first().locator(".chev").click(); await p.waitForTimeout(350);
  await p.getByRole("button", { name: "✓ Çekildi olarak işaretle" }).click(); await p.waitForTimeout(300);
  assert.match(await scene(p, "20").innerText(), /Ertelendi → Sal 10 Kas ✓/);
  assert.equal(await mon.locator(".scene.done").count(), 0, "pazartesi çekilmiş sayılmaz");
  await p.locator("#wkToggle").click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: /Sezon özeti/ }).click(); await p.waitForTimeout(300);
  const t = await p.locator("#dayBody").innerText();
  assert.match(t, /3\s*set günü/); assert.match(t, /5\s*sahne/); assert.match(t, /1\s*çekildi/);
  assert.match(t, /Kalan: 4 sahne · 7,25 sayfa · 2 sahne birden fazla güne yazıldı, bir kez sayıldı/);
});
