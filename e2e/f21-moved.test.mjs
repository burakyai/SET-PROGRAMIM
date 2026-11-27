// Web sürümü kapalı: github.io adresinde yalnızca App Store yönlendirmesi çıkar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer, openApp } from "./harness.mjs";

test("M1 github.io adresinde uygulama yerine 'App Store'a taşındı' sayfası çıkar", async () => {
  const srv = await startServer(); const app = await openApp({ base: srv.base }); const p = app.page;
  try {
    await p.context().route("https://burakyai.github.io/**", async (route) => {
      const u = new URL(route.request().url());
      const r = await fetch(srv.base.replace(/\/$/, "") + u.pathname.replace("/SET-PROGRAMIM", "") + u.search);
      await route.fulfill({ status: r.status, contentType: r.headers.get("content-type") || "text/html", body: Buffer.from(await r.arrayBuffer()) });
    });
    await p.goto("https://burakyai.github.io/SET-PROGRAMIM/", { waitUntil: "commit" });
    await p.waitForSelector("#moved");
    assert.match(await p.locator("#moved h1").innerText(), /App Store'a taşındı/);
    assert.equal(await p.locator("#moved a.btn").getAttribute("href"), "https://apps.apple.com/tr/app/id6832692165");
    assert.equal(await p.locator("#fab").count(), 0, "uygulama arayüzü görünmemeli");
    await p.goto("https://burakyai.github.io/SET-PROGRAMIM/gizlilik.html", { waitUntil: "commit" }); await p.waitForSelector("body");
    assert.equal(await p.locator("#moved").count(), 0, "gizlilik sayfası açık kalmalı");
  } finally { await app.browser.close(); await srv.close(); }
});
