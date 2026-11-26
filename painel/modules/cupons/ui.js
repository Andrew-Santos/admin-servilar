// modules/cupons/ui.js — ajudas de tela comuns ao módulo. Tudo via textContent (nunca innerHTML com dados).

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
export const icone = nome => h('i', { class: `ph ph-${nome}` });
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
export const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Valores em reais (número). O servidor devolve numeric com no máximo 2 casas.
export const brl = reais => reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numBr = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const dataBr = iso => iso.split('-').reverse().join('/');   // 2026-12-31 → 31/12/2026
export const hojeIso = () => {                                      // data de hoje no fuso do navegador
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
