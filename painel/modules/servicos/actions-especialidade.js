// modules/servicos/actions-especialidade.js — validação da especialidade no cliente (só conforto: o servidor valida de novo)
import { criarEspecialidade, atualizarEspecialidade, excluirEspecialidade } from './data.js';
import { limparNome, falha } from './actions-comum.js';

const idOk = i => Number.isInteger(i) && i >= 1100015 && i <= 5300108;

// Devolve o texto do erro, ou '' se estiver tudo certo
export function validar({ nome, descricao, regioes }) {
  const n = limparNome(nome || '');
  if (n.length < 2) return 'Informe o nome (mínimo 2 caracteres).';
  if (n.length > 80) return 'Nome muito longo (máximo 80 caracteres).';
  if (!/^[\p{L}\p{N} .,'&()\/-]+$/u.test(n)) return "Use só letras, números e . , ' & ( ) / -";
  if ((descricao || '').length > 500) return 'Descrição muito longa (máximo 500 caracteres).';
  if (![...regioes].every(idOk)) return 'Há uma região inválida.';
  return '';
}

// Cria (id nulo) ou atualiza. Devolve a especialidade como ficou no banco.
export async function salvar(id, d) {
  const erro = validar(d);
  if (erro) throw falha(erro);
  const corpo = { nome: limparNome(d.nome), descricao: (d.descricao || '').trim(), status: !!d.status, regioes: [...d.regioes] };
  return (id ? await atualizarEspecialidade({ id, ...corpo }) : await criarEspecialidade(corpo)).especialidade;
}

export async function remover(id) {
  if (!Number.isSafeInteger(id)) throw falha('Dados inválidos.');
  await excluirEspecialidade(id);
}
