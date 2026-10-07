// modules/especialidades/module.js — tabela + modais (leitura, cadastro/edição)
import * as data from './data.js';
import { salvar, alterarStatus, remover, validar, maiusculo } from './actions.js';
import { h, plural, avatar, linhaTabela, itemRegiao, chipUF, vazio, vazioTabela, detalheEsp } from './ui.js';

let vivo = false, limpar = () => {};
const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt');
const porCidade = (a, b) => a.cidade.localeCompare(b.cidade, 'pt');

// rascunho do formulário × cópia "como está salva" (para saber se há alteração)
const novoDraft = e => ({ nome: e?.nome ?? '', descricao: e?.descricao ?? '', status: e ? e.status : true, regioes: new Set(e?.regioes ?? []) });
const plano = d => ({ nome: d.nome, descricao: d.descricao, status: d.status, regioes: [...d.regioes].sort((a, b) => a - b) });

export default {
  estilo: 'modules/especialidades/style.css',
  desmontar() { vivo = false; limpar(); },

  async montar({ conteudo, filtros, Auth }) {
    vivo = true; data.iniciar(Auth);

    conteudo.innerHTML = `
      <div class="es">
        <header class="es-top">
          <div>
            <h1>Especialidades</h1>
            <p>Os serviços oferecidos e as cidades onde cada um é atendido.</p>
          </div>
          <button type="button" class="es-novo" id="es-novo"><i class="ph ph-plus"></i> Cadastrar especialidade</button>
        </header>
        <section class="es-main">
          <div class="es-bar">
            <div class="es-seg" id="es-seg" role="group" aria-label="Filtrar por status">
              <button type="button" data-v="">Todas <b id="es-st-all">0</b></button>
              <button type="button" data-v="1">Ativas <b id="es-st-a">0</b></button>
              <button type="button" data-v="0">Inativas <b id="es-st-i">0</b></button>
            </div>
            <span class="alerta" id="es-st-sbox" hidden><i class="ph ph-warning-circle"></i><span id="es-st-s">0</span>&nbsp;sem regiões</span>
            <span class="es-res" id="es-n"></span>
          </div>
          <div class="es-tw">
            <table class="es-tabela">
              <thead>
                <tr>
                  <th class="c-nome">Especialidade</th>
                  <th class="c-desc">Descrição</th>
                  <th class="c-reg">Regiões</th>
                  <th class="c-st">Status</th>
                  <th class="c-ac"><span class="sr">Ações</span></th>
                </tr>
              </thead>
              <tbody id="es-lista"></tbody>
            </table>
          </div>
        </section>
      </div>`;

    filtros.innerHTML = `
      <label class="es-lbl" for="es-q">Buscar</label>
      <input id="es-q" class="es-campo" type="search" maxlength="60" autocomplete="off" placeholder="Nome ou descrição">
      <label class="es-lbl" for="es-fs">Status</label>
      <select id="es-fs" class="es-campo"><option value="">Todas</option><option value="1">Ativas</option><option value="0">Inativas</option></select>
      <label class="es-lbl" for="es-fu">Disponível em</label>
      <select id="es-fu" class="es-campo"><option value="">Todos os estados</option></select>`;

    // Modal (fica no <body> para cobrir a tela toda; é removido ao sair do módulo)
    const ov = h('div', { class: 'es-ov', hidden: true });
    ov.innerHTML = `
      <div class="es-md" role="dialog" aria-modal="true" aria-labelledby="es-mt">
        <header class="es-mh">
          <span id="es-avw"></span>
          <div class="es-mh-t">
            <div class="es-mh-l"><h2 id="es-mt"></h2><span class="es-sd" id="es-mp" hidden></span></div>
            <p id="es-ms"></p>
          </div>
          <button type="button" class="es-x" id="es-x" aria-label="Fechar"><i class="ph ph-x"></i></button>
        </header>
        <div class="es-mb">
          <div id="es-ler"></div>
          <div id="es-form" hidden>
            <div class="es-sec">
              <span>Dados</span>
              <label class="es-sw"><input type="checkbox" id="es-status" checked><span class="es-trilho"></span><span id="es-sw-t">Ativa</span></label>
            </div>
            <label class="es-lbl" for="es-nome">Nome</label>
            <input id="es-nome" class="es-campo es-caps" maxlength="80" autocomplete="off" placeholder="EX.: ELETRICISTA">
            <label class="es-lbl" for="es-desc">Descrição <small id="es-cnt">0/500</small></label>
            <textarea id="es-desc" class="es-campo" rows="2" maxlength="500" placeholder="Opcional"></textarea>

            <div class="es-sec"><span>Regiões atendidas</span><b id="es-rn">0</b></div>
            <div class="es-ufs" id="es-ufs"></div>
            <input id="es-rq" class="es-campo" type="search" maxlength="60" autocomplete="off" placeholder="Buscar cidade" aria-label="Buscar cidade">
            <div class="es-rl-cab">
              <span id="es-uf-t"></span>
              <span class="ac"><button type="button" id="es-todas">Marcar todas</button><button type="button" id="es-nenhuma">Limpar</button></span>
            </div>
            <ul class="es-rl" id="es-rl"></ul>
            <p class="es-orf" id="es-orf" hidden><span id="es-orf-t"></span><button type="button" id="es-orf-b">Remover</button></p>
          </div>
        </div>
        <footer class="es-mf">
          <p id="es-msg" role="status"></p>
          <div class="es-acoes" id="es-acoes">
            <button type="button" class="es-ex" id="es-excluir" hidden><i class="ph ph-trash"></i> Excluir</button>
            <span class="es-esp"></span>
            <button type="button" class="btn-borda" id="es-fechar">Fechar</button>
            <button type="button" class="es-salvar" id="es-editar"><i class="ph ph-pencil-simple"></i> Editar</button>
            <button type="button" class="btn-borda" id="es-cancelar" hidden>Cancelar</button>
            <button type="button" class="es-salvar" id="es-salvar" hidden disabled>Salvar</button>
          </div>
          <div class="es-conf" id="es-conf" hidden>
            <span id="es-conf-t"></span>
            <button type="button" class="es-sim" id="es-sim">Excluir</button>
            <button type="button" class="btn-borda" id="es-nao">Cancelar</button>
          </div>
        </footer>
      </div>`;
    const toastEl = h('div', { class: 'es-toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(ov, toastEl);

    const $ = s => conteudo.querySelector(s) || filtros.querySelector(s) || ov.querySelector(s);
    let esp = [], regs = [], porId = new Map(), ufsReg = new Map();   // ufsReg: sigla → cidades cadastradas
    let sel = null, modo = null, draft = novoDraft(null), orig = plano(draft);   // modo: null | 'ler' | 'form'
    let ufAtual = '', ocupado = false, confirmando = null, tt = 0;     // confirmando: null | 'excluir' | 'descartar'

    const msg = t => { $('#es-msg').textContent = t; };
    const txtErro = (e, padrao) => (e?.servidor ? e.message : padrao);
    const sujo = () => JSON.stringify(plano(draft)) !== JSON.stringify(orig);
    const ufDe = e => [...new Set(e.regioes.map(i => porId.get(i)?.uf).filter(Boolean))].sort();
    const atual = () => esp.find(x => x.id === sel);

    function toast(t, erro) {
      toastEl.textContent = t; toastEl.classList.toggle('erro', !!erro); toastEl.classList.add('on');
      clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 3500);
    }

    // ── Tabela (com os filtros do painel) ──
    function renderLista() {
      const q = norm($('#es-q').value.trim()), fs = $('#es-fs').value, fu = $('#es-fu').value;
      const lista = esp.filter(e =>
        (!q || norm(e.nome).includes(q) || norm(e.descricao).includes(q)) &&
        (!fs || (fs === '1') === e.status) &&
        (!fu || ufDe(e).includes(fu)));
      $('#es-n').textContent = lista.length === esp.length ? '' : plural(lista.length, 'resultado', 'resultados');
      const ativas = esp.filter(e => e.status).length, sem = esp.filter(e => !e.regioes.length).length;
      $('#es-st-all').textContent = esp.length; $('#es-st-a').textContent = ativas; $('#es-st-i').textContent = esp.length - ativas;
      $('#es-st-s').textContent = sem; $('#es-st-sbox').hidden = !sem;
      $('#es-seg').querySelectorAll('button').forEach(x => { const on = x.dataset.v === fs; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      $('#es-lista').replaceChildren(...(lista.length
        ? lista.map(e => linhaTabela(e, { ufs: ufDe(e), onVer: () => abrirLer(e), onEditar: () => abrirForm(e), onStatus: () => trocarStatus(e) }))
        : [vazioTabela(
            h('i', { class: 'ph ph-magnifying-glass' }),
            h('span', { text: esp.length ? 'Nenhuma especialidade com esses filtros.' : 'Nenhuma especialidade cadastrada ainda.' }))]));
    }

    // ── Seletor de regiões: um estado por vez, só cidades cadastradas em "Regiões" ──
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

    // contador, resumo por estado e aviso de códigos que não existem mais em Regiões
    function resumo() {
      const por = new Map(); let orfas = 0;
      draft.regioes.forEach(i => { const u = porId.get(i)?.uf; u ? por.set(u, (por.get(u) || 0) + 1) : orfas++; });
      $('#es-rn').textContent = draft.regioes.size;
      $('#es-ufs').replaceChildren(...[...ufsReg.keys()].sort().map(u =>
        chipUF(u, por.get(u) || 0, u === ufAtual, () => { ufAtual = u; $('#es-rq').value = ''; renderRegioes(); resumo(); })));
      $('#es-orf').hidden = !orfas;
      if (orfas) $('#es-orf-t').textContent = `${plural(orfas, 'código não existe', 'códigos não existem')} mais em Regiões.`;
    }

    // tudo que depende do modo (leitura/formulário), do rascunho e da confirmação
    function estado() {
      if (!modo) return;
      const form = modo === 'form', s = form && sujo(), e = atual();
      $('#es-ler').hidden = form; $('#es-form').hidden = !form;
      $('#es-fechar').hidden = $('#es-editar').hidden = form;
      $('#es-cancelar').hidden = $('#es-salvar').hidden = !form;
      $('#es-excluir').hidden = !form || sel == null;
      $('#es-excluir').disabled = ocupado;
      $('#es-salvar').disabled = ocupado || !s;
      $('#es-cancelar').disabled = ocupado;
      $('#es-acoes').hidden = !!confirmando; $('#es-conf').hidden = !confirmando;
      $('#es-mt').textContent = form ? (sel == null ? 'Cadastrar especialidade' : 'Editar especialidade') : (e?.nome ?? '');
      const novo = form && sel == null;
      $('#es-avw').replaceChildren(avatar(novo ? 'Novo' : (e?.nome ?? ''), novo ? 'plus' : null));
      const pill = $('#es-mp');
      pill.hidden = form || !e;
      if (!pill.hidden) { pill.className = 'es-sd ' + (e.status ? 'on' : 'off'); pill.textContent = e.status ? 'Ativa' : 'Inativa'; }
      $('#es-ms').textContent = form
        ? (s ? '● Alterações não salvas' : 'Preencha os dados e escolha as regiões atendidas.')
        : (e ? `${plural(e.regioes.length, 'cidade', 'cidades')} em ${plural(ufDe(e).length, 'estado', 'estados')}` : '');
      $('#es-ms').classList.toggle('sujo', s);
      if (confirmando) {
        const ex = confirmando === 'excluir';
        $('#es-conf-t').textContent = ex ? `Excluir ${e?.nome ?? ''}?` : 'Descartar as alterações?';
        $('#es-sim').textContent = ex ? 'Excluir' : 'Descartar';
        $('#es-nao').textContent = ex ? 'Cancelar' : 'Continuar editando';
      }
      if (form) {
        $('#es-sw-t').textContent = draft.status ? 'Ativa' : 'Inativa';
        $('#es-cnt').textContent = `${draft.descricao.length}/500`;
        resumo();
      }
    }

    const mostrar = () => { ov.hidden = false; document.body.style.overflow = 'hidden'; ov.querySelector('.es-mb').scrollTop = 0; };

    // Modal de leitura
    function abrirLer(e) {
      sel = e.id; modo = 'ler'; confirmando = null; msg('');
      $('#es-ler').replaceChildren(detalheEsp(e, porId));
      estado(); mostrar();
      $('#es-editar').focus();
    }

    // Modal de cadastro (null) ou edição
    function abrirForm(e) {
      sel = e ? e.id : null; draft = novoDraft(e); orig = plano(draft); modo = 'form'; confirmando = null; msg('');
      $('#es-nome').value = draft.nome; $('#es-desc').value = draft.descricao; $('#es-status').checked = draft.status;
      const uf = [...draft.regioes].map(i => porId.get(i)?.uf).find(Boolean);
      if (uf) ufAtual = uf;
      $('#es-rq').value = '';
      renderRegioes(); estado(); mostrar();
      const on = $('#es-ufs .on'); if (on) $('#es-ufs').scrollLeft = Math.max(0, on.offsetLeft - 48);
      $('#es-nome').focus();
    }

    function fechar(forcar) {
      if (ocupado || !modo) return;
      if (!forcar && modo === 'form' && sujo()) { confirmando = 'descartar'; return estado(); }
      ov.hidden = true; document.body.style.overflow = ''; modo = null; sel = null; confirmando = null; msg('');
    }

    // ── Ações ──
    async function trocarStatus(e) {
      if (ocupado) return; ocupado = true;
      const novo = !e.status;
      try {
        await alterarStatus(e.id, novo);
        e.status = novo;
        toast(`${e.nome} ${novo ? 'ativada' : 'desativada'}.`);
      } catch (err) { console.error(err); toast(txtErro(err, 'Não foi possível alterar. Tente novamente.'), true); }
      ocupado = false; renderLista();
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
        ocupado = false; fechar(true); renderLista();
        toast(nova ? `${r.nome} cadastrada.` : `${r.nome} atualizada.`);
      } catch (err) {
        console.error(err); ocupado = false; estado();
        msg(txtErro(err, 'Não foi possível salvar. Tente novamente.'));
      }
    }

    async function excluirForm() {
      const e = atual(); if (!e) return;
      ocupado = true; msg('Excluindo…'); estado();
      try {
        await remover(e.id);
        esp = esp.filter(x => x.id !== e.id);
        ocupado = false; fechar(true); renderLista();
        toast(`${e.nome} excluída.`);
      } catch (err) {
        console.error(err); ocupado = false; confirmando = null; estado();
        msg(txtErro(err, 'Não foi possível excluir. Tente novamente.'));
      }
    }

    // ── Eventos ──
    $('#es-q').oninput = $('#es-fs').oninput = $('#es-fu').oninput = () => renderLista();
    $('#es-novo').onclick = () => abrirForm(null);
    $('#es-seg').onclick = ev => { const x = ev.target.closest('button'); if (x) { $('#es-fs').value = x.dataset.v; renderLista(); } };

    $('#es-x').onclick = $('#es-fechar').onclick = $('#es-cancelar').onclick = () => fechar();
    ov.onmousedown = ev => { if (ev.target === ov) fechar(); };
    $('#es-editar').onclick = () => { const e = atual(); if (e) abrirForm(e); };
    const tecla = ev => {
      if (ev.key !== 'Escape' || ov.hidden) return;
      if (confirmando) { confirmando = null; estado(); } else fechar();
    };
    document.addEventListener('keydown', tecla);

    $('#es-nome').oninput = ev => {
      const el = ev.target, a = el.selectionStart, b = el.selectionEnd, v = maiusculo(el.value);
      if (v !== el.value) { el.value = v; try { el.setSelectionRange(a, b); } catch (_) {} }   // caixa alta sem pular o cursor
      draft.nome = el.value; estado();
    };
    $('#es-nome').onkeydown = ev => { if (ev.key === 'Enter' && !$('#es-salvar').disabled) salvarForm(); };
    $('#es-desc').oninput = ev => { draft.descricao = ev.target.value; estado(); };
    $('#es-status').onchange = ev => { draft.status = ev.target.checked; estado(); };

    $('#es-rq').oninput = () => renderRegioes();
    $('#es-todas').onclick = () => { visiveis(norm($('#es-rq').value.trim())).forEach(r => draft.regioes.add(r.ibge_id)); renderRegioes(); estado(); };
    $('#es-nenhuma').onclick = () => { visiveis(norm($('#es-rq').value.trim())).forEach(r => draft.regioes.delete(r.ibge_id)); renderRegioes(); estado(); };
    $('#es-orf-b').onclick = () => { [...draft.regioes].filter(i => !porId.has(i)).forEach(i => draft.regioes.delete(i)); estado(); };

    $('#es-salvar').onclick = salvarForm;
    $('#es-excluir').onclick = () => { confirmando = 'excluir'; estado(); };
    $('#es-nao').onclick = () => { confirmando = null; estado(); };
    $('#es-sim').onclick = () => (confirmando === 'excluir' ? excluirForm() : fechar(true));

    limpar = () => {
      document.removeEventListener('keydown', tecla);
      clearTimeout(tt); ov.remove(); toastEl.remove(); document.body.style.overflow = '';
    };

    // ── Carga inicial ──
    function aplicarDados(d) {
      esp = [...d.especialidades].sort(porNome);
      regs = d.regioes.filter(r => r.uf);
      porId = new Map(regs.map(r => [r.ibge_id, r]));
      ufsReg = new Map();
      regs.forEach(r => { if (!ufsReg.has(r.uf)) ufsReg.set(r.uf, []); ufsReg.get(r.uf).push(r); });
      const ufs = [...ufsReg.keys()].sort();
      $('#es-fu').replaceChildren(h('option', { value: '', text: 'Todos os estados' }), ...ufs.map(u => h('option', { value: u, text: u })));
      $('#es-rq').disabled = $('#es-todas').disabled = $('#es-nenhuma').disabled = !ufs.length;
      ufAtual = ufs[0] || '';
      renderLista();
    }
    const carregar = async () => {
      $('#es-lista').replaceChildren(vazioTabela(h('span', { text: 'Carregando…' })));
      try { const d = await data.carregar(); if (vivo) aplicarDados(d); }
      catch (e) {
        console.error(e);
        if (vivo) $('#es-lista').replaceChildren(vazioTabela(
          h('span', { text: 'Não foi possível carregar.' }),
          h('button', { type: 'button', class: 'btn-borda', text: 'Tentar novamente', onclick: carregar })));
      }
    };
    await carregar();
  },
};