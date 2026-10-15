// modules/servicos/data.js — worker servilar-servicos (rotas /servicos e /precos)
let Auth;
export const iniciar = a => { Auth = a; };

const BASE = 'https://servilar-servicos.andrewmssantos.workers.dev'; // ajuste se o nome/subdomínio for outro
const rota = async (caminho, { metodo = 'GET', corpo } = {}) => {
  const res = await fetch(BASE + caminho, {
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

// { servicos: [{id, especialidade_id, nome, descricao, ativo, valor_padrao, porcentagem_plataforma,
//               valor_plataforma, porcentagem_repasse, valor_repasse}], especialidades: [{id, nome, ativo}] }
export const carregar = () => rota('/servicos');
export const criar = dados => rota('/servicos', { metodo: 'POST', corpo: dados });
export const atualizar = dados => rota('/servicos', { metodo: 'PATCH', corpo: dados });
export const excluir = id => rota('/servicos', { metodo: 'DELETE', corpo: { id } });

// Preço por município
// { regras: [{id, servico_id, nome, ibge_ids:[...], ativo, valor_padrao, valor_plataforma, ...}],
//   regioes: [{ibge_id, cidade, uf, ativo}] }
export const carregarPrecos = () => rota('/precos');
export const criarPreco = dados => rota('/precos', { metodo: 'POST', corpo: dados });
export const atualizarPreco = dados => rota('/precos', { metodo: 'PATCH', corpo: dados });
export const excluirPreco = id => rota('/precos', { metodo: 'DELETE', corpo: { id } });
