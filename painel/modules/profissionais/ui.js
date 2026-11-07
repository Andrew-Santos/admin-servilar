// modules/profissionais/ui.js — peças de tela. Tudo via textContent (nunca innerHTML com dados).

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

// Selo de situação: selo({ texto, cor })
export const selo = s => h('span', { class: 'pf-selo ' + (s.cor || ''), text: s.texto });

// Mensagem de aviso (erro ou informação)
export const msg = (texto, tipo = '') => h('p', { class: 'pf-msg ' + tipo, role: tipo === 'neg' ? 'alert' : 'status', text: texto });

// Linha "rótulo: valor" da ficha (valor vazio vira "—")
export const linhaDado = (rotulo, valor) => h('div', { class: 'pf-dado' }, h('dt', { text: rotulo }), h('dd', { text: valor || '—' }));
