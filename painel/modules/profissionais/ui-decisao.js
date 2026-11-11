// modules/profissionais/ui-decisao.js — aprovar / reprovar uma etapa (só aparece quando a etapa está em análise)
import { MOTIVO_MAX, validarMotivo } from './actions.js';
import { h, icone, msg, trocar } from './ui.js';

export function decisao(etapa, aoDecidir) {
  const msgBox = h('div', { class: 'pf-msgs' });
  const aprovar = h('button', { type: 'button', class: 'pf-aprovar' }, icone('check'), ' Aprovar');
  const reprovar = h('button', { type: 'button', class: 'pf-reprovar' }, icone('x'), ' Reprovar');
  const campo = h('textarea', { class: 'pf-campo', rows: 3, maxlength: MOTIVO_MAX, placeholder: 'Explique o que precisa ser corrigido (de 5 a 300 caracteres)', 'aria-label': `Motivo da reprovação — ${etapa.titulo}` });
  const confirmar = h('button', { type: 'button', class: 'pf-reprovar cheio', text: 'Confirmar reprovação' });
  const cancelar = h('button', { type: 'button', class: 'pf-btn', text: 'Cancelar' });
  const formulario = h('div', { class: 'pf-fl', hidden: true }, h('label', { text: 'Motivo da reprovação' }), campo, h('div', { class: 'pf-linha' }, confirmar, cancelar));
  const botoes = [aprovar, reprovar, confirmar, cancelar];

  async function enviar(status) {
    if (status === 'reprovado') {
      const erro = validarMotivo(campo.value);
      if (erro) return trocar(msgBox, msg(erro, 'neg'));
    }
    botoes.forEach(b => { b.disabled = true; });
    trocar(msgBox, msg('Salvando…'));
    try { await aoDecidir(etapa.id, status, campo.value); }
    catch (e) { trocar(msgBox, msg(e.message, 'neg')); botoes.forEach(b => { b.disabled = false; }); }
  }
  aprovar.onclick = () => enviar('aprovado');
  reprovar.onclick = () => { formulario.hidden = false; reprovar.hidden = true; aprovar.hidden = true; campo.focus(); };
  cancelar.onclick = () => { formulario.hidden = true; reprovar.hidden = false; aprovar.hidden = false; msgBox.replaceChildren(); };
  confirmar.onclick = () => enviar('reprovado');
  campo.oninput = () => msgBox.replaceChildren();
  return h('div', { class: 'pf-decisao' }, h('div', { class: 'pf-linha' }, aprovar, reprovar), formulario, msgBox);
}
