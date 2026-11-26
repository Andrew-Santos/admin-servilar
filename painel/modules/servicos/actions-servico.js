// modules/servicos/actions-servico.js — regras de cálculo e validação do serviço no cliente (o servidor valida de novo)
import { criarServico, atualizarServico, excluirServico, criarPreco, atualizarPreco, excluirPreco } from './data.js';
import { limparNome, limparTopicos, falha } from './actions-comum.js';

// Dinheiro em CENTAVOS e percentual em CENTÉSIMOS de % (inteiros): sem erro de arredondamento de decimal.
// Exemplo: R$ 18,07 = 1807 · 15,5% = 1550
export const cent = x => Math.round(Number(x) * 100);
export const platDePct = (centavos, bp) => Math.round(centavos * bp / 10000);
// Percentual da comissão a partir do valor gravado. Mostra o percentual "mais redondo" que reproduz exatamente
// esse valor (15% em vez de 15,01%, quando R$ 12,825 foi arredondado para R$ 12,83); se nenhum reproduz, usa 2 casas.
export function bpDe(centavos, plat) {
  if (!(centavos > 0)) return 0;
  const exato = plat * 10000 / centavos;
  for (const passo of [100, 10]) {
    const bp = Math.round(exato / passo) * passo;
    if (platDePct(centavos, bp) === plat) return bp;
  }
  return Math.round(exato);
}

// ── Divisão do valor entre plataforma e profissional ──
// A fonte da verdade é o VALOR da comissão (`plat`, em centavos); o repasse é o que sobra.
// `modo` guarda qual regra o admin editou por último e, portanto, o que se mantém quando o valor padrão muda:
//   'pct'  → percentual da comissão (`bp`)      'plat' → valor fixo da comissão (`fixo`)      'rep' → valor fixo do repasse (`fixo`)
export const bpPlat = d => (d.modo === 'pct' ? d.bp : bpDe(d.centavos, d.plat));

export function aplicarTotal(d) {            // chame depois de mudar d.centavos
  const t = d.centavos;
  if (d.modo === 'plat') d.plat = Math.min(d.fixo, t);
  else if (d.modo === 'rep') d.plat = t - Math.min(d.fixo, t);
  else d.plat = platDePct(t, d.bp);
}
export function definirPct(d, bp) { d.modo = 'pct'; d.bp = bp; d.plat = platDePct(d.centavos, bp); }
export function definirPlat(d, v) { v = Math.min(v, d.centavos); d.modo = 'plat'; d.fixo = v; d.plat = v; }
export function definirRep(d, v) { v = Math.min(v, d.centavos); d.modo = 'rep'; d.fixo = v; d.plat = d.centavos - v; }

export const MAX_DESC = 2000;   // o servidor valida de novo

// ── Nome ── (gravado sempre em CAIXA ALTA; a descrição fica como foi digitada)

// Devolve o texto do erro, ou '' se estiver tudo certo
export function validar(d) {
  const n = limparNome(d.nome || '');
  if (!d.especialidade_id) return 'Selecione a especialidade.';
  if (n.length < 2) return 'Informe o nome (mínimo 2 caracteres).';
  if (n.length > 100) return 'Nome muito longo (máximo 100 caracteres).';
  if (!/^[\p{L}\p{N} .,'’&()\/+%:-]+$/u.test(n)) return "Use só letras, números e . , ' & ( ) / + % : -";
  if ((d.descricao || '').length > MAX_DESC) return `Descrição muito longa (máximo ${MAX_DESC} caracteres).`;
  return validarValores(d) || validarTempo(d) || validarTopicos(d);
}

// Tempo em minutos: obrigatório, inteiro (serviço e adicional)
export const TEMPO_MAX = 9999;
export function validarTempo(d) {
  if (!(d.tempo >= 1)) return 'Informe o tempo do serviço em minutos.';
  if (d.tempo > TEMPO_MAX) return `Tempo máximo: ${TEMPO_MAX} minutos.`;
  return '';
}

// Tópicos de "incluso" e "não incluso" (o servidor valida de novo)
export const MAX_TOPICOS = 30, MAX_TOPICO = 200;
export function validarTopicos(d) {
  for (const [lista, nome] of [[d.incluso, 'incluso'], [d.nao_incluso, 'não incluso']]) {
    const t = limparTopicos(lista);
    if (t.length > MAX_TOPICOS) return `Máximo de ${MAX_TOPICOS} tópicos em "${nome}".`;
    if (t.some(x => x.length > MAX_TOPICO)) return `Cada tópico de "${nome}" pode ter até ${MAX_TOPICO} caracteres.`;
  }
  return '';
}

// valor + comissão (serviço, adicional e regra por município usam a mesma regra)
export function validarValores(d) {
  if (!(d.centavos > 0)) return 'Informe o valor padrão.';
  if (d.centavos > 99999999) return 'Valor máximo: R$ 999.999,99.';
  if (!(d.plat >= 0 && d.plat <= d.centavos)) return 'A comissão da plataforma não pode ser maior que o valor padrão.';
  return '';
}

// Cria (id nulo) ou atualiza. Devolve o serviço como ficou no banco (já com os valores calculados).
export async function salvar(id, d) {
  const erro = validar(d);
  if (erro) throw falha(erro);
  const corpo = {
    especialidade_id: d.especialidade_id, nome: limparNome(d.nome), descricao: (d.descricao || '').trim(), ativo: !!d.ativo,
    valor_padrao: d.centavos / 100, valor_plataforma: d.plat / 100,
    tempo_minutos: d.tempo,
    incluso: limparTopicos(d.incluso), nao_incluso: limparTopicos(d.nao_incluso),
  };
  return (id ? await atualizarServico({ id, ...corpo }) : await criarServico(corpo)).servico;
}

export async function remover(id) {
  if (!Number.isSafeInteger(id)) throw falha('Dados inválidos.');
  await excluirServico(id);
}

// ── Preço por município ──
export const MAX_MUNICIPIOS = 500;

export function validarRegra(d) {
  if (!d.ibge_ids.length) return 'Selecione ao menos um município.';
  if (d.ibge_ids.length > MAX_MUNICIPIOS) return `Máximo de ${MAX_MUNICIPIOS} municípios por regra.`;
  if ((d.nome || '').trim().length > 60) return 'Nome muito longo (máximo 60 caracteres).';
  return validarValores(d);
}

// Corpo gravado de uma regra de preço por município (serviço e adicional usam o mesmo)
export const corpoRegra = d => ({
  nome: (d.nome || '').replace(/\s+/g, ' ').trim(), ibge_ids: d.ibge_ids, ativo: !!d.ativo,
  valor_padrao: d.centavos / 100, valor_plataforma: d.plat / 100,
});

// Cria (id nulo) ou atualiza. Devolve a regra como ficou no banco (já com os valores calculados).
export async function salvarRegra(id, servicoId, d) {
  const erro = validarRegra(d);
  if (erro) throw falha(erro);
  const corpo = corpoRegra(d);
  return (id ? await atualizarPreco({ id, ...corpo }) : await criarPreco({ servico_id: servicoId, ...corpo })).regra;
}

export async function removerRegra(id) {
  if (!Number.isSafeInteger(id)) throw falha('Dados inválidos.');
  await excluirPreco(id);
}
