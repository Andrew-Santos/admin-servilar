// modules/cupons/module.js — Cupons de desconto: lista em tabela, filtros e janela do cupom
import * as data from './data.js';
import { h, plural, norm } from './ui.js';
import { situacao } from './ui-cupom.js';
import { tabela, vazioLista } from './ui-lista.js';
import { criarCupom } from './cupom.js';

let vivo = false, timer = 0, limpar = null;

const HTML = `
  <div class="cp">
    <section class="cp-main">
      <div class="cp-bar">
        <div class="cp-ttit"><h2>Cupons</h2><b id="cp-n">0</b><span class="cp-sub" id="cp-sub"></span></div>
        <button type="button" class="cp-novo" id="cp-novo"><i class="ph ph-plus"></i> Cadastrar cupom</button>
      </div>
      <div class="cp-lista" id="cp-lista"></div>
    </section>

    <div class="cp-ov" id="cp-ov" hidden>
      <div class="cp-dlg" id="cp-dlg" role="dialog" aria-modal="true" aria-labelledby="cp-dt" tabindex="-1">
        <header class="cp-dh">
          <h3 id="cp-dt"></h3><span id="cp-dp" class="cp-pill" hidden></span><small class="cp-sujo" id="cp-sujo" hidden>● não salvo</small>
          <span class="cp-dacoes" id="cp-dacoes"></span>
        </header>
        <div class="cp-db" id="cp-db"></div>
        <footer class="cp-df" id="cp-df"></footer>
      </div>
    </div>

    <div class="cp-toast" id="cp-toast" role="status" aria-live="polite" hidden></div>
  </div>`;

const FILTROS = `
  <label class="cp-lbl" for="cp-q">Buscar</label>
  <input id="cp-q" class="cp-campo" type="search" maxlength="60" autocomplete="off" placeholder="Nome ou descrição do cupom">
  <label class="cp-lbl" for="cp-fs">Situação</label>
  <select id="cp-fs" class="cp-campo"><option value="">Todas</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="expirado">Expirados</option><option value="esgotado">Esgotados</option></select>
  <label class="cp-lbl" for="cp-fq">Quem pode usar</label>
  <select id="cp-fq" class="cp-campo"><option value="">Todos</option><option value="todos">Qualquer pessoa</option><option value="cpf">Só um CPF</option></select>`;

export default {
  estilo: 'modules/cupons/style.css',
  desmontar() { vivo = false; clearTimeout(timer); limpar?.(); limpar = null; },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);
    conteudo.innerHTML = HTML; filtros.innerHTML = FILTROS;   // HTML fixo, sem dados do usuário

    const $ = s => conteudo.querySelector(s) || filtros.querySelector(s);
    let cupons = [];

    function toast(t) {
      const el = $('#cp-toast'); el.textContent = t; el.hidden = false;
      clearTimeout(timer); timer = setTimeout(() => { el.hidden = true; }, 3200);
    }

    const cupom = criarCupom({
      $, conteudo, toast,
      aoSalvar: (r, novo) => {
        cupons = novo ? [r, ...cupons] : cupons.map(x => x.id === r.id ? r : x);
        cupom.definir({ cupons }); renderLista();
      },
      aoExcluir: c => { cupons = cupons.filter(x => x.id !== c.id); cupom.definir({ cupons }); renderLista(); },
    });
    limpar = () => cupom.desligar();

    // ── Lista (com os filtros do painel) ──
    function renderLista() {
      const q = norm($('#cp-q').value.trim()), fs = $('#cp-fs').value, fq = $('#cp-fq').value;
      const lista = cupons.filter(c =>
        (!q || norm(c.codigo).includes(q) || norm(c.descricao).includes(q)) &&
        (!fs || situacao(c) === fs) &&
        (!fq || (fq === 'cpf') === !!c.cpf_mascarado));
      const disponiveis = cupons.filter(c => situacao(c) === 'ativo').length;
      $('#cp-n').textContent = lista.length === cupons.length ? cupons.length : `${lista.length}/${cupons.length}`;
      $('#cp-sub').textContent = `${plural(cupons.length, 'cupom', 'cupons')} · ${plural(disponiveis, 'disponível', 'disponíveis')}`;
      $('#cp-lista').replaceChildren(lista.length
        ? tabela(lista, c => cupom.ver(c, `tr[data-cp="${c.id}"] .cp-nb`))
        : vazioLista(cupons.length ? 'Nenhum cupom com esses filtros.' : 'Nenhum cupom cadastrado ainda.',
            cupons.length ? null : h('button', { type: 'button', class: 'btn-borda', text: 'Cadastrar cupom', onclick: () => cupom.cadastrar('#cp-novo') })));
    }

    // ── Eventos gerais ──
    $('#cp-q').oninput = $('#cp-fs').oninput = $('#cp-fq').oninput = () => renderLista();
    $('#cp-novo').onclick = () => cupom.cadastrar('#cp-novo');

    // ── Carga inicial ──
    const carregar = async () => {
      $('#cp-lista').replaceChildren(vazioLista('Carregando…'));
      try {
        const d = await data.carregarCupons();
        if (!vivo) return;
        cupons = d.cupons; cupom.definir({ cupons }); renderLista();
      } catch (e) {
        console.error(e.message);
        if (vivo) $('#cp-lista').replaceChildren(vazioLista('Não foi possível carregar.', h('button', { type: 'button', class: 'btn-borda', text: 'Tentar novamente', onclick: carregar })));
      }
    };
    await carregar();
  },
};
