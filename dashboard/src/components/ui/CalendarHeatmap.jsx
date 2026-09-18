import ReactECharts from "echarts-for-react";
import { CORES, ECHARTS_TOOLTIP, ECHARTS_ANIMACAO, rampaMagnitude } from "../../theme";
import { fmtNum } from "../../utils/format";

// Calendário-heatmap (estilo "contribuições" do GitHub) — visualiza o padrão
// dia-da-semana espacialmente: a coluna de domingo aparece visivelmente mais
// fraca em toda semana, tornando o "dente de serra" (hoje só descrito no
// InsightBanner) algo que o olho vê direto, sem precisar ler o texto.
export default function CalendarHeatmap({ dados, dataInicio, dataFim, altura = 190 }) {
  const valores = dados.map((d) => d.entregas);
  const max = Math.max(...valores, 1);

  const option = {
    ...ECHARTS_ANIMACAO,
    tooltip: {
      ...ECHARTS_TOOLTIP,
      formatter: (p) => `${p.data[0]}<br/>${fmtNum(p.data[1])} entregas`,
    },
    visualMap: {
      min: 0,
      max,
      show: false,
      inRange: { color: rampaMagnitude(CORES.destaque) },
    },
    calendar: {
      top: 24,
      left: 34,
      right: 8,
      bottom: 4,
      cellSize: ["auto", 15],
      range: [dataInicio, dataFim],
      itemStyle: { borderWidth: 3, borderColor: "transparent", color: "rgba(255,255,255,0.025)" },
      splitLine: { show: false },
      yearLabel: { show: false },
      monthLabel: { color: CORES.eixo, fontSize: 10 },
      dayLabel: {
        color: CORES.eixo,
        fontSize: 10,
        nameMap: ["D", "S", "T", "Q", "Q", "S", "S"],
        firstDay: 0,
      },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: dados.map((d) => [d.data, d.entregas]),
      },
    ],
  };

  return (
    // Em telas estreitas, 20 meses de colunas não cabem sem esmagar rótulo e
    // célula (rótulos de mês colidiam entre si em ~390px). min-width força o
    // gráfico a manter uma largura legível e o overflow-x-auto vira scroll
    // horizontal nesse caso — em telas largas o cartão já é mais largo que o
    // mínimo, então isso não muda nada (cellSize "auto" continua preenchendo
    // 100% do espaço disponível).
    <div className="overflow-x-auto">
      <div style={{ height: altura, minWidth: 760 }}>
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
      </div>
    </div>
  );
}
