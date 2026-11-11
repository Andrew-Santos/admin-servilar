// modules/profissionais/ui-arquivo.js — foto (aparece sozinha, com botão de ampliar) e vídeo (sob demanda)
// Os arquivos vêm do worker com o token do admin e são mostrados por blob (`urls` guarda o que liberar depois).
import { formatarData, formatarTamanho } from './actions.js';
import { h, icone, msg, trocar } from './ui.js';

export const infoArquivo = meta => meta
  ? h('p', { class: 'pf-info', text: `${formatarTamanho(meta.tamanho)}${meta.enviado_em ? ' · enviado em ' + formatarData(meta.enviado_em) : ''}` })
  : h('p', { class: 'pf-vazio', text: 'Ainda não enviado.' });

// ctx = { urls, vivo(), baixar(id, tipo), aoAmpliar(url, alt) }
export function fotoAutomatica(p, ctx) {
  const caixa = h('div', { class: 'pf-foto-caixa' });
  const vazio = texto => h('div', { class: 'pf-foto-vazia' }, icone('user'), h('span', { text: texto }));
  if (!p.foto) { trocar(caixa, vazio('Sem foto enviada')); return caixa; }
  trocar(caixa, vazio('Carregando foto…'));

  async function carregar() {
    try {
      const url = URL.createObjectURL(await ctx.baixar(p.id, 'foto'));
      if (!ctx.vivo()) return URL.revokeObjectURL(url);
      ctx.urls.push(url);
      const alt = `Foto de perfil de ${p.nome}`;
      trocar(caixa, h('img', { class: 'pf-foto', src: url, alt }),
        h('button', { type: 'button', class: 'pf-ampliar', title: 'Ampliar foto', 'aria-label': 'Ampliar foto', onclick: () => ctx.aoAmpliar(url, alt) }, icone('arrows-out'), ' Ampliar'));
    } catch (e) {
      if (!ctx.vivo()) return;
      trocar(caixa, msg(e.message, 'neg'), h('button', { type: 'button', class: 'pf-btn', text: 'Tentar de novo', onclick: carregar }));
    }
  }
  carregar();
  return caixa;
}

// Vídeo é pesado: só baixa quando o admin pede
export function videoSobDemanda(p, ctx) {
  if (!p.video) return infoArquivo(null);
  const caixa = h('div', { class: 'pf-arq' });
  async function abrir() {
    trocar(caixa, h('p', { class: 'pf-info', role: 'status', text: 'Carregando…' }));
    try {
      const url = URL.createObjectURL(await ctx.baixar(p.id, 'video'));
      if (!ctx.vivo()) return URL.revokeObjectURL(url);
      ctx.urls.push(url);
      trocar(caixa, h('video', { class: 'pf-video', src: url, controls: true, preload: 'metadata', playsinline: true }));
    } catch (e) {
      if (!ctx.vivo()) return;
      trocar(caixa, msg(e.message, 'neg'), h('button', { type: 'button', class: 'pf-btn', text: 'Tentar de novo', onclick: abrir }));
    }
  }
  trocar(caixa, h('button', { type: 'button', class: 'pf-btn', onclick: abrir }, icone('play'), ' Ver vídeo'));
  return h('div', {}, caixa, infoArquivo(p.video));
}
