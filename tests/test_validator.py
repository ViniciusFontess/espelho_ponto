from src.validator import validate_hash

PROTOCOLO_MD5 = "a98531ca7712124fa6892bb7ba3534e6"  # 32 chars, valid MD5


def test_protocolo_presente_e_valido():
    result = validate_hash(PROTOCOLO_MD5)
    assert result == {"hash_presente": True, "hash_valido": True}


def test_protocolo_ausente():
    result = validate_hash(None)
    assert result == {"hash_presente": False, "hash_valido": False}


def test_protocolo_curto_demais():
    result = validate_hash("abc123")  # menos de 32 chars
    assert result == {"hash_presente": True, "hash_valido": False}


def test_protocolo_com_chars_invalidos():
    result = validate_hash("z" * 32)  # 'z' não é hex
    assert result == {"hash_presente": True, "hash_valido": False}


def test_protocolo_sha256_invalido():
    result = validate_hash("a" * 64)  # 64 chars — SHA256, não MD5
    assert result == {"hash_presente": True, "hash_valido": False}
