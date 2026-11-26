// modules/profissionais/actions.js — regras e formatações do cliente (o servidor valida de novo)
import { enviarAvaliacao, enviarAvaliacaoAlteracao, enviarBloqueio } from './data.js';

// Situação de cada etapa → texto e cor do selo
export const SITUACAO = {
  pendente:   { texto: 'Pendente',   cor: '' },
  em_analise: { texto: 'Em análise', cor: 'aguarda' },
  aprovado:   { texto: 'Aprovada',   cor: 'ok' },
  reprovado:  { texto: 'Reprovada',  cor: 'neg' },
};
// Situação do cadastro inteiro
export const SITUACAO_CADASTRO = {
  pendente:            { texto: 'Em aberto',           cor: '' },
  em_analise:          { texto: 'Em análise',          cor: 'aguarda' },
  ajustes_necessarios: { texto: 'Ajustes necessários', cor: 'neg' },
  ativo:               { texto: 'Ativo',               cor: 'ok' },
  bloqueado:           { texto: 'Bloqueado',           cor: 'neg' },
};
// Cor do pino no mapa, por situação
export const COR_MAPA = { em_analise: '#E3732D', ajustes_necessarios: '#B83A3A', ativo: '#2F9C95', bloqueado: '#46605E' };

// O servidor resolve o texto de cada motivo; aqui só o código e o rótulo da lista
export const MOTIVOS_BLOQUEIO = [
  { id: 'excesso_cancelamentos', texto: 'Excesso de cancelamentos' },
  { id: 'reclamacoes', texto: 'Reclamações de clientes' },
  { id: 'documentos', texto: 'Documentos ou dados suspeitos' },
  { id: 'conduta', texto: 'Conduta inadequada' },
  { id: 'outro', texto: 'Outro motivo (descreva)' },
];

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

// Pedido de alteração de profissional já aprovado (foto/Pix novos). Reprovar exige motivo.
export async function decidirAlteracao(id, altId, status, motivo = '') {
  if (status === 'reprovado') {
    const erro = validarMotivo(motivo);
    if (erro) throw new Error(erro);
  }
  return enviarAvaliacaoAlteracao(id, altId, { status, motivo: status === 'reprovado' ? limparMotivo(motivo) : undefined });
}
export const TOPICO_ALTERACAO = { foto: 'Foto de perfil', pagamento: 'Chave Pix', whatsapp: 'WhatsApp' };
export const STATUS_ALTERACAO = { aprovado: 'Aprovada', reprovado: 'Reprovada', cancelado: 'Cancelada' };

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

// ── Bloqueio ──
// Devolve o texto do erro, ou '' se estiver certo
export function validarBloqueio(motivo, detalhe) {
  if (!MOTIVOS_BLOQUEIO.some(m => m.id === motivo)) return 'Escolha o motivo do bloqueio.';
  const t = limparMotivo(detalhe);
  if (t.length > MOTIVO_MAX || (motivo === 'outro' && t.length < MOTIVO_MIN)) return `Descreva o motivo (de ${MOTIVO_MIN} a ${MOTIVO_MAX} caracteres).`;
  return '';
}
export async function bloquear(id, motivo, detalhe) {
  const erro = validarBloqueio(motivo, detalhe);
  if (erro) throw new Error(erro);
  return enviarBloqueio(id, { acao: 'bloquear', motivo, detalhe: limparMotivo(detalhe) });
}
export const desbloquear = id => enviarBloqueio(id, { acao: 'desbloquear' });

// ── Mapa e tabela ──
// Abre no app/site do Google Maps (sem chave): pelo ponto exato, ou pelo endereço se não houver ponto
export const urlGoogleMaps = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const rotuloCidade = i => (i.cidade ? (i.uf ? `${i.cidade} / ${i.uf}` : i.cidade) : '');

const ORDEM_SITUACAO = { em_analise: 0, ajustes_necessarios: 1, bloqueado: 2, ativo: 3, pendente: 4 };
const CHAVES = {
  nome: i => i.nome,
  cidade: i => rotuloCidade(i),
  situacao: i => (i.status === 'ativo' && i.para_avaliar ? 0.5 : ORDEM_SITUACAO[i.status] ?? 9), // ativo com pedido de alteração vem logo após "em análise"
  pendencias: i => -(i.para_avaliar * 10 + i.reprovadas),
};
// Ordena sem mexer na lista original. ordem = { col, dir: 'asc' | 'desc' }
export function ordenar(itens, { col, dir }) {
  const chave = CHAVES[col] || CHAVES.nome, f = dir === 'desc' ? -1 : 1;
  return [...itens].sort((a, b) => {
    const x = chave(a), y = chave(b);
    const c = typeof x === 'string' ? x.localeCompare(y, 'pt') : x - y;
    return (c || a.nome.localeCompare(b.nome, 'pt')) * f;
  });
}

// ── Cadastros em aberto (status "pendente": o profissional começou e ainda não enviou para análise) ──
export const NOME_ETAPA = { dados: 'Dados pessoais', foto: 'Foto de perfil', video: 'Vídeo', especialidades: 'Especialidades', endereco: 'Endereço', pagamento: 'Pix' };
export const DIAS_PARADO = 7;
export const diasDesde = iso => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86400000));
};
export const textoDias = d => (d === null ? '' : d === 0 ? 'hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`);

// Contagem por situação, taxa de cadastros em aberto e onde eles mais param
export function resumoCadastros(itens) {
  const porStatus = {}, onde = {};
  itens.forEach(i => { porStatus[i.status] = (porStatus[i.status] || 0) + 1; });
  const abertos = itens.filter(i => i.status === 'pendente');
  abertos.forEach(i => { if (i.parou_em) onde[i.parou_em] = (onde[i.parou_em] || 0) + 1; });
  return {
    total: itens.length, porStatus,
    taxaAberto: itens.length ? Math.round(abertos.length * 100 / itens.length) : 0,
    parados: abertos.filter(i => (diasDesde(i.atualizado_em) ?? 0) >= DIAS_PARADO).length,
    onde: Object.entries(onde).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ id, n })),
  };
}
