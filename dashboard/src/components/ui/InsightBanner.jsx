import { RiLightbulbFlashLine, RiAlertLine, RiCheckboxCircleLine } from "@remixicon/react";

// tipo controla cor + ícone do banner, alinhado às cores semânticas de theme.js
// (bom/atencao/ruim) em vez de usar sempre a mesma cor neutra independente do
// conteúdo do insight.
const ESTILOS = {
  neutro: {
    Icon: RiLightbulbFlashLine,
    borda: "border-blue-900/60",
    fundo: "bg-blue-500/10",
    icone: "text-blue-400",
    texto: "text-blue-100",
  },
  bom: {
    Icon: RiCheckboxCircleLine,
    borda: "border-emerald-900/60",
    fundo: "bg-emerald-500/10",
    icone: "text-emerald-400",
    texto: "text-emerald-100",
  },
  atencao: {
    Icon: RiAlertLine,
    borda: "border-amber-900/60",
    fundo: "bg-amber-500/10",
    icone: "text-amber-400",
    texto: "text-amber-100",
  },
  ruim: {
    Icon: RiAlertLine,
    borda: "border-red-900/60",
    fundo: "bg-red-500/10",
    icone: "text-red-400",
    texto: "text-red-100",
  },
};

export default function InsightBanner({ children, tipo = "neutro" }) {
  const estilo = ESTILOS[tipo] ?? ESTILOS.neutro;
  const { Icon } = estilo;
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border ${estilo.borda} ${estilo.fundo} px-4 py-3`}>
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${estilo.icone}`} />
      <p className={`text-sm leading-snug ${estilo.texto}`}>{children}</p>
    </div>
  );
}
