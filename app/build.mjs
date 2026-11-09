// Web uygulamasını (../index.html + ../lib) iPhone uygulamasının içine (www/) kopyalar.
// - Google Fonts yerine yazı tipleri uygulamaya gömülür (internetsiz aynı görünür).
// - pdf.js .mjs dosyaları .js olarak kopyalanır (uygulama içi sunucu .mjs'yi tanımayabilir).
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(".."), www = path.resolve("www"), fdir = path.join(www, "fonts"), ldir = path.join(www, "lib");
fs.rmSync(www, { recursive: true, force: true }); fs.mkdirSync(fdir, { recursive: true }); fs.mkdirSync(ldir, { recursive: true });

// fonts
const want = { "archivo": [400, 500, 600, 700, 800], "jetbrains-mono": [500, 700] };
let css = "";
for (const [pkg, ws] of Object.entries(want)) {
  const base = path.resolve("node_modules/@fontsource", pkg);
  for (const w of ws) {
    const src = fs.readFileSync(path.join(base, `${w}.css`), "utf8");
    for (const block of src.split("@font-face").slice(1)) {
      const m = block.match(/url\(\.\/files\/([^)]+?\.woff2)\)/); if (!m) continue; const f = m[1];
      if (!/-latin(-ext)?-\d+-normal\.woff2$/.test(f)) continue;
      fs.copyFileSync(path.join(base, "files", f), path.join(fdir, f));
      css += "@font-face" + block.replace(/src:[^;]+;/, `src: url(fonts/${f}) format('woff2');`).replace(/\/\*[^*]*\*\/\s*$/, "") + "\n";
    }
  }
}
// fontsource family names → the names the page asks for
css = css.replace(/font-family: '?Archivo'?;/g, "font-family: 'Archivo';").replace(/font-family: '?JetBrains Mono'?;/g, "font-family: 'JetBrains Mono';");
fs.writeFileSync(path.join(www, "fonts.css"), css);

// pdf.js (+ polyfill), renamed .mjs → .js
const ren = (s) => s.replace(/pdf\.min\.mjs/g, "pdf.min.js").replace(/pdf\.worker\.min\.mjs/g, "pdf.worker.min.js").replace(/pdf\.worker\.safe\.mjs/g, "pdf.worker.safe.js");
for (const f of fs.readdirSync(path.join(root, "lib"))) {
  const out = f.replace(/\.mjs$/, ".js");
  if (/\.(mjs|js)$/.test(f)) fs.writeFileSync(path.join(ldir, out), ren(fs.readFileSync(path.join(root, "lib", f), "utf8")));
  else fs.copyFileSync(path.join(root, "lib", f), path.join(ldir, out));
}
for (const f of ["apple-touch-icon.png", "icon-512.png"]) fs.copyFileSync(path.join(root, f), path.join(www, f));

// page
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/, "")
  .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/, '<link rel="stylesheet" href="fonts.css">')
  .replace(/<link rel="manifest" href="manifest\.webmanifest">\s*/, "")
  .replace(/<meta http-equiv="Cache-Control" content="no-cache">\s*/, "");
html = ren(html);
if (html.includes("fonts.googleapis.com")) throw new Error("Google Fonts bağlantısı değiştirilemedi");
if (/\.mjs\b/.test(html)) throw new Error(".mjs başvurusu kaldı");
fs.writeFileSync(path.join(www, "index.html"), html);
console.log("www hazır:", (fs.statSync(path.join(www, "index.html")).size / 1024).toFixed(0), "KB +", fs.readdirSync(fdir).length, "yazı tipi +", fs.readdirSync(ldir).length, "lib dosyası");
