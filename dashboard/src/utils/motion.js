import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Variants do Framer Motion reaproveitados em todas as seções — mantém a
// mesma "assinatura" de movimento no app inteiro (entra em stagger, sobe
// 10px + fade, 0.35s ease-out), em vez de cada card inventar sua animação.

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.02 } },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// Transição de seção (troca de aba no topo) — fade + leve slide horizontal.
export const secaoTransicao = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
};


// Anima um número subindo até o valor final (efeito "contador") sempre que
// ele muda — usado nos KPIs e Meters para o dashboard parecer vivo, em vez
// dos números só "aparecerem" prontos. Reaproveita o motor de animação do
// Framer Motion (já é dependência do projeto) em vez de trazer mais uma lib
// só pra isso. Quem chama decide como formatar cada frame (fmtNum, fmtPct...).
export function useContagemAnimada(valorFinal, duracao = 0.8) {
  const [valorAtual, setValorAtual] = useState(0);
  const jaMontou = useRef(false);

  useEffect(() => {
    const origem = jaMontou.current ? valorAtual : 0;
    jaMontou.current = true;
    const controls = animate(origem, valorFinal ?? 0, {
      duration: duracao,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setValorAtual,
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorFinal, duracao]);

  return valorAtual;
}
