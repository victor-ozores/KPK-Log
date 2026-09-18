import { motion } from "framer-motion";
import {
  RiShieldCheckLine,
  RiTimer2Line,
  RiCheckboxCircleLine,
  RiArchiveLine,
  RiHourglassLine,
  RiReceiptLine,
} from "@remixicon/react";
import { Card, Title, Text } from "@tremor/react";
import ReactECharts from "echarts-for-react";
import KpiCard from "../ui/KpiCard";
import Meter from "../ui/Meter";
import InsightBanner from "../ui/InsightBanner";
import { fmtNum, fmtPct, fmtDias } from "../../utils/format";
import {
  CORES,
  ECHARTS_TOOLTIP,
  ECHARTS_EIXO,
  ECHARTS_GRADE,
  ECHARTS_ANIMACAO,
  gradienteArea,
  statusOtifTremor,
  statusOtifHex,
} from "../../theme";
import { staggerContainer, fadeInUp } from "../../utils/motion";

function filtrarPorAno(serieMensal, ano) {
  if (ano === "todos") return serieMensal;
  return serieMensal.filter((l) => l.AnoMes.startsWith(ano));
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// AnoMes vem do pipeline como "2019-01" (ISO, ano primeiro) — não é um
// formato de exibição. O eixo do gráfico precisa do padrão brasileiro
// mês/ano (ex.: "jan/19"), mesmo formato já usado em Comparação de Períodos
// e Padrão Diário, para não misturar convenções dentro do dashboard.
function formatarMesEixo(anoMes) {
  const [ano, mes] = anoMes.split("-");
  return `${MESES_ABREV[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

// Mesmos limiares de statusOtifTremor/statusOtifHex (theme.js), aqui como
// classificação textual para colorir o InsightBanner desta seção.
function statusOtifInsight(pctOtif) {
  if (pctOtif >= 0.95) return "bom";
  if (pctOtif >= 0.85) return "atencao";
  return "ruim";
}

// Nomeia os dois lados sempre por extenso (nunca só "o outro componente")
// para não depender do leitor lembrar qual métrica é qual.
function gerarInsight(resumo) {
  const gargaloOnTime = resumo.pct_on_time <= resumo.pct_in_full;
  const nomeFraco = gargaloOnTime ? "On Time (entregar dentro do prazo)" : "In Full (entregar sem devolução)";
  const nomeForte = gargaloOnTime ? "In Full (entregar sem devolução)" : "On Time (entregar dentro do prazo)";
  const valorFraco = gargaloOnTime ? resumo.pct_on_time : resumo.pct_in_full;
  const valorForte = gargaloOnTime ? resumo.pct_in_full : resumo.pct_on_time;
  return `O ponto fraco do OTIF é o ${nomeFraco}: ${fmtPct(valorFraco)}, bem abaixo do ${nomeForte} (${fmtPct(
    valorForte
  )}). É aí que uma melhoria traria o maior ganho no OTIF, hoje em ${fmtPct(resumo.pct_otif)}.`;
}

function RotuloGrupo({ children }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{children}</p>;
}

export default function VisaoGeral({ resumo, serieMensal, ano }) {
  const dadosGrafico = filtrarPorAno(serieMensal, ano);
  const meses = dadosGrafico.map((l) => formatarMesEixo(l.AnoMes));
  const serieOtif = dadosGrafico.map((l) => Math.round(l.pct_otif * 1000) / 10);
  const serieOnTime = dadosGrafico.map((l) => Math.round(l.pct_on_time * 1000) / 10);
  const serieInFull = dadosGrafico.map((l) => Math.round(l.pct_in_full * 1000) / 10);

  // Storytelling: aponta automaticamente os meses de menor E maior OTIF do
  // recorte atual (recalcula a cada filtro de Ano) em vez de deixar o leitor
  // caçar o vale e o pico no gráfico sozinho.
  const idxMenorOtif = serieOtif.length
    ? serieOtif.reduce((iMin, v, i, arr) => (v < arr[iMin] ? i : iMin), 0)
    : -1;
  const menorOtifValor = idxMenorOtif >= 0 ? serieOtif[idxMenorOtif] : null;

  const idxMelhorOtif = serieOtif.length
    ? serieOtif.reduce((iMax, v, i, arr) => (v > arr[iMax] ? i : iMax), 0)
    : -1;
  const melhorOtifValor = idxMelhorOtif >= 0 ? serieOtif[idxMelhorOtif] : null;

  // Com 1 único mês no recorte (ou todos os meses empatados), melhor e pior
  // seriam o mesmo ponto — nesse caso mostra só o marcador vermelho, não dois
  // pins empilhados no mesmo lugar.
  const temAmbosMarcadores = idxMenorOtif >= 0 && idxMelhorOtif >= 0 && idxMelhorOtif !== idxMenorOtif;
  // Meses vizinhos (ou o mesmo mês) fariam os dois pins colidirem — nesse
  // caso o pin vermelho sobe mais um degrau pra abrir espaço vertical entre eles.
  const marcadoresProximos = temAmbosMarcadores && Math.abs(idxMelhorOtif - idxMenorOtif) <= 1;

  const optionTendencia = {
    ...ECHARTS_ANIMACAO,
    // top maior que o padrão (40) pra sobrar espaço acima da linha/área para os
    // pins "flutuarem" com folga (em vez de nascerem grudados na própria
    // série) E para o rótulo, que agora fica ACIMA do pin, não clipar contra
    // a legenda no topo do card.
    grid: { left: 44, right: 12, top: 68, bottom: 28 },
    tooltip: { trigger: "axis", ...ECHARTS_TOOLTIP, valueFormatter: (v) => `${v}%` },
    legend: {
      data: ["% OTIF", "% On Time", "% In Full"],
      top: 0,
      right: 0,
      textStyle: { color: CORES.textoSecundario, fontSize: 12 },
      itemWidth: 14,
      itemHeight: 8,
    },
    xAxis: { type: "category", data: meses, boundaryGap: false, ...ECHARTS_EIXO },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { ...ECHARTS_EIXO.axisLabel, formatter: "{value}%" },
      splitLine: ECHARTS_GRADE,
    },
    // % OTIF é a série "herói" (linha grossa + área em gradiente); On Time e
    // In Full ficam finas em cinza — forma de "emphasis" (1 cor + contexto),
    // mesma hierarquia visual dos Meters acima aplicada ao gráfico de tendência.
    series: [
      {
        name: "% OTIF",
        type: "line",
        data: serieOtif,
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 3, color: CORES.destaque },
        itemStyle: { color: CORES.destaque, borderColor: CORES.tooltipBg, borderWidth: 2 },
        areaStyle: { color: gradienteArea(CORES.destaque) },
        emphasis: { focus: "series" },
        // symbolOffset levanta o pin acima do ponto de dado (em vez de nascer
        // encostado na linha/área) — cada item de data pode sobrepor o
        // itemStyle/offset/label da série, o que permite pintar os dois pins
        // (pior em vermelho, melhor em verde) na mesma série sem duplicá-la.
        // O rótulo (%) fica ACIMA do pin (position "top" + distance), não
        // dentro dele — mais fácil de ler que o número pequeno espremido no
        // balão — e usa a mesma cor do pin pra manter a associação visual.
        markPoint:
          idxMenorOtif >= 0
            ? {
                symbol: "pin",
                symbolSize: 32,
                symbolOffset: [0, "-20%"],
                label: {
                  position: "top",
                  distance: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (p) => `${p.value}%`,
                },
                data: [
                  {
                    coord: [idxMenorOtif, menorOtifValor],
                    value: menorOtifValor,
                    name: "Menor OTIF",
                    itemStyle: { color: CORES.ruim },
                    label: { color: CORES.ruim },
                    symbolOffset: [0, marcadoresProximos ? "-45%" : "-20%"],
                  },
                  ...(temAmbosMarcadores
                    ? [
                        {
                          coord: [idxMelhorOtif, melhorOtifValor],
                          value: melhorOtifValor,
                          name: "Maior OTIF",
                          itemStyle: { color: CORES.bom },
                          label: { color: CORES.bom },
                          symbolOffset: [0, "-20%"],
                        },
                      ]
                    : []),
                ],
              }
            : undefined,
        z: 3,
      },
      {
        name: "% On Time",
        type: "line",
        data: serieOnTime,
        smooth: 0.25,
        showSymbol: false,
        lineStyle: { width: 1.5, color: CORES.neutro },
        z: 2,
      },
      {
        name: "% In Full",
        type: "line",
        data: serieInFull,
        smooth: 0.25,
        showSymbol: false,
        lineStyle: { width: 1.5, color: CORES.neutroForte },
        z: 2,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <InsightBanner tipo={statusOtifInsight(resumo.pct_otif)}>{gerarInsight(resumo)}</InsightBanner>

      {/* Grupo 1: Qualidade — OTIF, On Time e In Full são cada um uma razão
          única contra 100%, o "job" que o método de dataviz define como Meter,
          não KPI de texto. O arco mostra a distância até a meta de cara,
          sem precisar ler o número e fazer a conta mentalmente. */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <RotuloGrupo>Qualidade — OTIF</RotuloGrupo>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
          <motion.div variants={fadeInUp}>
            <Meter
              label="OTIF"
              subtitulo="on time × in full"
              value={resumo.pct_otif}
              info="On Time In Full = % On Time × % In Full. Mede pedidos entregues no prazo E sem devolução."
              corSeveridade={statusOtifHex(resumo.pct_otif)}
              Icon={RiShieldCheckLine}
              badgeColor={statusOtifTremor(resumo.pct_otif)}
              badgeText={
                resumo.pct_otif >= 0.95 ? "Meta atingida" : resumo.pct_otif >= 0.85 ? "Atenção" : "Crítico"
              }
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Meter
              label="On Time"
              subtitulo="% entregue no prazo"
              value={resumo.pct_on_time}
              info="Percentual de pedidos entregues até a data prevista de entrega."
              corSeveridade={statusOtifHex(resumo.pct_on_time)}
              Icon={RiTimer2Line}
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Meter
              label="In Full"
              subtitulo="% sem devolução"
              value={resumo.pct_in_full}
              info="Percentual de pedidos entregues sem nenhuma ocorrência de devolução/avaria."
              corSeveridade={statusOtifHex(resumo.pct_in_full)}
              Icon={RiCheckboxCircleLine}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Grupo 2: Volume e Tempo de Ciclo — números absolutos sem limite
          superior natural (contagens, dias corridos), o "job" que o método
          define como stat tile — continuam KpiCard, não Meter. */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch"
      >
        <div className="lg:col-span-3 flex flex-col">
          <RotuloGrupo>Volume</RotuloGrupo>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 items-stretch">
            <motion.div variants={fadeInUp}>
              <KpiCard
                label="Realizados"
                subtitulo="pedidos no período"
                value={resumo.realizados}
                formatador={(v) => fmtNum(Math.round(v))}
                info="Total de pedidos registrados no período: todo pedido emitido, entregue ou não."
                Icon={RiArchiveLine}
                iconColor="blue"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <KpiCard
                label="Entregues"
                subtitulo="com data de entrega"
                value={resumo.entregues}
                formatador={(v) => fmtNum(Math.round(v))}
                info="Pedidos do total acima que já possuem data de entrega registrada."
                Icon={RiCheckboxCircleLine}
                iconColor="emerald"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <KpiCard
                label="Em Aberto"
                subtitulo="ainda não entregues"
                value={resumo.em_aberto}
                formatador={(v) => fmtNum(Math.round(v))}
                info="Pedidos realizados que ainda não foram entregues (Realizados − Entregues)."
                Icon={RiHourglassLine}
                iconColor="amber"
              />
            </motion.div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col">
          <RotuloGrupo>Tempo de Ciclo</RotuloGrupo>
          <div className="grid grid-cols-2 gap-4 flex-1 items-stretch">
            <motion.div variants={fadeInUp}>
              <KpiCard
                label="OFR"
                subtitulo="dias até o CT-e"
                value={resumo.ofr_dias}
                formatador={fmtDias}
                info="Tempo médio, em dias, entre o pedido e a emissão do CT-e (nota fiscal de transporte)."
                Icon={RiReceiptLine}
                iconColor="gray"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <KpiCard
                label="OCT"
                subtitulo="dias até a entrega"
                value={resumo.oct_dias}
                formatador={fmtDias}
                info="Order Cycle Time: tempo médio, em dias, entre o pedido e a entrega efetiva ao cliente."
                Icon={RiTimer2Line}
                iconColor="gray"
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Composição (Entregues vs Em Aberto) foi removida daqui: os 3 KPIs de
          Volume acima (Realizados/Entregues/Em Aberto) já respondem
          "Realizados = Entregues + Em Aberto" em números exatos — um 4º card
          só pra mostrar a mesma razão em % não justificava ocupar uma linha
          inteira sozinho. */}
      <Card className="transition-all duration-200 hover:border-gray-700">
        <Title className="!text-gray-50">OTIF ao longo do tempo</Title>
        <Text className="mt-1">
          {temAmbosMarcadores
            ? "O marcador vermelho aponta o mês de menor OTIF; o verde, o de maior OTIF — ambos no período selecionado."
            : "O marcador vermelho aponta o mês de menor OTIF do período selecionado."}
        </Text>
        <div style={{ height: 300 }} className="mt-4">
          <ReactECharts option={optionTendencia} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
        </div>
      </Card>
    </div>
  );
}
