// modules/cupons/actions.js — regras e validação do cupom no cliente (o servidor valida de novo)
import { criarCupom, atualizarCupom, excluirCupom } from './data.js';

const falha = msg => Object.assign(new Error(msg), { servidor: true });   // `servidor` = pode aparecer na tela

// ── Formatação dos campos ──
export const soDigitos = s => (s || '').replace(/\D/g, '');
export const limparCodigo = s => s.normalize('NFC').replace(/\s+/g, '').toUpperCase();
// 12345678909 → 123.456.789-09 (aos poucos, enquanto digita)
export const formatarCpf = s => soDigitos(s).slice(0, 11)
  .replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
// aceita só dígitos e uma vírgula, com até 2 casas
export function limparDecimal(s) {
  const [i, ...r] = String(s).replace('.', ',').replace(/[^\d,]/g, '').split(',');
  return i.slice(0, 7) + (r.length ? ',' + r.join('').slice(0, 2) : '');
}
export const lerDecimal = s => { const v = Number(String(s).replace(',', '.')); return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN; };

// CPF: 11 dígitos, não repetidos, com os dois dígitos verificadores corretos
export function cpfValido(c) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(c[n])) return false;
  }
  return true;
}

// Devolve o texto do erro, ou '' se estiver tudo certo
export function validar(d) {
  if (!/^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(limparCodigo(d.codigo || ''))) return 'Nome do cupom inválido: use de 3 a 30 letras (sem acento), números, - ou _.';
  if ((d.descricao || '').length > 500) return 'Descrição muito longa (máximo 500 caracteres).';
  const v = lerDecimal(d.valor);
  if (!(v > 0)) return 'Informe o valor do desconto.';
  if (d.tipo === 'percentual' && v > 100) return 'A porcentagem não pode passar de 100%.';
  if (d.tipo === 'valor' && v > 999999.99) return 'Valor máximo: R$ 999.999,99.';
  if (!d.cpfRemover && d.cpf && !cpfValido(soDigitos(d.cpf))) return 'CPF inválido.';
  if (d.limite.trim()) {
    const n = Number(d.limite);
    if (!/^\d+$/.test(d.limite.trim()) || n < 1 || n > 1000000) return 'Quantidade de usos inválida (de 1 a 1.000.000).';
  }
  if (d.ate && !/^\d{4}-\d{2}-\d{2}$/.test(d.ate)) return 'Data de validade inválida.';
  return '';
}

// Cria (id nulo) ou atualiza. Devolve o cupom como ficou no banco.
// CPF: o servidor nunca devolve o CPF inteiro, então só é enviado quando a pessoa digita um novo (ou pede para remover).
export async function salvar(id, d) {
  const erro = validar(d);
  if (erro) throw falha(erro);
  const corpo = {
    codigo: limparCodigo(d.codigo), descricao: d.descricao.trim(), ativo: !!d.ativo,
    tipo_desconto: d.tipo, valor_desconto: lerDecimal(d.valor),
    limite_usos: d.limite.trim() ? Number(d.limite) : null,
    valido_ate: d.ate || null,
  };
  const cpf = soDigitos(d.cpf);
  if (d.cpfRemover) corpo.cpf = null;
  else if (cpf) corpo.cpf = cpf;
  return (id ? await atualizarCupom({ id, ...corpo }) : await criarCupom(corpo)).cupom;
}

export async function remover(id) {
  if (!Number.isSafeInteger(id)) throw falha('Dados inválidos.');
  await excluirCupom(id);
}
