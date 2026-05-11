import hashlib
import random
import calendar
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

NOMES = [
    "João da Silva", "Maria Oliveira", "Carlos Souza", "Ana Lima",
    "Pedro Santos", "Fernanda Costa", "Lucas Pereira", "Juliana Alves",
    "Roberto Ferreira", "Patrícia Rodrigues", "Marcos Gomes", "Camila Martins",
    "Thiago Barbosa", "Larissa Ribeiro", "Diego Carvalho", "Beatriz Nunes",
    "Rafael Monteiro", "Tatiane Freitas", "Bruno Cardoso", "Vanessa Correia",
]

SETORES = ["Administrativo", "Financeiro", "TI", "RH", "Comercial", "Jurídico"]


def _gerar_hash(nome: str, matricula: str) -> str:
    return hashlib.sha256(f"{nome}{matricula}2026".encode()).hexdigest()


def _gerar_dias(mes: int = 1, ano: int = 2026) -> list[tuple[str, str, str]]:
    dias = []
    for dia in range(1, calendar.monthrange(ano, mes)[1] + 1):
        weekday = calendar.weekday(ano, mes, dia)
        if weekday >= 5:
            continue
        data = f"{dia:02d}/{mes:02d}/{ano}"
        h_entrada = random.randint(7, 9)
        m_entrada = random.randint(0, 59)
        h_saida = h_entrada + 8 + random.randint(0, 1)
        m_saida = random.randint(0, 59)
        dias.append((data, f"{h_entrada:02d}:{m_entrada:02d}", f"{h_saida:02d}:{m_saida:02d}"))
    return dias


def gerar_pdf(n: int = 10, output_path: str = "tests/espelho_ponto_teste.pdf") -> None:
    Path(output_path).parent.mkdir(exist_ok=True)
    styles = getSampleStyleSheet()
    mono = ParagraphStyle("mono", fontName="Courier", fontSize=8, alignment=TA_LEFT)
    normal = styles["Normal"]

    story = []
    nomes = random.sample(NOMES, min(n, len(NOMES)))

    for i, nome in enumerate(nomes):
        matricula = str(1000 + i)
        setor = random.choice(SETORES)
        periodo = "01/01/2026 - 31/01/2026"
        com_hash = random.random() > 0.2  # 80% dos funcionários têm hash

        if com_hash:
            story.append(Paragraph(f"HASH: {_gerar_hash(nome, matricula)}", mono))
        else:
            story.append(Paragraph("SEM ASSINATURA", mono))

        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(f"Nome: {nome}", normal))
        story.append(Paragraph(f"Matrícula: {matricula}", normal))
        story.append(Paragraph(f"Setor: {setor}", normal))
        story.append(Paragraph(f"Período: {periodo}", normal))
        story.append(Spacer(1, 0.4 * cm))

        story.append(Paragraph("Data         Entrada  Saída", mono))
        story.append(Paragraph("-" * 35, mono))
        for data, entrada, saida in _gerar_dias():
            story.append(Paragraph(f"{data}   {entrada}    {saida}", mono))

        if i < len(nomes) - 1:
            story.append(PageBreak())

    doc = SimpleDocTemplate(output_path, pagesize=A4)
    doc.build(story)
    print(f"PDF gerado: {output_path} ({len(nomes)} funcionários, ~20% sem hash)")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    gerar_pdf(n)
