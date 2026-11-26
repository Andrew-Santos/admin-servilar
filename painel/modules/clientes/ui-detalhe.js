// modules/clientes/ui-detalhe.js — conteúdo da janela do cliente (só leitura): resumo ao lado, dados pessoais e endereços
import { cadastroCompleto, formatarCep, formatarCpf, formatarData, formatarDia, formatarWhatsapp, inicial, resumoEndereco, textoPino, urlGoogleMaps, urlWhatsapp } from './actions.js';
import { h, icone, linhaDado, selo } from './ui.js';

const CADASTRO = { completo: { texto: 'Cadastro completo', cor: 'ok' }, incompleto: { texto: 'Cadastro incompleto', cor: 'aguarda' } };
export const seloCadastro = c => selo(cadastroCompleto(c) ? CADASTRO.completo : CADASTRO.incompleto);

const secao = (titulo, nomeIcone, ...corpo) => h('section', { class: 'cl-secao' },
  h('header', {}, icone(nomeIcone), h('h3', { text: titulo })), ...corpo);

function cartaoEndereco(e, n) {
  const mapa = urlGoogleMaps(e);
  return h('article', { class: 'cl-end' + (e.principal ? ' principal' : '') },
    h('header', {},
      h('strong', { text: e.apelido || `Endereço ${n}` }),
      e.principal ? selo({ texto: 'Principal', cor: 'ok' }) : null,
      e.manual ? selo({ texto: 'Digitado manualmente', cor: '' }) : null),
    h('p', { class: 'cl-end-resumo', text: resumoEndereco(e) || 'Endereço sem dados.' }),
    h('dl', { class: 'cl-dados' },
      linhaDado('CEP', formatarCep(e.cep)), linhaDado('Rua', e.logradouro), linhaDado('Número', e.numero),
      linhaDado('Complemento', e.complemento), linhaDado('Bairro', e.bairro), linhaDado('Cidade', e.cidade && (e.uf ? `${e.cidade} / ${e.uf}` : e.cidade)),
      linhaDado('Referência', e.referencia), linhaDado('Localização', textoPino(e)), linhaDado('Origem da localização', e.coord_origem)),
    mapa ? h('a', { class: 'cl-link', href: mapa, target: '_blank', rel: 'noopener noreferrer' }, icone('map-trifold'), ' Ver no Google Maps') : null);
}

// Coluna da esquerda: inicial, contato e datas
const lateral = c => {
  const zap = urlWhatsapp(c.whatsapp);
  return h('aside', { class: 'cl-lado' },
    h('div', { class: 'cl-avatar', 'aria-hidden': 'true', text: inicial(c.nome) }),
    h('dl', { class: 'cl-resumo' },
      linhaDado('WhatsApp', formatarWhatsapp(c.whatsapp)), linhaDado('CPF', formatarCpf(c.cpf)),
      linhaDado('Cliente desde', formatarDia(c.criado_em))),
    zap ? h('a', { class: 'cl-btn', href: zap, target: '_blank', rel: 'noopener noreferrer' }, icone('whatsapp-logo'), ' Abrir no WhatsApp') : null);
};

// montarFicha(cliente) → elemento
export function montarFicha(c) {
  const ends = c.enderecos || [];
  return h('div', { class: 'cl-grade' }, lateral(c),
    h('div', { class: 'cl-secoes' },
      secao('Dados pessoais', 'identification-card', h('dl', { class: 'cl-dados' },
        linhaDado('Nome', c.nome), linhaDado('CPF', formatarCpf(c.cpf)), linhaDado('WhatsApp', formatarWhatsapp(c.whatsapp)),
        linhaDado('Cadastrado em', formatarData(c.criado_em)), linhaDado('Última atualização', formatarData(c.atualizado_em)))),
      secao(`Endereços (${ends.length})`, 'map-pin', ends.length
        ? h('div', { class: 'cl-ends' }, ...ends.map((e, i) => cartaoEndereco(e, i + 1)))
        : h('p', { class: 'cl-vazio', text: 'Nenhum endereço cadastrado.' }))));
}
