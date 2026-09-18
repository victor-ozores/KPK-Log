import { motion } from "framer-motion";
import { Card, Title, Grid, Text, Metric, Flex } from "@tremor/react";
import { RiArrowUpLine, RiArrowDownLine } from "@remixicon/react";
import ReactECharts from "echarts-for-react";
import { fmtNum, fmtPct, fmtDias } from "../../utils/format";
import { CORES, ECHARTS_TOOLTIP, ECHARTS_EIXO, ECHARTS_GRADE, ECHARTS_ANIMACAO } from "../../theme";
import InsightBanner from "../ui/InsightBanner";
import DumbbellChart from "../ui/DumbbellChart";
import { staggerContainer, fadeInUp } from "../../utils/motion";

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];

// O filtro de Ano muda O QUE é comparado nesta seção:
// "todos" -> 1º semestre 2019 vs 1º semestre 2020 (comparação original do case)
// "2019"/"2020" -> 1º semestre vs 2º semestre daquele ano
function definirPeriodos(ano) {
  if (ano === "2019") {
    return { tagA: "2019-S1", tagB: "2019-S2", labelA: "1º Sem. 2019", labelB: "2º Sem. 2019", contexto: "1º vs 2º semestre de 2019" };
  }
  if (ano === "2020") {
    return { tagA: "2020-S1", tagB: "2020-S2", labelA: "1º Sem. 2020", labelB: "2º Sem. 2020", contexto: "1º vs 2º semestre de 2020" };
  }
  return { tagA: "2019-S1", tagB: "2020-S1", labelA: "1º Sem. 2019", labelB: "1º Sem. 2020", contexto: "1º semestre — 2019 vs 2020" };
}

function montarLinhaSemestral(serieMensal, tagA, tagB) {
  const dadosA = {};
  const dadosB = {};
  serieMensal.forEach((linha) => {
    const [anoStr, mesStr] = linha.AnoMes.split("-");
    const mes = parseInt(mesStr, 10);
    const semestre = mes <= 6 ? 1 : 2;
    const tag = `${anoStr}-S${semestre}`;
    const mesDoSemestre = semestre === 1 ? mes : mes - 6;
    if (tag === tagA) dadosA[mesDoSemestre] = linha.pct_otif;
    if (tag === tagB) dadosB[mesDoSemestre] = linha.pct_otif;
  });
  return Array.from({ length: 6 }, (_, i) => ({
    mes: NOMES_MES[i],
    A: dadosA[i + 1] ?? null,
    B: dadosB[i + 1] ?? null,
  }));
}

// Antes usava "pp" (ponto percentual) e "componente" — linguagem de
// planilha. Aqui descreve em português direto: de-quanto-pra-quanto, sem
// abreviação, nomeando On Time / In Full por extenso na primeira menção.
function gerarInsight(periodoA, periodoB, labelA, labelB, diffOtif) {
  const deltaOnTime = periodoB.pct_on_time - periodoA.pct_on_time;
  const deltaInFull = periodoB.pct_in_full - periodoA.pct_in_full;
  const direcao = diffOtif >= 0 ? "melhorou" : "piorou";
  const principalOnTime = Math.abs(deltaOnTime) >= Math.abs(deltaInFull);
  const nomePrincipal = principalOnTime ? "On Time (entrega dentro do prazo)" : "In Full (pedido sem devolução)";
  const deValor = fmtPct(principalOnTime ? periodoA.pct_on_time : periodoA.pct_in_full);
  const paraValor = fmtPct(principalOnTime ? periodoB.pct_on_time : periodoB.pct_in_full);
  return `O OTIF ${direcao} de ${fmtPct(periodoA.pct_otif)} para ${fmtPct(
    periodoB.pct_otif
  )} entre ${labelA} e ${labelB}. A maior parte dessa mudança veio do ${nomePrincipal}, que foi de ${deValor} para ${paraValor}.`;
}

function DiffCard({ label, subtitulo, valorTexto, subiu, melhorou }) {
  const Seta = subiu ? RiArrowUpLine : RiArrowDownLine;
  return (
    <Card className="!p-4 h-full flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-700 hover:shadow-lg hover:shadow-black/30">
      <Text className="!text-gray-400">{label}</Text>
      <p className="text-[11px] text-slate-400 mt-0.5 mb-2 h-4 leading-tight">{subtitulo}</p>
      <Flex justifyContent="start" alignItems="center" className="gap-1.5 mt-auto">
        <Seta className={`h-4 w-4 shrink-0 ${melhorou ? "text-emerald-400" : "text-red-400"}`} />
        <Metric className={melhorou ? "!text-emerald-400" : "!text-red-400"} style={{ fontSize: "1.25rem" }}>
          {valorTexto}
        </Metric>
      </Flex>
    </Card>
  );
}

export default function ComparacaoPeriodos({ comparacaoSemestres, serieMensal, ano }) {
  const { tagA, tagB, labelA, labelB, contexto } = definirPeriodos(ano);
  const periodoA = comparacaoSemestres.find((s) => s.AnoSemestre === tagA);
  const periodoB = comparacaoSemestres.find((s) => s.AnoSemestre === tagB);
  if (!periodoA || !periodoB) return null;

  const categoriasDumbbell = [
    { nome: "% On Time", a: periodoA.pct_on_time, b: periodoB.pct_on_time },
    { nome: "% In Full", a: periodoA.pct_in_full, b: periodoB.pct_in_full },
    { nome: "% OTIF", a: periodoA.pct_otif, b: periodoB.pct_otif },
  ];
  const linha = montarLinhaSemestral(serieMensal, tagA, tagB);

  const diffEntregas = periodoB.entregues - periodoA.entregues;
  const diffEntregasPct = periodoA.entregues ? (diffEntregas / periodoA.entregues) * 100 : 0;
  const diffOtif = periodoB.pct_otif - periodoA.pct_otif;
  const diffOfr = periodoB.ofr_dias - periodoA.ofr_dias;
  const diffOct = periodoB.oct_dias - periodoA.oct_dias;

  const optionLinha = {
    ...ECHARTS_ANIMACAO,
    grid: { left: 44, right: 16, top: 40, bottom: 24 },
    legend: {
      data: [labelA, labelB],
      top: 0,
      left: 0,
      textStyle: { color: CORES.textoSecundario, fontSize: 12 },
      itemWidth: 12,
      itemHeight: 8,
    },
    tooltip: { trigger: "axis", ...ECHARTS_TOOLTIP, valueFormatter: (v) => (v == null ? "-" : fmtPct(v)) },
    xAxis: { type: "category", data: linha.map((l) => l.mes), boundaryGap: true, ...ECHARTS_EIXO },
    yAxis: {
      type: "value",
      axisLabel: { ...ECHARTS_EIXO.axisLabel, formatter: (v) => `${Math.round(v * 100)}%` },
      splitLine: ECHARTS_GRADE,
    },
    series: [
      {
        name: labelA,
        type: "line",
        data: linha.map((l) => l.A),
        smooth: 0.2,
        symbolSize: 7,
        lineStyle: { width: 2, color: CORES.neutro },
        itemStyle: { color: CORES.neutro, borderColor: CORES.tooltipBg, borderWidth: 2 },
        connectNulls: true,
      },
      {
        name: labelB,
        type: "line",
        data: linha.map((l) => l.B),
        smooth: 0.2,
        symbolSize: 7,
        lineStyle: { width: 2.5, color: CORES.destaque },
        itemStyle: { color: CORES.destaque, borderColor: CORES.tooltipBg, borderWidth: 2 },
        connectNulls: true,
      },
    ],
  };

  return (
    <div className="space-y-5">
      <InsightBanner tipo={diffOtif >= 0 ? "bom" : "ruim"}>
        {gerarInsight(periodoA, periodoB, labelA, labelB, diffOtif)}
      </InsightBanner>

      <Text>
        Comparando <strong className="text-gray-200">{contexto}</strong>. O filtro de Ano no topo
        muda o que é comparado: "Todos" compara o 1º semestre dos dois anos; escolher 2019 ou 2020
        compara os semestres dentro daquele ano.
      </Text>

      <Grid numItemsMd={2} className="gap-4 items-stretch">
        <Card className="transition-all duration-200 hover:border-gray-700">
          <Title className="!text-gray-50">% On Time, % In Full e % OTIF — {labelA} → {labelB}</Title>
          <Text className="mt-1">
            Cada linha compara os dois períodos: bolinha cinza = {labelA}, bolinha azul = {labelB}. Quanto mais
            distantes as bolinhas, maior a mudança.
          </Text>
          <div className="mt-3">
            <DumbbellChart
              categorias={categoriasDumbbell}
              rotuloA={labelA}
              rotuloB={labelB}
              corA={CORES.neutro}
              corB={CORES.destaque}
              formatoValor={fmtPct}
              altura={240}
            />
          </div>
        </Card>

        <Card className="transition-all duration-200 hover:border-gray-700">
          <Title className="!text-gray-50">% OTIF mês a mês — {labelA} vs {labelB}</Title>
          <Text className="mt-1">Mostra, mês a mês dentro do semestre, como o OTIF evoluiu nos dois períodos.</Text>
          <div style={{ height: 240 }} className="mt-3">
            <ReactECharts option={optionLinha} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
          </div>
        </Card>
      </Grid>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch"
      >
        <motion.div variants={fadeInUp}>
          <DiffCard
            label="Entregas"
            subtitulo={`${labelA} → ${labelB}`}
            valorTexto={`${diffEntregas >= 0 ? "+" : ""}${fmtNum(diffEntregas)} (${diffEntregasPct.toFixed(1)}%)`}
            subiu={diffEntregas >= 0}
            melhorou={diffEntregas >= 0}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <DiffCard
            label="OTIF"
            subtitulo={`${labelB} vs ${labelA}`}
            valorTexto={`${fmtPct(periodoB.pct_otif)} vs ${fmtPct(periodoA.pct_otif)}`}
            subiu={diffOtif >= 0}
            melhorou={diffOtif >= 0}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <DiffCard
            label="OFR"
            subtitulo="dias até o CT-e"
            valorTexto={`${fmtDias(periodoB.ofr_dias)} (${diffOfr >= 0 ? "+" : ""}${diffOfr.toFixed(1)}d)`}
            subiu={diffOfr >= 0}
            melhorou={diffOfr <= 0}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <DiffCard
            label="OCT"
            subtitulo="dias até a entrega"
            valorTexto={`${fmtDias(periodoB.oct_dias)} (${diffOct >= 0 ? "+" : ""}${diffOct.toFixed(1)}d)`}
            subiu={diffOct >= 0}
            melhorou={diffOct <= 0}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
