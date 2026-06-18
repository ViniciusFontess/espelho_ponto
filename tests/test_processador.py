import zipfile
from pathlib import Path

import pytest

from src.processador import processar, MoldeEmDesenvolvimentoError

ESPELHO = r"C:\Users\vinia\Downloads\Downloads Google\Pontomais_-_Espelho_de_Ponto_Eletrônico_(01.12.2025_-_31.12.2025)_-_7d75411016c30e83f99e9b14267fc2c24bb067f6f55fce4f074dcfd99c424735.pdf"
JORNADA = r"C:\Users\vinia\Downloads\Downloads Google\Espelho de Ponto.pdf"


def test_processa_eletronico_gera_zip(tmp_path):
    res = processar(ESPELHO, molde_id="espelho_eletronico",
                    variaveis=["nome", "matricula", "assinatura"],
                    work_dir=str(tmp_path))
    assert res["molde_id"] == "espelho_eletronico"
    assert len(res["funcionarios"]) > 0
    assert Path(res["zip_path"]).exists()
    # variável não selecionada não deve aparecer
    assert "cpf" not in res["funcionarios"][0]
    with zipfile.ZipFile(res["zip_path"]) as zf:
        assert any(n.endswith("dados.json") for n in zf.namelist())


def test_processa_jornada_dez_funcionarios(tmp_path):
    res = processar(JORNADA, molde_id="espelho_jornada",
                    variaveis=None, work_dir=str(tmp_path))
    assert len(res["funcionarios"]) == 10
    assert Path(res["zip_path"]).exists()


def test_molde_exemplo_bloqueia(tmp_path):
    with pytest.raises(MoldeEmDesenvolvimentoError):
        processar(ESPELHO, molde_id="ferias_sebrae",
                  variaveis=None, work_dir=str(tmp_path))


def test_auto_deteccao_quando_molde_none(tmp_path):
    res = processar(ESPELHO, molde_id=None, variaveis=None,
                    work_dir=str(tmp_path))
    assert res["molde_id"] == "espelho_eletronico"
