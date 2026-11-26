// modules/servicos/ui-servico.js — peças de tela do serviço: linha da tabela, composição do valor e preços por município
import { cent, bpDe } from './actions-servico.js';
import { h, icone, plural, brl, pct, fmtTempo, fmtTempoCurto } from './ui.js';

// Célula "Tempo" da tabela: tempo em cima e o valor por hora discreto embaixo.
// O detalhe (total, comissão e repasse por hora) fica na dica ao passar o mouse. Sem tempo (registro antigo) mostra "—".
const porHora = (centavos, min) => brl(Math.round(centavos * 60 / min)) + '/h';
export function celulaTempo(min, total, plat) {
  if (!min) return h('td', { class: 'r tm vz', title: 'Tempo não informado', text: '—' });
  const dica = `${fmtTempo(min)} · por hora: total ${porHora(total, min)}, comissão ${porHora(plat, min)}, repasse ${porHora(total - plat, min)}`;
  return h('td', { class: 'r tm', title: dica },
    h('div', { class: 'mn' }, h('span', { text: fmtTempoCurto(min) }), h('small', { text: porHora(total, min) })));
}

export const pill = ativo => h('span', { class: 'sv-pill ' + (ativo ? 'on' : 'off'), text: ativo ? 'Ativo' : 'Inativo' });
const ponto = tipo => h('i', { class: 'dot ' + tipo, 'aria-hidden': 'true' });

// ── Tabela ──
// Valor em reais (alinhado à direita) com o percentual embaixo
export const dinheiro = (centavos, bp, tipo) =>
  h('div', { class: 'mn' }, h('strong', { text: brl(centavos) }), h('small', {}, ponto(tipo), pct(bp)));

export function linhaTb(s, { onAbrir }) {
  const total = cent(s.valor_padrao), plat = cent(s.valor_plataforma), bp = bpDe(total, plat);
  return h('tr', { class: s.ativo ? '' : 'off', 'data-sv': s.id, onclick: onAbrir },
    h('td', { class: 'nm' }, h('div', { class: 'nmw' },
      h('button', { type: 'button', class: 'nb', text: s.nome, title: 'Ver detalhes' }),
      h('span', { class: 'ds' + (s.descricao ? '' : ' sem'), text: s.descricao || 'Sem descrição' }))),
    h('td', { class: 'r' }, h('div', { class: 'mn' }, h('strong', { text: brl(total) }))),
    h('td', { class: 'r' }, dinheiro(plat, bp, 'plat')),
    h('td', { class: 'r' }, dinheiro(total - plat, 10000 - bp, 'rep')),
    celulaTempo(s.tempo_minutos, total, plat),
    h('td', {}, pill(s.ativo)),
    h('td', { class: 'go' }, icone('caret-right')));
}

// ── Barra de proporção (comissão × repasse) — usada na visualização e no formulário ──
export function barra(centavos, plat) {
  const b = h('div', { class: 'sv-barra', 'aria-hidden': 'true' }, h('span', { class: 'plat' }), h('span', { class: 'rep' }));
  const p = centavos > 0 ? plat * 100 / centavos : 0;
  b.firstChild.style.width = `${p}%`;
  b.lastChild.style.width = centavos > 0 ? `${100 - p}%` : '0';
  return b;
}

// ── Modal de visualização ──
const bloco = (rotulo, ...filhos) => h('section', { class: 'sv-info' }, h('h4', { text: rotulo }), ...filhos);
const linhaDiv = (tipo, rotulo, pc, valor) => h('div', { class: 'sv-lg' },
  h('span', { class: 'lb' }, ponto(tipo), rotulo), h('span', { class: 'pc', text: pc }), h('strong', { class: 'vl', text: valor }));

// Municípios de uma regra em uma linha: "Salvador (BA), Lauro de Freitas (BA) e mais 3"
export function resumoMunicipios(ids, porIbge, max = 2) {
  const nome = id => { const r = porIbge.get(id); return r ? `${r.cidade} (${r.uf})` : `código ${id}`; };
  const nomes = ids.slice(0, max).map(nome).join(', ');
  return ids.length > max ? `${nomes} e mais ${ids.length - max}` : nomes;
}
const sinal = (centavos, f) => (centavos === 0 ? 'Igual ao padrão' : (centavos < 0 ? '−' : '+') + f(Math.abs(centavos)));

// Aba "Preços por município": tabela com o preço padrão na 1ª linha e uma linha por regra.
// ctx = { regras (só deste serviço ou adicional), porIbge, ok, padrao, plat (centavos), alvo ('serviço' | 'adicional'), onNova, onAbrir }
export function painelPrecos({ regras, porIbge, ok, padrao, plat, alvo = 'serviço', onNova, onAbrir }) {
  if (!ok) return h('p', { class: 'txt mudo', text: 'Não foi possível carregar os preços por município. Atualize a página.' });
  const add = cls => h('button', { type: 'button', class: cls + ' sv-rga', text: 'Adicionar preço por município', onclick: onNova });
  if (!regras.length) return h('div', { class: 'sv-vz' },
    h('strong', { text: 'Nenhum preço específico' }),
    h('p', { text: `Todos os municípios usam o valor padrão do ${alvo}. Adicione uma regra para cobrar outro valor, ou outra comissão, em municípios escolhidos.` }),
    add('sv-salvar'));

  const linha = ({ titulo, sub, total, comissao, delta, off, inativa, onclick }) => h('tr', { class: (onclick ? 'regra' : 'pad') + (off ? ' off' : ''), onclick },
    h('td', { class: 'nm' }, h('div', { class: 'nmw' },
      h('span', { class: 'rg-n' },
        onclick ? h('button', { type: 'button', class: 'nb', text: titulo, title: 'Editar' }) : h('span', { class: 'nb', text: titulo }),
        inativa ? h('span', { class: 'sv-pill off', text: 'Inativa' }) : null),
      h('span', { class: 'ds', text: sub }))),
    h('td', { class: 'r' }, h('div', { class: 'mn' }, h('strong', { text: brl(total) }), delta ? h('small', { text: delta }) : null)),
    h('td', { class: 'r c-x' }, dinheiro(comissao, bpDe(total, comissao), 'plat')),
    h('td', { class: 'r c-x' }, dinheiro(total - comissao, 10000 - bpDe(total, comissao), 'rep')),
    h('td', { class: 'go' }, onclick ? icone('caret-right') : null));

  return h('div', {},
    h('div', { class: 'sv-rgh' },
      h('p', { class: 'txt mudo', text: 'Onde houver regra, vale o valor dela. Nos demais municípios, vale o preço padrão.' }),
      add('btn-borda')),
    h('div', { class: 'sv-ptw' }, h('table', { class: 'sv-pt' },
      h('colgroup', {}, h('col'), h('col', { class: 'c-v' }), h('col', { class: 'c-v c-x' }), h('col', { class: 'c-v c-x' }), h('col', { class: 'c-g' })),
      h('thead', {}, h('tr', {}, h('th', { text: 'Municípios' }), h('th', { class: 'r', text: 'Valor' }),
        h('th', { class: 'r c-x', text: 'Comissão' }), h('th', { class: 'r c-x', text: 'Repasse' }), h('th'))),
      h('tbody', {},
        linha({ titulo: 'Demais municípios', sub: `Preço padrão do ${alvo}`, total: padrao, comissao: plat }),
        ...regras.map(r => {
          const total = cent(r.valor_padrao);
          return linha({
            titulo: r.nome || plural(r.ibge_ids.length, 'município', 'municípios'),
            sub: resumoMunicipios(r.ibge_ids, porIbge), total, comissao: cent(r.valor_plataforma),
            delta: sinal(total - padrao, brl), off: !r.ativo, inativa: !r.ativo, onclick: () => onAbrir(r) });
        })))));
}

// Lista de tópicos (incluso / não incluso) na visualização
const listaTopicos = (itens, tipo) => itens.length
  ? h('ul', { class: 'sv-tops ' + tipo }, ...itens.map(t => h('li', {}, icone(tipo === 'inc' ? 'check-circle' : 'x-circle'), h('span', { text: t }))))
  : h('p', { class: 'txt mudo', text: 'Nenhum item informado.' });

// Serve ao serviço e ao adicional (o adicional tem `unidade`)
export function corpoVerServico(s) {
  const total = cent(s.valor_padrao), plat = cent(s.valor_plataforma), bp = bpDe(total, plat);
  return h('div', {},
    bloco('Descrição', h('p', { class: 'txt' + (s.descricao ? '' : ' mudo'), text: s.descricao || 'Sem descrição.' })),
    s.unidade ? bloco('Cobrado por', h('p', { class: 'txt', text: s.unidade })) : null,
    bloco('O que está incluso', listaTopicos(s.incluso || [], 'inc')),
    bloco('O que não está incluso', listaTopicos(s.nao_incluso || [], 'ninc')),
    bloco('Composição do valor', h('div', { class: 'sv-comp' },
      h('div', { class: 'sv-total' }, h('span', { text: 'Valor padrão' }), h('strong', { text: brl(total) })),
      barra(total, plat),
      h('div', { class: 'sv-lgs' },
        linhaDiv('plat', 'Comissão da plataforma', pct(bp), brl(plat)),
        linhaDiv('rep', 'Repasse ao profissional', pct(10000 - bp), brl(total - plat))))),
    bloco('Tempo do serviço', h('p', { class: 'txt' + (s.tempo_minutos ? '' : ' mudo'), text: s.tempo_minutos ? fmtTempo(s.tempo_minutos) : 'Não informado.' })));
}
