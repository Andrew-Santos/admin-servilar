// modules/profissionais/module.js — lista à esquerda, ficha de avaliação à direita
import * as data from './data.js';
import { SITUACAO_CADASTRO, decidir } from './actions.js';
import { h, icone, msg, selo } from './ui.js';
import { montarFicha } from './ui-detalhe.js';

let vivo = false, urls = [], limpar = null;
const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const liberarUrls = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };

export default {
  estilo: 'modules/profissionais/style.css',
  desmontar() { vivo = false; liberarUrls(); limpar?.(); limpar = null; },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);

    // ── Filtros ──
    filtros.innerHTML = `
      <div class="pf-fl"><label for="pf-q">Buscar por nome</label><input id="pf-q" class="pf-campo" type="search" maxlength="60" autocomplete="off" placeholder="Nome do profissional"></div>
      <div class="pf-fl"><label for="pf-st">Situação do cadastro</label>
        <select id="pf-st" class="pf-campo"><option value="">Todas</option><option value="em_analise">Em análise</option><option value="ajustes_necessarios">Ajustes necessários</option><option value="ativo">Ativo</option></select></div>`;
    const busca = filtros.querySelector('#pf-q'), situacao = filtros.querySelector('#pf-st');

    // ── Estrutura ──
    const contador = h('b', { text: '0' }), sub = h('span', { class: 'pf-sub' });
    const lista = h('ul', { class: 'pf-lista' });
    const det = h('section', { class: 'pf-det', 'aria-live': 'polite' });
    const esq = h('section', { class: 'pf-esq' }, h('div', { class: 'pf-bar' }, h('h2', { text: 'Cadastros' }), contador, sub), lista);
    const raiz = h('div', { class: 'pf' }, esq, det);
    conteudo.replaceChildren(raiz);

    let itens = [], selecionado = null, seq = 0;
    const vazioDet = () => det.replaceChildren(h('div', { class: 'pf-vazio-det' }, icone('hard-hat'), h('p', { text: 'Escolha um profissional na lista para ver o cadastro.' })));

    // ── Lista ──
    function desenharLista() {
      const q = norm(busca.value.trim()), st = situacao.value;
      const vis = itens.filter(i => (!st || i.status === st) && (!q || norm(i.nome).includes(q)));
      const aval = itens.reduce((n, i) => n + (i.para_avaliar ? 1 : 0), 0);
      contador.textContent = String(vis.length);
      sub.textContent = aval ? `${aval} para avaliar` : '';
      lista.replaceChildren(...(vis.length ? vis.map(i => h('li', {},
        h('button', { type: 'button', class: 'pf-item' + (i.id === selecionado ? ' ativo' : ''), onclick: () => abrir(i.id) },
          h('span', { class: 'pf-item-nome', text: i.nome }),
          h('span', { class: 'pf-item-cpf', text: i.cpf }),
          h('span', { class: 'pf-item-linha' }, selo(SITUACAO_CADASTRO[i.status] || { texto: i.status, cor: '' }),
            i.para_avaliar ? h('small', { text: `${i.para_avaliar} para avaliar` }) : i.reprovadas ? h('small', { text: `${i.reprovadas} reprovada${i.reprovadas > 1 ? 's' : ''}` }) : null))))
        : [h('li', { class: 'pf-vazio', text: itens.length ? 'Nenhum cadastro com esse filtro.' : 'Nenhum cadastro enviado ainda.' })]));
    }
    async function recarregarLista() {
      try { itens = await data.listar(); desenharLista(); }
      catch (e) { if (vivo) lista.replaceChildren(h('li', {}, msg(e.message, 'neg'))); }
    }

    // ── Ficha ──
    // Só troca o conteúdo quando a ficha chega (sem esvaziar antes), para a tela não piscar; mantém a rolagem ao recarregar
    async function abrir(id, { manter = false } = {}) {
      const minha = ++seq, mesma = id === selecionado;
      selecionado = id; desenharLista();
      raiz.classList.add('ver-det');
      if (!manter || !mesma) det.replaceChildren(h('p', { class: 'pf-info', role: 'status', text: 'Carregando…' }));
      let p;
      try { p = await data.buscarFicha(id); }
      catch (e) { if (vivo && minha === seq) det.replaceChildren(voltar(), msg(e.message, 'neg')); return; }
      if (!vivo || minha !== seq) return;

      const topo = det.scrollTop; liberarUrls();
      const ok = () => vivo && minha === seq;
      const aoDecidir = async (topico, status, motivo) => {
        await decidir(id, topico, status, motivo);
        if (!ok()) return;
        await Promise.all([abrir(id, { manter: true }), recarregarLista()]);
      };
      const status = SITUACAO_CADASTRO[p.status] || { texto: p.status, cor: '' };
      det.replaceChildren(
        voltar(),
        h('div', { class: 'pf-cab' }, h('h2', { text: p.nome }), selo(status)),
        p.status === 'ajustes_necessarios' && p.ajustes ? msg(p.ajustes) : null,
        montarFicha(p, { urls, vivo: ok, aoDecidir }));
      det.scrollTop = manter && mesma ? topo : 0;
    }
    const voltar = () => h('button', { type: 'button', class: 'pf-voltar', onclick: () => { raiz.classList.remove('ver-det'); } }, icone('arrow-left'), ' Voltar para a lista');

    busca.oninput = desenharLista; situacao.oninput = desenharLista;
    limpar = () => { busca.oninput = situacao.oninput = null; };

    vazioDet();
    await recarregarLista();
  },
};
