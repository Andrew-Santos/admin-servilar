// modules/profissionais/module.js — tabela + mapa; clicar num profissional abre a ficha em janela redimensionável

import * as data from './data.js';
import { ordenar, rotuloCidade } from './actions.js';
import { abrirFicha } from './module-ficha.js';
import { criarMapa } from './ui-mapa.js';
import { tabela } from './ui-tabela.js';
import { h, icone, msg, trocar } from './ui.js';

let vivo = false, limpar = null, mapa = null;
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default {
  estilo: 'modules/profissionais/style.css',
  desmontar() {
    vivo = false; limpar?.(); limpar = null;
    mapa?.destruir(); mapa = null;
    document.querySelectorAll('dialog.pf-janela, dialog.pf-lightbox').forEach(d => d.close());
  },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);

    // ── Filtros ──
    filtros.innerHTML = `
      <div class="pf-fl"><label for="pf-q">Buscar por nome</label><input id="pf-q" class="pf-campo" type="search" maxlength="60" autocomplete="off" placeholder="Nome do profissional"></div>
      <div class="pf-fl"><label for="pf-st">Situação do cadastro</label>
        <select id="pf-st" class="pf-campo"><option value="">Todas</option><option value="em_analise">Em análise</option><option value="ajustes_necessarios">Ajustes necessários</option><option value="ativo">Ativo</option><option value="bloqueado">Bloqueado</option></select></div>
      <div class="pf-fl"><label for="pf-ci">Cidade</label><select id="pf-ci" class="pf-campo"><option value="">Todas</option></select></div>`;
    const busca = filtros.querySelector('#pf-q'), situacao = filtros.querySelector('#pf-st'), cidade = filtros.querySelector('#pf-ci');

    // ── Estrutura: barra (título, contador, abas) e painel (tabela ou mapa) ──
    const contador = h('b', { text: '0' }), sub = h('span', { class: 'pf-sub' });
    const abaTabela = h('button', { type: 'button', role: 'tab', class: 'pf-aba' }, icone('table'), ' Tabela');
    const abaMapa = h('button', { type: 'button', role: 'tab', class: 'pf-aba' }, icone('map-trifold'), ' Mapa');
    const barra = h('div', { class: 'pf-bar' }, h('h2', { text: 'Profissionais' }), contador, sub, h('div', { class: 'pf-abas', role: 'tablist' }, abaTabela, abaMapa));
    const painel = h('div', { class: 'pf-painel' });
    trocar(conteudo, h('div', { class: 'pf' }, barra, painel));

    mapa = criarMapa({ aoAbrir: id => abrir(id) });
    let itens = [], aba = 'tabela', ordem = { col: 'situacao', dir: 'asc' };

    const abrir = id => abrirFicha({ id, nome: itens.find(i => i.id === id)?.nome || 'Profissional', aoMudar: recarregar });

    function visiveis() {
      const q = norm(busca.value.trim()), st = situacao.value, ci = cidade.value;
      return itens.filter(i => (!st || i.status === st) && (!ci || rotuloCidade(i) === ci) && (!q || norm(i.nome).includes(q)));
    }

    function desenhar() {
      const vis = visiveis(), aval = itens.reduce((n, i) => n + i.para_avaliar, 0);
      contador.textContent = String(vis.length);
      sub.textContent = aval ? `${aval} etapa${aval > 1 ? 's' : ''} para avaliar` : '';
      [[abaTabela, 'tabela'], [abaMapa, 'mapa']].forEach(([b, id]) => { b.classList.toggle('ativa', aba === id); b.setAttribute('aria-selected', aba === id); });

      if (aba === 'tabela') {
        trocar(painel, tabela({
          itens: ordenar(vis, ordem), ordem, aoAbrir: abrir,
          aoOrdenar: col => { ordem = { col, dir: ordem.col === col && ordem.dir === 'asc' ? 'desc' : 'asc' }; desenhar(); },
          vazio: itens.length ? 'Nenhum cadastro com esse filtro.' : 'Nenhum cadastro enviado ainda.',
        }));
      } else {
        if (!painel.contains(mapa.raiz)) trocar(painel, mapa.raiz);
        mapa.atualizar(vis);
      }
    }

    // Mantém a cidade escolhida quando a lista é recarregada
    function opcoesCidade() {
      const atual = cidade.value;
      const nomes = [...new Set(itens.map(rotuloCidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
      cidade.replaceChildren(h('option', { value: '', text: 'Todas' }), ...nomes.map(n => h('option', { value: n, text: n })));
      cidade.value = nomes.includes(atual) ? atual : '';
    }

    async function recarregar() {
      try { itens = await data.listar(); }
      catch (e) { if (vivo) trocar(painel, msg(e.message, 'neg'), h('button', { type: 'button', class: 'pf-btn', text: 'Tentar de novo', onclick: recarregar })); return; }
      if (!vivo) return;
      opcoesCidade(); desenhar();
    }

    abaTabela.onclick = () => { aba = 'tabela'; desenhar(); };
    abaMapa.onclick = () => { aba = 'mapa'; desenhar(); };
    busca.oninput = situacao.oninput = cidade.oninput = desenhar;
    limpar = () => { busca.oninput = situacao.oninput = cidade.oninput = null; };

    trocar(painel, h('p', { class: 'pf-info', role: 'status', text: 'Carregando…' }));
    await recarregar();
  },
};
