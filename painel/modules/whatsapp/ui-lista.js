// modules/whatsapp/ui-lista.js — lista de conversas
import { ORIGEM, TIPO, rotuloConversa, rotuloLista } from './actions.js';
import { avatar, h } from './ui.js';

// "Bot: Olá!" / "Nome da pessoa: ..." — prévia da última mensagem
function previa(u) {
  const quem = u.direcao === 'saida' ? (ORIGEM[u.origem]?.texto || 'Você') + ': ' : '';
  return quem + (u.texto || `[${(TIPO[u.tipo] || { texto: u.tipo }).texto}]`);
}

// lista({ conversas, atual (telefone aberto), aoAbrir(telefone), vazio })
export function lista({ conversas, atual, aoAbrir, vazio }) {
  if (!conversas.length) return h('p', { class: 'wa-info wa-lista-vazio', text: vazio });
  return h('ul', { class: 'wa-itens' }, ...conversas.map(c => h('li', {},
    h('button', { type: 'button', class: 'wa-item', 'aria-current': String(c.telefone === atual), onclick: () => aoAbrir(c.telefone) },
      avatar(c.nome),
      h('span', { class: 'wa-item-corpo' },
        h('span', { class: 'wa-item-topo' }, h('strong', { text: rotuloConversa(c) }), h('time', { text: rotuloLista(c.ultima.data_msg) })),
        h('span', { class: 'wa-item-base' },
          h('span', { class: 'wa-previa', text: previa(c.ultima) }),
          c.falhas ? h('b', { class: 'wa-falha-n', title: `${c.falhas} mensagem(ns) com falha`, text: String(c.falhas) }) : null))))));
}
