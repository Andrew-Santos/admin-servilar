// modules/especialidades/module.js
import * as data from './data.js';
import { salvar, remover, validar, maiusculo } from './actions.js';
import { h, icone, plural, vazio, vazioTb, linhaTb, pill, corpoVer, itemRegiao, chipUF } from './ui.js';

let vivo = false, timer = 0, limpar = null;
const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt');
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

export default {
  estilo: 'modules/especialidades/style.css',
  desmontar() { vivo = false; clearTimeout(timer); limpar?.(); limpar = null; },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);
    conteudo.innerHTML = `
      <div class="es">
        <section class="es-main">
          <div class="es-bar">
            <div class="es-tit"><h2>Especialidades</h2><b id="es-n">0</b><span class="es-sub"><span id="es-sub"></span><span class="w" id="es-sub-w"></span></span></div>
            <button type="button" class="es-novo" id="es-novo"><i class="ph ph-plus"></i> Cadastrar especialidade</button>
          </div>
          <div class="es-tbw">
            <table class="es-tb">
              <colgroup><col class="c-nome"><col class="c-desc"><col class="c-reg"><col class="c-st"><col class="c-go"></colgroup>
              <thead><tr><th>Especialidade</th><th>Descrição</th><th>Regiões</th><th>Status</th><th></th></tr></thead>
              <tbody id="es-lista"></tbody>
            </table>
          </div>
        </section>
        <div class="es-ov" id="es-ov" hidden>
          <div class="es-dlg" id="es-dlg" role="dialog" aria-modal="true" aria-labelledby="es-dt" tabindex="-1">
            <header class="es-dh">
              <h3 id="es-dt"></h3><span id="es-dp" class="es-pill" hidden></span><small class="es-sujo" id="es-sujo" hidden>● não salva</small>
              <span class="es-dacoes" id="es-dacoes"></span>
            </header>
            <div class="es-db" id="es-db"></div>
            <footer class="es-df" id="es-df"></footer>
          </div>
        </div>
        <div class="es-toast" id="es-toast" role="status" aria-live="polite" hidden></div>
      </div>`;
    filtros.innerHTML = `
      <label class="es-lbl" for="es-q">Buscar</label>
      <input id="es-q" class="es-campo" type="search" maxlength="60" autocomplete="off" placeholder="Nome ou descrição">
      <label class="es-lbl" for="es-fs">Status</label>
      <select id="es-fs" class="es-campo"><option value="">Todas</option><option value="1">Ativas</option><option value="0">Inativas</option></select>
      <label class="es-lbl" for="es-fu">Disponível em</label>
      <select id="es-fu" class="es-campo"><option value="">Todos os estados</option></select>`;

    const $ = s => conteudo.querySelector(s) || filtros.querySelector(s);
    let esp = [], regs = [], porId = new Map(), ufsReg = new Map();   // ufsReg: sigla → cidades cadastradas
    let modo = null, sel = null;                  // modo: null | 'ver' | 'editar' | 'novo'; sel = id aberto
    let draft = novoDraft(null), orig = plano(draft);
    let ufAtual = '', ocupado = false, confirmando = null, aoDescartar = null, ultimoFoco = null;

    const msg = t => { const m = $('#es-msg'); if (m) m.textContent = t; };
    const txtErro = (e, padrao) => (e?.servidor ? e.message : padrao);
    const sujo = () => JSON.stringify(plano(draft)) !== JSON.stringify(orig);
    const ehForm = () => modo === 'novo' || modo === 'editar';
    const ufDe = e => [...new Set(e.regioes.map(i => porId.get(i)?.uf).filter(Boolean))].sort();
    const foco = s => $(s)?.focus();
    function toast(t) {
      const el = $('#es-toast'); el.textContent = t; el.hidden = false;
      clearTimeout(timer); timer = setTimeout(() => { el.hidden = true; }, 3200);
    }

    // ── Tabela (com os filtros do painel) ──
    function renderTabela() {
      const q = norm($('#es-q').value.trim()), fs = $('#es-fs').value, fu = $('#es-fu').value;
      const lista = esp.filter(e =>
        (!q || norm(e.nome).includes(q) || norm(e.descricao).includes(q)) &&
        (!fs || (fs === '1') === e.status) &&
        (!fu || ufDe(e).includes(fu)));
      $('#es-n').textContent = lista.length === esp.length ? esp.length : `${lista.length}/${esp.length}`;
      const ativas = esp.filter(e => e.status).length, sem = esp.filter(e => !e.regioes.length).length;
      $('#es-sub').textContent = `${plural(ativas, 'ativa', 'ativas')} · ${plural(esp.length - ativas, 'inativa', 'inativas')}`;
      $('#es-sub-w').textContent = sem ? ` · ${plural(sem, 'sem região', 'sem regiões')}` : '';
      $('#es-lista').replaceChildren(...(lista.length
        ? lista.map(e => linhaTb(e, { ufs: ufDe(e), onAbrir: ev => { ultimoFoco = ev.currentTarget.querySelector('button'); abrirVer(e); } }))
        : [vazioTb(esp.length ? 'Nenhuma especialidade com esses filtros.' : 'Nenhuma especialidade cadastrada ainda.')]));
    }

    // ── Modal ──
    function mostrar() { $('#es-ov').hidden = false; conteudo.classList.add('es-modal'); }
    function fecharModal() {
      modo = null; sel = null; confirmando = null; aoDescartar = null;
      $('#es-ov').hidden = true; conteudo.classList.remove('es-modal');
      if (ultimoFoco?.isConnected) ultimoFoco.focus();
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
        $('#es-db').replaceChildren(corpoVer(e, porId));
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
      $('#es-excluir').onclick = () => { confirmando = 'excluir'; estado(); foco('#es-sim'); };
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
        esp = nova ? [...esp, r] : esp.map(x => x.id === r.id ? r : x);
        esp.sort(porNome);
        ocupado = false; renderTabela();
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
        esp = esp.filter(x => x.id !== e.id);
        ocupado = false; renderTabela(); fecharModal();
        toast(`${e.nome} excluída.`);
      } catch (err) {
        console.error(err); ocupado = false; confirmando = null; estado();
        msg(txtErro(err, 'Não foi possível excluir. Tente novamente.'));
      }
    }

    // ── Eventos gerais ──
    $('#es-q').oninput = $('#es-fs').oninput = $('#es-fu').oninput = () => renderTabela();
    $('#es-novo').onclick = () => { ultimoFoco = $('#es-novo'); abrirForm(null); };
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
    limpar = () => document.removeEventListener('keydown', teclas);

    // ── Carga inicial ──
    function aplicarDados(d) {
      esp = [...d.especialidades].sort(porNome);
      regs = d.regioes.filter(r => r.uf);
      porId = new Map(regs.map(r => [r.ibge_id, r]));
      ufsReg = new Map();
      regs.forEach(r => { if (!ufsReg.has(r.uf)) ufsReg.set(r.uf, []); ufsReg.get(r.uf).push(r); });
      const ufs = [...ufsReg.keys()].sort();
      $('#es-fu').replaceChildren(h('option', { value: '', text: 'Todos os estados' }), ...ufs.map(u => h('option', { value: u, text: u })));
      ufAtual = ufs[0] || '';
      renderTabela();
    }
    const carregar = async () => {
      $('#es-lista').replaceChildren(vazioTb('Carregando…'));
      try { const d = await data.carregar(); if (vivo) aplicarDados(d); }
      catch (e) {
        console.error(e);
        if (vivo) $('#es-lista').replaceChildren(vazioTb('Não foi possível carregar.', h('button', { type: 'button', class: 'btn-borda', text: 'Tentar novamente', onclick: carregar })));
      }
    };
    await carregar();
  },
};
