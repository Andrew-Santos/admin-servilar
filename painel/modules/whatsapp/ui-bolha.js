// modules/whatsapp/ui-bolha.js — uma mensagem (bolha) da conversa
import { COBRANCA, ORIGEM, STATUS, dataHora, hora, temMidia, tipoInfo } from './actions.js';
import { h, icone } from './ui.js';
import { midia } from './ui-midia.js';

// Trecho da mensagem a que esta responde (procura entre as já carregadas)
function citacao(m, porWamid) {
  if (!m.resposta_a) return null;
  const o = porWamid.get(m.resposta_a);
  if (!o) return h('div', { class: 'wa-cita' }, h('span', { text: 'Resposta a uma mensagem anterior' }));
  const autor = o.direcao === 'entrada' ? 'Cliente' : (ORIGEM[o.origem]?.texto || 'Atendimento');
  return h('div', { class: 'wa-cita' }, h('strong', { text: autor }), h('span', { text: (o.texto || `[${tipoInfo(o.tipo).texto}]`).slice(0, 140) }));
}

function falha(m) {
  if (m.status !== 'falhou' && !m.erro_titulo) return null;
  const detalhe = [m.erro_titulo, m.erro_codigo ? `código ${m.erro_codigo}` : ''].filter(Boolean).join(' · ');
  return h('p', { class: 'wa-erro' }, icone('warning-circle'), ' ', 'Falha no envio' + (detalhe ? ': ' + detalhe : ''));
}

function rodape(m) {
  const st = STATUS[m.status];
  const etapas = [['Enviada', m.enviada_em], ['Entregue', m.entregue_em], ['Lida', m.lida_em]].filter(([, v]) => v).map(([r, v]) => `${r} ${dataHora(v)}`).join(' · ');
  return h('div', { class: 'wa-rod' },
    m.cobranca_categoria ? h('span', { class: 'wa-cobr', title: 'Categoria de cobrança', text: COBRANCA[m.cobranca_categoria] || m.cobranca_categoria }) : null,
    h('time', { datetime: m.data_msg, title: dataHora(m.data_msg), text: hora(m.data_msg) }),
    m.direcao === 'saida' && st?.icone ? h('span', { class: 'wa-st ' + (st.cor || ''), title: etapas ? `${st.texto} — ${etapas}` : st.texto }, icone(st.icone)) : null);
}

// Reação cuja mensagem ainda não foi carregada
const avisoReacao = m => h('li', { class: 'wa-reacao-solta' },
  h('span', { text: `${m.direcao === 'entrada' ? 'Cliente' : (ORIGEM[m.origem]?.texto || 'Atendimento')} reagiu ${m.texto} a uma mensagem anterior` }));

// Selo da reação, preso à borda da bolha
const seloReacao = lista => h('span', { class: 'wa-reacoes' }, ...lista.map(r =>
  h('span', { title: `${r.direcao === 'entrada' ? 'Cliente' : 'Atendimento'} reagiu com ${r.emoji}`, text: r.emoji })));

// bolha(mensagem, porWamid: Map wamid → mensagem, reacoes: Map wamid → [{ direcao, emoji }])
export function bolha(m, porWamid, reacoes = new Map()) {
  if (m.tipo === 'reaction') return avisoReacao(m);
  const saida = m.direcao === 'saida';
  const reagiram = reacoes.get(m.wamid);
  const o = ORIGEM[m.origem];
  const vazio = !m.texto && !temMidia(m);
  return h('li', { class: 'wa-linha ' + (saida ? 'saida' : 'entrada') },
    h('div', { class: 'wa-bolha' + (m.status === 'falhou' ? ' falhou' : '') + (reagiram ? ' com-reacao' : '') },
      o && m.origem !== 'cliente' ? h('span', { class: 'wa-orig ' + m.origem }, icone(o.icone), ' ', o.texto) : null,
      citacao(m, porWamid),
      temMidia(m) ? midia(m) : null,
      m.texto ? h('p', { class: 'wa-texto', text: m.texto }) : null,
      vazio ? h('p', { class: 'wa-texto vazio', text: `[${tipoInfo(m.tipo).texto}]` }) : null,
      m.resposta_id ? h('span', { class: 'wa-opcao', title: 'Opção escolhida pelo cliente', text: m.resposta_id }) : null,
      falha(m),
      rodape(m),
      reagiram ? seloReacao(reagiram) : null));
}
