// modules/whatsapp/ui-conversa.js — cabeçalho e fio de mensagens da conversa aberta
import { chaveDia, formatarTelefone, rotuloDia, urlWhatsapp } from './actions.js';
import { bolha } from './ui-bolha.js';
import { avatar, h, icone } from './ui.js';

// cabecalho({ telefone, nome, total (carregadas), aoVoltar })
export function cabecalho({ telefone, nome, total, aoVoltar }) {
  const link = urlWhatsapp(telefone);
  return h('header', { class: 'wa-conv-cab' },
    h('button', { type: 'button', class: 'btn-ico wa-voltar', 'aria-label': 'Voltar para as conversas', onclick: aoVoltar }, icone('arrow-left')),
    avatar(nome),
    h('div', { class: 'wa-conv-id' }, h('strong', { text: nome || formatarTelefone(telefone) }), nome ? h('span', { text: formatarTelefone(telefone) }) : null),
    h('span', { class: 'wa-conv-n', text: total ? (total > 1 ? `${total} mensagens carregadas` : '1 mensagem carregada') : '' }),
    link ? h('a', { class: 'wa-btn', href: link, target: '_blank', rel: 'noopener noreferrer' }, icone('whatsapp-logo'), ' Abrir no WhatsApp') : null);
}

// Estado de espera quando nenhuma conversa está aberta
export const semConversa = () => h('div', { class: 'wa-conv-vazio' }, icone('chat-circle-text'), h('p', { text: 'Escolha uma conversa para ver o histórico.' }));

// fio({ mensagens, porWamid, reacoes, temMais, aoMais, vazio }) — bolhas separadas por dia
export function fio({ mensagens, porWamid, reacoes, temMais, aoMais, vazio }) {
  const itens = [];
  let dia = '';
  for (const m of mensagens) {
    const k = chaveDia(m.data_msg);
    if (k !== dia) { dia = k; itens.push(h('li', { class: 'wa-dia', role: 'separator' }, h('span', { text: rotuloDia(m.data_msg) }))); }
    itens.push(bolha(m, porWamid, reacoes));
  }
  return h('div', { class: 'wa-fio-in' },
    temMais ? h('button', { type: 'button', class: 'wa-btn wa-mais', onclick: aoMais }, icone('arrow-up'), ' Carregar mensagens anteriores') : null,
    itens.length ? h('ul', { class: 'wa-linhas' }, ...itens) : h('p', { class: 'wa-info wa-fio-vazio', text: vazio }));
}
