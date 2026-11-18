// modules/servicos/ui-especialidade.js — peças de tela da especialidade: etiqueta de status, visualização e seletor de regiões
import { h, icone, plural } from './ui.js';

export const vazio = (...filhos) => h('li', { class: 'es-vazio' }, ...filhos);

export const pill = ativo => h('span', { class: 'es-pill ' + (ativo ? 'on' : 'off'), text: ativo ? 'Ativa' : 'Inativa' });

// ── Modal de visualização ──
const bloco = (rotulo, ...filhos) => h('section', { class: 'es-info' }, h('h4', { text: rotulo }), ...filhos);

export function corpoVerEspecialidade(e, porId) {
  const grupos = new Map(); let orfas = 0;
  e.regioes.forEach(i => {
    const r = porId.get(i);
    if (!r) { orfas++; return; }
    if (!grupos.has(r.uf)) grupos.set(r.uf, []);
    grupos.get(r.uf).push(r);
  });
  const n = e.regioes.length - orfas;
  const regioes = n || orfas
    ? [
        n ? h('p', { class: 'es-resumo', text: `${plural(n, 'cidade', 'cidades')} em ${plural(grupos.size, 'estado', 'estados')}` }) : null,
        ...[...grupos].sort(([a], [b]) => a.localeCompare(b)).map(([uf, lista]) =>
          h('div', { class: 'es-g' },
            h('div', { class: 'es-gt' }, h('strong', { text: uf }), h('span', { text: plural(lista.length, 'cidade', 'cidades') })),
            h('div', { class: 'es-gc' }, ...lista.sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt'))
              .map(r => h('span', { class: 'es-ci' + (r.ativo === false ? ' off' : ''), text: r.cidade + (r.ativo === false ? ' (desativada)' : '') }))))),
        orfas ? h('p', { class: 'txt alerta', text: `${plural(orfas, 'código sem cadastro', 'códigos sem cadastro')} em Regiões.` }) : null,
      ]
    : [h('p', { class: 'txt alerta', text: 'Nenhuma região definida.' })];
  return h('div', {},
    bloco('Descrição', h('p', { class: 'txt' + (e.descricao ? '' : ' mudo'), text: e.descricao || 'Sem descrição.' })),
    bloco('Regiões atendidas', ...regioes));
}

// ── Seletor de regiões (modal de cadastro/edição) ──
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
