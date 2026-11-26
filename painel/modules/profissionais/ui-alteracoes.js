// modules/profissionais/ui-alteracoes.js — profissional já aprovado: pedidos de troca de foto/Pix para aprovar e histórico de alterações
// O dado atual continua valendo até o admin aprovar. ctx = { urls, vivo(), baixarAlteracao(altId), aoAmpliar, aoDecidirAlteracao(altId, status, motivo) }
import { STATUS_ALTERACAO, TOPICO_ALTERACAO, formatarData, formatarTamanho, formatarWhatsapp } from './actions.js';
import { decisao } from './ui-decisao.js';
import { h, icone, linhaDado, msg, selo, trocar } from './ui.js';

const TIPO_PIX = { cpf: 'CPF', telefone: 'Telefone', email: 'E-mail', aleatoria: 'Chave aleatória' };
const COR = { aprovado: 'ok', reprovado: 'neg', cancelado: '' };

function fotoNova(p, ped, ctx) {
  const caixa = h('div', { class: 'pf-foto-caixa' });
  async function carregar() {
    trocar(caixa, h('p', { class: 'pf-info', role: 'status', text: 'Carregando foto nova…' }));
    try {
      const url = URL.createObjectURL(await ctx.baixarAlteracao(ped.id));
      if (!ctx.vivo()) return URL.revokeObjectURL(url);
      ctx.urls.push(url);
      const alt = `Nova foto de perfil de ${p.nome}`;
      trocar(caixa, h('img', { class: 'pf-foto', src: url, alt }),
        h('button', { type: 'button', class: 'pf-ampliar', 'aria-label': 'Ampliar foto nova', onclick: () => ctx.aoAmpliar(url, alt) }, icone('arrows-out'), ' Ampliar'));
    } catch (e) {
      if (ctx.vivo()) trocar(caixa, msg(e.message, 'neg'), h('button', { type: 'button', class: 'pf-btn', text: 'Tentar de novo', onclick: carregar }));
    }
  }
  carregar();
  return h('div', {}, caixa, h('p', { class: 'pf-info', text: `Foto nova · ${formatarTamanho(ped.nova.tamanho)}. A foto atual (na coluna da esquerda) continua valendo até a aprovação.` }));
}

const pixNovo = ped => h('dl', { class: 'pf-dados' },
  linhaDado('Chave atual', ped.atual ? `${TIPO_PIX[ped.atual.tipo] || ped.atual.tipo}: ${ped.atual.chave}` : 'Nenhuma'),
  linhaDado('Chave nova', `${TIPO_PIX[ped.nova.tipo] || ped.nova.tipo}: ${ped.nova.chave}`));

function pedido(p, ped, ctx) {
  const et = { id: ped.id, titulo: TOPICO_ALTERACAO[ped.topico] };
  return h('section', { class: 'pf-secao em_analise' },
    h('header', {}, icone(ped.topico === 'foto' ? 'camera' : 'bank'), h('h3', { text: `Nova ${et.titulo.toLowerCase()} — pedido de alteração` }), selo({ texto: 'Em análise', cor: 'aguarda' })),
    h('p', { class: 'pf-info', text: `Pedido enviado em ${formatarData(ped.criado_em)}.` }),
    ped.topico === 'foto' ? fotoNova(p, ped, ctx) : pixNovo(ped),
    p.status === 'ativo' ? decisao(et, ctx.aoDecidirAlteracao) : msg('Decisão indisponível: o profissional não está ativo.'));
}

function linhaHistorico(x) {
  const detalhe = x.topico === 'whatsapp'
    ? `de ${formatarWhatsapp(x.de) || '—'} para ${formatarWhatsapp(x.para) || '—'} (confirmado por código)`
    : [STATUS_ALTERACAO[x.status] || x.status, x.por && x.por !== 'parceiro' ? `por ${x.por}` : x.por === 'parceiro' ? 'pelo profissional' : '', x.motivo && `motivo: ${x.motivo}`].filter(Boolean).join(' · ');
  return h('li', {}, h('strong', { text: TOPICO_ALTERACAO[x.topico] || x.topico }), ` — ${detalhe} `,
    h('small', { class: 'pf-info', text: formatarData(x.decidido_em || x.criado_em) }));
}

// Devolve uma lista de blocos (vazia se não houver nada) para entrar no topo das seções da ficha
export function blocosAlteracoes(p, ctx) {
  const a = p.alteracoes;
  if (!a) return [];
  const blocos = a.pendentes.map(ped => pedido(p, ped, ctx));
  if (a.historico.length) {
    blocos.push(h('section', { class: 'pf-secao' },
      h('header', {}, icone('clock-counter-clockwise'), h('h3', { text: 'Histórico de alterações' })),
      h('ul', { class: 'pf-hist' }, ...a.historico.map(linhaHistorico))));
  }
  return blocos;
}
