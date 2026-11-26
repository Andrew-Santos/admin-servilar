// modules/treinar-ia/ui-previa.js — o texto EXATO que o Seu Serverino recebe em cada momento da conversa
import * as data from './data.js';
import { h, trocar } from './ui.js';

export function montarPrevia({ corpo, filtros }) {
  let vivo = true, seq = 0;
  const sel = h('select', { class: 'ti-campo-f', 'aria-label': 'Momento da conversa', onchange: carregar },
    [['atender', 'Cadastro e endereço prontos'], ['sem_endereco', 'Falta o endereço'], ['identificar', 'Ainda sem CPF']].map(([v, t]) => h('option', { value: v, text: t })));
  trocar(filtros, h('div', { class: 'ti-fl' }, h('label', { text: 'Momento da conversa' }), sel));
  const saida = h('div');
  trocar(corpo, h('div', { class: 'ti-tab' }, h('p', { class: 'ti-ajuda', text: 'É exatamente o que a IA lê antes de responder (regras ativas + conhecimento + exemplos + catálogo, e as ferramentas). Somente leitura: para mudar, use as outras abas ou o chat.' }), saida));

  async function carregar() {
    const eu = ++seq;
    trocar(saida, h('p', { class: 'ti-info', role: 'status', text: 'Carregando…' }));
    try {
      const d = await data.previa(sel.value);
      if (!vivo || eu !== seq) return;
      trocar(saida, h('h3', { class: 'ti-sub', text: 'Texto enviado à IA' }), h('pre', { class: 'ti-pre', text: d.sistema }),
        h('h3', { class: 'ti-sub', text: 'Ferramentas que ela enxerga' }), d.ferramentas.map(f => h('details', { class: 'ti-ferr' }, h('summary', { text: f.nome }), h('pre', { class: 'ti-pre', text: f.descricao }))));
    } catch (e) { if (vivo && eu === seq) trocar(saida, h('p', { class: 'ti-erro', role: 'alert', text: e.message })); }
  }
  carregar();
  return () => { vivo = false; };
}
