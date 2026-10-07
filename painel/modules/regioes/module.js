// modules/regioes/module.js
import * as data from './data.js';
import { desenhar } from './ui.js';
import { cadastrar, alterarAtivo, remover } from './actions.js';

let vivo = false;
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default {
  estilo: 'modules/regioes/style.css',
  desmontar() { vivo = false; },

  async montar({ conteudo, filtros, Auth }) {
    vivo = true; data.iniciar(Auth);
    conteudo.innerHTML = `
      <div class="rg">
        <section class="rg-mapa">
          <div class="rg-bar"><button class="btn-borda" id="rg-voltar" hidden><i class="ph ph-arrow-left"></i> Brasil</button><span id="rg-dica" role="status">Carregando mapa…</span></div>
          <div class="rg-stage">
            <svg id="rg-svg" role="img" aria-label="Mapa do Brasil"></svg>
            <div class="rg-zoom">
              <button type="button" id="rg-zin" aria-label="Aproximar" title="Aproximar"><i class="ph ph-plus"></i></button>
              <button type="button" id="rg-zout" aria-label="Afastar" title="Afastar"><i class="ph ph-minus"></i></button>
              <button type="button" id="rg-zreset" aria-label="Ver tudo" title="Ver tudo"><i class="ph ph-corners-out"></i></button>
            </div>
            <ul class="rg-leg" aria-label="Legenda">
              <li><i class="k livre"></i>Disponível</li><li><i class="k sel"></i>Selecionada</li><li><i class="k reg"></i>Já cadastrada</li><li><i class="k off"></i>Desativada</li>
            </ul>
          </div>
        </section>
        <aside class="rg-lado">
          <div class="rg-abas" role="tablist">
            <button type="button" role="tab" id="rg-aba-p" aria-selected="true">Para cadastrar <b id="rg-n">0</b></button>
            <button type="button" role="tab" id="rg-aba-c" aria-selected="false">Cadastradas <b id="rg-cad-n">0</b></button>
          </div>
          <div class="rg-painel" id="rg-pp">
            <button type="button" class="rg-limpar" id="rg-limpar" hidden>Limpar tudo</button>
            <ul id="rg-sel"></ul>
          </div>
          <div class="rg-painel" id="rg-pc" hidden>
            <p class="rg-cap" id="rg-cad-t"></p>
            <ul id="rg-cad"></ul>
          </div>
          <div class="rg-rodape">
            <button class="rg-salvar" id="rg-salvar" disabled>Cadastrar cidades</button>
            <p id="rg-msg" role="status"></p>
          </div>
        </aside>
      </div>`;
    filtros.innerHTML = `
      <label class="rg-lbl" for="rg-uf">Estado</label>
      <select id="rg-uf" class="rg-campo"><option value="">Brasil</option>${Object.values(data.UFS).map(u => `<option>${u}</option>`).join('')}</select>
      <label class="rg-lbl" for="rg-q">Buscar cidade</label>
      <input id="rg-q" class="rg-campo" type="search" maxlength="60" autocomplete="off" disabled placeholder="Escolha um estado">
      <ul class="rg-res" id="rg-res"></ul>`;

    const $ = s => conteudo.querySelector(s) || filtros.querySelector(s);
    const svg = $('#rg-svg'), dica = $('#rg-dica');
    const reg = new Set(), pend = new Map();
    const cad = new Map(), semCodigo = [];   // cadastradas: com código IBGE (no mapa) / linhas antigas sem código
    let uf = '', nomes = new Map(), paths = new Map(), mapa = null, seq = 0;

    const msg = t => { $('#rg-msg').textContent = t; };
    const aba = c => {   // 'p' = para cadastrar, 'c' = cadastradas
      $('#rg-pp').hidden = c !== 'p'; $('#rg-pc').hidden = c !== 'c';
      $('#rg-aba-p').setAttribute('aria-selected', c === 'p'); $('#rg-aba-c').setAttribute('aria-selected', c === 'c');
    };

    // rótulo de cada polígono: cadastradas > selecionadas > capital > demais (por tamanho, conforme o zoom)
    const rotulo = id => {
      if (!uf) return { texto: data.UFS[id], peso: 1, classe: 'uf', px: 12 };
      const n = +id, texto = nomes.get(n);
      if (!texto) return null;
      if (reg.has(n)) return { texto, peso: 3, classe: cad.get(n)?.ativo === false ? 'off' : 'reg' };
      if (pend.has(n)) return { texto, peso: 2, classe: 'sel' };
      return data.CAPITAIS.has(n) ? { texto, peso: 1, classe: 'cap' } : { texto, peso: 0, classe: '' };
    };

    const pintar = () => {
      paths.forEach((p, id) => {
        p.classList.toggle('reg', reg.has(+id)); p.classList.toggle('sel', pend.has(+id));
        p.classList.toggle('off', reg.has(+id) && cad.get(+id)?.ativo === false);
      });
      mapa?.rotular();
    };
    const lista = () => {
      $('#rg-sel').replaceChildren(...[...pend.values()].map(c => {
        const li = document.createElement('li'), s = document.createElement('span'), b = document.createElement('button');
        s.textContent = `${c.nome} (${c.uf})`; s.title = 'Ver no mapa'; s.onclick = () => mapa?.focar(c.id);
        b.className = 'btn-ico'; b.setAttribute('aria-label', 'Remover ' + c.nome); b.innerHTML = '<i class="ph ph-x"></i>';
        b.onclick = () => alternar(c.id);
        li.append(s, b); return li;
      }));
      const n = pend.size;
      $('#rg-n').textContent = n; $('#rg-salvar').disabled = !n; $('#rg-limpar').hidden = !n;
      $('#rg-salvar').textContent = n ? `Cadastrar ${n} cidade${n > 1 ? 's' : ''}` : 'Cadastrar cidades';
    };

    // Ações sobre cidades já cadastradas: desativar/reativar e excluir (com confirmação na própria linha)
    let confirmando = null, ocupado = false;
    const botao = (cls, texto, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = texto; b.onclick = fn; return b; };
    const acao = (icone, rot, fn, cls = '') => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'rg-ac ' + cls; b.title = rot; b.setAttribute('aria-label', rot);
      b.innerHTML = `<i class="ph ${icone}"></i>`; b.onclick = fn; return b;
    };
    async function trocarAtivo(r) {
      if (ocupado) return; ocupado = true; msg('Salvando…');
      const novo = r.ativo === false;
      try { await alterarAtivo(r.ibge_id, novo); r.ativo = novo; msg(`${r.cidade} ${novo ? 'reativada' : 'desativada'}.`); }
      catch (e) { console.error(e); msg('Não foi possível alterar. Tente novamente.'); }
      ocupado = false; pintar(); listaCad();
    }
    async function excluirCidade(r) {
      if (ocupado) return; ocupado = true; msg('Excluindo…');
      try {
        await remover(r.ibge_id);
        cad.delete(r.ibge_id); reg.delete(r.ibge_id); confirmando = null;
        msg(`${r.cidade} excluída.`);
      } catch (e) {
        console.error(e); confirmando = null;
        msg(String(e.message).startsWith('Não é possível') ? e.message : 'Não foi possível excluir. Tente novamente.');
      }
      ocupado = false; pintar(); listaCad();
    }
    const linhaCad = r => {
      const li = document.createElement('li'), id = r.ibge_id;
      if (id && id === confirmando) {
        li.className = 'conf';
        const t = document.createElement('span'); t.textContent = `Excluir ${r.cidade}?`;
        li.append(t, botao('rg-sim', 'Excluir', () => excluirCidade(r)), botao('rg-nao', 'Cancelar', () => { confirmando = null; listaCad(); }));
        return li;
      }
      const off = r.ativo === false, b = document.createElement('button'), s = document.createElement('span');
      if (off) li.className = 'off';
      b.type = 'button'; b.className = 'rg-it'; s.textContent = r.cidade || '—'; b.append(s);
      if (off) { const e = document.createElement('small'); e.textContent = 'desativada'; b.append(e); }
      li.append(b);
      if (id) {
        b.onclick = () => mapa?.focar(id);
        li.append(
          acao('ph-power', (off ? 'Reativar ' : 'Desativar ') + r.cidade, () => trocarAtivo(r)),
          acao('ph-trash', 'Excluir ' + r.cidade, () => { confirmando = id; listaCad(); }, 'perigo'));
      } else b.disabled = true;   // linha antiga sem código IBGE: só aparece na lista
      return li;
    };

    // Lista lateral: no Brasil, contagem por estado; dentro de um estado, as cidades já cadastradas nele
    const listaCad = () => {
      const todas = [...cad.values(), ...semCodigo];
      const item = (texto, extra, fn) => {
        const li = document.createElement('li'), b = document.createElement('button'), s = document.createElement('span');
        b.type = 'button'; b.className = 'rg-it'; s.textContent = texto; b.append(s);
        if (extra) { const e = document.createElement('small'); e.textContent = extra; b.append(e); }
        if (fn) b.onclick = fn; else b.disabled = true;
        li.append(b); return li;
      };
      if (!uf) {
        const por = new Map();
        todas.forEach(r => { const u = r.uf || '?'; por.set(u, (por.get(u) || 0) + 1); });
        $('#rg-cad-n').textContent = todas.length; $('#rg-cad-t').textContent = 'Por estado — clique para abrir o mapa';
        $('#rg-cad').replaceChildren(...[...por].sort(([a], [b]) => a.localeCompare(b)).map(([u, n]) =>
          item(u, n + (n === 1 ? ' cidade' : ' cidades'), u === '?' ? null : () => { $('#rg-uf').value = u; abrir(u); })));
      } else {
        const lst = todas.filter(r => r.uf === uf).sort((a, b) => (a.cidade || '').localeCompare(b.cidade || '', 'pt'));
        $('#rg-cad-n').textContent = lst.length; $('#rg-cad-t').textContent = `Em ${uf} — clique no nome para ver no mapa`;
        $('#rg-cad').replaceChildren(...lst.map(linhaCad));
      }
    };

    function alternar(id) {
      if (reg.has(id)) return msg(cad.get(id)?.ativo === false ? 'Esta cidade está desativada. Reative-a na aba Cadastradas.' : 'Esta cidade já está cadastrada.');
      msg('');
      if (pend.has(id)) pend.delete(id);
      else {
        const nome = nomes.get(id);
        if (!nome) return;
        if (pend.size >= 100) return msg('Máximo de 100 cidades por vez.');
        pend.set(id, { id, nome, uf });
        aba('p');
      }
      pintar(); lista();
    }

    async function abrir(sigla) {
      const eu = ++seq; uf = sigla;
      $('#rg-voltar').hidden = !sigla; $('#rg-q').disabled = !sigla;
      $('#rg-q').value = ''; $('#rg-q').placeholder = sigla ? 'Digite o nome da cidade' : 'Escolha um estado'; $('#rg-res').replaceChildren();
      dica.textContent = 'Carregando mapa…';
      confirmando = null; listaCad();
      try {
        const cod = sigla && data.codUF(sigla);
        const [geo, nm] = sigla ? await Promise.all([data.malhaUF(cod), data.municipios(cod)]) : [await data.malhaBrasil(), new Map()];
        if (eu !== seq || !vivo) return;
        nomes = nm;
        mapa = desenhar(svg, geo, {
          clique: id => sigla ? alternar(+id) : (($('#rg-uf').value = data.UFS[id]), abrir(data.UFS[id])),
          hover: id => { dica.textContent = sigla ? (nomes.get(+id) || '') : (data.UFS[id] || ''); },
          rotulo,
        });
        paths = mapa.paths;
        dica.textContent = sigla ? 'Clique nas cidades para selecionar · role para dar zoom, arraste para mover' : 'Clique em um estado · role para dar zoom';
        pintar();
      } catch (e) {
        if (eu === seq) dica.textContent = 'Não foi possível carregar o mapa. Tente novamente.';
      }
    }

    $('#rg-aba-p').onclick = () => aba('p');
    $('#rg-aba-c').onclick = () => aba('c');
    $('#rg-limpar').onclick = () => { pend.clear(); msg(''); pintar(); lista(); };
    $('#rg-zin').onclick = () => mapa?.zoom(1.8);
    $('#rg-zout').onclick = () => mapa?.zoom(1 / 1.8);
    $('#rg-zreset').onclick = () => mapa?.reset();

    $('#rg-uf').oninput = e => abrir(e.target.value);           // "Limpar" do painel dispara 'input'
    $('#rg-voltar').onclick = () => { $('#rg-uf').value = ''; abrir(''); };
    $('#rg-q').oninput = e => {
      const q = norm(e.target.value.trim());
      const achados = q ? [...nomes].filter(([, n]) => norm(n).includes(q)).slice(0, 8) : [];
      $('#rg-res').replaceChildren(...achados.map(([id, n]) => {
        const li = document.createElement('li'), b = document.createElement('button');
        b.textContent = n; b.className = reg.has(id) ? 'reg' : pend.has(id) ? 'sel' : '';
        b.onclick = () => { alternar(id); mapa?.focar(id); b.className = reg.has(id) ? 'reg' : pend.has(id) ? 'sel' : ''; };
        li.append(b); return li;
      }));
    };
    $('#rg-salvar').onclick = async () => {
      $('#rg-salvar').disabled = true; msg('Salvando…');
      try {
        const ids = await cadastrar(pend);
        ids.forEach(i => { reg.add(i); const c = pend.get(i); if (c) cad.set(i, { ibge_id: i, cidade: c.nome, uf: c.uf }); });
        pend.clear(); listaCad(); aba('c');
        msg(`${ids.length} cidade(s) cadastrada(s).`);
      } catch (e) { console.error(e); msg('Não foi possível cadastrar. Tente novamente.'); }
      pintar(); lista();
    };

    try {
      (await data.listar()).forEach(r => { if (r.ibge_id) { reg.add(r.ibge_id); cad.set(r.ibge_id, r); } else semCodigo.push(r); });
    } catch (e) { console.error(e); }
    if (vivo) abrir('');
  },
};