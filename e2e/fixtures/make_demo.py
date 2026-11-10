"""Uygulamadaki "Örnek programla dene" için uydurma bir haftalık set programı üretir.
Tüm dizi, karakter, mekân ve özetler uydurmadır; gerçek yapım verisi içermez.

    python3 e2e/fixtures/make_demo.py   ->  lib/ornek-program.pdf
"""
from pathlib import Path
import make_fixtures as F
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parents[2] / "lib" / "ornek-program.pdf"

# (gün başlığı, [(ekip, [(blm, gün, sahne, sayfa, zaman, mekan, oyuncular, özet), ...]), ...])
WEEK = [
    ("2 KASIM PAZARTESİ", [
        ("1. EKİP", [
            ("7", "1", "1-2-3", "1,5", "DIŞ/GÜN", "LİMAN", "KAPTAN-NAZLI-RIZA", "KAPTAN SABAH AVDAN DÖNER, TEKNEYİ YANAŞTIRIR."),
            ("7", "1", "4", "0,5", "İÇ/GÜN", "KAHVEHANE", "RIZA-SELİM", "RIZA İLE SELİM LİMANDAKİ SÖYLENTİYİ KONUŞUR."),
            ("7", "1", "8", "1,25", "İÇ/GÜN", "BALIKHANE", "KAPTAN-HATİCE", "KAPTAN BALIKLARI SATAR, HATİCE BORCU HATIRLATIR."),
            ("7", "2", "12", "0,75", "DIŞ/GECE", "İSKELE", "KAPTAN-NAZLI", "İSKELEDE SESSİZ BİR VEDA."),
        ]),
        ("2. EKİP", [
            ("7", "2", "15", "1", "DIŞ/GÜN", "TEPE", "SELİM-MEHMET", "SELİM MEHMET'E YOLU GÖSTERİR."),
        ]),
    ]),
    ("3 KASIM SALI", [
        ("1. EKİP", [
            ("7", "3", "20", "2", "İÇ/GÜN", "KAPTAN EV SALON", "KAPTAN-NAZLI-MEHMET", "AİLE KAHVALTISI; MEHMET OKULU BIRAKMAK İSTER."),
            ("7", "3", "21", "0,5", "DIŞ/GÜN", "OKUL BAHÇE", "MEHMET-HATİCE", "HATİCE MEHMET'İ OKUL KAPISINDA YAKALAR."),
            ("7", "3", "24", "1", "İÇ/GÜN", "KAPTAN TEKNE", "KAPTAN-RIZA", "KAPTAN İLE RIZA MOTORU TAMİR EDER."),
        ]),
    ]),
    ("4 KASIM ÇARŞAMBA", [
        ("1. EKİP", [
            ("7", "4", "30", "1,75", "DIŞ/GÜN", "AÇIK DENİZ", "KAPTAN-RIZA-SELİM", "FIRTINA YAKLAŞIRKEN AĞLAR TOPLANIR."),
            ("7", "4", "31", "0,5", "İÇ/GÜN", "KAPTAN TEKNE KAMARA", "KAPTAN", "KAPTAN TELSİZDEN LİMANA ULAŞMAYA ÇALIŞIR."),
            ("7", "4", "33", "1", "İÇ/GÜN", "KAHVEHANE", "RIZA-HATİCE", "HATİCE TEKNEDEN HABER BEKLER."),
        ]),
    ]),
    ("5 KASIM PERŞEMBE", [
        ("1. EKİP", [
            ("8", "5", "40", "1,25", "İÇ/GÜN", "HASTANE", "NAZLI-HATİCE", "NAZLI HASTANEDE NÖBET TUTAR."),
            ("8", "5", "41", "2,25", "İÇ/GÜN", "HASTANE ODA", "KAPTAN-NAZLI-MEHMET", "KAPTAN GÖZLERİNİ AÇAR; MEHMET'LE BARIŞIRLAR."),
        ]),
        ("2. EKİP", [
            ("8", "5", "44", "0,5", "DIŞ/GECE", "LİMAN", "RIZA-SELİM", "RIZA TEKNEYİ TEK BAŞINA BAĞLAR."),
        ]),
    ]),
    ("6 KASIM CUMA", [
        ("1. EKİP", [
            ("8", "6", "50", "1", "DIŞ/GÜN", "SAHİL YOLU", "KAPTAN-MEHMET", "BABA OĞUL SAHİLDE YÜRÜR."),
            ("8", "6", "52", "1,5", "İÇ/GECE", "MEYHANE", "KAPTAN-RIZA-SELİM", "KAPTAN EKİBE YENİ SEZONU AÇIKLAR."),
            ("8", "6", "53", "0,5", "DIŞ/GECE", "MEYHANE ÖNÜ", "SELİM-HATİCE", "SELİM SIRRINI HATİCE'YE AÇAR."),
        ]),
    ]),
    ("7 KASIM CUMARTESİ", [
        ("1. EKİP", [
            ("8", "7", "60", "1", "DIŞ/GÜN", "LİMAN", "KAPTAN-NAZLI-RIZA-MEHMET", "TEKNE YENİDEN DENİZE AÇILIR."),
        ]),
    ]),
]


def main():
    c = canvas.Canvas(str(OUT), pagesize=(F.W, F.H))
    for title, teams in WEEK:
        F.day_title(c, 564, title)
        y = 549
        for i, (team, rows) in enumerate(teams):
            if i:
                y -= 16
            F.team(c, y, team); y -= 11
            F.header(c, y); y -= 18
            tot = 0.0
            for blm, gun, sahne, sayfa, zaman, mekan, cast, ozet in rows:
                F.row(c, y, blm, gun, sahne, sayfa, zaman, mekan, cast, ozet); y -= 18
                tot += float(sayfa.replace(",", "."))
            F.total(c, y, f"{tot:g}".replace(".", ",")); y -= 14
        c.showPage()
    c.save()
    print("ok", OUT)


if __name__ == "__main__":
    main()
