// modules/whatsapp/ui-midia.js — mídia da bolha: foto e vídeo aparecem sozinhos, áudio vira player, documento tem botão baixar
import { formatarTamanho, tipoInfo } from './actions.js';
import { baixarArquivo, obter, quandoVisivel } from './midia-carga.js';
import { audio } from './ui-audio.js';
import { h, icone, trocar } from './ui.js';
export { liberarMidias } from './midia-carga.js';

const VIDEO_AUTO_MAX = 8 * 1048576; // vídeo maior que isso só baixa ao clicar
const FORMATO = { image: 'imagem', sticker: 'figurinha', video: 'video', audio: 'audio', voice: 'audio' }; // o resto (document) é arquivo

// Caixa que mostra "carregando", vira a mídia e, se falhar, oferece tentar de novo.
// montar(url, clicou) devolve o elemento final; auto = baixa quando a caixa fica visível.
function caixa(m, montar, auto) {
  const area = h('div', { class: 'wa-visor' });
  const carregar = async (clicou) => {
    trocar(area, h('span', { class: 'wa-carga' }, icone('spinner wa-gira')));
    try { trocar(area, montar(await obter(m), clicou === true)); area.classList.add('pronto'); }
    catch (e) { trocar(area, h('small', { class: 'wa-midia-erro', text: e.message }), h('button', { type: 'button', class: 'wa-btn', onclick: () => carregar(true) }, icone('arrow-clockwise'), ' Tentar de novo')); }
  };
  if (auto) { trocar(area, h('span', { class: 'wa-carga' }, icone('image'))); quandoVisivel(area, carregar); }
  else trocar(area, h('button', { type: 'button', class: 'wa-btn', onclick: () => carregar(true) }, icone('play-circle'), ` Assistir (${formatarTamanho(m.midia_tamanho)})`));
  return area;
}

const imagem = (url, extra = '') => h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, h('img', { class: 'wa-img ' + extra, src: url, alt: 'Imagem da mensagem' }));

// Card com nome e botão baixar (documentos)
function arquivo(m) {
  const t = tipoInfo(m.tipo), aviso = h('small', { class: 'wa-midia-erro', role: 'alert' });
  const baixar = h('button', { type: 'button', class: 'wa-btn' }, icone('download-simple'), ' Baixar');
  baixar.onclick = async () => {
    baixar.disabled = true; aviso.textContent = '';
    try { await baixarArquivo(m); } catch (e) { aviso.textContent = e.message; } finally { baixar.disabled = false; }
  };
  const detalhe = [m.midia_mime, formatarTamanho(m.midia_tamanho)].filter(Boolean).join(' · ');
  return h('div', { class: 'wa-midia' },
    h('div', { class: 'wa-midia-topo' }, icone(t.icone), h('div', {}, h('strong', { text: m.midia_nome || t.texto }), detalhe ? h('small', { text: detalhe }) : null)),
    baixar, aviso);
}

// O bot não conseguiu baixar da Meta: não há o que mostrar
const indisponivel = m => h('div', { class: 'wa-midia' },
  h('div', { class: 'wa-midia-topo' }, icone(tipoInfo(m.tipo).icone),
    h('div', {}, h('strong', { text: tipoInfo(m.tipo).texto }), h('small', { class: 'wa-midia-erro', text: 'Mídia não baixada', title: m.midia_erro }))));

export function midia(m) {
  if (m.midia_erro) return indisponivel(m);
  switch (FORMATO[m.tipo]) {
    case 'imagem': return caixa(m, url => imagem(url), true);
    case 'figurinha': return caixa(m, url => imagem(url, 'wa-figurinha'), true);
    case 'audio': return audio(m);
    case 'video': return caixa(m, (url, clicou) => h('video', { class: 'wa-video', src: url, controls: true, preload: 'metadata', playsinline: true, autoplay: clicou }), !(m.midia_tamanho > VIDEO_AUTO_MAX));
    default: return arquivo(m);
  }
}
