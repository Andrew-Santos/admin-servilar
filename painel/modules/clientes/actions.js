// modules/clientes/actions.js — formatações e regras de tela. Módulo só de consulta: nada aqui altera dados.

export const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Formatações ──
export const formatarWhatsapp = s => {
  const d = String(s || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : String(s || '');
};
export const formatarCpf = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d; };
export const formatarCep = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
export const formatarData = iso => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
export const formatarDia = iso => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
};
export const rotuloCidade = i => (i.cidade ? (i.uf ? `${i.cidade} / ${i.uf}` : i.cidade) : '');
export const urlWhatsapp = s => { const d = String(s || '').replace(/\D/g, ''); return d ? `https://wa.me/${d}` : ''; };
export const inicial = nome => (nome || '').trim().charAt(0).toUpperCase() || '?';

// ── Endereço ──
// Uma linha só: "R fenícia, 11 · Novo oratório · Santo André / SP"
export const resumoEndereco = e => [
  [e.logradouro, e.numero].filter(Boolean).join(', '),
  e.bairro,
  e.cidade && (e.uf ? `${e.cidade} / ${e.uf}` : e.cidade),
].filter(Boolean).join(' · ');

const temPino = e => typeof e.lat === 'number' && typeof e.lng === 'number';
export const textoPino = e => (temPino(e) ? `${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}` : '');
// Abre no Google Maps (sem chave): pelo ponto exato, ou pelo texto do endereço se não houver ponto. '' = não dá para localizar.
export function urlGoogleMaps(e) {
  const base = 'https://www.google.com/maps/search/?api=1&query=';
  if (temPino(e)) return `${base}${e.lat},${e.lng}`;
  if (!e.cidade) return '';
  return base + encodeURIComponent([e.logradouro, e.numero, e.bairro, e.cidade, e.uf].filter(Boolean).join(', '));
}

// ── Filtros e resumo ──
export const FILTROS_DADOS = [
  { id: 'completo', texto: 'Cadastro completo', vale: i => !!(i.nome && i.cpf && i.qtd_enderecos) },
  { id: 'sem_nome', texto: 'Sem nome', vale: i => !i.nome },
  { id: 'sem_cpf', texto: 'Sem CPF', vale: i => !i.cpf },
  { id: 'sem_endereco', texto: 'Sem endereço', vale: i => !i.qtd_enderecos },
];
export const cadastroCompleto = i => FILTROS_DADOS[0].vale(i);
// Cor do pino no mapa e texto da legenda
export const COR_MAPA = { completo: { cor: '#2F9C95', texto: 'Cadastro completo' }, incompleto: { cor: '#E3732D', texto: 'Cadastro incompleto' } };
export const passaFiltroDados = (i, filtro) => !filtro || !!FILTROS_DADOS.find(f => f.id === filtro)?.vale(i);

// Busca por nome, ou por pedaço do WhatsApp / CPF (só quando há dígitos na busca)
export function passaBusca(i, busca) {
  const q = norm(busca.trim());
  if (!q) return true;
  const dig = q.replace(/\D/g, '');
  return norm(i.nome).includes(q) || (dig.length >= 3 && (i.whatsapp.includes(dig) || i.cpf.includes(dig)));
}

export const DIAS_NOVO = 7;
export const diasDesde = iso => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86400000));
};
export function resumoClientes(itens) {
  return {
    total: itens.length,
    novos: itens.filter(i => (diasDesde(i.criado_em) ?? Infinity) < DIAS_NOVO).length,
    semEndereco: itens.filter(i => !i.qtd_enderecos).length,
  };
}

// ── Ordenação ──
const CHAVES = {
  nome: i => i.nome || '',
  cidade: i => rotuloCidade(i),
  cadastro: i => Date.parse(i.criado_em) || 0,
};
// Ordena sem mexer na lista original. ordem = { col, dir: 'asc' | 'desc' }
export function ordenar(itens, { col, dir }) {
  const chave = CHAVES[col] || CHAVES.nome, f = dir === 'desc' ? -1 : 1;
  return [...itens].sort((a, b) => {
    const x = chave(a), y = chave(b);
    if (typeof x === 'string' && !x !== !y) return x ? -1 : 1; // texto vazio (sem nome, sem cidade) fica sempre no fim
    const c = typeof x === 'string' ? x.localeCompare(y, 'pt') : x - y;
    return (c || a.id - b.id) * f;
  });
}
