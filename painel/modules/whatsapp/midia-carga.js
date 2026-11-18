// modules/whatsapp/midia-carga.js — baixa a mídia do worker, guarda em cache e carrega só o que aparece na tela
import { baixarMidia } from './data.js';

const pedidos = new Map();   // id da mensagem → promessa da URL do arquivo
const avisos = new Map();    // elemento → o que fazer quando ele ficar visível
let observador = null, tocando = null;

export function obter(m) {
  if (!pedidos.has(m.id)) {
    const p = baixarMidia(m.id).then(blob => URL.createObjectURL(blob));
    p.catch(() => pedidos.delete(m.id)); // falhou: permite tentar de novo
    pedidos.set(m.id, p);
  }
  return pedidos.get(m.id);
}

// Roda `fn` quando o elemento chega perto da tela (mídia fora da tela não é baixada)
export function quandoVisivel(el, fn) {
  if (!('IntersectionObserver' in window)) return fn();
  observador ??= new IntersectionObserver(lista => lista.forEach(e => {
    if (!e.isIntersecting) return;
    observador.unobserve(e.target);
    const f = avisos.get(e.target); avisos.delete(e.target); f?.();
  }), { rootMargin: '200px' });
  avisos.set(el, fn); observador.observe(el);
}

// Só um áudio toca por vez
export const definirTocando = a => { if (tocando && tocando !== a) tocando.pause(); tocando = a; };

const extensao = m => { const e = (m.midia_mime || '').split(';')[0].split('/')[1] || 'bin'; return e === 'jpeg' ? 'jpg' : e; };
const nomeArquivo = m => (m.midia_nome || `${m.tipo || 'arquivo'}-${m.id}.${extensao(m)}`).replace(/[\\/]/g, '_');

export async function baixarArquivo(m) {
  const a = document.createElement('a');
  a.href = await obter(m); a.download = nomeArquivo(m);
  a.click();
}

// Ao trocar de conversa ou sair do módulo: para o áudio e libera a memória
export function liberarMidias() {
  observador?.disconnect(); observador = null; avisos.clear();
  tocando?.pause(); tocando = null;
  pedidos.forEach(p => p.then(u => URL.revokeObjectURL(u), () => {}));
  pedidos.clear();
}
