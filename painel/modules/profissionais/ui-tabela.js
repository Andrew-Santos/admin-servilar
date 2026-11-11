// modules/profissionais/ui-tabela.js — tabela de profissionais (clicar na linha abre a ficha)
import { SITUACAO_CADASTRO, rotuloCidade } from './actions.js';
import { h, icone, selo } from './ui.js';

const COLUNAS = [
  { id: 'nome', titulo: 'Profissional', ordena: true },
  { id: 'cpf', titulo: 'CPF' },
  { id: 'cidade', titulo: 'Cidade', ordena: true },
  { id: 'situacao', titulo: 'Situação', ordena: true },
  { id: 'pendencias', titulo: 'Pendências', ordena: true },
];

const pendencia = i => i.para_avaliar ? h('small', { class: 'pf-aval', text: `${i.para_avaliar} para avaliar` })
  : i.reprovadas ? h('small', { class: 'pf-reprov', text: `${i.reprovadas} reprovada${i.reprovadas > 1 ? 's' : ''}` })
  : h('small', { class: 'pf-nada', text: '—' });

// tabela({ itens, ordem, aoOrdenar(col), aoAbrir(id), vazio })
export function tabela({ itens, ordem, aoOrdenar, aoAbrir, vazio }) {
  if (!itens.length) return h('p', { class: 'pf-vazio-tab', text: vazio });

  const cab = h('tr', {}, ...COLUNAS.map(c => {
    const ativa = ordem.col === c.id;
    const th = h('th', { scope: 'col', 'aria-sort': ativa ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none' });
    if (!c.ordena) { th.textContent = c.titulo; return th; }
    th.append(h('button', { type: 'button', class: 'pf-th' + (ativa ? ' ativo' : ''), onclick: () => aoOrdenar(c.id) },
      c.titulo, ativa ? icone(ordem.dir === 'asc' ? 'caret-up' : 'caret-down') : null));
    return th;
  }));

  const linhas = itens.map(i => {
    const tr = h('tr', { class: 'pf-linha-tab' + (i.status === 'bloqueado' ? ' bloq' : ''), onclick: () => aoAbrir(i.id) },
      h('td', {}, h('button', { type: 'button', class: 'pf-nome-btn', text: i.nome, 'aria-label': `Abrir cadastro de ${i.nome}` })),
      h('td', { class: 'pf-cpf', text: i.cpf }),
      h('td', { text: rotuloCidade(i) || '—' }),
      h('td', {}, selo(SITUACAO_CADASTRO[i.status] || { texto: i.status, cor: '' })),
      h('td', {}, pendencia(i)));
    return tr;
  });

  return h('div', { class: 'pf-tabela-caixa' },
    h('table', { class: 'pf-tabela' }, h('thead', {}, cab), h('tbody', {}, ...linhas)));
}
