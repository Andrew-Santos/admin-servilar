// modules/servicos/ui-lista.js — lista de especialidades (sanfona) com a tabela de serviços dentro de cada uma
import { h, icone, plural } from './ui.js';
import { pill } from './ui-especialidade.js';
import { linhaTb } from './ui-servico.js';

export const vazioLista = (...filhos) => h('div', { class: 'cat-vazio' }, ...filhos);

const col = cls => h('col', { class: cls });
const tabela = (lista, onAbrir) => h('div', { class: 'cat-tbw' }, h('table', { class: 'sv-tb' },
  h('colgroup', {}, col('c-nome'), col('c-val'), col('c-pl'), col('c-rp'), col('c-st'), col('c-go')),
  h('thead', {}, h('tr', {},
    h('th', { text: 'Serviço' }), h('th', { class: 'r', text: 'Valor padrão' }), h('th', { class: 'r', text: 'Comissão' }),
    h('th', { class: 'r', text: 'Repasse' }), h('th', { text: 'Status' }), h('th'))),
  h('tbody', {}, ...lista.map(s => linhaTb(s, { onAbrir: () => onAbrir(s) })))));

// Uma especialidade: cabeçalho (abre/fecha) + corpo com a descrição e os serviços dela.
// servicos = os que aparecem agora (já filtrados); total = quantos ela tem de verdade.
export function blocoEspecialidade(e, { servicos, total, aberto, filtrado, onAlternar, onDetalhes, onNovoServico, onAbrirServico }) {
  const id = 'cat-c-' + e.id, n = servicos.length, cidades = e.regioes.length;
  const qtd = plural(total, 'serviço', 'serviços');

  const corpo = h('div', { class: 'cat-corpo', id, hidden: !aberto },
    e.descricao ? h('p', { class: 'cat-desc', text: e.descricao }) : null,
    n ? tabela(servicos, onAbrirServico)
      : h('div', { class: 'cat-vz' },
          h('p', { text: total ? 'Nenhum serviço com esses filtros.' : 'Esta especialidade ainda não tem serviços.' }),
          total ? null : h('button', { type: 'button', class: 'btn-borda', text: 'Cadastrar serviço', onclick: onNovoServico })));

  const tg = h('button', { type: 'button', class: 'cat-tg', 'aria-expanded': String(aberto), 'aria-controls': id },
    icone('caret-right'), h('span', { class: 'cat-nm', text: e.nome }), pill(e.status),
    h('span', { class: 'cat-meta' }, filtrado ? `${n} de ${qtd}` : qtd, ' · ',
      cidades ? plural(cidades, 'cidade', 'cidades') : h('span', { class: 'alerta', text: 'sem regiões' })));

  const acao = (attr, icon, texto, rotulo, fn) => h('button',
    { type: 'button', class: 'btn-borda', title: rotulo, 'aria-label': rotulo, [attr]: e.id, onclick: fn },
    icone(icon), h('span', { class: 'cat-bt', text: texto }));

  const bloco = h('section', { class: 'cat-bloco' + (aberto ? ' aberto' : '') + (e.status ? '' : ' off') });
  // abre/fecha no próprio lugar (sem redesenhar a lista, para o foco não se perder)
  tg.onclick = () => {
    const abre = corpo.hidden;
    corpo.hidden = !abre; bloco.classList.toggle('aberto', abre); tg.setAttribute('aria-expanded', String(abre));
    onAlternar(abre);
  };
  bloco.append(
    h('div', { class: 'cat-cab' }, tg, h('div', { class: 'cat-ac' },
      acao('data-detalhes', 'info', 'Detalhes', 'Detalhes de ' + e.nome, onDetalhes),
      acao('data-novo-sv', 'plus', 'Serviço', 'Cadastrar serviço em ' + e.nome, onNovoServico))),
    corpo);
  return bloco;
}
