from src.data_parser import parse_employee

TEXTO_COMPLETO = """Espelho de Ponto Eletrônico
De 01/12/2025 até 31/12/2025
Por ANDREA TORRES DE SOUSA GUERRA em 17/03/2026 às 18:49
Unidade de negócio
SEBRAE MS
CNPJ
15.419.591/0001-03
Inscrição estadual

Nome
JOSE DE SOUZA E SILVA NETO
PIS
130.45018.38-5
CPF
041.809.611-21
Cargo
ANALISTA DE SUPORTE DE SISTEMA II
Matrícula
00000694
Data de admissão
16/10/2023
Equipe
UTIC - Unidade de Tecnologia da Informação e Comunicação
Seg, 01/12/2025
07:34
12:03
13:25
16:52
00:00
00:00
01:22
08:00
00:00
00:00
00:00
00:00
07:56
-10:14
Ter, 02/12/2025
08:34
12:08
13:35
17:16
00:00
00:45
01:27
07:15
00:00
00:00
00:00
00:00
07:15
-10:59
TOTAIS
09:07
01:35
Comprovante de aceite eletrônico
Assinatura
JOSE DE SOUZA E SILVA NETO (Colaborador)
Data/Hora: 18/03/2026 às 09:15:34
Protocolo: a98531ca7712124fa6892bb7ba3534e6
IP: 138.59.127.38 / Plataforma: iOS"""


def test_extrai_nome():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["nome"] == "JOSE DE SOUZA E SILVA NETO"


def test_extrai_matricula():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["matricula"] == "00000694"


def test_extrai_cpf():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["cpf"] == "041.809.611-21"


def test_extrai_cargo():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["cargo"] == "ANALISTA DE SUPORTE DE SISTEMA II"


def test_extrai_equipe():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["equipe"] == "UTIC - Unidade de Tecnologia da Informação e Comunicação"


def test_extrai_periodo():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["periodo"] == "01/12/2025 - 31/12/2025"


def test_extrai_dias():
    result = parse_employee(TEXTO_COMPLETO)
    assert len(result["dias"]) == 2
    dia = result["dias"][0]
    assert dia["data"] == "01/12/2025"
    assert dia["dia_semana"] == "Seg"
    assert dia["entrada_1"] == "07:34"
    assert dia["saida_1"] == "12:03"
    assert dia["entrada_2"] == "13:25"
    assert dia["saida_2"] == "16:52"


def test_extrai_assinatura():
    result = parse_employee(TEXTO_COMPLETO)
    assert result["assinatura"]["nome"] == "JOSE DE SOUZA E SILVA NETO (Colaborador)"
    assert result["assinatura"]["data_hora"] == "18/03/2026 às 09:15:34"
    assert result["assinatura"]["protocolo"] == "a98531ca7712124fa6892bb7ba3534e6"


def test_retorna_strings_vazias_se_campos_ausentes():
    result = parse_employee("texto sem campos")
    assert result["nome"] == ""
    assert result["matricula"] == ""
    assert result["dias"] == []
    assert result["assinatura"] is None
