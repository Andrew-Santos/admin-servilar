// modules/servicos/ui.js — peças de tela. Tudo via textContent (nunca innerHTML com dados).
import { cent, bpDe } from './actions.js';

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
export const vazioTb = (...filhos) => h('tr', { class: 'sem-hover' }, h('td', { colspan: 7, class: 'sv-vazio' }, ...filhos));

// Formatação (pt-BR)
export const brl = centavos => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numBr = centavos => (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = bp => `${(bp / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

export const pill = ativo => h('span', { class: 'sv-pill ' + (ativo ? 'on' : 'off'), text: ativo ? 'Ativo' : 'Inativo' });
export const chip = (texto, alerta = false) => h('span', { class: 'chip' + (alerta ? ' alerta' : ''), title: texto, text: texto });
const ponto = tipo => h('i', { class: 'dot ' + tipo, 'aria-hidden': 'true' });

// ── Tabela ──
// Valor em reais (alinhado à direita) com o percentual embaixo
const dinheiro = (centavos, bp, tipo) =>
  h('div', { class: 'mn' }, h('strong', { text: brl(centavos) }), h('small', {}, ponto(tipo), pct(bp)));

export function linhaTb(s, { espNome, onAbrir }) {
  const total = cent(s.valor_padrao), plat = cent(s.valor_plataforma), bp = bpDe(total, plat);
  return h('tr', { class: s.ativo ? '' : 'off', onclick: onAbrir },
    h('td', { class: 'nm' }, h('div', { class: 'nmw' },
      h('button', { type: 'button', class: 'nb', text: s.nome, title: 'Ver detalhes' }),
      h('span', { class: 'ds' + (s.descricao ? '' : ' sem'), text: s.descricao || 'Sem descrição' }))),
    h('td', { class: 'ep' }, chip(espNome)),
    h('td', { class: 'r' }, h('div', { class: 'mn' }, h('strong', { text: brl(total) }))),
    h('td', { class: 'r' }, dinheiro(plat, bp, 'plat')),
    h('td', { class: 'r' }, dinheiro(total - plat, 10000 - bp, 'rep')),
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
// ctx = { regras (só deste serviço), porIbge, ok, padrao, plat (centavos), onNova, onAbrir }
export function painelPrecos({ regras, porIbge, ok, padrao, plat, onNova, onAbrir }) {
  if (!ok) return h('p', { class: 'txt mudo', text: 'Não foi possível carregar os preços por município. Atualize a página.' });
  const add = cls => h('button', { type: 'button', class: cls + ' sv-rga', text: 'Adicionar preço por município', onclick: onNova });
  if (!regras.length) return h('div', { class: 'sv-vz' },
    h('strong', { text: 'Nenhum preço específico' }),
    h('p', { text: 'Todos os municípios usam o valor padrão do serviço. Adicione uma regra para cobrar outro valor, ou outra comissão, em municípios escolhidos.' }),
    add('sv-salvar'));

  const bp = bpDe(padrao, plat);
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
        linha({ titulo: 'Demais municípios', sub: 'Preço padrão do serviço', total: padrao, comissao: plat }),
        ...regras.map(r => {
          const total = cent(r.valor_padrao);
          return linha({
            titulo: r.nome || plural(r.ibge_ids.length, 'município', 'municípios'),
            sub: resumoMunicipios(r.ibge_ids, porIbge), total, comissao: cent(r.valor_plataforma),
            delta: sinal(total - padrao, brl), off: !r.ativo, inativa: !r.ativo, onclick: () => onAbrir(r) });
        })))));
}

export function corpoVer(s) {
  const total = cent(s.valor_padrao), plat = cent(s.valor_plataforma), bp = bpDe(total, plat);
  return h('div', {},
    bloco('Descrição', h('p', { class: 'txt' + (s.descricao ? '' : ' mudo'), text: s.descricao || 'Sem descrição.' })),
    bloco('Composição do valor', h('div', { class: 'sv-comp' },
      h('div', { class: 'sv-total' }, h('span', { text: 'Valor padrão' }), h('strong', { text: brl(total) })),
      barra(total, plat),
      h('div', { class: 'sv-lgs' },
        linhaDiv('plat', 'Comissão da plataforma', pct(bp), brl(plat)),
        linhaDiv('rep', 'Repasse ao profissional', pct(10000 - bp), brl(total - plat))))));
}
