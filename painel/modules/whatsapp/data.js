// modules/whatsapp/data.js — único arquivo que fala com o worker admin-whatsapp-historico
let Auth;
export const iniciar = a => { Auth = a; };

const API = 'https://admin-whatsapp-historico.andrewmssantos.workers.dev/whatsapp'; // ajuste se o nome/subdomínio for outro

async function pedir(caminho, params = {}, ms = 20000) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);

  const ctl = new AbortController();
  const tempo = setTimeout(() => ctl.abort(), ms); // vale até chegar a resposta; o arquivo segue baixando
  let res;
  try {
    res = await fetch(`${API}${caminho}?${q}`, { headers: { Authorization: 'Bearer ' + Auth.token() }, signal: ctl.signal });
  } catch (_) { throw new Error('Sem conexão. Verifique a internet e tente novamente.'); }
  finally { clearTimeout(tempo); }

  if (res.status === 401) { Auth.sair('../login.html'); throw new Error('Sessão expirada.'); }
  return res;
}

async function chamar(caminho, params) {
  const res = await pedir(caminho, params);
  const dados = await res.json().catch(() => ({}));
  if (!res.ok || dados.ok === false) throw new Error(dados.erro || 'Não foi possível carregar. Tente novamente.');
  return dados;
}

// { conversas: [{ telefone, nome, falhas, ultima }], truncado }
export const listarConversas = ({ de, ate } = {}) => chamar('/conversas', { de, ate });
// { mensagens: [...da mais antiga para a mais nova], tem_mais }. `antes` = id da mensagem mais antiga já carregada
export const listarMensagens = ({ telefone, antes }) => chamar('/mensagens', { telefone, antes: antes ? String(antes) : '' });

// Arquivo da mensagem (Blob). Só é chamado quando a pessoa clica em ver, ouvir ou baixar.
export async function baixarMidia(id) {
  const res = await pedir('/midia', { id: String(id) }, 60000);
  if (!res.ok) {
    const dados = await res.json().catch(() => ({}));
    throw new Error(dados.erro || 'Não foi possível abrir o arquivo.');
  }
  return res.blob();
}
