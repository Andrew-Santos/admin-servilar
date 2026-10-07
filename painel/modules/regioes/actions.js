// modules/regioes/actions.js — só envia CÓDIGOS; nome/UF o servidor resolve (nunca confie no cliente)
import { criar, atualizar, excluir } from './data.js';

export async function cadastrar(pend) {
  const ids = [...pend.keys()];
  if (!ids.length || ids.length > 100) throw new Error('quantidade inválida');
  if (!ids.every(i => Number.isInteger(i) && i >= 1100015 && i <= 5300108)) throw new Error('código inválido');
  await criar(ids);
  return ids;
}

const idOk = i => Number.isInteger(i) && i >= 1100015 && i <= 5300108;
export async function alterarAtivo(id, ativo) {
  if (!idOk(id) || typeof ativo !== 'boolean') throw new Error('dados inválidos');
  await atualizar(id, ativo);
}
export async function remover(id) {
  if (!idOk(id)) throw new Error('código inválido');
  await excluir(id);
}