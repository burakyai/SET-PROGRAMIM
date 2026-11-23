// F18 prova: geri / göster-gizle · senaryo üstünde işaretleme: marker, kalem, yazı, silgi, geri al
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp, upload } from "./harness.mjs";

let srv, app;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });
beforeEach(async () => {
  app = await openApp({ base: srv.base });
  await app.page.addInitScript(() => { try { localStorage.setItem("setprog.rehMute", "1"); localStorage.setItem("setprog.inkTip", "1"); } catch (_) {} });
  await app.page.reload(); await app.page.waitForTimeout(500);
});
afterEach(async () => { const p = app.problems; await app.browser.close(); assert.deepEqual(p, []); });

const scene = (p, no) => p.locator("#main").getByRole("button", { name: new RegExp("^" + no + "\\s") }).first();
async function openScript(p) {
  await upload(p, ["haftalik.pdf", "senaryo-5.pdf"]);
  await scene(p, "1…3").locator(".chev").click(); await p.waitForTimeout(350);
  await p.getByRole("button", { name: /Senaryoyu oku/ }).click(); await p.waitForTimeout(400);
}
const ink = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("setprog.ink") || "{}"));
async function drag(p, loc, dx0, dx1, dy = 0) {
  const b = await loc.boundingBox(); const y = b.y + b.height / 2;
  await p.mouse.move(b.x + dx0, y); await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(b.x + dx0 + ((dx1 - dx0) * i) / 6, y + (dy * i) / 6);
  await p.mouse.up(); await p.waitForTimeout(150);
}

test("F18-H1 prova: geri tuşu önceki repliğe döner, 👁 repliklerimi açık tutar", async () => {
  const p = app.page;
  await openScript(p);
  await p.getByRole("button", { name: "▶ Prova" }).click(); await p.waitForTimeout(200);
  const msg = p.locator("#rehMsg"); const next = p.getByRole("button", { name: "Devam ›" }); const prev = p.getByRole("button", { name: "Önceki replik" });
  assert.equal(await prev.isDisabled(), true, "ilk replikte geri kapalı");
  await next.click(); await next.click(); await next.click();
  assert.match(await msg.innerText(), /3\/4/);
  await prev.click(); assert.match(await msg.innerText(), /Karşı replik · 2\/4/);
  await prev.click(); assert.match(await msg.innerText(), /Sıra sende · 1\/4/);
  const mine = p.locator("#scriptBody .scr-dlg.me").first();
  assert.equal(await mine.evaluate((e) => getComputedStyle(e).color), "rgba(0, 0, 0, 0)", "geri dönünce yine gizli");
  // keep my lines visible
  await p.getByRole("button", { name: "Repliklerimi göster" }).click();
  assert.notEqual(await mine.evaluate((e) => getComputedStyle(e).color), "rgba(0, 0, 0, 0)");
  await next.click(); assert.match(await msg.innerText(), /2\/4/, "açıkken tek Devam ilerletir");
  await p.getByRole("button", { name: "Repliklerimi gizle" }).click();
  assert.equal(await p.evaluate(() => localStorage.getItem("setprog.rehHide")), "1");
});

test("F18-H2 marker ve kalem: çizilir, saklanır, yenilemede yerinde; marker düz çizgiye oturur", async () => {
  const p = app.page;
  await openScript(p);
  await p.getByRole("button", { name: "🖍 İşaretle" }).click();
  const mine = p.locator("#scriptBody .scr-dlg.me").first();
  await drag(p, mine, 10, 200, 3);
  let d = await ink(p);
  assert.deepEqual(Object.keys(d), ["5|1"]);
  assert.equal(d["5|1"].s.length, 1); assert.equal(d["5|1"].s[0].k, "m");
  assert.equal(d["5|1"].s[0].p.length, 4, "tek satırdaki marker iki noktaya iner");
  await p.getByRole("button", { name: "Kalem" }).click();
  await p.getByRole("button", { name: "Renk değiştir" }).click();
  await drag(p, p.locator("#scriptBody .scr-act").first(), 5, 120, 30);
  d = await ink(p);
  assert.equal(d["5|1"].s.length, 2); assert.equal(d["5|1"].s[1].k, "p"); assert.equal(d["5|1"].s[1].c, "#3ddc84");
  await p.getByRole("button", { name: "Bitti" }).click();
  await p.reload(); await p.waitForTimeout(800);
  await p.locator("#wkToggle").click(); await p.waitForTimeout(250); await p.locator("#btnNext").click(); await p.locator("#wkToggle").click(); await p.waitForTimeout(250);
  await scene(p, "1…3").locator(".chev").click(); await p.waitForTimeout(350);
  await p.getByRole("button", { name: /Senaryoyu oku/ }).click(); await p.waitForTimeout(400);
  assert.equal(await p.locator('#scriptBody .scr-sc[data-ink="5|1"] .ink-l path').count(), 2);
  assert.equal(await p.locator('#scriptBody .scr-sc[data-ink="5|2"] .ink-l').count(), 0);
});

test("F18-H3 silgi ve geri al", async () => {
  const p = app.page;
  await openScript(p);
  await p.getByRole("button", { name: "🖍 İşaretle" }).click();
  const mine = p.locator("#scriptBody .scr-dlg.me").first();
  await drag(p, mine, 10, 200);
  await p.getByRole("button", { name: "Silgi" }).click();
  await drag(p, mine, 100, 110);
  assert.deepEqual(await ink(p), {}, "silinince kayıt da kalkar");
  await p.getByRole("button", { name: "Geri al" }).click();
  assert.equal((await ink(p))["5|1"].s.length, 1);
  await p.getByRole("button", { name: "Geri al" }).click();
  assert.deepEqual(await ink(p), {});
  assert.equal(await p.getByRole("button", { name: "Geri al" }).isDisabled(), true);
});

test("F18-H4 yazı notu: dokunulan yere eklenir, düzenlenir, boşaltınca silinir", async () => {
  const p = app.page;
  await openScript(p);
  await p.getByRole("button", { name: "🖍 İşaretle" }).click();
  await p.getByRole("button", { name: "Yazı notu" }).click();
  const act = p.locator("#scriptBody .scr-act").first();
  await act.click({ position: { x: 40, y: 8 } });
  await p.locator("textarea.ink-in").fill("yavaş gir");
  await p.locator("#scriptBody .scr-top .sd-k").click(); await p.waitForTimeout(150);
  let d = await ink(p);
  assert.equal(d["5|1"].t.length, 1); assert.equal(d["5|1"].t[0].s, "yavaş gir");
  const note = p.locator("#scriptBody .ink-t");
  assert.equal(await note.innerText(), "yavaş gir");
  await note.click(); await p.locator("textarea.ink-in").fill("");
  await p.locator("#scriptBody .scr-top .sd-k").click(); await p.waitForTimeout(150);
  assert.deepEqual(await ink(p), {});
});

test("F18-E1 işaretleme kapalıyken sürüklemek çizmez; prova başlayınca işaretleme kapanır", async () => {
  const p = app.page;
  await openScript(p);
  await drag(p, p.locator("#scriptBody .scr-dlg.me").first(), 10, 200);
  assert.deepEqual(await ink(p), {});
  await p.getByRole("button", { name: "🖍 İşaretle" }).click();
  assert.equal(await p.locator("#inkBar").count(), 1);
  await p.getByRole("button", { name: "Bitti" }).click();
  await p.getByRole("button", { name: "▶ Prova" }).click();
  assert.equal(await p.locator("#inkBar").count(), 0);
});

test("F18-H5 dokunmatik: tek parmak çizer, ikinci parmak çizimi iptal edip kaydırır; kalem varken parmak kaydırır", async () => {
  const p = app.page;
  await openScript(p);
  await p.getByRole("button", { name: "🖍 İşaretle" }).click();
  const r = await p.evaluate(() => {
    const sb = document.querySelector("#scriptBody"), sheet = document.querySelector("#scriptSheet");
    const el = sb.querySelector(".scr-dlg.me"); const b = el.getBoundingClientRect(); const y = b.top + b.height / 2;
    const ev = (type, id, pt, x, yy) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: pt, clientX: x, clientY: yy, isPrimary: id === 11 }));
    const count = () => Object.values(JSON.parse(localStorage.getItem("setprog.ink") || "{}")).reduce((a, d) => a + d.s.length, 0);
    const out = {};
    // one finger draws
    ev("pointerdown", 11, "touch", b.left + 10, y); for (let i = 1; i <= 5; i++) ev("pointermove", 11, "touch", b.left + 10 + i * 30, y); ev("pointerup", 11, "touch", b.left + 160, y);
    out.afterOne = count();
    // second finger: stroke is dropped, sheet scrolls
    sheet.scrollTop = 0; const big = document.createElement("div"); big.style.height = "2000px"; sb.appendChild(big);
    ev("pointerdown", 11, "touch", b.left + 10, y); ev("pointermove", 11, "touch", b.left + 60, y);
    ev("pointerdown", 12, "touch", b.left + 80, y + 40); ev("pointermove", 12, "touch", b.left + 80, y - 60);
    out.scrolled = sheet.scrollTop; ev("pointerup", 12, "touch", b.left + 80, y - 60); ev("pointerup", 11, "touch", b.left + 60, y);
    out.afterTwo = count();
    // pencil draws; afterwards a finger scrolls instead of drawing
    ev("pointerdown", 21, "pen", b.left + 10, y + 4); for (let i = 1; i <= 5; i++) ev("pointermove", 21, "pen", b.left + 10 + i * 30, y + 4); ev("pointerup", 21, "pen", b.left + 160, y + 4);
    out.afterPen = count();
    const s0 = sheet.scrollTop; ev("pointerdown", 13, "touch", b.left + 10, y); ev("pointermove", 13, "touch", b.left + 10, y - 50); ev("pointerup", 13, "touch", b.left + 10, y - 50);
    out.afterFinger = count(); out.fingerScrolled = sheet.scrollTop - s0; big.remove();
    return out;
  });
  assert.equal(r.afterOne, 1); assert.equal(r.afterTwo, 1, "iki parmakta yarım çizgi kaydedilmez");
  assert.ok(r.scrolled > 50, "ikinci parmak kaydırır: " + r.scrolled);
  assert.equal(r.afterPen, 2); assert.equal(r.afterFinger, 2, "kalem görülünce parmak çizmez");
  assert.ok(r.fingerScrolled > 30);
});
