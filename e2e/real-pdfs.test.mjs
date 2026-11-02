// Gerçek set programlarıyla tutarlılık kontrolü. PDF'ler repoda DEĞİL (yapım verisi):
//   REAL_PDF_DIR=/klasör REAL_CHARACTER=Oruç node --test e2e/real-pdfs.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startServer, openApp, upload, stored } from "./harness.mjs";

const DIR = process.env.REAL_PDF_DIR;
const CHAR = process.env.REAL_CHARACTER || "Oruç";
const files = DIR ? fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".pdf")).sort() : [];
let srv;
before(async () => { if (DIR) srv = await startServer(); });
after(async () => { if (srv) await srv.close(); });

test("gerçek programlar (REAL_PDF_DIR yoksa atlanır)", { skip: !DIR }, async (t) => {
  for (const f of files) {
    await t.test(f, async () => {
      const app = await openApp({ base: srv.base });
      try {
        await upload(app.page, [path.join(DIR, f)], { character: CHAR });
        const days = Object.values((await stored(app.page)).days || {});
        assert.ok(days.length > 0, "en az bir gün okunmalı");
        for (const d of days) {
          assert.ok(d.totalScenes > 0, d.date + " sahnesiz");
          for (const s of d.all || []) {
            assert.match(s.sceneNo, /^[0-9]/, `${d.date} sahne no: ${s.sceneNo}`);
            assert.ok(!/SAHNE|OYUNCULAR|ÖZET/.test(s.sceneNo + s.set), "başlık satırı sahne sanılmış");
          }
        }
        const mine = days.reduce((a, d) => a + d.scenes.length, 0);
        const all = days.reduce((a, d) => a + d.totalScenes, 0);
        t.diagnostic(`${f}: ${days.length} gün, ${all} sahne, ${CHAR}: ${mine}`);
        assert.deepEqual(app.problems, []);
      } finally { await app.browser.close(); }
    });
  }
});
