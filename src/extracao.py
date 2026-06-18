# src/extracao.py
"""
Filtro de variáveis: o usuário escolhe um subconjunto das variáveis do molde.
As chaves estruturais (usadas para organizar pastas) são sempre preservadas.
"""
from __future__ import annotations

from typing import Optional

# Chaves sempre preservadas no filtro:
#  - organização de pastas: nome, periodo, pagina, tipo
#  - status de assinatura (central para a visão analítica): hash_presente, hash_valido
# Em PDFs sem assinatura (jornada) essas chaves de hash simplesmente não existem,
# então preservá-las é inofensivo.
STRUCTURAL_KEYS = {
    "nome", "periodo", "pagina", "tipo",
    "hash_presente", "hash_valido",
}


def filtrar_variaveis(record: dict, selecionadas: Optional[list]) -> dict:
    """
    Retorna uma cópia do registro contendo apenas as chaves estruturais e as
    variáveis selecionadas. Se `selecionadas` for None, retorna o registro inteiro.
    """
    if selecionadas is None:
        return dict(record)
    permitidas = STRUCTURAL_KEYS | set(selecionadas)
    return {k: v for k, v in record.items() if k in permitidas}
