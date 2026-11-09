// Custom cursor for mouse users: a yellow dot that sits exactly on the
// pointer and a HUD reticle that trails it. The reticle's tick marks spread
// with scroll speed and it opens up over buttons. Touch devices keep the
// system cursor and never see this.

const lerp = (a, b, t) => a + (b - a) * t;

export function createCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return null;

  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="cursor__ring"><i></i><i></i><i></i><i></i></div>
    <div class="cursor__dot"></div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('has-cursor');

  const ring = el.querySelector('.cursor__ring');
  const dot = el.querySelector('.cursor__dot');
  const p = { x: innerWidth / 2, y: innerHeight / 2 };
  const r = { x: p.x, y: p.y };
  let seen = false, spread = 0, angle = 0;

  addEventListener('pointermove', (e) => {
    p.x = e.clientX; p.y = e.clientY;
    if (!seen) { seen = true; r.x = p.x; r.y = p.y; el.classList.add('is-on'); }
    el.classList.toggle('is-hover', !!e.target.closest('button, a'));
  }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
  document.addEventListener('pointerenter', () => seen && el.classList.add('is-on'));
  addEventListener('pointerdown', () => el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));

  return {
    update(dt, speed) {
      const k = 1 - Math.exp(-dt * 18);
      r.x = lerp(r.x, p.x, k); r.y = lerp(r.y, p.y, k);
      spread = lerp(spread, speed, 1 - Math.exp(-dt * 10));
      angle += dt * (12 + speed * 360);
      dot.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      ring.style.transform = `translate3d(${r.x}px, ${r.y}px, 0) rotate(${angle % 360}deg)`;
      ring.style.setProperty('--spread', spread.toFixed(3));
    },
  };
}
