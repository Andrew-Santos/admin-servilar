// modules/servicos/actions-comum.js — texto em caixa alta e erro com mensagem segura para a tela
export const maiusculo = s => s.toLocaleUpperCase('pt-BR');
export const limparNome = s => maiusculo(s.normalize('NFC').replace(/\s+/g, ' ').trim());
// remove espaços repetidos e tópicos vazios de uma lista (incluso / não incluso)
export const limparTopicos = lista => (lista || []).map(t => String(t).replace(/\s+/g, ' ').trim()).filter(Boolean);
export const falha = msg => Object.assign(new Error(msg), { servidor: true }); // `servidor` = pode aparecer na tela
