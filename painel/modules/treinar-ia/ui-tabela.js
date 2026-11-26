// modules/treinar-ia/ui-tabela.js — lista + janela de edição das tabelas (orientações, exemplos, conhecimento, ferramentas).
// O servidor confere tudo de novo: aqui a validação é só para facilitar.
import * as data from './data.js';
import { h, icone, trocar, toast, norm, corta, MODOS, modoCurto } from './ui.js';

const T = (n, r, extra = {}) => ({ n, r, t: 'texto', ...extra });
const CFG = {
  diretrizes: {
    novo: 'Nova orientação', vazio: 'Nenhuma orientação ainda.',
    ajuda: 'Regras que o Seu Serverino segue ao conversar. Uma ideia por regra, escrita como uma instrução.',
    campos: [
      T('titulo', 'Título', { max: 120, obrig: true, dica: 'Um nome curto para reconhecer a regra na lista.' }),
      T('conteudo', 'O que a IA deve fazer', { t: 'area', max: 4000, obrig: true, dica: 'Diga o que FAZER (e o motivo, se ajudar). Sem preços, descontos ou CPF: isso é do sistema.' }),
      T('modo', 'Quando vale', { t: 'modo' }),
      T('prioridade', 'Ordem (menor vem antes)', { t: 'int', min: 0, max: 9999 }),
      T('categoria', 'Categoria', { max: 40 }),
      T('ativo', 'Regra ativa', { t: 'bool' }),
    ],
    linha: r => ({ titulo: r.titulo, sub: r.conteudo, extra: `ordem ${r.prioridade}${r.condicao ? ' · ' + (r.condicao === 'humano_ligado' ? 'só com encaminhamento ligado' : 'só com encaminhamento desligado') : ''}` }),
  },
  exemplos: {
    novo: 'Novo exemplo', vazio: 'Nenhum exemplo ainda.',
    ajuda: 'Conversas-modelo: "quando o cliente disser isto, responda assim". A IA imita o jeito, não copia as palavras.',
    campos: [
      T('titulo', 'Título', { max: 120, obrig: true }),
      T('situacao', 'Quando acontece', { max: 400, dica: 'Ex.: pedido sem cupom aplicado.' }),
      T('conversa', 'Conversa', { t: 'conversa', obrig: true, dica: 'Uma fala por linha, começando por "Cliente:" ou "Serverino:". Chamada de ferramenta vai entre colchetes: [chama sugerir_itens: …]' }),
      T('observacao', 'Por que está certo', { t: 'area', max: 600 }),
      T('modo', 'Quando vale', { t: 'modo' }),
      T('ativo', 'Exemplo ativo', { t: 'bool' }),
    ],
    linha: r => ({ titulo: r.titulo, sub: r.situacao || (r.conversa?.[0]?.texto ?? ''), extra: `${r.conversa?.length ?? 0} falas` }),
  },
  conhecimento: {
    novo: 'Novo conhecimento', vazio: 'Nada cadastrado ainda. Aqui entram os fatos sobre a Servilar que a IA pode afirmar.',
    ajuda: 'Perguntas e respostas sobre a empresa. É a única fonte de fatos que a IA pode afirmar: o que não estiver aqui, ela não inventa.',
    campos: [
      T('pergunta', 'Pergunta', { max: 300, obrig: true }),
      T('resposta', 'Resposta', { t: 'area', max: 2000, obrig: true }),
      T('categoria', 'Categoria', { max: 40 }),
      T('modo', 'Quando vale', { t: 'modo' }),
      T('ativo', 'Ativo', { t: 'bool' }),
    ],
    linha: r => ({ titulo: r.pergunta, sub: r.resposta, extra: r.categoria }),
  },
  ferramentas: {
    novo: null, semExcluir: true, vazio: 'Nenhuma ferramenta.',
    ajuda: 'A descrição que a IA lê de cada ferramenta. Só o texto muda aqui: nome e campos são do sistema.',
    campos: [T('descricao', 'Descrição', { t: 'area', max: 2000, obrig: true, dica: 'Explique QUANDO a IA deve usar a ferramenta.' })],
    linha: r => ({ titulo: r.nome, sub: r.descricao, extra: '' }), chave: 'nome',
  },
};

// ── Conversa de exemplo ↔ texto (uma fala por linha) ──
const QUEM = { cliente: 'Cliente', seu_serverino: 'Serverino' };
const paraTexto = c => (Array.isArray(c) ? c : []).map(m => `${QUEM[m.papel] || 'Cliente'}: ${m.texto}`).join('\n');
function deTexto(t) {
  const falas = [];
  for (const linha of String(t).split('\n')) {
    const m = linha.match(/^\s*(cliente|seu serverino|serverino)\s*:\s*(.*)$/i);
    if (m) falas.push({ papel: m[1].toLowerCase() === 'cliente' ? 'cliente' : 'seu_serverino', texto: m[2].trim() });
    else if (falas.length && linha.trim()) falas.at(-1).texto += '\n' + linha.trim();
  }
  return falas.filter(f => f.texto);
}

export function montarTabela({ corpo, filtros, tabela }) {
  const cfg = CFG[tabela], pk = cfg.chave || 'id';
  const temModo = cfg.campos.some(c => c.n === 'modo'), temAtivo = cfg.campos.some(c => c.n === 'ativo');
  let vivo = true, linhas = [], ocupado = false;

  const q = h('input', { class: 'ti-campo-f', type: 'search', maxlength: '60', placeholder: 'Palavra do título ou do texto', 'aria-label': 'Buscar', oninput: () => desenhar() });
  const fm = h('select', { class: 'ti-campo-f', 'aria-label': 'Quando vale', onchange: () => desenhar() }, h('option', { value: '', text: 'Todos' }), Object.entries(MODOS).map(([v, t]) => h('option', { value: v, text: t })));
  const fs = h('select', { class: 'ti-campo-f', 'aria-label': 'Situação', onchange: () => desenhar() }, h('option', { value: '', text: 'Todas' }), h('option', { value: 'on', text: 'Ativas' }), h('option', { value: 'off', text: 'Desativadas' }));
  const bloco = (rot, el) => h('div', { class: 'ti-fl' }, h('label', { text: rot }), el);
  trocar(filtros, bloco('Buscar', q), temModo ? bloco('Quando vale', fm) : null, temAtivo ? bloco('Situação', fs) : null);

  const contador = h('b', { text: '0' });
  const novo = cfg.novo ? h('button', { type: 'button', class: 'ti-btn ti-btn-cheio', onclick: () => abrir(null) }, icone('plus'), ' ' + cfg.novo) : null;
  const caixa = h('div', { class: 'ti-lista' });
  trocar(corpo, h('div', { class: 'ti-tab' },
    h('div', { class: 'ti-barra' }, h('p', { class: 'ti-ajuda', text: cfg.ajuda }), h('div', { class: 'ti-barra-d' }, contador, novo)), caixa));

  function visiveis() {
    const b = norm(q.value.trim());
    return linhas.filter(r =>
      (!temModo || !fm.value || r.modo === fm.value) &&
      (!temAtivo || !fs.value || (fs.value === 'on') === r.ativo) &&
      (!b || norm(JSON.stringify(r)).includes(b)));
  }

  function desenhar() {
    const vis = visiveis();
    contador.textContent = String(vis.length);
    if (!vis.length) return trocar(caixa, h('p', { class: 'ti-info', text: linhas.length ? 'Nada com esse filtro.' : cfg.vazio }));
    trocar(caixa, vis.map(r => {
      const l = cfg.linha(r);
      const desligada = temAtivo && !r.ativo;
      const chave = h('button', { type: 'button', class: 'ti-switch' + (r.ativo ? ' on' : ''), role: 'switch', 'aria-checked': String(!!r.ativo), title: r.ativo ? 'Ativa: clique para desativar' : 'Desativada: clique para ativar', onclick: e => { e.stopPropagation(); alternar(r); } }, h('span'));
      return h('div', { class: 'ti-item' + (desligada ? ' off' : ''), tabindex: '0', role: 'button', onclick: () => abrir(r), onkeydown: e => { if (e.key === 'Enter') abrir(r); } },
        h('div', { class: 'ti-item-c' },
          h('div', { class: 'ti-item-t' }, h('b', { text: l.titulo }), temModo ? h('span', { class: 'ti-tag', text: modoCurto(r.modo) }) : null, r.origem === 'treinador' ? h('span', { class: 'ti-tag ia', text: 'criada pela IA' }) : null),
          h('p', { class: 'ti-item-s', text: corta(l.sub, 190) }), l.extra ? h('small', { text: l.extra }) : null),
        temAtivo ? chave : null);
    }));
  }

  async function alternar(r) {
    if (ocupado) return; ocupado = true;
    try { const d = await data.editar(tabela, r[pk], { ativo: !r.ativo }); Object.assign(r, d.registro); toast(r.ativo ? 'Ativada.' : 'Desativada.'); }
    catch (e) { toast(e.message, 'neg'); }
    ocupado = false; if (vivo) desenhar();
  }

  // ── Janela de edição ──
  function abrir(r) {
    const novoReg = !r;
    const refs = {};
    const dlg = h('dialog', { class: 'ti-dlg' });
    const msg = h('p', { class: 'ti-erro', role: 'alert', hidden: true });
    const campos = cfg.campos.map(c => {
      let el;
      const v = r ? r[c.n] : (c.t === 'bool' ? true : c.t === 'modo' ? 'todos' : c.t === 'int' ? 500 : c.n === 'categoria' ? 'geral' : '');
      if (c.t === 'area') el = h('textarea', { class: 'ti-in', rows: '6', maxlength: String(c.max), value: v ?? '' });
      else if (c.t === 'conversa') el = h('textarea', { class: 'ti-in', rows: '8', value: paraTexto(v) });
      else if (c.t === 'modo') el = h('select', { class: 'ti-in' }, Object.entries(MODOS).map(([k, t]) => h('option', { value: k, text: t, selected: v === k })));
      else if (c.t === 'bool') el = h('input', { type: 'checkbox', checked: !!v });
      else if (c.t === 'int') el = h('input', { class: 'ti-in', type: 'number', min: String(c.min), max: String(c.max), value: String(v) });
      else el = h('input', { class: 'ti-in', type: 'text', maxlength: String(c.max), value: v ?? '' });
      refs[c.n] = el;
      return h('label', { class: 'ti-cp' + (c.t === 'bool' ? ' bool' : '') }, h('span', { text: c.r + (c.obrig ? ' *' : '') }), el, c.dica ? h('small', { text: c.dica }) : null);
    });

    const ler = () => {
      const o = {};
      for (const c of cfg.campos) {
        const el = refs[c.n];
        if (c.t === 'bool') o[c.n] = el.checked;
        else if (c.t === 'int') o[c.n] = Number(el.value);
        else if (c.t === 'conversa') o[c.n] = deTexto(el.value);
        else { const t = el.value.trim(); o[c.n] = t === '' && !c.obrig ? null : t; }
      }
      if (cfg.chave) delete o[cfg.chave];
      return o;
    };
    const fechar = () => { dlg.close(); dlg.remove(); };
    const erro = t => { msg.textContent = t; msg.hidden = false; };

    const salvar = h('button', { type: 'button', class: 'ti-btn ti-btn-cheio', text: 'Salvar', onclick: async () => {
      msg.hidden = true; salvar.disabled = true;
      try {
        const dados = ler();
        if (!novoReg) { for (const k of Object.keys(dados)) if (JSON.stringify(dados[k]) === JSON.stringify(r[k]) || (dados[k] === null && r[k] == null)) delete dados[k]; }
        if (!novoReg && !Object.keys(dados).length) return fechar();
        const d = novoReg ? await data.criar(tabela, dados) : await data.editar(tabela, r[pk], dados);
        if (novoReg) linhas.push(d.registro); else Object.assign(r, d.registro);
        toast(novoReg ? 'Criado.' : 'Salvo. Vale para os clientes em até 30 segundos.'); fechar(); desenhar();
      } catch (e) { erro(e.message); salvar.disabled = false; }
    } });
    const rodape = [salvar, h('button', { type: 'button', class: 'ti-btn', text: 'Cancelar', onclick: fechar })];
    if (!novoReg && !cfg.semExcluir) {
      const ex = h('button', { type: 'button', class: 'ti-btn ti-perigo', text: 'Excluir', onclick: async () => {
        if (ex.dataset.c !== '1') { ex.dataset.c = '1'; ex.textContent = 'Confirmar exclusão'; return; }
        try { await data.excluir(tabela, r[pk]); linhas = linhas.filter(x => x !== r); toast('Excluído. Dá para desfazer no Histórico.'); fechar(); desenhar(); }
        catch (e) { erro(e.message); }
      } });
      rodape.push(ex);
    }
    trocar(dlg, h('h3', { text: novoReg ? cfg.novo : (cfg.chave ? r[pk] : 'Editar') }), campos, msg, h('div', { class: 'ti-dlg-r' }, rodape));
    dlg.addEventListener('cancel', () => dlg.remove());
    document.body.append(dlg); dlg.showModal();
  }

  (async () => {
    trocar(caixa, h('p', { class: 'ti-info', role: 'status', text: 'Carregando…' }));
    try { const l = await data.listar(tabela); if (!vivo) return; linhas = l; desenhar(); }
    catch (e) { if (vivo) trocar(caixa, h('p', { class: 'ti-erro', role: 'alert', text: e.message })); }
  })();

  return () => { vivo = false; document.querySelectorAll('dialog.ti-dlg').forEach(d => d.remove()); };
}
