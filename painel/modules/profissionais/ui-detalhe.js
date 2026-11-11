// modules/profissionais/ui-detalhe.js — conteúdo da janela: foto e resumo ao lado, uma seção por etapa com aprovar/reprovar
import { SITUACAO, formatarCep, formatarWhatsapp, limparMotivo, urlGoogleMaps } from './actions.js';
import { blocoBloqueio } from './ui-bloqueio.js';
import { decisao } from './ui-decisao.js';
import { fotoAutomatica, infoArquivo, videoSobDemanda } from './ui-arquivo.js';
import { h, icone, linhaDado, msg, selo } from './ui.js';

const TIPO_PIX = { cpf: 'CPF', telefone: 'Telefone', email: 'E-mail', aleatoria: 'Chave aleatória' };
const GENERO = { masculino: 'Masculino', feminino: 'Feminino', outro: 'Outro' };
export const ETAPAS = [
  { id: 'dados', titulo: 'Dados pessoais', icone: 'identification-card' },
  { id: 'foto', titulo: 'Foto de perfil', icone: 'camera' },
  { id: 'video', titulo: 'Vídeo de identificação', icone: 'video-camera' },
  { id: 'especialidades', titulo: 'Especialidades', icone: 'wrench' },
  { id: 'endereco', titulo: 'Endereço e localização', icone: 'map-pin' },
  { id: 'pagamento', titulo: 'Dados para receber (Pix)', icone: 'bank' },
];
const dataBR = iso => (/^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const temPino = p => typeof p.lat === 'number' && typeof p.lng === 'number';

// Conteúdo de cada etapa (só leitura)
const CORPO = {
  dados: p => h('dl', { class: 'pf-dados' },
    linhaDado('Nome', p.nome), linhaDado('CPF', p.cpf), linhaDado('WhatsApp', formatarWhatsapp(p.whatsapp)),
    linhaDado('Nascimento', dataBR(p.data_nascimento)), linhaDado('Gênero', GENERO[p.genero] || '')),
  foto: p => infoArquivo(p.foto), // a foto em si aparece na coluna da esquerda
  video: (p, ctx) => videoSobDemanda(p, ctx),
  especialidades: p => p.especialidades.length
    ? h('ul', { class: 'pf-tags' }, ...p.especialidades.map(e => h('li', { text: e.nome })))
    : h('p', { class: 'pf-vazio', text: 'Nenhuma especialidade escolhida.' }),
  endereco: p => {
    const e = p.endereco;
    if (!e) return h('p', { class: 'pf-vazio', text: 'Endereço não informado.' });
    return h('div', {},
      h('dl', { class: 'pf-dados' },
        linhaDado('CEP', formatarCep(e.cep)), linhaDado('Rua', e.logradouro), linhaDado('Número', e.numero),
        linhaDado('Complemento', e.complemento), linhaDado('Bairro', e.bairro), linhaDado('Cidade', e.cidade && `${e.cidade}${e.uf ? ' / ' + e.uf : ''}`),
        linhaDado('Localização', temPino(p) ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : '')),
      temPino(p) ? h('a', { class: 'pf-link', href: urlGoogleMaps(p.lat, p.lng), target: '_blank', rel: 'noopener noreferrer' }, icone('map-trifold'), ' Ver no Google Maps') : null);
  },
  pagamento: p => p.pagamento
    ? h('dl', { class: 'pf-dados' }, linhaDado('Tipo da chave', TIPO_PIX[p.pagamento.tipo] || p.pagamento.tipo), linhaDado('Chave Pix', p.pagamento.chave))
    : h('p', { class: 'pf-vazio', text: 'Dados de pagamento não informados.' }),
};

// Coluna da esquerda: foto já carregada, resumo e bloqueio
const lateral = (p, ctx) => h('aside', { class: 'pf-lado' },
  fotoAutomatica(p, ctx),
  h('dl', { class: 'pf-resumo' }, linhaDado('CPF', p.cpf), linhaDado('WhatsApp', formatarWhatsapp(p.whatsapp)),
    linhaDado('Cidade', p.endereco?.cidade && `${p.endereco.cidade}${p.endereco.uf ? ' / ' + p.endereco.uf : ''}`)),
  blocoBloqueio(p, ctx));

// ctx = { urls, vivo(), baixar, aoAmpliar, aoDecidir(topico, status, motivo), aoBloquear, aoDesbloquear }
export function montarFicha(p, ctx) {
  const secoes = ETAPAS.map(et => {
    const t = p.topicos[et.id] || { status: 'pendente', motivo: '' };
    const corpo = [CORPO[et.id](p, ctx)];
    if (t.status === 'reprovado' && t.motivo) corpo.push(msg('Motivo da reprovação: ' + limparMotivo(t.motivo), 'neg'));
    if (t.status === 'em_analise') corpo.push(decisao(et, ctx.aoDecidir));
    if (t.status === 'pendente') corpo.push(msg('O profissional ainda não enviou esta etapa.'));
    return h('section', { class: 'pf-secao ' + t.status },
      h('header', {}, icone(et.icone), h('h3', { text: et.titulo }), selo(SITUACAO[t.status] || SITUACAO.pendente)),
      ...corpo);
  });
  return h('div', { class: 'pf-grade' }, lateral(p, ctx),
    h('div', { class: 'pf-secoes' }, p.status === 'ajustes_necessarios' && p.ajustes ? msg(p.ajustes) : null, ...secoes));
}
