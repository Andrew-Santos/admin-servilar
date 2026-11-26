// modules/treinar-ia/data.js — único arquivo que fala com o worker servilar-treinar-ia
let Auth;
export const iniciar = a => { Auth = a; };

const API = 'https://servilar-treinar-ia.andrewmssantos.workers.dev/treinar'; // ajuste se o nome/subdomínio for outro

async function chamar(metodo, caminho, corpo, ms = 150000) {
  const ctl = new AbortController();
  const tempo = setTimeout(() => ctl.abort(), ms);
  let res;
  try {
    res = await fetch(API + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + Auth.token() },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: ctl.signal,
    });
  } catch (_) { throw new Error('Sem conexão ou demorou demais. Tente novamente.'); }
  finally { clearTimeout(tempo); }
  if (res.status === 401) { Auth.sair('../login.html'); throw new Error('Sessão expirada.'); }
  const dados = await res.json().catch(() => ({}));
  if (!res.ok || dados.ok === false) throw new Error(dados.erro || 'Não foi possível concluir. Tente novamente.');
  return dados;
}

// Tabelas: diretrizes | exemplos | conhecimento | ferramentas
export const listar = async t => (await chamar('GET', `/${t}`)).linhas;
export const criar = (t, dados) => chamar('POST', `/${t}`, dados);
export const editar = (t, id, mudancas) => chamar('PATCH', `/${t}/${encodeURIComponent(id)}`, mudancas);
export const excluir = (t, id) => chamar('DELETE', `/${t}/${encodeURIComponent(id)}`);

export const historico = async (sessao) => (await chamar('GET', `/historico${sessao ? `?sessao=${encodeURIComponent(sessao)}` : ''}`)).historico;
export const reverter = id => chamar('POST', `/historico/${id}/reverter`);
export const previa = modo => chamar('GET', `/previa?modo=${encodeURIComponent(modo)}`);

// Chat de treino
export const sessoes = async () => (await chamar('GET', '/sessoes')).sessoes;
export const novaSessao = contexto => chamar('POST', '/sessoes', { contexto }).then(d => d.sessao);
export const ajustarSessao = (id, mudancas) => chamar('PATCH', `/sessoes/${id}`, mudancas).then(d => d.sessao);
export const apagarSessao = id => chamar('DELETE', `/sessoes/${id}`);
export const mensagens = id => chamar('GET', `/sessoes/${id}/mensagens`);
export const testar = (id, texto) => chamar('POST', `/sessoes/${id}/testar`, { texto }).then(d => d.mensagens);
export const treinar = (id, texto) => chamar('POST', `/sessoes/${id}/treinar`, { texto }).then(d => d.mensagens);
export const zerarTeste = id => chamar('DELETE', `/sessoes/${id}/testar`);
