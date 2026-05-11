from src.hash_extractor import extract_hash

PROTOCOLO_VALIDO = "a98531ca7712124fa6892bb7ba3534e6"  # 32 chars MD5

TEXTO_COM_ASSINATURA = f"""Comprovante de aceite eletrônico
Assinatura
JOSE DE SOUZA E SILVA NETO (Colaborador)
Data/Hora: 18/03/2026 às 09:15:34
Protocolo: {PROTOCOLO_VALIDO}
IP: 138.59.127.38 / Plataforma: iOS"""

TEXTO_SEM_ASSINATURA = """Espelho de Ponto Eletrônico
De 01/12/2025 até 31/12/2025
Nome
JOSE DE SOUZA E SILVA NETO"""


def test_extrai_protocolo_presente():
    assert extract_hash(TEXTO_COM_ASSINATURA) == PROTOCOLO_VALIDO


def test_retorna_none_sem_protocolo():
    assert extract_hash(TEXTO_SEM_ASSINATURA) is None


def test_retorna_none_texto_vazio():
    assert extract_hash("") is None


def test_extrai_protocolo_com_espaco_no_final():
    text = "Protocolo: a98531ca7712124fa6892bb7ba3534e6 \nIP: 1.2.3.4"
    assert extract_hash(text) == "a98531ca7712124fa6892bb7ba3534e6"
