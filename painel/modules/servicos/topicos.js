// modules/servicos/topicos.js — campos de tópicos do formulário: "O que está incluso" e "O que não está incluso"
import { h, icone } from './ui.js';
import { MAX_TOPICOS, MAX_TOPICO } from './actions-servico.js';

const CAMPOS = { '#sv-inc': 'incluso', '#sv-ninc': 'nao_incluso' };   // contêiner → campo do rascunho

// obter() devolve o rascunho atual; aoMudar() atualiza o estado do formulário.
// A lista do rascunho nunca é alterada no lugar: troca-se por uma nova, para a cópia "como está salva" não mudar junto.
export function criarTopicos($, obter, aoMudar) {
  function desenhar(seletor, foco) {
    const raiz = $(seletor), campo = CAMPOS[seletor];
    if (!raiz) return;
    const lista = obter()[campo] || [];
    const trocar = nova => { obter()[campo] = nova; aoMudar(); };

    const linhas = lista.map((texto, i) => {
      const inp = h('input', { class: 'sv-campo', maxlength: MAX_TOPICO, autocomplete: 'off', placeholder: 'Descreva o item', 'aria-label': `Tópico ${i + 1}` });
      inp.value = texto;
      inp.oninput = () => { const nova = [...obter()[campo]]; nova[i] = inp.value; trocar(nova); };
      inp.onkeydown = ev => {
        const atual = obter()[campo];
        if (ev.key === 'Enter') {   // Enter cria o próximo tópico logo abaixo
          ev.preventDefault();
          if (atual.length < MAX_TOPICOS) { trocar([...atual.slice(0, i + 1), '', ...atual.slice(i + 1)]); desenhar(seletor, i + 1); }
        } else if (ev.key === 'Backspace' && inp.value === '') {   // Backspace num tópico vazio remove o tópico
          ev.preventDefault(); trocar(atual.filter((_, j) => j !== i)); desenhar(seletor, i - 1);
        }
      };
      const remover = h('button', { type: 'button', class: 'sv-ib', title: 'Remover tópico', 'aria-label': `Remover tópico ${i + 1}`,
        onclick: () => { trocar(obter()[campo].filter((_, j) => j !== i)); desenhar(seletor, Math.min(i, lista.length - 2)); } }, icone('x'));
      return h('div', { class: 'sv-tp' }, inp, remover);
    });

    const add = h('button', { type: 'button', class: 'btn-borda sv-tp-add', text: 'Adicionar tópico', disabled: lista.length >= MAX_TOPICOS,
      onclick: () => { trocar([...obter()[campo], '']); desenhar(seletor, lista.length); } });
    raiz.replaceChildren(...[lista.length ? null : h('p', { class: 'sv-dica', text: 'Nenhum tópico ainda.' }), ...linhas, add].filter(Boolean));
    if (foco != null) (foco >= 0 ? raiz.querySelectorAll('input')[foco] : raiz.querySelector('.sv-tp-add'))?.focus();
  }

  return { ligar: () => Object.keys(CAMPOS).forEach(s => desenhar(s)) };
}
