import { Card, Text } from "@tremor/react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { fmtPct, fmtNum } from "../../../utils/format";
import { CORES, ECHARTS_TOOLTIP, ECHARTS_GRADE, ECHARTS_ANIMACAO } from "../../../theme";
import InsightBanner from "../../ui/InsightBanner";
import { fadeInUp } from "../../../utils/motion";

// "Equipe"/"CanalAtendimento"/"FaixaOCT" são nomes de coluna do pipeline —
// aqui viram rótulo em português simples antes de qualquer texto ou eixo
// chegar na tela.
const ROTULO_DIMENSAO = {
  Equipe: "Equipe",
  CanalAtendimento: "Canal de atendimento",
  FaixaOCT: "Tempo de entrega",
};

function gerarInsight(dadosOrdenados, mediaGeral) {
  const pior = dadosOrdenados[0];
  const dimensao = ROTULO_DIMENSAO[pior.dimensao] ?? pior.dimensao;
  return `O fator que mais atrapalha a entrega no prazo é "${pior.categoria}" (${dimensao}): pedidos nessa categoria têm apenas ${fmtPct(
    pior.pct_on_time
  )} de entregas dentro do prazo, bem abaixo da média geral de ${fmtPct(mediaGeral)}.`;
}

const ALTURA_GRAFICO = 440;
const LARGURA_ROTULO = 150;
const GRID_V = 8; // top/bottom do grid do ECharts — precisa bater com a faixa de hover abaixo

export default function InfluenciadoresView({ influenciadores, mediaGeral }) {
  const dados = [...influenciadores]
    .sort((a, b) => a.impacto - b.impacto)
    .map((d) => ({ ...d, rotulo: `${ROTULO_DIMENSAO[d.dimensao] ?? d.dimensao}: ${d.categoria}` }));

  const option = {
    ...ECHARTS_ANIMACAO,
    grid: { left: 10, right: 60, top: GRID_V, bottom: GRID_V, containLabel: true },
    tooltip: {
      trigger: "item",
      ...ECHARTS_TOOLTIP,
      formatter: (p) => {
        const d = dados[p.dataIndex];
        return `${p.name}<br/>Impacto: <b>${(d.impacto * 100).toFixed(1)}pp</b><br/>${fmtNum(d.volume)} pedidos, ${fmtPct(
          d.pct_on_time
        )} on time`;
      },
    },
    xAxis: {
      type: "value",
      axisLabel: { color: CORES.eixo, fontSize: 11, formatter: (v) => `${Math.round(v * 100)}pp` },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: ECHARTS_GRADE,
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: dados.map((d) => d.rotulo),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: CORES.textoSecundario, fontSize: 11, width: LARGURA_ROTULO, overflow: "truncate", ellipsis: "..." },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 18,
        data: dados.map((d) => ({
          value: d.impacto,
          itemStyle: { color: d.impacto < 0 ? CORES.ruim : CORES.bom, borderRadius: d.impacto < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0] },
          label:
            d.impacto < 0
              ? { show: true, position: "insideRight", formatter: () => `${(d.impacto * 100).toFixed(1)}pp`, color: "#fff", fontWeight: 600, fontSize: 11 }
              : { show: true, position: "right", formatter: () => `+${(d.impacto * 100).toFixed(1)}pp`, color: CORES.textoSecundario, fontSize: 11 },
        })),
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: CORES.eixo, width: 1 },
          label: { show: false },
          data: [{ xAxis: 0 }],
        },
      },
    ],
  };

  return (
    <div className="space-y-3">
      <InsightBanner tipo="atencao">{gerarInsight(dados, mediaGeral)}</InsightBanner>

      <Text>
        Diferença entre a taxa de On Time de cada categoria e a média geral ({fmtPct(mediaGeral)}).
      </Text>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500 inline-block" /> Reduz o % On Time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> Aumenta o % On Time
        </span>
        <span className="text-slate-400">Apenas categorias com ≥ 100 pedidos</span>
      </div>
      <motion.div initial="hidden" animate="show" variants={fadeInUp}>
      <Card className="transition-all duration-200 hover:border-gray-700">
        <div style={{ height: ALTURA_GRAFICO, position: "relative" }}>
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
          {/* Nome completo no hover do rótulo truncado, via title nativo do
              navegador — testado e confirmado: o hover-no-canvas do próprio
              ECharts (axisLabel.triggerEvent) não dispara de forma confiável
              para rótulo de eixo, só pra cima de barra/ponto. Essa camada
              fina e invisível cobre só a coluna de rótulos (a área do
              gráfico continua 100% interativa por baixo). */}
          <div
            className="absolute left-0 pointer-events-none"
            style={{ top: GRID_V, bottom: GRID_V, width: LARGURA_ROTULO }}
          >
            {dados.map((d) => (
              <div
                key={d.rotulo}
                title={d.rotulo}
                className="pointer-events-auto"
                style={{ height: `${100 / dados.length}%` }}
              />
            ))}
          </div>
        </div>
      </Card>
      </motion.div>
    </div>
  );
}
