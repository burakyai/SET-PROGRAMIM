# Test planı: Set Programım

Sürüm: `a56a88b` (2026.11.02-10) · Tarih: 2026-11-02 · Ortam: yerel sunucu, iPhone 13 görünümü (390px) + masaüstü (1440px), Chromium, pdf.js yerel kopya (6.2; canlıda CDN'den 3.11)
Test verisi: `e2e/fixtures/*.pdf`. Bunlar sentetik programlar: OGM şablonunun düzeninde, ama karakterler ve özetler uydurma (KAPTAN, NAZLI, RIZA…). Gerçek programlarla da elle çalıştırıldı (repoya konmadı, `REAL_PDF_DIR` ile).

Akışlar
- **F01** Program yükle ve oku (PDF → günler → sahnelerim)
- **F02** Karakter değiştir
- **F03** Hafta / gün gezinme, Benim ↔ Tüm program
- **F04** Sahne detayı, çekildi işareti (düğme + kaydırma)
- **F05** Silme (gün / program / hepsi)
- **F06** Haftalık özet
- **F07** Takvime ekle (.ics)
- **F08** Tema (Otomatik / Açık / Koyu)
- **F09** Kalıcılık, erişilebilirlik, düzen
- **F12** Şimdi çekiliyor: tek dokunuş = detay, çift dokunuş = yak/söndür, birden çok = blok
- **F13** İnternetsiz kullanım
- **F14** Senaryo: PDF yükle, sahne detayında "Senaryoyu oku", replikler vurgulu
- **F10** Otomatik güncelleme (yalnız GitHub Pages) · **F11** Fotoğraftan yapay zekâ ile okuma (yalnız Claude içinde)

| vaka | akış | tür | adımlar | beklenen | oto |
| --- | --- | --- | --- | --- | --- |
| F01-H1 | yükle | mutlu | haftalık PDF, "Kaptan" | 3 gün; Pzt: 6 sahnenin 4'ü benim, ekip etiketleri, ekip içi sıra | e2e |
| F01-H2 | | mutlu | günlük call sheet | set 07:45, benim çağrım 08:15 (oyuncu tablosundan) | e2e |
| F01-E1 | | uç: ad sadece özette | sahne 4 özetinde "KAPTAN" geçiyor, oyuncularda yok | sahne 4 benim listemde değil | e2e |
| F01-E2 | | uç: büyük/küçük harf, Türkçe karakter | "kaptan", "KAPTAN", " Kaptan " | hepsi aynı 4 sahne; "Kap" eşleşmez | e2e |
| F01-E3 | | uç: soru işaretli ad | "KAPTAN ?" | sahne "? teyit et" ile işaretli | e2e |
| F01-E4 | | uç: aynı sayfada iki gün | 10 ve 11 Kasım aynı sayfada | 11 Kasım 1 sahne, başlık satırı sahne sanılmaz, 10 Kasım etiketi doğru | e2e |
| F01-E5 | | uç: çok satırlı hücre | sahne no ve oyuncular iki satır | tek satıra birleşir | e2e |
| F01-E6 | | uç: çift tıklama | "Programı Oku"ya iki kez | sahne sayısı ikiye katlanmaz | e2e |
| F01-E7 | | uç: revize (değiştir) | önce günlük, işaretle, sonra revize | silinen sahne gider, sıra revizeye göre, işaret korunur | e2e |
| F01-E8 | | uç: revize (ekle modu) | kutu işaretsiz | eskiler kalır, yeni sahne eklenir, tekrar yok | e2e |
| F01-E9 | | uç: sayfa yenileme | okuma sırasında yenile | yarım kayıt yok, uygulama açılır | e2e |
| F01-N1 | | olumsuz: karakter boş | | "Önce karakter adını yaz." | e2e |
| F01-N2 | | olumsuz: fotoğraf, Claude dışı | .png | anlaşılır hata, kayıt yok | e2e |
| F01-N3 | | olumsuz: internet yok (pdf.js indirilemez) | CDN kapalı → dene → aç → tekrar dene | anlaşılır hata; internet gelince tekrar denemede çalışır | e2e |
| F01-N4 | | olumsuz: program olmayan PDF | düz metin PDF | anlaşılır hata, kayıt yok | e2e |
| F02-H1 | karakter | mutlu | Kaptan → Rıza → Kaptan | sahneler yeniden seçilir, çağrı saati değişir | e2e |
| F02-E1 | | uç: işaretler | işaretle, karakter değiştir, geri dön | işaret korunur | e2e |
| F02-E2 | | uç: 60+ karakterlik ad | | düzen taşmaz | e2e |
| F03-H1 | gezinme | mutlu | ‹ › Bugün, gün şeridi | doğru hafta, doğru gün | e2e |
| F03-H2 | | mutlu | Tüm program | 6 sahne, 2 ekip başlığı, benimkiler vurgulu | e2e |
| F03-E1 | | uç: yenile | Tüm program seçiliyken yenile | seçim hatırlanır | e2e |
| F04-H1 | işaret | mutlu | detay → Çekildi | işaret kaydedilir | e2e |
| F04-H2 | | mutlu | sola kaydır / sağa kaydır | çekildi / çekilmedi | e2e |
| F04-E1 | | uç: kısa kaydırma, dikey kaydırma | | değişiklik yok, detay açılmaz | e2e |
| F04-E2 | | uç: başkasının sahnesi (Tüm program) | | işaretlenebilir | e2e |
| F05-H1 | silme | mutlu | gün sil, program sil, hepsini sil | doğru günler gider, iki dokunuş onayı | e2e |
| F06-H1 | özet | mutlu | aç/kapat | sahne ve sayfa toplamları doğru, durum hatırlanır | e2e |
| F07-H1 | takvim | mutlu | haftayı takvime ekle | .ics: çekim günü kadar etkinlik, saat = benim çağrım, CRLF, satır ≤75 bayt, kaçış | e2e |
| F07-E1 | | uç: sahnesiz hafta | | "eklenecek çekim günü yok" | e2e |
| F07-M1 | | iPhone ana ekran | Takvimde aç / Paylaş | Takvim "Tümünü Ekle" ekranı | elle |
| F08-H1 | tema | mutlu | Açık / Koyu / Otomatik | tema uygulanır ve hatırlanır | e2e |
| F09-H1 | genel | kalıcılık | yükle, yenile | veriler yerinde | e2e |
| F09-E1 | | düzen | 390px ve 1440px | yatay taşma yok | e2e |
| F09-E2 | | erişilebilirlik | | her düğmenin adı, her girişin etiketi var | e2e |
| F09-E3 | | klavye | Tab ile + düğmesi, Esc ile pencere kapanır | | e2e |
| F09-E4 | | konsol | tüm akışlar | konsol hatası yok | e2e |
| F10-M1 | güncelleme | GitHub Pages | yeni sürüm yayınla, uygulamayı aç | birkaç dakikada yeni sürüm | elle |
| F11-M1 | yapay zekâ | Claude içinde fotoğraf | | sahneler çıkar | elle |
| F12-H0 | şimdi | mutlu | tek dokunuş | detay açılır, yanmaz | e2e |
| F12-H1 | | mutlu | çift dokunuş | şerit, vurgu, sıradaki, bilgi kartta, detay açılmaz | e2e |
| F12-H2 | | mutlu: blok | ikinci sahneye çift dokun, sonra tek tek söndür | blok 2 sahne, tek tek söner | e2e |
| F12-E1 | | uç: ✓ | blokta ✓ | hepsi çekildi, söner | e2e |
| F12-E2 | | uç: Sıradaki › | | blok biter, son sahneden sonrakine geçer, çekilmişleri atlar | e2e |
| F12-E3 | | uç: kaydırma + yenileme | bloktan birini kaydır | sadece o söner; yenilemede blok kalır | e2e |
| F12-E4 | | uç: başka gün | | yeni blok başlar | e2e |
| F12-E5 | | uç: eski kayıt | tek sahnelik eski kayıt | okunur | e2e |
| F13-H1 | internetsiz | mutlu | bir kez açılır, internet kesilir, yeniden açılır, PDF yüklenir | uygulama açılır, PDF okunur | e2e |
| F13-H2 | | mutlu | PDF yükle | PDF okuyucu uygulamanın kendi dosyasından gelir, dış sunucuya istek yok | e2e |
| F13-M1 | | iPhone | uçak modunda ana ekrandan aç, PDF yükle | çalışır | elle |
| F14-H1 | senaryo | mutlu | senaryo PDF'i yükle | "5. bölüm senaryosu eklendi · 9 sahne" | e2e |
| F14-H2 | | mutlu | sahne detayı → Senaryoyu oku | parçalı sahne (1-2A-3 → 1, 2, 3), replik sayısı, benim repliklerim vurgulu | e2e |
| F14-H3 | | uç | çok satırlı replik, ortak replik (KAPTAN-NAZLI) | birleşir, benim sayılır | e2e |
| F14-E1 | | uç | senaryo yok | ipucu, başka bölüm eşleşmez | e2e |
| F14-E2 | | uç | yenile, sil | telefonda kalır, silinir | e2e |
| F14-R1 | | gerçek | 39. bölüm senaryosu (90 sayfa) | 139/139 sahne, Oruç replikleri vurgulu | elle (repoda değil) |
