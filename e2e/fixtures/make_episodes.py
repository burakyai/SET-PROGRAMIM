"""Bölüm eşleştirme testleri için uydurma dosyalar (gerçek yapım verisi yok).

    python3 e2e/fixtures/make_episodes.py

Çıktı: karisik.pdf (BLM sütununda "4-5" ve "FİNAL"), senaryo-4.pdf, senaryo-final.pdf
"""
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import make_fixtures as F

OUT = Path(__file__).parent


def program(path):
    c = canvas.Canvas(str(path), pagesize=(F.W, F.H))
    F.day_title(c, 564, "9 KASIM PAZARTESİ")
    F.team(c, 549, "1. EKİP")
    F.header(c, 538)
    y = 520
    # leftover from episode 4 while shooting 5: BLM says "4-5"
    F.row(c, y, "4-5", "1", "20", "0,25", "DIŞ/GECE", "İSKELE", "KAPTAN-NAZLI", "İSKELEDE SON KONUŞMA."); y -= 18
    F.row(c, y, "5", "1", "4", "0,5", "İÇ/GÜN", "KAHVEHANE", "RIZA-KAPTAN", "RIZA KAPTANDAN BAHSEDER."); y -= 18
    F.row(c, y, "FİNAL", "2", "7", "1", "DIŞ/GÜN", "DENİZ FENERİ", "KAPTAN", "KAPTAN FENERİ YAKAR."); y -= 18
    F.total(c, y, "1,75")
    c.showPage(); c.save()


def script(path, title, scenes):
    LW, LH = letter
    c = canvas.Canvas(str(path), pagesize=letter)
    c.setFont("DV", 14); c.drawCentredString(LW / 2, 600, "DENİZ FENERİ"); c.drawCentredString(LW / 2, 560, title)
    c.showPage()
    y = 700
    c.setFont("DV", 11.7); c.drawString(541, 745, "1.")
    for no, (head, blocks) in scenes.items():
        blocks = blocks + [("a", "Sessizlik."), ("a", "Rüzgarın sesi duyulur.")]
        c.setFont("DV", 11.7); c.drawString(48.6, y, no); c.drawString(100.9, y, head); y -= 24
        for kind, text in blocks:
            if kind == "a": c.drawString(100.9, y, text); y -= 24
            elif kind == "c": c.drawString(240.6, y, text); y -= 12.4
            else: c.drawString(170.8, y, text); y -= 24
    c.showPage(); c.save()


if __name__ == "__main__":
    program(OUT / "karisik.pdf")
    # episode 4 has a scene 20 at the pier; episode 5 also has a 20 elsewhere (same number, other place)
    script(OUT / "senaryo-4.pdf", "4.BÖLÜM", {
        "19": ("İÇ.GECE.KAHVEHANE", [("a", "Rıza kapıyı kilitler.")]),
        "20": ("DIŞ.GECE.İSKELE", [("a", "Rüzgar sert."), ("c", "KAPTAN"), ("d", "Dördüncü bölümden kalan veda.")]),
        "21": ("DIŞ.GECE.LİMAN", [("a", "Tekne uzaklaşır.")]),
    })
    script(OUT / "senaryo-final.pdf", "FİNAL", {
        "6": ("DIŞ.GÜN.TEPE", [("a", "Selim aşağı bakar.")]),
        "7": ("DIŞ.GÜN.DENİZ FENERİ", [("a", "Kaptan merdivenleri çıkar."), ("c", "KAPTAN"), ("d", "Son kez yanıyor.")]),
        "8": ("İÇ.GECE.FENER ODASI", [("a", "Işık söner.")]),
    })
    print("ok")
