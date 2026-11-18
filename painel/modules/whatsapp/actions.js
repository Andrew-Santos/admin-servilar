// modules/whatsapp/actions.js — rótulos, formatações e regras do cliente (o servidor valida de novo)

export const ORIGEM = {
  cliente: { texto: 'Cliente', icone: 'user' },
  bot: { texto: 'Bot', icone: 'robot' },
  humano: { texto: 'Atendente', icone: 'headset' },
  sistema: { texto: 'Sistema', icone: 'gear' },
};

// Tipos da Cloud API da Meta; tipo desconhecido aparece com o nome cru
export const TIPO = {
  text: { texto: 'Texto', icone: 'chat-circle-text' },
  image: { texto: 'Imagem', icone: 'image' },
  audio: { texto: 'Áudio', icone: 'microphone' },
  voice: { texto: 'Áudio', icone: 'microphone' },
  video: { texto: 'Vídeo', icone: 'video-camera' },
  document: { texto: 'Documento', icone: 'file-text' },
  sticker: { texto: 'Figurinha', icone: 'sticker' },
  location: { texto: 'Localização', icone: 'map-pin' },
  contacts: { texto: 'Contato', icone: 'address-book' },
  interactive: { texto: 'Resposta interativa', icone: 'cursor-click' },
  button: { texto: 'Botão', icone: 'cursor-click' },
  reaction: { texto: 'Reação', icone: 'smiley' },
  template: { texto: 'Modelo', icone: 'envelope-simple' },
  order: { texto: 'Pedido', icone: 'shopping-cart' },
  unsupported: { texto: 'Não suportada', icone: 'prohibit' },
};

export const tipoInfo = t => TIPO[t] || { texto: t || 'Mensagem', icone: 'chat-circle-text' };
export const temMidia = m => !!(m.midia_mime || m.midia_nome || m.midia_erro || m.midia_tamanho);

export const STATUS = {
  recebida: { texto: 'Recebida', icone: null },
  enviada: { texto: 'Enviada', icone: 'check' },
  entregue: { texto: 'Entregue', icone: 'checks' },
  lida: { texto: 'Lida', icone: 'checks', cor: 'lida' },
  falhou: { texto: 'Falhou', icone: 'warning-circle', cor: 'falhou' },
};

export const COBRANCA = {
  marketing: 'Marketing', utility: 'Utilidade', authentication: 'Autenticação',
  service: 'Atendimento', referral_conversion: 'Indicação',
};

export const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const soDigitos = s => String(s || '').replace(/\D/g, '');

// +55 (75) 99123-4567
export function formatarTelefone(tel) {
  const d = soDigitos(tel);
  if (/^55\d{10,11}$/.test(d)) {
    const local = d.slice(4);
    return `+55 (${d.slice(2, 4)}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`;
  }
  return d ? '+' + d : '';
}

// Na lista só aparece o final do número: +55 (75) *****-4567
export function mascararTelefone(tel) {
  const d = soDigitos(tel);
  if (/^55\d{10,11}$/.test(d)) return `+55 (${d.slice(2, 4)}) *****-${d.slice(-4)}`;
  return d.length > 6 ? `+${d.slice(0, 2)} ****${d.slice(-4)}` : '****';
}

export const iniciais = nome => (nome || '').trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
export const rotuloConversa = c => c.nome || mascararTelefone(c.telefone);
export const urlWhatsapp = tel => (/^\d{8,15}$/.test(tel) ? `https://wa.me/${tel}` : '');

export function formatarTamanho(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return '';
  return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
}

// ── Datas (no fuso do navegador) ──
const dt = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d; };
const dois = n => String(n).padStart(2, '0');
const chaveDe = d => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;

export const hora = iso => { const d = dt(iso); return d ? `${dois(d.getHours())}:${dois(d.getMinutes())}` : ''; };
export const dataHora = iso => { const d = dt(iso); return d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; };
export const chaveDia = iso => { const d = dt(iso); return d ? chaveDe(d) : ''; };

const diasAtras = n => { const d = new Date(); d.setDate(d.getDate() - n); return chaveDe(d); };
export function rotuloDia(iso) {
  const k = chaveDia(iso);
  if (k === diasAtras(0)) return 'Hoje';
  if (k === diasAtras(1)) return 'Ontem';
  const d = dt(iso);
  return d ? d.toLocaleDateString('pt-BR') : '';
}
// Horário na lista: hoje mostra a hora; antes disso, o dia
export const rotuloLista = iso => (chaveDia(iso) === diasAtras(0) ? hora(iso) : rotuloDia(iso));

// Reações chegam como mensagens à parte (tipo "reaction"). Aqui viram selos na mensagem reagida.
// Vale a última reação de cada lado (cliente/atendimento); emoji vazio = reação removida.
export function separarReacoes(mensagens) {
  const carregadas = new Set(mensagens.filter(m => m.tipo !== 'reaction').map(m => m.wamid));
  const porAlvo = new Map(), normais = [];
  for (const m of mensagens) {
    if (m.tipo !== 'reaction') { normais.push(m); continue; }
    const alvo = m.reacao_a || m.resposta_a;
    if (carregadas.has(alvo)) {
      const lados = porAlvo.get(alvo) || new Map();
      lados.set(m.direcao, m.texto || '');
      porAlvo.set(alvo, lados);
    } else if (m.texto) normais.push(m); // mensagem reagida ainda não carregada: fica como aviso solto
  }
  const reacoes = new Map();
  porAlvo.forEach((lados, alvo) => {
    const lista = [...lados].filter(([, emoji]) => emoji).map(([direcao, emoji]) => ({ direcao, emoji }));
    if (lista.length) reacoes.set(alvo, lista);
  });
  return { normais, reacoes };
}

// Devolve o texto do erro, ou '' se estiver certo
export function validarPeriodo(de, ate) {
  const ok = s => !s || /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!ok(de) || !ok(ate)) return 'Data inválida.';
  if (de && ate && de > ate) return 'A data inicial não pode ser maior que a final.';
  return '';
}

// Filtra a lista já carregada: busca por nome ou telefone, e só conversas com falha
export function filtrarConversas(lista, { busca = '', soFalhas = false }) {
  const q = norm(busca.trim()), dig = soDigitos(busca);
  return lista.filter(c =>
    (!soFalhas || c.falhas > 0) &&
    (!q || norm(c.nome).includes(q) || (dig.length >= 3 && c.telefone.includes(dig))));
}
