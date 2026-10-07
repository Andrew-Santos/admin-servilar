// modules/regioes/data.js — IBGE (mapas/nomes) + worker servilar-regioes
const IBGE = 'https://servicodados.ibge.gov.br/api';
let Auth;
export const iniciar = a => { Auth = a; };

export const UFS = {11:'RO',12:'AC',13:'AM',14:'RR',15:'PA',16:'AP',17:'TO',21:'MA',22:'PI',23:'CE',24:'RN',25:'PB',26:'PE',27:'AL',28:'SE',29:'BA',31:'MG',32:'ES',33:'RJ',35:'SP',41:'PR',42:'SC',43:'RS',50:'MS',51:'MT',52:'GO',53:'DF'};
export const codUF = sigla => Object.keys(UFS).find(k => UFS[k] === sigla);
// Capitais (código IBGE) — ganham rótulo prioritário no mapa para a pessoa se situar
export const CAPITAIS = new Set([1100205,1200401,1302603,1400100,1501402,1600303,1721000,2111300,2211001,2304400,2408102,2507507,2611606,2704302,2800308,2927408,3106200,3205309,3304557,3550308,4106902,4205407,4314902,5002704,5103403,5208707,5300108]);


const json = async (url, opt) => {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
};
const cache = new Map();
const memo = (k, f) => cache.get(k) ?? (cache.set(k, f().catch(e => (cache.delete(k), Promise.reject(e)))), cache.get(k));

const GEO = '?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=';
export const malhaBrasil = () => memo('br', () => json(`${IBGE}/v3/malhas/paises/BR${GEO}UF`));
export const malhaUF = cod => memo('m' + cod, () => json(`${IBGE}/v3/malhas/estados/${cod}${GEO}municipio`));
export const municipios = cod => memo('n' + cod, async () =>
  new Map((await json(`${IBGE}/v1/localidades/estados/${cod}/municipios`)).map(m => [m.id, m.nome])));

const REGIOES_API = 'https://servilar-regioes.andrewmssantos.workers.dev/regioes'; // ajuste se o nome/subdomínio for outro
const rota = async ({ metodo = 'GET', corpo } = {}) => {
  const res = await fetch(REGIOES_API, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + Auth.token() },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (res.status === 401) { Auth.sair('../login.html'); throw new Error('sessão expirada'); }
  const dados = await res.json().catch(() => ({}));
  if (!res.ok || dados.ok === false) throw new Error(dados.erro || 'falha');
  return dados;
};
export const listar = async () => (await rota()).regioes;                    // [{ibge_id, cidade, uf, ativo}]
export const criar = ibge_ids => rota({ metodo: 'POST', corpo: { ibge_ids } });
export const atualizar = (ibge_id, ativo) => rota({ metodo: 'PATCH', corpo: { ibge_id, ativo } });
export const excluir = ibge_id => rota({ metodo: 'DELETE', corpo: { ibge_id } });