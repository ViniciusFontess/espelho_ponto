# tests/test_destino.py
import zipfile
from pathlib import Path

from src.destino import DestinoZip


def test_zip_contem_arvore_de_pastas(tmp_path):
    # monta uma árvore de exemplo
    raiz = tmp_path / "saida"
    (raiz / "ANA_SILVA" / "01_2026").mkdir(parents=True)
    (raiz / "ANA_SILVA" / "01_2026" / "dados.json").write_text("{}", encoding="utf-8")

    destino = DestinoZip()
    zip_path = destino.entregar(raiz, destino_zip=tmp_path / "resultado.zip")

    assert Path(zip_path).exists()
    with zipfile.ZipFile(zip_path) as zf:
        nomes = zf.namelist()
    assert any("ANA_SILVA/01_2026/dados.json" in n.replace("\\", "/") for n in nomes)


def test_retorna_caminho_do_zip(tmp_path):
    raiz = tmp_path / "saida"
    raiz.mkdir()
    (raiz / "vazio.txt").write_text("x", encoding="utf-8")
    zip_path = DestinoZip().entregar(raiz, destino_zip=tmp_path / "r.zip")
    assert str(zip_path).endswith("r.zip")
