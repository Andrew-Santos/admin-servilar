// modules/clientes/data.js — único arquivo que fala com o worker servilar-clientes (somente leitura)
let Auth;
export const iniciar = a => { Auth = a; };

const API = 'https://servilar-clientes.andrewmssantos.workers.dev/clientes'; // ajuste se o nome/subdomínio for outro

async function chamar(caminho = '') {
  let res;
  try {
    res = await fetch(API + caminho, { headers: { Authorization: 'Bearer ' + Auth.token() } });
  } catch (_) { throw new Error('Sem conexão. Verifique a internet e tente novamente.'); }
  if (res.status === 401) { Auth.sair('../login.html'); throw new Error('Sessão expirada.'); }
  const dados = await res.json().catch(() => ({}));
  if (!res.ok || dados.ok === false) throw new Error(dados.erro || 'Não foi possível concluir. Tente novamente.');
  return dados;
}

// itens: [{ id, nome, whatsapp, cpf, cidade, uf, qtd_enderecos, criado_em, atualizado_em }]
export const listar = async () => (await chamar()).itens;
// ficha: o mesmo + enderecos: [{ apelido, principal, manual, cep, logradouro, numero, complemento, bairro, cidade, uf, ibge, referencia, lat, lng, coord_origem }]
export const buscarFicha = async id => (await chamar('/' + id)).cliente;
