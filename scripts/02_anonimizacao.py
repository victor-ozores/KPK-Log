"""
Anonimização — aplica substituição irreversível + generalização geográfica
sobre a saída do ETL, seguindo a abordagem baseada em risco da ANPD (LGPD art. 12).

Decisões (documentadas para o README):
- `Representante`: a inspeção mostrou que a coluna mistura códigos de
  rota/equipe (ex. "FLP-NOR", "BNU-CEN") com nomes reais de pessoa física.
  Os nomes reais encontrados ficam só em `tests/_pii_local.py` (arquivo
  local, fora do Git — ver seção "Cuidados com a IA no pipeline" do
  README), nunca neste script nem em qualquer arquivo versionado. Como não
  é seguro confiar em heurística para separar "código" de "nome real",
  TODOS os 109 valores são substituídos por rótulo sequencial estável
  `Representante_NN`, atribuído por ordem de `cdRepresentante`.
- `Cliente`: já chega da fonte como "Cliente NNNN" (sem nome real), mas o
  número embutido é o `cdCliente` original. Por precaução (não expor o
  código interno real) e por consistência, é substituído por rótulo
  sequencial estável `Cliente_NNNNN`.
- `Cidade`: mantida com o nome real quando o município tem >= MIN_PEDIDOS_CIDADE
  pedidos no período completo (2019-2020); abaixo disso, generalizada para
  "Outras Cidades (agrupado)" para evitar reidentificação cruzada
  (ex. um único representante atendendo uma cidade de 3 pedidos).
- Nenhum mapa de-para é salvo em disco: os mapeamentos são determinísticos
  (por ordenação do código original) e recriados em memória a cada execução,
  então não há arquivo de reversão para vazar.
- As colunas de código original (`cdRepresentante`, `cdCliente`, `cdCidade`)
  são descartadas da saída anonimizada.

Saída: data/processed/pedidos_anonimizado.parquet (este SIM é versionado —
não contém nenhum dado pessoal real).
"""
import pandas as pd
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "data" / "raw" / "pedidos_full.parquet"
SAIDA_DIR = RAIZ / "data" / "processed"
SAIDA_DIR.mkdir(parents=True, exist_ok=True)
SAIDA = SAIDA_DIR / "pedidos_anonimizado.parquet"

MIN_PEDIDOS_CIDADE = 30  # abaixo disso, cidade é generalizada (k-anonimato aproximado)
OUTRAS_CIDADES = "Outras Cidades (agrupado)"


def mapa_sequencial_estavel(codigos: pd.Series, prefixo: str, largura: int) -> dict:
    """Gera {codigo_original: 'Prefixo_001', ...} ordenado pelo próprio código,
    determinístico e sem precisar persistir mapa em disco."""
    unicos_ordenados = sorted(codigos.dropna().unique())
    return {
        codigo: f"{prefixo}_{i + 1:0{largura}d}"
        for i, codigo in enumerate(unicos_ordenados)
    }


def anonimizar_representante(df: pd.DataFrame) -> pd.DataFrame:
    mapa = mapa_sequencial_estavel(df["cdRepresentante"], "Representante", 3)
    df["Representante"] = df["cdRepresentante"].map(mapa)
    return df


def anonimizar_cliente(df: pd.DataFrame) -> pd.DataFrame:
    mapa = mapa_sequencial_estavel(df["cdCliente"], "Cliente", 5)
    df["Cliente"] = df["cdCliente"].map(mapa)
    return df


def generalizar_cidade(df: pd.DataFrame) -> pd.DataFrame:
    contagem = df["Cidade"].value_counts()
    cidades_pequenas = set(contagem[contagem < MIN_PEDIDOS_CIDADE].index)
    df["Cidade"] = df["Cidade"].apply(
        lambda c: OUTRAS_CIDADES if c in cidades_pequenas else c
    )
    return df


def main() -> None:
    df = pd.read_parquet(ENTRADA)

    df = anonimizar_representante(df)
    df = anonimizar_cliente(df)
    df = generalizar_cidade(df)

    df = df.drop(columns=["cdRepresentante", "cdCliente", "cdCidade"])

    df.to_parquet(SAIDA, index=False)

    print(f"OK: {len(df):,} pedidos anonimizados -> {SAIDA}")
    print(f"Representantes únicos: {df['Representante'].nunique()}")
    print(f"Clientes únicos: {df['Cliente'].nunique()}")
    print(f"Cidades únicas (após generalização): {df['Cidade'].nunique()}")
    print(f"Pedidos agrupados em '{OUTRAS_CIDADES}': {(df['Cidade'] == OUTRAS_CIDADES).sum():,}")


if __name__ == "__main__":
    main()
