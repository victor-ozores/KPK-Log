"""Valida as fórmulas de OTIF com casos conhecidos (valores calculados à mão)."""
import pandas as pd
import pytest
from conftest import importar_script

kpis_mod = importar_script("03_kpis.py")


def _df_teste() -> pd.DataFrame:
    linhas = [
        # DataPedido,  DataEmissaoCTE, DataEntrega,  DataPrevistaEntrega, OcorrenciaDevolucao
        ("2020-01-01", "2020-01-02", "2020-01-04", "2020-01-05", 0),  # no prazo, sem devolução
        ("2020-01-01", "2020-01-02", "2020-01-07", "2020-01-05", 0),  # atrasado, sem devolução
        ("2020-01-01", "2020-01-03", "2020-01-05", "2020-01-05", 5),  # no prazo (limite exato), com devolução
        ("2020-01-01", "2020-01-02", None, "2020-01-10", 0),          # em aberto (não entregue)
    ]
    df = pd.DataFrame(
        linhas,
        columns=["DataPedido", "DataEmissaoCTE", "DataEntrega", "DataPrevistaEntrega", "OcorrenciaDevolucao"],
    )
    for col in ["DataPedido", "DataEmissaoCTE", "DataEntrega", "DataPrevistaEntrega"]:
        df[col] = pd.to_datetime(df[col])
    return df


def test_contagens_basicas():
    kpis = kpis_mod.calcular_kpis(_df_teste())
    assert kpis["realizados"] == 4
    assert kpis["entregues"] == 3
    assert kpis["em_aberto"] == 1


def test_percentuais_on_time_in_full_otif():
    kpis = kpis_mod.calcular_kpis(_df_teste())
    # pedido 1: on-time + in-full | pedido 2: atrasado + in-full | pedido 3: on-time + NAO in-full
    assert kpis["pct_on_time"] == pytest.approx(2 / 3, abs=1e-4)
    assert kpis["pct_in_full"] == pytest.approx(2 / 3, abs=1e-4)
    assert kpis["pct_otif"] == pytest.approx((2 / 3) * (2 / 3), abs=1e-4)


def test_entrega_exatamente_na_data_prevista_conta_como_on_time():
    df = _df_teste()
    entregues = df[df["DataEntrega"].notna()]
    pedido_no_limite = entregues.iloc[2]
    assert pedido_no_limite["DataEntrega"] == pedido_no_limite["DataPrevistaEntrega"]

    # se a regra fosse "<" estrito, pct_on_time cairia para 1/3
    kpis = kpis_mod.calcular_kpis(df)
    assert kpis["pct_on_time"] == pytest.approx(2 / 3, abs=1e-4)


def test_ofr_usa_todos_os_pedidos_oct_usa_so_entregues():
    kpis = kpis_mod.calcular_kpis(_df_teste())
    # OFR: (1 + 1 + 2 + 1) dias / 4 pedidos
    assert kpis["ofr_dias"] == pytest.approx(1.25, abs=1e-4)
    # OCT: (3 + 6 + 4) dias / 3 pedidos entregues (exclui o pedido em aberto)
    # calcular_kpis arredonda para 2 casas decimais na saída, por isso a tolerância maior
    assert kpis["oct_dias"] == pytest.approx((3 + 6 + 4) / 3, abs=1e-2)


def test_dataset_vazio_de_entregues_nao_quebra():
    df = _df_teste()
    df["DataEntrega"] = pd.NaT
    kpis = kpis_mod.calcular_kpis(df)
    assert kpis["entregues"] == 0
    assert kpis["pct_on_time"] == 0.0
    assert kpis["pct_in_full"] == 0.0
    assert kpis["pct_otif"] == 0.0
