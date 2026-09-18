"""
Exporta um único dashboard_data.json (já agregado) para o frontend consumir.
Este é o ÚNICO arquivo de dados que entra em /dashboard — nenhum outro CSV
ou parquet deve ser referenciado pelo React.

Reaproveita as funções de cálculo de 03_kpis.py (import via importlib, já que
o nome do arquivo começa com dígito) — nenhuma fórmula de KPI ou lógica de
anonimização é reimplementada ou alterada aqui.

Além do payload "total" (compatível com a versão anterior do dashboard),
adiciona cortes por ano (2019 / 2020) de forma ADITIVA — nenhum campo
existente é removido ou renomeado — para alimentar o filtro de Ano da UI.
Também adiciona uma hierarquia Equipe -> Representante -> Cliente para o
drill-down. Como Representante/Cliente já são rótulos anônimos sem
correspondência reversível, não há risco adicional de reidentificação em
detalhar essa hierarquia (o cuidado de generalizar por contagem mínima já
foi aplicado a `Cidade`, que contém nomes reais de município).

Antes de gravar, roda uma verificação de defesa-em-profundidade contra os
nomes reais conhecidos (redundante com tests/test_anonimizacao.py, mas
barata e cobre também os campos novos). Os nomes em si vêm de
tests/_pii_local.py — arquivo local, fora do Git (ver README, seção
"Cuidados com a IA no pipeline") — nunca ficam hardcoded aqui.
"""
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = RAIZ / "scripts"
ANONIMIZADO = RAIZ / "data" / "processed" / "pedidos_anonimizado.parquet"
KPIS_DIR = RAIZ / "data" / "processed" / "kpis"
SAIDA_DIR = RAIZ / "dashboard" / "public" / "data"
SAIDA_DIR.mkdir(parents=True, exist_ok=True)
SAIDA = SAIDA_DIR / "dashboard_data.json"

TOP_N_INFLUENCIADORES = 12
TOP_CLIENTES_POR_REPRESENTANTE = 10
ANOS = [2019, 2020]


def _carregar_nomes_reais_conhecidos() -> list:
    """Carrega de tests/_pii_local.py (arquivo local, fora do Git). Sem esse
    arquivo (outra máquina, CI, clone limpo), cai num exemplo genérico — o
    check continua rodando, só não confere mais contra o nome real
    específico que motivou a decisão de anonimizar Representante."""
    caminho = RAIZ / "tests" / "_pii_local.py"
    if caminho.exists():
        spec = importlib.util.spec_from_file_location("_pii_local", caminho)
        modulo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modulo)
        return modulo.NOMES_REAIS_CONHECIDOS
    return ["Nome Sobrenome Exemplo"]


NOMES_REAIS_CONHECIDOS = _carregar_nomes_reais_conhecidos()


def _importar(nome_arquivo: str):
    caminho = SCRIPTS_DIR / nome_arquivo
    spec = importlib.util.spec_from_file_location(nome_arquivo[:-3], caminho)
    modulo = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = modulo
    spec.loader.exec_module(modulo)
    return modulo


kpis_mod = _importar("03_kpis.py")


def _agregado_atraso(df_entregues: pd.DataFrame, coluna: str) -> pd.DataFrame:
    agrupado = df_entregues.groupby(coluna).agg(
        entregues=("atrasado", "size"),
        atrasados=("atrasado", "sum"),
    )
    agrupado["pct_atraso"] = (agrupado["atrasados"] / agrupado["entregues"]).round(4)
    return agrupado.reset_index()


def hierarquia_drilldown(df: pd.DataFrame, top_clientes: int = TOP_CLIENTES_POR_REPRESENTANTE) -> list:
    entregues = df[df["DataEntrega"].notna()].copy()
    entregues["atrasado"] = entregues["DataEntrega"] > entregues["DataPrevistaEntrega"]

    equipes = _agregado_atraso(entregues, "Equipe").sort_values("atrasados", ascending=False)

    resultado = []
    for _, eq in equipes.iterrows():
        df_equipe = entregues[entregues["Equipe"] == eq["Equipe"]]
        representantes_agg = _agregado_atraso(df_equipe, "Representante").sort_values(
            "atrasados", ascending=False
        )
        representantes = []
        for _, rep in representantes_agg.iterrows():
            df_rep = df_equipe[df_equipe["Representante"] == rep["Representante"]]
            clientes_agg = (
                _agregado_atraso(df_rep, "Cliente")
                .sort_values("atrasados", ascending=False)
                .head(top_clientes)
                .rename(columns={"Cliente": "cliente"})
            )
            representantes.append(
                {
                    "representante": rep["Representante"],
                    "entregues": int(rep["entregues"]),
                    "atrasados": int(rep["atrasados"]),
                    "pct_atraso": float(rep["pct_atraso"]),
                    "clientes": clientes_agg.to_dict("records"),
                }
            )
        resultado.append(
            {
                "equipe": eq["Equipe"],
                "entregues": int(eq["entregues"]),
                "atrasados": int(eq["atrasados"]),
                "pct_atraso": float(eq["pct_atraso"]),
                "representantes": representantes,
            }
        )
    return resultado


def top_on_time(df: pd.DataFrame) -> dict:
    tabela = kpis_mod.taxa_on_time_por_representante(df, kpis_mod.MIN_VOLUME_RANKING)
    return {
        "melhores": tabela.head(3).to_dict("records"),
        "piores": tabela.tail(3).sort_values("pct_on_time").to_dict("records"),
    }


def top_influenciadores(df: pd.DataFrame, taxa_global: float) -> list:
    tabela = kpis_mod.influenciadores(df, taxa_global)
    tabela = tabela.copy()
    tabela["impacto_abs"] = tabela["impacto"].abs()
    tabela = tabela.sort_values("impacto_abs", ascending=False).head(TOP_N_INFLUENCIADORES)
    return tabela.drop(columns=["impacto_abs"]).to_dict("records")


def montar_corte(df: pd.DataFrame) -> dict:
    """Monta todas as visões derivadas para um recorte (df total ou de 1 ano)."""
    geral = kpis_mod.calcular_kpis(df)
    return {
        "resumo": geral,
        "ranking_representante_atraso": kpis_mod.ranking_atraso(
            df, "Representante", kpis_mod.MIN_VOLUME_RANKING, kpis_mod.TOP_N
        ).to_dict("records"),
        "ranking_cliente_atraso": kpis_mod.ranking_atraso(
            df, "Cliente", kpis_mod.MIN_VOLUME_RANKING, kpis_mod.TOP_N
        ).to_dict("records"),
        "top_representantes_on_time": top_on_time(df),
        "influenciadores_on_time": top_influenciadores(df, geral["pct_on_time"]),
        "hierarquia_drilldown": hierarquia_drilldown(df),
    }


def montar_payload() -> dict:
    df = pd.read_parquet(ANONIMIZADO)

    cortes_por_ano = {}
    for ano in ANOS:
        df_ano = df[df["AnoPedido"] == ano]
        corte = montar_corte(df_ano)
        corte["meses_cobertos"] = int(df_ano["MesPedido"].nunique())
        cortes_por_ano[str(ano)] = corte

    corte_total = montar_corte(df)

    payload = {
        "meta": {
            "gerado_em": datetime.now(timezone.utc).isoformat(),
            "fonte": "KPK Log - case educacional fictício",
            "nota_lgpd": (
                "Dados anonimizados e agregados conforme LGPD (art. 12). "
                "Representantes e clientes identificados por rótulo sequencial "
                "sem correspondência reversível; cidades com poucos pedidos "
                "foram generalizadas para evitar reidentificação."
            ),
        },
        # --- campos originais (compatibilidade com a v1 do dashboard) ---
        "resumo_geral": corte_total["resumo"],
        "comparacao_semestres": pd.read_csv(KPIS_DIR / "comparacao_semestres.csv").to_dict("records"),
        "serie_mensal": pd.read_csv(KPIS_DIR / "serie_mensal.csv").to_dict("records"),
        "serie_diaria_entregas": pd.read_csv(KPIS_DIR / "serie_diaria_entregas.csv").to_dict("records"),
        "ranking_representante_atraso": corte_total["ranking_representante_atraso"],
        "ranking_cliente_atraso": corte_total["ranking_cliente_atraso"],
        "top_representantes_on_time": corte_total["top_representantes_on_time"],
        "influenciadores_on_time": corte_total["influenciadores_on_time"],
        # --- campos novos (aditivos) para o filtro de Ano e o drill-down ---
        "hierarquia_drilldown": corte_total["hierarquia_drilldown"],
        "por_ano": cortes_por_ano,
    }
    return payload


def verificar_ausencia_de_pii(payload: dict) -> None:
    texto = json.dumps(payload, ensure_ascii=False)
    for nome in NOMES_REAIS_CONHECIDOS:
        if nome in texto:
            raise ValueError(
                f"BLOQUEADO: nome real '{nome}' encontrado no payload final. "
                "Publicação abortada — revise 02_anonimizacao.py."
            )


def main() -> None:
    payload = montar_payload()
    verificar_ausencia_de_pii(payload)

    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    tamanho_kb = SAIDA.stat().st_size / 1024
    print(f"OK: dashboard_data.json gerado -> {SAIDA} ({tamanho_kb:.1f} KB)")
    print("Verificação de PII: nenhum nome real conhecido encontrado.")
    print(f"Cortes por ano incluídos: {list(payload['por_ano'].keys())}")


if __name__ == "__main__":
    main()
