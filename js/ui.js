// Builds the hero, side panels, outro and step indicator from config.js,
// and runs the radio "tuning" effect when a stage becomes active.
import { HERO, PANELS, OUTRO, RADIO_NOTE } from './config.js';

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GLYPHS = '#%&*+=?@ABCDEFGHJKLMNPRSTUVWXYZ0123456789/<>';
const DIAL = [88, 108]; // FM band shown on the dial

export function buildUI() {
  const hero = document.getElementById('hero');
  hero.innerHTML = `
    <p class="kicker">${esc(HERO.kicker)}</p>
    <h1 class="hero__title">${esc(HERO.title).replace('stand up.', '<em>stand up.</em>')}</h1>
    <p class="hero__sub">${esc(HERO.sub)}</p>
    <div class="hero__row">
      <button class="hero__sound" id="heroSound" type="button">${esc(HERO.sound)}</button>
      <span class="hero__hint">${esc(HERO.hint)}</span>
    </div>`;

  const left = document.getElementById('panelLeft');
  const right = document.getElementById('panelRight');
  const steps = document.getElementById('steps');
  for (const [id, p] of Object.entries(PANELS)) {
    left.insertAdjacentHTML('beforeend', `
      <article class="card" data-stage="${id}">
        <div class="spec__head" style="--i:0"><span class="spec__num">${p.num}</span>${esc(p.label)}</div>
        <h2 class="spec__title" style="--i:1">${esc(p.title)}</h2>
        <p class="spec__body" style="--i:2">${esc(p.body)}</p>
        <table class="spec__table" style="--i:3"><tbody>
          ${p.specs.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
        </tbody></table>
      </article>`);

    right.insertAdjacentHTML('beforeend', `
      <article class="card" data-stage="${id}">
        <div class="radio__note" style="--i:0">${esc(RADIO_NOTE)}</div>
        <div class="dial" style="--i:1">
          <div class="dial__ticks"></div>
          <div class="dial__labels">${[88, 92, 96, 100, 104, 108].map((n) => `<span>${n}</span>`).join('')}</div>
          <div class="dial__needle"></div>
          <div class="dial__readout"></div>
        </div>
        <div class="clips" style="--i:2">
          ${p.radio.map((c) => `
            <div class="clip clip--${c.font}" data-freq="${c.freq}" data-band="${c.band}">
              <span class="clip__freq">${c.band} ${c.freq}</span>
              <span class="clip__text" data-text="${esc(c.text)}">${esc(c.text)}</span>
            </div>`).join('')}
        </div>
      </article>`);

    steps.insertAdjacentHTML('beforeend', `<li data-stage="${id}"><b>${p.num}</b>${esc(p.label)}</li>`);
  }

  document.getElementById('outro').innerHTML = `
    <p class="kicker">${esc(OUTRO.kicker)}</p>
    <h2 class="outro__title">${esc(OUTRO.title)}</h2>
    <p class="outro__body">${esc(OUTRO.body)}</p>
    <button class="outro__cta" id="replay" type="button">${esc(OUTRO.cta)}</button>
    <p class="outro__legal">${esc(OUTRO.legal)}</p>`;
}

// Radio clips appear one at a time: the needle swings to the station,
// the text scrambles in through static, and a blip plays if sound is on.
export function tuneIn(card, sound, reduced) {
  const clips = [...card.querySelectorAll('.clip')];
  const needle = card.querySelector('.dial__needle');
  const readout = card.querySelector('.dial__readout');
  const token = Symbol(); card._tune = token;

  clips.forEach((c) => {
    c.style.visibility = 'hidden';
    const t = c.querySelector('.clip__text'); t.textContent = t.dataset.text;
  });

  clips.forEach((clip, n) => {
    setTimeout(() => {
      if (card._tune !== token || !card.classList.contains('is-active')) return;
      const { freq, band } = clip.dataset;
      const fm = band === 'FM' ? parseFloat(freq) : DIAL[0] + (parseFloat(freq) % 20);
      needle.style.setProperty('--pos', `${((fm - DIAL[0]) / (DIAL[1] - DIAL[0])) * 100}%`);
      readout.textContent = `${band} ${freq}`;
      clip.style.visibility = 'visible';
      sound.radio();
      if (reduced) return;
      const el = clip.querySelector('.clip__text');
      const target = el.dataset.text;
      clip.classList.add('is-tuning');
      let frame = 0;
      const total = 14;
      const tick = () => {
        if (card._tune !== token) return;
        frame++;
        const reveal = Math.floor((frame / total) * target.length);
        el.textContent = target.split('').map((ch, k) =>
          k < reveal || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
        if (frame < total) setTimeout(tick, 30);
        else { el.textContent = target; clip.classList.remove('is-tuning'); }
      };
      tick();
    }, 350 + n * 520);
  });
}
