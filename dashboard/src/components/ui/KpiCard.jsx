import { Card, Text, Metric, Badge } from "@tremor/react";
import InfoTooltip from "./InfoTooltip";
import { useContagemAnimada } from "../../utils/motion";

// O chip de ícone usa SEMPRE o mesmo fundo neutro (slate translúcido) e só o
// glifo muda de cor — testado com o validador de contraste (WCAG): um chip
// colorido por categoria (ex. fundo âmbar/vermelho bem escuro) ficava com
// baixíssima distinção contra o card e, em tons quentes, "sujava" pra um
// marrom sem contraste nenhum. Glifo colorido + chip neutro dá identidade
// visual igual em todos os cards e mantém >=5:1 de contraste em qualquer cor.
const ICON_COR = {
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  gray: "text-slate-300",
};

// Mapeia a cor semântica do ícone para o nome de cor do Tremor usado na
// faixa lateral (decoration) do Card — a mesma cor conta a história duas
// vezes (ícone + faixa) em vez de precisar decorar o card por fora.
const DECORATION_TREMOR = {
  blue: "blue",
  emerald: "emerald",
  amber: "amber",
  red: "red",
  gray: "gray",
};

// Estrutura fixa (ícone+rótulo -> subtítulo -> valor -> badge) com alturas
// reservadas para cada linha, garantindo que todo card da grade de KPIs
// alinhe na mesma posição vertical, tenha ou não ícone/badge/subtítulo
// específico.
//
// value numérico conta subindo até o valor final (formatador decide como
// exibir cada frame — ex. fmtNum, fmtDias); value string (legado) exibe
// direto, sem animação.
export default function KpiCard({
  label,
  subtitulo,
  value,
  formatador,
  info,
  badgeColor,
  badgeText,
  Icon,
  iconColor = "blue",
}) {
  const numerico = typeof value === "number";
  const valorAnimado = useContagemAnimada(numerico ? value : 0);
  const exibido = numerico ? (formatador ? formatador(valorAnimado) : Math.round(valorAnimado)) : value;

  return (
    <Card
      decoration={Icon ? "left" : ""}
      decorationColor={Icon ? DECORATION_TREMOR[iconColor] ?? "blue" : undefined}
      className="group !p-4 h-full flex flex-col border border-transparent transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gray-600 hover:shadow-2xl hover:shadow-black/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Text className="!text-gray-400 truncate">{label}</Text>
          {info && <InfoTooltip text={info} />}
        </div>
        {Icon && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-tremor-small bg-slate-400/[0.14]
              transition-transform duration-300 ease-out group-hover:scale-110 ${ICON_COR[iconColor] ?? ICON_COR.blue}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mt-0.5 mb-2 h-4 leading-tight">{subtitulo}</p>
      <Metric className="!text-gray-50">{exibido}</Metric>
      <div className="mt-2 h-5">
        {badgeColor && (
          <Badge color={badgeColor} size="xs">
            {badgeText}
          </Badge>
        )}
      </div>
    </Card>
  );
}
