// modules/profissionais/module-ficha.js — abre a ficha em janela: busca os dados, monta e recarrega depois de cada decisão
import * as data from './data.js';
import { SITUACAO_CADASTRO, bloquear, decidir, desbloquear } from './actions.js';
import { montarFicha } from './ui-detalhe.js';
import { abrirJanela, ampliarImagem } from './ui-modal.js';
import { h, msg, selo, trocar } from './ui.js';

let aberta = null;

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
    trocar(janela.corpo, montarFicha(p, {
      urls, vivo: () => vivo, baixar: data.baixarArquivo, aoAmpliar: ampliarImagem,
      aoDecidir: async (topico, status, motivo) => { await decidir(id, topico, status, motivo); await depois(); },
      aoBloquear: async (motivo, detalhe) => { await bloquear(id, motivo, detalhe); await depois(); },
      aoDesbloquear: async () => { await desbloquear(id); await depois(); },
    }));
    janela.corpo.scrollTop = manter ? rolagem : 0;
  }
  carregar();
  return janela;
}
