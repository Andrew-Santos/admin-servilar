// modules/whatsapp/ui.js — peças de tela. Dado externo entra só por textContent (nunca innerHTML).
import { iniciais } from './actions.js';

// h('div', { class:'x', onclick: fn, text:'oi' }, filho1, filho2)
export const h = (tag, props = {}, ...filhos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') || ['value', 'checked', 'disabled', 'hidden'].includes(k)) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...filhos.flat().filter(f => f != null && f !== false));
  return e;
};
export const icone = nome => h('i', { class: `ph ph-${nome}`, 'aria-hidden': 'true' });

// Troca o conteúdo de um elemento. Ignora null/false: replaceChildren(null) escreveria a palavra "null" na tela.
export const trocar = (el, ...filhos) => el.replaceChildren(...filhos.flat().filter(f => f != null && f !== false));

// Mensagem de aviso (erro ou informação)
export const msg = (texto, tipo = '') => h('p', { class: 'wa-msg ' + tipo, role: tipo === 'neg' ? 'alert' : 'status', text: texto });

// Círculo com as iniciais (ou um ícone, quando não há nome)
export const avatar = nome => {
  const t = iniciais(nome);
  return h('span', { class: 'wa-avatar', 'aria-hidden': 'true' }, t ? t : icone('user'));
};
