# tests/test_parsers_espelho.py
from src.parsers_espelho import parse_espelho_eletronico

REAL_PDF = r"C:\Users\vinia\Downloads\Downloads Google\Pontomais_-_Espelho_de_Ponto_Eletrônico_(01.12.2025_-_31.12.2025)_-_7d75411016c30e83f99e9b14267fc2c24bb067f6f55fce4f074dcfd99c424735.pdf"


def test_retorna_lista_de_registros():
    regs = parse_espelho_eletronico(REAL_PDF)
    assert isinstance(regs, list)
    assert len(regs) > 0


def test_registro_tem_campos_e_tipo():
    reg = parse_espelho_eletronico(REAL_PDF)[0]
    assert reg["tipo"] == "espelho"
    assert reg["nome"] == "JOSE DE SOUZA E SILVA NETO"
    assert reg["matricula"] == "00000694"
    assert reg["hash_valido"] is True


def test_nao_escreve_arquivos(tmp_path, monkeypatch):
    # parser puro: não deve criar nada no diretório corrente
    monkeypatch.chdir(tmp_path)
    parse_espelho_eletronico(REAL_PDF)
    assert list(tmp_path.iterdir()) == []
