// modules/clientes/module-ficha.js — abre a ficha do cliente em janela: busca os dados e monta (só leitura)
import * as data from './data.js';
import { montarFicha, seloCadastro } from './ui-detalhe.js';
import { abrirJanela } from './ui-modal.js';
import { h, msg, trocar } from './ui.js';

let aberta = null;

export function abrirFicha({ id, nome }) {
  aberta?.fechar();
  let vivo = true;
  const janela = abrirJanela({ titulo: nome, aoFechar: () => { vivo = false; if (aberta === janela) aberta = null; } });
  aberta = janela;

  async function carregar() {
    trocar(janela.corpo, h('p', { class: 'cl-info', role: 'status', text: 'Carregando…' }));
    let c;
    try { c = await data.buscarFicha(id); }
    catch (e) {
      if (vivo) trocar(janela.corpo, msg(e.message, 'neg'), h('button', { type: 'button', class: 'cl-btn', text: 'Tentar de novo', onclick: carregar }));
      return;
    }
    if (!vivo) return;
    janela.definirTitulo(c.nome || 'Cliente sem nome', seloCadastro(c));
    trocar(janela.corpo, montarFicha(c));
    janela.corpo.scrollTop = 0;
  }
  carregar();
  return janela;
}
