// modules/pedidos/actions.js — formatações e regras de tela (nada aqui chama a API)

// Status do fluxo → texto e cor do selo ('' | 'ok' | 'aguarda' | 'info' | 'neg'). Status novo no banco aparece com o próprio nome.
export const STATUS = {
  aguardando_pagamento: { texto: 'Aguardando pagamento', cor: 'aguarda' },
  pago: { texto: 'Pago', cor: 'ok' },
  agendado: { texto: 'Agendado', cor: 'info' },
  em_andamento: { texto: 'Em andamento', cor: 'info' },
  concluido: { texto: 'Concluído', cor: 'ok' },
  cancelado: { texto: 'Cancelado', cor: 'neg' },
};
export const infoStatus = s => STATUS[s] || { texto: String(s || 'Sem status').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), cor: '' };

const PAGAMENTO = { pix: 'Pix', cartao: 'Cartão', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito', dinheiro: 'Dinheiro', boleto: 'Boleto' };
export const rotuloPagamento = f => (f ? PAGAMENTO[f] || f.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '');

// ── Formatações ──
export const formatarMoeda = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarData = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
export const formatarDia = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR'); };
export const formatarWhatsapp = s => {
  const d = String(s || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : String(s || '');
};
export const formatarCpf = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d; };
export const formatarCep = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
export const urlWhatsapp = s => { const d = String(s || '').replace(/\D/g, ''); return d ? `https://wa.me/${d}` : ''; };
export const formatarMinutos = m => {
  m = Number(m) || 0;
  if (!m) return '';
  const hh = Math.floor(m / 60), mm = m % 60;
  return hh ? (mm ? `${hh} h ${mm} min` : `${hh} h`) : `${mm} min`;
};
export const nomeCliente = p => p.cliente_nome || formatarWhatsapp(p.telefone) || 'Sem cliente';

// ── Endereço ──
export const resumoEndereco = e => [
  [e.logradouro, e.numero].filter(Boolean).join(', '),
  e.bairro,
  e.cidade && (e.uf ? `${e.cidade} / ${e.uf}` : e.cidade),
].filter(Boolean).join(' · ');
const temPino = e => typeof e.lat === 'number' && typeof e.lng === 'number';
export const textoPino = e => (temPino(e) ? `${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}` : '');
export function urlGoogleMaps(e) {
  const base = 'https://www.google.com/maps/search/?api=1&query=';
  if (temPino(e)) return `${base}${e.lat},${e.lng}`;
  if (!e.cidade) return '';
  return base + encodeURIComponent([e.logradouro, e.numero, e.bairro, e.cidade, e.uf].filter(Boolean).join(', '));
}

// ── Itens: somas do pedido ──
export const somarItens = (itens, campo) => itens.reduce((s, i) => s + (Number(i[campo]) || 0), 0);
