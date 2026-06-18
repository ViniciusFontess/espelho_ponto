# tests/test_extracao.py
from src.extracao import filtrar_variaveis, STRUCTURAL_KEYS


def test_mantem_apenas_selecionadas_mais_estruturais():
    reg = {"tipo": "espelho", "nome": "ANA", "periodo": "01/2026",
           "pagina": 1, "matricula": "123", "cpf": "000", "assinatura": {}}
    out = filtrar_variaveis(reg, ["matricula"])
    # estruturais sempre ficam
    assert out["nome"] == "ANA"
    assert out["periodo"] == "01/2026"
    assert out["tipo"] == "espelho"
    assert out["pagina"] == 1
    # selecionada fica
    assert out["matricula"] == "123"
    # não selecionadas somem
    assert "cpf" not in out
    assert "assinatura" not in out


def test_none_mantem_tudo():
    reg = {"tipo": "espelho", "nome": "ANA", "periodo": "01/2026",
           "pagina": 1, "matricula": "123", "cpf": "000"}
    out = filtrar_variaveis(reg, None)
    assert out == reg


def test_structural_keys_inclui_basico():
    assert {"nome", "periodo", "pagina", "tipo"}.issubset(STRUCTURAL_KEYS)
