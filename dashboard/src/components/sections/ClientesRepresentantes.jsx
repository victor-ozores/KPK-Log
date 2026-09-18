import { useEffect, useState } from "react";
import { TabGroup, TabList, Tab, TabPanels, TabPanel, Text } from "@tremor/react";
import RankingsView from "./clientes/RankingsView";
import InfluenciadoresView from "./clientes/InfluenciadoresView";
import DrilldownView from "./clientes/DrilldownView";
import InsightBanner from "../ui/InsightBanner";
import { fmtNum, fmtPct } from "../../utils/format";
import { RiAlertLine, RiArrowDownSLine } from "@remixicon/react";

// Mesmo limiar de scripts/03_kpis.py (MIN_VOLUME_RANKING) — replicado aqui
// porque o filtro de Equipe recalcula o ranking no cliente a partir de
// hierarquia_drilldown, que não tem esse corte de volume mínimo aplicado.
const MIN_VOLUME_RANKING = 30;

// Deriva ranking de representantes + top 3 melhores/piores On Time para UMA
// equipe, a partir de hierarquia_drilldown. Os números são exatos (não uma
// estimativa): pct_atraso e "on time" são, por definição, complementares
// (DataEntrega > DataPrevistaEntrega vs. <=), então 1 - pct_atraso reproduz
// fielmente o que taxa_on_time_por_representante calcularia no backend.
function derivarPorEquipe(hierarquia, equipeId) {
  const equipe = hierarquia.find((e) => e.equipe === equipeId);
  if (!equipe) return null;

  const validos = equipe.representantes.filter((r) => r.entregues >= MIN_VOLUME_RANKING);

  const rankingRepresentante = validos
    .map((r) => ({ Representante: r.representante, entregues: r.entregues, atrasados: r.atrasados, pct_atraso: r.pct_atraso }))
    .sort((a, b) => b.atrasados - a.atrasados);

  const comOnTimeAsc = validos
    .map((r) => ({ Representante: r.representante, entregues: r.entregues, pct_on_time: Math.round((1 - r.pct_atraso) * 10000) / 10000 }))
    .sort((a, b) => a.pct_on_time - b.pct_on_time);

  return {
    equipe,
    rankingRepresentante,
    topOnTime: {
      piores: comOnTimeAsc.slice(0, 3),
      melhores: [...comOnTimeAsc].slice(-3).reverse(),
    },
  };
}

function gerarInsight(rankingRepresentante, totalAtrasados, escopoTexto) {
  const top3 = [...rankingRepresentante].sort((a, b) => b.atrasados - a.atrasados).slice(0, 3);
  const somaTop3 = top3.reduce((s, r) => s + r.atrasados, 0);
  const pct = totalAtrasados ? (somaTop3 / totalAtrasados) * 100 : 0;
  return `Os 3 representantes com mais atrasos${escopoTexto} (${top3
    .map((r) => r.Representante)
    .join(", ")}) concentram ${pct.toFixed(0)}% de todos os pedidos entregues fora do prazo${escopoTexto} — um ponto de partida natural para ação corretiva.`;
}

function SeletorEquipe({ equipes, valor, onMudar }) {
  return (
    <div className="relative">
      <select
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        className="appearance-none rounded-tremor-full border border-dark-tremor-border bg-dark-tremor-background-subtle py-1.5 pl-3 pr-8 text-xs font-medium text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="todas">Todas as equipes</option>
        {equipes.map((eq) => (
          <option key={eq} value={eq}>
            {eq}
          </option>
        ))}
      </select>
      <RiArrowDownSLine className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export default function ClientesRepresentantes({ corte, ano }) {
  const [equipeSelecionada, setEquipeSelecionada] = useState("todas");
  const [abaAtiva, setAbaAtiva] = useState(0);

  // Se o filtro de Ano no header mudar, a lista de equipes/representantes
  // sob o corte muda — evita manter selecionada uma equipe que não existe
  // (ou tem outro significado) no novo corte.
  useEffect(() => {
    setEquipeSelecionada("todas");
  }, [ano]);

  const equipes = corte.hierarquia_drilldown.map((e) => e.equipe);
  const filtro = equipeSelecionada !== "todas" ? derivarPorEquipe(corte.hierarquia_drilldown, equipeSelecionada) : null;

  const rankingRepresentante = filtro ? filtro.rankingRepresentante : corte.ranking_representante_atraso;
  const topOnTime = filtro ? filtro.topOnTime : corte.top_representantes_on_time;
  const totalAtrasados = filtro
    ? filtro.equipe.atrasados
    : Math.round(corte.resumo.entregues * (1 - corte.resumo.pct_on_time));
  const escopoTexto = filtro ? ` na equipe "${filtro.equipe.equipe}"` : "";

  return (
    <div className="space-y-4">
      {/* Este banner descreve especificamente o ranking de representantes — só
          faz sentido na aba Rankings. Influenciadores e Drill-down já têm o
          próprio insight contextual; mostrar os dois ao mesmo tempo duplicava
          a informação na tela. */}
      {abaAtiva === 0 && (
        <InsightBanner tipo="atencao">{gerarInsight(rankingRepresentante, totalAtrasados, escopoTexto)}</InsightBanner>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Text className="max-w-2xl">
          Representantes e clientes identificados por rótulo sequencial anônimo, sem
          correspondência reversível a nomes reais.
        </Text>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Equipe:</span>
          <SeletorEquipe equipes={equipes} valor={equipeSelecionada} onMudar={setEquipeSelecionada} />
        </div>
      </div>

      {ano !== "2020" && (
        <div className="flex items-start gap-1.5 -mt-2">
          <RiAlertLine className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/90" />
          <p className="text-xs leading-snug text-amber-400/90">
            As perguntas do case sobre representantes e clientes pedem especificamente o ano de 2020 — selecione
            <strong className="font-semibold">&nbsp;"2020"&nbsp;</strong>no filtro de Ano, no topo da página, para
            ver exatamente os números do enunciado.
          </p>
        </div>
      )}

      {filtro && (
        <p className="text-xs text-slate-400 -mt-2">
          Filtrando por <span className="text-gray-300 font-medium">{filtro.equipe.equipe}</span> (
          {fmtNum(filtro.equipe.entregues)} entregas, {fmtPct(filtro.equipe.pct_atraso)} de atraso). O ranking de
          Representantes e o Top 3 On Time refletem essa equipe; o ranking de Clientes e o painel de
          Influenciadores continuam no total do período — o dado exportado ainda não permite recalculá-los por
          equipe.
        </p>
      )}

      <TabGroup index={abaAtiva} onIndexChange={setAbaAtiva}>
        {/* Tremor trunca (Tab) e recorta sem reticências (TabList: overflow-x-clip)
            quando a soma das abas passa da largura disponível — em telas menores
            de ~1300px isso cortava o texto da última aba no meio da palavra.
            Rótulos curtos removem o problema na raiz; overflow-x-auto é a rede
            de segurança caso alguma aba futura volte a ficar longa demais. */}
        <TabList variant="solid" className="overflow-x-auto">
          <Tab className="[&:not([data-selected])]:!text-slate-400 [&:not([data-selected])]:hover:!text-slate-100">
            Rankings
          </Tab>
          <Tab className="[&:not([data-selected])]:!text-slate-400 [&:not([data-selected])]:hover:!text-slate-100">
            Influenciadores
          </Tab>
          <Tab className="[&:not([data-selected])]:!text-slate-400 [&:not([data-selected])]:hover:!text-slate-100">
            Drill-down
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="pt-4">
            <RankingsView
              rankingRepresentante={rankingRepresentante}
              rankingCliente={corte.ranking_cliente_atraso}
              topOnTime={topOnTime}
              filtradoPorEquipe={!!filtro}
            />
          </TabPanel>
          <TabPanel className="pt-4">
            <InfluenciadoresView
              influenciadores={corte.influenciadores_on_time}
              mediaGeral={corte.resumo.pct_on_time}
            />
          </TabPanel>
          <TabPanel className="pt-4">
            <DrilldownView
              hierarquia={corte.hierarquia_drilldown}
              equipeInicialId={equipeSelecionada !== "todas" ? equipeSelecionada : null}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
