// Dashboard usa um único tema (escuro) — sem alternância, sem paleta duplicada.
// Toda cor usada em gráficos/UI deve vir daqui, para manter consistência.

export const CORES = {
  // Marca / destaque
  destaque: "#3b82f6", // blue-500 — usado para o período/série "atual" (2020, B) e ações primárias
  neutro: "#94a3b8", // slate-400 — usado para o período/série "anterior" (2019, A), nunca sozinho sem legenda
  neutroForte: "#64748b", // slate-500 — variante mais escura de "neutro", para séries secundárias em gráficos com 3+ linhas

  // Realce do Tooltip ao passar o mouse (prop "cursor" do Recharts).
  // O padrão do Recharts é um cinza quase sólido — "pisca" como um flash
  // branco sobre cards escuros. Usado como fill em gráficos de barra.
  hover: "rgba(255, 255, 255, 0.06)",

  // Semânticas de status — sempre acompanhadas de ícone/seta/badge na UI, nunca só cor
  bom: "#10b981", // emerald-500 — OTIF >= 95%
  atencao: "#f59e0b", // amber-500 — OTIF 85–95%
  ruim: "#ef4444", // red-500 — OTIF < 85%

  // Superfícies e texto (tokens do tema escuro, usados fora dos componentes Tremor)
  texto: "#f9fafb",
  textoSecundario: "#9ca3af",
  textoMuted: "#6b7280",

  // Elementos de gráfico (Recharts não lê o tema escuro do Tailwind sozinho)
  grade: "rgba(255,255,255,0.08)",
  eixo: "#9ca3af",
  tooltipBg: "#1f2937",
  tooltipBorda: "#374151",
};

export const TOOLTIP_ESTILO = {
  backgroundColor: CORES.tooltipBg,
  border: `1px solid ${CORES.tooltipBorda}`,
  borderRadius: 8,
  fontSize: 12,
  color: CORES.texto,
};

// Nomes de cor do Tremor (usados em <Badge color="...">, <BadgeDelta>, etc.)
export function statusOtifTremor(pctOtif) {
  if (pctOtif >= 0.95) return "emerald";
  if (pctOtif >= 0.85) return "amber";
  return "red";
}

export function statusOtifHex(pctOtif) {
  if (pctOtif >= 0.95) return CORES.bom;
  if (pctOtif >= 0.85) return CORES.atencao;
  return CORES.ruim;
}

// --- ECharts: helpers de gradiente/tema compartilhados entre os gráficos ---
// (Recharts lia CORES direto; ECharts precisa de objetos de gradiente e de um
// bloco de estilo de eixo/tooltip próprios — mas a fonte da cor continua
// sendo sempre CORES, nunca um hex solto dentro do componente do gráfico.)

function hexParaRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Preenchimento de área (linha/área) — mesma lógica do "wash" de 10-35% de
// opacidade no topo, esvaindo pra quase 0 na base, nunca um bloco saturado.
export function gradienteArea(cor, opacidadeTopo = 0.32) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: hexParaRgba(cor, opacidadeTopo) },
      { offset: 1, color: hexParaRgba(cor, 0.02) },
    ],
  };
}

// Preenchimento de barra vertical (topo mais claro/vivo, base na cor sólida)
// — dá profundidade sem sair da cor semântica do dado.
export function gradienteBarra(cor) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: hexParaRgba(cor, 0.95) },
      { offset: 1, color: hexParaRgba(cor, 0.65) },
    ],
  };
}

// Preenchimento de barra HORIZONTAL (esquerda -> direita), usado nos
// rankings — mesma ideia do gradienteBarra, só o eixo do degradê que muda.
export function gradienteBarraH(cor) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 1,
    y2: 0,
    colorStops: [
      { offset: 0, color: hexParaRgba(cor, 0.55) },
      { offset: 1, color: hexParaRgba(cor, 0.95) },
    ],
  };
}

// Trilha (track) de um Meter/gauge: mesmo matiz do preenchimento, em opacidade
// baixa — "um degrau mais claro da mesma rampa", como pede o método de dataviz,
// adaptado pro fundo escuro (aqui "mais claro" = menos tinta, não mais luminância).
export function trilhaMeter(corSeveridade) {
  return hexParaRgba(corSeveridade, 0.14);
}

// Rampa sequencial de 1 matiz só (magnitude: heatmap/calendário) — do quase
// invisível (fundo) até a cor cheia, nunca duas cores diferentes (isso vira
// "arco-íris", um dos anti-padrões do método).
export function rampaMagnitude(cor) {
  return [hexParaRgba(cor, 0.07), cor];
}

export const ECHARTS_TOOLTIP = {
  backgroundColor: CORES.tooltipBg,
  borderColor: CORES.tooltipBorda,
  borderWidth: 1,
  borderRadius: 8,
  textStyle: { color: CORES.texto, fontSize: 12 },
  padding: [8, 12],
};

export const ECHARTS_EIXO = {
  axisLine: { lineStyle: { color: CORES.grade } },
  axisLabel: { color: CORES.eixo, fontSize: 11 },
  axisTick: { show: false },
};

export const ECHARTS_GRADE = {
  lineStyle: { color: CORES.grade, type: "solid" },
};

export const ECHARTS_ANIMACAO = {
  animationDuration: 700,
  animationEasing: "cubicOut",
};
