// modules/regioes/ui.js — desenha GeoJSON em SVG (sem innerHTML com dados externos)
// Inclui: zoom (roda do mouse, pinça, botões), arrastar para mover e rótulos de cidades
// que aparecem conforme o zoom (sem sobreposição).
const NS = 'http://www.w3.org/2000/svg';
const ZOOM_MAX = 80;   // quantas vezes dá para aproximar em relação à vista inicial
const PX = 11;         // tamanho padrão do texto dos rótulos, em pixels de tela

// Área e centroide de um anel já projetado (relativo ao 1º ponto, para manter precisão)
function anel(pts) {
  const [ox, oy] = pts[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    const ax = x1 - ox, ay = y1 - oy, bx = x2 - ox, by = y2 - oy;
    const c = ax * by - bx * ay;
    a += c; cx += (ax + bx) * c; cy += (ay + by) * c;
  }
  a /= 2;
  if (!a) return { area: 0, x: ox, y: oy };
  return { area: Math.abs(a), x: ox + cx / (6 * a), y: oy + cy / (6 * a) };
}

// rotulo(id) -> { texto, peso, classe, px? } | null   (peso maior ganha o espaço primeiro)
export function desenhar(svg, geo, { clique, hover, rotulo }) {
  svg.replaceChildren();
  const paths = new Map(), items = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

  for (const f of geo.features) {
    const g = f.geometry; if (!g) continue;
    let d = '', maior = null, total = 0;
    for (const poli of g.type === 'Polygon' ? [g.coordinates] : g.coordinates)
      poli.forEach((raw, i) => {
        if (!raw.length) return;
        const pts = raw.map(([lon, lat]) => [lon * 0.966, -lat]);
        for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        d += 'M' + pts.map(([x, y]) => x.toFixed(3) + ' ' + y.toFixed(3)).join('L') + 'Z';
        if (i === 0) { const r = anel(pts); total += r.area; if (!maior || r.area > maior.area) maior = r; }
      });
    const id = String(f.properties.codarea);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.dataset.id = id;
    svg.append(p); paths.set(id, p);
    if (maior) items.push({ id, x: maior.x, y: maior.y, area: total });
  }
  items.sort((a, b) => b.area - a.area);   // desempate dos rótulos: municípios maiores primeiro

  const gRot = document.createElementNS(NS, 'g');
  gRot.setAttribute('class', 'rg-rots');
  svg.append(gRot);

  // ───────── vista (viewBox) ─────────
  const base = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const view = { ...base };
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, anim = 0;
  const agendar = () => { raf ||= requestAnimationFrame(() => { raf = 0; rotular(); }); };

  const aplicar = () => {
    const m = view.w * 0.25 * (1 - view.w / base.w);   // folga ao arrastar (zero sem zoom)
    view.x = Math.min(Math.max(view.x, base.x - m), base.x + base.w - view.w + m);
    view.y = Math.min(Math.max(view.y, base.y - m), base.y + base.h - view.h + m);
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    agendar();
  };
  const ponto = (cx, cy) => {   // coordenada da tela -> coordenada do mapa
    const m = svg.getScreenCTM();
    if (!m) return [view.x + view.w / 2, view.y + view.h / 2];
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  // nova vista após zoom de fator f mantendo o ponto (px,py) parado na tela
  const calc = (f, px = view.x + view.w / 2, py = view.y + view.h / 2) => {
    const w = Math.min(base.w, Math.max(base.w / ZOOM_MAX, view.w / f)), k = w / view.w;
    return { x: px - (px - view.x) * k, y: py - (py - view.y) * k, w, h: w * base.h / base.w };
  };
  const zoomEm = (...a) => { Object.assign(view, calc(...a)); aplicar(); };
  const ir = alvo => {   // transição suave até a vista `alvo`
    cancelAnimationFrame(anim);
    if (reduz) { Object.assign(view, alvo); return aplicar(); }
    const de = { ...view }, t0 = performance.now();
    const passo = t => {
      const k = Math.min(1, (t - t0) / 280), e = 1 - (1 - k) ** 3;
      for (const c of ['x', 'y', 'w', 'h']) view[c] = de[c] + (alvo[c] - de[c]) * e;
      aplicar();
      if (k < 1) anim = requestAnimationFrame(passo);
    };
    anim = requestAnimationFrame(passo);
  };
  function focar(id) {   // enquadra uma cidade
    const p = paths.get(String(id)); if (!p) return;
    const b = p.getBBox(), r = base.h / base.w;
    const w = Math.min(base.w, Math.max(base.w / ZOOM_MAX, b.width * 2.4, b.height * 2.4 / r));
    ir({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - w * r / 2, w, h: w * r });
  }

  // ───────── interação ─────────
  svg.onwheel = e => {
    e.preventDefault();
    cancelAnimationFrame(anim);
    const d = Math.max(-100, Math.min(100, e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY));
    zoomEm(Math.exp(-d * 0.0028), ...ponto(e.clientX, e.clientY));
  };

  const ptrs = new Map();
  let arrastou = false;   // true = o gesto foi arrasto/pinça, então não conta como clique
  svg.onpointerdown = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAnimationFrame(anim);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    arrastou = ptrs.size > 1;
  };
  svg.onpointermove = e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 1) {
      if (!arrastou) {
        if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 5) return;   // ainda é um clique
        arrastou = true; svg.setPointerCapture(e.pointerId); svg.classList.add('arrastando');
      }
      const s = svg.getScreenCTM()?.a; if (!s) return;
      view.x -= (e.clientX - p.x) / s; view.y -= (e.clientY - p.y) / s;
      p.x = e.clientX; p.y = e.clientY; aplicar();
    } else if (ptrs.size === 2) {   // pinça
      const [a, b] = [...ptrs.values()], antes = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const depois = Math.hypot(a.x - b.x, a.y - b.y);
      if (antes && depois) zoomEm(depois / antes, ...ponto((a.x + b.x) / 2, (a.y + b.y) / 2));
    }
  };
  const soltar = e => {
    ptrs.delete(e.pointerId);
    if (!ptrs.size) svg.classList.remove('arrastando');
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
  };
  svg.onpointerup = soltar; svg.onpointercancel = soltar;

  svg.onclick = e => {
    if (arrastou) { arrastou = false; return; }
    const p = e.target.closest('path'); if (p) clique(p.dataset.id);
  };
  svg.onmouseover = e => { const p = e.target.closest('path'); if (p) hover(p.dataset.id); };

  // ───────── rótulos ─────────
  const textos = new Map();
  function rotular() {
    const s = svg.getScreenCTM()?.a, r = svg.getBoundingClientRect();
    if (!s || !r.width || !rotulo) return;
    // região realmente visível (com a vista "meet" pode sobrar faixa nos lados)
    const vw = r.width / s / 2, vh = r.height / s / 2, cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    const cand = [];
    for (const it of items) {
      if (it.x < cx - vw || it.x > cx + vw || it.y < cy - vh || it.y > cy + vh) continue;
      const info = rotulo(it.id);
      if (info && info.texto) cand.push({ it, info });
    }
    cand.sort((a, b) => b.info.peso - a.info.peso);   // sort estável: mantém a ordem por área dentro do mesmo peso

    const ocupados = [], vis = new Set();
    for (const { it, info } of cand) {
      const px = info.px || PX, w = info.texto.length * px * 0.58 + 8, h = px + 6;
      // cidade comum só ganha rótulo quando já é grande o bastante na tela para "comportar" o nome
      if (!info.peso && Math.sqrt(it.area) * s < w * 0.55) continue;
      const sx = it.x * s, sy = it.y * s, b = [sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2];
      if (ocupados.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
      ocupados.push(b); vis.add(it.id);

      let t = textos.get(it.id);
      if (!t) {
        t = document.createElementNS(NS, 'text');
        t.setAttribute('x', it.x.toFixed(3)); t.setAttribute('y', it.y.toFixed(3));
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
        gRot.append(t); textos.set(it.id, t);
      }
      if (t.textContent !== info.texto) t.textContent = info.texto;
      t.setAttribute('class', 'rg-rot ' + (info.classe || ''));
      t.setAttribute('font-size', (px / s).toFixed(4));
      t.setAttribute('stroke-width', (3.5 / s).toFixed(4));
      t.removeAttribute('display');
    }
    textos.forEach((t, id) => { if (!vis.has(id)) t.setAttribute('display', 'none'); });
  }

  svg._ro?.disconnect();
  svg._ro = new ResizeObserver(agendar); svg._ro.observe(svg);   // também faz o 1º desenho dos rótulos
  aplicar();

  return { paths, rotular: agendar, zoom: f => ir(calc(f)), reset: () => ir({ ...base }), focar };
}