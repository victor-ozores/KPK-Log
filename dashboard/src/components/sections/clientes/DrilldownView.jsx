import { useEffect, useState } from "react";
import { Card, Text } from "@tremor/react";
import { AnimatePresence, motion } from "framer-motion";
import { RiArrowLeftLine, RiArrowRightSLine } from "@remixicon/react";
import { fmtPct, fmtNum } from "../../../utils/format";
import { CORES } from "../../../theme";
import InsightBanner from "../../ui/InsightBanner";

// Cada nível do drill-down (equipes / representantes / clientes) é uma lista
// sem narrativa própria — sem isso, o usuário cai direto numa lista ordenada
// sem saber por onde começar. O insight aponta sempre o maior ponto de atraso
// do nível atual, guiando o próximo clique.
function gerarInsightDrilldown(hierarquia, equipe, representante) {
  if (equipe && representante) {
    const clientes = representante.clientes;
    if (!clientes.length) {
      return `${representante.representante} não tem clientes com atraso registrado neste recorte.`;
    }
    const top = [...clientes].sort((a, b) => b.atrasados - a.atrasados)[0];
    return `O cliente mais afetado de ${representante.representante} é ${top.cliente}, com ${fmtNum(
      top.atrasados
    )} pedidos atrasados (${fmtPct(top.pct_atraso)}) — o representante como um todo tem ${fmtPct(
      representante.pct_atraso
    )} de atraso.`;
  }
  if (equipe) {
    const reps = equipe.representantes;
    if (!reps.length) {
      return `A equipe "${equipe.equipe}" não tem representantes com atraso registrado neste recorte.`;
    }
    const top = [...reps].sort((a, b) => b.atrasados - a.atrasados)[0];
    return `Na equipe "${equipe.equipe}", ${top.representante} concentra o maior volume de atrasos (${fmtNum(
      top.atrasados
    )}, ${fmtPct(top.pct_atraso)}) — clique para ver os clientes afetados.`;
  }
  const topEquipe = [...hierarquia].sort((a, b) => b.atrasados - a.atrasados)[0];
  return `A equipe com mais atrasos é "${topEquipe.equipe}" (${fmtNum(topEquipe.atrasados)} pedidos, ${fmtPct(
    topEquipe.pct_atraso
  )}) — clique em uma equipe para explorar seus representantes e clientes.`;
}

function Nivel({ itens, campoNome, onClickItem, clicavel = true }) {
  const maxAtrasados = Math.max(...itens.map((i) => i.atrasados), 1);
  const Elemento = clicavel ? "button" : "div";

  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto scroll-panel pr-1">
      {itens.map((item) => (
        <Elemento
          key={item[campoNome]}
          onClick={clicavel ? () => onClickItem(item) : undefined}
          className={`w-full text-left rounded-tremor-default px-2 py-1.5 ${
            clicavel ? "hover:bg-gray-800 cursor-pointer group" : ""
          }`}
        >
          <div className="flex items-center justify-between text-sm mb-1">
            <span className={`font-medium text-gray-200 ${clicavel ? "group-hover:text-blue-400" : ""}`}>
              {item[campoNome]}
            </span>
            <span className="text-xs text-gray-400 tabular-nums flex items-center gap-1">
              {fmtNum(item.atrasados)} atrasados · {fmtPct(item.pct_atraso)}
              {clicavel && (
                <RiArrowRightSLine className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.atrasados / maxAtrasados) * 100}%`,
                backgroundColor: CORES.destaque,
              }}
            />
          </div>
        </Elemento>
      ))}
    </div>
  );
}

export default function DrilldownView({ hierarquia, equipeInicialId }) {
  const [equipe, setEquipe] = useState(null);
  const [representante, setRepresentante] = useState(null);

  // Quando o filtro de Equipe da seção (fora deste componente) muda, o
  // drill-down acompanha e já abre direto no nível de representantes dessa
  // equipe, em vez de forçar o usuário a clicar de novo em algo que ele já
  // selecionou.
  useEffect(() => {
    if (equipeInicialId) {
      setEquipe(hierarquia.find((e) => e.equipe === equipeInicialId) ?? null);
    } else {
      setEquipe(null);
    }
    setRepresentante(null);
  }, [equipeInicialId, hierarquia]);

  const voltarInicio = () => {
    setEquipe(null);
    setRepresentante(null);
  };
  const voltarEquipe = () => setRepresentante(null);

  let titulo = "Equipes — clique para ver os representantes";
  let conteudo = <Nivel itens={hierarquia} campoNome="equipe" onClickItem={setEquipe} />;

  if (equipe && !representante) {
    titulo = `Representantes da equipe "${equipe.equipe}" — clique para ver os clientes`;
    conteudo = (
      <Nivel itens={equipe.representantes} campoNome="representante" onClickItem={setRepresentante} />
    );
  } else if (equipe && representante) {
    titulo = `Top 10 clientes com mais atraso — ${representante.representante}`;
    conteudo = <Nivel itens={representante.clientes} campoNome="cliente" clicavel={false} />;
  }

  // Chave muda a cada clique de nível (equipe/representante) — o
  // AnimatePresence usa isso pra animar a troca de lista (fade + slide),
  // em vez da lista simplesmente trocar de conteúdo sem transição alguma.
  const chaveNivel = representante?.representante ?? equipe?.equipe ?? "raiz";

  return (
    <div className="space-y-4">
      <InsightBanner tipo="neutro">{gerarInsightDrilldown(hierarquia, equipe, representante)}</InsightBanner>
      <Card>
      <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
        {(equipe || representante) && (
          <button
            onClick={representante ? voltarEquipe : voltarInicio}
            className="flex items-center gap-1 rounded-tremor-full border border-gray-700 px-2 py-0.5 hover:bg-gray-800 text-gray-300"
          >
            <RiArrowLeftLine className="h-3 w-3" /> Voltar
          </button>
        )}
        <button onClick={voltarInicio} className="hover:underline">
          Equipes
        </button>
        {equipe && (
          <>
            <span>/</span>
            <button onClick={voltarEquipe} className="hover:underline">
              {equipe.equipe}
            </button>
          </>
        )}
        {representante && (
          <>
            <span>/</span>
            <span className="text-gray-200">{representante.representante}</span>
          </>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={chaveNivel}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Text className="mb-3 mt-2">{titulo}</Text>
          {conteudo}
        </motion.div>
      </AnimatePresence>
      </Card>
    </div>
  );
}
