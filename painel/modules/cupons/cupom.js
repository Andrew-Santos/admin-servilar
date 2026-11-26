// modules/cupons/cupom.js — janela (modal) do cupom: ver, cadastrar e editar
import { salvar, remover, validar, limparCodigo, soDigitos, formatarCpf, limparDecimal } from './actions.js';
import { h, icone } from './ui.js';
import { situacao, ROTULO, corpoVerCupom } from './ui-cupom.js';

// rascunho do formulário × cópia "como está salva" (para saber se há alteração)
// O CPF nunca vem preenchido (o servidor só devolve mascarado): `cpf` é o que a pessoa digitar, `cpfRemover` pede para tirar a restrição
const novoDraft = c => ({
  codigo: c?.codigo ?? '', descricao: c?.descricao ?? '', ativo: c ? c.ativo : true,
  tipo: c?.tipo_desconto ?? 'percentual', valor: c ? String(c.valor_desconto).replace('.', ',') : '',
  limite: c?.limite_usos != null ? String(c.limite_usos) : '', ate: c?.valido_ate ?? '',
  cpf: '', cpfRemover: false,
});
const plano = d => ({ ...d, codigo: limparCodigo(d.codigo), descricao: d.descricao.trim(), valor: d.valor.trim(), limite: d.limite.trim(), cpf: soDigitos(d.cpf) });

const FORM = `
  <div class="cp-fg">
    <label class="cp-lbl" for="cp-cod">Nome do cupom <small>O código que o cliente digita</small></label>
    <input id="cp-cod" class="cp-campo cp-up" maxlength="30" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="EX.: BEMVINDO10">
  </div>
  <div class="cp-fg">
    <label class="cp-lbl" for="cp-desc">Descrição <small id="cp-cnt">0/500</small></label>
    <textarea id="cp-desc" class="cp-campo" rows="3" maxlength="500" placeholder="Opcional. Ex.: Desconto de boas-vindas"></textarea>
  </div>
  <div class="cp-fg cp-dois">
    <div>
      <label class="cp-lbl" for="cp-tipo">Tipo de desconto</label>
      <select id="cp-tipo" class="cp-campo"><option value="percentual">Porcentagem (%)</option><option value="valor">Valor fixo (R$)</option></select>
    </div>
    <div>
      <label class="cp-lbl" for="cp-val">Desconto</label>
      <div class="cp-ad" id="cp-ad"><span id="cp-pre"></span><input id="cp-val" class="cp-campo num" inputmode="decimal" autocomplete="off" placeholder="0"></div>
    </div>
  </div>
  <div class="cp-fg">
    <label class="cp-lbl" for="cp-cpf">CPF exclusivo <small>Opcional: só essa pessoa poderá usar</small></label>
    <input id="cp-cpf" class="cp-campo" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00">
    <p class="cp-dica" id="cp-cpf-dica" hidden></p>
    <label class="cp-ck" id="cp-rm-l" hidden><input type="checkbox" id="cp-rm"><span>Remover a restrição de CPF (qualquer pessoa poderá usar)</span></label>
  </div>
  <div class="cp-fg cp-dois">
    <div>
      <label class="cp-lbl" for="cp-lim">Quantidade de usos <small>Vazio = ilimitado</small></label>
      <input id="cp-lim" class="cp-campo num" inputmode="numeric" maxlength="7" autocomplete="off" placeholder="Ilimitado">
    </div>
    <div>
      <label class="cp-lbl" for="cp-ate">Válido até <small>Opcional</small></label>
      <input id="cp-ate" class="cp-campo" type="date">
    </div>
  </div>
  <div class="cp-fg cp-linha">
    <span class="cp-lbl">Status</span>
    <label class="cp-sw"><input type="checkbox" id="cp-ativo"><span class="cp-trilho"></span><span id="cp-st-t">Ativo</span></label>
  </div>`;

const RODAPE = `
  <p id="cp-msg" role="status"></p>
  <div class="cp-acoes" id="cp-acoes">
    <button type="button" class="cp-ex" id="cp-excluir" hidden>Excluir</button>
    <span class="cp-esp"></span>
    <button type="button" class="btn-borda" id="cp-cancelar">Cancelar</button>
    <button type="button" class="cp-salvar" id="cp-salvar" disabled>Salvar</button>
  </div>
  <div class="cp-conf" id="cp-conf" hidden>
    <span id="cp-conf-t"></span>
    <button type="button" class="cp-sim" id="cp-sim">Excluir</button>
    <button type="button" class="btn-borda" id="cp-nao">Cancelar</button>
  </div>`;

// ctx: { $, conteudo, toast, aoSalvar(registro, novo), aoExcluir(registro) }
export function criarCupom(ctx) {
  const { $, conteudo, toast } = ctx;
  let lista = [];
  let modo = null, sel = null;                  // modo: null | 'ver' | 'editar' | 'novo'; sel = id aberto
  let draft = novoDraft(null), orig = plano(draft);
  let ocupado = false, confirmando = null, aoDescartar = null;
  let ultimoFoco = null;                        // seletor do botão que abriu a janela (para devolver o foco ao fechar)

  const msg = t => { const m = $('#cp-msg'); if (m) m.textContent = t; };
  const txtErro = (e, padrao) => (e?.servidor ? e.message : padrao);
  const sujo = () => JSON.stringify(plano(draft)) !== JSON.stringify(orig);
  const ehForm = () => modo === 'novo' || modo === 'editar';
  const atual = () => lista.find(x => x.id === sel) ?? null;
  const foco = s => $(s)?.focus();

  // ── Modal ──
  function mostrar() { $('#cp-ov').hidden = false; conteudo.classList.add('cp-modal'); }
  function fecharModal() {
    modo = null; sel = null; confirmando = null; aoDescartar = null;
    $('#cp-ov').hidden = true; conteudo.classList.remove('cp-modal');
    if (ultimoFoco) $(ultimoFoco)?.focus();
  }
  function tentarFechar() {                       // X, Esc e clique fora
    if (ocupado || !modo) return;
    if (!ehForm() || !sujo()) return fecharModal();
    pedirDescarte(fecharModal);
  }
  function pedirDescarte(depois) { confirmando = 'descartar'; aoDescartar = depois; estado(); foco('#cp-sim'); }
  function cancelarForm() {                       // botão Cancelar: volta para a visualização (ou fecha, se era cadastro novo)
    const voltar = () => { const c = atual(); c ? abrirVer(c) : fecharModal(); };
    if (!sujo()) return voltar();
    pedirDescarte(voltar);
  }

  function abrirVer(c) { sel = c.id; modo = 'ver'; confirmando = null; renderModal(); mostrar(); foco('#cp-editar'); }
  function abrirForm(c) {                         // c = cupom a editar; null = cadastro novo
    sel = c ? c.id : null; modo = c ? 'editar' : 'novo'; draft = novoDraft(c); orig = plano(draft); confirmando = null;
    mostrar(); renderModal();   // mostra ANTES: focus() não funciona em elemento escondido
  }

  function renderModal() {
    const c = atual();
    const fechar = h('button', { type: 'button', class: 'cp-ib', title: 'Fechar', 'aria-label': 'Fechar', onclick: tentarFechar }, icone('x'));
    const dp = $('#cp-dp');
    $('#cp-sujo').hidden = true;
    if (modo === 'ver') {
      const s = situacao(c);
      $('#cp-dt').textContent = c.codigo;
      dp.hidden = false; dp.className = 'cp-pill ' + s; dp.textContent = ROTULO[s];
      $('#cp-dacoes').replaceChildren(
        h('button', { type: 'button', class: 'cp-ib', id: 'cp-editar', title: 'Editar', 'aria-label': 'Editar ' + c.codigo, onclick: () => abrirForm(c) }, icone('pencil-simple')),
        fechar);
      $('#cp-db').replaceChildren(corpoVerCupom(c));
      $('#cp-df').replaceChildren(h('div', { class: 'cp-acoes' }, h('span', { class: 'cp-esp' }),
        h('button', { type: 'button', class: 'btn-borda', text: 'Fechar', onclick: fecharModal })));
      $('#cp-db').scrollTop = 0;
    } else {
      $('#cp-dt').textContent = modo === 'novo' ? 'Cadastrar cupom' : 'Editar cupom';
      dp.hidden = true;
      $('#cp-dacoes').replaceChildren(fechar);
      $('#cp-db').innerHTML = FORM; $('#cp-df').innerHTML = RODAPE;   // HTML fixo, sem dados do usuário
      ligarForm();
    }
  }

  // ── Formulário ──
  function estado() {
    if (!ehForm()) return;
    const s = sujo(), c = confirmando, pct = draft.tipo === 'percentual';
    $('#cp-salvar').disabled = ocupado || !s;
    $('#cp-cancelar').disabled = ocupado;
    $('#cp-sujo').hidden = !s;
    $('#cp-excluir').hidden = modo !== 'editar';
    $('#cp-st-t').textContent = draft.ativo ? 'Ativo' : 'Inativo';
    $('#cp-cnt').textContent = `${draft.descricao.length}/500`;
    $('#cp-ad').classList.toggle('pct', pct);
    $('#cp-pre').textContent = pct ? '%' : 'R$';
    $('#cp-cpf').disabled = draft.cpfRemover;
    $('#cp-rm-l').hidden = !(modo === 'editar' && atual()?.cpf_mascarado);
    $('#cp-acoes').hidden = !!c; $('#cp-conf').hidden = !c;
    if (c) {
      $('#cp-conf-t').textContent = c === 'excluir' ? `Excluir ${atual()?.codigo ?? 'o cupom'}?` : 'Descartar as alterações?';
      $('#cp-sim').textContent = c === 'excluir' ? 'Excluir' : 'Descartar';
      $('#cp-nao').textContent = c === 'excluir' ? 'Cancelar' : 'Continuar editando';
    }
  }

  function ligarForm() {
    const c = atual();
    $('#cp-cod').value = draft.codigo; $('#cp-desc').value = draft.descricao; $('#cp-tipo').value = draft.tipo;
    $('#cp-val').value = draft.valor; $('#cp-lim').value = draft.limite; $('#cp-ate').value = draft.ate; $('#cp-ativo').checked = draft.ativo;
    if (modo === 'editar' && c?.cpf_mascarado) {
      const d = $('#cp-cpf-dica'); d.hidden = false;
      d.textContent = `CPF atual: ${c.cpf_mascarado}. Para trocar, digite outro CPF.`;
    }

    $('#cp-cod').oninput = ev => {                // caixa alta e só caracteres permitidos, sem pular o cursor
      const el = ev.target, pos = el.selectionStart, v = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (v !== el.value) { const dif = el.value.length - v.length; el.value = v; try { el.setSelectionRange(Math.max(0, pos - dif), Math.max(0, pos - dif)); } catch (_) {} }
      draft.codigo = el.value; estado();
    };
    $('#cp-cod').onkeydown = ev => { if (ev.key === 'Enter' && !$('#cp-salvar').disabled) salvarForm(); };
    $('#cp-desc').oninput = ev => { draft.descricao = ev.target.value; estado(); };
    $('#cp-tipo').onchange = ev => { draft.tipo = ev.target.value; estado(); };
    $('#cp-val').oninput = ev => { ev.target.value = limparDecimal(ev.target.value); draft.valor = ev.target.value; estado(); };
    $('#cp-cpf').oninput = ev => { ev.target.value = formatarCpf(ev.target.value); draft.cpf = ev.target.value; estado(); };
    $('#cp-rm').onchange = ev => {
      draft.cpfRemover = ev.target.checked;
      if (draft.cpfRemover) { draft.cpf = ''; $('#cp-cpf').value = ''; }
      estado();
    };
    $('#cp-lim').oninput = ev => { ev.target.value = ev.target.value.replace(/\D/g, '').slice(0, 7); draft.limite = ev.target.value; estado(); };
    $('#cp-ate').onchange = ev => { draft.ate = ev.target.value; estado(); };
    $('#cp-ativo').onchange = ev => { draft.ativo = ev.target.checked; estado(); };

    $('#cp-salvar').onclick = salvarForm;
    $('#cp-cancelar').onclick = cancelarForm;
    $('#cp-excluir').onclick = () => {
      const n = atual()?.usos ?? 0;   // cupom já usado não se exclui (o servidor também recusa): desative
      if (n) return msg(`Este cupom já foi usado ${n === 1 ? '1 vez' : n + ' vezes'}. Desative-o em vez de excluir.`);
      confirmando = 'excluir'; estado(); foco('#cp-sim');
    };
    $('#cp-nao').onclick = () => { confirmando = null; estado(); foco(modo === 'editar' ? '#cp-excluir' : '#cp-cancelar'); };
    $('#cp-sim').onclick = () => (confirmando === 'excluir' ? excluirForm() : aoDescartar?.());

    estado(); foco('#cp-cod');
  }

  async function salvarForm() {
    const erro = validar(draft);
    if (erro) return msg(erro);
    ocupado = true; msg('Salvando…'); estado();
    const novo = sel == null;
    try {
      const r = await salvar(sel, draft);
      ctx.aoSalvar(r, novo);   // a tela principal atualiza a lista e devolve os dados por definir()
      ocupado = false;
      if (novo) fecharModal(); else abrirVer(r);
      toast(novo ? 'Cupom cadastrado.' : 'Alterações salvas.');
    } catch (err) {
      console.error(err.message); ocupado = false; estado();   // sem imprimir o corpo (pode ter CPF)
      msg(txtErro(err, 'Não foi possível salvar. Tente novamente.'));
    }
  }

  async function excluirForm() {
    const c = atual(); if (!c) return;
    ocupado = true; msg('Excluindo…'); estado();
    try {
      await remover(c.id);
      ctx.aoExcluir(c);
      ocupado = false; fecharModal();
      toast(`${c.codigo} excluído.`);
    } catch (err) {
      console.error(err.message); ocupado = false; confirmando = null; estado();
      msg(txtErro(err, 'Não foi possível excluir. Tente novamente.'));
    }
  }

  $('#cp-ov').onmousedown = ev => { if (ev.target === $('#cp-ov')) tentarFechar(); };
  const teclas = ev => {
    if (!modo) return;
    if (ev.key === 'Escape') { ev.preventDefault(); return tentarFechar(); }
    if (ev.key !== 'Tab') return;
    const dlg = $('#cp-dlg'), a = document.activeElement;
    const foc = [...dlg.querySelectorAll('button,input,select,textarea,a[href]')].filter(el => !el.disabled && !el.closest('[hidden]'));
    if (!foc.length) return;
    if (!dlg.contains(a)) { ev.preventDefault(); foc[0].focus(); }
    else if (ev.shiftKey && a === foc[0]) { ev.preventDefault(); foc.at(-1).focus(); }
    else if (!ev.shiftKey && a === foc.at(-1)) { ev.preventDefault(); foc[0].focus(); }
  };
  document.addEventListener('keydown', teclas);

  return {
    definir: ({ cupons }) => { if (cupons) lista = cupons; },
    ver: (c, origem) => { ultimoFoco = origem; abrirVer(c); },
    cadastrar: origem => { ultimoFoco = origem; abrirForm(null); },
    desligar: () => document.removeEventListener('keydown', teclas),
  };
}
