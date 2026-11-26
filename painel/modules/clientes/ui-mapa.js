// modules/clientes/ui-mapa.js — mapa dos clientes (Leaflet + OpenStreetMap: conteúdo público, sem chave)
// O pino é o endereço principal do cliente (ou o primeiro que tiver ponto). Cliente sem ponto não aparece no mapa.
import { COR_MAPA, cadastroCompleto, rotuloCidade } from './actions.js';
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

const legenda = () => h('ul', { class: 'cl-legenda', 'aria-label': 'Legenda do mapa' },
  ...Object.values(COR_MAPA).map(c => h('li', {}, h('span', { class: 'cl-ponto', style: `background:${c.cor}` }), c.texto)));

// criarMapa({ aoAbrir(id) }) → { raiz, atualizar(itens), destruir() }
export function criarMapa({ aoAbrir }) {
  const cidades = h('div', { class: 'cl-cidades' });
  const aviso = h('span', { class: 'cl-mapa-aviso' });
  const caixa = h('div', { class: 'cl-mapa-caixa', role: 'region', 'aria-label': 'Mapa dos clientes' });
  const raiz = h('div', { class: 'cl-mapa' }, h('div', { class: 'cl-mapa-topo' }, cidades, aviso), caixa, legenda());
  let L, mapa, camada, lista = [], iniciando = false;

  const tipo = i => COR_MAPA[cadastroCompleto(i) ? 'completo' : 'incompleto'];

  const popup = i => h('div', { class: 'cl-pop' },
    h('strong', { text: i.nome || 'Cliente sem nome' }), h('span', { text: rotuloCidade(i) || 'Cidade não informada' }),
    selo({ texto: tipo(i).texto, cor: cadastroCompleto(i) ? 'ok' : 'aguarda' }),
    h('button', { type: 'button', class: 'cl-btn', text: 'Abrir cadastro', onclick: () => { mapa.closePopup(); aoAbrir(i.id); } }));

  function enquadrar(pontos) {
    if (!pontos.length) return mapa.setView([-14.2, -51.9], 4); // Brasil
    mapa.fitBounds(L.latLngBounds(pontos.map(i => [i.lat, i.lng])), { padding: [40, 40], maxZoom: 13 });
  }

  // Cidades com mais clientes: ajuda a ver onde a demanda está
  function desenharCidades(com) {
    const cont = new Map();
    lista.forEach(i => { const r = rotuloCidade(i); if (r) cont.set(r, (cont.get(r) || 0) + 1); });
    const top = [...cont].sort((a, b) => b[1] - a[1]).slice(0, 8);
    trocar(cidades, top.length ? h('span', { class: 'cl-cidades-tit', text: 'Mais clientes:' }) : null,
      ...top.map(([nome, n]) => h('button', { type: 'button', class: 'cl-chip', text: `${nome} · ${n}`, onclick: () => enquadrar(com.filter(i => rotuloCidade(i) === nome)) })));
  }

  function desenhar() {
    camada.clearLayers();
    const com = lista.filter(i => typeof i.lat === 'number' && typeof i.lng === 'number');
    com.forEach(i => L.circleMarker([i.lat, i.lng], { radius: 8, color: '#fff', weight: 2, fillColor: tipo(i).cor, fillOpacity: .95 })
      .bindPopup(popup(i)).bindTooltip(i.nome || 'Cliente sem nome').addTo(camada));
    const sem = lista.length - com.length;
    aviso.textContent = sem ? `${sem} sem localização no mapa` : '';
    desenharCidades(com);
    enquadrar(com);
  }

  async function iniciar() {
    if (mapa || iniciando) return;
    iniciando = true;
    trocar(caixa, h('p', { class: 'cl-info', role: 'status', text: 'Carregando mapa…' }));
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
