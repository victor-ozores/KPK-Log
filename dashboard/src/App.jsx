import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardData } from "./hooks/useDashboardData";
import Sidebar from "./components/shell/Sidebar";
import Header from "./components/shell/Header";
import VisaoGeral from "./components/sections/VisaoGeral";
import ComparacaoPeriodos from "./components/sections/ComparacaoPeriodos";
import PadraoDiario from "./components/sections/PadraoDiario";
import ClientesRepresentantes from "./components/sections/ClientesRepresentantes";

function montarCorteTodos(data) {
  return {
    resumo: data.resumo_geral,
    ranking_representante_atraso: data.ranking_representante_atraso,
    ranking_cliente_atraso: data.ranking_cliente_atraso,
    top_representantes_on_time: data.top_representantes_on_time,
    influenciadores_on_time: data.influenciadores_on_time,
    hierarquia_drilldown: data.hierarquia_drilldown,
  };
}

export default function App() {
  const { data, error } = useDashboardData();
  const [secaoAtiva, setSecaoAtiva] = useState("visao-geral");
  const [ano, setAno] = useState("todos");

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-gray-950">
        Erro ao carregar dados: {error.message}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-gray-950">
        Carregando dashboard...
      </div>
    );
  }

  const corte = ano === "todos" ? montarCorteTodos(data) : data.por_ano[ano];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar secaoAtiva={secaoAtiva} onSelecionar={setSecaoAtiva} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          secaoAtiva={secaoAtiva}
          onSelecionar={setSecaoAtiva}
          ano={ano}
          onMudarAno={setAno}
          geradoEm={data.meta?.gerado_em}
          serieMensal={data.serie_mensal}
          totalPedidos={data.resumo_geral.realizados}
        />

        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={secaoAtiva}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {secaoAtiva === "visao-geral" && (
                <VisaoGeral resumo={corte.resumo} serieMensal={data.serie_mensal} ano={ano} />
              )}
              {secaoAtiva === "comparacao" && (
                <ComparacaoPeriodos
                  comparacaoSemestres={data.comparacao_semestres}
                  serieMensal={data.serie_mensal}
                  ano={ano}
                />
              )}
              {secaoAtiva === "padrao-diario" && (
                <PadraoDiario serieDiaria={data.serie_diaria_entregas} ano={ano} />
              )}
              {secaoAtiva === "clientes-representantes" && <ClientesRepresentantes corte={corte} ano={ano} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
