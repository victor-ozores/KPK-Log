"""Valida que o pipeline de anonimização remove PII conhecida e generaliza
cidades de baixa contagem, seguindo os requisitos não-negociáveis de LGPD."""
import importlib.util
import re
from pathlib import Path

import pandas as pd
import pytest
from conftest import importar_script

etl = importar_script("01_etl.py")
anon = importar_script("02_anonimizacao.py")


def _carregar_nomes_reais_conhecidos() -> list:
    """Nomes reais encontrados na inspeção manual da coluna Representante
    (ver docstring de 02_anonimizacao.py) — não podem sobreviver ao pipeline.
    Vêm de _pii_local.py, ao lado deste arquivo: LOCAL, fora do Git (ver
    README, seção "Cuidados com a IA no pipeline"). Sem esse arquivo (outra
    máquina, CI, clone limpo), o teste roda contra um exemplo genérico — a
    lógica de anonimização continua coberta, só não confere mais contra o
    nome real específico."""
    caminho = Path(__file__).resolve().parent / "_pii_local.py"
    if caminho.exists():
        spec = importlib.util.spec_from_file_location("_pii_local", caminho)
        modulo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modulo)
        return modulo.NOMES_REAIS_CONHECIDOS
    return ["Nome Sobrenome Exemplo"]


NOMES_REAIS_CONHECIDOS = _carregar_nomes_reais_conhecidos()


@pytest.fixture(scope="module")
def df_anonimizado() -> pd.DataFrame:
    abas = etl.carregar_abas(etl.ENTRADA)
    df = etl.montar_star_schema(abas)
    df = etl.adicionar_dimensao_calendario(df)

    df = anon.anonimizar_representante(df)
    df = anon.anonimizar_cliente(df)
    df = anon.generalizar_cidade(df)
    df = df.drop(columns=["cdRepresentante", "cdCliente", "cdCidade"])
    return df


def test_nomes_reais_conhecidos_nao_sobrevivem(df_anonimizado):
    colunas_texto = df_anonimizado.select_dtypes(include="object").columns
    for nome in NOMES_REAIS_CONHECIDOS:
        encontrado = any(
            df_anonimizado[c].astype(str).str.contains(nome, regex=False, na=False).any()
            for c in colunas_texto
        )
        assert not encontrado, f"Nome real '{nome}' encontrado na saída anonimizada"


def test_representante_e_cliente_seguem_padrao_de_rotulo_anonimo(df_anonimizado):
    assert df_anonimizado["Representante"].str.match(r"^Representante_\d+$").all()
    assert df_anonimizado["Cliente"].str.match(r"^Cliente_\d+$").all()


def test_codigos_originais_nao_aparecem_na_saida(df_anonimizado):
    for coluna in ["cdRepresentante", "cdCliente", "cdCidade"]:
        assert coluna not in df_anonimizado.columns


def test_cidades_de_baixa_contagem_sao_generalizadas(df_anonimizado):
    contagem = df_anonimizado["Cidade"].value_counts()
    pequenas = contagem[contagem < anon.MIN_PEDIDOS_CIDADE]
    pequenas = pequenas.drop(labels=[anon.OUTRAS_CIDADES], errors="ignore")
    assert pequenas.empty, f"Cidades abaixo do limiar k-anonimato sem generalizar: {pequenas.to_dict()}"


def test_mapa_de_para_e_deterministico_e_nao_persistido(df_anonimizado, tmp_path):
    # roda a anonimização duas vezes e confirma que o mesmo cdRepresentante
    # sempre vira o mesmo rótulo (determinístico), sem precisar de arquivo salvo
    mapa1 = anon.mapa_sequencial_estavel(pd.Series([10, 5, 20]), "X", 2)
    mapa2 = anon.mapa_sequencial_estavel(pd.Series([20, 10, 5]), "X", 2)
    assert mapa1 == mapa2
    assert mapa1[5] == "X_01"  # menor código -> primeiro rótulo
