import ReactECharts from "echarts-for-react";
import { Badge } from "@tremor/react";
import { RiCheckLine } from "@remixicon/react";
import InfoTooltip from "./InfoTooltip";
import { trilhaMeter, ECHARTS_ANIMACAO } from "../../theme";
import { fmtPct } from "../../utils/format";
import { useContagemAnimada } from "../../utils/motion";

// Meter (gauge radial) substitui o KpiCard pra métricas que são uma RAZÃO
// única contra um limite (0-100%) — OTIF, On Time, In Full.
//
// v3: layout horizontal repensado depois de ver o resultado real na tela —
// um gauge pequeno (62-76px) "boiava" sozinho num card esticado à largura
// da coluna, deixando metade do card vazia, e a variante "hero" (OTIF maior
// que os outros dois) lia como inconsistência, não hierarquia. Correções:
// (1) os 3 gauges agora nascem do MESMO tamanho — a hierarquia do OTIF vem
// da cor/badge/faixa lateral, não do raio do arco; (2) o espaço à direita do
// texto virou uma barra de "distância até a meta" (95%, mesmo limiar de
// statusOtifHex) em vez de ficar em branco — informação real, não only
// enchimento visual.
// "16.5pp" quando tem casa decimal real, "5pp" quando é inteiro — evita
// "5.0pp" (falsa precisão) sem esconder a casa decimal quando ela importa.
function formatarGapPP(gap) {
  const arredondado = Math.round(gap * 10) / 10;
  return `${arredondado % 1 === 0 ? arredondado.toFixed(0) : arredondado.toFixed(1)}pp`;
}

export default function Meter({
  label,
  subtitulo,
  value, // fração 0-1
  formatador = fmtPct, // formata o número a cada frame da animação, ex. fmtPct
  info,
  corSeveridade,
  badgeColor,
  badgeText,
  Icon,
  meta = 0.95, // mesmo limiar de "bom" usado em statusOtifHex/statusOtifTremor
}) {
  const diametro = 92;
  const largura = 9;
  // Número central conta subindo até o valor final junto com o arco —
  // antes chegava pronto, sem transição, deixando o card "estático".
  const valorAnimado = useContagemAnimada(value ?? 0);
  const pctValor = Math.min(100, Math.max(0, Math.round((value ?? 0) * 1000) / 10));
  const pctMeta = Math.round(meta * 100);

  const option = {
    ...ECHARTS_ANIMACAO,
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: "100%",
        center: ["50%", "55%"],
        progress: { show: true, width: largura, roundCap: true, itemStyle: { color: corSeveridade } },
        axisLine: { lineStyle: { width: largura, color: [[1, trilhaMeter(corSeveridade)]] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: { show: false },
        data: [{ value: pctValor }],
      },
    ],
  };

  return (
    <div
      className="group h-full flex items-center gap-4 rounded-tremor-default border border-dark-tremor-border border-l-4 bg-dark-tremor-background px-4 py-4
        shadow-dark-tremor-card transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gray-600
        hover:shadow-2xl hover:shadow-black/40"
      style={{ borderLeftColor: corSeveridade }}
    >
      <div
        className="relative shrink-0 transition-transform duration-300 ease-out group-hover:scale-105"
        style={{ width: diametro, height: diametro }}
      >
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <span className="text-base font-bold text-gray-50">{formatador(valorAnimado)}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-slate-400/[0.14]"
              style={{ color: corSeveridade }}
            >
              <Icon className="h-3 w-3" />
            </span>
          )}
          <span className="text-tremor-default font-medium text-gray-300 truncate">{label}</span>
          {info && <InfoTooltip text={info} />}
        </div>
        <p className="text-[11px] text-slate-400 leading-tight truncate">{subtitulo}</p>

        {/* Barra "distância até a meta" — usa o espaço que antes ficava em
            branco pra mostrar algo real: onde o valor atual está frente ao
            limiar de "bom" (95%), com um traço marcando a meta. */}
        <div className="mt-1.5 max-w-xs">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>Meta {pctMeta}%</span>
            <span style={{ color: corSeveridade }} className="font-semibold">
              {pctValor}%
            </span>
          </div>
          <div className="relative h-[5px] rounded-full bg-slate-400/[0.16] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pctValor}%`, backgroundColor: corSeveridade }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-[2px] rounded-full bg-slate-200/80"
              style={{ left: `calc(${pctMeta}% - 1px)` }}
              title={`Meta: ${pctMeta}%`}
            />
          </div>
          {/* Resposta direta à pergunta que a barra sozinha deixava em aberto:
              bateu ou não bateu, e por quanto — em vez de fazer quem lê
              subtrair os dois números de cabeça. */}
          {pctValor >= pctMeta ? (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-400">
              <RiCheckLine className="h-3 w-3" /> Meta batida
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-slate-400">
              Faltam <span className="font-semibold text-gray-300">{formatarGapPP(pctMeta - pctValor)}</span> para a
              meta
            </p>
          )}
        </div>

        {/* Altura sempre reservada (tenha badge ou não) — evita que o card de
            OTIF (único com badge "Crítico"/"Atenção") desalinhe frente a
            On Time e In Full, que não passam badgeColor. */}
        <div className="h-5 flex items-center">
          {badgeColor && (
            <Badge color={badgeColor} size="xs">
              {badgeText}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
