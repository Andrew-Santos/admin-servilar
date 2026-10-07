// modules/especialidades/data.js — worker servilar-especialidades
let Auth;
export const iniciar = a => { Auth = a; };

const API = 'https://servilar-especialidades.andrewmssantos.workers.dev/especialidades'; // ajuste se o nome/subdomínio for outro
const rota = async ({ metodo = 'GET', corpo } = {}) => {
  const res = await fetch(API, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + Auth.token() },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (res.status === 401) { Auth.sair('../login.html'); throw new Error('sessão expirada'); }
  const dados = await res.json().catch(() => ({}));
  // `servidor: true` = mensagem escrita pelo nosso worker (segura para mostrar na tela)
  if (!res.ok || dados.ok === false) throw Object.assign(new Error(dados.erro || 'falha'), { servidor: !!dados.erro });
  return dados;
};

// { especialidades: [{id, nome, descricao, status, regioes: [ibge_id]}], regioes: [{ibge_id, cidade, uf, ativo}] }
export const carregar = () => rota();
export const criar = dados => rota({ metodo: 'POST', corpo: dados });
export const atualizar = dados => rota({ metodo: 'PATCH', corpo: dados });
export const excluir = id => rota({ metodo: 'DELETE', corpo: { id } });
