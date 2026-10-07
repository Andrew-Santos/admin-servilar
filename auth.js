// js/auth.js — cliente do worker servilar-auth-waba (usado por login.html e index.html)
// O navegador NÃO fala com o Supabase: tudo passa pelo worker.
const AUTH_API = 'https://servilar-auth-waba.andrewmssantos.workers.dev'; // troque pela URL do seu worker

const Auth = (() => {
  const TOKEN_KEY = 'servilar_admin_token';
  const EXPIRA_KEY = 'servilar_admin_expira';

  async function chamar(caminho, { metodo = 'POST', corpo, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(AUTH_API + caminho, {
      method: metodo,
      headers,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    let dados = {};
    try { dados = await res.json(); } catch (_) {}
    return { ...dados, ok: res.ok && dados.ok !== false, status: res.status };
  }

  // "Manter conectado" -> localStorage (sobrevive ao fechar o navegador).
  // Sem marcar -> sessionStorage (some ao fechar a aba/janela).
  function guardarSessao(token, expira, lembrar) {
    limparSessao();
    try {
      const store = lembrar ? localStorage : sessionStorage;
      store.setItem(TOKEN_KEY, token);
      store.setItem(EXPIRA_KEY, String(expira));
    } catch (_) {}
  }
  function limparSessao() {
    for (const store of [localStorage, sessionStorage]) {
      try { store.removeItem(TOKEN_KEY); store.removeItem(EXPIRA_KEY); } catch (_) {}
    }
  }
  function lerSessao() {
    for (const store of [sessionStorage, localStorage]) {
      try {
        const t = store.getItem(TOKEN_KEY);
        if (t) return { token: t, expira: Number(store.getItem(EXPIRA_KEY)) };
      } catch (_) {}
    }
    return null;
  }
  function token() { return lerSessao()?.token || null; }

  return {
    // Passo 1 do login: envia o código para o WhatsApp do admin
    iniciarLogin: cpf => chamar('/login/iniciar', { corpo: { cpf } }),
    // Passo 1 do cadastro: envia o código para o WhatsApp informado (nada é gravado ainda)
    iniciarCadastro: dados => chamar('/cadastro/iniciar', { corpo: dados }),
    reenviar: desafio => chamar('/reenviar', { corpo: { desafio } }),

    // Passo 2 (comum): confirma o código. No login, devolve a sessão.
    async verificar(desafio, codigo, lembrar = false) {
      const r = await chamar('/verificar', { corpo: { desafio, codigo, lembrar } });
      if (r.ok && r.tipo === 'login') guardarSessao(r.token, r.expira, lembrar);
      return r;
    },

    // Checagem rápida (só local) usada para pular o login
    sessaoAtiva() {
      const s = lerSessao();
      return !!s && s.expira > Date.now();
    },

    // Confere a sessão NO SERVIDOR. Devolve o admin ou null (e apaga a sessão local se inválida)
    async validarSessao() {
      const t = token();
      if (!t) return null;
      let r;
      try { r = await chamar('/sessao', { metodo: 'GET', token: t }); }
      catch (_) { return null; } // sem rede: não apaga
      if (!r.ok) { limparSessao(); return null; }
      return r.admin;
    },

    // Chame no topo do index.html: valida no servidor e redireciona se inválida
    async exigirSessao(destino = '../login.html') {
      const t = token();
      if (!t) { window.location.replace(destino); return null; }
      let r;
      try { r = await chamar('/sessao', { metodo: 'GET', token: t }); }
      catch (_) { return null; } // sem rede: não desloga
      if (!r.ok) { limparSessao(); window.location.replace(destino); return null; }
      return r.admin; // { nome, master }
    },

    async sair(destino = '../login.html') {
      const t = token();
      if (t) { try { await chamar('/logout', { token: t }); } catch (_) {} }
      limparSessao();
      window.location.replace(destino);
    },

    token,
  };
})();