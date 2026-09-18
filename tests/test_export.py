"""Valida o payload final exportado para o dashboard: consistência dos
cortes por ano (aditivos) e ausência de PII em todo o JSON publicado."""
from conftest import importar_script

export_mod = importar_script("04_export.py")


def test_cortes_por_ano_somam_exatamente_ao_total():
    payload = export_mod.montar_payload()
    total = payload["resumo_geral"]
    r2019 = payload["por_ano"]["2019"]["resumo"]
    r2020 = payload["por_ano"]["2020"]["resumo"]

    assert r2019["realizados"] + r2020["realizados"] == total["realizados"]
    assert r2019["entregues"] + r2020["entregues"] == total["entregues"]
    assert r2019["em_aberto"] + r2020["em_aberto"] == total["em_aberto"]


def test_payload_completo_nao_contem_nomes_reais_conhecidos():
    payload = export_mod.montar_payload()
    # não deve levantar exceção
    export_mod.verificar_ausencia_de_pii(payload)


def test_hierarquia_drilldown_soma_bate_com_equipe():
    payload = export_mod.montar_payload()
    for equipe in payload["hierarquia_drilldown"]:
        soma_entregues_representantes = sum(r["entregues"] for r in equipe["representantes"])
        assert soma_entregues_representantes == equipe["entregues"]
