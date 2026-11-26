// modules/cupons/ui-cupom.js — peças de tela do cupom: situação, linha da tabela e visualização
import { h, icone, brl, numBr, dataBr, hojeIso } from './ui.js';

// Situação do cupom: inativo (desligado) > expirado (passou da validade) > esgotado (usos no limite) > ativo
export const situacao = c =>
  !c.ativo ? 'inativo'
  : c.valido_ate && c.valido_ate < hojeIso() ? 'expirado'
  : c.limite_usos != null && c.usos >= c.limite_usos ? 'esgotado'
  : 'ativo';
export const ROTULO = { ativo: 'Ativo', inativo: 'Inativo', expirado: 'Expirado', esgotado: 'Esgotado' };

export const pill = c => { const s = situacao(c); return h('span', { class: 'cp-pill ' + s, text: ROTULO[s] }); };
export const descontoTxt = c => c.tipo_desconto === 'percentual' ? `${numBr(c.valor_desconto)}%` : brl(c.valor_desconto);
export const usosTxt = c => c.limite_usos == null ? `${c.usos} · sem limite` : `${c.usos} de ${c.limite_usos}`;
export const validadeTxt = c => c.valido_ate ? dataBr(c.valido_ate) : 'Sem prazo';

// ── Linha da tabela ──
export function linhaTb(c, onAbrir) {
  const off = situacao(c) !== 'ativo';
  return h('tr', { class: off ? 'off' : '', 'data-cp': c.id, onclick: onAbrir },
    h('td', { class: 'nm' }, h('div', { class: 'cp-nmw' },
      h('button', { type: 'button', class: 'cp-nb', text: c.codigo, title: 'Ver detalhes', onclick: ev => { ev.stopPropagation(); onAbrir(); } }),
      h('span', { class: 'cp-ds' + (c.descricao ? '' : ' sem'), text: c.descricao || 'Sem descrição' }))),
    h('td', { class: 'r' }, h('strong', { class: 'cp-dc', text: descontoTxt(c) })),
    h('td', {}, c.cpf_mascarado
      ? h('span', { class: 'cp-chip', title: 'Somente esta pessoa pode usar' }, icone('lock-simple'), c.cpf_mascarado)
      : h('span', { class: 'cp-mudo', text: 'Qualquer pessoa' })),
    h('td', { class: 'r', text: usosTxt(c) }),
    h('td', { text: validadeTxt(c) }),
    h('td', {}, pill(c)),
    h('td', { class: 'go' }, icone('caret-right')));
}

// ── Janela de visualização ──
const bloco = (rotulo, ...filhos) => h('section', { class: 'cp-info' }, h('h4', { text: rotulo }), ...filhos);

export function corpoVerCupom(c) {
  const restam = c.limite_usos != null ? Math.max(0, c.limite_usos - c.usos) : null;
  return h('div', {},
    bloco('Descrição', h('p', { class: 'cp-txt' + (c.descricao ? '' : ' mudo'), text: c.descricao || 'Sem descrição.' })),
    bloco('Desconto',
      h('p', { class: 'cp-grande', text: descontoTxt(c) }),
      h('p', { class: 'cp-txt mudo', text: c.tipo_desconto === 'percentual' ? 'Desconto em porcentagem.' : 'Desconto em valor fixo.' })),
    bloco('Quem pode usar',
      h('p', { class: 'cp-txt', text: c.cpf_mascarado ? `Somente o CPF ${c.cpf_mascarado}.` : 'Qualquer pessoa.' })),
    bloco('Quantidade de usos',
      h('p', { class: 'cp-txt', text: c.limite_usos == null ? `${c.usos} ${c.usos === 1 ? 'uso' : 'usos'} até agora. Sem limite.` : `${c.usos} de ${c.limite_usos} usos. ${restam === 0 ? 'Esgotado.' : `Restam ${restam}.`}` }),
      c.limite_usos != null ? h('div', { class: 'cp-barra' }, h('span', { style: `width:${Math.min(100, c.usos * 100 / c.limite_usos)}%` })) : null),
    bloco('Validade',
      h('p', { class: 'cp-txt' + (c.valido_ate ? '' : ' mudo'), text: c.valido_ate ? `Válido até ${dataBr(c.valido_ate)}.` : 'Sem prazo de validade.' })));
}
