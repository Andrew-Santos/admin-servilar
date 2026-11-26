// modules/cupons/data.js — único arquivo que fala com o worker servilar-cupons
let Auth;
export const iniciar = a => { Auth = a; };

// ajuste se o nome/subdomínio do worker for outro
const URL_CUPONS = 'https://servilar-cupons.andrewmssantos.workers.dev/cupons';

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

// → { ok, cupons: [{id, codigo, descricao, tipo_desconto, valor_desconto, cpf_mascarado, limite_usos, usos, valido_ate, ativo}] }
export const carregarCupons = () => rota(URL_CUPONS);
export const criarCupom = corpo => rota(URL_CUPONS, { metodo: 'POST', corpo });
export const atualizarCupom = corpo => rota(URL_CUPONS, { metodo: 'PATCH', corpo });
export const excluirCupom = id => rota(URL_CUPONS, { metodo: 'DELETE', corpo: { id } });
