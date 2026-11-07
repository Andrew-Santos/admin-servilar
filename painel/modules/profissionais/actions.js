// modules/profissionais/actions.js — regras e formatações do cliente (o servidor valida de novo)
import { enviarAvaliacao } from './data.js';

// Situação de cada etapa → texto e cor do selo
export const SITUACAO = {
  pendente:   { texto: 'Pendente',   cor: '' },
  em_analise: { texto: 'Em análise', cor: 'aguarda' },
  aprovado:   { texto: 'Aprovada',   cor: 'ok' },
  reprovado:  { texto: 'Reprovada',  cor: 'neg' },
};
// Situação do cadastro inteiro
export const SITUACAO_CADASTRO = {
  pendente:            { texto: 'Pendente',            cor: '' },
  em_analise:          { texto: 'Em análise',          cor: 'aguarda' },
  ajustes_necessarios: { texto: 'Ajustes necessários', cor: 'neg' },
  ativo:               { texto: 'Ativo',               cor: 'ok' },
};

export const MOTIVO_MIN = 5, MOTIVO_MAX = 300;
export const limparMotivo = s => (s || '').normalize('NFC').replace(/\s+/g, ' ').trim();

// Devolve o texto do erro, ou '' se estiver certo
export function validarMotivo(texto) {
  const t = limparMotivo(texto);
  return t.length < MOTIVO_MIN || t.length > MOTIVO_MAX ? `Explique o motivo da reprovação (de ${MOTIVO_MIN} a ${MOTIVO_MAX} caracteres).` : '';
}

// Aprova ou reprova uma etapa. Reprovar exige motivo.
export async function decidir(id, topico, status, motivo = '') {
  if (status === 'reprovado') {
    const erro = validarMotivo(motivo);
    if (erro) throw new Error(erro);
  }
  return enviarAvaliacao(id, { topico, status, motivo: status === 'reprovado' ? limparMotivo(motivo) : undefined });
}

export const formatarData = iso => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
export function formatarTamanho(bytes) {
  const n = Number(bytes) || 0;
  return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
}
export const formatarWhatsapp = s => {
  const d = String(s || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : String(s || '');
};
export const formatarCep = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
