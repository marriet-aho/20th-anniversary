/** One confetti burst from the centre of `origin` (the Post button). Lazy-loaded; caller skips it under reduced motion. */
export function burst(origin: HTMLElement): void {
  const b = origin.getBoundingClientRect(), ox = b.left + b.width / 2, oy = b.top + b.height / 2;
  const h = document.createElement('div');
  const C = ['#F58220', '#FFD9B3', '#fff', '#C25E08', '#FFB067'];
  h.setAttribute('aria-hidden', 'true');
  h.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:80;overflow:hidden';
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i'), z = 6 + Math.random() * 8, dx = (Math.random() - 0.5) * 640, up = 120 + Math.random() * 220;
    p.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${z}px;height:${z * 0.6}px;background:${C[i % 5]};`
      + `border-radius:${i % 3 ? '1px' : '50%'};box-shadow:0 0 0 1px rgba(0,0,0,.1)`;
    p.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.6}px,${-up}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${dx}px,${innerHeight - oy + 60}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }
    ], { duration: 1800 + Math.random() * 1400, easing: 'cubic-bezier(.25,.6,.4,1)', fill: 'forwards' });
    h.appendChild(p);
  }
  document.body.appendChild(h);
  window.setTimeout(() => h.remove(), 3400);
}
