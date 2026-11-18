// modules/servicos/especialidade.js — janela (modal) da especialidade: ver, cadastrar, editar e escolher regiões
import { salvar, remover, validar } from './actions-especialidade.js';
import { maiusculo } from './actions-comum.js';
import { h, icone, plural, norm } from './ui.js';
import { vazio, corpoVerEspecialidade, itemRegiao, chipUF } from './ui-especialidade.js';

const porCidade = (a, b) => a.cidade.localeCompare(b.cidade, 'pt');

// rascunho do formulário × cópia "como está salva" (para saber se há alteração)
const novoDraft = e => ({ nome: e?.nome ?? '', descricao: e?.descricao ?? '', status: e ? e.status : true, regioes: new Set(e?.regioes ?? []) });
const plano = d => ({ nome: d.nome, descricao: d.descricao, status: d.status, regioes: [...d.regioes].sort((a, b) => a - b) });

const FORM = `
  <div class="es-fg">
    <label class="es-lbl" for="es-nome">Nome</label>
    <input id="es-nome" class="es-campo es-caps" maxlength="80" autocomplete="off" placeholder="EX.: ELETRICISTA">
  </div>
  <div class="es-fg">
    <label class="es-lbl" for="es-desc">Descrição <small id="es-cnt">0/500</small></label>
    <textarea id="es-desc" class="es-campo" rows="3" maxlength="500" placeholder="Opcional"></textarea>
  </div>
  <div class="es-fg es-linha">
    <span class="es-lbl">Status</span>
    <label class="es-sw"><input type="checkbox" id="es-status"><span class="es-trilho"></span><span id="es-st-t">Ativa</span></label>
  </div>
  <div class="es-sec"><span>Regiões atendidas</span><b id="es-rn">0</b></div>
  <div class="es-ufs" id="es-ufs"></div>
  <input id="es-rq" class="es-campo" type="search" maxlength="60" autocomplete="off" placeholder="Buscar cidade" aria-label="Buscar cidade">
  <div class="es-rl-cab"><span id="es-uf-t"></span><span class="ac"><button type="button" id="es-todas">Marcar todas</button><button type="button" id="es-nenhuma">Limpar</button></span></div>
  <ul class="es-rl" id="es-rl"></ul>
  <p class="es-orf" id="es-orf" hidden><span id="es-orf-t"></span><button type="button" id="es-orf-b">Remover</button></p>`;

const RODAPE = `
  <p id="es-msg" role="status"></p>
  <div class="es-acoes" id="es-acoes">
    <button type="button" class="es-ex" id="es-excluir" hidden>Excluir</button>
    <span class="es-esp"></span>
    <button type="button" class="btn-borda" id="es-cancelar">Cancelar</button>
    <button type="button" class="es-salvar" id="es-salvar" disabled>Salvar</button>
  </div>
  <div class="es-conf" id="es-conf" hidden>
    <span id="es-conf-t"></span>
    <button type="button" class="es-sim" id="es-sim">Excluir</button>
    <button type="button" class="btn-borda" id="es-nao">Cancelar</button>
  </div>`;


// ctx: { $, conteudo, toast, qtdServicos(id), aoSalvar(registro, nova), aoExcluir(registro) }
export function criarEspecialidade(ctx) {
  const { $, conteudo, toast } = ctx;
  let esp = [], regs = [], porId = new Map(), ufsReg = new Map();   // ufsReg: sigla → cidades cadastradas (vem de definir())
  let modo = null, sel = null;                  // modo: null | 'ver' | 'editar' | 'novo'; sel = id aberto
  let draft = novoDraft(null), orig = plano(draft);
  let ufAtual = '', ocupado = false, confirmando = null, aoDescartar = null;
  let ultimoFoco = null;                        // seletor do botão que abriu a janela (para devolver o foco ao fechar)

  const msg = t => { const m = $('#es-msg'); if (m) m.textContent = t; };
  const txtErro = (e, padrao) => (e?.servidor ? e.message : padrao);
  const sujo = () => JSON.stringify(plano(draft)) !== JSON.stringify(orig);
  const ehForm = () => modo === 'novo' || modo === 'editar';
  const ufDe = e => [...new Set(e.regioes.map(i => porId.get(i)?.uf).filter(Boolean))].sort();
  const foco = s => $(s)?.focus();

  // A tela principal entrega a lista de especialidades e (na carga) as regiões cadastradas
  function definir({ esp: lista, regioes }) {
    if (lista) esp = lista;
    if (!regioes) return;
    regs = regioes.filter(r => r.uf);
    porId = new Map(regs.map(r => [r.ibge_id, r]));
    ufsReg = new Map();
    regs.forEach(r => { if (!ufsReg.has(r.uf)) ufsReg.set(r.uf, []); ufsReg.get(r.uf).push(r); });
    ufAtual = [...ufsReg.keys()].sort()[0] || '';
  }

  // ── Modal ──
  function mostrar() { $('#es-ov').hidden = false; conteudo.classList.add('es-modal'); }
  function fecharModal() {
    modo = null; sel = null; confirmando = null; aoDescartar = null;
    $('#es-ov').hidden = true; conteudo.classList.remove('es-modal');
    if (ultimoFoco) $(ultimoFoco)?.focus();
  }
  function tentarFechar() {                       // X, Esc e clique fora
    if (ocupado || !modo) return;
    if (!ehForm() || !sujo()) return fecharModal();
    pedirDescarte(fecharModal);
  }
  function pedirDescarte(depois) { confirmando = 'descartar'; aoDescartar = depois; estado(); foco('#es-sim'); }
  function cancelarForm() {                       // botão Cancelar: volta para a visualização (ou fecha, se era cadastro novo)
    const voltar = () => { const e = esp.find(x => x.id === sel); e ? abrirVer(e) : fecharModal(); };
    if (!sujo()) return voltar();
    pedirDescarte(voltar);
  }

  function abrirVer(e) {
    sel = e.id; modo = 'ver'; confirmando = null; renderModal(); mostrar(); foco('#es-editar');
  }
  function abrirForm(e) {                         // e = especialidade a editar; null = cadastro novo
    sel = e ? e.id : null; modo = e ? 'editar' : 'novo'; draft = novoDraft(e); orig = plano(draft); confirmando = null;
    mostrar(); renderModal();   // mostra ANTES: focus() não funciona em elemento escondido
  }

  function renderModal() {
    const e = esp.find(x => x.id === sel) ?? null;
    const fechar = h('button', { type: 'button', class: 'es-ib', title: 'Fechar', 'aria-label': 'Fechar', onclick: tentarFechar }, icone('x'));
    const dp = $('#es-dp');
    $('#es-sujo').hidden = true;
    if (modo === 'ver') {
      $('#es-dt').textContent = e.nome;
      dp.hidden = false; dp.className = 'es-pill ' + (e.status ? 'on' : 'off'); dp.textContent = e.status ? 'Ativa' : 'Inativa';
      $('#es-dacoes').replaceChildren(
        h('button', { type: 'button', class: 'es-ib', id: 'es-editar', title: 'Editar', 'aria-label': 'Editar ' + e.nome, onclick: () => abrirForm(e) }, icone('pencil-simple')),
        fechar);
      $('#es-db').replaceChildren(corpoVerEspecialidade(e, porId));
      $('#es-df').replaceChildren(h('div', { class: 'es-acoes' }, h('span', { class: 'es-esp' }, ),
        h('button', { type: 'button', class: 'btn-borda', text: 'Fechar', onclick: fecharModal })));
      $('#es-db').scrollTop = 0;
    } else {
      $('#es-dt').textContent = modo === 'novo' ? 'Cadastrar especialidade' : 'Editar especialidade';
      dp.hidden = true;
      $('#es-dacoes').replaceChildren(fechar);
      $('#es-db').innerHTML = FORM; $('#es-df').innerHTML = RODAPE;
      ligarForm();
    }
  }

  // ── Formulário ──
  const visiveis = q => (ufsReg.get(ufAtual) || [])
    .filter(r => (r.ativo !== false || draft.regioes.has(r.ibge_id)) && (!q || norm(r.cidade).includes(q)))
    .sort(porCidade);

  function renderRegioes() {
    const ul = $('#es-rl');
    if (!regs.length) return ul.replaceChildren(vazio('Nenhuma cidade cadastrada em Regiões ainda.', h('a', { href: '#/regioes', text: 'Cadastrar cidades' })));
    const q = norm($('#es-rq').value.trim()), lista = visiveis(q);
    $('#es-uf-t').textContent = ufAtual ? `${ufAtual} · ${plural(visiveis('').length, 'cidade', 'cidades')}` : '';
    ul.replaceChildren(...(lista.length
      ? lista.map(r => itemRegiao(r, draft.regioes.has(r.ibge_id), on => { on ? draft.regioes.add(r.ibge_id) : draft.regioes.delete(r.ibge_id); estado(); }))
      : [vazio(q ? 'Nenhuma cidade encontrada.' : 'Sem cidades ativas neste estado.')]));
  }

  function resumo() {   // contador, abas de estado e aviso de códigos que não existem mais em Regiões
    const por = new Map(); let orfas = 0;
    draft.regioes.forEach(i => { const u = porId.get(i)?.uf; u ? por.set(u, (por.get(u) || 0) + 1) : orfas++; });
    $('#es-rn').textContent = draft.regioes.size;
    $('#es-ufs').replaceChildren(...[...ufsReg.keys()].sort().map(u =>
      chipUF(u, por.get(u) || 0, u === ufAtual, () => { ufAtual = u; $('#es-rq').value = ''; renderRegioes(); resumo(); })));
    $('#es-orf').hidden = !orfas;
    if (orfas) $('#es-orf-t').textContent = `${plural(orfas, 'código não existe', 'códigos não existem')} mais em Regiões.`;
  }

  function estado() {
    if (!ehForm()) return;
    const s = sujo(), c = confirmando;
    $('#es-salvar').disabled = ocupado || !s;
    $('#es-cancelar').disabled = ocupado;
    $('#es-sujo').hidden = !s;
    $('#es-excluir').hidden = modo !== 'editar';
    $('#es-st-t').textContent = draft.status ? 'Ativa' : 'Inativa';
    $('#es-cnt').textContent = `${draft.descricao.length}/500`;
    $('#es-acoes').hidden = !!c; $('#es-conf').hidden = !c;
    if (c) {
      $('#es-conf-t').textContent = c === 'excluir' ? `Excluir ${draft.nome}?` : 'Descartar as alterações?';
      $('#es-sim').textContent = c === 'excluir' ? 'Excluir' : 'Descartar';
      $('#es-nao').textContent = c === 'excluir' ? 'Cancelar' : 'Continuar editando';
    }
    resumo();
  }

  function ligarForm() {
    $('#es-nome').value = draft.nome; $('#es-desc').value = draft.descricao; $('#es-status').checked = draft.status;
    const uf = [...draft.regioes].map(i => porId.get(i)?.uf).find(Boolean);
    if (uf) ufAtual = uf;

    $('#es-nome').oninput = ev => {
      const el = ev.target, a = el.selectionStart, b = el.selectionEnd, v = maiusculo(el.value);
      if (v !== el.value) { el.value = v; try { el.setSelectionRange(a, b); } catch (_) {} }   // caixa alta sem pular o cursor
      draft.nome = el.value; estado();
    };
    $('#es-nome').onkeydown = ev => { if (ev.key === 'Enter' && !$('#es-salvar').disabled) salvarForm(); };
    $('#es-desc').oninput = ev => { draft.descricao = ev.target.value; estado(); };
    $('#es-status').onchange = ev => { draft.status = ev.target.checked; estado(); };
    $('#es-rq').oninput = () => renderRegioes();
    $('#es-rq').disabled = $('#es-todas').disabled = $('#es-nenhuma').disabled = !ufsReg.size;
    $('#es-todas').onclick = () => { visiveis(norm($('#es-rq').value.trim())).forEach(r => draft.regioes.add(r.ibge_id)); renderRegioes(); estado(); };
    $('#es-nenhuma').onclick = () => { visiveis(norm($('#es-rq').value.trim())).forEach(r => draft.regioes.delete(r.ibge_id)); renderRegioes(); estado(); };
    $('#es-orf-b').onclick = () => { [...draft.regioes].filter(i => !porId.has(i)).forEach(i => draft.regioes.delete(i)); estado(); };

    $('#es-salvar').onclick = salvarForm;
    $('#es-cancelar').onclick = cancelarForm;
    $('#es-excluir').onclick = () => {
      const n = ctx.qtdServicos(sel);   // especialidade com serviços não pode ser excluída
      if (n) return msg(`Esta especialidade tem ${plural(n, 'serviço', 'serviços')}. Exclua ou mova ${n === 1 ? 'o serviço' : 'os serviços'} antes de excluí-la.`);
      confirmando = 'excluir'; estado(); foco('#es-sim');
    };
    $('#es-nao').onclick = () => { confirmando = null; estado(); foco(modo === 'editar' ? '#es-excluir' : '#es-cancelar'); };
    $('#es-sim').onclick = () => (confirmando === 'excluir' ? excluirForm() : aoDescartar?.());

    renderRegioes(); estado();
    const on = $('#es-ufs .on'); if (on) $('#es-ufs').scrollLeft = Math.max(0, on.offsetLeft - 48);   // deixa o estado atual à vista
    foco('#es-nome');
  }

  async function salvarForm() {
    const erro = validar(draft);
    if (erro) return msg(erro);
    ocupado = true; msg('Salvando…'); estado();
    const nova = sel == null;
    try {
      const r = await salvar(sel, draft);
      ctx.aoSalvar(r, nova);   // a tela principal atualiza a lista e devolve os dados por definir()
      ocupado = false;
      if (nova) fecharModal(); else abrirVer(r);
      toast(nova ? 'Especialidade cadastrada.' : 'Alterações salvas.');
    } catch (err) {
      console.error(err); ocupado = false; estado();
      msg(txtErro(err, 'Não foi possível salvar. Tente novamente.'));
    }
  }

  async function excluirForm() {
    const e = esp.find(x => x.id === sel); if (!e) return;
    ocupado = true; msg('Excluindo…'); estado();
    try {
      await remover(e.id);
      ctx.aoExcluir(e);
      ocupado = false; fecharModal();
      toast(`${e.nome} excluída.`);
    } catch (err) {
      console.error(err); ocupado = false; confirmando = null; estado();
      msg(txtErro(err, 'Não foi possível excluir. Tente novamente.'));
    }
  }


  $('#es-ov').onmousedown = ev => { if (ev.target === $('#es-ov')) tentarFechar(); };
  const teclas = ev => {
    if (!modo) return;
    if (ev.key === 'Escape') { ev.preventDefault(); return tentarFechar(); }
    if (ev.key !== 'Tab') return;
    const dlg = $('#es-dlg'), a = document.activeElement;
    const foc = [...dlg.querySelectorAll('button,input,select,textarea,a[href]')].filter(el => !el.disabled && !el.closest('[hidden]'));
    if (!foc.length) return;
    if (!dlg.contains(a)) { ev.preventDefault(); foc[0].focus(); }
    else if (ev.shiftKey && a === foc[0]) { ev.preventDefault(); foc.at(-1).focus(); }
    else if (!ev.shiftKey && a === foc.at(-1)) { ev.preventDefault(); foc[0].focus(); }
  };
  document.addEventListener('keydown', teclas);

  return {
    definir,
    ufs: () => [...ufsReg.keys()].sort(),
    ufDe,
    ver: (e, origem) => { ultimoFoco = origem; abrirVer(e); },
    cadastrar: origem => { ultimoFoco = origem; abrirForm(null); },
    desligar: () => document.removeEventListener('keydown', teclas),
  };
}
