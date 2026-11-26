// modules/servicos/ui-adicional.js — tabela de adicionais (dentro de cada especialidade)
import { cent, bpDe } from './actions-servico.js';
import { h, icone, brl } from './ui.js';
import { pill, dinheiro, celulaTempo } from './ui-servico.js';

const col = cls => h('col', { class: cls });

// Valor com a unidade embaixo ("por quarto"); comissão e repasse como no serviço
export function linhaAd(a, { onAbrir }) {
  const total = cent(a.valor_padrao), plat = cent(a.valor_plataforma), bp = bpDe(total, plat);
  return h('tr', { class: a.ativo ? '' : 'off', 'data-ad': a.id, onclick: onAbrir },
    h('td', { class: 'nm' }, h('div', { class: 'nmw' },
      h('button', { type: 'button', class: 'nb', text: a.nome, title: 'Ver detalhes' }),
      h('span', { class: 'ds' + (a.descricao ? '' : ' sem'), text: a.descricao || 'Sem descrição' }))),
    h('td', { class: 'r' }, h('div', { class: 'mn' }, h('strong', { text: brl(total) }), h('small', { text: 'por ' + a.unidade }))),
    h('td', { class: 'r' }, dinheiro(plat, bp, 'plat')),
    h('td', { class: 'r' }, dinheiro(total - plat, 10000 - bp, 'rep')),
    celulaTempo(a.tempo_minutos, total, plat),
    h('td', {}, pill(a.ativo)),
    h('td', { class: 'go' }, icone('caret-right')));
}

export const tabelaAd = (lista, onAbrir) => h('div', { class: 'cat-tbw' }, h('table', { class: 'sv-tb' },
  h('colgroup', {}, col('c-nome'), col('c-val'), col('c-pl'), col('c-rp'), col('c-tm'), col('c-st'), col('c-go')),
  h('thead', {}, h('tr', {},
    h('th', { text: 'Adicional' }), h('th', { class: 'r', text: 'Valor padrão' }), h('th', { class: 'r', text: 'Comissão' }),
    h('th', { class: 'r', text: 'Repasse' }), h('th', { class: 'r', text: 'Tempo' }), h('th', { text: 'Status' }), h('th'))),
  h('tbody', {}, ...lista.map(a => linhaAd(a, { onAbrir: () => onAbrir(a) })))));
