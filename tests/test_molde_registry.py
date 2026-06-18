# tests/test_molde_registry.py
from src.molde_registry import list_moldes, get_molde, Molde


def test_lista_tres_moldes():
    moldes = list_moldes()
    ids = {m.id for m in moldes}
    assert ids == {"espelho_eletronico", "espelho_jornada", "ferias_sebrae"}


def test_espelho_eletronico_e_ativo_com_parser():
    m = get_molde("espelho_eletronico")
    assert m.status == "ativo"
    assert m.parser is not None
    assert "assinatura" in m.variaveis


def test_jornada_e_ativo_com_parser():
    m = get_molde("espelho_jornada")
    assert m.status == "ativo"
    assert m.parser is not None
    assert "competencia" in m.variaveis


def test_ferias_e_exemplo_sem_parser():
    m = get_molde("ferias_sebrae")
    assert m.status == "exemplo"
    assert m.parser is None


def test_get_molde_inexistente_retorna_none():
    assert get_molde("nao_existe") is None
