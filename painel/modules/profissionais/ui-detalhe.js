// modules/profissionais/ui-detalhe.js — ficha do profissional: uma seção por etapa, com aprovar/reprovar
import { SITUACAO, formatarCep, formatarData, formatarTamanho, formatarWhatsapp, limparMotivo, MOTIVO_MAX, validarMotivo } from './actions.js';
import { baixarArquivo } from './data.js';
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

// Foto e vídeo: baixa com o token e mostra por blob (`urls` guarda o que precisa ser liberado depois)
function arquivo(tipo, p, urls, vivo) {
  const meta = p[tipo];
  if (!meta) return h('p', { class: 'pf-vazio', text: 'Ainda não enviado.' });
  const caixa = h('div', { class: 'pf-arq' });
  const info = h('p', { class: 'pf-info', text: `${formatarTamanho(meta.tamanho)}${meta.enviado_em ? ' · enviado em ' + formatarData(meta.enviado_em) : ''}` });
  async function abrir() {
    caixa.replaceChildren(h('p', { class: 'pf-info', role: 'status', text: 'Carregando…' }));
    try {
      const url = URL.createObjectURL(await baixarArquivo(p.id, tipo));
      if (!vivo()) return URL.revokeObjectURL(url);
      urls.push(url);
      caixa.replaceChildren(tipo === 'foto'
        ? h('img', { class: 'pf-foto', src: url, alt: `Foto de perfil de ${p.nome}` })
        : h('video', { class: 'pf-video', src: url, controls: true, preload: 'metadata', playsinline: true }));
    } catch (e) {
      if (!vivo()) return;
      caixa.replaceChildren(msg(e.message, 'neg'), h('button', { type: 'button', class: 'pf-btn', text: 'Tentar de novo', onclick: abrir }));
    }
  }
  caixa.append(h('button', { type: 'button', class: 'pf-btn', onclick: abrir }, icone(tipo === 'foto' ? 'image' : 'play'), tipo === 'foto' ? ' Ver foto' : ' Ver vídeo'));
  return h('div', {}, caixa, info);
}

// Conteúdo de cada etapa (só leitura)
const CORPO = {
  dados: p => h('dl', { class: 'pf-dados' },
    linhaDado('Nome', p.nome), linhaDado('CPF', p.cpf), linhaDado('WhatsApp', formatarWhatsapp(p.whatsapp)),
    linhaDado('Nascimento', dataBR(p.data_nascimento)), linhaDado('Gênero', GENERO[p.genero] || '')),
  foto: (p, urls, vivo) => arquivo('foto', p, urls, vivo),
  video: (p, urls, vivo) => arquivo('video', p, urls, vivo),
  especialidades: p => p.especialidades.length
    ? h('ul', { class: 'pf-tags' }, ...p.especialidades.map(e => h('li', { text: e.nome })))
    : h('p', { class: 'pf-vazio', text: 'Nenhuma especialidade escolhida.' }),
  endereco: p => {
    const e = p.endereco;
    if (!e) return h('p', { class: 'pf-vazio', text: 'Endereço não informado.' });
    const temPino = Number.isFinite(p.lat) && Number.isFinite(p.lng);
    return h('div', {},
      h('dl', { class: 'pf-dados' },
        linhaDado('CEP', formatarCep(e.cep)), linhaDado('Rua', e.logradouro), linhaDado('Número', e.numero),
        linhaDado('Complemento', e.complemento), linhaDado('Bairro', e.bairro), linhaDado('Cidade', e.cidade && `${e.cidade}${e.uf ? ' / ' + e.uf : ''}`),
        linhaDado('Localização', temPino ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : '')),
      temPino ? h('a', { class: 'pf-link', href: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`, target: '_blank', rel: 'noopener noreferrer', text: 'Ver no mapa' }) : null);
  },
  pagamento: p => p.pagamento
    ? h('dl', { class: 'pf-dados' }, linhaDado('Tipo da chave', TIPO_PIX[p.pagamento.tipo] || p.pagamento.tipo), linhaDado('Chave Pix', p.pagamento.chave))
    : h('p', { class: 'pf-vazio', text: 'Dados de pagamento não informados.' }),
};

// Aprovar / reprovar (só aparece quando a etapa está em análise)
function decisao(p, etapa, aoDecidir) {
  const msgBox = h('div', { class: 'pf-msgs' });
  const aprovar = h('button', { type: 'button', class: 'pf-aprovar' }, icone('check'), ' Aprovar');
  const reprovar = h('button', { type: 'button', class: 'pf-reprovar' }, icone('x'), ' Reprovar');
  const campo = h('textarea', { class: 'pf-campo', rows: 3, maxlength: MOTIVO_MAX, placeholder: 'Explique o que precisa ser corrigido (de 5 a 300 caracteres)', 'aria-label': `Motivo da reprovação — ${etapa.titulo}` });
  const confirmar = h('button', { type: 'button', class: 'pf-reprovar cheio', text: 'Confirmar reprovação' });
  const cancelar = h('button', { type: 'button', class: 'pf-btn', text: 'Cancelar' });
  const formulario = h('div', { class: 'pf-fl', hidden: true }, h('label', { text: 'Motivo da reprovação' }), campo, h('div', { class: 'pf-linha' }, confirmar, cancelar));
  const botoes = [aprovar, reprovar, confirmar, cancelar];

  async function enviar(status) {
    if (status === 'reprovado') {
      const erro = validarMotivo(campo.value);
      if (erro) return msgBox.replaceChildren(msg(erro, 'neg'));
    }
    botoes.forEach(b => { b.disabled = true; });
    msgBox.replaceChildren(msg('Salvando…'));
    try { await aoDecidir(etapa.id, status, campo.value); }
    catch (e) { msgBox.replaceChildren(msg(e.message, 'neg')); botoes.forEach(b => { b.disabled = false; }); }
  }
  aprovar.onclick = () => enviar('aprovado');
  reprovar.onclick = () => { formulario.hidden = false; reprovar.hidden = true; aprovar.hidden = true; campo.focus(); };
  cancelar.onclick = () => { formulario.hidden = true; reprovar.hidden = false; aprovar.hidden = false; msgBox.replaceChildren(); };
  confirmar.onclick = () => enviar('reprovado');
  campo.oninput = () => { if (msgBox.firstChild) msgBox.replaceChildren(); };
  return h('div', { class: 'pf-decisao' }, h('div', { class: 'pf-linha' }, aprovar, reprovar), formulario, msgBox);
}

// Ficha inteira. `aoDecidir(topico, status, motivo)` devolve uma promessa; o módulo recarrega a ficha depois.
export function montarFicha(p, { urls, vivo, aoDecidir }) {
  return h('div', { class: 'pf-ficha' }, ...ETAPAS.map(et => {
    const t = p.topicos[et.id] || { status: 'pendente', motivo: '' };
    const corpo = [CORPO[et.id](p, urls, vivo)];
    if (t.status === 'reprovado' && t.motivo) corpo.push(msg('Motivo da reprovação: ' + limparMotivo(t.motivo), 'neg'));
    if (t.status === 'em_analise') corpo.push(decisao(p, et, aoDecidir));
    if (t.status === 'pendente') corpo.push(msg('O profissional ainda não enviou esta etapa.'));
    return h('section', { class: 'pf-secao ' + t.status },
      h('header', {}, icone(et.icone), h('h3', { text: et.titulo }), selo(SITUACAO[t.status] || SITUACAO.pendente)),
      ...corpo);
  }));
}
