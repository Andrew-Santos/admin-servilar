// js/login.js — interface da tela de login/cadastro (depende de auth.js)

// ── Formatação ───────────────────────────────────────────────────────────────
const Fmt = {
  titleCase: s => {
    const prep = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
    return (s || '').trim().toLowerCase().split(/\s+/)
      .map((w, i) => (i === 0 || !prep.has(w)) ? w.charAt(0).toUpperCase() + w.slice(1) : w)
      .join(' ');
  },
};
const $ = id => document.getElementById(id);

// ── Estado do fluxo de verificação ───────────────────────────────────────────
let fluxo = null;      // 'login' | 'cadastro'
let desafio = null;    // id devolvido pelo worker
let timerReenvio = null;
let lembrar = false;  // "manter conectado" marcado no login

// ── Abas ─────────────────────────────────────────────────────────────────────
function ativarPainel(nome, aba) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    const on = b.id === 'tab-' + aba;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on);
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + nome));
  ['login-alert', 'cad-alert', 'cad-success', 'codigo-alert'].forEach(hideAlert);
  document.querySelector('.form-body').scrollTo({ top: 0 });
}
function switchTab(t) { ativarPainel(t, t); }

// ── Máscaras ─────────────────────────────────────────────────────────────────
function mask(el, pat) {
  el.addEventListener('input', () => {
    const raw = el.value.replace(/\D/g, ''); let out = '', ri = 0;
    for (const c of pat) { if (ri >= raw.length) break; out += c === '#' ? raw[ri++] : c; }
    el.value = out;
  });
}
mask($('login-cpf'), '###.###.###-##');
mask($('cad-cpf'), '###.###.###-##');
mask($('whatsapp'), '(##) #####-####');
$('codigo').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });

// ── Já logado? ───────────────────────────────────────────────────────────────
// Só pula o login se o servidor confirmar que a sessão ainda existe
if (Auth.sessaoAtiva()) {
  Auth.validarSessao().then(admin => { if (admin) window.location.replace('painel/index.html'); });
}

// ── Validações / alertas ─────────────────────────────────────────────────────
function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let r = (s * 10) % 11; if (r >= 10) r = 0; if (r !== +cpf[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  r = (s * 10) % 11; if (r >= 10) r = 0; return r === +cpf[10];
}
function setErr(id, bad) { $(id)?.classList.toggle('err', bad); return bad; }
function showAlert(id, msg) {
  const el = $(id); el.classList.add('vis');
  if (msg) el.querySelector('span').textContent = msg;
}
function hideAlert(id) { $(id)?.classList.remove('vis'); }

// ── Tela do código ───────────────────────────────────────────────────────────
function mostrarCodigo(mensagem) {
  $('codigo-sub').textContent = mensagem;
  $('codigo').value = '';
  setErr('f-codigo', false);
  ativarPainel('codigo', null);
  iniciarContagemReenvio(60);
  $('codigo').focus();
}
function voltarCodigo() {
  desafio = null;
  clearInterval(timerReenvio);
  switchTab(fluxo === 'cadastro' ? 'cadastro' : 'login');
}
function iniciarContagemReenvio(seg) {
  const btn = $('btn-reenviar');
  clearInterval(timerReenvio);
  let resta = seg;
  btn.disabled = true;
  const tick = () => {
    if (resta <= 0) { clearInterval(timerReenvio); btn.disabled = false; btn.textContent = 'Reenviar código'; return; }
    btn.textContent = `Reenviar em ${resta--}s`;
  };
  tick();
  timerReenvio = setInterval(tick, 1000);
}

// ── Login (CPF → código no WhatsApp) ─────────────────────────────────────────
async function doLogin() {
  hideAlert('login-alert');
  const cpf = $('login-cpf').value;
  if (setErr('f-login-cpf', !validateCPF(cpf))) {
    showAlert('login-alert', 'Informe um CPF válido.');
    return;
  }

  const btn = $('btn-login');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner spin"></i> Enviando código…';

  let res;
  try { res = await Auth.iniciarLogin(cpf); }
  catch (e) { res = { ok: false, erro: 'Não foi possível conectar. Tente novamente.' }; }

  btn.disabled = false;
  btn.innerHTML = '<i class="ph ph-sign-in"></i> Entrar no painel';

  if (!res.ok) {
    showAlert('login-alert', res.erro || 'Não foi possível enviar o código.');
    return;
  }

  try {
    if ($('salvar-box').classList.contains('on')) localStorage.setItem(SAVED_KEY, cpf);
    else localStorage.removeItem(SAVED_KEY);
  } catch (_) {}

  fluxo = 'login';
  lembrar = $('salvar-box').classList.contains('on');
  desafio = res.desafio;
  mostrarCodigo('Se o CPF estiver autorizado, enviamos um código de 6 dígitos para o WhatsApp cadastrado.');
}

// ── Cadastro (dados → código no WhatsApp → só então grava) ───────────────────
async function doCadastro() {
  hideAlert('cad-alert'); hideAlert('cad-success');
  const val = id => $(id)?.value.trim() || '';
  let err = false;
  const E = (id, bad) => { if (setErr(id, bad)) err = true; };

  E('f-nome', val('nome').length < 2);
  E('f-sobrenome', val('sobrenome').length < 2);
  E('f-cpf', !validateCPF(val('cad-cpf')));
  E('f-whatsapp', val('whatsapp').replace(/\D/g, '').length !== 11);

  if (err) {
    showAlert('cad-alert', 'Preencha todos os campos corretamente (WhatsApp com DDD e 9 dígitos).');
    return;
  }

  const btn = $('btn-cadastrar');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner spin"></i> Enviando código…';

  const dados = {
    nome: (val('nome') + ' ' + val('sobrenome')).toUpperCase(),
    cpf: val('cad-cpf'),
    whatsapp: val('whatsapp'),
  };

  let res;
  try { res = await Auth.iniciarCadastro(dados); }
  catch (e) { res = { ok: false, erro: 'Não foi possível conectar. Tente novamente.' }; }

  btn.disabled = false;
  btn.innerHTML = '<i class="ph ph-user-check"></i> Enviar cadastro';

  if (!res.ok) {
    showAlert('cad-alert', res.erro || 'Erro ao iniciar o cadastro. Tente novamente.');
    return;
  }

  fluxo = 'cadastro';
  desafio = res.desafio;
  mostrarCodigo(`Enviamos um código de 6 dígitos para o WhatsApp ${res.destino}. Digite-o para confirmar o cadastro.`);
}

// ── Confirmar código ─────────────────────────────────────────────────────────
async function doVerificar() {
  hideAlert('codigo-alert');
  const codigo = $('codigo').value.trim();
  if (setErr('f-codigo', !/^\d{6}$/.test(codigo))) return;

  const btn = $('btn-codigo');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner spin"></i> Verificando…';

  let res;
  try { res = await Auth.verificar(desafio, codigo, fluxo === 'login' && lembrar); }
  catch (e) { res = { ok: false, erro: 'Não foi possível conectar. Tente novamente.' }; }

  if (!res.ok) {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-check"></i> Confirmar código';
    showAlert('codigo-alert', res.erro || 'Código inválido ou expirado.');
    return;
  }

  if (res.tipo === 'login') {
    btn.innerHTML = '<i class="ph ph-check"></i> Acesso liberado';
    setTimeout(() => { window.location.href = 'painel/index.html'; }, 600);
    return;
  }

  // Cadastro confirmado: volta para a aba de cadastro com a mensagem de sucesso
  btn.disabled = false;
  btn.innerHTML = '<i class="ph ph-check"></i> Confirmar código';
  ['nome', 'sobrenome', 'cad-cpf', 'whatsapp'].forEach(id => $(id).value = '');
  desafio = null;
  clearInterval(timerReenvio);
  switchTab('cadastro');
  $('cad-success').classList.add('vis');
}

async function doReenviar() {
  hideAlert('codigo-alert');
  let res;
  try { res = await Auth.reenviar(desafio); }
  catch (e) { res = { ok: false, erro: 'Não foi possível conectar. Tente novamente.' }; }
  if (res.ok) iniciarContagemReenvio(60);
  else showAlert('codigo-alert', res.erro || 'Não foi possível reenviar o código.');
}

// ── Lembrar CPF ──────────────────────────────────────────────────────────────
const SAVED_KEY = 'servilar_admin_cpf';
function toggleSalvar() {
  const on = $('salvar-box').classList.toggle('on');
  $('salvar-wrap').setAttribute('aria-checked', on);
}
$('salvar-wrap').addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleSalvar(); }
});
(function () {
  try {
    const cpf = localStorage.getItem(SAVED_KEY);
    if (cpf) { $('login-cpf').value = cpf; toggleSalvar(); }
  } catch (_) {}
})();

$('login-cpf').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
['nome', 'sobrenome', 'cad-cpf', 'whatsapp'].forEach(id =>
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') doCadastro(); }));
$('codigo').addEventListener('keydown', e => { if (e.key === 'Enter') doVerificar(); });