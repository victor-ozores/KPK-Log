import ReactECharts from "echarts-for-react";
import { CORES, ECHARTS_TOOLTIP, ECHARTS_EIXO, ECHARTS_GRADE, ECHARTS_ANIMACAO } from "../../theme";

// Dumbbell (haltere): "antes -> depois por item" é o job certo pra comparar
// 2 períodos em poucas categorias (método de dataviz) — substitui a barra
// agrupada aqui, que fazia a mesma leitura só que com o dobro de tinta.
// Implementado com barra empilhada invisível (só pra abrir espaço até o
// menor valor) + barra fina conectando os pontos + 2 séries de scatter
// (os "halteres"), em vez de canvas customizado — mesmo resultado visual,
// só com APIs padrão do ECharts.
export default function DumbbellChart({
  categorias, // [{ nome, a, b }]
  rotuloA,
  rotuloB,
  corA = CORES.neutro,
  corB = CORES.destaque,
  formatoValor = (v) => v,
  altura = 260,
}) {
  const nomes = categorias.map((c) => c.nome);
  const minimos = categorias.map((c) => Math.min(c.a, c.b));
  const faixas = categorias.map((c) => Math.abs(c.b - c.a));

  const option = {
    ...ECHARTS_ANIMACAO,
    grid: { left: 96, right: 56, top: 40, bottom: 24 },
    legend: {
      data: [rotuloA, rotuloB],
      top: 0,
      left: 0,
      textStyle: { color: CORES.textoSecundario, fontSize: 12 },
      itemWidth: 10,
      itemHeight: 10,
      icon: "circle",
    },
    tooltip: {
      trigger: "item",
      ...ECHARTS_TOOLTIP,
      formatter: (params) => {
        if (!Array.isArray(params.value)) return "";
        return `${nomes[params.value[1]]}<br/>${params.seriesName}: <b>${formatoValor(params.value[0])}</b>`;
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      axisLabel: { ...ECHARTS_EIXO.axisLabel, formatter: (v) => formatoValor(v) },
      splitLine: ECHARTS_GRADE,
    },
    yAxis: {
      type: "category",
      data: nomes,
      axisLine: ECHARTS_EIXO.axisLine,
      axisTick: { show: false },
      axisLabel: { color: CORES.eixo, fontSize: 12 },
    },
    series: [
      {
        name: "_base",
        type: "bar",
        stack: "faixa",
        data: minimos,
        barWidth: 3,
        itemStyle: { color: "transparent" },
        silent: true,
        tooltip: { show: false },
        z: 1,
      },
      {
        name: "_faixa",
        type: "bar",
        stack: "faixa",
        data: faixas,
        barWidth: 3,
        itemStyle: { color: CORES.neutroForte, opacity: 0.55 },
        silent: true,
        tooltip: { show: false },
        z: 1,
      },
      {
        // Rótulo direto em cada bolinha: sem isso, o valor só aparecia no
        // tooltip (passar o mouse) — o gráfico "não dizia nada" sozinho.
        // Posição "top"/"bottom" (em vez dos dois do mesmo lado) evita que os
        // dois números se sobreponham quando as bolinhas ficam bem próximas
        // (ex.: % On Time e % OTIF mudam pouco de um período pro outro).
        name: rotuloA,
        type: "scatter",
        data: categorias.map((c, i) => [c.a, i]),
        symbolSize: 15,
        itemStyle: { color: corA, borderColor: CORES.tooltipBg, borderWidth: 2 },
        label: {
          show: true,
          position: "top",
          formatter: (p) => formatoValor(p.value[0]),
          color: CORES.textoSecundario,
          fontSize: 11,
          fontWeight: 500,
        },
        z: 2,
      },
      {
        name: rotuloB,
        type: "scatter",
        data: categorias.map((c, i) => [c.b, i]),
        symbolSize: 15,
        itemStyle: { color: corB, borderColor: CORES.tooltipBg, borderWidth: 2 },
        label: {
          show: true,
          position: "bottom",
          formatter: (p) => formatoValor(p.value[0]),
          color: corB,
          fontSize: 11,
          fontWeight: 600,
        },
        z: 3,
      },
    ],
  };

  return (
    <div style={{ height: altura }}>
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
    </div>
  );
}
