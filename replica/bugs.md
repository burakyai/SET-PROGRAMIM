# Hatalar: Set Programım

Sürüm: `a56a88b` · Tarayıcı: Chromium 1.63, iPhone 13 görünümü (390px) · Testler: `e2e/`

| | sayısı |
| --- | --- |
| S1 | 0 |
| S2 | 1 |
| S3 | 3 |
| S4 | 3 |

### BUG-001: Aynı sayfada iki gün varsa ikinci tablo başlığı sahne sanılıyor

- Önem: S3 · Akış: F01 / F01-E4, F06-H1
1. Bir sayfasında iki gün bulunan programı yükle (`e2e/fixtures/haftalik.pdf`, 2. sayfa).

Beklenen: 11 Kasım'da tek sahne "50", 10 Kasım'ın etiketi "10 KASIM SALI".
Gerçekleşen: Sahne numarası "SAHNE 50", oyuncular "OYUNCULAR KAPTAN-…", sayfa sayısı okunamıyor (özette 3 sayfa eksik). 10 Kasım'ın etiketi "11 KASIM ÇARŞAMBA" oluyor.
Kanıt: F01-E2, F01-E4, F06-H1 başarısız.
Neden: Her sayfada yalnız ilk tablo başlığı aranıyor. Gün etiketi, sahneler gününe bağlanmadan önce bir sonraki tarih satırıyla eziliyor.
Not: Gönderilen 12 gerçek programın hepsinde her gün ayrı sayfada, yani şimdiye kadar denk gelmemiş.
Durum: düzeltildi (aşağıdaki commit)

### BUG-002: İnternet yokken yanıltıcı hata, internet gelince tekrar deneme çalışmıyor

- Önem: S2 · Akış: F01 / F01-N3
1. PDF okuyucu (pdf.js) indirilemezken PDF yükle → Programı Oku.
2. İnternet gelsin, tekrar Programı Oku.

Beklenen: "İnternet yok" diyen bir mesaj, ikinci denemede okuma.
Gerçekleşen: "fotoğraf/taranmış dosya için yapay zekâ bu görünümde açık değil" mesajı çıkıyor. İkinci deneme de aynı hatayı veriyor, çünkü başarısız indirme hafızada kalıyor. Ancak sayfa yenilenince düzeliyor.
Kanıt: F01-N3 başarısız.
Durum: düzeltildi

### BUG-003: Program olmayan PDF'te yanıltıcı mesaj

- Önem: S3 · Akış: F01 / F01-N4
1. İçinde set programı tablosu olmayan bir PDF yükle.

Beklenen: "Bu PDF'te set programı tablosu bulunamadı".
Gerçekleşen: Fotoğraf/yapay zekâ mesajı çıkıyor.
Durum: düzeltildi

### BUG-004: Ekran okuyucu her sahnede "Çekilmedi … Çekildi" okuyor

- Önem: S3 · Akış: F09 / F09-E2, F04
1. VoiceOver açıkken bir sahne kartına gel.

Beklenen: "5, Sahne, KAHVEHANE, …"
Gerçekleşen: "↺ Çekilmedi 5 Sahne KAHVEHANE … ✓ Çekildi". Kaydırma ipucu yazıları (CSS ::before/::after) sahnenin adına giriyor.
Kanıt: sahne düğmesi adı `↺ Çekilmedi 1…3 3 parça LİMAN … ✓ Çekildi`
Durum: düzeltildi

### BUG-005: Kapalı haftalık özetin satırları ekran okuyucuda okunuyor

- Önem: S4 · Akış: F06 / F09-E2
Gerçekleşen: Özet kapalıyken de 7 gün satırı ve hafta toplamı erişilebilirlik ağacında.
Durum: düzeltildi

### BUG-006: Karakter penceresindeki giriş kutusunun etiketi yok

- Önem: S4 · Akış: F02 / F09-E2
Gerçekleşen: `#charIn2` kutusu etiketsiz, VoiceOver sadece "metin alanı" diyor.
Durum: düzeltildi

### BUG-007: Esc tuşu açık pencereyi kapatmıyor

- Önem: S4 · Akış: F09 / F09-E3
Gerçekleşen: Klavyeyle (iPad klavyesi, masaüstü) açılan pencere Esc ile kapanmıyor.
Durum: düzeltildi

## Kontrol edilecek (tekrarlanamadı / elle)

- Takvimde aç: iPhone ana ekran uygulamasında Takvim ekranının açıldığını cihazda doğrula (F07-M1).
- Canlıda pdf.js 3.11, testlerde 6.2 kullanılıyor. Metin çıkarma çıktısı iki sürümde aynı yapıda, ama canlıda bir kere gerçek PDF ile kontrol et.
- pdf.js internetten (cdnjs) geliyor. Sette hiç çekmeyen bir yerde, daha önce hiç açılmamış bir telefonda ilk okuma çalışmaz. Uygulamayla birlikte paketlenirse bu tamamen çözülür.
