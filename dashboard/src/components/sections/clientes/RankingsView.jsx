import { useState } from "react";
import { Card, Grid, Text } from "@tremor/react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { fmtNum, fmtPct } from "../../../utils/format";
import { CORES, ECHARTS_TOOLTIP, ECHARTS_ANIMACAO, gradienteBarraH } from "../../../theme";
import { staggerContainer, fadeInUp } from "../../../utils/motion";

const TOP_N_EXIBIDO = 10;

const ALTURA_GRAFICO = 360;
const LARGURA_ROTULO = 110;
const GRID_V = 8; // top/bottom do grid do ECharts — precisa bater com a faixa de hover abaixo

function RankingBarChart({ dados, dataKeyLabel }) {
  // Maior valor primeiro + yAxis.inverse: index 0 (maior) fica no topo, igual
  // a um ranking lido de cima pra baixo.
  const top = [...dados].sort((a, b) => b.atrasados - a.atrasados).slice(0, TOP_N_EXIBIDO);

  const option = {
    ...ECHARTS_ANIMACAO,
    grid: { left: 10, right: 56, top: GRID_V, bottom: GRID_V, containLabel: true },
    tooltip: {
      trigger: "item",
      ...ECHARTS_TOOLTIP,
      formatter: (p) =>
        `${p.name}<br/>${fmtNum(p.value)} pedidos (${fmtPct(top[p.dataIndex].pct_atraso)} de atraso)`,
    },
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      data: top.map((d) => d[dataKeyLabel]),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: CORES.textoSecundario, fontSize: 11, width: LARGURA_ROTULO, overflow: "truncate", ellipsis: "..." },
    },
    series: [
      {
        type: "bar",
        data: top.map((d) => d.atrasados),
        barMaxWidth: 16,
        itemStyle: { color: gradienteBarraH(CORES.destaque), borderRadius: [0, 4, 4, 0] },
        emphasis: { itemStyle: { color: CORES.destaque } },
        label: { show: true, position: "right", formatter: (p) => fmtNum(p.value), color: CORES.textoSecundario, fontSize: 11 },
      },
    ],
  };

  return (
    <div style={{ height: ALTURA_GRAFICO, position: "relative" }}>
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
      {/* Nome completo no hover do rótulo truncado, via title nativo do
          navegador — testado e confirmado: o hover-no-canvas do próprio
          ECharts (axisLabel.triggerEvent) não dispara de forma confiável
          para rótulo de eixo, só pra cima de barra/ponto. Essa camada fina e
          invisível cobre só a coluna de rótulos (a área do gráfico continua
          100% interativa por baixo). */}
      <div
        className="absolute left-0 pointer-events-none"
        style={{ top: GRID_V, bottom: GRID_V, width: LARGURA_ROTULO }}
      >
        {top.map((d) => (
          <div
            key={d[dataKeyLabel]}
            title={d[dataKeyLabel]}
            className="pointer-events-auto"
            style={{ height: `${100 / top.length}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function TabelaTopOnTime({ titulo, linhas, corPill }) {
  return (
    <div>
      <Text className="mb-2">{titulo}</Text>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-dark-tremor-border">
            <th className="py-1.5 pr-2 font-medium">Representante</th>
            <th className="py-1.5 pr-2 font-medium">Entregues</th>
            <th className="py-1.5 font-medium">% On Time</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((r) => (
            <tr key={r.Representante} className="border-b border-dark-tremor-border last:border-none">
              <td className="py-1.5 pr-2 text-gray-200">{r.Representante}</td>
              <td className="py-1.5 pr-2 text-gray-300">{fmtNum(r.entregues)}</td>
              <td className="py-1.5">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    corPill === "good" ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                  }`}
                >
                  {fmtPct(r.pct_on_time)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RankingsView({ rankingRepresentante, rankingCliente, topOnTime, filtradoPorEquipe = false }) {
  const [aba, setAba] = useState("representante");

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={fadeInUp}>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <Text>Top 10 — mais pedidos fora do prazo (número de pedidos atrasados)</Text>
          <div className="flex gap-2">
            <button
              onClick={() => setAba("representante")}
              className={`rounded-tremor-full px-3 py-1.5 text-xs font-medium ${
                aba === "representante" ? "bg-blue-600 text-white" : "bg-dark-tremor-background-subtle text-gray-300"
              }`}
            >
              Representantes
            </button>
            <button
              onClick={() => setAba("cliente")}
              className={`rounded-tremor-full px-3 py-1.5 text-xs font-medium ${
                aba === "cliente" ? "bg-blue-600 text-white" : "bg-dark-tremor-background-subtle text-gray-300"
              }`}
            >
              Clientes
            </button>
          </div>
        </div>
        {aba === "representante" ? (
          <RankingBarChart dados={rankingRepresentante} dataKeyLabel="Representante" />
        ) : (
          <>
            {filtradoPorEquipe && (
              <p className="text-xs text-slate-400 mb-2">
                Total do período — ranking de clientes ainda não é filtrável por equipe.
              </p>
            )}
            <RankingBarChart dados={rankingCliente} dataKeyLabel="Cliente" />
          </>
        )}
      </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Grid numItemsMd={2} className="gap-4 items-stretch">
        <Card>
          <TabelaTopOnTime titulo="Top 3 — melhor % On Time" linhas={topOnTime.melhores} corPill="good" />
        </Card>
        <Card>
          <TabelaTopOnTime titulo="Top 3 — pior % On Time" linhas={topOnTime.piores} corPill="bad" />
        </Card>
      </Grid>
      </motion.div>
    </motion.div>
  );
}
