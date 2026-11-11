// modules/profissionais/ui-mapa.js — mapa de todos os profissionais (Leaflet + OpenStreetMap: conteúdo público, sem chave)
import { COR_MAPA, SITUACAO_CADASTRO, rotuloCidade } from './actions.js';
import { h, msg, selo, trocar } from './ui.js';

const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
let carregando = null;
function carregarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  carregando ||= new Promise((ok, falha) => {
    const erro = () => { carregando = null; falha(new Error('Não foi possível carregar o mapa. Verifique a conexão e tente de novo.')); };
    document.head.append(h('link', { rel: 'stylesheet', href: LEAFLET + 'leaflet.css' }), h('script', { src: LEAFLET + 'leaflet.js', onload: () => ok(window.L), onerror: erro }));
  });
  return carregando;
}

const legenda = () => h('ul', { class: 'pf-legenda', 'aria-label': 'Legenda do mapa' },
  ...Object.entries(COR_MAPA).map(([st, cor]) => h('li', {}, h('span', { class: 'pf-ponto', style: `background:${cor}` }), SITUACAO_CADASTRO[st].texto)));

// criarMapa({ aoAbrir(id) }) → { raiz, atualizar(itens), destruir() }
export function criarMapa({ aoAbrir }) {
  const cidades = h('div', { class: 'pf-cidades' });
  const aviso = h('span', { class: 'pf-mapa-aviso' });
  const caixa = h('div', { class: 'pf-mapa-caixa', role: 'region', 'aria-label': 'Mapa dos profissionais' });
  const raiz = h('div', { class: 'pf-mapa' }, h('div', { class: 'pf-mapa-topo' }, cidades, aviso), caixa, legenda());
  let L, mapa, camada, lista = [], iniciando = false;

  const popup = i => h('div', { class: 'pf-pop' },
    h('strong', { text: i.nome }), h('span', { text: rotuloCidade(i) || 'Cidade não informada' }),
    selo(SITUACAO_CADASTRO[i.status] || { texto: i.status, cor: '' }),
    h('button', { type: 'button', class: 'pf-btn', text: 'Abrir cadastro', onclick: () => { mapa.closePopup(); aoAbrir(i.id); } }));

  function enquadrar(pontos) {
    if (!pontos.length) return mapa.setView([-14.2, -51.9], 4); // Brasil
    mapa.fitBounds(L.latLngBounds(pontos.map(i => [i.lat, i.lng])), { padding: [40, 40], maxZoom: 13 });
  }

  // Cidades com mais profissionais: ajuda a ver onde já há gente e onde falta
  function desenharCidades(com) {
    const cont = new Map();
    lista.forEach(i => { const r = rotuloCidade(i); if (r) cont.set(r, (cont.get(r) || 0) + 1); });
    const top = [...cont].sort((a, b) => b[1] - a[1]).slice(0, 8);
    trocar(cidades, top.length ? h('span', { class: 'pf-cidades-tit', text: 'Mais cadastros:' }) : null,
      ...top.map(([nome, n]) => h('button', { type: 'button', class: 'pf-chip', text: `${nome} · ${n}`, onclick: () => enquadrar(com.filter(i => rotuloCidade(i) === nome)) })));
  }

  function desenhar() {
    camada.clearLayers();
    const com = lista.filter(i => i.lat !== null && i.lng !== null);
    com.forEach(i => L.circleMarker([i.lat, i.lng], { radius: 8, color: '#fff', weight: 2, fillColor: COR_MAPA[i.status] || '#7C8F8D', fillOpacity: .95 })
      .bindPopup(popup(i)).bindTooltip(i.nome).addTo(camada));
    const sem = lista.length - com.length;
    aviso.textContent = sem ? `${sem} sem localização no mapa` : '';
    desenharCidades(com);
    enquadrar(com);
  }

  async function iniciar() {
    if (mapa || iniciando) return;
    iniciando = true;
    trocar(caixa, h('p', { class: 'pf-info', role: 'status', text: 'Carregando mapa…' }));
    try { L = await carregarLeaflet(); }
    catch (e) { iniciando = false; return trocar(caixa, msg(e.message, 'neg')); }
    caixa.replaceChildren();
    mapa = L.map(caixa, { zoomControl: true }).setView([-14.2, -51.9], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
    camada = L.layerGroup().addTo(mapa);
    iniciando = false;
    desenhar();
  }

  return {
    raiz,
    // Chamar depois de a raiz estar na tela (o Leaflet precisa do tamanho real)
    atualizar(itens) {
      lista = itens;
      if (!mapa) return iniciar();
      mapa.invalidateSize();
      desenhar();
    },
    destruir() { mapa?.remove(); mapa = null; },
  };
}
