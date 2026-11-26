// modules/servicos/actions-adicional.js — validação e gravação do adicional no cliente (o servidor valida de novo)
import { criarAdicional, atualizarAdicional, excluirAdicional, criarPrecoAdicional, atualizarPrecoAdicional, excluirPrecoAdicional } from './data.js';
import { limparNome, limparTopicos, falha } from './actions-comum.js';
import { validarValores, validarTempo, validarTopicos, validarRegra, corpoRegra, MAX_DESC } from './actions-servico.js';

const ORDEM_MAX = 9999;

// Devolve o texto do erro, ou '' se estiver tudo certo
export function validarAdicional(d) {
  const n = limparNome(d.nome || ''), u = (d.unidade || '').trim();
  if (!d.especialidade_id) return 'Selecione a especialidade.';
  if (n.length < 2) return 'Informe o nome (mínimo 2 caracteres).';
  if (n.length > 100) return 'Nome muito longo (máximo 100 caracteres).';
  if (!/^[\p{L}\p{N} .,'’&()\/+%:-]+$/u.test(n)) return "Use só letras, números e . , ' & ( ) / + % : -";
  if (!u) return 'Informe por que unidade o adicional é cobrado (ex.: quarto).';
  if (u.length > 30 || !/^[\p{L}\p{N} .\/+%-]+$/u.test(u)) return 'Unidade inválida: use até 30 letras, números e . / + % -';
  if (!(d.ordem >= 0 && d.ordem <= ORDEM_MAX)) return `Ordem inválida (de 0 a ${ORDEM_MAX}).`;
  if ((d.descricao || '').length > MAX_DESC) return `Descrição muito longa (máximo ${MAX_DESC} caracteres).`;
  return validarValores(d) || validarTempo(d) || validarTopicos(d);
}

// Cria (id nulo) ou atualiza. Devolve o adicional como ficou no banco (já com os valores calculados).
export async function salvarAdicional(id, d) {
  const erro = validarAdicional(d);
  if (erro) throw falha(erro);
  const corpo = {
    especialidade_id: d.especialidade_id, nome: limparNome(d.nome), unidade: d.unidade.trim().toLowerCase(), ordem: d.ordem,
    descricao: (d.descricao || '').trim(), ativo: !!d.ativo,
    valor_padrao: d.centavos / 100, valor_plataforma: d.plat / 100,
    tempo_minutos: d.tempo,
    incluso: limparTopicos(d.incluso), nao_incluso: limparTopicos(d.nao_incluso),
  };
  return (id ? await atualizarAdicional({ id, ...corpo }) : await criarAdicional(corpo)).adicional;
}

export async function removerAdicional(id) {
  if (!Number.isSafeInteger(id)) throw falha('Dados inválidos.');
  await excluirAdicional(id);
}

// ── Preço por município do adicional ── (validação e corpo são os mesmos do serviço)
export { validarRegra };

// Cria (id nulo) ou atualiza. Devolve a regra como ficou no banco (já com os valores calculados).
export async function salvarRegraAdicional(id, adicionalId, d) {
  const erro = validarRegra(d);
  if (erro) throw falha(erro);
  const corpo = corpoRegra(d);
  return (id ? await atualizarPrecoAdicional({ id, ...corpo }) : await criarPrecoAdicional({ adicional_id: adicionalId, ...corpo })).regra;
}

export async function removerRegraAdicional(id) {
  if (!Number.isSafeInteger(id)) throw falha('Dados inválidos.');
  await excluirPrecoAdicional(id);
}
