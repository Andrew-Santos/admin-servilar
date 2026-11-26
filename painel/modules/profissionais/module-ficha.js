// modules/profissionais/module-ficha.js — abre a ficha em janela: busca os dados, monta e recarrega depois de cada decisão
import * as data from './data.js';
import { SITUACAO_CADASTRO, bloquear, decidir, decidirAlteracao, desbloquear } from './actions.js';
import { montarFicha } from './ui-detalhe.js';
import { abrirJanela, ampliarImagem } from './ui-modal.js';
import { h, msg, selo, trocar } from './ui.js';

let aberta = null;

// O worker devolve "avisos" quando a última etapa é decidida: { whatsapp, email } = enviada | falhou | sem_contato
const CANAL = { whatsapp: 'WhatsApp', email: 'e-mail' };
function resumoAvisos(avisos) {
  const por = v => Object.keys(CANAL).filter(c => avisos[c] === v).map(c => CANAL[c]);
  const ok = por('enviada'), falhou = por('falhou');
  if (falhou.length) return [`A decisão foi salva, mas o aviso por ${falhou.join(' e ')} não foi enviado. Avise o profissional por outro canal.`, 'neg'];
  if (ok.length) return [`Profissional avisado por ${ok.join(' e ')}.`, ''];
  return ['A decisão foi salva, mas o profissional não tem WhatsApp nem e-mail válidos para receber o aviso.', 'neg'];
}

// aoMudar(): chamado depois de decidir/bloquear, para o módulo atualizar a tabela e o mapa
export function abrirFicha({ id, nome, aoMudar }) {
  aberta?.fechar();
  let vivo = true, urls = [];
  const liberar = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };
  const janela = abrirJanela({ titulo: nome, aoFechar: () => { vivo = false; liberar(); if (aberta === janela) aberta = null; } });
  aberta = janela;

  // manter = recarregar sem piscar nem perder a posição da rolagem
  async function carregar(manter = false) {
    if (!manter) trocar(janela.corpo, h('p', { class: 'pf-info', role: 'status', text: 'Carregando…' }));
    let p;
    try { p = await data.buscarFicha(id); }
    catch (e) {
      if (vivo) trocar(janela.corpo, msg(e.message, 'neg'), h('button', { type: 'button', class: 'pf-btn', text: 'Tentar de novo', onclick: () => carregar() }));
      return;
    }
    if (!vivo) return;
    const rolagem = janela.corpo.scrollTop;
    liberar();
    janela.definirTitulo(p.nome, selo(SITUACAO_CADASTRO[p.status] || { texto: p.status, cor: '' }));
    const depois = async () => { if (vivo) await Promise.all([carregar(true), aoMudar()]); };
    // Resultado do aviso por WhatsApp e e-mail (só existe quando a decisão fechou a análise)
    const avisar = r => {
      if (!vivo || !r?.avisos) return;
      const [texto, tipo] = resumoAvisos(r.avisos);
      janela.corpo.prepend(msg(texto, tipo));
    };
    trocar(janela.corpo, montarFicha(p, {
      urls, vivo: () => vivo, baixar: data.baixarArquivo, aoAmpliar: ampliarImagem,
      aoDecidir: async (topico, status, motivo) => { const r = await decidir(id, topico, status, motivo); await depois(); avisar(r); },
      aoDecidirAlteracao: async (altId, status, motivo) => { await decidirAlteracao(id, altId, status, motivo); await depois(); },
      baixarAlteracao: altId => data.baixarArquivoAlteracao(id, altId),
      aoBloquear: async (motivo, detalhe) => { await bloquear(id, motivo, detalhe); await depois(); },
      aoDesbloquear: async () => { await desbloquear(id); await depois(); },
    }));
    janela.corpo.scrollTop = manter ? rolagem : 0;
  }
  carregar();
  return janela;
}
