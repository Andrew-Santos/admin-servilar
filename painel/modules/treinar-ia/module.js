// modules/treinar-ia/module.js — "Treinar IA": o chat de treino e as tabelas que ensinam o Seu Serverino.
// Abas: Chat de treino · Orientações · Exemplos · Conhecimento · Ferramentas · O que a IA recebe · Histórico.
import * as data from './data.js';
import { h, icone, trocar, removerToast } from './ui.js';
import { montarChat } from './ui-chat.js';
import { montarTabela } from './ui-tabela.js';
import { montarHistorico } from './ui-historico.js';
import { montarPrevia } from './ui-previa.js';

const ABAS = [
  { id: 'chat', rotulo: 'Chat de treino', ic: 'chats-circle' },
  { id: 'diretrizes', rotulo: 'Orientações', ic: 'list-checks' },
  { id: 'exemplos', rotulo: 'Exemplos', ic: 'chat-teardrop-text' },
  { id: 'conhecimento', rotulo: 'Conhecimento', ic: 'book-open-text' },
  { id: 'ferramentas', rotulo: 'Ferramentas', ic: 'wrench' },
  { id: 'previa', rotulo: 'O que a IA recebe', ic: 'eye' },
  { id: 'historico', rotulo: 'Histórico', ic: 'clock-counter-clockwise' },
];

let vivo = false, limpar = null;

export default {
  estilo: 'modules/treinar-ia/style.css',
  desmontar() { vivo = false; limpar?.(); limpar = null; removerToast(); },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);
    let atual = 'chat', versao = 0;   // versao: sobe quando as regras mudam; abas de lista recarregam sozinhas ao abrir
    const abas = h('div', { class: 'ti-abas', role: 'tablist' });
    const area = h('div', { class: 'ti-area' });
    trocar(conteudo, h('div', { class: 'ti' }, abas, area));

    const aoMudarRegras = () => { versao++; };

    function abrir(id) {
      limpar?.(); atual = id;
      trocar(abas, ABAS.map(a => h('button', { type: 'button', role: 'tab', class: 'ti-aba', 'aria-selected': String(a.id === id), onclick: () => abrir(a.id) }, icone(a.ic), h('span', { text: ' ' + a.rotulo }))));
      const alvo = { corpo: area, filtros, aoMudarRegras };
      if (id === 'chat') limpar = montarChat(alvo);
      else if (id === 'historico') limpar = montarHistorico(alvo);
      else if (id === 'previa') limpar = montarPrevia(alvo);
      else limpar = montarTabela({ ...alvo, tabela: id });
    }
    abrir(atual);
  },
};
