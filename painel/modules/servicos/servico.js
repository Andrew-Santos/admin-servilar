// modules/servicos/servico.js — janela (modal) do serviço: ver, cadastrar, editar e preços por município
import { salvar, remover, validar, salvarRegra, removerRegra, validarRegra, MAX_MUNICIPIOS, cent, bpDe, bpPlat, aplicarTotal, definirPct, definirPlat, definirRep } from './actions-servico.js';
import { maiusculo } from './actions-comum.js';
import { h, icone, chip, norm, numBr, brl, pct } from './ui.js';
import { pill, corpoVerServico, painelPrecos, barra } from './ui-servico.js';
import { FORM, FORM_REGRA, RODAPE } from './servico-html.js';

// Rascunho do formulário × cópia "como está salva" (para saber se há alteração)
// dinheiro em centavos e percentual em centésimos de %: 15,5% = 1550
// `modo`, `bp` e `fixo` só controlam o recálculo na tela (não são gravados nem contam como alteração)
const novoDraft = s => {
  const centavos = s ? cent(s.valor_padrao) : 0, plat = s ? cent(s.valor_plataforma) : 0;
  return {
    tipo: 'servico',
    especialidade_id: s?.especialidade_id ?? null, nome: s ? maiusculo(s.nome) : '', descricao: s?.descricao ?? '', ativo: s ? s.ativo : true,
    centavos, plat, modo: 'pct', bp: bpDe(centavos, plat), fixo: 0,
  };
};
// Regra de preço por município: r = regra a editar; null = nova (começa com o preço padrão do serviço)
const novoDraftRegra = (r, serv) => {
  const centavos = cent((r ?? serv).valor_padrao), plat = cent((r ?? serv).valor_plataforma);
  return { tipo: 'regra', nome: r?.nome ?? '', ibge_ids: r ? [...r.ibge_ids] : [], ativo: r ? r.ativo : true,
    centavos, plat, modo: 'pct', bp: bpDe(centavos, plat), fixo: 0 };
};
const chave = d => d.tipo === 'regra'
  ? JSON.stringify([d.nome.trim(), [...d.ibge_ids].sort(), d.ativo, d.centavos, d.plat])
  : JSON.stringify([d.especialidade_id, d.nome, d.descricao, d.ativo, d.centavos, d.plat]);

// O que se mantém quando o valor padrão é alterado (depende do último campo editado)
const MANTEM = { pct: 'o percentual da comissão', plat: 'o valor da comissão', rep: 'o valor do repasse' };


// ctx: { $, conteudo, toast, aoSalvar(registro, novo), aoExcluir(registro) }
export function criarServico(ctx) {
  const { $, conteudo, toast } = ctx;
  let sv = [], esps = [], espPorId = new Map();                              // vêm de definir(); esps = [{id, nome, ativo}]
  let regras = [], regioes = [], porIbge = new Map(), precosOk = false;      // preço por município (vêm de definirPrecos())
  let modo = null, sel = null, selRegra = null;  // modo: null | 'ver' | 'editar' | 'novo' | 'regra'; sel = id do serviço aberto; selRegra = regra aberta (null = nova)
  let abaVer = 'det';                            // aba aberta na visualização: 'det' | 'precos'
  let ocupadas = new Map();                      // município → regra ativa do serviço que já o usa
  let draft = novoDraft(null), orig = { ...draft };
  let ocupado = false, confirmando = null, aoDescartar = null;
  let ultimoFoco = null;                         // seletor do botão que abriu a janela (para devolver o foco ao fechar)

  const msg = t => { const m = $('#sv-msg'); if (m) m.textContent = t; };
  const txtErro = (e, padrao) => (e?.servidor ? e.message : padrao);
  const sujo = () => chave(draft) !== chave(orig);
  const ehForm = () => modo === 'novo' || modo === 'editar' || modo === 'regra';
  const foco = s => $(s)?.focus();

  function definir({ sv: lista, esps: especialidades }) {
    if (lista) sv = lista;
    if (!especialidades) return;
    esps = especialidades; espPorId = new Map(esps.map(e => [e.id, e]));
  }
  function definirPrecos(p) {
    precosOk = !!p; regras = p?.regras ?? []; regioes = p?.regioes ?? []; porIbge = new Map(regioes.map(r => [r.ibge_id, r]));
  }

  // ── Modal ──
  function mostrar() { $('#sv-ov').hidden = false; conteudo.classList.add('sv-modal'); }
  function fecharModal() {
    modo = null; sel = null; confirmando = null; aoDescartar = null;
    $('#sv-ov').hidden = true; conteudo.classList.remove('sv-modal');
    if (ultimoFoco) $(ultimoFoco)?.focus();
  }
  function tentarFechar() {                       // X, Esc e clique fora
    if (ocupado || !modo) return;
    if (!ehForm() || !sujo()) return fecharModal();
    pedirDescarte(fecharModal);
  }
  function pedirDescarte(depois) { confirmando = 'descartar'; aoDescartar = depois; estado(); foco('#sv-sim'); }
  function cancelarForm() {                       // botão Cancelar: volta para a visualização (ou fecha, se era cadastro novo)
    const voltar = () => { const s = sv.find(x => x.id === sel); s ? abrirVer(s, modo === 'regra' ? 'precos' : 'det') : fecharModal(); };
    if (!sujo()) return voltar();
    pedirDescarte(voltar);
  }

  function abrirVer(s, aba = 'det') {
    sel = s.id; modo = 'ver'; abaVer = aba; confirmando = null; renderModal(); mostrar(); foco('#sv-editar');
  }
  function abrirForm(s, espId = null) {           // s = serviço a editar; null = cadastro novo (espId = especialidade já escolhida)
    sel = s ? s.id : null; modo = s ? 'editar' : 'novo'; draft = novoDraft(s); if (!s && espId) draft.especialidade_id = espId; orig = { ...draft }; confirmando = null;
    mostrar(); renderModal();   // mostra ANTES: focus() não funciona em elemento escondido
  }

  function abrirRegra(r) {                        // r = regra a editar; null = nova (do serviço aberto)
    const serv = sv.find(x => x.id === sel); if (!serv) return;
    modo = 'regra'; selRegra = r ? r.id : null; draft = novoDraftRegra(r, serv); orig = { ...draft }; confirmando = null;
    ocupadas = new Map();
    regras.forEach(x => { if (x.servico_id === sel && x.id !== selRegra && x.ativo) x.ibge_ids.forEach(i => ocupadas.set(i, x.nome || 'outra regra')); });
    mostrar(); renderModal();
  }

  function renderModal() {
    const s = sv.find(x => x.id === sel) ?? null;
    const fechar = h('button', { type: 'button', class: 'sv-ib', title: 'Fechar', 'aria-label': 'Fechar', onclick: tentarFechar }, icone('x'));
    const hs = $('#sv-hs');
    $('#sv-sujo').hidden = true; $('#sv-tabs').hidden = true;
    if (modo === 'ver') {
      const esp = espPorId.get(s.especialidade_id);
      $('#sv-dt').textContent = s.nome;
      hs.hidden = false;
      hs.replaceChildren(chip(esp ? esp.nome + (esp.ativo ? '' : ' (inativa)') : 'Especialidade não encontrada', !esp), pill(s.ativo));
      $('#sv-dacoes').replaceChildren(fechar);
      const minhas = regras.filter(r => r.servico_id === s.id);
      const aba = (id, txt, n) => h('button', { type: 'button', role: 'tab', class: 'sv-tab', id: 'sv-tab-' + id, 'aria-selected': String(abaVer === id),
        onclick: () => { if (abaVer !== id) { abaVer = id; renderModal(); } } }, txt, n == null ? null : h('b', { text: n }));
      $('#sv-tabs').hidden = false;
      $('#sv-tabs').replaceChildren(aba('det', 'Detalhes'), aba('precos', 'Preços por município', precosOk ? minhas.length : '!'));
      $('#sv-db').replaceChildren(abaVer === 'precos'
        ? painelPrecos({ regras: minhas, porIbge, ok: precosOk, padrao: cent(s.valor_padrao), plat: cent(s.valor_plataforma), onNova: () => abrirRegra(null), onAbrir: abrirRegra })
        : corpoVerServico(s));
      $('#sv-df').replaceChildren(h('div', { class: 'sv-acoes' }, h('span', { class: 'sv-esp' }),
        h('button', { type: 'button', class: 'btn-borda', text: 'Fechar', onclick: fecharModal }),
        h('button', { type: 'button', class: 'sv-salvar', id: 'sv-editar', text: 'Editar serviço', onclick: () => abrirForm(s) })));
      $('#sv-db').scrollTop = 0;
    } else if (modo === 'regra') {
      $('#sv-dt').textContent = selRegra == null ? 'Novo preço por município' : 'Editar preço por município';
      hs.hidden = false; hs.replaceChildren(chip(s.nome));
      $('#sv-dacoes').replaceChildren(fechar);
      $('#sv-db').innerHTML = FORM_REGRA; $('#sv-df').innerHTML = RODAPE;
      ligarRegra(s);
    } else {
      $('#sv-dt').textContent = modo === 'novo' ? 'Cadastrar serviço' : 'Editar serviço';
      hs.hidden = true; hs.replaceChildren();
      $('#sv-dacoes').replaceChildren(fechar);
      $('#sv-db').innerHTML = FORM; $('#sv-df').innerHTML = RODAPE;
      ligarForm();
    }
  }

  // ── Formulário ──
  // especialidades ativas (+ a atual, se ela estiver inativa)
  function opcoesEsp() {
    const lista = esps.filter(e => e.ativo || e.id === draft.especialidade_id);
    return [h('option', { value: '', text: 'Selecione…' }),
      ...lista.map(e => h('option', { value: String(e.id), text: e.nome + (e.ativo ? '' : ' (inativa)') }))];
  }

  // Preenche os campos da divisão a partir do rascunho. O campo que a pessoa está digitando (`origem`)
  // não é reescrito, para o cursor não pular; os outros acompanham na hora.
  const fmtPct = bp => (bp ? String(bp / 100).replace('.', ',') : '0');
  function sincronizar(origem) {
    const t = draft.centavos, liberado = t > 0, bp = bpPlat(draft);
    const campos = { '#sv-pp': fmtPct(bp), '#sv-rp': fmtPct(10000 - bp), '#sv-pv': numBr(draft.plat), '#sv-rv': numBr(t - draft.plat) };
    for (const [id, v] of Object.entries(campos)) {
      const el = $(id); el.disabled = !liberado;
      if (id !== origem) el.value = liberado ? v : '';
    }
  }

  function estado() {
    if (!ehForm()) return;
    const alt = sujo(), c = confirmando, regra = modo === 'regra';
    $('#sv-salvar').disabled = ocupado || !alt;
    $('#sv-cancelar').disabled = ocupado;
    $('#sv-sujo').hidden = !alt;
    $('#sv-excluir').hidden = regra ? selRegra == null : modo !== 'editar';
    $('#sv-st-t').textContent = draft.ativo ? (regra ? 'Ativa' : 'Ativo') : (regra ? 'Inativa' : 'Inativo');
    if (!regra) $('#sv-cnt').textContent = `${draft.descricao.length}/500`;
    $('#sv-prev').replaceChildren(barra(draft.centavos, draft.plat));
    $('#sv-dica').textContent = draft.centavos > 0
      ? `Alterar qualquer campo recalcula os demais. Ao mudar o valor padrão, ${MANTEM[draft.modo]} é mantido.`
      : 'Informe o valor padrão para liberar a divisão entre plataforma e profissional.';
    $('#sv-acoes').hidden = !!c; $('#sv-conf').hidden = !c;
    if (c) {
      $('#sv-conf-t').textContent = c === 'excluir' ? (regra ? 'Excluir este preço por município?' : `Excluir ${draft.nome || 'este serviço'}?`) : 'Descartar as alterações?';
      $('#sv-sim').textContent = c === 'excluir' ? 'Excluir' : 'Descartar';
      $('#sv-nao').textContent = c === 'excluir' ? 'Cancelar' : 'Continuar editando';
    }
  }

  // Leitura das máscaras ──────────────────────────────────────────────
  // reais: só dígitos, preenchendo da direita para a esquerda (como app de banco): 1 2 0 5 0 → 120,50
  function lerReais(el, max = 99999999) {
    const dig = el.value.replace(/\D/g, '').slice(0, 8);   // até R$ 999.999,99
    const v = Math.min(Number(dig || 0), max);
    el.value = dig ? numBr(v) : ''; return v;
  }
  // percentual: dígitos e uma vírgula, até 2 casas, máximo 100 → devolve em centésimos de %
  function lerPct(el) {
    let v = el.value.replace('.', ',').replace(/[^\d,]/g, '');
    const [i, ...r] = v.split(',');
    v = i.slice(0, 3) + (r.length ? ',' + r.join('').slice(0, 2) : '');
    if (Number(v.replace(',', '.')) > 100) v = '100';
    el.value = v; return Math.round(Number(v.replace(',', '.') || 0) * 100);
  }

  // Divisão: qualquer campo recalcula os outros três (serviço e regra por município usam o mesmo bloco)
  function ligarComposicao() {
    $('#sv-val').oninput = ev => { draft.centavos = lerReais(ev.target); aplicarTotal(draft); sincronizar('#sv-val'); estado(); };
    $('#sv-pp').oninput = ev => { definirPct(draft, lerPct(ev.target)); sincronizar('#sv-pp'); estado(); };
    $('#sv-rp').oninput = ev => { definirPct(draft, 10000 - lerPct(ev.target)); sincronizar('#sv-rp'); estado(); };
    $('#sv-pv').oninput = ev => { definirPlat(draft, lerReais(ev.target, draft.centavos)); sincronizar('#sv-pv'); estado(); };
    $('#sv-rv').oninput = ev => { definirRep(draft, lerReais(ev.target, draft.centavos)); sincronizar('#sv-rv'); estado(); };
    for (const id of ['#sv-val', '#sv-pp', '#sv-rp', '#sv-pv', '#sv-rv']) {
      const el = $(id);
      // ao entrar no campo, seleciona tudo: digitar substitui o valor (senão "0" + "15" viraria "015")
      el.onfocus = () => setTimeout(() => { if (document.activeElement === el) el.select(); }, 0);
      // ao sair, deixa tudo formatado igual (ex.: "15," vira "15"; vazio vira "0,00")
      el.onblur = () => { $('#sv-val').value = draft.centavos ? numBr(draft.centavos) : ''; sincronizar(null); };
    }
  }

  function ligarBotoes() {
    $('#sv-salvar').onclick = salvarForm;
    $('#sv-cancelar').onclick = cancelarForm;
    $('#sv-excluir').onclick = () => { confirmando = 'excluir'; estado(); foco('#sv-sim'); };
    $('#sv-nao').onclick = () => { confirmando = null; estado(); foco(modo === 'editar' || selRegra != null ? '#sv-excluir' : '#sv-cancelar'); };
    $('#sv-sim').onclick = () => (confirmando === 'excluir' ? excluirForm() : aoDescartar?.());
  }

  function ligarForm() {
    $('#sv-esp').replaceChildren(...opcoesEsp()); $('#sv-esp').value = draft.especialidade_id ? String(draft.especialidade_id) : '';
    $('#sv-nome').value = draft.nome; $('#sv-desc').value = draft.descricao; $('#sv-ativo').checked = draft.ativo;
    $('#sv-val').value = draft.centavos ? numBr(draft.centavos) : '';
    sincronizar(null);

    $('#sv-esp').onchange = ev => { draft.especialidade_id = Number(ev.target.value) || null; estado(); };
    // nome: sempre em caixa alta, mantendo o cursor no lugar (e sem atrapalhar acentos em composição)
    const nomeAlto = ev => {
      const el = ev.target;
      if (!ev.isComposing) {
        const a = el.selectionStart, b = el.selectionEnd, up = maiusculo(el.value);
        if (up !== el.value) { el.value = up; el.setSelectionRange(a, b); }
      }
      draft.nome = el.value; estado();
    };
    $('#sv-nome').oninput = nomeAlto;
    $('#sv-nome').oncompositionend = ev => ev.target.dispatchEvent(new Event('input'));
    $('#sv-nome').onkeydown = ev => { if (ev.key === 'Enter' && !$('#sv-salvar').disabled) salvarForm(); };
    $('#sv-desc').oninput = ev => { draft.descricao = ev.target.value; estado(); };
    $('#sv-ativo').onchange = ev => { draft.ativo = ev.target.checked; estado(); };

    ligarComposicao();

    ligarBotoes();

    estado();
    foco(modo === 'novo' && !draft.especialidade_id ? '#sv-esp' : '#sv-nome');
  }

  // ── Formulário da regra de preço por município ──
  const rotuloCidade = r => `${r.cidade} (${r.uf})`;
  function ligarRegra(serv) {
    $('#sv-rnome').value = draft.nome; $('#sv-ativo').checked = draft.ativo;
    $('#sv-val').value = draft.centavos ? numBr(draft.centavos) : '';
    const padT = cent(serv.valor_padrao), padP = cent(serv.valor_plataforma);
    $('#sv-ref').hidden = false;
    $('#sv-ref').textContent = `Preço padrão do serviço: ${brl(padT)}, com comissão de ${brl(padP)} (${pct(bpDe(padT, padP))}).`;
    $('#sv-bu').replaceChildren(h('option', { value: '', text: 'Todos os estados' }),
      ...[...new Set(regioes.map(r => r.uf))].sort().map(u => h('option', { value: u, text: u })));
    sincronizar(null);

    $('#sv-rnome').oninput = ev => { draft.nome = ev.target.value; estado(); };
    $('#sv-rnome').onkeydown = ev => { if (ev.key === 'Enter' && !$('#sv-salvar').disabled) salvarForm(); };
    $('#sv-ativo').onchange = ev => { draft.ativo = ev.target.checked; estado(); };
    $('#sv-bq').oninput = $('#sv-bu').onchange = () => renderMunicipios();
    $('#sv-nenhum').onclick = () => { draft.ibge_ids = []; renderMunicipios(); estado(); };
    $('#sv-todos').onclick = () => {
      const alvo = filtrarMunicipios().filter(r => !ocupadas.has(r.ibge_id)).map(r => r.ibge_id);
      draft.ibge_ids = [...new Set([...draft.ibge_ids, ...alvo])].slice(0, MAX_MUNICIPIOS);
      renderMunicipios(); estado();
    };
    ligarComposicao(); ligarBotoes();
    renderMunicipios(); estado();
    foco('#sv-rnome');
  }

  // municípios que aparecem na lista: cadastrados e ativos (mais os já escolhidos), conforme busca e estado
  function filtrarMunicipios() {
    const q = norm($('#sv-bq').value.trim()), u = $('#sv-bu').value, marcados = new Set(draft.ibge_ids);
    return regioes.filter(r => (r.ativo || marcados.has(r.ibge_id)) && (!u || r.uf === u) && (!q || norm(r.cidade).includes(q)))
      .sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt') || a.uf.localeCompare(b.uf));
  }
  function alternarMunicipio(id, marcar) {
    if (marcar && draft.ibge_ids.length >= MAX_MUNICIPIOS) { msg(`Máximo de ${MAX_MUNICIPIOS} municípios por regra.`); return false; }
    draft.ibge_ids = marcar ? [...draft.ibge_ids, id] : draft.ibge_ids.filter(x => x !== id);
    msg(''); renderSelecionados(); estado(); return true;
  }
  function renderSelecionados() {
    const n = draft.ibge_ids.length;
    $('#sv-nm').textContent = n ? `${n} selecionado${n > 1 ? 's' : ''}` : '';
    $('#sv-chips').replaceChildren(...(n
      ? [...draft.ibge_ids].map(id => porIbge.get(id) ?? { ibge_id: id, cidade: `código ${id}`, uf: '' })
          .sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt'))
          .map(r => h('span', { class: 'sv-ch' }, r.uf ? rotuloCidade(r) : r.cidade,
            h('button', { type: 'button', title: 'Remover', 'aria-label': 'Remover ' + r.cidade, onclick: () => { alternarMunicipio(r.ibge_id, false); renderMunicipios(); } }, icone('x'))))
      : [h('span', { class: 'sv-ch-vazio', text: 'Nenhum município selecionado.' })]));
  }
  function renderMunicipios() {
    renderSelecionados();
    const lista = filtrarMunicipios(), MAXV = 300, marcados = new Set(draft.ibge_ids);
    const livres = lista.filter(r => !ocupadas.has(r.ibge_id));
    $('#sv-todos').textContent = livres.length ? `Selecionar ${livres.length === lista.length ? 'todos' : 'os livres'} (${Math.min(livres.length, MAXV)})` : '';
    $('#sv-todos').hidden = !livres.length;
    $('#sv-mun').replaceChildren(...(lista.length
      ? [...lista.slice(0, MAXV).map(r => {
          const bloq = ocupadas.has(r.ibge_id), cb = h('input', { type: 'checkbox', checked: marcados.has(r.ibge_id), disabled: bloq });
          cb.onchange = () => { if (!alternarMunicipio(r.ibge_id, cb.checked)) cb.checked = false; };
          return h('li', {}, h('label', { class: bloq ? 'bloq' : '' }, cb,
            h('span', { class: 'mn-n', text: r.cidade }), h('small', { text: bloq ? `em “${ocupadas.get(r.ibge_id)}”` : r.uf })));
        }), ...(lista.length > MAXV ? [h('li', { class: 'mais', text: `Mostrando ${MAXV} de ${lista.length}. Refine a busca.` })] : [])]
      : [h('li', { class: 'mais', text: regioes.length ? 'Nenhum município encontrado.' : 'Nenhum município cadastrado. Cadastre em Regiões.' })]));
  }

  async function salvarForm() {
    if (modo === 'regra') return salvarRegraForm();
    const erro = validar(draft);
    if (erro) return msg(erro);
    ocupado = true; msg('Salvando…'); estado();
    const novo = sel == null;
    try {
      const r = await salvar(sel, draft);
      ctx.aoSalvar(r, novo);   // a tela principal atualiza a lista e devolve os dados por definir()
      ocupado = false;
      if (novo) fecharModal(); else abrirVer(r);
      toast(novo ? 'Serviço cadastrado.' : 'Alterações salvas.');
    } catch (err) {
      console.error(err); ocupado = false; estado();
      msg(txtErro(err, 'Não foi possível salvar. Tente novamente.'));
    }
  }

  async function salvarRegraForm() {
    const erro = validarRegra(draft);
    if (erro) return msg(erro);
    ocupado = true; msg('Salvando…'); estado();
    const nova = selRegra == null;
    try {
      const r = await salvarRegra(selRegra, sel, draft);
      regras = nova ? [...regras, r] : regras.map(x => x.id === r.id ? r : x);
      ocupado = false;
      const serv = sv.find(x => x.id === sel); serv ? abrirVer(serv, 'precos') : fecharModal();
      toast(nova ? 'Preço por município cadastrado.' : 'Alterações salvas.');
    } catch (err) {
      console.error(err); ocupado = false; estado();
      msg(txtErro(err, 'Não foi possível salvar. Tente novamente.'));
    }
  }

  async function excluirRegraForm() {
    ocupado = true; msg('Excluindo…'); estado();
    try {
      await removerRegra(selRegra);
      regras = regras.filter(x => x.id !== selRegra);
      ocupado = false;
      const serv = sv.find(x => x.id === sel); serv ? abrirVer(serv, 'precos') : fecharModal();
      toast('Preço por município excluído.');
    } catch (err) {
      console.error(err); ocupado = false; confirmando = null; estado();
      msg(txtErro(err, 'Não foi possível excluir. Tente novamente.'));
    }
  }

  async function excluirForm() {
    if (modo === 'regra') return excluirRegraForm();
    const s = sv.find(x => x.id === sel); if (!s) return;
    ocupado = true; msg('Excluindo…'); estado();
    try {
      await remover(s.id);
      ctx.aoExcluir(s);
      ocupado = false; fecharModal();
      toast(`${s.nome} excluído.`);
    } catch (err) {
      console.error(err); ocupado = false; confirmando = null; estado();
      msg(txtErro(err, 'Não foi possível excluir. Tente novamente.'));
    }
  }


  $('#sv-ov').onmousedown = ev => { if (ev.target === $('#sv-ov')) tentarFechar(); };
  const teclas = ev => {
    if (!modo) return;
    if (ev.key === 'Escape') { ev.preventDefault(); return tentarFechar(); }
    if (ev.key !== 'Tab') return;
    const dlg = $('#sv-dlg'), a = document.activeElement;
    const foc = [...dlg.querySelectorAll('button,input,select,textarea,a[href]')].filter(el => !el.disabled && !el.closest('[hidden]'));
    if (!foc.length) return;
    if (!dlg.contains(a)) { ev.preventDefault(); foc[0].focus(); }
    else if (ev.shiftKey && a === foc[0]) { ev.preventDefault(); foc.at(-1).focus(); }
    else if (!ev.shiftKey && a === foc.at(-1)) { ev.preventDefault(); foc[0].focus(); }
  };
  document.addEventListener('keydown', teclas);

  return {
    definir, definirPrecos,
    ver: (s, origem) => { ultimoFoco = origem; abrirVer(s); },
    novo: (espId, origem) => { ultimoFoco = origem; abrirForm(null, espId); },
    desligar: () => document.removeEventListener('keydown', teclas),
  };
}
