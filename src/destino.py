# src/destino.py
"""
Camada de destino abstrata.

No v1 existe apenas o DestinoZip (empacota a árvore de pastas num .zip para
download). No futuro entra um DestinoDatacenter usando as credenciais SEBRAE,
implementando a mesma interface `entregar`, sem alterar o pipeline.
"""
from __future__ import annotations

import zipfile
from pathlib import Path


class Destino:
    """Interface comum de entrega."""

    def entregar(self, raiz_arquivos: Path, **kwargs):
        raise NotImplementedError


class DestinoZip(Destino):
    """Empacota a árvore de pastas num arquivo .zip."""

    def entregar(self, raiz_arquivos: Path, destino_zip: Path) -> Path:
        raiz_arquivos = Path(raiz_arquivos)
        destino_zip = Path(destino_zip)
        with zipfile.ZipFile(destino_zip, "w", zipfile.ZIP_DEFLATED) as zf:
            for arquivo in raiz_arquivos.rglob("*"):
                if arquivo.is_file():
                    zf.write(arquivo, arquivo.relative_to(raiz_arquivos))
        return destino_zip
