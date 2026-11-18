// modules/whatsapp/module.js — histórico do WhatsApp: conversas à esquerda, mensagens da conversa aberta à direita
import * as data from './data.js';
import { filtrarConversas, separarReacoes, validarPeriodo } from './actions.js';
import { cabecalho, fio, semConversa } from './ui-conversa.js';
import { lista } from './ui-lista.js';
import { liberarMidias } from './ui-midia.js';
import { h, icone, msg, trocar } from './ui.js';

let vivo = false, limpar = null;

export default {
  estilo: 'modules/whatsapp/style.css',
  desmontar() { vivo = false; limpar?.(); limpar = null; },

  async montar({ conteudo, filtros, Auth }) {
    limpar?.(); vivo = true; data.iniciar(Auth);

    // ── Filtros ──
    filtros.innerHTML = `
      <div class="wa-fl"><label for="wa-q">Buscar conversa</label><input id="wa-q" class="wa-campo" type="search" maxlength="60" autocomplete="off" placeholder="Nome ou telefone"></div>
      <div class="wa-fl"><label for="wa-de">Período: de</label><input id="wa-de" class="wa-campo" type="date"></div>
      <div class="wa-fl"><label for="wa-ate">Período: até</label><input id="wa-ate" class="wa-campo" type="date"></div>
      <div class="wa-fl"><label for="wa-st">Situação</label>
        <select id="wa-st" class="wa-campo"><option value="">Todas as conversas</option><option value="falha">Só com falha de envio</option></select></div>
      <div class="wa-fl"><label for="wa-or">Mensagens na conversa aberta</label>
        <select id="wa-or" class="wa-campo"><option value="">De todos</option><option value="cliente">Do cliente</option><option value="bot">Do bot</option><option value="humano">Do atendente</option><option value="sistema">Do sistema</option></select></div>`;
    const busca = filtros.querySelector('#wa-q'), de = filtros.querySelector('#wa-de'), ate = filtros.querySelector('#wa-ate');
    const situacao = filtros.querySelector('#wa-st'), origem = filtros.querySelector('#wa-or');

    // ── Estrutura: barra, cartões e painel de duas colunas ──
    const contador = h('b', { text: '0' }), sub = h('span', { class: 'wa-sub' });
    const atualizarBtn = h('button', { type: 'button', class: 'wa-btn' }, icone('arrows-clockwise'), ' Atualizar');
    const barra = h('div', { class: 'wa-bar' }, h('h2', { text: 'Conversas' }), contador, sub, atualizarBtn);
    const colLista = h('section', { class: 'wa-lista', 'aria-label': 'Conversas' });
    const colConv = h('section', { class: 'wa-conv', 'aria-label': 'Mensagens' });
    const painel = h('div', { class: 'wa-painel' }, colLista, colConv);
    trocar(conteudo, h('div', { class: 'wa' }, barra, painel));

    let conversas = [], carregou = false, truncado = false;
    let aberta = null, mensagens = [], temMais = false, seqLista = 0, seqConv = 0, temporizador = 0;
    let topo = h('div'), caixaFio = h('div', { class: 'wa-fio' }); // cabeçalho e área rolável da conversa

    const visiveis = () => filtrarConversas(conversas, { busca: busca.value, soFalhas: situacao.value === 'falha' });
    const dadosDaConversa = () => {
      const c = conversas.find(x => x.telefone === aberta);
      return { telefone: aberta, nome: c?.nome || mensagens.find(m => m.nome_perfil)?.nome_perfil || null };
    };

    // ── Lista de conversas ──
    function desenharLista() {
      if (!carregou) return;
      const vis = visiveis();
      contador.textContent = String(vis.length);
      sub.textContent = truncado ? 'Mostrando as 300 conversas mais recentes do período.' : '';
      trocar(colLista, lista({
        conversas: vis, atual: aberta, aoAbrir: abrirConversa,
        vazio: conversas.length ? 'Nenhuma conversa com esse filtro.' : 'Nenhuma mensagem no período.',
      }));
    }

    async function carregarLista() {
      const erro = validarPeriodo(de.value, ate.value);
      if (erro) return trocar(colLista, msg(erro, 'neg'));
      const eu = ++seqLista;
      try {
        const d = await data.listarConversas({ de: de.value, ate: ate.value });
        if (eu !== seqLista || !vivo) return;
        conversas = d.conversas; truncado = d.truncado; carregou = true;
      } catch (e) {
        if (eu === seqLista && vivo) trocar(colLista, msg(e.message, 'neg'), h('button', { type: 'button', class: 'wa-btn', text: 'Tentar de novo', onclick: carregarLista }));
        return;
      }
      desenharLista();
    }

    // ── Conversa aberta ──
    const perto = () => caixaFio.scrollHeight - caixaFio.scrollTop - caixaFio.clientHeight < 80;

    // modo: 'fim' rola até a última mensagem; 'manter' preserva a posição (usa a altura anterior)
    function desenharFio(modo, alturaAntes = 0) {
      const so = origem.value;
      const { normais, reacoes } = separarReacoes(mensagens); // reação vira selo na mensagem reagida
      const vis = so ? normais.filter(m => m.origem === so) : normais;
      const porWamid = new Map(mensagens.map(m => [m.wamid, m]));
      trocar(caixaFio, fio({
        mensagens: vis, porWamid, reacoes, temMais, aoMais: carregarMais,
        vazio: mensagens.length ? 'Nenhuma mensagem desse remetente entre as carregadas.' : 'Nenhuma mensagem nesta conversa.',
      }));
      caixaFio.scrollTop = modo === 'fim' ? caixaFio.scrollHeight : caixaFio.scrollHeight - alturaAntes;
    }

    function desenharTopo() {
      const novo = cabecalho({ ...dadosDaConversa(), total: mensagens.length, aoVoltar: fecharConversa });
      topo.replaceWith(novo); topo = novo;
    }

    function fecharConversa() {
      aberta = null; ++seqConv; liberarMidias(); painel.classList.remove('com-conversa');
      trocar(colConv, semConversa()); desenharLista();
    }

    // silencioso: recarrega sem piscar (botão Atualizar)
    async function abrirConversa(telefone, silencioso = false) {
      const eu = ++seqConv, mudou = telefone !== aberta;
      aberta = telefone; painel.classList.add('com-conversa');
      if (!silencioso || mudou) {
        mensagens = []; temMais = false; liberarMidias();
        topo = h('div'); caixaFio = h('div', { class: 'wa-fio' });
        trocar(colConv, topo, caixaFio); desenharTopo();
        trocar(caixaFio, h('p', { class: 'wa-info', role: 'status', text: 'Carregando…' }));
        desenharLista();
      }
      const noFim = silencioso && !mudou ? perto() : true;
      try {
        const d = await data.listarMensagens({ telefone });
        if (eu !== seqConv || !vivo) return;
        mensagens = d.mensagens; temMais = d.tem_mais;
      } catch (e) {
        if (eu === seqConv && vivo) trocar(caixaFio, msg(e.message, 'neg'), h('button', { type: 'button', class: 'wa-btn', text: 'Tentar de novo', onclick: () => abrirConversa(telefone) }));
        return;
      }
      desenharTopo(); desenharFio(noFim ? 'fim' : 'manter', caixaFio.scrollHeight - caixaFio.scrollTop);
    }

    async function carregarMais() {
      const eu = seqConv, antes = mensagens[0]?.id;
      if (!antes) return;
      const alturaAntes = caixaFio.scrollHeight - caixaFio.scrollTop; // distância até o fim, para não "pular" a rolagem
      try {
        const d = await data.listarMensagens({ telefone: aberta, antes });
        if (eu !== seqConv || !vivo) return;
        mensagens = [...d.mensagens, ...mensagens]; temMais = d.tem_mais;
      } catch (e) { console.error(e); return; }
      desenharTopo(); desenharFio('manter', alturaAntes);
    }

    // ── Eventos ──
    const recarregarPeriodo = () => { clearTimeout(temporizador); temporizador = setTimeout(carregarLista, 300); };
    busca.oninput = situacao.oninput = desenharLista;
    de.oninput = ate.oninput = recarregarPeriodo;
    origem.oninput = () => { if (aberta) desenharFio('fim'); };
    atualizarBtn.onclick = async () => {
      atualizarBtn.disabled = true;
      await Promise.all([carregarLista(), aberta ? abrirConversa(aberta, true) : null]);
      atualizarBtn.disabled = false;
    };
    limpar = () => {
      clearTimeout(temporizador); liberarMidias();
      busca.oninput = situacao.oninput = de.oninput = ate.oninput = origem.oninput = null;
    };

    trocar(colConv, semConversa());
    trocar(colLista, h('p', { class: 'wa-info', role: 'status', text: 'Carregando…' }));
    await carregarLista();
  },
};
