import re


def validate_hash(hash_str: str | None) -> dict[str, bool]:
    if hash_str is None:
        return {"hash_presente": False, "hash_valido": False}
    is_valid = bool(re.fullmatch(r"[a-fA-F0-9]{32}", hash_str))
    return {"hash_presente": True, "hash_valido": is_valid}
