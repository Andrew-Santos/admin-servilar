// modules/profissionais/ui-modal.js — janela (dialog) arrastável e redimensionável + ampliação de imagem
import { h, icone } from './ui.js';

const CHAVE = 'servilar_pf_janela';
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (_) { return {}; } };
const guardar = v => { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch (_) {} };
const celular = () => matchMedia('(max-width:700px)').matches;

// Devolve { corpo, definirTitulo(texto, ...extras), fechar }. O tamanho escolhido fica lembrado.
export function abrirJanela({ titulo = '', aoFechar } = {}) {
  const tit = h('h2', { class: 'pf-jan-tit', text: titulo });
  const extra = h('span', { class: 'pf-jan-extra' });
  const bMax = h('button', { type: 'button', class: 'btn-ico pf-jan-btn', title: 'Maximizar ou restaurar', 'aria-label': 'Maximizar ou restaurar janela' }, icone('arrows-out-simple'));
  const bFechar = h('button', { type: 'button', class: 'btn-ico pf-jan-btn', title: 'Fechar', 'aria-label': 'Fechar janela' }, icone('x'));
  const cab = h('header', { class: 'pf-jan-cab' }, tit, extra, bMax, bFechar);
  const corpo = h('div', { class: 'pf-jan-corpo' });
  const dlg = h('dialog', { class: 'pf-janela', 'aria-labelledby': 'pf-jan-tit' }, cab, corpo);
  tit.id = 'pf-jan-tit';

  const salvo = ler();
  const larg = Math.min(salvo.w || 1040, innerWidth - 24), alt = Math.min(salvo.h || 760, innerHeight - 24);
  Object.assign(dlg.style, { width: larg + 'px', height: alt + 'px', left: Math.max(12, (innerWidth - larg) / 2) + 'px', top: Math.max(12, (innerHeight - alt) / 2) + 'px' });

  bMax.onclick = () => { dlg.classList.toggle('max'); bMax.querySelector('i').className = 'ph ph-' + (dlg.classList.contains('max') ? 'arrows-in-simple' : 'arrows-out-simple'); };
  bFechar.onclick = () => dlg.close();

  // Arrastar pelo cabeçalho (fora do celular e da tela cheia)
  cab.onpointerdown = e => {
    if (e.target.closest('button') || dlg.classList.contains('max') || celular()) return;
    const dx = e.clientX - dlg.offsetLeft, dy = e.clientY - dlg.offsetTop;
    cab.setPointerCapture(e.pointerId);
    cab.onpointermove = ev => {
      dlg.style.left = Math.min(innerWidth - 120, Math.max(120 - dlg.offsetWidth, ev.clientX - dx)) + 'px';
      dlg.style.top = Math.min(innerHeight - 48, Math.max(0, ev.clientY - dy)) + 'px';
    };
    cab.onpointerup = () => { cab.onpointermove = cab.onpointerup = null; };
  };

  // Lembra o tamanho depois que o usuário para de redimensionar
  let t;
  const obs = new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => { if (dlg.open && !dlg.classList.contains('max') && !celular()) guardar({ w: dlg.offsetWidth, h: dlg.offsetHeight }); }, 400);
  });

  dlg.onclose = () => { obs.disconnect(); clearTimeout(t); dlg.remove(); aoFechar?.(); };
  document.body.append(dlg);
  dlg.showModal();
  obs.observe(dlg);

  return {
    corpo,
    fechar: () => dlg.close(),
    definirTitulo(texto, ...extras) { tit.textContent = texto; extra.replaceChildren(...extras.filter(Boolean)); },
  };
}

// Foto em tamanho grande por cima da janela; clicar em qualquer lugar ou Esc fecha
export function ampliarImagem(url, alt) {
  const dlg = h('dialog', { class: 'pf-lightbox', 'aria-label': alt },
    h('button', { type: 'button', class: 'btn-ico pf-lb-fechar', 'aria-label': 'Fechar foto' }, icone('x')),
    h('img', { src: url, alt }));
  dlg.onclick = () => dlg.close();
  dlg.onclose = () => dlg.remove();
  document.body.append(dlg);
  dlg.showModal();
}
