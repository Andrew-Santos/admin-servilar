// modules/servicos/module.js — Serviços: cada especialidade traz, dentro dela, os seus serviços
import * as data from './data.js';
import { h, plural, norm } from './ui.js';
import { blocoEspecialidade, vazioLista } from './ui-lista.js';
import { criarEspecialidade } from './especialidade.js';
import { criarServico } from './servico.js';

let vivo = false, timer = 0, limpar = null;
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt');

const HTML = `
  <div class="cat">
    <section class="cat-main">
      <div class="cat-bar">
        <div class="cat-tit"><h2>Serviços</h2><b id="cat-n">0</b><span class="cat-sub" id="cat-sub"></span></div>
        <span class="cat-tudo"><button type="button" class="sv-lk" id="cat-abrir">Expandir tudo</button><button type="button" class="sv-lk" id="cat-fechar">Recolher tudo</button></span>
        <button type="button" class="cat-novo" id="cat-nova-esp"><i class="ph ph-plus"></i> Cadastrar especialidade</button>
      </div>
      <div class="cat-lista" id="cat-lista"></div>
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

    <div class="sv-ov" id="sv-ov" hidden>
      <div class="sv-dlg" id="sv-dlg" role="dialog" aria-modal="true" aria-labelledby="sv-dt" tabindex="-1">
        <header class="sv-dh">
          <div class="sv-ht">
            <h3 id="sv-dt"></h3>
            <div class="sv-hs" id="sv-hs" hidden></div>
          </div>
          <small class="sv-sujo" id="sv-sujo" hidden>● não salvo</small>
          <span class="sv-dacoes" id="sv-dacoes"></span>
        </header>
        <nav class="sv-tabs" id="sv-tabs" role="tablist" hidden></nav>
        <div class="sv-db" id="sv-db"></div>
        <footer class="sv-df" id="sv-df"></footer>
      </div>
    </div>

    <div class="cat-toast" id="cat-toast" role="status" aria-live="polite" hidden></div>
  </div>`;

const FILTROS = `
  <label class="sv-lbl" for="cat-q">Buscar</label>
  <input id="cat-q" class="sv-campo" type="search" maxlength="60" autocomplete="off" placeholder="Especialidade ou serviço">
  <label class="sv-lbl" for="cat-fs">Status</label>
  <select id="cat-fs" class="sv-campo"><option value="">Todos</option><option value="1">Ativos</option><option value="0">Inativos</option></select>
  <label class="sv-lbl" for="cat-fu">Especialidade disponível em</label>
  <select id="cat-fu" class="sv-campo"><option value="">Todos os estados</option></select>`;

export default {
  estilo: 'modules/servicos/style.css',
  desmontar() { vivo = false; clearTimeout(timer); limpar?.(); limpar = null; },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);
    conteudo.innerHTML = HTML; filtros.innerHTML = FILTROS;

    const $ = s => conteudo.querySelector(s) || filtros.querySelector(s);
    let esp = [], sv = [], primeira = true;
    const abertas = new Set();                     // especialidades abertas (a busca abre as que têm resultado)

    function toast(t) {
      const el = $('#cat-toast'); el.textContent = t; el.hidden = false;
      clearTimeout(timer); timer = setTimeout(() => { el.hidden = true; }, 3200);
    }
    // o select de serviço usa `ativo`; a especialidade usa `status`
    const sincronizar = () => servico.definir({ sv, esps: esp.map(e => ({ id: e.id, nome: e.nome, ativo: e.status })) });

    const especialidade = criarEspecialidade({
      $, conteudo, toast,
      qtdServicos: id => sv.filter(s => s.especialidade_id === id).length,
      aoSalvar: (r, nova) => {
        esp = (nova ? [...esp, r] : esp.map(x => x.id === r.id ? r : x)).sort(porNome);
        if (nova) abertas.add(r.id);
        especialidade.definir({ esp }); sincronizar(); renderLista();
      },
      aoExcluir: e => {
        esp = esp.filter(x => x.id !== e.id); abertas.delete(e.id);
        especialidade.definir({ esp }); sincronizar(); renderLista();
      },
    });
    const servico = criarServico({
      $, conteudo, toast,
      aoSalvar: (r, novo) => {
        sv = novo ? [...sv, r] : sv.map(x => x.id === r.id ? r : x);
        abertas.add(r.especialidade_id);           // deixa a especialidade aberta para ver o serviço
        servico.definir({ sv }); renderLista();
      },
      aoExcluir: s => { sv = sv.filter(x => x.id !== s.id); servico.definir({ sv }); renderLista(); },
    });
    limpar = () => { especialidade.desligar(); servico.desligar(); };

    // ── Lista (com os filtros do painel) ──
    function renderLista() {
      const q = norm($('#cat-q').value.trim()), fs = $('#cat-fs').value, fu = $('#cat-fu').value;
      const stOk = ativo => !fs || (fs === '1') === ativo;
      const blocos = [];
      esp.forEach(e => {
        if (fu && !especialidade.ufDe(e).includes(fu)) return;
        const seus = sv.filter(s => s.especialidade_id === e.id).sort(porNome);
        const daEsp = !q || norm(e.nome).includes(q) || norm(e.descricao).includes(q);   // a busca bateu na especialidade: mostra todos os serviços dela
        const lista = seus.filter(s => stOk(s.ativo) && (daEsp || norm(s.nome).includes(q) || norm(s.descricao).includes(q)));
        if (!(daEsp && stOk(e.status)) && !lista.length) return;
        blocos.push(blocoEspecialidade(e, {
          servicos: lista, total: seus.length, filtrado: lista.length !== seus.length, aberto: abertas.has(e.id) || !!q,
          onAlternar: abre => { abre ? abertas.add(e.id) : abertas.delete(e.id); },
          onDetalhes: () => especialidade.ver(e, `[data-detalhes="${e.id}"]`),
          onNovoServico: () => servico.novo(e.id, `[data-novo-sv="${e.id}"]`),
          onAbrirServico: s => servico.ver(s, `[data-sv="${s.id}"] .nb`),
        }));
      });
      $('#cat-n').textContent = blocos.length === esp.length ? esp.length : `${blocos.length}/${esp.length}`;
      const ativos = sv.filter(s => s.ativo).length;
      $('#cat-sub').textContent = `${plural(sv.length, 'serviço', 'serviços')} · ${plural(ativos, 'ativo', 'ativos')}`;
      $('#cat-lista').replaceChildren(...(blocos.length ? blocos : [esp.length
        ? vazioLista('Nenhuma especialidade ou serviço com esses filtros.')
        : vazioLista('Nenhuma especialidade cadastrada ainda.',
            h('button', { type: 'button', class: 'btn-borda', text: 'Cadastrar especialidade', onclick: () => especialidade.cadastrar('#cat-nova-esp') }))]));
    }

    // ── Eventos gerais ──
    $('#cat-q').oninput = $('#cat-fs').oninput = $('#cat-fu').oninput = () => renderLista();
    $('#cat-nova-esp').onclick = () => especialidade.cadastrar('#cat-nova-esp');
    $('#cat-abrir').onclick = () => { esp.forEach(e => abertas.add(e.id)); renderLista(); };
    $('#cat-fechar').onclick = () => { abertas.clear(); renderLista(); };

    // ── Carga inicial ──
    const carregar = async () => {
      $('#cat-lista').replaceChildren(vazioLista('Carregando…'));
      try {
        // se os preços por município falharem (ex.: tabela ainda não criada), o resto continua funcionando
        const [de, ds, dp] = await Promise.all([
          data.carregarEspecialidades(), data.carregarServicos(),
          data.carregarPrecos().catch(e => { console.error(e); return null; })]);
        if (!vivo) return;
        esp = [...de.especialidades].sort(porNome); sv = [...ds.servicos];
        especialidade.definir({ esp, regioes: de.regioes }); servico.definirPrecos(dp); sincronizar();
        $('#cat-fu').replaceChildren(h('option', { value: '', text: 'Todos os estados' }), ...especialidade.ufs().map(u => h('option', { value: u, text: u })));
        if (primeira) { primeira = false; if (esp[0]) abertas.add(esp[0].id); }
        renderLista();
      } catch (e) {
        console.error(e);
        if (vivo) $('#cat-lista').replaceChildren(vazioLista('Não foi possível carregar.', h('button', { type: 'button', class: 'btn-borda', text: 'Tentar novamente', onclick: carregar })));
      }
    };
    await carregar();
  },
};
