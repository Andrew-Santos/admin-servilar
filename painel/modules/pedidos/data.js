// modules/pedidos/data.js — único arquivo que fala com o worker servilar-pedidos
let Auth;
export const iniciar = a => { Auth = a; };

const API = 'https://servilar-pedidos.andrewmssantos.workers.dev/pedidos'; // ajuste se o nome/subdomínio for outro

async function chamar(caminho = '', opcoes = {}) {
  let res;
  try {
    res = await fetch(API + caminho, { ...opcoes, headers: { Authorization: 'Bearer ' + Auth.token(), ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}) } });
  } catch (_) { throw new Error('Sem conexão. Verifique a internet e tente novamente.'); }
  if (res.status === 401) { Auth.sair('../login.html'); throw new Error('Sessão expirada.'); }
  const dados = await res.json().catch(() => ({}));
  if (!res.ok || dados.ok === false) throw new Error(dados.erro || 'Não foi possível concluir. Tente novamente.');
  return dados;
}

// → { itens: [{ id, numero, status, telefone, cliente_nome, forma_pagamento, subtotal, desconto, total, cupom_codigo, data_agendamento, criado_em }], total, pagina, limite }
export function listar({ status = '', q = '', pagina = 1, limite = 25 } = {}) {
  const p = new URLSearchParams({ pagina, limite });
  if (status) p.set('status', status);
  if (q) p.set('q', q);
  return chamar('?' + p);
}
// → pedido + endereco, cliente, itens[], tempo_total_minutos, status_validos[]
export const buscarPedido = async id => (await chamar('/' + id)).pedido;
// → { status, atualizado_em, fechado_em }
export const alterarStatus = (id, status) => chamar('/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
