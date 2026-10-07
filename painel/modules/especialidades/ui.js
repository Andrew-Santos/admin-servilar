// modules/especialidades/ui.js — peças de tela. Tudo via textContent (nunca innerHTML com dados).

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

// Estado vazio dentro de uma <ul> (lista de cidades)
export const vazio = (...filhos) => h('li', { class: 'es-vazio' }, ...filhos);
// Estado vazio dentro da tabela (ocupa a linha inteira)
export const vazioTabela = (...filhos) =>
  h('tr', { class: 'es-vazio' }, h('td', { colspan: 5 }, h('div', { class: 'es-vz' }, ...filhos)));

// Monograma colorido: a cor sai do nome, então cada especialidade tem sempre a mesma "cara" (reconhecimento rápido)
const PAL = ['#2F9C95', '#E3732D', '#5B7FA6', '#7E9E5C', '#9A6A9C', '#C2923B'];
export function avatar(nome, icon) {
  let k = 0; for (const c of nome) k = (k * 31 + c.codePointAt(0)) >>> 0;
  return h('span', { class: 'es-av', style: `--c:${PAL[k % PAL.length]}`, 'aria-hidden': 'true' }, icon ? icone(icon) : (nome.trim()[0] || '?'));
}

// Linha da tabela: clicar abre a leitura; o lápis abre a edição; o botão power ativa/desativa
export function linhaTabela(e, { ufs, onVer, onEditar, onStatus }) {
  const n = e.regioes.length;
  const tags = ufs.slice(0, 4).map(u => h('span', { class: 'tag', text: u }));
  if (ufs.length > 4) tags.push(h('span', { class: 'tag', text: `+${ufs.length - 4}` }));
  const parar = fn => ev => { ev.stopPropagation(); fn(); };
  const rotE = 'Editar ' + e.nome;
  const rotS = (e.status ? 'Desativar ' : 'Ativar ') + e.nome;
  return h('tr', { class: 'es-tr' + (e.status ? '' : ' off'), onclick: () => onVer() },
    h('td', { class: 'c-nome' },
      h('div', { class: 'es-id' }, avatar(e.nome),
        h('button', { type: 'button', class: 'es-nm', text: e.nome, title: e.nome }))),
    h('td', { class: 'c-desc' },
      h('span', { class: 'es-d' + (e.descricao ? '' : ' sem'), text: e.descricao || 'Sem descrição' })),
    h('td', { class: 'c-reg' }, n
      ? h('div', { class: 'es-rg' }, h('span', { class: 'es-rn', text: plural(n, 'cidade', 'cidades') }), h('span', { class: 'es-tags' }, ...tags))
      : h('span', { class: 'alerta', text: 'Sem regiões' })),
    h('td', { class: 'c-st' },
      h('span', { class: 'es-sd ' + (e.status ? 'on' : 'off'), text: e.status ? 'Ativa' : 'Inativa' })),
    h('td', { class: 'c-ac' },
      h('div', { class: 'es-ics' },
        h('button', { type: 'button', class: 'es-ic', title: rotE, 'aria-label': rotE, onclick: parar(onEditar) }, icone('pencil-simple')),
        h('button', { type: 'button', class: 'es-ic pw' + (e.status ? ' ligada' : ''), title: rotS, 'aria-label': rotS, onclick: parar(onStatus) }, icone('power')))));
}

// Conteúdo do modal de leitura
export function detalheEsp(e, porId) {
  const por = new Map(); let orfas = 0;
  e.regioes.forEach(i => {
    const r = porId.get(i);
    if (!r) { orfas++; return; }
    if (!por.has(r.uf)) por.set(r.uf, []);
    por.get(r.uf).push(r.cidade);
  });
  const grupos = [...por.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt'));
  return h('div', { class: 'es-lv' },
    h('div', { class: 'es-sec' }, h('span', { text: 'Descrição' })),
    h('p', { class: 'es-lv-d' + (e.descricao ? '' : ' sem'), text: e.descricao || 'Sem descrição cadastrada.' }),
    h('div', { class: 'es-sec' }, h('span', { text: 'Regiões atendidas' }), h('b', { text: e.regioes.length })),
    grupos.length
      ? h('div', { class: 'es-grps' }, ...grupos.map(([uf, cidades]) =>
          h('div', { class: 'es-grp' },
            h('div', { class: 'es-grp-t' }, h('strong', { text: uf }), h('span', { text: plural(cidades.length, 'cidade', 'cidades') })),
            h('ul', { class: 'es-cids' }, ...cidades.sort((a, b) => a.localeCompare(b, 'pt')).map(c => h('li', { text: c }))))))
      : h('p', { class: 'es-lv-d sem', text: 'Nenhuma região vinculada.' }),
    orfas ? h('p', { class: 'es-orf', text: `${plural(orfas, 'código não existe', 'códigos não existem')} mais em Regiões.` }) : null);
}

// Cidade como botão de marcar (a caixa fica escondida; o visual vem do .ck)
export function itemRegiao(r, marcada, onChange) {
  return h('li', {},
    h('label', {},
      h('input', { type: 'checkbox', checked: marcada, onchange: ev => onChange(ev.target.checked) }),
      h('span', { class: 'ck', title: r.cidade },
        icone('check'),
        h('span', { class: 'n', text: r.cidade }),
        r.ativo === false ? h('small', { text: 'desativada' }) : null)));
}

// Estado como "aba": sigla + quantas cidades dele já foram marcadas; clicar troca o estado exibido
export const chipUF = (uf, n, atual, onClick) =>
  h('button', { type: 'button', class: ['es-uf', atual && 'on', !atual && n && 'tem'].filter(Boolean).join(' '), title: `Ver cidades de ${uf}`, onclick: onClick },
    uf, n ? h('b', { text: n }) : null);