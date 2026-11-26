// modules/servicos/adicional.js — janela (modal) do adicional: ver, cadastrar, editar e preços por município.
// Usa a mesma janela do serviço (#sv-ov), que só mostra uma coisa por vez.
import { salvarAdicional, removerAdicional, validarAdicional, salvarRegraAdicional, removerRegraAdicional, validarRegra } from './actions-adicional.js';
import { cent, bpDe, MAX_DESC } from './actions-servico.js';
import { maiusculo, limparTopicos } from './actions-comum.js';
import { h, icone, chip, numBr, brl, pct } from './ui.js';
import { pill, corpoVerServico, painelPrecos, barra } from './ui-servico.js';
import { FORM_ADICIONAL, FORM_REGRA_ADICIONAL } from './adicional-html.js';
import { RODAPE } from './servico-html.js';
import { criarComposicao } from './composicao.js';
import { criarTopicos } from './topicos.js';
import { criarMunicipios } from './municipios.js';

// Rascunho × cópia "como está salva". Dinheiro em centavos; `modo`, `bp` e `fixo` só controlam o recálculo na tela.
const novoDraft = a => {
  const centavos = a ? cent(a.valor_padrao) : 0, plat = a ? cent(a.valor_plataforma) : 0;
  return {
    tipo: 'adicional',
    especialidade_id: a?.especialidade_id ?? null, nome: a ? maiusculo(a.nome) : '', unidade: a?.unidade ?? '', ordem: a?.ordem ?? 0,
    descricao: a?.descricao ?? '', ativo: a ? a.ativo : true,
    centavos, plat, modo: 'pct', bp: bpDe(centavos, plat), fixo: 0,
    tempo: a?.tempo_minutos ?? 0,   // tempo em minutos (0 = ainda não informado)
    incluso: [...(a?.incluso ?? [])], nao_incluso: [...(a?.nao_incluso ?? [])],   // listas de tópicos
  };
};
// Regra de preço por município: r = regra a editar; null = nova (começa com o preço padrão do adicional)
const novoDraftRegra = (r, ad) => {
  const centavos = cent((r ?? ad).valor_padrao), plat = cent((r ?? ad).valor_plataforma);
  return { tipo: 'regra', nome: r?.nome ?? '', ibge_ids: r ? [...r.ibge_ids] : [], ativo: r ? r.ativo : true,
    centavos, plat, modo: 'pct', bp: bpDe(centavos, plat), fixo: 0,
    tempo: ad.tempo_minutos ?? 0 };   // só para mostrar o valor por hora (não é gravado)
};
const chave = d => d.tipo === 'regra'
  ? JSON.stringify([d.nome.trim(), [...d.ibge_ids].sort(), d.ativo, d.centavos, d.plat])
  : JSON.stringify([d.especialidade_id, d.nome, d.unidade.trim(), d.ordem, d.descricao, d.ativo, d.centavos, d.plat, d.tempo, limparTopicos(d.incluso), limparTopicos(d.nao_incluso)]);
const MANTEM = { pct: 'o percentual da comissão', plat: 'o valor da comissão', rep: 'o valor do repasse' };

// ctx: { $, conteudo, toast, aoSalvar(registro, novo), aoExcluir(registro) }
export function criarAdicional(ctx) {
  const { $, conteudo, toast } = ctx;
  let ad = [], esps = [], espPorId = new Map();     // vêm de definir(); esps = [{id, nome, ativo}]
  let regras = [], regioes = [], porIbge = new Map(), precosOk = false;   // preço por município (vêm de definirPrecos())
  let modo = null, sel = null, selRegra = null;     // modo: null | 'ver' | 'editar' | 'novo' | 'regra'; sel = id do adicional aberto; selRegra = regra aberta (null = nova)
  let abaVer = 'det';                               // aba aberta na visualização: 'det' | 'precos'
  let ocupadas = new Map();                         // município → regra ativa do adicional que já o usa
  let draft = novoDraft(null), orig = { ...draft };
  let ocupado = false, confirmando = null, aoDescartar = null, ultimoFoco = null;
  const comp = criarComposicao($, () => draft, () => estado());
  const mun = criarMunicipios({ $, obter: () => draft, regioes: () => regioes, porIbge: () => porIbge, ocupadas: () => ocupadas, msg: t => msg(t), aoMudar: () => estado() });

  const msg = t => { const m = $('#sv-msg'); if (m) m.textContent = t; };
  const txtErro = (e, padrao) => (e?.servidor ? e.message : padrao);
  const sujo = () => chave(draft) !== chave(orig);
  const ehForm = () => modo === 'novo' || modo === 'editar' || modo === 'regra';
  const foco = s => $(s)?.focus();

  function definir({ ad: lista, esps: especialidades }) {
    if (lista) ad = lista;
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
  function tentarFechar() {                         // X, Esc e clique fora
    if (ocupado || !modo) return;
    if (!ehForm() || !sujo()) return fecharModal();
    pedirDescarte(fecharModal);
  }
  function pedirDescarte(depois) { confirmando = 'descartar'; aoDescartar = depois; estado(); foco('#sv-sim'); }
  function cancelarForm() {                         // volta para a visualização (ou fecha, se era cadastro novo)
    const voltar = () => { const a = ad.find(x => x.id === sel); a ? abrirVer(a, modo === 'regra' ? 'precos' : 'det') : fecharModal(); };
    if (!sujo()) return voltar();
    pedirDescarte(voltar);
  }

  function abrirVer(a, aba = 'det') { sel = a.id; modo = 'ver'; abaVer = aba; confirmando = null; renderModal(); mostrar(); foco('#sv-editar'); }
  function abrirForm(a, espId = null) {             // a = adicional a editar; null = novo (espId = especialidade já escolhida)
    sel = a ? a.id : null; modo = a ? 'editar' : 'novo'; draft = novoDraft(a);
    if (!a && espId) draft.especialidade_id = espId;
    orig = { ...draft }; confirmando = null;
    mostrar(); renderModal();                       // mostra ANTES: focus() não funciona em elemento escondido
  }

  function abrirRegra(r) {                          // r = regra a editar; null = nova (do adicional aberto)
    const a = ad.find(x => x.id === sel); if (!a) return;
    modo = 'regra'; selRegra = r ? r.id : null; draft = novoDraftRegra(r, a); orig = { ...draft }; confirmando = null;
    ocupadas = new Map();
    regras.forEach(x => { if (x.adicional_id === sel && x.id !== selRegra && x.ativo) x.ibge_ids.forEach(i => ocupadas.set(i, x.nome || 'outra regra')); });
    mostrar(); renderModal();
  }

  function renderModal() {
    const a = ad.find(x => x.id === sel) ?? null;
    const fechar = h('button', { type: 'button', class: 'sv-ib', title: 'Fechar', 'aria-label': 'Fechar', onclick: tentarFechar }, icone('x'));
    const hs = $('#sv-hs');
    $('#sv-sujo').hidden = true; $('#sv-tabs').hidden = true;
    $('#sv-dacoes').replaceChildren(fechar);
    if (modo === 'ver') {
      const esp = espPorId.get(a.especialidade_id);
      $('#sv-dt').textContent = a.nome;
      hs.hidden = false;
      hs.replaceChildren(chip(esp ? esp.nome + (esp.ativo ? '' : ' (inativa)') : 'Especialidade não encontrada', !esp), chip('Adicional'), pill(a.ativo));
      const minhas = regras.filter(r => r.adicional_id === a.id);
      const aba = (id, txt, n) => h('button', { type: 'button', role: 'tab', class: 'sv-tab', id: 'sv-tab-' + id, 'aria-selected': String(abaVer === id),
        onclick: () => { if (abaVer !== id) { abaVer = id; renderModal(); } } }, txt, n == null ? null : h('b', { text: n }));
      $('#sv-tabs').hidden = false;
      $('#sv-tabs').replaceChildren(aba('det', 'Detalhes'), aba('precos', 'Preços por município', precosOk ? minhas.length : '!'));
      $('#sv-db').replaceChildren(abaVer === 'precos'
        ? painelPrecos({ regras: minhas, porIbge, ok: precosOk, alvo: 'adicional', padrao: cent(a.valor_padrao), plat: cent(a.valor_plataforma), onNova: () => abrirRegra(null), onAbrir: abrirRegra })
        : corpoVerServico(a));
      $('#sv-df').replaceChildren(h('div', { class: 'sv-acoes' }, h('span', { class: 'sv-esp' }),
        h('button', { type: 'button', class: 'btn-borda', text: 'Fechar', onclick: fecharModal }),
        h('button', { type: 'button', class: 'sv-salvar', id: 'sv-editar', text: 'Editar adicional', onclick: () => abrirForm(a) })));
      $('#sv-db').scrollTop = 0;
    } else if (modo === 'regra') {
      $('#sv-dt').textContent = selRegra == null ? 'Novo preço por município' : 'Editar preço por município';
      hs.hidden = false; hs.replaceChildren(chip(a.nome));
      $('#sv-db').innerHTML = FORM_REGRA_ADICIONAL; $('#sv-df').innerHTML = RODAPE;
      ligarRegra(a);
    } else {
      $('#sv-dt').textContent = modo === 'novo' ? 'Cadastrar adicional' : 'Editar adicional';
      hs.hidden = true; hs.replaceChildren();
      $('#sv-db').innerHTML = FORM_ADICIONAL; $('#sv-df').innerHTML = RODAPE;
      ligarForm();
    }
  }

  // ── Formulário ──
  function opcoesEsp() {                            // especialidades ativas (+ a atual, se estiver inativa)
    const lista = esps.filter(e => e.ativo || e.id === draft.especialidade_id);
    return [h('option', { value: '', text: 'Selecione…' }),
      ...lista.map(e => h('option', { value: String(e.id), text: e.nome + (e.ativo ? '' : ' (inativa)') }))];
  }

  function estado() {
    if (!ehForm()) return;
    const alt = sujo(), c = confirmando, regra = modo === 'regra';
    $('#sv-salvar').disabled = ocupado || !alt;
    $('#sv-cancelar').disabled = ocupado;
    $('#sv-sujo').hidden = !alt;
    $('#sv-excluir').hidden = regra ? selRegra == null : modo !== 'editar';
    $('#sv-st-t').textContent = draft.ativo ? (regra ? 'Ativa' : 'Ativo') : (regra ? 'Inativa' : 'Inativo');
    if (!regra) $('#sv-cnt').textContent = `${draft.descricao.length}/${MAX_DESC}`;
    $('#sv-prev').replaceChildren(barra(draft.centavos, draft.plat));
    $('#sv-dica').textContent = draft.centavos > 0
      ? `Alterar qualquer campo recalcula os demais. Ao mudar o valor padrão, ${MANTEM[draft.modo]} é mantido.`
      : 'Informe o valor padrão para liberar a divisão entre plataforma e profissional.';
    $('#sv-acoes').hidden = !!c; $('#sv-conf').hidden = !c;
    if (c) {
      $('#sv-conf-t').textContent = c === 'excluir' ? (regra ? 'Excluir este preço por município?' : `Excluir ${draft.nome || 'este adicional'}?`) : 'Descartar as alterações?';
      $('#sv-sim').textContent = c === 'excluir' ? 'Excluir' : 'Descartar';
      $('#sv-nao').textContent = c === 'excluir' ? 'Cancelar' : 'Continuar editando';
    }
  }

  function ligarForm() {
    $('#sv-esp').replaceChildren(...opcoesEsp()); $('#sv-esp').value = draft.especialidade_id ? String(draft.especialidade_id) : '';
    $('#sv-nome').value = draft.nome; $('#sv-un').value = draft.unidade; $('#sv-ord').value = String(draft.ordem);
    $('#sv-desc').value = draft.descricao; $('#sv-ativo').checked = draft.ativo;
    $('#sv-val').value = draft.centavos ? numBr(draft.centavos) : '';
    comp.sincronizar(null);

    $('#sv-esp').onchange = ev => { draft.especialidade_id = Number(ev.target.value) || null; estado(); };
    // nome: sempre em caixa alta, mantendo o cursor no lugar (e sem atrapalhar acentos em composição)
    $('#sv-nome').oninput = ev => {
      const el = ev.target;
      if (!ev.isComposing) {
        const a = el.selectionStart, b = el.selectionEnd, up = maiusculo(el.value);
        if (up !== el.value) { el.value = up; el.setSelectionRange(a, b); }
      }
      draft.nome = el.value; estado();
    };
    $('#sv-nome').oncompositionend = ev => ev.target.dispatchEvent(new Event('input'));
    $('#sv-nome').onkeydown = ev => { if (ev.key === 'Enter' && !$('#sv-salvar').disabled) salvarForm(); };
    $('#sv-un').oninput = ev => { draft.unidade = ev.target.value; estado(); };
    $('#sv-ord').oninput = ev => { const d = ev.target.value.replace(/\D/g, '').slice(0, 4); ev.target.value = d; draft.ordem = Number(d || 0); estado(); };
    $('#sv-desc').oninput = ev => { draft.descricao = ev.target.value; estado(); };
    $('#sv-ativo').onchange = ev => { draft.ativo = ev.target.checked; estado(); };

    comp.ligar(); comp.ligarTempo();
    criarTopicos($, () => draft, () => estado()).ligar();

    ligarBotoes();

    estado();
    foco(modo === 'novo' && !draft.especialidade_id ? '#sv-esp' : '#sv-nome');
  }

  function ligarBotoes() {
    $('#sv-salvar').onclick = salvarForm;
    $('#sv-cancelar').onclick = cancelarForm;
    $('#sv-excluir').onclick = () => { confirmando = 'excluir'; estado(); foco('#sv-sim'); };
    $('#sv-nao').onclick = () => { confirmando = null; estado(); foco(modo === 'editar' || (modo === 'regra' && selRegra != null) ? '#sv-excluir' : '#sv-cancelar'); };
    $('#sv-sim').onclick = () => (confirmando === 'excluir' ? excluirForm() : aoDescartar?.());
  }

  // ── Formulário da regra de preço por município ──
  function ligarRegra(a) {
    $('#sv-rnome').value = draft.nome; $('#sv-ativo').checked = draft.ativo;
    $('#sv-val').value = draft.centavos ? numBr(draft.centavos) : '';
    const padT = cent(a.valor_padrao), padP = cent(a.valor_plataforma);
    $('#sv-ref').hidden = false;
    $('#sv-ref').textContent = `Preço padrão do adicional: ${brl(padT)} por ${a.unidade}, com comissão de ${brl(padP)} (${pct(bpDe(padT, padP))}).`;
    comp.sincronizar(null);

    $('#sv-rnome').oninput = ev => { draft.nome = ev.target.value; estado(); };
    $('#sv-rnome').onkeydown = ev => { if (ev.key === 'Enter' && !$('#sv-salvar').disabled) salvarForm(); };
    $('#sv-ativo').onchange = ev => { draft.ativo = ev.target.checked; estado(); };
    comp.ligar(); ligarBotoes();
    mun.ligar(); estado();
    foco('#sv-rnome');
  }

  async function salvarRegraForm() {
    const erro = validarRegra(draft);
    if (erro) return msg(erro);
    ocupado = true; msg('Salvando…'); estado();
    const nova = selRegra == null;
    try {
      const r = await salvarRegraAdicional(selRegra, sel, draft);
      regras = nova ? [...regras, r] : regras.map(x => x.id === r.id ? r : x);
      ocupado = false;
      const a = ad.find(x => x.id === sel); a ? abrirVer(a, 'precos') : fecharModal();
      toast(nova ? 'Preço por município cadastrado.' : 'Alterações salvas.');
    } catch (err) {
      console.error(err); ocupado = false; estado();
      msg(txtErro(err, 'Não foi possível salvar. Tente novamente.'));
    }
  }

  async function excluirRegraForm() {
    ocupado = true; msg('Excluindo…'); estado();
    try {
      await removerRegraAdicional(selRegra);
      regras = regras.filter(x => x.id !== selRegra);
      ocupado = false;
      const a = ad.find(x => x.id === sel); a ? abrirVer(a, 'precos') : fecharModal();
      toast('Preço por município excluído.');
    } catch (err) {
      console.error(err); ocupado = false; confirmando = null; estado();
      msg(txtErro(err, 'Não foi possível excluir. Tente novamente.'));
    }
  }

  async function salvarForm() {
    if (modo === 'regra') return salvarRegraForm();
    const erro = validarAdicional(draft);
    if (erro) return msg(erro);
    ocupado = true; msg('Salvando…'); estado();
    const novo = sel == null;
    try {
      const r = await salvarAdicional(sel, draft);
      ctx.aoSalvar(r, novo);   // a tela principal atualiza a lista e devolve os dados por definir()
      ocupado = false;
      if (novo) fecharModal(); else abrirVer(r);
      toast(novo ? 'Adicional cadastrado.' : 'Alterações salvas.');
    } catch (err) {
      console.error(err); ocupado = false; estado();
      msg(txtErro(err, 'Não foi possível salvar. Tente novamente.'));
    }
  }

  async function excluirForm() {
    if (modo === 'regra') return excluirRegraForm();
    const a = ad.find(x => x.id === sel); if (!a) return;
    ocupado = true; msg('Excluindo…'); estado();
    try {
      await removerAdicional(a.id);
      ctx.aoExcluir(a);
      ocupado = false; fecharModal();
      toast(`${a.nome} excluído.`);
    } catch (err) {
      console.error(err); ocupado = false; confirmando = null; estado();
      msg(txtErro(err, 'Não foi possível excluir. Tente novamente.'));
    }
  }

  $('#sv-ov').addEventListener('mousedown', ev => { if (ev.target === $('#sv-ov')) tentarFechar(); });
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
    ver: (a, origem) => { ultimoFoco = origem; abrirVer(a); },
    novo: (espId, origem) => { ultimoFoco = origem; abrirForm(null, espId); },
    desligar: () => document.removeEventListener('keydown', teclas),
  };
}
