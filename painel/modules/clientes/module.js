// modules/clientes/module.js — Clientes (somente consulta): tabela com filtros; clicar num cliente abre a ficha em janela.
// Não há "cadastrar" aqui: o cliente é criado no atendimento pelo WhatsApp.
import * as data from './data.js';
import { ordenar, passaBusca, passaFiltroDados, resumoClientes, rotuloCidade, FILTROS_DADOS } from './actions.js';
import { abrirFicha } from './module-ficha.js';
import { criarMapa } from './ui-mapa.js';
import { tabela } from './ui-tabela.js';
import { h, icone, msg, plural, trocar } from './ui.js';

let vivo = false, limpar = null, mapa = null;

export default {
  estilo: 'modules/clientes/style.css',
  desmontar() {
    vivo = false; limpar?.(); limpar = null;
    mapa?.destruir(); mapa = null;
    document.querySelectorAll('dialog.cl-janela').forEach(d => d.close());
  },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);

    // ── Filtros ──
    filtros.innerHTML = `
      <div class="cl-fl"><label for="cl-q">Buscar</label><input id="cl-q" class="cl-campo" type="search" maxlength="60" autocomplete="off" placeholder="Nome, WhatsApp ou CPF"></div>
      <div class="cl-fl"><label for="cl-ci">Cidade</label><select id="cl-ci" class="cl-campo"><option value="">Todas</option></select></div>
      <div class="cl-fl"><label for="cl-dd">Dados do cadastro</label>
        <select id="cl-dd" class="cl-campo"><option value="">Todos</option>${FILTROS_DADOS.map(f => `<option value="${f.id}">${f.texto}</option>`).join('')}</select></div>`;
    const busca = filtros.querySelector('#cl-q'), cidade = filtros.querySelector('#cl-ci'), dados = filtros.querySelector('#cl-dd');

    // ── Estrutura: barra (título, contador, resumo, abas) e painel (tabela ou mapa) ──
    const contador = h('b', { text: '0' }), sub = h('span', { class: 'cl-sub' });
    const abaTabela = h('button', { type: 'button', role: 'tab', class: 'cl-aba' }, icone('table'), ' Tabela');
    const abaMapa = h('button', { type: 'button', role: 'tab', class: 'cl-aba' }, icone('map-trifold'), ' Mapa');
    const painel = h('div', { class: 'cl-painel' });
    trocar(conteudo, h('div', { class: 'cl' },
      h('div', { class: 'cl-bar' }, h('h2', { text: 'Clientes' }), contador, sub, h('div', { class: 'cl-abas', role: 'tablist' }, abaTabela, abaMapa)), painel));

    mapa = criarMapa({ aoAbrir: id => abrir(id) });
    let itens = [], aba = 'tabela', ordem = { col: 'cadastro', dir: 'desc' };

    const abrir = id => abrirFicha({ id, nome: itens.find(i => i.id === id)?.nome || 'Cliente' });

    const visiveis = () => itens.filter(i => passaBusca(i, busca.value) && (!cidade.value || rotuloCidade(i) === cidade.value) && passaFiltroDados(i, dados.value));

    function desenhar() {
      const vis = visiveis(), r = resumoClientes(itens);
      contador.textContent = vis.length === itens.length ? String(itens.length) : `${vis.length}/${itens.length}`;
      sub.textContent = itens.length
        ? [plural(r.novos, 'novo nos últimos 7 dias', 'novos nos últimos 7 dias'), r.semEndereco ? plural(r.semEndereco, 'sem endereço', 'sem endereço') : ''].filter(Boolean).join(' · ')
        : '';
      [[abaTabela, 'tabela'], [abaMapa, 'mapa']].forEach(([b, id]) => { b.classList.toggle('ativa', aba === id); b.setAttribute('aria-selected', aba === id); });

      if (aba === 'tabela') {
        trocar(painel, tabela({
          itens: ordenar(vis, ordem), ordem, aoAbrir: abrir,
          aoOrdenar: col => { ordem = { col, dir: ordem.col === col && ordem.dir === 'asc' ? 'desc' : 'asc' }; desenhar(); },
          vazio: itens.length ? 'Nenhum cliente com esses filtros.' : 'Nenhum cliente ainda. Eles aparecem aqui quando fazem o primeiro atendimento pelo WhatsApp.',
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

    async function carregar() {
      trocar(painel, h('p', { class: 'cl-info', role: 'status', text: 'Carregando…' }));
      try { itens = await data.listar(); }
      catch (e) { if (vivo) trocar(painel, msg(e.message, 'neg'), h('button', { type: 'button', class: 'cl-btn', text: 'Tentar de novo', onclick: carregar })); return; }
      if (!vivo) return;
      opcoesCidade(); desenhar();
    }

    abaTabela.onclick = () => { aba = 'tabela'; desenhar(); };
    abaMapa.onclick = () => { aba = 'mapa'; desenhar(); };
    busca.oninput = cidade.oninput = dados.oninput = desenhar;
    limpar = () => { busca.oninput = cidade.oninput = dados.oninput = null; };
    await carregar();
  },
};
