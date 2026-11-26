// modules/treinar-ia/ui-historico.js — tudo o que foi alterado nas orientações (por você ou pelo Treinador), com desfazer.
import * as data from './data.js';
import { h, icone, trocar, toast, quando, corta, ROTULO_TABELA, ROTULO_ACAO, tituloDoRegistro } from './ui.js';

export function montarHistorico({ corpo, filtros, aoMudarRegras }) {
  let vivo = true;
  trocar(filtros, h('p', { class: 'ti-info', text: 'Mostra as 100 alterações mais recentes.' }));
  const caixa = h('div', { class: 'ti-lista' });
  trocar(corpo, h('div', { class: 'ti-tab' }, h('p', { class: 'ti-ajuda', text: 'Tudo o que mudou nas orientações: quem mudou, quando e por quê. "Desfazer" devolve o texto anterior (ou recria o que foi excluído).' }), caixa));

  const valor = v => (v === true ? 'sim' : v === false ? 'não' : v == null ? '—' : typeof v === 'object' ? `${v.length ?? ''} falas` : corta(v, 200));

  async function carregar() {
    try {
      const l = await data.historico();
      if (!vivo) return;
      trocar(caixa, l.length ? l.map(x => {
        const desfeito = x.revertido || x.acao === 'reverter';
        const campos = x.acao === 'editar' ? Object.keys(x.depois || {}) : [];
        return h('div', { class: 'ti-item' + (desfeito ? ' off' : ''), style: 'cursor:default' },
          h('div', { class: 'ti-item-c' },
            h('div', { class: 'ti-item-t' }, h('b', { text: `${ROTULO_TABELA[x.tabela] || x.tabela}: ${corta(tituloDoRegistro(x), 70)}` }), h('span', { class: 'ti-tag', text: ROTULO_ACAO[x.acao] || x.acao }), x.revertido ? h('span', { class: 'ti-tag', text: 'desfeita' }) : null),
            h('small', { text: `${quando(x.criado_em)} · ${x.autor}` }),
            x.motivo ? h('p', { class: 'ti-item-s', text: x.motivo }) : null,
            campos.length ? h('details', { class: 'ti-ferr' }, h('summary', { text: 'Ver o que mudou' }), h('ul', { class: 'ti-det' }, campos.map(k => h('li', {}, h('b', { text: k + ': ' }), h('span', { class: 'ti-antes', text: valor(x.antes?.[k]) }), ' → ', h('span', { text: valor(x.depois[k]) }))))) : null),
          !desfeito ? h('button', { type: 'button', class: 'ti-desfazer', onclick: async e => { e.target.disabled = true; try { await data.reverter(x.id); toast('Desfeito.'); aoMudarRegras(); carregar(); } catch (er) { toast(er.message, 'neg'); e.target.disabled = false; } } }, icone('arrow-u-up-left'), ' Desfazer') : null);
      }) : h('p', { class: 'ti-info', text: 'Nenhuma alteração ainda.' }));
    } catch (e) { if (vivo) trocar(caixa, h('p', { class: 'ti-erro', role: 'alert', text: e.message })); }
  }
  trocar(caixa, h('p', { class: 'ti-info', role: 'status', text: 'Carregando…' }));
  carregar();
  return () => { vivo = false; };
}
