# src/extracao.py
"""
Filtro de variáveis: o usuário escolhe um subconjunto das variáveis do molde.
As chaves estruturais (usadas para organizar pastas) são sempre preservadas.
"""
from __future__ import annotations

from typing import Optional

STRUCTURAL_KEYS = {"nome", "periodo", "pagina", "tipo"}


def filtrar_variaveis(record: dict, selecionadas: Optional[list]) -> dict:
    """
    Retorna uma cópia do registro contendo apenas as chaves estruturais e as
    variáveis selecionadas. Se `selecionadas` for None, retorna o registro inteiro.
    """
    if selecionadas is None:
        return dict(record)
    permitidas = STRUCTURAL_KEYS | set(selecionadas)
    return {k: v for k, v in record.items() if k in permitidas}
