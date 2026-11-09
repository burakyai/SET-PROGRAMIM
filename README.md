# Set Programım

Haftalık set programı uygulaması. Set programı PDF'ini yükle, karakter adını yaz; o haftanın her gününde karakterinin sahneleri alt alta listelenir. Sahneye dokununca özet, sahnedeki karakterler, kostüm/araç notları açılır.

- PDF'ler telefonun içinde okunur (pdf.js `lib/` içinde), hiçbir sunucuya gönderilmez.
- Bir kez açıldıktan sonra internetsiz de çalışır (`sw.js`). `lib/` değişirse `sw.js` içindeki CACHE adını değiştir.
- Kayıtlar tarayıcıda (localStorage) tutulur.
- OGM / Taşacak Bu Deniz program şablonuna göre yazılmıştır (haftalık bölüm programı ve günlük call sheet).

**iPhone'a kurmak:** Safari'de sayfayı aç → Paylaş → Ana Ekrana Ekle.

## Testler

Uçtan uca testler `e2e/` klasöründe (Playwright + Node'un kendi test aracı). Sentetik programlarla çalışır, gerçek yapım verisi repoda yok.

```bash
npm install
npx playwright install chromium
npm test                                    # 50 vaka
REAL_PDF_DIR=~/programlar npm run test:real # kendi PDF'lerinle tutarlılık kontrolü
```

Test planı `replica/test-plan.md`, hata raporu `replica/bugs.md`.
