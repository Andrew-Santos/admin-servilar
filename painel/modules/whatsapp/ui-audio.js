// modules/whatsapp/ui-audio.js — player de áudio no estilo do WhatsApp: play, ondas, tempo e menu ⋮ com "Baixar"
import { baixarArquivo, definirTocando, obter, quandoVisivel } from './midia-carga.js';
import { h, icone } from './ui.js';

const BARRAS = 38;
const AUTO_MAX = 2 * 1048576; // áudio de até 2 MB carrega sozinho (a duração já aparece); maior, só ao tocar

// Ondas de enfeite: iguais para a mesma mensagem (a forma real exigiria decodificar o áudio)
function alturas(id) {
  let x = (Number(id) % 100000) + 1;
  return Array.from({ length: BARRAS }, (_, i) => {
    x = (x * 1664525 + 1013904223) >>> 0;
    const envelope = 0.5 + 0.5 * Math.sin(Math.PI * (i + 1) / (BARRAS + 1));
    return Math.round(18 + (x % 1000) / 10 * envelope * 0.82);
  });
}

const tempo = s => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

export function audio(m) {
  const a = new Audio();
  const ico = icone('play'), play = h('button', { type: 'button', class: 'wa-play', 'aria-label': 'Tocar áudio' }, ico);
  const barras = alturas(m.id).map(p => { const b = h('span'); b.style.height = p + '%'; return b; });
  const ponto = h('b', { class: 'wa-onda-ponto' });
  const onda = h('div', { class: 'wa-onda' }, ...barras, ponto);
  const hora = h('span', { class: 'wa-audio-tempo', text: '0:00' });
  const aviso = h('small', { class: 'wa-midia-erro', role: 'alert' });
  const baixar = h('button', { type: 'button', class: 'wa-menu-item' }, icone('download-simple'), ' Baixar');
  const menu = h('details', { class: 'wa-menu' }, h('summary', { 'aria-label': 'Mais opções', title: 'Mais opções' }, icone('dots-three-vertical')), baixar);
  const raiz = h('div', { class: 'wa-audio-bloco' },
    h('div', { class: 'wa-audio' }, play, h('div', { class: 'wa-audio-meio' }, onda, hora), menu), aviso);

  let pronto = null;
  const carregar = () => pronto ??= obter(m).then(url => { a.src = url; }).catch(e => { pronto = null; throw e; });

  // Parado mostra a duração; tocando, o tempo corrido
  function desenhar() {
    const d = a.duration, p = isFinite(d) && d > 0 ? a.currentTime / d : 0;
    const ligadas = Math.round(p * BARRAS);
    barras.forEach((b, i) => b.classList.toggle('on', i < ligadas));
    ponto.style.left = p * 100 + '%';
    hora.textContent = tempo(a.paused && !a.currentTime && isFinite(d) ? d : a.currentTime);
  }
  ['timeupdate', 'durationchange', 'loadedmetadata', 'ended'].forEach(ev => a.addEventListener(ev, desenhar));
  a.addEventListener('play', () => { ico.className = 'ph ph-pause'; definirTocando(a); });
  ['pause', 'ended'].forEach(ev => a.addEventListener(ev, () => { ico.className = 'ph ph-play'; }));

  play.onclick = async () => {
    if (!a.paused) return a.pause();
    aviso.textContent = ''; play.disabled = true; ico.className = 'ph ph-spinner wa-gira';
    try { await carregar(); await a.play(); }
    catch (e) {
      ico.className = 'ph ph-play';
      aviso.textContent = e.name === 'NotSupportedError' ? 'Este navegador não toca esse formato. Use ⋮ para baixar.' : e.message;
    } finally { play.disabled = false; }
  };

  // Clicar nas ondas pula para aquele ponto (depois de carregado)
  onda.onclick = async e => {
    try { await carregar(); } catch (_) { return; }
    if (!isFinite(a.duration)) return;
    const r = onda.getBoundingClientRect();
    a.currentTime = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * a.duration;
  };

  baixar.onclick = async () => {
    menu.open = false; aviso.textContent = '';
    try { await baixarArquivo(m); } catch (e) { aviso.textContent = e.message; }
  };

  if (Number(m.midia_tamanho) <= AUTO_MAX) quandoVisivel(raiz, () => carregar().catch(() => {}));
  return raiz;
}
