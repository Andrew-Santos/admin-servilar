// modules/servicos/data.js — único arquivo que fala com os workers servilar-especialidades e servilar-servicos
let Auth;
export const iniciar = a => { Auth = a; };

// ajuste se o nome/subdomínio dos workers for outro
const URL_ESPECIALIDADES = 'https://servilar-especialidades.andrewmssantos.workers.dev/especialidades';
const URL_SERVICOS = 'https://servilar-servicos.andrewmssantos.workers.dev';

const rota = async (url, { metodo = 'GET', corpo } = {}) => {
  const ctl = new AbortController();
  const limite = setTimeout(() => ctl.abort(), 20000);
  let res;
  try {
    res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + Auth.token() },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: ctl.signal,
    });
  } finally { clearTimeout(limite); }
  if (res.status === 401) { Auth.sair('../login.html'); throw new Error('sessão expirada'); }
  const dados = await res.json().catch(() => ({}));
  // `servidor: true` = mensagem escrita pelo nosso worker (segura para mostrar na tela)
  if (!res.ok || dados.ok === false) throw Object.assign(new Error(dados.erro || 'falha'), { servidor: !!dados.erro });
  return dados;
};

// Especialidades
// { especialidades: [{id, nome, descricao, status, regioes: [ibge_id]}], regioes: [{ibge_id, cidade, uf, ativo}] }
export const carregarEspecialidades = () => rota(URL_ESPECIALIDADES);
export const criarEspecialidade = dados => rota(URL_ESPECIALIDADES, { metodo: 'POST', corpo: dados });
export const atualizarEspecialidade = dados => rota(URL_ESPECIALIDADES, { metodo: 'PATCH', corpo: dados });
export const excluirEspecialidade = id => rota(URL_ESPECIALIDADES, { metodo: 'DELETE', corpo: { id } });

// Serviços
// { servicos: [{id, especialidade_id, nome, descricao, ativo, valor_padrao, valor_plataforma, ...}] }
export const carregarServicos = () => rota(URL_SERVICOS + '/servicos');
export const criarServico = dados => rota(URL_SERVICOS + '/servicos', { metodo: 'POST', corpo: dados });
export const atualizarServico = dados => rota(URL_SERVICOS + '/servicos', { metodo: 'PATCH', corpo: dados });
export const excluirServico = id => rota(URL_SERVICOS + '/servicos', { metodo: 'DELETE', corpo: { id } });

// Preço por município
// { regras: [{id, servico_id, nome, ibge_ids:[...], ativo, valor_padrao, valor_plataforma, ...}],
//   regioes: [{ibge_id, cidade, uf, ativo}] }
export const carregarPrecos = () => rota(URL_SERVICOS + '/precos');
export const criarPreco = dados => rota(URL_SERVICOS + '/precos', { metodo: 'POST', corpo: dados });
export const atualizarPreco = dados => rota(URL_SERVICOS + '/precos', { metodo: 'PATCH', corpo: dados });
export const excluirPreco = id => rota(URL_SERVICOS + '/precos', { metodo: 'DELETE', corpo: { id } });
