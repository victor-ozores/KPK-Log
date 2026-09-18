export const fmtNum = (v) => (v ?? 0).toLocaleString("pt-BR");

export const fmtPct = (v, casas = 1) => `${((v ?? 0) * 100).toFixed(casas)}%`;

export const fmtDias = (v) => `${(v ?? 0).toFixed(1)} dias`;
