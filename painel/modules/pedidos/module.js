// modules/pedidos/module.js — Pedidos: tabela paginada com filtros; clicar num pedido abre o detalhe em janela (onde se altera o status).
import * as data from './data.js';
import { STATUS, infoStatus } from './actions.js';
import { abrirPedido } from './module-detalhe.js';
import { tabela } from './ui-tabela.js';
import { h, icone, msg, plural, trocar } from './ui.js';

let vivo = false, limpar = null;
const POR_PAGINA = 25;

export default {
  estilo: 'modules/pedidos/style.css',
  desmontar() {
    vivo = false; limpar?.(); limpar = null;
    document.querySelectorAll('dialog.pd-janela').forEach(d => d.close());
  },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);

    // ── Filtros (o servidor filtra e pagina) ──
    filtros.innerHTML = `
      <div class="pd-fl"><label for="pd-q">Buscar</label><input id="pd-q" class="pd-campo" type="search" maxlength="60" autocomplete="off" placeholder="Nº do pedido, telefone ou cliente"></div>
      <div class="pd-fl"><label for="pd-st">Status</label>
        <select id="pd-st" class="pd-campo"><option value="">Todos</option>${Object.keys(STATUS).map(s => `<option value="${s}">${STATUS[s].texto}</option>`).join('')}</select></div>`;
    const busca = filtros.querySelector('#pd-q'), status = filtros.querySelector('#pd-st');

    // ── Estrutura: barra, tabela e rodapé de paginação ──
    const contador = h('b', { text: '0' }), sub = h('span', { class: 'pd-sub' });
    const painel = h('div', { class: 'pd-painel' });
    const rodape = h('div', { class: 'pd-rodape' });
    const recarregar = h('button', { type: 'button', class: 'pd-btn', title: 'Atualizar lista' }, icone('arrow-clockwise'), ' Atualizar');
    trocar(conteudo, h('div', { class: 'pd' }, h('div', { class: 'pd-bar' }, h('h2', { text: 'Pedidos' }), contador, sub, h('div', { class: 'pd-bar-dir' }, recarregar)), painel, rodape));

    let itens = [], total = 0, pagina = 1, seq = 0, timer = null;

    const abrir = id => { const p = itens.find(i => i.id === id); abrirPedido({ id, numero: p?.numero || id, aoStatus }); };

    // Troca de status feita na janela: atualiza a linha aqui (se o filtro de status deixar de combinar, a linha some no próximo "Atualizar")
    function aoStatus(id, r) {
      const p = itens.find(i => i.id === id);
      if (!p) return;
      p.status = r.status; if (r.atualizado_em) p.atualizado_em = r.atualizado_em;
      desenhar();
    }

    function desenhar() {
      const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
      contador.textContent = String(total);
      sub.textContent = status.value ? infoStatus(status.value).texto : '';
      trocar(painel, tabela({ itens, aoAbrir: abrir, vazio: busca.value.trim() || status.value ? 'Nenhum pedido com esses filtros.' : 'Nenhum pedido ainda. Eles aparecem aqui quando o cliente fecha o atendimento pelo WhatsApp.' }));
      const ant = h('button', { type: 'button', class: 'pd-btn', disabled: pagina <= 1, 'aria-label': 'Página anterior', onclick: () => carregar(pagina - 1) }, icone('caret-left'));
      const prox = h('button', { type: 'button', class: 'pd-btn', disabled: pagina >= paginas, 'aria-label': 'Próxima página', onclick: () => carregar(pagina + 1) }, icone('caret-right'));
      trocar(rodape, total ? [h('span', { class: 'pd-sub', text: `${plural(total, 'pedido', 'pedidos')} · página ${pagina} de ${paginas}` }), ant, prox] : null);
    }

    async function carregar(p = 1) {
      const minha = ++seq;
      trocar(painel, h('p', { class: 'pd-info', role: 'status', text: 'Carregando…' }));
      try {
        const r = await data.listar({ status: status.value, q: busca.value.trim(), pagina: p, limite: POR_PAGINA });
        if (!vivo || minha !== seq) return;       // saiu do módulo ou já pediu outra coisa
        ({ itens, total } = r); pagina = r.pagina;
      } catch (e) {
        if (vivo && minha === seq) trocar(painel, msg(e.message, 'neg'), h('button', { type: 'button', class: 'pd-btn', text: 'Tentar de novo', onclick: () => carregar(p) }));
        return;
      }
      desenhar();
    }

    busca.oninput = () => { clearTimeout(timer); timer = setTimeout(() => carregar(1), 350); };   // espera parar de digitar
    status.oninput = () => carregar(1);
    recarregar.onclick = () => carregar(pagina);
    limpar = () => { clearTimeout(timer); busca.oninput = status.oninput = null; };
    await carregar(1);
  },
};
