// modules/pedidos/module-detalhe.js — abre o pedido em janela: busca os dados, monta e salva a troca de status
import * as data from './data.js';
import { montarDetalhe, seloDoPedido } from './ui-detalhe.js';
import { abrirJanela } from './ui-modal.js';
import { h, msg, trocar } from './ui.js';

let aberta = null;

// aoStatus(id, { status, atualizado_em, fechado_em }) avisa a lista para atualizar a linha sem recarregar
export function abrirPedido({ id, numero, aoStatus }) {
  aberta?.fechar();
  let vivo = true;
  const janela = abrirJanela({ titulo: 'Pedido #' + numero, aoFechar: () => { vivo = false; if (aberta === janela) aberta = null; } });
  aberta = janela;

  async function carregar() {
    trocar(janela.corpo, h('p', { class: 'pd-info', role: 'status', text: 'Carregando…' }));
    let p;
    try { p = await data.buscarPedido(id); }
    catch (e) {
      if (vivo) trocar(janela.corpo, msg(e.message, 'neg'), h('button', { type: 'button', class: 'pd-btn', text: 'Tentar de novo', onclick: carregar }));
      return;
    }
    if (!vivo) return;
    janela.definirTitulo('Pedido #' + (p.numero || p.id), seloDoPedido(p));
    trocar(janela.corpo, montarDetalhe(p, {
      salvarStatus: async novo => {
        const r = await data.alterarStatus(id, novo);
        aoStatus?.(id, { status: novo, atualizado_em: r.atualizado_em, fechado_em: r.fechado_em });
        return r;
      },
    }));
    janela.corpo.scrollTop = 0;
  }
  carregar();
  return janela;
}
