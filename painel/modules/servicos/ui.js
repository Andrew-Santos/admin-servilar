// modules/servicos/ui.js — ajudas de tela comuns ao módulo. Tudo via textContent (nunca innerHTML com dados).

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

// Formatação (pt-BR). Dinheiro em centavos e percentual em centésimos de %.
export const brl = centavos => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numBr = centavos => (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// minutos → "45 min", "1h (60 min)", "1h30 (90 min)"
export const fmtTempo = m => {
  if (m < 60) return `${m} min`;
  const hr = Math.floor(m / 60), r = m % 60;
  return `${hr}h${r ? String(r).padStart(2, '0') : ''} (${m} min)`;
};
// versão curta para a tabela: "45 min", "5h", "1h30"
export const fmtTempoCurto = m => {
  if (m < 60) return `${m} min`;
  const hr = Math.floor(m / 60), r = m % 60;
  return `${hr}h${r ? String(r).padStart(2, '0') : ''}`;
};
export const pct = bp => `${(bp / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

export const chip = (texto, alerta = false) => h('span', { class: 'chip' + (alerta ? ' alerta' : ''), title: texto, text: texto });
