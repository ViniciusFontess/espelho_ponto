# src/molde_registry.py
"""
Registro de moldes conhecidos da Plataforma de Separação de Documentos.

Cada molde é uma entrada fixa em código com a lista COMPLETA de variáveis que
consegue extrair (descobertas a partir do PDF-modelo) e o parser dedicado.
Adicionar um molde novo = adicionar uma entrada aqui + seu parser.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

from src.parsers_espelho import parse_espelho_eletronico
from src.jornada_parser import parse_jornada_pdf

# Parser assina: (pdf_path: str) -> list[dict]
Parser = Callable[[str], list]


@dataclass(frozen=True)
class Molde:
    id: str
    nome: str
    status: str  # "ativo" | "exemplo"
    variaveis: list  # lista completa de variáveis extraíveis
    parser: Optional[Parser] = None


_REGISTRY: dict[str, Molde] = {
    "espelho_eletronico": Molde(
        id="espelho_eletronico",
        nome="Espelho de Ponto — Eletrônico (assinado)",
        status="ativo",
        variaveis=["nome", "matricula", "cpf", "pis", "cargo",
                   "equipe", "periodo", "dias", "assinatura"],
        parser=parse_espelho_eletronico,
    ),
    "espelho_jornada": Molde(
        id="espelho_jornada",
        nome="Espelho de Ponto — Jornada",
        status="ativo",
        variaveis=["nome", "competencia", "pagina"],
        parser=parse_jornada_pdf,
    ),
    "ferias_sebrae": Molde(
        id="ferias_sebrae",
        nome="Férias SEBRAE",
        status="exemplo",
        variaveis=["nome", "matricula", "periodo_aquisitivo",
                   "periodo_gozo", "saldo"],
        parser=None,
    ),
}


def list_moldes() -> list[Molde]:
    """Retorna todos os moldes cadastrados."""
    return list(_REGISTRY.values())


def get_molde(molde_id: str) -> Optional[Molde]:
    """Retorna um molde pelo id, ou None se não existir."""
    return _REGISTRY.get(molde_id)
