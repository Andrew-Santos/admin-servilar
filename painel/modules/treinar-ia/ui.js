// modules/treinar-ia/ui.js — peças de tela. Dado externo entra só por textContent (nunca innerHTML).

// h('div', { class:'x', onclick: fn, text:'oi' }, filho1, filho2)
export const h = (tag, props = {}, ...filhos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') || ['value', 'checked', 'disabled', 'hidden'].includes(k)) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...filhos.flat().filter(f => f != null && f !== false));
  return e;
};
export const icone = nome => h('i', { class: `ph ph-${nome}`, 'aria-hidden': 'true' });
export const trocar = (el, ...filhos) => el.replaceChildren(...filhos.flat().filter(f => f != null && f !== false));

export const MODOS = {
  todos: 'Todos os momentos',
  identificar: 'Sem CPF ainda',
  sem_endereco: 'Falta o endereço',
  atender: 'Atendimento completo',
};
export const modoCurto = m => ({ todos: 'Todos', identificar: 'Sem CPF', sem_endereco: 'Sem endereço', atender: 'Atender' })[m] || m;

export const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const corta = (t, n) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

export const quando = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const hoje = new Date();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === hoje.toDateString() ? `hoje ${hora}` : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`;
};

// Aviso temporário no canto da tela
let tt = 0;
export function toast(texto, tipo = '') {
  let el = document.getElementById('ti-toast');
  if (!el) { el = h('div', { id: 'ti-toast', class: 'ti-toast', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  el.textContent = texto; el.className = 'ti-toast ' + tipo; el.hidden = false;
  clearTimeout(tt); tt = setTimeout(() => { el.hidden = true; }, 4200);
}
export const removerToast = () => document.getElementById('ti-toast')?.remove();

// Nome legível de uma linha do histórico
export const tituloDoRegistro = h => {
  const r = h.depois || h.antes || {};
  return r.titulo || r.pergunta || r.nome || (h.tabela === 'ia_ferramenta' ? h.registro_id : `#${h.registro_id}`);
};
export const ROTULO_TABELA = { ia_diretriz: 'Orientação', ia_exemplo: 'Exemplo', ia_conhecimento: 'Conhecimento', ia_ferramenta: 'Ferramenta' };
export const ROTULO_CHAVE = { diretrizes: 'Orientação', exemplos: 'Exemplo', conhecimento: 'Conhecimento', ferramentas: 'Ferramenta' };
export const ROTULO_ACAO = { criar: 'criou', editar: 'editou', excluir: 'excluiu', reverter: 'desfez' };
