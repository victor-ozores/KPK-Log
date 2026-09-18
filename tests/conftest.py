"""Helper para importar os scripts numerados (01_etl.py etc.) nos testes,
já que nomes de módulo Python não podem começar com dígito."""
import importlib.util
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = RAIZ / "scripts"


def importar_script(nome_arquivo: str):
    caminho = SCRIPTS_DIR / nome_arquivo
    spec = importlib.util.spec_from_file_location(nome_arquivo[:-3], caminho)
    modulo = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = modulo
    spec.loader.exec_module(modulo)
    return modulo
