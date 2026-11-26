// modules/cupons/ui-lista.js — a tabela de cupons e o aviso de lista vazia
import { h } from './ui.js';
import { linhaTb } from './ui-cupom.js';

export const vazioLista = (texto, ...extra) => h('div', { class: 'cp-vazio' }, h('span', { text: texto }), ...extra);

// onAbrir(cupom) é chamado ao clicar na linha
export function tabela(lista, onAbrir) {
  const col = c => h('col', { class: c });
  const th = (t, r) => h('th', { class: r ? 'r' : '', text: t });
  return h('div', { class: 'cp-tbw' }, h('table', { class: 'cp-tb' },
    h('colgroup', {}, col('c-nome'), col('c-dc'), col('c-qm'), col('c-us'), col('c-vl'), col('c-st'), col('c-go')),
    h('thead', {}, h('tr', {}, th('Cupom'), th('Desconto', true), th('Quem pode usar'), th('Usos', true), th('Validade'), th('Status'), h('th', {}))),
    h('tbody', {}, ...lista.map(c => linhaTb(c, () => onAbrir(c))))));
}
