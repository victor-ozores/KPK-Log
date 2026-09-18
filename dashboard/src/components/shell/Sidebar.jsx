import {
  RiDashboardLine,
  RiBarChartGroupedLine,
  RiLineChartLine,
  RiTeamLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import logoMark from "../../assets/logo-mark.png";

export const SECOES = [
  {
    id: "visao-geral",
    label: "Visão Geral",
    descricao: "Indicadores consolidados do período",
    Icon: RiDashboardLine,
  },
  {
    id: "comparacao",
    label: "Comparação de Períodos",
    descricao: "1º semestre 2019 vs. 1º semestre 2020",
    Icon: RiBarChartGroupedLine,
  },
  {
    id: "padrao-diario",
    label: "Padrão Diário",
    descricao: "Volume de entregas e sazonalidade semanal",
    Icon: RiLineChartLine,
  },
  {
    id: "clientes-representantes",
    label: "Clientes e Representantes",
    descricao: "Rankings, influenciadores e drill-down",
    Icon: RiTeamLine,
  },
];

export default function Sidebar({ secaoAtiva, onSelecionar }) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-dark-tremor-border bg-dark-tremor-background">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-dark-tremor-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tremor-small bg-white p-1.5 shadow-dark-tremor-card">
          <img src={logoMark} alt="KPK Log" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-bold tracking-tight text-gray-50 truncate">KPK Log</p>
          <p className="text-[11px] text-slate-400 truncate">Painel de OTIF</p>
        </div>
      </div>

      <p className="px-4 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-600">
        Análise
      </p>
      <nav className="flex-1 px-2.5 space-y-0.5">
        {SECOES.map(({ id, label, Icon }) => {
          const ativa = secaoAtiva === id;
          return (
            <button
              key={id}
              onClick={() => onSelecionar(id)}
              className={`w-full flex items-center gap-2.5 rounded-r-tremor-small border-l-2 pl-2.5 pr-2.5 py-2 text-[13.5px] font-medium transition-colors text-left ${
                ativa
                  ? "border-blue-500 bg-blue-500/10 text-blue-200"
                  : "border-transparent text-gray-400 hover:bg-dark-tremor-background-subtle hover:text-gray-100"
              }`}
            >
              <Icon className="h-[17px] w-[17px] shrink-0 opacity-90" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-3 border-t border-dark-tremor-border">
        <div className="flex items-start gap-1.5 px-0.5 pt-2.5">
          <RiShieldCheckLine className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
          <p className="text-[10.5px] leading-snug text-slate-400">
            Dados anonimizados e agregados conforme LGPD (art. 12).
          </p>
        </div>
      </div>
    </aside>
  );
}
