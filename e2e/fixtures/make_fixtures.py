"""Sentetik set programı PDF'leri üretir (OGM Excel şablonunun düzenini taklit eder).
Gerçek yapım verisi içermez: tüm karakter, mekân ve özetler uydurmadır.

    python3 e2e/fixtures/make_fixtures.py

Çıktı: e2e/fixtures/haftalik.pdf, gunluk.pdf, revize.pdf
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
pdfmetrics.registerFont(TTFont("DV", FONT))
OUT = Path(__file__).parent
W, H = landscape(A4)

# column x positions (left edge) similar to the real template
COLS = [("BLM", 24), ("GÜN", 41), ("SAHNE", 64), ("SAYFA", 95), ("ZAMAN", 131), ("MEKAN", 204),
        ("OYUNCULAR", 295), ("YARDIMCI OYUNCULAR", 376), ("KOSTÜM-AKSESUAR", 475), ("ARAÇLAR", 577),
        ("NOTLAR", 645), ("ÖZET", 741)]
X = dict(COLS)
# data column centres: header text is centred over its column in the original
CX = {"BLM": 29, "GÜN": 46, "SAHNE": 72, "SAYFA": 102, "ZAMAN": 140, "MEKAN": 213, "OYUNCULAR": 310,
      "YARDIMCI OYUNCULAR": 404, "KOSTÜM-AKSESUAR": 499, "ARAÇLAR": 588, "NOTLAR": 655, "ÖZET": 748}


def ctext(c, cx, y, s, size=4.7):
    c.setFont("DV", size)
    c.drawCentredString(cx, y, s)


def header(c, y):
    for name, x in COLS:
        c.setFont("DV", 4.7)
        c.drawString(x, y, name)


def row(c, y, blm, gun, sahne, sayfa, zaman, mekan, cast, ozet, extra=None, note=""):
    """cast/ozet/sahne may be lists -> multi-line cell, vertically centred on y."""
    def cell(col, val):
        lines = val if isinstance(val, list) else [val]
        n = len(lines)
        for i, ln in enumerate(lines):
            ctext(c, CX[col], y + ((n - 1) / 2 - i) * 6, ln)
    cell("BLM", blm); cell("GÜN", gun); cell("SAHNE", sahne); cell("SAYFA", sayfa)
    cell("ZAMAN", zaman); cell("MEKAN", mekan); cell("OYUNCULAR", cast); cell("ÖZET", ozet)
    if extra:
        cell("KOSTÜM-AKSESUAR", extra)
    if note:
        cell("NOTLAR", note)


def day_title(c, y, txt):
    c.setFont("DV", 7)
    c.drawCentredString(W / 2, y, txt)


def team(c, y, txt):
    c.setFont("DV", 7)
    c.drawCentredString(W / 2 + 10, y, txt)


def total(c, y, v):
    ctext(c, CX["SAYFA"], y, v)


def weekly(path):
    c = canvas.Canvas(str(path), pagesize=(W, H))
    # ---- page 1: Pazartesi 9 Kasım (2026) ----
    day_title(c, 564, "9 KASIM PAZARTESİ")
    team(c, 549, "1. EKİP")
    header(c, 538)
    y = 520
    row(c, y, "5", "1", "1-2A-3", "1,25", "DIŞ/GÜN", "LİMAN", "KAPTAN-NAZLI-RIZA", "KAPTAN TEKNEYİ LİMANA YANAŞTIRIR.", extra="HALAT"); y -= 18
    row(c, y, "5", "1", "4", "0,5", "İÇ/GÜN", "KAHVEHANE", "RIZA-SELİM", "RIZA KAPTANDAN BAHSEDER, KAPTANA KIZAR."); y -= 18  # 'KAPTAN' only in özet
    row(c, y, "5", "1", ["10-11A-12-13A-", "14-15A-16"], "2,25", "İÇ/GECE", "KAPTAN EV SALON",
        ["NAZLI-KAPTAN-RIZA-SELİM-", "HATİCE-MEHMET"], ["NAZLI EVİ TOPLAR, KAPTAN", "KAPIDA BEKLER."]); y -= 26
    row(c, y, "5", "2", "20", "0,25", "DIŞ/GECE", "İSKELE", "KAPTAN ?-NAZLI", "İSKELEDE SON KONUŞMA; GECE, RÜZGAR."); y -= 18
    total(c, y, "4,25"); y -= 14
    team(c, y, "2. EKİP"); y -= 14
    row(c, y, "5", "2", "30", "1", "DIŞ/GÜN", "TEPE", "SELİM-HATİCE", "SELİM TEPEYE ÇIKAR."); y -= 18
    row(c, y, "5", "2", "31", "0,75", "İÇ/GÜN", "KAPTAN TEKNE", "KAPTAN", "KAPTAN TEK BAŞINA AĞ ÖRER."); y -= 18
    total(c, y, "1,75")
    c.showPage()
    # ---- page 2: Salı 10 Kasım, no Kaptan scenes ----
    day_title(c, 564, "10 KASIM SALI")
    team(c, 549, "1. EKİP")
    header(c, 538)
    y = 520
    row(c, y, "5", "3", "40", "1", "İÇ/GÜN", "OKUL", "HATİCE-MEHMET", "MEHMET DERSE GEÇ KALIR."); y -= 18
    row(c, y, "5", "3", "41", "0,5", "DIŞ/GÜN", "OKUL BAHÇE", "MEHMET-SELİM", "SELİM MEHMET'İ ALIR."); y -= 18
    total(c, y, "1,5"); y -= 30
    # ---- Çarşamba 11 Kasım on same page ----
    day_title(c, y, "11 KASIM ÇARŞAMBA"); y -= 14
    team(c, y, "1. EKİP"); y -= 11
    header(c, y); y -= 18
    row(c, y, "5", "4", "50", "3", "İÇ/GÜN", "HASTANE", "KAPTAN-NAZLI-ŞÜKRÜ ÇAĞLAYAN", "KAPTAN; HASTANEDE, NAZLI'NIN YANINDA."); y -= 18
    total(c, y, "3")
    c.showPage()
    c.save()


def daily(path, revise=False):
    """Call-sheet style single day (TARİH / SET header + cast table)."""
    c = canvas.Canvas(str(path), pagesize=(W, H))
    c.setFont("DV", 3.4)
    c.drawString(164, 571, "TARİH:"); c.setFont("DV", 3.6); c.drawString(205, 571, "9 KASIM PAZARTESİ")
    c.setFont("DV", 3.2); c.drawString(599, 571, "İŞ GÜNÜ:"); c.drawString(616, 571, "1")
    c.drawString(168, 550, "SET:"); c.setFont("DV", 3.6); c.drawString(219, 550, "07:45")
    c.setFont("DV", 9.6); c.drawCentredString(418, 499, "1.EKİP")
    header(c, 486)
    y = 470
    if not revise:
        row(c, y, "5", "1", "1-2A-3", "1,25", "DIŞ/GÜN", "LİMAN", "KAPTAN-NAZLI-RIZA", "KAPTAN TEKNEYİ LİMANA YANAŞTIRIR."); y -= 16
    row(c, y, "5", "1", "4", "0,5", "İÇ/GÜN", "KAHVEHANE", "RIZA-SELİM", "RIZA KAPTANDAN BAHSEDER."); y -= 16
    row(c, y, "5", "1", "5", "1", "İÇ/GÜN", "KAHVEHANE", "RIZA-KAPTAN", "YENİ SAHNE: KAPTAN GELİR."); y -= 16
    if revise:
        row(c, y, "5", "1", "1-2A-3", "1,25", "DIŞ/GÜN", "LİMAN", "KAPTAN-NAZLI-RIZA", "KAPTAN TEKNEYİ LİMANA YANAŞTIRIR."); y -= 16
    total(c, y, "2,75"); y -= 30
    # cast table
    for txt, x in [("OYUNCULAR", 61), ("KARAKTER", 141), ("SET SAATİ", 210), ("YAN CAST", 318), ("YEMEK", 636), ("NOTLAR", 735)]:
        c.setFont("DV", 5.2); c.drawString(x, y, txt)
    y -= 10
    for actor, char, t in [("AYŞE ÖRNEK", "NAZLI", "07:45"), ("ALİ DENEME", "KAPTAN", "08:15"), ("VELİ TEST", "RIZA", "")]:
        c.setFont("DV", 7.2)
        c.drawCentredString(77, y, actor); c.drawCentredString(156, y, char)
        if t:
            c.drawCentredString(224, y, t)
        y -= 10
    c.showPage(); c.save()


if __name__ == "__main__":
    weekly(OUT / "haftalik.pdf")
    daily(OUT / "gunluk.pdf")
    daily(OUT / "revize.pdf", revise=True)
    print("ok")


def script(path):
    """Sentetik senaryo (5. bölüm): sahne no solda, başlık, açıklama, karakter, replik."""
    from reportlab.lib.pagesizes import letter
    LW, LH = letter
    c = canvas.Canvas(str(path), pagesize=letter)
    c.setFont("DV", 14); c.drawCentredString(LW / 2, 600, "DENİZ FENERİ"); c.drawCentredString(LW / 2, 560, "5.BÖLÜM")
    c.showPage()
    scenes = {
        "1": ("DIŞ.GÜN.LİMAN", [("a", "Kaptan tekneyi yanaştırır, halatı atar."), ("c", "KAPTAN"), ("d", "Tut şu halatı Rıza, kaçırma!"),
                                ("c", "RIZA"), ("d", "Tuttum kaptan, tuttum.")]),
        "2": ("DIŞ.GÜN.LİMAN-İSKELE", [("a", "Nazlı uzaktan izler."), ("c", "ÇOCUK KAPTAN"), ("d", "Baba, ben de gelecem!")]),
        "3": ("İÇ.GÜN.TEKNE", [("c", "KAPTAN(V.O)"), ("d", "Deniz bugün sert; kimse çıkmayacak."), ("a", "Rıza başını sallar.")]),
        "4": ("İÇ.GÜN.KAHVEHANE", [("c", "RIZA"), ("d", "Kaptan yine inat etti.")]),
        "10": ("İÇ.GECE.KAPTAN EV SALON", [("a", "Nazlı evi toplar."), ("c", "NAZLI"), ("d", "Geç kaldın yine."),
                                           ("c", "KAPTAN"), ("d", "Liman karıştı, Nazlı. Uzun hikâye; yarın anlatırım, söz.")]),
        "20": ("DIŞ.GECE.İSKELE", [("c", "KAPTAN-NAZLI"), ("d", "Hoşça kal.")]),
        "30": ("DIŞ.GÜN.TEPE", [("a", "Selim tepeye çıkar.")]),
        "31": ("İÇ.GÜN.KAPTAN TEKNE", [("a", "Kaptan tek başına ağ örer.")]),
        "50": ("İÇ.GÜN.HASTANE", [("c", "KAPTAN"), ("d", "Buradayım.")]),
    }
    y = 700; page = 1
    def newpage():
        nonlocal y, page
        c.showPage(); page += 1; y = 720
        c.setFont("DV", 11.7); c.drawString(541, 745, f"{page}.")
    c.setFont("DV", 11.7); c.drawString(541, 745, "1.")
    for no, (head, blocks) in scenes.items():
        if y < 160: newpage()
        c.setFont("DV", 11.7); c.drawString(48.6, y, no); c.drawString(100.9, y, head); y -= 24
        for kind, text in blocks:
            if y < 120: newpage()
            if kind == "a": c.drawString(100.9, y, text); y -= 24
            elif kind == "c": c.drawString(240.6, y, text); y -= 12.4
            else:
                words = text.split(); line = ""
                for w in words:
                    if len(line) + len(w) > 34: c.drawString(170.8, y, line.strip()); y -= 12.4; line = ""
                    line += w + " "
                c.drawString(170.8, y, line.strip()); y -= 24
    c.showPage(); c.save()


if __name__ == "__main__":
    script(OUT / "senaryo-5.pdf")
