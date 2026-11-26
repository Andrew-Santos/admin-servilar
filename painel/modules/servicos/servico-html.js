// modules/servicos/servico-html.js — marcação fixa dos formulários do serviço (nunca recebe dado externo)

const DADOS = `
  <section class="sv-sc">
    <h4 class="sv-sh">Dados do serviço</h4>
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-esp">Especialidade</label>
      <select id="sv-esp" class="sv-campo"></select>
    </div>
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-nome">Nome do serviço <small>Salvo em letras maiúsculas</small></label>
      <input id="sv-nome" class="sv-campo sv-up" maxlength="100" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="INSTALAÇÃO DE CHUVEIRO ELÉTRICO">
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

// Quatro campos ligados: valor, comissão e repasse (cada um em % e em R$). Usado no serviço e na regra por município.
export const COMPOSICAO = rotulo => `
  <section class="sv-sc">
    <h4 class="sv-sh">Composição do valor</h4>
    <p class="sv-dica sv-ref" id="sv-ref" hidden></p>
    <div class="sv-fl" role="group" aria-label="Composição do valor">
      <span class="sv-th" aria-hidden="true"></span><span class="sv-th" aria-hidden="true">Percentual</span><span class="sv-th" aria-hidden="true">Valor</span><span class="sv-th" aria-hidden="true">Por hora</span>

      <label class="lb" for="sv-val">${rotulo}</label>
      <span class="sv-fixo" aria-hidden="true">100%</span>
      <div class="sv-ad tot"><span>R$</span><input id="sv-val" class="sv-campo num" inputmode="numeric" autocomplete="off" placeholder="0,00"></div>
      <span class="sv-hr" id="sv-hv" aria-label="Valor por hora"></span>

      <label class="lb" for="sv-pp"><i class="dot plat" aria-hidden="true"></i>Comissão da plataforma</label>
      <div class="sv-ad dir"><input id="sv-pp" class="sv-campo num" inputmode="decimal" autocomplete="off" placeholder="0"><span>%</span></div>
      <div class="sv-ad"><span>R$</span><input id="sv-pv" class="sv-campo num" inputmode="numeric" autocomplete="off" placeholder="0,00" aria-label="Comissão da plataforma em reais"></div>
      <span class="sv-hr" id="sv-hpl" aria-label="Comissão por hora"></span>

      <label class="lb" for="sv-rp"><i class="dot rep" aria-hidden="true"></i>Repasse ao profissional</label>
      <div class="sv-ad dir"><input id="sv-rp" class="sv-campo num" inputmode="decimal" autocomplete="off" placeholder="0"><span>%</span></div>
      <div class="sv-ad"><span>R$</span><input id="sv-rv" class="sv-campo num" inputmode="numeric" autocomplete="off" placeholder="0,00" aria-label="Repasse ao profissional em reais"></div>
      <span class="sv-hr" id="sv-hrp" aria-label="Repasse por hora"></span>
    </div>
    <div id="sv-prev"></div>
    <p class="sv-dica" id="sv-dica"></p>
  </section>`;

// Tempo do serviço em minutos (usado no serviço e no adicional)
export const TEMPO = `
  <section class="sv-sc">
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-tm">Tempo do serviço <small>Em minutos</small></label>
      <div class="sv-ad dir"><input id="sv-tm" class="sv-campo num" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="60"><span>min</span></div>
    </div>
  </section>`;

// Incluso / não incluso: listas de tópicos (os campos são desenhados por topicos.js; usado no serviço e no adicional)
export const TOPICOS = `
  <section class="sv-sc">
    <h4 class="sv-sh">O que está incluso</h4>
    <div class="sv-tps" id="sv-inc"></div>
  </section>
  <section class="sv-sc">
    <h4 class="sv-sh">O que não está incluso</h4>
    <div class="sv-tps" id="sv-ninc"></div>
  </section>`;

export const FORM = DADOS + TOPICOS + COMPOSICAO('Valor padrão') + TEMPO;

const DADOS_REGRA = `
  <section class="sv-sc">
    <h4 class="sv-sh">Identificação</h4>
    <div class="sv-fg">
      <label class="sv-lbl" for="sv-rnome">Nome da regra <small>Opcional</small></label>
      <input id="sv-rnome" class="sv-campo" maxlength="60" autocomplete="off" placeholder="Ex.: Região metropolitana">
    </div>
    <div class="sv-fg sv-linha">
      <span class="sv-lbl">Status</span>
      <label class="sv-sw"><input type="checkbox" id="sv-ativo"><span class="sv-trilho"></span><span id="sv-st-t">Ativa</span></label>
    </div>
  </section>
  <section class="sv-sc">
    <h4 class="sv-sh">Municípios <span class="sv-nm" id="sv-nm"></span></h4>
    <div class="sv-chips" id="sv-chips"></div>
    <div class="sv-bus">
      <input id="sv-bq" class="sv-campo" type="search" maxlength="60" autocomplete="off" placeholder="Buscar município" aria-label="Buscar município">
      <select id="sv-bu" class="sv-campo" aria-label="Filtrar por estado"></select>
    </div>
    <ul class="sv-mun" id="sv-mun"></ul>
    <div class="sv-munr"><button type="button" class="sv-lk" id="sv-todos"></button><button type="button" class="sv-lk" id="sv-nenhum">Limpar seleção</button></div>
  </section>`;
// formulário da regra por município: serve ao serviço e ao adicional (muda só o rótulo do valor)
export const formRegra = rotulo => DADOS_REGRA + COMPOSICAO(rotulo);
export const FORM_REGRA = formRegra('Valor do serviço');

export const RODAPE = `
  <p id="sv-msg" role="status"></p>
  <div class="sv-acoes" id="sv-acoes">
    <button type="button" class="sv-ex" id="sv-excluir" hidden>Excluir</button>
    <span class="sv-esp"></span>
    <button type="button" class="btn-borda" id="sv-cancelar">Cancelar</button>
    <button type="button" class="sv-salvar" id="sv-salvar" disabled>Salvar</button>
  </div>
  <div class="sv-conf" id="sv-conf" hidden>
    <span id="sv-conf-t"></span>
    <button type="button" class="sv-sim" id="sv-sim">Excluir</button>
    <button type="button" class="btn-borda" id="sv-nao">Cancelar</button>
  </div>`;
