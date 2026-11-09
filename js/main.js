import { STAGES, TRANSFORM_FRAME, NIGHT } from './config.js';
import { FrameSequence } from './frames.js';
import { Sound } from './audio.js';
import { buildUI, tuneIn } from './ui.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

buildUI();

const track = document.getElementById('track');
const frameCanvas = document.getElementById('frame');
const flash = document.getElementById('flash');
const speedoNum = document.getElementById('speedoNum');
const speedoFill = document.getElementById('speedoFill');
const loader = document.getElementById('loader');
const loaderNum = document.getElementById('loaderNum');
const soundBtn = document.getElementById('soundBtn');
const cards = [...document.querySelectorAll('.card')];
const stepEls = [...document.querySelectorAll('#steps li')];

// ---------- frames ----------
const manifest = await fetch('frames/manifest.json').then((r) => r.json());
const mobile = Math.min(innerWidth, innerHeight * 1.78) <= 760;
const seq = new FrameSequence(frameCanvas, { dir: mobile ? 'frames/mobile' : 'frames/desktop', count: manifest.count });
seq.load((p) => {
  loaderNum.textContent = Math.round(p * 100);
  if (p >= 1) loader.classList.add('is-done');
});

// ---------- dust (optional: skipped if WebGL is unavailable) ----------
let dust = null;
if (!reduced) {
  try { const { Dust } = await import('./dust.js'); dust = new Dust(document.getElementById('dust')); }
  catch (e) { console.warn('Dust layer disabled:', e); }
}

// ---------- sound ----------
const sound = new Sound();
async function setSound(on) {
  if (on) await sound.enable(); else sound.disable();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.querySelector('.sound__label').textContent = on ? 'Sound on' : 'Sound off';
  const heroBtn = document.getElementById('heroSound');
  if (heroBtn) heroBtn.textContent = on ? 'Sound is on' : 'Turn on sound';
}
soundBtn.addEventListener('click', () => setSound(!sound.on));
document.getElementById('heroSound').addEventListener('click', () => setSound(!sound.on));

// ---------- smooth scroll ----------
let lenis = null;
if (!reduced && window.Lenis) lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
document.getElementById('replay').addEventListener('click', () => {
  if (lenis) lenis.scrollTo(0, { duration: 2.4 }); else scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
});

// ---------- pointer (headlights + camera tilt) ----------
const pointer = { x: innerWidth * 0.5, y: innerHeight * 0.55, nx: 0, ny: 0, last: -1e9 };
const light = { x: pointer.x, y: pointer.y };
addEventListener('pointermove', (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.last = performance.now();
  pointer.nx = (e.clientX / innerWidth) * 2 - 1; pointer.ny = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

// ---------- scroll -> frame ----------
function progress() {
  const max = track.offsetHeight - innerHeight;
  return clamp((lenis ? lenis.scroll : scrollY) / Math.max(1, max));
}
function stageAt(p) { return STAGES.find((s) => p >= s.p[0] && p < s.p[1]) || STAGES[STAGES.length - 1]; }
function frameAt(p) {
  const s = stageAt(p);
  const t = clamp((p - s.p[0]) / (s.p[1] - s.p[0]));
  return Math.min(manifest.count - 1, lerp(s.f[0], s.f[1], t));
}

// ---------- state ----------
let stageId = null;
let lastFrame = 0;
let speed = 0;           // smoothed 0..1
let lastScroll = 0;
let shakeAmt = 0;
let last = performance.now();

function setStage(id) {
  if (id === stageId) return;
  stageId = id;
  document.body.dataset.stage = id;
  for (const c of cards) {
    const on = c.dataset.stage === id;
    c.classList.toggle('is-active', on);
    if (on && c.closest('.radio')) tuneIn(c, sound, reduced);
  }
}

function onTransform() {
  flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on');
  sound.transform();
  dust?.burst();
  if (!reduced) shakeAmt = 1;
}

addEventListener('resize', () => { seq.resize(); dust?.resize(); });

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  lenis?.raf(now);

  const p = progress();
  const s = stageAt(p);
  setStage(s.id);

  // Scroll speed: pixels moved per second, normalised and smoothed.
  const y = lenis ? lenis.scroll : scrollY;
  const raw = clamp(Math.abs(y - lastScroll) / Math.max(dt, 1e-3) / 3500);
  lastScroll = y;
  speed = lerp(speed, raw, raw > speed ? 0.25 : 0.06);

  const f = frameAt(p);
  if (lastFrame < TRANSFORM_FRAME && f >= TRANSFORM_FRAME) onTransform();
  lastFrame = f;

  // Step indicator fill.
  for (const li of stepEls) {
    const st = STAGES.find((x) => x.id === li.dataset.stage);
    li.style.setProperty('--fill', clamp((p - st.p[0]) / (st.p[1] - st.p[0])).toFixed(3));
    li.classList.toggle('is-active', li.dataset.stage === s.id);
  }

  // Night fades out as the drive goes on. Headlights follow the cursor,
  // or sweep on their own when the pointer has been idle (and on touch).
  const night = reduced ? 0 : NIGHT.depth * (1 - smooth(NIGHT.full, NIGHT.gone, p));
  const idle = now - pointer.last > 2500;
  const tx = idle ? innerWidth * (0.5 + Math.sin(now / 1400) * 0.28) : pointer.x;
  const ty = idle ? innerHeight * (0.58 + Math.cos(now / 1900) * 0.08) : pointer.y;
  light.x = lerp(light.x, tx, 0.18); light.y = lerp(light.y, ty, 0.18);

  shakeAmt *= Math.exp(-dt * 3.2);
  const jitter = reduced ? 0 : shakeAmt * 14 + speed * 2.5;
  const shake = { x: (Math.random() - 0.5) * jitter, y: (Math.random() - 0.5) * jitter };

  seq.draw(f, { blur: reduced ? 0 : speed, night, light, shake });

  // Speedometer reads your scroll. Robot mode caps it lower: he runs, he doesn't race.
  const top = s.id === 'robot' || s.id === 'outro' ? 60 : 260;
  const kmh = Math.round(speed * top);
  speedoNum.textContent = String(kmh).padStart(3, '0');
  speedoFill.style.strokeDashoffset = String(157.08 * (1 - kmh / 260));

  const car = s.id === 'hero' || s.id === 'drive' ? 1 : s.id === 'transform' ? 1 - clamp((f - TRANSFORM_FRAME) / 10) : 0;
  sound.update(speed, car);

  const density = s.id === 'outro' ? 0.25 : s.id === 'hero' ? 0.6 : 1;
  dust?.update(dt, { speed, mouse: { x: pointer.nx, y: pointer.ny }, density });

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Handy for testing: window.__b127.go(0.5) jumps to the middle of the scroll.
window.__b127 = {
  go(p) { const y = p * (track.offsetHeight - innerHeight); lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); },
  state: () => ({ stage: stageId, frame: lastFrame, speed, loaded: seq.loadedCount }),
};
