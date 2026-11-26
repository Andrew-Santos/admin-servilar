// modules/servicos/composicao.js — campos ligados de valor, comissão e repasse (serviço, adicional e preço por município)
// + o tempo do serviço em minutos. Os campos ficam na janela do módulo (#sv-val, #sv-pp, #sv-pv, #sv-rp, #sv-rv, #sv-tm).
import { aplicarTotal, bpPlat, definirPct, definirPlat, definirRep } from './actions-servico.js';
import { numBr, brl } from './ui.js';

// reais: só dígitos, preenchendo da direita para a esquerda (como app de banco): 1 2 0 5 0 → 120,50
export function lerReais(el, max = 99999999) {
  const dig = el.value.replace(/\D/g, '').slice(0, 8);   // até R$ 999.999,99
  const v = Math.min(Number(dig || 0), max);
  el.value = dig ? numBr(v) : ''; return v;
}
// percentual: dígitos e uma vírgula, até 2 casas, máximo 100 → devolve em centésimos de %
function lerPct(el) {
  let v = el.value.replace('.', ',').replace(/[^\d,]/g, '');
  const [i, ...r] = v.split(',');
  v = i.slice(0, 3) + (r.length ? ',' + r.join('').slice(0, 2) : '');
  if (Number(v.replace(',', '.')) > 100) v = '100';
  el.value = v; return Math.round(Number(v.replace(',', '.') || 0) * 100);
}
const fmtPct = bp => (bp ? String(bp / 100).replace('.', ',') : '0');
const selecionarAoFocar = el => { el.onfocus = () => setTimeout(() => { if (document.activeElement === el) el.select(); }, 0); };

// obter() devolve o rascunho atual (ele é trocado a cada abertura); aoMudar() atualiza o estado do formulário
export function criarComposicao($, obter, aoMudar) {
  // Valor por hora do total, da comissão e do repasse, a partir do tempo do rascunho (sem tempo ou sem valor: "—")
  function atualizarHora() {
    const d = obter(), t = d.centavos, min = d.tempo || 0;
    const linhas = { '#sv-hv': t, '#sv-hpl': d.plat, '#sv-hrp': t - d.plat };
    for (const [id, v] of Object.entries(linhas)) {
      const el = $(id); if (!el) continue;
      const ok = min > 0 && v > 0;
      el.textContent = ok ? brl(Math.round(v * 60 / min)) + '/h' : '—';
      el.classList.toggle('vz', !ok);
    }
  }

  // Preenche os campos da divisão a partir do rascunho. O campo que a pessoa está digitando (`origem`)
  // não é reescrito, para o cursor não pular; os outros acompanham na hora.
  function sincronizar(origem) {
    const draft = obter(), t = draft.centavos, liberado = t > 0, bp = bpPlat(draft);
    const campos = { '#sv-pp': fmtPct(bp), '#sv-rp': fmtPct(10000 - bp), '#sv-pv': numBr(draft.plat), '#sv-rv': numBr(t - draft.plat) };
    for (const [id, v] of Object.entries(campos)) {
      const el = $(id); el.disabled = !liberado;
      if (id !== origem) el.value = liberado ? v : '';
    }
    atualizarHora();
  }

  // Divisão: qualquer campo recalcula os outros três
  function ligar() {
    $('#sv-val').oninput = ev => { const d = obter(); d.centavos = lerReais(ev.target); aplicarTotal(d); sincronizar('#sv-val'); aoMudar(); };
    $('#sv-pp').oninput = ev => { const d = obter(); definirPct(d, lerPct(ev.target)); sincronizar('#sv-pp'); aoMudar(); };
    $('#sv-rp').oninput = ev => { const d = obter(); definirPct(d, 10000 - lerPct(ev.target)); sincronizar('#sv-rp'); aoMudar(); };
    $('#sv-pv').oninput = ev => { const d = obter(); definirPlat(d, lerReais(ev.target, d.centavos)); sincronizar('#sv-pv'); aoMudar(); };
    $('#sv-rv').oninput = ev => { const d = obter(); definirRep(d, lerReais(ev.target, d.centavos)); sincronizar('#sv-rv'); aoMudar(); };
    for (const id of ['#sv-val', '#sv-pp', '#sv-rp', '#sv-pv', '#sv-rv']) {
      const el = $(id);
      selecionarAoFocar(el);   // digitar substitui o valor (senão "0" + "15" viraria "015")
      // ao sair, deixa tudo formatado igual (ex.: "15," vira "15"; vazio vira "0,00")
      el.onblur = () => { const d = obter(); $('#sv-val').value = d.centavos ? numBr(d.centavos) : ''; sincronizar(null); };
    }
  }

  // Tempo do serviço: `tempo` em minutos no rascunho; 0 = não preenchido
  function ligarTempo() {
    const el = $('#sv-tm'); if (!el) return;
    el.value = obter().tempo ? String(obter().tempo) : '';
    atualizarHora();
    el.oninput = ev => {
      const dig = ev.target.value.replace(/\D/g, '').slice(0, 4);
      ev.target.value = dig; obter().tempo = Number(dig || 0); atualizarHora(); aoMudar();
    };
    selecionarAoFocar(el);
  }

  return { sincronizar, ligar, ligarTempo };
}
