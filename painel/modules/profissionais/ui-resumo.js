// modules/profissionais/ui-resumo.js — contagem por situação (clicar filtra a tabela) e retrato dos cadastros em aberto
import { DIAS_PARADO, NOME_ETAPA, SITUACAO_CADASTRO, resumoCadastros } from './actions.js';
import { h } from './ui.js';

const CARTOES = ['pendente', 'em_analise', 'ajustes_necessarios', 'ativo', 'bloqueado'];

// resumo({ itens, atual (situação filtrada), aoFiltrar(situação) })
export function resumo({ itens, atual, aoFiltrar }) {
  const r = resumoCadastros(itens), abertos = r.porStatus.pendente || 0;
  const cartoes = CARTOES.map(st => h('button', {
    type: 'button', class: 'pf-card' + (st === 'pendente' ? ' aberto' : '') + (atual === st ? ' ativo' : ''), 'aria-pressed': String(atual === st),
    onclick: () => aoFiltrar(atual === st ? '' : st),
  }, h('strong', { text: String(r.porStatus[st] || 0) }), h('span', { text: SITUACAO_CADASTRO[st].texto })));

  let nota = 'Nenhum cadastro em aberto.';
  if (abertos) {
    nota = `${abertos} de ${r.total} cadastros iniciados (${r.taxaAberto}%) ainda não foram enviados para análise`;
    if (r.parados) nota += `, ${r.parados} parado${r.parados > 1 ? 's' : ''} há ${DIAS_PARADO} dias ou mais`;
    nota += '.';
    if (r.onde.length) nota += ` Onde mais param: ${r.onde.map(o => `${NOME_ETAPA[o.id]} (${o.n})`).join(', ')}.`;
  }
  return h('div', {}, h('div', { class: 'pf-cards' }, ...cartoes), h('p', { class: 'pf-info pf-resumo-nota', text: nota }));
}
