// modules/treinar-ia/ui-chat.js — o chat de treino.
// Duas abas na mesma conversa:
//   Treinar → você fala com o TREINADOR ("quando o cliente disser X, responda Y") e ele atualiza as tabelas sozinho.
//   Testar  → você faz o papel de CLIENTE e o Seu Serverino responde de verdade (nada é enviado no WhatsApp).
import * as data from './data.js';
import { h, icone, trocar, toast, quando, corta, ROTULO_TABELA, ROTULO_CHAVE, ROTULO_ACAO, tituloDoRegistro } from './ui.js';

const MOMENTOS = { identificar: 'Ainda sem CPF', sem_endereco: 'Falta o endereço', atender: 'Cadastro e endereço prontos' };

const SUGESTOES = [
  'Mostre as regras que o Seu Serverino segue no atendimento completo.',
  'Quando o cliente disser que errou o CEP, responda só "Sem problema!" e peça o CEP certo.',
  'Veja a conversa do número ',
  'Cadastre no conhecimento: ',
];

export function montarChat({ corpo, filtros, aoMudarRegras }) {
  let vivo = true;
  const E = { sessoes: [], sessao: null, msgs: [], canal: 'treinar', enviando: false, mudancas: [] };

  // ── Estrutura ──
  const lista = h('div', { class: 'ti-sessoes' });
  const cabeca = h('div', { class: 'ti-cabeca' });
  const fio = h('div', { class: 'ti-fio', role: 'log', 'aria-live': 'polite' });
  const campo = h('textarea', { class: 'ti-campo', rows: '2', maxlength: '4000' });
  const enviarBtn = h('button', { type: 'button', class: 'ti-enviar', 'aria-label': 'Enviar' }, icone('paper-plane-tilt'));
  const compor = h('div', { class: 'ti-compor' }, campo, enviarBtn);
  const mudancas = h('div', { class: 'ti-mudancas' });
  const lado = h('aside', { class: 'ti-lado', 'aria-label': 'Alterações desta conversa' }, h('h3', { text: 'O que mudou nesta conversa' }), mudancas);
  trocar(corpo, h('div', { class: 'ti-chat' }, h('section', { class: 'ti-conv' }, cabeca, fio, compor), lado));

  const novaBtn = h('button', { type: 'button', class: 'ti-btn ti-btn-cheio', onclick: () => novaConversa() }, icone('plus'), ' Nova conversa');
  trocar(filtros, h('div', { class: 'ti-fl' }, novaBtn, h('p', { class: 'ti-fl-tit', text: 'Conversas de treino' }), lista));

  // ── Lista de conversas (painel da esquerda) ──
  function desenharLista() {
    trocar(lista, E.sessoes.map(s => {
      const abrir = h('button', { type: 'button', class: 'ti-sessao-bt', onclick: () => abrirSessao(s.id) },
        h('span', { class: 'ti-sessao-t', text: s.titulo }), h('small', { text: quando(s.atualizado_em) }));
      const apagar = h('button', { type: 'button', class: 'btn-ico ti-apagar', title: 'Apagar conversa', 'aria-label': 'Apagar conversa ' + s.titulo, onclick: () => apagarSessao(s) }, icone('trash'));
      return h('div', { class: 'ti-sessao' + (s.id === E.sessao?.id ? ' ativa' : '') }, abrir, apagar);
    }));
  }

  // ── Cabeçalho: aba Treinar/Testar e, no teste, o momento da conversa ──
  function desenharCabeca() {
    const aba = (id, rotulo, ic) => h('button', { type: 'button', class: 'ti-canal' + (E.canal === id ? ' ativo' : ''), 'aria-pressed': String(E.canal === id), onclick: () => trocarCanal(id) }, icone(ic), ' ' + rotulo);
    const partes = [h('div', { class: 'ti-canais' }, aba('treinar', 'Treinar', 'chalkboard-teacher'), aba('testar', 'Testar', 'chat-circle-dots'))];
    if (E.canal === 'testar' && E.sessao) {
      const ctx = E.sessao.contexto || {};
      const sel = h('select', { class: 'ti-mini', 'aria-label': 'Momento da conversa', onchange: () => salvarContexto() },
        Object.entries(MOMENTOS).map(([v, t]) => h('option', { value: v, text: t, selected: (ctx.modo || 'atender') === v })));
      const cupom = h('input', { class: 'ti-mini ti-mini-cupom', type: 'text', maxlength: '30', placeholder: 'Cupom aplicado (opcional)', 'aria-label': 'Cupom aplicado', value: ctx.cupom || '', onchange: () => salvarContexto() });
      const zerar = h('button', { type: 'button', class: 'ti-btn', title: 'Apaga só as mensagens do teste', onclick: zerarTeste }, icone('arrow-counter-clockwise'), ' Recomeçar teste');
      cabeca._sel = sel; cabeca._cupom = cupom;
      partes.push(h('div', { class: 'ti-opcoes' }, sel, cupom, zerar));
    }
    trocar(cabeca, partes);
  }

  async function salvarContexto() {
    if (!E.sessao) return;
    try { E.sessao = await data.ajustarSessao(E.sessao.id, { contexto: { modo: cabeca._sel.value, cupom: cabeca._cupom.value.trim() || null } }); }
    catch (e) { toast(e.message, 'neg'); }
  }

  async function zerarTeste() {
    if (!E.sessao || E.enviando) return;
    try { await data.zerarTeste(E.sessao.id); E.msgs = E.msgs.filter(m => m.canal !== 'testar'); desenharFio(); }
    catch (e) { toast(e.message, 'neg'); }
  }

  const pintarCampo = () => {
    campo.placeholder = E.canal === 'treinar'
      ? 'Diga o que a IA deve aprender ou corrigir… (Enter envia, Shift+Enter quebra a linha)'
      : 'Escreva como se fosse o cliente… (Enter envia)';
  };
  function trocarCanal(c) {
    if (E.canal === c) return;
    E.canal = c; pintarCampo(); desenharCabeca(); desenharFio();
    campo.focus();
  }

  // ── Mensagens ──
  const bolhaUsuario = m => h('div', { class: 'ti-linha eu' }, h('div', { class: 'ti-bolha eu' }, h('span', { class: 'ti-quem', text: E.canal === 'testar' ? 'Você (cliente)' : 'Você' }), m.texto));

  function bolhaTestar(m) {
    const passos = m.detalhes?.passos ?? [];
    const avisos = passos.flatMap(p => p.avisos ?? []);
    const corrigir = h('button', { type: 'button', class: 'ti-corrigir', title: 'Levar esta resposta para o Treinador corrigir', onclick: () => {
      trocarCanal('treinar');
      campo.value = `Esta resposta do Seu Serverino ficou ruim: "${corta(m.texto || passos.map(p => p.ferramenta).join(', '), 220)}"\nO certo seria: `;
      campo.focus(); campo.setSelectionRange(campo.value.length, campo.value.length);
    } }, icone('thumbs-down'), ' Corrigir');
    return h('div', { class: 'ti-linha' }, h('div', { class: 'ti-bolha ia' },
      h('span', { class: 'ti-quem', text: 'Seu Serverino' }),
      m.texto ? h('div', { class: 'ti-texto', text: m.texto }) : h('div', { class: 'ti-texto ti-mudo', text: passos.length ? 'Não escreveu nada: chamou uma ferramenta e o sistema responderia a partir dela.' : '(sem resposta)' }),
      passos.map(p => h('details', { class: 'ti-ferr' }, h('summary', {}, icone('wrench'), ' ' + p.ferramenta), h('pre', { text: JSON.stringify(p.entrada ?? {}, null, 2) }))),
      avisos.length ? h('ul', { class: 'ti-avisos' }, avisos.map(a => h('li', {}, icone('warning'), ' ' + a))) : null,
      h('div', { class: 'ti-rodape' }, h('small', { text: m.detalhes?.tokens?.entrada ? `${m.detalhes.tokens.entrada} tokens` : '' }), corrigir)));
  }

  function bolhaTreinador(m) {
    const alt = m.detalhes?.alteracoes ?? [];
    return h('div', { class: 'ti-linha' }, h('div', { class: 'ti-bolha ia' },
      h('span', { class: 'ti-quem', text: 'Treinador' }),
      h('div', { class: 'ti-texto', text: m.texto }),
      alt.length ? h('div', { class: 'ti-chips' }, alt.map(a => h('span', { class: 'ti-chip ' + a.acao }, icone(a.acao === 'criar' ? 'plus-circle' : 'pencil-simple'), ` ${ROTULO_CHAVE[a.tabela] || a.tabela} · ${a.titulo}`))) : null));
  }

  function vazio() {
    if (E.canal === 'testar') {
      return h('div', { class: 'ti-vazio' }, icone('chat-circle-dots'),
        h('p', { class: 'ti-vazio-t', text: 'Converse com o Seu Serverino como se fosse o cliente' }),
        h('p', { text: 'Ele responde de verdade, com as regras de hoje. Nada é enviado no WhatsApp e nenhum pedido é criado. CPF, endereço, preços e pagamento são do sistema e não entram no teste: aqui só a conversa.' }),
        h('p', { text: 'Quando uma resposta não agradar, toque em "Corrigir" nela.' }));
    }
    return h('div', { class: 'ti-vazio' }, icone('chalkboard-teacher'),
      h('p', { class: 'ti-vazio-t', text: 'Ensine o Seu Serverino conversando' }),
      h('p', { text: 'Diga o que ele fez de errado ou o que deve passar a fazer. O Treinador atualiza as regras, testa e mostra o que mudou ao lado (dá para desfazer).' }),
      h('div', { class: 'ti-sug' }, SUGESTOES.map(t => h('button', { type: 'button', onclick: () => { campo.value = t; campo.focus(); campo.setSelectionRange(t.length, t.length); } }, t))));
  }

  function desenharFio() {
    const ms = E.msgs.filter(m => m.canal === E.canal);
    if (!ms.length && !E.enviando) return trocar(fio, vazio());
    trocar(fio, ms.map(m => m.papel === 'user' ? bolhaUsuario(m) : (E.canal === 'testar' ? bolhaTestar(m) : bolhaTreinador(m))),
      E.enviando ? h('div', { class: 'ti-linha' }, h('div', { class: 'ti-bolha ia ti-pensando', 'aria-label': 'Pensando' }, h('span'), h('span'), h('span'))) : null);
    fio.scrollTop = fio.scrollHeight;
  }

  // ── Alterações feitas nesta conversa (com desfazer) ──
  const CAMPOS = { titulo: 'título', conteudo: 'texto', modo: 'momento', ativo: 'ativo', prioridade: 'ordem', pergunta: 'pergunta', resposta: 'resposta', situacao: 'situação', observacao: 'observação', descricao: 'descrição', categoria: 'categoria', conversa: 'conversa', condicao: 'condição' };
  const valor = v => v === true ? 'sim' : v === false ? 'não' : v == null ? '—' : typeof v === 'object' ? `${v.length ?? ''} falas` : corta(v, 140);

  function cartaoMudanca(x) {
    const desfeito = x.revertido || x.acao === 'reverter';
    const det = x.acao === 'editar' ? Object.keys(x.depois || {}).map(k => h('li', {}, h('b', { text: (CAMPOS[k] || k) + ': ' }), h('span', { class: 'ti-antes', text: valor(x.antes?.[k]) }), ' → ', h('span', { text: valor(x.depois[k]) }))) : [];
    return h('div', { class: 'ti-mud' + (desfeito ? ' desfeita' : '') },
      h('div', { class: 'ti-mud-t' }, h('span', { class: 'ti-chip ' + x.acao, text: ROTULO_ACAO[x.acao] || x.acao }), ` ${ROTULO_TABELA[x.tabela] || x.tabela}: `, h('b', { text: corta(tituloDoRegistro(x), 70) })),
      det.length ? h('ul', { class: 'ti-det' }, det) : null,
      x.motivo ? h('p', { class: 'ti-motivo', text: x.motivo }) : null,
      h('div', { class: 'ti-mud-r' }, h('small', { text: `${quando(x.criado_em)} · ${x.autor.startsWith('treinador') ? 'Treinador' : 'você'}` }),
        !desfeito ? h('button', { type: 'button', class: 'ti-desfazer', onclick: () => desfazer(x) }, icone('arrow-u-up-left'), ' Desfazer') : h('small', { text: x.acao === 'reverter' ? 'desfazimento' : 'desfeita' })));
  }

  function desenharMudancas() {
    trocar(mudancas, E.mudancas.length ? E.mudancas.map(cartaoMudanca) : h('p', { class: 'ti-info', text: 'Nada alterado por enquanto. Quando o Treinador criar ou editar uma regra, aparece aqui.' }));
  }

  async function recarregarMudancas() {
    if (!E.sessao) return;
    const id = E.sessao.id;
    try { const l = await data.historico(id); if (vivo && E.sessao?.id === id) { E.mudancas = l; desenharMudancas(); } } catch (_) { /* some só do painel */ }
  }

  async function desfazer(x) {
    try { await data.reverter(x.id); toast('Desfeito.'); aoMudarRegras(); await recarregarMudancas(); }
    catch (e) { toast(e.message, 'neg'); }
  }

  // ── Conversas ──
  async function abrirSessao(id) {
    if (E.enviando) return;
    try {
      const d = await data.mensagens(id);
      if (!vivo) return;
      E.sessao = d.sessao; E.msgs = d.mensagens; E.mudancas = [];
    } catch (e) { return toast(e.message, 'neg'); }
    desenharLista(); desenharCabeca(); desenharFio(); desenharMudancas(); recarregarMudancas();
    document.getElementById('app')?.classList.remove('fl-open');
  }

  async function novaConversa() {
    if (E.enviando) return;
    try {
      const s = await data.novaSessao({ modo: 'atender' });
      E.sessoes.unshift(s);
      await abrirSessao(s.id);
      campo.focus();
    } catch (e) { toast(e.message, 'neg'); }
  }

  async function apagarSessao(s) {
    if (E.enviando || !confirm(`Apagar a conversa "${s.titulo}"? As regras criadas por ela continuam valendo (ficam no Histórico).`)) return;
    try {
      await data.apagarSessao(s.id);
      E.sessoes = E.sessoes.filter(x => x.id !== s.id);
      if (E.sessao?.id === s.id) E.sessao = null;
      if (E.sessoes.length) await abrirSessao(E.sessoes[0].id); else await novaConversa();
    } catch (e) { toast(e.message, 'neg'); }
  }

  // ── Envio ──
  async function enviar() {
    const texto = campo.value.trim();
    if (!texto || E.enviando || !E.sessao) return;
    const canal = E.canal, id = E.sessao.id;
    E.enviando = true; enviarBtn.disabled = campo.disabled = true;
    const otimista = { canal, papel: 'user', texto, id: 'tmp' };
    E.msgs.push(otimista); campo.value = ''; desenharFio();
    try {
      const novas = await (canal === 'testar' ? data.testar : data.treinar)(id, texto);
      if (!vivo || E.sessao?.id !== id) return;
      E.msgs = E.msgs.filter(m => m !== otimista).concat(novas);
      if (canal === 'treinar' && novas.at(-1)?.detalhes?.alteracoes?.length) { aoMudarRegras(); recarregarMudancas(); }
      const s = E.sessoes.find(x => x.id === id);
      if (s) { s.atualizado_em = new Date().toISOString(); if (s.titulo === 'Nova conversa') s.titulo = corta(texto, 50); desenharLista(); }
    } catch (e) {
      if (!vivo) return;
      E.msgs = E.msgs.filter(m => m !== otimista); campo.value = texto;   // devolve o texto: nada se perde
      toast(e.message, 'neg');
    } finally {
      if (vivo) { E.enviando = false; enviarBtn.disabled = campo.disabled = false; desenharFio(); campo.focus(); }
    }
  }

  enviarBtn.onclick = enviar;
  campo.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(); } };

  // ── Início ──
  pintarCampo(); desenharCabeca(); desenharFio();
  (async () => {
    try {
      E.sessoes = await data.sessoes();
      if (!vivo) return;
      desenharLista();
      if (E.sessoes.length) await abrirSessao(E.sessoes[0].id); else await novaConversa();
    } catch (e) { trocar(fio, h('p', { class: 'ti-erro', role: 'alert', text: e.message })); }
  })();

  return () => { vivo = false; };
}
