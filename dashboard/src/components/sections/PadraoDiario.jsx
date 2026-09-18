import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, Grid, Text, Title } from "@tremor/react";
import ReactECharts from "echarts-for-react";
import { RiTruckLine, RiBarChart2Line, RiFlashlightLine } from "@remixicon/react";
import KpiCard from "../ui/KpiCard";
import InsightBanner from "../ui/InsightBanner";
import CalendarHeatmap from "../ui/CalendarHeatmap";
import { fmtNum } from "../../utils/format";
import { CORES, ECHARTS_TOOLTIP, ECHARTS_EIXO, ECHARTS_GRADE, ECHARTS_ANIMACAO, gradienteArea } from "../../theme";
import { staggerContainer, fadeInUp } from "../../utils/motion";

const NOMES_DIA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const ROTULO_UNIDADE = { dia: "dia", semana: "semana", mes: "mês" };
const ROTULO_MEDIA = { dia: "Diária", semana: "Semanal", mes: "Mensal" };
const ROTULO_JANELA = { dia: "média móvel de 7 dias", semana: "média móvel de 4 semanas", mes: "média móvel de 3 meses" };
const ROTULO_PERIODO = { dia: "Data", semana: "Semana", mes: "Mês" };

// Mesma cor de CORES.destaque, só bem mais clara — replica a rampa de cor
// do heatmap (theme.js rampaMagnitude) como um degradê CSS para a legenda.
const LEGENDA_CALOR_INICIO = "rgba(59, 130, 246, 0.08)";

function filtrarPorAno(serieDiaria, ano) {
  if (ano === "todos") return serieDiaria;
  return serieDiaria.filter((l) => l.data.startsWith(ano));
}

function formatarDataLonga(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Segunda-feira da semana ISO a que a data pertence — usada como chave de
// agrupamento ao ver o gráfico em "Semana".
function inicioDaSemana(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const diaSemana = d.getDay();
  const offset = diaSemana === 0 ? 6 : diaSemana - 1;
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

// Reagrupa a série diária (única fonte de verdade) por semana ou mês,
// recalculando a média móvel na nova unidade — nenhum outro corte do
// dashboard_data.json é usado, para não haver dois números diferentes para
// a mesma métrica em granularidades diferentes.
function agregarPorGranularidade(dadosDiarios, granularidade) {
  if (granularidade === "dia") {
    return dadosDiarios.map((d) => ({ ...d, media_movel: d.media_movel_7d }));
  }
  const chaveFn = granularidade === "semana" ? inicioDaSemana : (iso) => iso.slice(0, 7);
  const janela = granularidade === "semana" ? 4 : 3;

  const buckets = new Map();
  dadosDiarios.forEach((d) => {
    const chave = chaveFn(d.data);
    buckets.set(chave, (buckets.get(chave) ?? 0) + d.entregas);
  });
  const linhas = Array.from(buckets.entries())
    .map(([data, entregas]) => ({ data, entregas }))
    .sort((a, b) => a.data.localeCompare(b.data));

  return linhas.map((l, i) => {
    const fatia = linhas.slice(Math.max(0, i - janela + 1), i + 1);
    const media = fatia.reduce((s, x) => s + x.entregas, 0) / fatia.length;
    return { ...l, media_movel: Math.round(media * 100) / 100 };
  });
}

function formatarEixoX(iso, granularidade) {
  const [ano, mes, dia] = iso.split("-");
  if (granularidade === "semana") return `${dia}/${MESES_ABREV[parseInt(mes, 10) - 1]}`;
  return `${MESES_ABREV[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

function formatarRotulo(iso, granularidade) {
  if (granularidade === "mes") {
    const [ano, mes] = iso.split("-");
    return `${MESES_LONGOS[parseInt(mes, 10) - 1]}/${ano}`;
  }
  return formatarDataLonga(iso);
}

function calcularEstatisticas(dados) {
  const total = dados.reduce((s, d) => s + d.entregas, 0);
  const media = total / dados.length;
  const pico = dados.reduce((max, d) => (d.entregas > max.entregas ? d : max), dados[0]);
  return { total, media, pico };
}

function calcularPadraoSemanal(dadosDiarios) {
  const soma = Array(7).fill(0);
  const contagem = Array(7).fill(0);
  dadosDiarios.forEach((d) => {
    const dia = new Date(`${d.data}T00:00:00`).getDay();
    soma[dia] += d.entregas;
    contagem[dia] += 1;
  });
  const medias = soma.map((s, i) => (contagem[i] ? s / contagem[i] : 0));
  let maxI = 0;
  let minI = medias.findIndex((_, i) => contagem[i] > 0);
  medias.forEach((m, i) => {
    if (contagem[i] === 0) return;
    if (m > medias[maxI]) maxI = i;
    if (m < medias[minI]) minI = i;
  });
  return { medias, maxI, minI };
}

// Na visão diária, explica o "dente de serra" pelo ciclo semanal de operação
// (pergunta literal do case). Nas visões agregadas o dente de serra some por
// construção, então o insight passa a descrever a tendência real que ele
// escondia — comparando a 1ª com a 2ª metade do período selecionado.
function gerarInsightDiario(dadosDiarios) {
  const { medias, maxI, minI } = calcularPadraoSemanal(dadosDiarios);
  const diffPct = ((medias[maxI] - medias[minI]) / medias[maxI]) * 100;
  return `Entregas de ${NOMES_DIA[minI]} são, em média, ${diffPct.toFixed(
    0
  )}% menores que as de ${NOMES_DIA[maxI]} — esse ciclo semanal de operação é o que gera o padrão "dente de serra" da visão diária, não uma instabilidade no processo. O calendário abaixo mostra esse ciclo se repetindo semana a semana.`;
}

function gerarInsightAgregado(dados, granularidade) {
  const meio = Math.floor(dados.length / 2);
  const primeira = dados.slice(0, meio);
  const segunda = dados.slice(meio);
  const mediaPrimeira = primeira.reduce((s, d) => s + d.entregas, 0) / (primeira.length || 1);
  const mediaSegunda = segunda.reduce((s, d) => s + d.entregas, 0) / (segunda.length || 1);
  const variacao = mediaPrimeira ? ((mediaSegunda - mediaPrimeira) / mediaPrimeira) * 100 : 0;
  const direcao = variacao >= 0 ? "cresceu" : "caiu";
  return `Nesta visão por ${ROTULO_UNIDADE[granularidade]}, o padrão "dente de serra" diário desaparece — o volume médio ${direcao} ${Math.abs(
    variacao
  ).toFixed(0)}% da primeira para a segunda metade do período selecionado.`;
}

function ToggleGranularidade({ valor, onMudar }) {
  const OPCOES = [
    { id: "dia", label: "Dia" },
    { id: "semana", label: "Semana" },
    { id: "mes", label: "Mês" },
  ];
  return (
    <div className="flex items-center rounded-tremor-full border border-dark-tremor-border p-0.5 bg-dark-tremor-background-subtle w-fit shrink-0">
      {OPCOES.map((op) => (
        <button
          key={op.id}
          onClick={() => onMudar(op.id)}
          className={`px-3 py-1 text-xs font-medium rounded-tremor-full transition-colors ${
            valor === op.id ? "bg-blue-500 text-white shadow-tremor-input" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}

export default function PadraoDiario({ serieDiaria, ano }) {
  const [granularidade, setGranularidade] = useState("dia");

  const dadosDiarios = useMemo(() => filtrarPorAno(serieDiaria, ano), [serieDiaria, ano]);
  const dados = useMemo(
    () => agregarPorGranularidade(dadosDiarios, granularidade),
    [dadosDiarios, granularidade]
  );
  const { total, media, pico } = calcularEstatisticas(dados);

  const optionArea = {
    ...ECHARTS_ANIMACAO,
    grid: { left: 44, right: 12, top: 12, bottom: 28 },
    tooltip: {
      trigger: "axis",
      ...ECHARTS_TOOLTIP,
      formatter: (params) => {
        const linha0 = params[0];
        const titulo = `${ROTULO_PERIODO[granularidade]}: ${formatarRotulo(linha0.axisValue, granularidade)}`;
        const corpo = params.map((p) => `${p.marker} ${p.seriesName}: <b>${fmtNum(Math.round(p.value))}</b>`).join("<br/>");
        return `${titulo}<br/>${corpo}`;
      },
    },
    xAxis: {
      type: "category",
      data: dados.map((d) => d.data),
      boundaryGap: false,
      ...ECHARTS_EIXO,
      axisLabel: { ...ECHARTS_EIXO.axisLabel, formatter: (v) => formatarEixoX(v, granularidade) },
    },
    yAxis: { type: "value", axisLabel: ECHARTS_EIXO.axisLabel, splitLine: ECHARTS_GRADE },
    series: [
      {
        name: `Entregas/${ROTULO_UNIDADE[granularidade]}`,
        type: "line",
        data: dados.map((d) => d.entregas),
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1, color: CORES.neutroForte },
        areaStyle: { color: gradienteArea(CORES.neutroForte, 0.22) },
        z: 1,
      },
      {
        name: ROTULO_JANELA[granularidade],
        type: "line",
        data: dados.map((d) => d.media_movel),
        showSymbol: false,
        smooth: 0.3,
        lineStyle: { width: 2.5, color: CORES.destaque },
        areaStyle: { color: gradienteArea(CORES.destaque, 0.28) },
        z: 2,
      },
    ],
  };

  const datasHeatmap = dadosDiarios.length
    ? [dadosDiarios[0].data, dadosDiarios[dadosDiarios.length - 1].data].sort()
    : null;

  return (
    <div className="space-y-4">
      <InsightBanner tipo="neutro">
        {granularidade === "dia" ? gerarInsightDiario(dadosDiarios) : gerarInsightAgregado(dados, granularidade)}
      </InsightBanner>

      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <Grid numItemsSm={3} className="gap-4 items-stretch">
          <motion.div variants={fadeInUp}>
            <KpiCard
              label="Total de Entregas"
              subtitulo="no período selecionado"
              value={total}
              formatador={(v) => fmtNum(Math.round(v))}
              Icon={RiTruckLine}
              iconColor="blue"
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <KpiCard
              label={`Média ${ROTULO_MEDIA[granularidade]}`}
              subtitulo={`entregas por ${ROTULO_UNIDADE[granularidade]}`}
              value={media}
              formatador={(v) => fmtNum(Math.round(v))}
              Icon={RiBarChart2Line}
              iconColor="gray"
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <KpiCard
              label="Pico de Entregas"
              subtitulo={`maior volume em 1 ${ROTULO_UNIDADE[granularidade]}`}
              value={pico.entregas}
              formatador={(v) => fmtNum(Math.round(v))}
              badgeColor="blue"
              badgeText={formatarRotulo(pico.data, granularidade)}
              Icon={RiFlashlightLine}
              iconColor="amber"
            />
          </motion.div>
        </Grid>
      </motion.div>

      <Card className="transition-all duration-200 hover:border-gray-700">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <Text className="max-w-2xl">
            Volume de entregas por {ROTULO_UNIDADE[granularidade]} (área cinza) e tendência suavizada —{" "}
            {ROTULO_JANELA[granularidade]} (linha azul).
          </Text>
          <ToggleGranularidade valor={granularidade} onMudar={setGranularidade} />
        </div>
        <div style={{ height: 320 }} className="mt-3">
          <ReactECharts option={optionArea} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
        </div>
      </Card>

      {/* Calendário-heatmap só faz sentido na granularidade diária (célula =
          1 dia) — por isso não tem o mesmo toggle Dia/Semana/Mês do gráfico
          acima; o texto abaixo explica isso na própria tela, em vez de deixar
          o usuário se perguntar por que falta o controle. Ele torna o ciclo
          semanal do insight acima visível espacialmente — a coluna de
          domingo aparece visivelmente mais fraca em toda semana. */}
      {granularidade === "dia" && datasHeatmap && (
        <Card className="transition-all duration-200 hover:border-gray-700">
          <Title className="!text-gray-50">Calendário de entregas</Title>
          <Text className="mt-1">
            Cada quadrado é um dia. Andando para a direita o tempo passa; de cima para baixo é o dia da semana
            (domingo a sábado). Quanto mais escuro o azul, mais entregas naquele dia.
          </Text>
          <div className="flex items-center gap-2 mt-2.5 mb-1">
            <span className="text-[11px] text-slate-400">Menos entregas</span>
            <span
              className="h-2.5 w-20 rounded-full"
              style={{ background: `linear-gradient(to right, ${LEGENDA_CALOR_INICIO}, ${CORES.destaque})` }}
            />
            <span className="text-[11px] text-slate-400">Mais entregas</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-1 sm:hidden">Arraste para o lado para ver o período completo</p>
          <CalendarHeatmap dados={dadosDiarios} dataInicio={datasHeatmap[0]} dataFim={datasHeatmap[1]} />
          <p className="text-[11px] text-slate-400 mt-2.5">
            Este calendário fica sempre por dia — trocar para semana ou mês faria o ciclo semanal, que é o que ele
            existe para mostrar, desaparecer.
          </p>
        </Card>
      )}
    </div>
  );
}
