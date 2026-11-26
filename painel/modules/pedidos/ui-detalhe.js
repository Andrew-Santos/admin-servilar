// modules/pedidos/ui-detalhe.js — conteúdo da janela do pedido: lateral, itens, resumo financeiro, endereço e troca de status
import { formatarCep, formatarCpf, formatarData, formatarMinutos, formatarMoeda, formatarWhatsapp, infoStatus, nomeCliente, resumoEndereco, rotuloPagamento, somarItens, textoPino, urlGoogleMaps, urlWhatsapp } from './actions.js';
import { h, icone, linhaDado, msg, selo, trocar } from './ui.js';

const secao = (titulo, nomeIcone, ...corpo) => h('section', { class: 'pd-secao' }, h('header', {}, icone(nomeIcone), h('h3', { text: titulo })), ...corpo);
const seloStatus = s => { const e = selo(infoStatus(s)); e.dataset.seloStatus = ''; return e; };
export const seloDoPedido = p => seloStatus(p.status);

const linhaValor = (rotulo, valor, classe = '') => h('div', { class: 'pd-fin ' + classe }, h('span', { text: rotulo }), h('b', { text: valor }));

function tabelaItens(itens) {
  if (!itens.length) return h('p', { class: 'pd-vazio', text: 'Este pedido ainda não tem itens.' });
  const cab = ['Item', 'Qtd', 'Unitário', 'Total', 'Plataforma', 'Repasse', 'Tempo'];
  const linhas = itens.map(i => h('tr', {},
    h('td', {}, h('span', { text: i.nome || 'Item sem nome' }), ' ', i.adicional_id ? selo({ texto: 'Adicional', cor: '' }) : null),
    h('td', { class: 'pd-num', text: String(i.quantidade) }),
    h('td', { class: 'pd-num', text: formatarMoeda(i.valor_unitario) }),
    h('td', { class: 'pd-num pd-total', text: formatarMoeda(i.total) }),
    h('td', { class: 'pd-num pd-mudo', text: formatarMoeda(i.valor_plataforma) }),
    h('td', { class: 'pd-num pd-mudo', text: formatarMoeda(i.valor_repasse) }),
    h('td', { class: 'pd-num pd-mudo', text: formatarMinutos(i.tempo_minutos) || '—' })));
  return h('div', { class: 'pd-itens-caixa' }, h('table', { class: 'pd-itens' },
    h('thead', {}, h('tr', {}, ...cab.map(c => h('th', { scope: 'col', text: c })))), h('tbody', {}, ...linhas)));
}

function resumoFinanceiro(p) {
  const it = p.itens || [];
  return h('div', { class: 'pd-financeiro' },
    linhaValor('Subtotal', formatarMoeda(p.subtotal)),
    p.desconto > 0 || p.cupom_codigo ? linhaValor(p.cupom_codigo ? `Desconto (cupom ${p.cupom_codigo})` : 'Desconto', '− ' + formatarMoeda(p.desconto), 'desc') : null,
    linhaValor('Total do pedido', formatarMoeda(p.total), 'total'),
    h('hr'),
    linhaValor('Plataforma', formatarMoeda(somarItens(it, 'valor_plataforma')), 'mudo'),
    linhaValor('Repasse ao profissional', formatarMoeda(somarItens(it, 'valor_repasse')), 'mudo'),
    p.tempo_total_minutos ? linhaValor('Tempo estimado', formatarMinutos(p.tempo_total_minutos), 'mudo') : null,
    p.cupom_usado_em ? linhaValor('Cupom usado em', formatarData(p.cupom_usado_em), 'mudo') : null);
}

function cartaoEndereco(e) {
  if (!e) return h('p', { class: 'pd-vazio', text: 'Pedido sem endereço.' });
  const mapa = urlGoogleMaps(e);
  return h('article', { class: 'pd-end' },
    h('header', {}, h('strong', { text: e.apelido || 'Local do serviço' }),
      e.manual ? selo({ texto: 'Digitado manualmente', cor: '' }) : null,
      e.loc_verificada ? selo({ texto: 'Localização verificada', cor: 'ok' }) : e.loc_pulada ? selo({ texto: 'Localização pulada', cor: 'aguarda' }) : null),
    h('p', { class: 'pd-end-resumo', text: resumoEndereco(e) || 'Endereço sem dados.' }),
    h('dl', { class: 'pd-dados' },
      linhaDado('CEP', formatarCep(e.cep)), linhaDado('Rua', e.logradouro), linhaDado('Número', e.numero),
      linhaDado('Complemento', e.complemento), linhaDado('Bairro', e.bairro), linhaDado('Cidade', e.cidade && (e.uf ? `${e.cidade} / ${e.uf}` : e.cidade)),
      linhaDado('Referência', e.referencia), linhaDado('Localização', textoPino(e)), linhaDado('Origem da localização', e.coord_origem)),
    mapa ? h('a', { class: 'pd-link', href: mapa, target: '_blank', rel: 'noopener noreferrer' }, icone('map-trifold'), ' Ver no Google Maps') : null);
}

// Alterar status: seletor + botão; o botão mostra "Salvando…" e o resultado aparece embaixo (verde/vermelho).
// salvar(novoStatus) → Promise (rejeita com Error cuja message vai para a tela)
function painelStatus(p, salvar) {
  const lista = [...new Set([p.status, ...(p.status_validos || [])])].filter(Boolean);
  const sel = h('select', { class: 'pd-campo', 'aria-label': 'Novo status' }, ...lista.map(s => h('option', { value: s, text: infoStatus(s).texto })));
  sel.value = p.status;
  const btn = h('button', { type: 'button', class: 'pd-btn primario', disabled: true }, icone('check'), ' Salvar status');
  const aviso = h('div', { class: 'pd-aviso', 'aria-live': 'polite' });
  let atual = p.status;

  sel.onchange = () => { btn.disabled = sel.value === atual; trocar(aviso); };
  btn.onclick = async () => {
    const novo = sel.value;
    btn.disabled = sel.disabled = true; trocar(btn, icone('circle-notch'), ' Salvando…'); btn.classList.add('girando');
    try {
      await salvar(novo);
      atual = novo;
      trocar(aviso, msg(`Status alterado para “${infoStatus(novo).texto}”.`, 'ok'));
    } catch (e) {
      sel.value = atual;
      trocar(aviso, msg(e.message, 'neg'));
    }
    btn.classList.remove('girando'); sel.disabled = false; trocar(btn, icone('check'), ' Salvar status'); btn.disabled = sel.value === atual;
  };
  return h('div', { class: 'pd-status-ac' }, h('div', { class: 'pd-status-linha' }, sel, btn), aviso);
}

const lateral = p => {
  const zap = urlWhatsapp(p.telefone || p.cliente?.whatsapp);
  return h('aside', { class: 'pd-lado' },
    h('div', { class: 'pd-numero' }, h('small', { text: 'Pedido' }), h('strong', { text: '#' + (p.numero || p.id) })),
    seloStatus(p.status),
    h('dl', { class: 'pd-resumo' },
      linhaDado('Cliente', nomeCliente(p)), linhaDado('WhatsApp', formatarWhatsapp(p.telefone)),
      linhaDado('Pagamento', rotuloPagamento(p.forma_pagamento)), linhaDado('Agendamento', formatarData(p.data_agendamento)),
      linhaDado('Criado em', formatarData(p.criado_em)), linhaDado('Atualizado em', formatarData(p.atualizado_em)),
      p.fechado_em ? linhaDado('Fechado em', formatarData(p.fechado_em)) : null),
    zap ? h('a', { class: 'pd-btn', href: zap, target: '_blank', rel: 'noopener noreferrer' }, icone('whatsapp-logo'), ' Abrir no WhatsApp') : null);
};

// montarDetalhe(pedido, { salvarStatus(novo) → Promise<{atualizado_em, fechado_em}> }) → elemento
export function montarDetalhe(p, { salvarStatus }) {
  const raiz = h('div', { class: 'pd-grade' });
  const salvar = async novo => {
    const r = await salvarStatus(novo);
    p.status = novo;
    raiz.querySelectorAll('[data-selo-status]').forEach(el => el.replaceWith(seloStatus(novo)));   // lateral e cabeçalho da janela
    return r;
  };
  raiz.append(lateral(p), h('div', { class: 'pd-secoes' },
    secao('Alterar status', 'arrows-clockwise', painelStatus(p, salvar)),
    secao(`Itens (${(p.itens || []).length})`, 'list-checks', tabelaItens(p.itens || [])),
    secao('Resumo financeiro', 'receipt', resumoFinanceiro(p)),
    secao('Cliente', 'identification-card', h('dl', { class: 'pd-dados' },
      linhaDado('Nome', p.cliente?.nome), linhaDado('CPF', formatarCpf(p.cliente?.cpf)), linhaDado('WhatsApp', formatarWhatsapp(p.cliente?.whatsapp || p.telefone)),
      p.ultima_msg ? linhaDado('Última mensagem', p.ultima_msg) : null)),
    secao('Endereço', 'map-pin', cartaoEndereco(p.endereco))));
  return raiz;
}
