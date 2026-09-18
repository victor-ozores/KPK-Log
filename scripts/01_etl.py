"""
ETL — lê BaseDados.xlsx (4 abas) e monta o star schema:
    Cidade -> Cliente -> Pedidos <- Representante

Saída: data/raw/pedidos_full.parquet (NÃO versionado — ver .gitignore).
Este arquivo ainda contém códigos de Representante não anonimizados —
a inspeção manual encontrou nomes reais de pessoa física misturados aos
códigos de rota/equipe (ver docstring de 02_anonimizacao.py) — e por isso
fica fora do Git. A anonimização acontece em 02_anonimizacao.py.
"""
import pandas as pd
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "BaseDados.xlsx"
SAIDA_DIR = RAIZ / "data" / "raw"
SAIDA_DIR.mkdir(parents=True, exist_ok=True)
SAIDA = SAIDA_DIR / "pedidos_full.parquet"


def carregar_abas(caminho: Path) -> dict[str, pd.DataFrame]:
    xls = pd.ExcelFile(caminho)
    return {aba: pd.read_excel(xls, sheet_name=aba) for aba in xls.sheet_names}


def montar_star_schema(abas: dict[str, pd.DataFrame]) -> pd.DataFrame:
    pedidos = abas["Pedidos"]
    representante = abas["Representante"]
    cliente = abas["Cliente"]
    cidade = abas["Cidade"]

    df = pedidos.merge(representante, on="cdRepresentante", how="left")
    df = df.merge(cliente, on="cdCliente", how="left")
    df = df.merge(cidade, on="cdCidade", how="left")

    # cdCidade nulo em Cliente (11 casos) -> nome de cidade explícito para não virar NaN silencioso
    df["Cidade"] = df["Cidade"].fillna("NAO INFORMADO")

    return df


def adicionar_dimensao_calendario(df: pd.DataFrame) -> pd.DataFrame:
    base = df["DataPedido"]
    df["AnoPedido"] = base.dt.year
    df["MesPedido"] = base.dt.month
    df["SemestrePedido"] = base.dt.month.map(lambda m: 1 if m <= 6 else 2)
    df["AnoSemestre"] = df["AnoPedido"].astype(str) + "-S" + df["SemestrePedido"].astype(str)
    df["AnoMes"] = base.dt.to_period("M").astype(str)
    df["DiaSemana"] = base.dt.day_name()
    return df


def main() -> None:
    abas = carregar_abas(ENTRADA)
    df = montar_star_schema(abas)
    df = adicionar_dimensao_calendario(df)

    df.to_parquet(SAIDA, index=False)
    print(f"OK: {len(df):,} pedidos processados -> {SAIDA}")
    print(f"Colunas: {list(df.columns)}")


if __name__ == "__main__":
    main()
