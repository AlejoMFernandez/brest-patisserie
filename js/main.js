// Brest Patisserie · demo · Alejo Martín Fernández
import { initKit } from '../kit/kit.js?v=1';
import { popup, toast } from '../kit/core/ui.js';
import { linkWhatsApp } from '../kit/core/pedidos.js';
import { esc, telValido } from '../kit/core/util.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const root = document.documentElement;
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esDesk = () => matchMedia('(min-width: 900px)').matches;
const qs = new URLSearchParams(location.search);

/* ---------------- local (Devoto / Villa Luro) ---------------- */
let local = qs.get('local');
if (!local) { try { local = localStorage.getItem('brest:local'); } catch (_) { /* sin storage */ } }
local = local === 'luro' ? 'luro' : 'devoto';
try { localStorage.setItem('brest:local', local); } catch (_) { /* nada */ }
const LOCALES = {
  devoto: { nombre: 'Devoto', dir: 'Av. Francisco Beiró 5031', config: 'cliente.json' },
  luro: { nombre: 'Villa Luro', dir: 'Ramón Falcón 5281', config: 'cliente-luro.json' },
};
const L = LOCALES[local];
$$('[data-local]').forEach(b => {
  const on = b.dataset.local === local;
  b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  b.addEventListener('click', () => {
    if (b.dataset.local === local) { cerrarMenu(); return; }
    try { localStorage.setItem('brest:local', b.dataset.local); sessionStorage.setItem('brest:sinIntro', '1'); } catch (_) { /* nada */ }
    const u = new URL(location.href); u.searchParams.set('local', b.dataset.local); u.hash = 'carta';
    location.href = u.href;
  });
});
$('#cartaNota').textContent = `Carta y precios de Brest ${L.nombre}. Todo se puede pedir para retirar en ${L.dir}.`;

/* ---------------- intro ---------------- */
const conIntro = root.classList.contains('con-intro');
function arrancar() { root.classList.add('listo'); }
if (conIntro) {
  root.style.overflow = 'hidden';
  const t0 = performance.now();
  const desk = esDesk();
  const fade = desk ? 2050 : 1450, fin = desk ? 2550 : 1950;
  const img = $('.hero__foto img');
  const espera = Promise.race([
    Promise.all([document.fonts ? document.fonts.ready : null, img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })]),
    new Promise(r => setTimeout(r, 2600)),
  ]);
  espera.then(() => {
    const pasado = performance.now() - t0;
    setTimeout(arrancar, Math.max(0, fade - pasado));
    setTimeout(() => { root.classList.remove('con-intro'); root.style.overflow = ''; }, Math.max(0, fin - pasado));
  });
  setTimeout(() => { root.style.overflow = ''; root.classList.add('listo'); }, 5000);
} else arrancar();

/* ---------------- entradas al scrollear ---------------- */
const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
const observar = (c = document) => $$('.rev:not(.visto)', c).forEach(el => io.observe(el));
observar();

/* ---------------- barra + menú ---------------- */
const barra = $('#barra');
root.classList.add('pill-oculta');
let tic = false;
let yPrev = 0;
addEventListener('scroll', () => { if (tic) return; tic = true; requestAnimationFrame(() => {
  barra.classList.toggle('sombra', scrollY > 8);
  const bajando = scrollY > yPrev + 4, subiendo = scrollY < yPrev - 4;
  const enHero = scrollY < innerHeight * .7;
  const alFinal = scrollY + innerHeight > document.documentElement.scrollHeight - 900;
  if (enHero) root.classList.add('pill-oculta');
  else if (alFinal || subiendo || esDesk()) root.classList.remove('pill-oculta'); else if (bajando) root.classList.add('pill-oculta');
  yPrev = scrollY; tic = false; }); }, { passive: true });

const menu = $('#menu'), btnMenu = $('#abrirMenu');
let yGuardado = 0;
function trabar() { yGuardado = scrollY; Object.assign(document.body.style, { position: 'fixed', top: `-${yGuardado}px`, left: '0', right: '0' }); }
function destrabar() { Object.assign(document.body.style, { position: '', top: '', left: '', right: '' }); root.style.scrollBehavior = 'auto'; scrollTo(0, yGuardado); root.style.scrollBehavior = ''; }
function abrirMenu() { menu.hidden = false; menu.classList.remove('abre'); void menu.offsetWidth; menu.classList.add('abre'); root.classList.add('menu-abierto'); btnMenu.setAttribute('aria-expanded', 'true'); trabar(); $('#cerrarMenu').focus(); }
function cerrarMenu(ir) {
  if (menu.hidden) return;
  menu.hidden = true; root.classList.remove('menu-abierto'); btnMenu.setAttribute('aria-expanded', 'false'); destrabar();
  if (ir) { const d = $(ir); if (d) d.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' }); } else btnMenu.focus();
}
btnMenu.addEventListener('click', abrirMenu);
$('#cerrarMenu').addEventListener('click', () => cerrarMenu());
$$('.menu__links a').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); cerrarMenu(a.getAttribute('href')); }));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) cerrarMenu(); });

/* ---------------- filas deslizables con mouse ---------------- */
function arrastrable(fila, alSoltar) {
  let x0 = 0, s0 = 0, mov = false, activo = false;
  fila.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; activo = true; mov = false; x0 = e.clientX; s0 = fila.scrollLeft; });
  addEventListener('pointermove', (e) => {
    if (!activo) return;
    const dx = e.clientX - x0;
    if (!mov && Math.abs(dx) > 6) { mov = true; fila.classList.add('arrastra'); }
    if (mov) fila.scrollLeft = s0 - dx;
  });
  addEventListener('pointerup', () => {
    if (!activo) return; activo = false;
    if (mov) { fila.classList.remove('arrastra'); alSoltar && alSoltar(); const tragar = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; fila.addEventListener('click', tragar, { capture: true, once: true }); setTimeout(() => fila.removeEventListener('click', tragar, true), 60); }
  });
}
function alMasCercano(fila) {
  const c = fila.scrollLeft + fila.clientWidth / 2;
  let mejor = null, dist = Infinity;
  [...fila.children].forEach(el => { const m = el.offsetLeft + el.offsetWidth / 2; const d = Math.abs(m - c); if (d < dist) { dist = d; mejor = el; } });
  if (mejor) fila.scrollTo({ left: mejor.offsetLeft + mejor.offsetWidth / 2 - fila.clientWidth / 2, behavior: quieto ? 'auto' : 'smooth' });
}
const filaLugar = $('#filaLugar');
arrastrable(filaLugar, () => alMasCercano(filaLugar));

/* ---------------- helpers de carta ---------------- */
const TAGS = { sintacc: 'SIN TACC', keto: 'KETO', veggie: 'VEGGIE', casa: 'DE LA CASA' };
const NOTAS = {
  cafe: 'Fríos o calientes. Para llevar, también en grano o molido.',
  especiales: 'Fríos o calientes. Las infusiones, con o sin leche.',
  desayunos: 'Se sirven con bebida a elección y un mini exprimido.',
  brunch: 'Todos incluyen dos bebidas a elección. Para el grupo, también se reservan.',
  dulces: 'Preguntá por las tortas del día. Buscá el sello SIN TACC.',
  laminados: 'Toppings: pistacho, frutos rojos o cremoso de dulce de leche.',
  salados: 'Los tostones vienen con queso danbo flambeado.',
  sanos: 'Pan nube y opciones keto, sin harinas.',
  entrepanes: 'Adicionales: tomate, lechuga, rúcula o huevo ($2.000), jamón crudo ($3.000), palta ($4.000).',
  ensaladas: 'Tartas y tortillas con mix de verdes y tomates cherry.',
  almuerzos: 'Incluyen agua o soda libre y un café. Guarnición a elección: ensalada, arroz, papas cuña, purés o batatas.',
  pastas: 'La salsa va aparte. Incluyen agua o soda libre y un café.',
  bebidas: 'Las botellas de agua o soda no se llevan: son reutilizables.',
  'tortas-enteras': 'Para cumpleaños y eventos, con la decoración que quieras. Tocá Encargar y elegí el día.',
};
let ctx = null, kit = null, productos = [], categorias = [];
const money = (n) => ctx ? ctx.money(n) : (n == null ? null : '$' + Number(n).toLocaleString('es-AR'));
const fotoDe = (p) => (p && p.foto ? (ctx ? ctx.asset(p.foto) : p.foto) : '');

function itemHTML(p) {
  const precio = money(p.precio);
  const tags = (p.etiquetas || []).filter(t => TAGS[t]).map(t => `<span class="tg tg--${t}">${TAGS[t]}</span>`).join('');
  const foto = p.foto ? `<img class="plato__foto" src="${esc(fotoDe(p))}" alt="" loading="lazy" width="58" height="58">` : '';
  let accion = '';
  if (p.categoria === 'tortas-enteras') accion = `<button type="button" class="btn-encargar" data-encargar="${esc(p.id)}">Encargar</button>`;
  else if (p.disponible !== false && p.precio != null) accion = `<div data-kit-qty="${esc(p.id)}"></div>`;
  return `${foto}<div class="plato__body"><h4 class="plato__nom">${esc(p.nombre)}${tags ? ` <span class="plato__tags">${tags}</span>` : ''}</h4>${p.descripcion ? `<p class="plato__desc">${esc(p.descripcion)}</p>` : ''}<p class="plato__precio${precio ? '' : ' plato__precio--na'}">${precio || 'Consultar'}</p></div>
    <div class="plato__lado">${accion}${p.disponible === false ? '<span class="kit-badge kit-badge--off">Hoy no hay</span>' : ''}</div>`;
}

/* ---------------- carta: cabecera de sección + anterior / siguiente ---------------- */
const cartaEl = $('[data-kit="carta"]');
const nav = $('#cartaNav');
function grupos() { return $$('.kit-tab', cartaEl); }
function pintarNav() {
  const tabs = grupos(); const i = tabs.findIndex(t => t.classList.contains('is-on'));
  const [ant, sig] = $$('[data-paso]', nav);
  ant.hidden = i <= 0; sig.hidden = i < 0 || i >= tabs.length - 1;
  if (i > 0) $('[data-nom]', ant).textContent = tabs[i - 1].textContent;
  if (i < tabs.length - 1 && i >= 0) $('[data-nom]', sig).textContent = tabs[i + 1].textContent;
  const on = tabs[i];
  if (on && !esDesk()) { const box = on.parentElement; box.scrollTo({ left: on.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2, behavior: quieto ? 'auto' : 'smooth' }); }
}
function irACategoria(id, scroll = true) {
  const tab = $(`.kit-tab[data-cat="${CSS.escape(id)}"]`, cartaEl);
  if (tab) tab.click();
  if (scroll) $('#carta').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' });
}
document.addEventListener('kit:carta', (e) => {
  const { el, productos: ps, categorias: cs } = e.detail;
  productos = ps; categorias = cs;
  $$('.kit-carta__panel', el).forEach(panel => {
    const id = $('.kit-item', panel)?.dataset.cat; if (!id) return;
    const cat = cs.find(c => c.id === id); const n = $$('.kit-item', panel).length;
    panel.insertAdjacentHTML('afterbegin', `<header class="sec-cab"><div class="sec-cab__fila"><h3>${esc(cat ? cat.nombre : '')}</h3><span class="sec-cab__n">${n} ${n === 1 ? 'opción' : 'opciones'}</span></div>${NOTAS[id] ? `<p>${esc(NOTAS[id])}</p>` : ''}</header>`);
  });
  pintarNav();
  pintarVitrina(); pintarBrunch(); pintarBox(); pintarPizarraPrecios();
});
cartaEl.addEventListener('click', (e) => { if (e.target.closest('.kit-tab')) requestAnimationFrame(pintarNav); });
nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-paso]'); if (!b) return;
  const tabs = grupos(); const i = tabs.findIndex(t => t.classList.contains('is-on'));
  const t = tabs[i + Number(b.dataset.paso)]; if (!t) return;
  t.click();
  const destino = esDesk() ? $('#carta') : cartaEl;
  const y = destino.getBoundingClientRect().top + scrollY - (esDesk() ? 0 : 70);
  scrollTo({ top: y, behavior: quieto ? 'auto' : 'smooth' });
});
document.addEventListener('click', (e) => { const b = e.target.closest('[data-encargar]'); if (b) { e.preventDefault(); abrirEncargo(b.dataset.encargar); } });

/* ---------------- pizarra que sabe qué hora es ---------------- */
function ahoraBA() {
  const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return { h: Number(p.hour) % 24, dia: p.weekday };
}
function momento() {
  const m = qs.get('momento'); if (m) return m;
  const { h, dia } = ahoraBA();
  if (h < 8 || h >= 21) return 'noche';
  if (dia === 'Wed') return 'miercoles';
  if (h < 12) return 'manana';
  if (h < 16) return 'mediodia';
  return 'tarde';
}
const pre = (id, def) => { const p = productos.find(x => x.id === id); return (p && money(p.precio)) || def; };
function textosPizarra() {
  const m = momento();
  const T = {
    manana: { l: ['BUEN DÍA', 'DESAYUNOS Y MERIENDAS', `PORTEÑO ${pre('porteno', '$14.500')} · CON BEBIDA Y EXPRIMIDO`], cat: 'desayunos', btn: 'Ver desayunos' },
    mediodia: local === 'devoto'
      ? { l: ['HOY ALMORZÁS ACÁ', 'MENÚ DEL DÍA DESDE $10.500', 'CON AGUA LIBRE Y CAFÉ'], cat: 'almuerzos', btn: 'Ver almuerzos' }
      : { l: ['MEDIODÍA EN BREST', 'TARTAS Y ENSALADAS', 'TODO TAMBIÉN PARA LLEVAR'], cat: 'ensaladas', btn: 'Ver tartas y ensaladas' },
    tarde: { l: ['HORA DE MERENDAR', `PROMO DULCE ${pre('promo-dulce', '$19.500')}`, 'INFUSIÓN + PORCIÓN DE TORTA'], cat: 'desayunos', btn: 'Ver meriendas' },
    miercoles: { l: ['MIÉRCOLES MUJER', '20% EN TODO', 'EN LA MESA DE MUJERES · CUALQUIER MEDIO DE PAGO'], ancla: '#beneficios', btn: 'Ver beneficios' },
    noche: { l: ['HOY YA CERRAMOS', 'MAÑANA DESDE LAS 8', 'MIENTRAS TANTO, ENCARGÁ TU TORTA'], ancla: '#vitrina', btn: 'Ver la vitrina' },
  };
  return T[m] || T.tarde;
}
let pizarraVista = false;
function escribirPizarra(animar) {
  const t = textosPizarra(); let n = 0; pizarraTxt = t.l.join('|');
  $$('.pizarra__l').forEach((p, i) => {
    const txt = t.l[i] || '';
    p.setAttribute('aria-label', txt);
    p.innerHTML = animar ? txt.split(' ').map(w => `<span style="white-space:nowrap" aria-hidden="true">${[...w].map(ch => `<i style="--n:${n++}">${esc(ch)}</i>`).join('')}</span>`).join(' ') : esc(txt);
    n += 2;
  });
  const b = $('#pizarraBtn');
  b.firstChild.textContent = t.btn + ' ';
  b.href = t.ancla || '#carta';
  b.onclick = t.cat ? (e) => { e.preventDefault(); irACategoria(t.cat); } : null;
}
let pizarraTxt = '';
function pintarPizarraPrecios() { if (!pizarraVista) return; const t = textosPizarra().l.join('|'); if (t !== pizarraTxt) escribirPizarra(false); }
new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { pizarraVista = true; escribirPizarra(!quieto); o.disconnect(); } }), { threshold: .35 }).observe($('#pizarra'));

/* ---------------- vitrina ---------------- */
const filaV = $('#filaVitrina');
let vitrinaHecha = '';
function pintarVitrina() {
  const tortas = productos.filter(p => p.categoria === 'tortas-enteras' && p.disponible !== false);
  const firma = JSON.stringify(tortas.map(p => [p.id, p.nombre, p.precio, p.foto]));
  if (firma === vitrinaHecha) return; vitrinaHecha = firma;
  filaV.innerHTML = tortas.map((p, i) => {
    const st = (p.etiquetas || []).includes('sintacc');
    const precio = money(p.precio);
    return `<div class="torta" data-id="${esc(p.id)}" style="--i:${i}">
      <div class="torta__in">
        <button type="button" class="torta__cara" aria-label="${esc(p.nombre)}: ver detalle">
          <span class="torta__foto"><img src="${esc(fotoDe(p))}" alt="${esc(p.nombre)}" loading="lazy" width="560" height="746"></span>
          <span class="torta__nom">${esc(p.nombre)}</span>
          <span class="torta__info"><span>Tocá para ver más</span>${st ? '<span class="torta__tag">SIN TACC</span>' : ''}</span>
        </button>
        <div class="torta__dorso" aria-hidden="true">
          <h3>${esc(p.nombre)}</h3>
          ${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ''}
          <p class="precio${precio ? '' : ' precio--na'}">${precio ? `Desde ${precio}` : 'El precio depende del tamaño: te lo pasamos por WhatsApp.'}</p>
          <button type="button" class="btn" data-encargar="${esc(p.id)}" tabindex="-1">Encargar</button>
          <button type="button" class="torta__volver" tabindex="-1">Volver</button>
        </div>
      </div>
    </div>`;
  }).join('');
  requestAnimationFrame(() => { const ts = $$('.torta', filaV); const i = esDesk() ? Math.min(2, ts.length - 1) : 0; if (ts[i]) { filaV.scrollLeft = ts[i].offsetLeft + ts[i].offsetWidth / 2 - filaV.clientWidth / 2; } escalar(); });
}
filaV.addEventListener('click', (e) => {
  const cara = e.target.closest('.torta__cara'), volver = e.target.closest('.torta__volver');
  const t = (cara || volver)?.closest('.torta'); if (!t) return;
  const girar = !!cara;
  $$('.torta.vuelta', filaV).forEach(x => { if (x !== t) voltear(x, false); });
  voltear(t, girar);
  if (girar) t.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
});
function voltear(t, on) {
  t.classList.toggle('vuelta', on);
  $('.torta__dorso', t).setAttribute('aria-hidden', !on);
  $$('.torta__dorso button', t).forEach(b => { b.tabIndex = on ? 0 : -1; });
  $('.torta__cara', t).tabIndex = on ? -1 : 0;
  if (on) setTimeout(() => $('.torta__dorso .btn', t)?.focus({ preventScroll: true }), 350);
}
let ticV = false;
function escalar() {
  const c = filaV.scrollLeft + filaV.clientWidth / 2; let mejor = null, dmin = Infinity;
  $$('.torta', filaV).forEach(el => {
    const m = el.offsetLeft + el.offsetWidth / 2; const d = Math.abs(m - c);
    const k = Math.min(1, d / (el.offsetWidth * 1.1));
    el.style.setProperty('--s', (1 - k * .12).toFixed(3)); el.style.setProperty('--o', (1 - k * .35).toFixed(3));
    if (d < dmin) { dmin = d; mejor = el; }
  });
  $$('.torta.centro', filaV).forEach(x => x !== mejor && x.classList.remove('centro')); mejor?.classList.add('centro');
}
filaV.addEventListener('scroll', () => { if (ticV) return; ticV = true; requestAnimationFrame(() => { escalar(); ticV = false; }); }, { passive: true });
addEventListener('resize', escalar, { passive: true });
arrastrable(filaV, () => alMasCercano(filaV));
$$('[data-mover]').forEach(b => b.addEventListener('click', () => {
  const t = $('.torta', filaV); if (!t) return;
  filaV.scrollBy({ left: Number(b.dataset.mover) * (t.offsetWidth + 16), behavior: quieto ? 'auto' : 'smooth' });
}));
filaV.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); $(`[data-mover="${e.key === 'ArrowRight' ? 1 : -1}"]`).click(); } });

/* ---------------- encargo de torta entera ---------------- */
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function proximosDias(n = 14) {
  const out = []; const base = new Date();
  for (let i = 1; i <= n; i++) { const d = new Date(base); d.setDate(base.getDate() + i); out.push({ corto: DIAS[d.getDay()], num: `${d.getDate()} ${MESES[d.getMonth()]}`, largo: `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}` }); }
  return out;
}
function abrirEncargo(id) {
  if (!ctx) return;
  const p = productos.find(x => x.id === id); if (!p) return;
  const dias = proximosDias();
  const st = { personas: 12, dia: 1, sintacc: false, deco: '', nombre: '', tel: '' };
  const precio = money(p.precio);
  const box = document.createElement('form'); box.className = 'enc'; box.noValidate = true;
  box.innerHTML = `
    <div class="enc__top"><img src="${esc(fotoDe(p))}" alt=""><div><h3>${esc(p.nombre)}</h3><p>Retiro en Brest ${esc(L.nombre)} · ${esc(L.dir)}</p></div></div>
    <div><span class="enc__lab" id="enc-p">¿Para cuántas personas?</span>
      <div class="kit-step kit-step--lg" role="group" aria-labelledby="enc-p"><button type="button" data-p="-2" aria-label="Menos personas">−</button><output data-personas>${st.personas}</output><button type="button" data-p="2" aria-label="Más personas">+</button></div></div>
    <div><span class="enc__lab">¿Para qué día?</span>
      <div class="enc__dias" role="radiogroup" aria-label="Día de retiro">${dias.map((d, i) => `<button type="button" role="radio" class="enc__dia${i === st.dia ? ' on' : ''}" aria-checked="${i === st.dia}" data-dia="${i}"><b>${d.corto}</b><small>${d.num}</small></button>`).join('')}</div></div>
    <label class="enc__check"><input type="checkbox" name="sintacc"> Necesito que sea sin TACC</label>
    <label class="campo"><span>Decoración o dedicatoria (opcional)</span><textarea name="deco" rows="2" maxlength="200" placeholder="Feliz cumple, Juli · temática de dinosaurios"></textarea></label>
    <label class="campo"><span>Tu nombre</span><input name="nombre" autocomplete="name" required></label>
    <label class="campo"><span>Tu WhatsApp</span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" required></label>
    <p class="enc__precio">${precio ? `Desde ${precio}. El precio final depende del tamaño.` : 'El precio depende del tamaño y la decoración: te lo confirmamos por WhatsApp antes de hacerla.'}</p>
    <p class="kit-msg" role="alert" hidden></p>
    <button type="submit" class="kit-btn kit-btn--block kit-btn--big">Encargar ${esc(p.nombre)}</button>`;
  const pop = popup({ titulo: 'Encargá tu torta', contenido: box, clase: 'kit-pop--resv' });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (b) { st.personas = Math.max(4, Math.min(60, st.personas + Number(b.dataset.p))); $('[data-personas]', box).textContent = st.personas; return; }
    const d = e.target.closest('[data-dia]');
    if (d) { st.dia = Number(d.dataset.dia); $$('[data-dia]', box).forEach(x => { const on = x === d; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); }
  });
  box.addEventListener('input', (e) => { const f = e.target; if (f.name === 'sintacc') st.sintacc = f.checked; else if (f.name) st[f.name] = f.value; });
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('.kit-msg', box); const faltan = [];
    if (!st.nombre.trim()) faltan.push('tu nombre'); if (!telValido(st.tel)) faltan.push('tu WhatsApp');
    if (faltan.length) { msg.textContent = `Completá ${faltan.join(' y ')}.`; msg.hidden = false; return; }
    const dia = dias[st.dia].largo;
    const detalle = [`Para ${st.personas} personas`, `retira el ${dia}`, st.sintacc ? 'sin TACC' : '', st.deco.trim()].filter(Boolean).join(' · ');
    const btn = $('[type=submit]', box); btn.disabled = true; btn.classList.add('is-loading');
    try {
      const ped = await ctx.store.createPedido({ items: [{ id: p.id, cant: 1, nota: detalle }], tipo: 'retiro', cliente: { nombre: st.nombre.trim(), telefono: st.tel.trim(), direccion: '' }, nota: `ENCARGO de torta entera para el ${dia}`, pago: 'whatsapp' });
      document.dispatchEvent(new CustomEvent('kit:pedido', { detail: ped }));
      const texto = [`¡Hola Brest ${L.nombre}! Quiero encargar una torta:`, '', `*Encargo ${ped.codigo}*`, `${p.nombre}`, detalle, '', `Nombre: ${st.nombre.trim()}`, `Retiro: ${L.dir}`, '¿Me pasan el precio y cómo hago la seña?'].join('\n');
      const { url } = linkWhatsApp(ctx.config.whatsapp, texto);
      pop.close();
      const ok = document.createElement('div'); ok.className = 'kit-done';
      ok.innerHTML = `<div class="kit-done__ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h3>¡Encargo enviado!</h3><p>Tu código es ${esc(ped.codigo)}. Brest ${esc(L.nombre)} lo ve en su panel y te confirma precio y seña por WhatsApp.</p>
        <div class="kit-row kit-row--center">${url ? `<a class="kit-btn" href="${esc(url)}" target="_blank" rel="noopener">Abrir WhatsApp</a>` : ''}<button type="button" class="kit-btn kit-btn--ghost" data-close>Seguir mirando</button></div>`;
      popup({ titulo: '¡Encargo enviado!', contenido: ok, clase: 'kit-pop--sm' });
      if (url) window.open(url, '_blank', 'noopener');
      else toast('El WhatsApp de este local todavía no está cargado en la demo.', 'warn', 4200);
      asomar('¡Qué buena torta!');
    } catch (err) { console.error(err); btn.disabled = false; btn.classList.remove('is-loading'); msg.textContent = 'Algo salió mal. Probá de nuevo.'; msg.hidden = false; }
  });
}

/* ---------------- armá tu box ---------------- */
const BOX = [
  { id: 'medialuna', foto: 'img/p/jarrito.webp', nom: 'Medialuna' },
  { id: 'cookies', foto: 'img/p/cookies.webp', nom: 'Cookie' },
  { id: 'porcion-budin', foto: 'img/p/budin.webp', nom: 'Porción de budín' },
  { id: 'alfajor', foto: 'img/p/alfajor.webp', nom: 'Alfajor' },
  { id: 'pan-chocolate', foto: 'img/p/pan-chocolate.webp', nom: 'Pan de chocolate' },
  { id: 'roll-canela', foto: 'img/p/roll-canela.webp', nom: 'Roll de canela' },
  { id: 'chipa', foto: '', nom: 'Chipá', sinFoto: true },
  { id: 'miga', foto: '', nom: 'Sándwich de miga', sinFoto: true },
  { id: 'exprimido', foto: '', nom: 'Exprimido', sinFoto: true },
];
const MAX = 6;
let enCaja = [];
const slotsEl = $('#slots'), caja = $('#caja');
function opcionesBox() { return BOX.filter(b => { const p = productos.find(x => x.id === b.id); return p && p.precio != null && p.disponible !== false; }); }
let boxHecho = false;
function pintarBox() {
  const ops = opcionesBox();
  $('#boxOpts').innerHTML = ops.map(b => {
    const p = productos.find(x => x.id === b.id);
    return `<button type="button" class="opt" role="listitem" data-box="${b.id}">${b.sinFoto ? `<span class="opt__ini" aria-hidden="true">${esc(b.nom[0])}</span>` : `<img src="${b.foto}" alt="" width="44" height="44">`}<span>${esc(b.nom)}<small>${money(p.precio)}</small></span></button>`;
  }).join('');
  if (!boxHecho) { boxHecho = true; pintarSlots(); }
  else { enCaja = enCaja.filter(id => ops.some(o => o.id === id)); pintarSlots(); }
}
function pintarSlots(nuevo = -1) {
  slotsEl.innerHTML = Array.from({ length: MAX }, (_, i) => {
    const id = enCaja[i]; if (!id) return '<span class="slot" aria-hidden="true"></span>';
    const b = BOX.find(x => x.id === id);
    return `<button type="button" class="slot lleno${i === nuevo ? ' cae' : ''}" data-quitar="${i}" aria-label="Sacar ${esc(b.nom)} de la caja">${b.sinFoto ? `<span class="slot__ini">${esc(b.nom)}</span>` : `<img src="${b.foto}" alt="">`}</button>`;
  }).join('');
  const total = enCaja.reduce((s, id) => s + (productos.find(p => p.id === id)?.precio || 0), 0);
  $('#cajaEstado').textContent = enCaja.length ? `${enCaja.length} de ${MAX} · ${money(total)}${enCaja.length < 3 ? ' · con 3 ya la podés cerrar' : ''}` : 'Elegí hasta 6 cosas ricas.';
  $('#boxCerrar').disabled = enCaja.length < 3;
  $('#dedic').hidden = enCaja.length < 3;
  $$('.opt').forEach(o => o.classList.toggle('no', enCaja.length >= MAX));
}
function sumarABox(id, desde) {
  if (caja.classList.contains('cerrada')) caja.classList.remove('cerrada');
  if (enCaja.length >= MAX) { caja.classList.remove('salta'); void caja.offsetWidth; caja.classList.add('salta'); toast('La caja está llena: cerrala o sacá algo.', 'ok', 2200); return; }
  enCaja.push(id);
  const i = enCaja.length - 1;
  if (desde && !quieto) {
    const b = BOX.find(x => x.id === id); const destino = slotsEl.children[i]?.getBoundingClientRect(); const a = desde.getBoundingClientRect();
    if (destino && !b.sinFoto) {
      const v = document.createElement('span'); v.className = 'volador'; v.innerHTML = `<img src="${b.foto}" alt="">`;
      v.style.left = a.left + 'px'; v.style.top = a.top + 'px'; document.body.appendChild(v);
      v.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${(destino.left - a.left) / 2}px, ${destino.top - a.top - 90}px) scale(1.15) rotate(-10deg)`, offset: .5 }, { transform: `translate(${destino.left - a.left}px, ${destino.top - a.top}px) scale(${destino.width / 56})` }], { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => { v.remove(); pintarSlots(i); caja.classList.remove('salta'); void caja.offsetWidth; caja.classList.add('salta'); };
      return;
    }
  }
  pintarSlots(i);
}
$('#boxOpts').addEventListener('click', (e) => { const o = e.target.closest('[data-box]'); if (o && !o.dataset.arrastrado) sumarABox(o.dataset.box, o); delete o?.dataset.arrastrado; });
slotsEl.addEventListener('click', (e) => { const s = e.target.closest('[data-quitar]'); if (!s) return; caja.classList.remove('cerrada'); enCaja.splice(Number(s.dataset.quitar), 1); pintarSlots(); });
$('#boxVaciar').addEventListener('click', () => { enCaja = []; caja.classList.remove('cerrada'); pintarSlots(); });
// arrastrar a la caja (dedo o mouse)
(() => {
  let fantasma = null, origen = null, x0 = 0, y0 = 0, moviendo = false;
  $('#boxOpts').addEventListener('pointerdown', (e) => {
    const o = e.target.closest('[data-box]'); if (!o) return;
    origen = o; x0 = e.clientX; y0 = e.clientY; moviendo = false;
  });
  addEventListener('pointermove', (e) => {
    if (!origen) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!moviendo && Math.hypot(dx, dy) > 10) {
      moviendo = true; const b = BOX.find(x => x.id === origen.dataset.box);
      fantasma = document.createElement('span'); fantasma.className = 'volador'; fantasma.innerHTML = b.sinFoto ? '' : `<img src="${b.foto}" alt="">`;
      if (b.sinFoto) fantasma.style.background = 'var(--manteca)';
      document.body.appendChild(fantasma);
    }
    if (moviendo) { fantasma.style.left = (e.clientX - 28) + 'px'; fantasma.style.top = (e.clientY - 28) + 'px'; const r = caja.getBoundingClientRect(); caja.classList.toggle('apunta', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top - 40 && e.clientY < r.bottom); }
  });
  const soltar = (e) => {
    if (!origen) return;
    if (moviendo) {
      const r = caja.getBoundingClientRect();
      if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top - 40 && e.clientY < r.bottom) sumarABox(origen.dataset.box);
      origen.dataset.arrastrado = '1'; fantasma?.remove(); caja.classList.remove('apunta');
    }
    origen = null; fantasma = null; moviendo = false;
  };
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
})();
let dedicatoria = '';
$('#boxCerrar').addEventListener('click', () => {
  if (!kit || enCaja.length < 3) return;
  caja.classList.add('cerrada');
  dedicatoria = $('#dedicTxt').value.trim();
  const cuenta = {}; enCaja.forEach(id => { cuenta[id] = (cuenta[id] || 0) + 1; });
  setTimeout(() => {
    Object.entries(cuenta).forEach(([id, n]) => kit.carrito.agregar(id, n));
    notaPendiente = `Box para regalar (${enCaja.length} cosas)${dedicatoria ? ` · Dedicatoria: "${dedicatoria}"` : ''}`;
    kit.carrito.abrir();
    enCaja = []; pintarSlots(); setTimeout(() => caja.classList.remove('cerrada'), 1200);
  }, quieto ? 0 : 1100);
});
// la nota del box entra sola al checkout del kit
let notaPendiente = '';
new MutationObserver(() => {
  if (!notaPendiente) return;
  const ta = $('.kit-cart textarea[name="nota"]'); if (!ta) return;
  if (!ta.value) { ta.value = notaPendiente; ta.dispatchEvent(new Event('input', { bubbles: true })); }
  notaPendiente = '';
}).observe(document.body, { childList: true, subtree: true });

/* ---------------- tarjeta de fidelidad ---------------- */
let sellos = 0;
const MSG = ['Tocá para sellar', 'Primer café', 'Vas por el segundo', 'Ya van tres', 'Uno más y…', '¡Este va por la casa!'];
$('#tarjeta').addEventListener('click', () => {
  const ii = $$('#sellos i');
  if (sellos >= 5) { sellos = 0; ii.forEach(i => i.classList.remove('on')); $('#tarjetaMsg').textContent = 'Tarjeta nueva: tocá para sellar'; return; }
  ii[sellos].classList.add('on'); sellos++;
  $('#tarjetaMsg').textContent = MSG[sellos] + (sellos === 5 ? ' Tocá para empezar otra.' : '');
  if (navigator.vibrate) navigator.vibrate(sellos === 5 ? [20, 40, 20] : 12);
  if (sellos === 5) asomar('¡Café de regalo!');
});

/* ---------------- sin TACC / keto ---------------- */
$$('[data-lista]').forEach(b => b.addEventListener('click', () => {
  if (!kit) return;
  const tag = b.dataset.lista;
  const lista = productos.filter(p => (p.etiquetas || []).includes(tag) && p.disponible !== false);
  const box = document.createElement('div'); box.className = 'carta__kit lista-pop';
  box.innerHTML = `<p class="sec-cab" style="margin:0"><span style="font-size:15px;color:#5A3450">${lista.length} opciones en Brest ${esc(L.nombre)}.${tag === 'sintacc' ? ' Avisá al pedir para que lo preparen aparte.' : ''}</span></p>` +
    lista.map(p => `<article class="kit-item plato" data-id="${esc(p.id)}">${itemHTML(p)}</article>`).join('');
  popup({ titulo: tag === 'sintacc' ? 'Todo sin TACC' : 'Opciones keto', contenido: box, clase: 'kit-pop--resv' });
  kit.carrito.sync(box);
}));

/* ---------------- brunch ---------------- */
function pintarBrunch() {
  const ps = productos.filter(p => p.categoria === 'brunch');
  $('#brunchGrid').innerHTML = ps.map((p, i) => `<article class="bru">
    ${p.foto ? `<img src="img/g/brunch-${esc(p.id)}.webp" onerror="this.onerror=null;this.src='${esc(fotoDe(p))}'" alt="Brunch ${esc(p.nombre)}" loading="lazy" width="680" height="510">` : ''}
    <div class="bru__txt">
      <div class="bru__fila"><h3>${esc(p.nombre)}</h3><span class="plato__precio">${money(p.precio) || 'Consultar'}</span></div>
      ${(p.etiquetas || []).includes('sintacc') ? '<span class="tg" style="justify-self:start">SIN TACC</span>' : ''}
      <p>${esc(p.descripcion || '')}</p>
      <div class="bru__acc"><button type="button" class="btn btn--linea btn--chico" data-reservar="${esc(p.nombre)}">Reservar</button>${p.precio != null ? `<div data-kit-qty="${esc(p.id)}"></div>` : ''}</div>
    </div></article>`).join('');
  kit?.carrito.sync($('#brunchGrid'));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-reservar]'); if (!b || !kit?.reservas) return;
  e.preventDefault();
  kit.reservas.abrir();
  const cual = b.dataset.reservar;
  if (cual) requestAnimationFrame(() => { const ta = $('.kit-pop--resv textarea[name="comentario"]'); if (ta) { ta.value = `Brunch ${cual}`; ta.dispatchEvent(new Event('input', { bubbles: true })); } });
});

/* ---------------- conejito ---------------- */
const conejo = $('#conejo'); let tConejo = 0;
const FRASES = ['¡Buena elección!', '¡Qué rico!', 'Va a la bandeja', '¡Me encanta esa!'];
function asomar(txt) {
  if (quieto) return;
  $('#conejoGlobo').textContent = txt || FRASES[Math.floor(Math.random() * FRASES.length)];
  conejo.classList.remove('asoma'); void conejo.offsetWidth; conejo.classList.add('asoma');
  clearTimeout(tConejo); tConejo = setTimeout(() => conejo.classList.remove('asoma'), 2600);
}
let ultimo = 0;
document.addEventListener('kit:carrito', (e) => { if (e.detail.delta > 0 && performance.now() - ultimo > 3500) { ultimo = performance.now(); asomar(); } });

/* ---------------- kit ---------------- */
try {
  kit = await initKit({
    config: L.config,
    carta: { template: (p, c) => { ctx = ctx || c; return itemHTML(p); }, itemClass: 'plato' },
    carrito: { label: 'Tu bandeja', icono: '<svg viewBox="0 0 24 24"><path d="M4 14h16l-1.5 6h-13Z"/><path d="M6 14c0-4 2.7-7 6-7s6 3 6 7"/><path d="M12 7V4"/></svg>' },
    adminUrl: `admin/?local=${local}`,
  });
  ctx = kit;
  const est = kit.abierto();
  const chip = $('#estado');
  chip.classList.toggle('abierto', est.abierto);
  chip.lastChild.textContent = est.abierto ? `Abierto · hasta las ${est.cierra}` : `Cerrado · abre${est.abre ? ` a las ${est.abre}` : ' mañana a las 08:00'}`;
  pintarPizarraPrecios();
  kit.carrito.listo.then(() => { pintarBrunch(); kit.carrito.sync(); });
} catch (err) {
  console.error('[brest] kit', err);
}
