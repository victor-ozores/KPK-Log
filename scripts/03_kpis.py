"""
Cálculo dos KPIs de OTIF sobre os dados já anonimizados, seguindo exatamente
as fórmulas do case (ver Desafio_Logistica_com_Calculo_de_OTIF.pdf):

    # Realizados   = contagem de pedidos
    # Entregues    = pedidos com DataEntrega preenchida
    # Em Aberto    = pedidos sem DataEntrega
    OFR            = média em dias de (DataEmissaoCTE - DataPedido)
    OCT            = média em dias de (DataEntrega - DataPedido)
    % On Time      = OnTime / Entregues,   OnTime = DataEntrega <= DataPrevistaEntrega
    % In Full      = InFull / Entregues,   InFull = OcorrenciaDevolucao == 0
    % OTIF         = % On Time x % In Full

Todos os cálculos usam apenas o dataset anonimizado (data/processed/pedidos_anonimizado.parquet).
Nenhuma coluna de identificação real é lida aqui.

Saídas (todas em data/processed/kpis/, agregadas — seguras para publicação):
    resumo_geral.json         KPIs do período completo
    comparacao_semestres.csv  KPIs por AnoSemestre (2019-S1 vs 2020-S1 etc.)
    serie_mensal.csv          KPIs por AnoMes (para o gráfico de linha do OTIF)
    serie_diaria_entregas.csv Entregas por dia + média móvel de 7 dias
    ranking_representante.csv Top representantes por pedidos fora do prazo
    ranking_cliente.csv       Top clientes por pedidos fora do prazo
    influenciadores.csv       Impacto de Equipe / Canal / faixa de OCT no OnTime
"""
import json
import pandas as pd
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "data" / "processed" / "pedidos_anonimizado.parquet"
SAIDA_DIR = RAIZ / "data" / "processed" / "kpis"
SAIDA_DIR.mkdir(parents=True, exist_ok=True)

FAIXAS_OCT = [-1, 2, 4, 7, 1000]
ROTULOS_OCT = ["0-2 dias", "3-4 dias", "5-7 dias", "8+ dias"]

MIN_VOLUME_RANKING = 30       # pedidos mínimos p/ entrar no ranking de representante
MIN_VOLUME_INFLUENCIADOR = 100  # pedidos mínimos p/ entrar no painel de influenciadores
TOP_N = 15


def calcular_kpis(df: pd.DataFrame) -> dict:
    realizados = len(df)
    entregues_df = df[df["DataEntrega"].notna()]
    entregues = len(entregues_df)
    em_aberto = realizados - entregues

    ofr_dias = (df["DataEmissaoCTE"] - df["DataPedido"]).dt.days.mean()
    oct_dias = (entregues_df["DataEntrega"] - entregues_df["DataPedido"]).dt.days.mean()

    on_time_mask = entregues_df["DataEntrega"] <= entregues_df["DataPrevistaEntrega"]
    in_full_mask = entregues_df["OcorrenciaDevolucao"] == 0

    pct_on_time = on_time_mask.mean() if entregues else 0.0
    pct_in_full = in_full_mask.mean() if entregues else 0.0
    pct_otif = pct_on_time * pct_in_full

    return {
        "realizados": int(realizados),
        "entregues": int(entregues),
        "em_aberto": int(em_aberto),
        "ofr_dias": round(float(ofr_dias), 2) if pd.notna(ofr_dias) else None,
        "oct_dias": round(float(oct_dias), 2) if pd.notna(oct_dias) else None,
        "pct_on_time": round(float(pct_on_time), 4),
        "pct_in_full": round(float(pct_in_full), 4),
        "pct_otif": round(float(pct_otif), 4),
    }


def resumo_geral(df: pd.DataFrame) -> dict:
    return calcular_kpis(df)


def comparacao_semestres(df: pd.DataFrame) -> pd.DataFrame:
    linhas = []
    for semestre, grupo in df.groupby("AnoSemestre"):
        kpis = calcular_kpis(grupo)
        kpis["AnoSemestre"] = semestre
        linhas.append(kpis)
    return pd.DataFrame(linhas).sort_values("AnoSemestre")


def serie_mensal(df: pd.DataFrame) -> pd.DataFrame:
    linhas = []
    for mes, grupo in df.groupby("AnoMes"):
        kpis = calcular_kpis(grupo)
        kpis["AnoMes"] = mes
        linhas.append(kpis)
    return pd.DataFrame(linhas).sort_values("AnoMes")


def serie_diaria_entregas(df: pd.DataFrame) -> pd.DataFrame:
    entregues = df[df["DataEntrega"].notna()].copy()
    diario = entregues.groupby(entregues["DataEntrega"].dt.date).size()
    diario = diario.rename("entregas").sort_index()
    serie = diario.reset_index().rename(columns={"index": "data"})
    serie.columns = ["data", "entregas"]
    serie["media_movel_7d"] = serie["entregas"].rolling(7, min_periods=1).mean().round(2)
    return serie


def ranking_atraso(df: pd.DataFrame, coluna: str, min_volume: int, top_n: int) -> pd.DataFrame:
    entregues = df[df["DataEntrega"].notna()].copy()
    entregues["atrasado"] = entregues["DataEntrega"] > entregues["DataPrevistaEntrega"]

    agrupado = entregues.groupby(coluna).agg(
        entregues=("atrasado", "size"),
        atrasados=("atrasado", "sum"),
    )
    agrupado["pct_atraso"] = (agrupado["atrasados"] / agrupado["entregues"]).round(4)
    agrupado = agrupado[agrupado["entregues"] >= min_volume]
    agrupado = agrupado.sort_values("atrasados", ascending=False).head(top_n)
    return agrupado.reset_index()


def taxa_on_time_por_representante(df: pd.DataFrame, min_volume: int) -> pd.DataFrame:
    entregues = df[df["DataEntrega"].notna()].copy()
    entregues["on_time"] = entregues["DataEntrega"] <= entregues["DataPrevistaEntrega"]

    agrupado = entregues.groupby("Representante").agg(
        entregues=("on_time", "size"),
        pct_on_time=("on_time", "mean"),
    )
    agrupado["pct_on_time"] = agrupado["pct_on_time"].round(4)
    agrupado = agrupado[agrupado["entregues"] >= min_volume]
    return agrupado.reset_index().sort_values("pct_on_time", ascending=False)


def influenciadores(df: pd.DataFrame, taxa_global: float) -> pd.DataFrame:
    entregues = df[df["DataEntrega"].notna()].copy()
    entregues["on_time"] = entregues["DataEntrega"] <= entregues["DataPrevistaEntrega"]
    entregues["oct_dias_pedido"] = (entregues["DataEntrega"] - entregues["DataPedido"]).dt.days
    entregues["FaixaOCT"] = pd.cut(
        entregues["oct_dias_pedido"], bins=FAIXAS_OCT, labels=ROTULOS_OCT
    )

    partes = []
    for dimensao, coluna in [
        ("Equipe", "Equipe"),
        ("CanalAtendimento", "CanalAtendimento"),
        ("FaixaOCT", "FaixaOCT"),
    ]:
        agrupado = entregues.groupby(coluna, observed=True).agg(
            volume=("on_time", "size"),
            pct_on_time=("on_time", "mean"),
        )
        agrupado = agrupado[agrupado["volume"] >= MIN_VOLUME_INFLUENCIADOR]
        agrupado["impacto"] = (agrupado["pct_on_time"] - taxa_global).round(4)
        agrupado["pct_on_time"] = agrupado["pct_on_time"].round(4)
        agrupado["dimensao"] = dimensao
        agrupado = agrupado.reset_index().rename(columns={coluna: "categoria"})
        partes.append(agrupado[["dimensao", "categoria", "volume", "pct_on_time", "impacto"]])

    resultado = pd.concat(partes, ignore_index=True)
    return resultado.reindex(resultado["impacto"].abs().sort_values(ascending=False).index)


def main() -> None:
    df = pd.read_parquet(ENTRADA)

    geral = resumo_geral(df)
    with open(SAIDA_DIR / "resumo_geral.json", "w", encoding="utf-8") as f:
        json.dump(geral, f, ensure_ascii=False, indent=2)

    comparacao_semestres(df).to_csv(SAIDA_DIR / "comparacao_semestres.csv", index=False)
    serie_mensal(df).to_csv(SAIDA_DIR / "serie_mensal.csv", index=False)
    serie_diaria_entregas(df).to_csv(SAIDA_DIR / "serie_diaria_entregas.csv", index=False)

    ranking_atraso(df, "Representante", MIN_VOLUME_RANKING, TOP_N).to_csv(
        SAIDA_DIR / "ranking_representante.csv", index=False
    )
    ranking_atraso(df, "Cliente", MIN_VOLUME_RANKING, TOP_N).to_csv(
        SAIDA_DIR / "ranking_cliente.csv", index=False
    )
    taxa_on_time_por_representante(df, MIN_VOLUME_RANKING).to_csv(
        SAIDA_DIR / "representante_on_time.csv", index=False
    )

    influenciadores(df, geral["pct_on_time"]).to_csv(
        SAIDA_DIR / "influenciadores.csv", index=False
    )

    print("OK: KPIs calculados ->", SAIDA_DIR)
    print(json.dumps(geral, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
