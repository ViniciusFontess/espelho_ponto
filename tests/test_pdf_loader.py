from pathlib import Path
import pytest
from src.pdf_loader import load_pages

REAL_PDF = r"C:\Users\vinia\Downloads\Downloads Google\Pontomais_-_Espelho_de_Ponto_Eletrônico_(01.12.2025_-_31.12.2025)_-_7d75411016c30e83f99e9b14267fc2c24bb067f6f55fce4f074dcfd99c424735.pdf"


def test_pdf_real_existe():
    assert Path(REAL_PDF).exists(), f"PDF não encontrado: {REAL_PDF}"


def test_retorna_lista_nao_vazia():
    pages = load_pages(REAL_PDF)
    assert isinstance(pages, list)
    assert len(pages) > 0


def test_cada_pagina_tem_page_num_e_text():
    pages = load_pages(REAL_PDF)
    for page in pages:
        assert "page_num" in page
        assert "text" in page
        assert isinstance(page["page_num"], int)
        assert isinstance(page["text"], str)


def test_page_num_comeca_em_1():
    pages = load_pages(REAL_PDF)
    assert pages[0]["page_num"] == 1


def test_texto_contem_nome():
    pages = load_pages(REAL_PDF)
    assert any("Nome" in p["text"] for p in pages)


def test_texto_contem_protocolo():
    pages = load_pages(REAL_PDF)
    assert any("Protocolo" in p["text"] for p in pages)
