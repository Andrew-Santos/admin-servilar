// js/menu.js — menu lateral, painel de filtros, rotas (#/modulo) e carregamento dos módulos.
// Para criar um item novo: 1) adicione-o em MENU  2) crie a pasta painel/modules/<id>/ com module.js, ui.js, data.js, actions.js e style.css.
// Obs.: o caminho do CSS em `estilo` (module.js) é relativo ao index.html, ex.: 'modules/servicos/style.css'.

export const MENU = [
  { grupo: 'Cadastros', itens: [
    { id: 'especialidades', titulo: 'Especialidades',    icone: 'wrench' },
    { id: 'servicos',       titulo: 'Serviços',          icone: 'toolbox' },
    { id: 'profissionais',  titulo: 'Profissionais',     icone: 'hard-hat' },
    { id: 'clientes',       titulo: 'Clientes',          icone: 'users' },
    { id: 'regioes',        titulo: 'Regiões',           icone: 'map-pin' },
    { id: 'precos',         titulo: 'Preços por região', icone: 'currency-circle-dollar' },
  ]},
];

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
const ler = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };

function carregarCss(href) {
  if (!href) return Promise.resolve(null);
  return new Promise(res => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    l.onload = l.onerror = () => res(l);
    document.head.append(l);
  });
}

export function iniciarMenu(ctx) {
  const $ = id => document.getElementById(id);
  const app = $('app'), conteudo = $('conteudo'), filtros = $('filtros');
  const mobile = matchMedia('(max-width:900px)');

  // Itens visíveis (a regra "master" aqui é só visual: o servidor é quem deve barrar o acesso)
  const visiveis = MENU.map(g => ({ ...g, itens: g.itens.filter(i => !i.master || ctx.admin.master) })).filter(g => g.itens.length);
  const itens = visiveis.flatMap(g => g.itens);

  $('nav').innerHTML = visiveis.map(g =>
    `<div class="nav-grupo">${g.grupo}</div>` +
    g.itens.map(i => `<a class="nav-item" href="#/${i.id}" data-id="${i.id}" title="${i.titulo}"><i class="ph ph-${i.icone}"></i><span class="nav-txt">${i.titulo}</span></a>`).join('')
  ).join('');

  // ── Painéis (menu e filtros: só abrem/fecham pelo clique) ──
  app.classList.toggle('sb-min', ler('servilar_sb') === 'min');
  app.classList.toggle('fl-min', ler('servilar_fl') === 'min');

  const sincronizar = () => {
    $('sb-toggle').setAttribute('aria-expanded', !app.classList.contains('sb-min'));
    $('fl-toggle').setAttribute('aria-expanded', !app.classList.contains('fl-min'));
  };
  sincronizar();

  $('sb-toggle').onclick = () => {
    if (mobile.matches) return app.classList.remove('sb-open');
    guardar('servilar_sb', app.classList.toggle('sb-min') ? 'min' : 'max');
    sincronizar();
  };
  $('fl-toggle').onclick = () => {
    guardar('servilar_fl', app.classList.toggle('fl-min') ? 'min' : 'max');
    sincronizar();
  };
  $('btn-menu').onclick = () => app.classList.add('sb-open');
  $('btn-filtros').onclick = () => app.classList.add('fl-open');
  $('fl-fechar').onclick = $('backdrop').onclick = () => app.classList.remove('sb-open', 'fl-open');
  $('fl-limpar').onclick = () => filtros.querySelectorAll('input,select').forEach(el => {
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true })); // o módulo reage como se o usuário tivesse limpado
  });

  // ── Módulos ──
  let seq = 0, atual = null;

  async function descarregar() {
    if (!atual) return;
    try { await atual.mod.desmontar?.(); } catch (e) { console.error(e); }
    atual.link?.remove();
    atual = null;
  }

  async function abrir() {
    const id = location.hash.replace('#/', '');
    const item = itens.find(i => i.id === id) || itens[0];
    if (!item) return;
    if (item.id !== id) { location.replace('#/' + item.id); return; } // dispara hashchange de novo

    const minha = ++seq;
    await descarregar();

    document.querySelectorAll('.nav-item').forEach(a => {
      const on = a.dataset.id === item.id;
      a.classList.toggle('ativo', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    $('ct-titulo').textContent = item.titulo;
    document.title = `${item.titulo} — Servilar.co`;
    app.classList.remove('sb-open', 'fl-open');

    conteudo.className = `ct-body mod-${item.id}`;
    filtros.className = `fl-body mod-${item.id}`;
    conteudo.innerHTML = '<p class="ct-msg">Carregando…</p>';
    filtros.innerHTML = '';

    try {
      const mod = (await import(`../painel/modules/${item.id}/module.js`)).default;
      const link = await carregarCss(mod.estilo);
      if (minha !== seq) { link?.remove(); return; } // o usuário já trocou de item
      atual = { mod, link };
      conteudo.innerHTML = '';
      await mod.montar({ conteudo, filtros, ...ctx });
    } catch (e) {
      console.error(e);
      if (minha === seq) conteudo.innerHTML = '<p class="ct-msg">Este módulo ainda não foi implementado.</p>';
    }
    if (minha === seq && !filtros.hasChildNodes()) filtros.innerHTML = '<p class="ct-msg">Este módulo ainda não tem filtros.</p>';
  }

  addEventListener('hashchange', abrir);
  abrir();
}