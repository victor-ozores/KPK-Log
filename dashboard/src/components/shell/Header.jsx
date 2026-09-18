import { SECOES } from "./Sidebar";
import { RiGithubLine, RiTimeLine, RiArrowRightSLine } from "@remixicon/react";
import { fmtNum } from "../../utils/format";

const OPCOES_ANO = [
  { id: "todos", label: "Todos" },
  { id: "2019", label: "2019" },
  { id: "2020", label: "2020" },
];

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Formato brasileiro por extenso (dia + mês abreviado + ano) — evita a
// ambiguidade de formatos numéricos como dd/mm/aaaa vs. mm/dd/aaaa.
function formatarDataGeracao(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MESES_ABREV[d.getMonth()]} ${d.getFullYear()}`;
}

// Período coberto pelo dataset, derivado da série mensal (fonte única de
// verdade) — se o pipeline exportar mais meses no futuro, o header
// acompanha sem precisar editar este arquivo.
function formatarPeriodo(serieMensal) {
  if (!serieMensal?.length) return "—";
  const [anoIni, mesIni] = serieMensal[0].AnoMes.split("-");
  const [anoFim, mesFim] = serieMensal[serieMensal.length - 1].AnoMes.split("-");
  const rotulo = (ano, mes) => `${MESES_ABREV[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
  return `${rotulo(anoIni, mesIni)} – ${rotulo(anoFim, mesFim)}`;
}

export default function Header({ secaoAtiva, onSelecionar, ano, onMudarAno, geradoEm, serieMensal, totalPedidos }) {
  const secao = SECOES.find((s) => s.id === secaoAtiva);
  const dataGeracao = formatarDataGeracao(geradoEm);
  const periodo = formatarPeriodo(serieMensal);

  return (
    <header className="sticky top-0 z-10 bg-gray-950/85 backdrop-blur border-b border-dark-tremor-border">
      <div className="flex items-start justify-between gap-4 px-4 md:px-6 py-3.5">
        <div className="min-w-0">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
            <span>Dashboard</span>
            <RiArrowRightSLine className="h-3 w-3 opacity-70" />
            <span className="text-gray-300 font-medium">{secao?.label}</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-gray-50 truncate">{secao?.label}</h1>
          {secao?.descricao && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{secao.descricao}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-2.5 text-[11px] text-slate-400 mr-1 whitespace-nowrap">
            {dataGeracao && (
              <span className="flex items-center gap-1">
                <RiTimeLine className="h-3.5 w-3.5" />
                Atualizado {dataGeracao}
              </span>
            )}
            <span className="h-3 w-px bg-dark-tremor-border" aria-hidden="true" />
            <span>
              Período <span className="text-gray-300 font-medium">{periodo}</span>
            </span>
            <span className="h-3 w-px bg-dark-tremor-border" aria-hidden="true" />
            <span>
              <span className="text-gray-300 font-medium">{fmtNum(totalPedidos)}</span> pedidos
            </span>
          </div>
          <a
            href="https://github.com/victor-ozores/KPK-Log"
            target="_blank"
            rel="noreferrer"
            title="Ver código no GitHub"
            className="hidden sm:flex items-center justify-center h-8 w-8 rounded-tremor-small border border-dark-tremor-border text-gray-400 hover:text-gray-100 hover:border-gray-600 transition-colors"
          >
            <RiGithubLine className="h-4 w-4" />
          </a>
          <div
            className="flex items-center rounded-tremor-full border border-dark-tremor-border p-0.5 bg-dark-tremor-background-subtle"
            title="Filtrar por ano"
          >
            {OPCOES_ANO.map((op) => (
              <button
                key={op.id}
                onClick={() => onMudarAno(op.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-tremor-full transition-colors ${
                  ano === op.id ? "bg-blue-500 text-white shadow-tremor-input" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <nav className="md:hidden flex gap-1 overflow-x-auto px-3 pb-2 scroll-panel">
        {SECOES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onSelecionar(id)}
            className={`shrink-0 rounded-tremor-full px-3 py-1.5 text-xs font-medium ${
              secaoAtiva === id ? "bg-blue-600 text-white" : "bg-dark-tremor-background-subtle text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
