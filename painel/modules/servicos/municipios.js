// modules/servicos/municipios.js — seletor de municípios da regra de preço (serviço e adicional)
import { MAX_MUNICIPIOS } from './actions-servico.js';
import { h, icone, norm } from './ui.js';

const MAX_VISIVEIS = 300;
const rotulo = r => `${r.cidade} (${r.uf})`;

// ctx: { $, obter() → rascunho, regioes() → lista, porIbge() → Map, ocupadas() → Map(ibge → nome da regra), msg(t), aoMudar() }
// Os dados vêm por função porque quem chama troca as listas ao recarregar.
export function criarMunicipios({ $, obter, regioes, porIbge, ocupadas, msg, aoMudar }) {
  // cadastrados e ativos (mais os já escolhidos), conforme busca e estado
  function filtrar() {
    const q = norm($('#sv-bq').value.trim()), u = $('#sv-bu').value, marcados = new Set(obter().ibge_ids);
    return regioes().filter(r => (r.ativo || marcados.has(r.ibge_id)) && (!u || r.uf === u) && (!q || norm(r.cidade).includes(q)))
      .sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt') || a.uf.localeCompare(b.uf));
  }

  function alternar(id, marcar) {
    const d = obter();
    if (marcar && d.ibge_ids.length >= MAX_MUNICIPIOS) { msg(`Máximo de ${MAX_MUNICIPIOS} municípios por regra.`); return false; }
    d.ibge_ids = marcar ? [...d.ibge_ids, id] : d.ibge_ids.filter(x => x !== id);
    msg(''); renderSelecionados(); aoMudar(); return true;
  }

  function renderSelecionados() {
    const ids = obter().ibge_ids, n = ids.length;
    $('#sv-nm').textContent = n ? `${n} selecionado${n > 1 ? 's' : ''}` : '';
    $('#sv-chips').replaceChildren(...(n
      ? ids.map(id => porIbge().get(id) ?? { ibge_id: id, cidade: `código ${id}`, uf: '' })
          .sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt'))
          .map(r => h('span', { class: 'sv-ch' }, r.uf ? rotulo(r) : r.cidade,
            h('button', { type: 'button', title: 'Remover', 'aria-label': 'Remover ' + r.cidade, onclick: () => { alternar(r.ibge_id, false); renderizar(); } }, icone('x'))))
      : [h('span', { class: 'sv-ch-vazio', text: 'Nenhum município selecionado.' })]));
  }

  function renderizar() {
    renderSelecionados();
    const lista = filtrar(), marcados = new Set(obter().ibge_ids), bloqueadas = ocupadas();
    const livres = lista.filter(r => !bloqueadas.has(r.ibge_id));
    $('#sv-todos').textContent = livres.length ? `Selecionar ${livres.length === lista.length ? 'todos' : 'os livres'} (${Math.min(livres.length, MAX_VISIVEIS)})` : '';
    $('#sv-todos').hidden = !livres.length;
    $('#sv-mun').replaceChildren(...(lista.length
      ? [...lista.slice(0, MAX_VISIVEIS).map(r => {
          const bloq = bloqueadas.has(r.ibge_id), cb = h('input', { type: 'checkbox', checked: marcados.has(r.ibge_id), disabled: bloq });
          cb.onchange = () => { if (!alternar(r.ibge_id, cb.checked)) cb.checked = false; };
          return h('li', {}, h('label', { class: bloq ? 'bloq' : '' }, cb,
            h('span', { class: 'mn-n', text: r.cidade }), h('small', { text: bloq ? `em “${bloqueadas.get(r.ibge_id)}”` : r.uf })));
        }), ...(lista.length > MAX_VISIVEIS ? [h('li', { class: 'mais', text: `Mostrando ${MAX_VISIVEIS} de ${lista.length}. Refine a busca.` })] : [])]
      : [h('li', { class: 'mais', text: regioes().length ? 'Nenhum município encontrado.' : 'Nenhum município cadastrado. Cadastre em Regiões.' })]));
  }

  // chame depois de montar o formulário da regra
  function ligar() {
    $('#sv-bu').replaceChildren(h('option', { value: '', text: 'Todos os estados' }),
      ...[...new Set(regioes().map(r => r.uf))].sort().map(u => h('option', { value: u, text: u })));
    $('#sv-bq').oninput = $('#sv-bu').onchange = renderizar;
    $('#sv-nenhum').onclick = () => { obter().ibge_ids = []; renderizar(); aoMudar(); };
    $('#sv-todos').onclick = () => {
      const d = obter(), bloqueadas = ocupadas();
      const alvo = filtrar().filter(r => !bloqueadas.has(r.ibge_id)).map(r => r.ibge_id);
      d.ibge_ids = [...new Set([...d.ibge_ids, ...alvo])].slice(0, MAX_MUNICIPIOS);
      renderizar(); aoMudar();
    };
    renderizar();
  }

  return { ligar, renderizar };
}
