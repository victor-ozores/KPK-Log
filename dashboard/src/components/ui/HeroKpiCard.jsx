import { Badge } from "@tremor/react";
import InfoTooltip from "./InfoTooltip";

// Card de destaque para a métrica north-star (OTIF): mesma largura dos KpiCards
// vizinhos, mas com tipografia maior e borda colorida por status, para que o
// olho pouse nela primeiro (regra dos 5 segundos).
export default function HeroKpiCard({ label, subtitulo, value, info, corDestaque, badgeColor, badgeText }) {
  return (
    <div
      className="h-full flex flex-col rounded-tremor-default border border-dark-tremor-border bg-dark-tremor-background p-5 border-l-4 shadow-dark-tremor-card"
      style={{ borderLeftColor: corDestaque }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-tremor-default font-medium text-gray-400">{label}</span>
        {info && <InfoTooltip text={info} />}
      </div>
      <p className="text-[11px] text-slate-400 mt-0.5 mb-2 h-4 leading-tight">{subtitulo}</p>
      <p className="text-5xl font-bold tracking-tight text-gray-50">{value}</p>
      <div className="mt-3 h-5">
        {badgeColor && (
          <Badge color={badgeColor} size="sm">
            {badgeText}
          </Badge>
        )}
      </div>
    </div>
  );
}
