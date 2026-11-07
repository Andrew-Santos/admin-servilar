// modules/profissionais/data.js — único arquivo que fala com o worker servilar-profissionais
let Auth;
export const iniciar = a => { Auth = a; };

const API = 'https://servilar-profissionais.andrewmssantos.workers.dev/profissionais'; // ajuste se o nome/subdomínio for outro

async function chamar(caminho = '', { metodo = 'GET', corpo, bruto } = {}) {
  let res;
  try {
    res = await fetch(API + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + Auth.token() },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch (_) { throw new Error('Sem conexão. Verifique a internet e tente novamente.'); }
  if (res.status === 401) { Auth.sair('../login.html'); throw new Error('Sessão expirada.'); }
  if (bruto && res.ok) return res.blob();
  const dados = await res.json().catch(() => ({}));
  if (!res.ok || dados.ok === false) throw new Error(dados.erro || 'Não foi possível concluir. Tente novamente.');
  return dados;
}

export const listar = async () => (await chamar()).itens;                          // [{ id, nome, cpf, status, para_avaliar, reprovadas }]
export const buscarFicha = async id => (await chamar('/' + id)).profissional;      // ficha completa
export const enviarAvaliacao = (id, corpo) => chamar(`/${id}/avaliar`, { metodo: 'PUT', corpo }); // { topico, status, motivo? }
export const baixarArquivo = (id, tipo) => chamar(`/${id}/arquivo/${tipo}`, { bruto: true });     // Blob (foto ou vídeo)
