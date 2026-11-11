// modules/profissionais/ui-bloqueio.js — bloquear / desbloquear o profissional, sempre com motivo
import { MOTIVOS_BLOQUEIO, MOTIVO_MAX, formatarData, validarBloqueio } from './actions.js';
import { h, icone, msg, trocar } from './ui.js';

// ctx = { aoBloquear(motivo, detalhe), aoDesbloquear() } — cada um devolve uma promessa
export function blocoBloqueio(p, ctx) {
  const msgBox = h('div', { class: 'pf-msgs' });
  const envolver = async (botoes, fn) => {
    botoes.forEach(b => { b.disabled = true; });
    trocar(msgBox, msg('Salvando…'));
    try { await fn(); }
    catch (e) { trocar(msgBox, msg(e.message, 'neg')); botoes.forEach(b => { b.disabled = false; }); }
  };

  if (p.status === 'bloqueado') {
    const b = p.bloqueio;
    const desbloquear = h('button', { type: 'button', class: 'pf-btn', text: 'Desbloquear profissional' });
    desbloquear.onclick = () => envolver([desbloquear], ctx.aoDesbloquear);
    return h('section', { class: 'pf-bloq ativo' },
      h('h3', {}, icone('prohibit'), ' Profissional bloqueado'),
      b?.motivo_texto ? h('p', { class: 'pf-bloq-motivo', text: b.motivo_texto }) : null,
      b?.detalhe ? h('p', { class: 'pf-info', text: b.detalhe }) : null,
      b?.em ? h('p', { class: 'pf-info', text: `Em ${formatarData(b.em)}${b.por ? ' por ' + b.por : ''}` }) : null,
      h('p', { class: 'pf-info', text: 'Ele não consegue entrar no painel do parceiro enquanto estiver bloqueado.' }),
      desbloquear, msgBox);
  }

  const motivo = h('select', { class: 'pf-campo', 'aria-label': 'Motivo do bloqueio' }, h('option', { value: '', text: 'Escolha o motivo…' }), ...MOTIVOS_BLOQUEIO.map(m => h('option', { value: m.id, text: m.texto })));
  const detalhe = h('textarea', { class: 'pf-campo', rows: 3, maxlength: MOTIVO_MAX, placeholder: 'Detalhes (obrigatório em "Outro motivo")', 'aria-label': 'Detalhes do bloqueio' });
  const confirmar = h('button', { type: 'button', class: 'pf-reprovar cheio', text: 'Confirmar bloqueio' });
  const cancelar = h('button', { type: 'button', class: 'pf-btn', text: 'Cancelar' });
  const abrir = h('button', { type: 'button', class: 'pf-reprovar' }, icone('prohibit'), ' Bloquear profissional');
  const form = h('div', { class: 'pf-fl', hidden: true }, motivo, detalhe, h('div', { class: 'pf-linha' }, confirmar, cancelar));

  abrir.onclick = () => { form.hidden = false; abrir.hidden = true; motivo.focus(); };
  cancelar.onclick = () => { form.hidden = true; abrir.hidden = false; msgBox.replaceChildren(); };
  confirmar.onclick = () => {
    const erro = validarBloqueio(motivo.value, detalhe.value);
    if (erro) return trocar(msgBox, msg(erro, 'neg'));
    envolver([confirmar, cancelar], () => ctx.aoBloquear(motivo.value, detalhe.value));
  };
  return h('section', { class: 'pf-bloq' }, abrir, form, msgBox);
}
