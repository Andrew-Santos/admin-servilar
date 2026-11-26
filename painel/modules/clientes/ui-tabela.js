// modules/clientes/ui-tabela.js — tabela de clientes (clicar na linha abre a ficha)
import { formatarCpf, formatarDia, formatarWhatsapp, rotuloCidade } from './actions.js';
import { h, icone } from './ui.js';

const COLUNAS = [
  { id: 'nome', titulo: 'Cliente', ordena: true },
  { id: 'whatsapp', titulo: 'WhatsApp' },
  { id: 'cpf', titulo: 'CPF' },
  { id: 'cidade', titulo: 'Cidade', ordena: true },
  { id: 'enderecos', titulo: 'Endereços' },
  { id: 'cadastro', titulo: 'Cliente desde', ordena: true },
];

// tabela({ itens, ordem, aoOrdenar(col), aoAbrir(id), vazio })
export function tabela({ itens, ordem, aoOrdenar, aoAbrir, vazio }) {
  if (!itens.length) return h('p', { class: 'cl-vazio-tab', text: vazio });

  const cab = h('tr', {}, ...COLUNAS.map(c => {
    const ativa = ordem.col === c.id;
    const th = h('th', { scope: 'col', 'aria-sort': ativa ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none' });
    if (!c.ordena) { th.textContent = c.titulo; return th; }
    th.append(h('button', { type: 'button', class: 'cl-th' + (ativa ? ' ativo' : ''), onclick: () => aoOrdenar(c.id) },
      c.titulo, ativa ? icone(ordem.dir === 'asc' ? 'caret-up' : 'caret-down') : null));
    return th;
  }));

  const linhas = itens.map(i => h('tr', { class: 'cl-linha-tab', onclick: () => aoAbrir(i.id) },
    h('td', {}, h('button', { type: 'button', class: 'cl-nome-btn' + (i.nome ? '' : ' cl-sem'), text: i.nome || 'Sem nome', 'aria-label': `Abrir cadastro de ${i.nome || 'cliente sem nome'}` })),
    h('td', { class: 'cl-mudo', text: formatarWhatsapp(i.whatsapp) || '—' }),
    h('td', { class: 'cl-mudo', text: formatarCpf(i.cpf) || '—' }),
    h('td', { text: rotuloCidade(i) || '—' }),
    h('td', i.qtd_enderecos ? { text: String(i.qtd_enderecos) } : { class: 'cl-nada', text: '—' }),
    h('td', { class: 'cl-mudo', text: formatarDia(i.criado_em) || '—' })));

  return h('div', { class: 'cl-tabela-caixa' },
    h('table', { class: 'cl-tabela' }, h('thead', {}, cab), h('tbody', {}, ...linhas)));
}
