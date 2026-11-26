// modules/pedidos/ui-tabela.js — tabela de pedidos (clicar na linha abre o detalhe)
import { formatarData, formatarDia, formatarMoeda, infoStatus, nomeCliente, rotuloPagamento } from './actions.js';
import { h, selo } from './ui.js';

const COLUNAS = ['Pedido', 'Cliente', 'Status', 'Pagamento', 'Subtotal', 'Desconto', 'Total', 'Agendamento', 'Criado em'];

// tabela({ itens, aoAbrir(id), vazio })
export function tabela({ itens, aoAbrir, vazio }) {
  if (!itens.length) return h('p', { class: 'pd-vazio-tab', text: vazio });

  const linhas = itens.map(p => h('tr', { class: 'pd-linha-tab', onclick: () => aoAbrir(p.id) },
    h('td', {}, h('button', { type: 'button', class: 'pd-nome-btn', text: '#' + (p.numero || p.id), 'aria-label': `Abrir pedido ${p.numero || p.id}` })),
    h('td', {}, h('span', { class: p.cliente_nome ? '' : 'pd-mudo', text: nomeCliente(p) })),
    h('td', {}, selo(infoStatus(p.status))),
    h('td', { class: 'pd-mudo', text: rotuloPagamento(p.forma_pagamento) || '—' }),
    h('td', { class: 'pd-num', text: formatarMoeda(p.subtotal) }),
    h('td', p.desconto > 0 ? { class: 'pd-num pd-desc', text: '− ' + formatarMoeda(p.desconto), title: p.cupom_codigo ? 'Cupom ' + p.cupom_codigo : null } : { class: 'pd-num pd-nada', text: '—' }),
    h('td', { class: 'pd-num pd-total', text: formatarMoeda(p.total) }),
    h('td', { class: 'pd-mudo', text: formatarData(p.data_agendamento) || '—' }),
    h('td', { class: 'pd-mudo', text: formatarDia(p.criado_em) || '—' })));

  return h('div', { class: 'pd-tabela-caixa' },
    h('table', { class: 'pd-tabela' },
      h('thead', {}, h('tr', {}, ...COLUNAS.map(c => h('th', { scope: 'col', text: c })))),
      h('tbody', {}, ...linhas)));
}
