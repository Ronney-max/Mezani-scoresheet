from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "mezani_competition_scoresheet.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

competitors = [
    "JACKLINE MWANGI",
    "RYAN KAGOMBE",
    "NDUNG'U AGNES",
    "PETER NJUGUNA",
    "TELVIN MUTHIORA",
    "YORK ADEVA",
    "KAHIGA AMBROSE",
    "JEREMIAH MOGENDI",
    "FAITH NYAWIRA",
    "NABIL IBRAHIM",
    "JOMO KINYANJUI",
    "ALLAN KANJA",
    "RODNEY ISINDU",
    "JOY NYAWIRA",
    "VINCENT CHANGWONY",
    "EMMANUEL MUMO",
    "HILLARY MULANDA",
    "FELIX OUMA",
    "HILLARY OUMA",
]

GREEN = colors.HexColor("#103C29")
GOLD = colors.HexColor("#C8A951")
CREAM = colors.HexColor("#F7F3E8")
LIGHT_GREEN = colors.HexColor("#E8EFEA")
GRAY = colors.HexColor("#555555")

doc = SimpleDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=14 * mm, rightMargin=14 * mm,
    topMargin=10 * mm, bottomMargin=9 * mm,
    title="Mezani Barista Competition Scoresheet",
    author="Africa Food Show Kenya",
)

styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=18,
                            leading=21, textColor=GREEN, alignment=TA_CENTER),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica-Bold", fontSize=9.5,
                               leading=12, textColor=GOLD, alignment=TA_CENTER),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8,
                            leading=10, textColor=GRAY, alignment=TA_LEFT),
    "note": ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=7.5,
                           leading=9, textColor=GRAY, alignment=TA_LEFT),
}

story = []
story.append(Paragraph("AFRICA FOOD SHOW KENYA", styles["title"]))
story.append(Paragraph("THE BEST OF MEZANI - BARISTA COMPETITION", styles["subtitle"]))
story.append(Spacer(1, 2.5 * mm))

event_data = [
    [Paragraph("<b>JUDGE'S NAME:</b> __________________________________________", styles["small"]),
     Paragraph("<b>DATE:</b> ____________________", styles["small"])],
    [Paragraph("<b>MAXIMUM SENSORY SCORE:</b> __________", styles["small"]),
     Paragraph("<b>MAXIMUM TECHNICAL SCORE:</b> __________", styles["small"])],
    [Paragraph("<b>COMBINED MAXIMUM SCORE:</b> __________", styles["small"]),
     Paragraph("<b>ROUND / SESSION:</b> ____________________", styles["small"])],
]
event_table = Table(event_data, colWidths=[112 * mm, 70 * mm], rowHeights=[7 * mm] * 3)
event_table.setStyle(TableStyle([
    ("BOX", (0, 0), (-1, -1), 0.8, GOLD),
    ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D7C990")),
    ("BACKGROUND", (0, 0), (-1, -1), CREAM),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(event_table)
story.append(Spacer(1, 2.5 * mm))

headers = ["NO.", "COMPETITOR NAME", "SENSORY", "TECHNICAL", "TOTAL", "PERCENTAGE"]
data = [headers]
for i, name in enumerate(competitors, 1):
    data.append([str(i), name, "", "", "", ""])

score_table = Table(
    data,
    colWidths=[11 * mm, 65 * mm, 27 * mm, 27 * mm, 24 * mm, 28 * mm],
    rowHeights=[8 * mm] + [8.2 * mm] * len(competitors),
    repeatRows=1,
)
table_style = [
    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 7.5),
    ("ALIGN", (0, 0), (-1, 0), "CENTER"),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 1), (-1, -1), 8),
    ("ALIGN", (0, 1), (0, -1), "CENTER"),
    ("ALIGN", (2, 1), (-1, -1), "CENTER"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("GRID", (0, 0), (-1, -1), 0.55, colors.HexColor("#9F8B48")),
    ("LEFTPADDING", (1, 1), (1, -1), 6),
]
for row in range(1, len(data)):
    if row % 2 == 0:
        table_style.append(("BACKGROUND", (0, row), (-1, row), LIGHT_GREEN))
score_table.setStyle(TableStyle(table_style))
story.append(score_table)
story.append(Spacer(1, 1.5 * mm))
story.append(Paragraph(
    "Calculation: Total Score = Sensory Score + Technical Score. "
    "Percentage = (Total Score / Combined Maximum Score) x 100.", styles["note"]
))
story.append(Spacer(1, 2 * mm))

footer_data = [
    [Paragraph("<b>GENERAL COMMENTS</b>", styles["small"]), ""],
    ["", ""],
    [Paragraph("<b>JUDGE'S SIGNATURE:</b> __________________________________", styles["small"]),
     Paragraph("<b>TIME:</b> __________________", styles["small"])],
]
footer_table = Table(footer_data, colWidths=[125 * mm, 57 * mm], rowHeights=[6 * mm, 8 * mm, 7 * mm])
footer_table.setStyle(TableStyle([
    ("SPAN", (0, 0), (1, 0)),
    ("SPAN", (0, 1), (1, 1)),
    ("BOX", (0, 0), (-1, 1), 0.7, GOLD),
    ("LINEABOVE", (0, 2), (-1, 2), 0.7, GOLD),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("BACKGROUND", (0, 0), (-1, 0), CREAM),
]))
story.append(footer_table)


def decorate(canvas, document):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(2)
    canvas.line(14 * mm, height - 8 * mm, width - 14 * mm, height - 8 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(width / 2, 6 * mm, f"Official Judges' Scoresheet  |  Page {document.page}")
    canvas.restoreState()


doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
print(OUT)
