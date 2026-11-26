// modules/servicos/adicional-html.js — marcação fixa do formulário do adicional (nunca recebe dado externo)
// Usa a mesma janela do serviço (#sv-ov): composição do valor, tempo em minutos e rodapé vêm de servico-html.js.
import { COMPOSICAO, TEMPO, TOPICOS, formRegra } from './servico-html.js';

const DADOS = `
  <section class="sv-sc">
    <h4 class="sv-sh">Dados do adicional</h4>
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-esp">Especialidade</label>
      <select id="sv-esp" class="sv-campo"></select>
    </div>
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-nome">Nome do adicional <small>Salvo em letras maiúsculas</small></label>
      <input id="sv-nome" class="sv-campo sv-up" maxlength="100" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ADICIONAL - QUARTO">
    </div>
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-un">Cobrado por <small>Ex.: quarto, banheiro, 20m²</small></label>
      <input id="sv-un" class="sv-campo" maxlength="30" autocomplete="off" list="sv-un-op" placeholder="quarto">
      <datalist id="sv-un-op"><option value="quarto"><option value="banheiro"><option value="lavabo"><option value="ambiente"><option value="20m²"></datalist>
    </div>
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-ord">Ordem na lista <small>Menor aparece primeiro</small></label>
      <input id="sv-ord" class="sv-campo" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="0">
    </div>
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-desc">Descrição <small id="sv-cnt">0/2000</small></label>
      <textarea id="sv-desc" class="sv-campo" rows="4" maxlength="2000" placeholder="Breve descrição (opcional)"></textarea>
    </div>
    <div class="sv-fg sv-linha">
      <span class="sv-lbl">Status</span>
      <label class="sv-sw"><input type="checkbox" id="sv-ativo"><span class="sv-trilho"></span><span id="sv-st-t">Ativo</span></label>
    </div>
  </section>`;

export const FORM_ADICIONAL = DADOS + TOPICOS + COMPOSICAO('Valor do adicional') + TEMPO;
export const FORM_REGRA_ADICIONAL = formRegra('Valor do adicional');
