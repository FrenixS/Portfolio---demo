// FLUX — generative light layer (Pixi.js 7) that glows over the forest background.
(() => {
  // Stop if something is missing: Pixi, WebGL or the #flux div. Each one logs a warning.
  if (!window.PIXI) { console.warn('[FLUX] Pixi.js did not load (check your internet connection / the CDN script tag).'); return; }
  if (!PIXI.utils.isWebGLSupported()) { console.warn('[FLUX] WebGL is not available in this browser.'); return; }
  const host = document.getElementById('flux');
  if (!host) { console.warn('[FLUX] <div id="flux"></div> is missing from index.html.'); return; }
  // Reduced-motion users get a calmer, slower, lighter version instead of nothing.
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Makes the Pixi app. It fills the window. The resolution is capped to keep it fast.
  const app = new PIXI.Application({
    resizeTo: window, backgroundColor: 0x000000, antialias: false,
    resolution: Math.min(window.devicePixelRatio || 1, 1.5), autoDensity: true, powerPreference: 'high-performance'
  });
  host.appendChild(app.view);
  // R is short for renderer. W and H are the screen size.
  const R = app.renderer;
  let W = app.screen.width, H = app.screen.height;

  // soft glow sprite
  const gc = document.createElement('canvas'); gc.width = gc.height = 64;
  const g2 = gc.getContext('2d'), grd = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.25, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = grd; g2.fillRect(0, 0, 64, 64);
  const glow = PIXI.Texture.from(gc);

  // feedback buffer (black = transparent once the canvas is blended with mix-blend-mode: screen)
  // An off-screen picture. Each frame draws on top of the last one, so particles leave trails.
  const rt = PIXI.RenderTexture.create({ width: W, height: H, resolution: 1 });
  const fade = new PIXI.Graphics();
  const drawFade = () => fade.clear().beginFill(0x000000, 1).drawRect(0, 0, W, H).endFill();
  const clearRT = () => { fade.alpha = 1; R.render(fade, { renderTexture: rt, clear: true }); };
  drawFade(); clearRT();

  // Two sprites show the same picture. The second one is blurred and added on top for a glow.
  const base = new PIXI.Sprite(rt), bloom = new PIXI.Sprite(rt);
  const blur = new PIXI.BlurFilter(14, 3); blur.resolution = 0.5;
  bloom.filters = [blur]; bloom.blendMode = PIXI.BLEND_MODES.ADD; bloom.alpha = 0.9;
  app.stage.addChild(base, bloom);

  // particles
  // Number of particles. Fewer in calm mode and on small screens.
  const N = calm ? 1500 : (Math.min(W, H) < 700 ? 2500 : 5500);
  const pc = new PIXI.ParticleContainer(N, { position: true, tint: true });
  pc.blendMode = PIXI.BLEND_MODES.ADD;
  // Arrays for sprites, x, y, speed x, speed y, age, max age and hue shift.
  const sp = [], px = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N),
        life = new Float32Array(N), max = new Float32Array(N), hs = new Float32Array(N);
  // Puts a particle at a random spot and gives it a new lifetime.
  function respawn(i, first) {
    px[i] = Math.random() * W; py[i] = Math.random() * H; vx[i] = vy[i] = 0;
    max[i] = 180 + Math.random() * 420; life[i] = first ? Math.random() * max[i] : 0;
  }
  // Create all the particles.
  for (let i = 0; i < N; i++) {
    const s = new PIXI.Sprite(glow); s.anchor.set(.5); s.scale.set(.1 + Math.random() * .22);
    sp.push(s); pc.addChild(s); hs[i] = Math.random(); respawn(i, true);
  }

  // colour — default palette matches the site's cyan accent
  // Turns a hue into a color number that Pixi can use.
  function hsl(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
  }
  // Lookup table with one color per hue (0 to 359). Saves calculating it every frame.
  const LUT = []; for (let h = 0; h < 360; h++) LUT.push(hsl(h, 1, .58));
  // Color palettes. b is the base hue, s is how much the colors spread.
  const PALS = [{ b: 185, s: 150 }, { b: 335, s: 90 }, { b: 80, s: 120 }, { b: 235, s: 120 }, { b: 20, s: 50 }];
  // pi is the current palette. cb and cs slowly move toward it.
  let pi = 0, cb = PALS[0].b, cs = PALS[0].s;
  const nextPal = () => { pi = (pi + 1) % PALS.length; };

  // flow field
  // t is time. It moves the flow field.
  let t = 0;
  // Flow field. Gives an angle for each spot, and particles move in that direction.
  const flow = (x, y) => 1.6 * (Math.sin(x * .0021 + t * 1.3) + Math.cos(y * .0027 - t) + 1.2 * Math.sin((x + y) * .0013 + t * .7)
    + Math.cos(Math.hypot(x - W / 2, y - H / 2) * .004 - t * 1.5));

  // input — listens on the window so it works through the page content
  // Pointer position. down is true while the button is held.
  let mx = W / 2, my = H / 2, down = false, lastInput = -1e9;
  const rings = [], ringG = new PIXI.Graphics(); ringG.blendMode = PIXI.BLEND_MODES.ADD;
  // Saves the pointer position and the time of the last input.
  const setP = e => { mx = e.clientX; my = e.clientY; lastInput = performance.now(); };
  window.addEventListener('pointermove', setP);
  // Pressing starts the pull. Links, buttons and form fields are ignored.
  window.addEventListener('pointerdown', e => { setP(e); if (!e.target.closest('a,button,input,textarea,label,header')) { down = true; document.body.classList.add('flux-holding'); window.getSelection().removeAllRanges(); } });
  // No text selecting while holding.
  window.addEventListener('selectstart', e => { if (down) e.preventDefault(); });
  // On release: add a ring and push nearby particles away.
  function release() {
    if (!down) return; down = false; document.body.classList.remove('flux-holding'); rings.push({ x: mx, y: my, r: 10, a: 1 });
    for (let i = 0; i < N; i++) {
      const dx = px[i] - mx, dy = py[i] - my, d = Math.hypot(dx, dy) + .01;
      if (d < 520) { const f = (1 - d / 520) * 22; vx[i] += dx / d * f; vy[i] += dy / d * f; }
    }
  }
  window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
  // Press C to change the palette. Ignored while typing.
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) nextPal();
  });

  // fade the layer as you scroll down so text stays readable
  // Fades the light as you scroll so the text is easier to read.
  const onScroll = () => { host.style.opacity = Math.max(.35, 1 - window.scrollY / (window.innerHeight * 1.2)); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Resize the picture buffer when the window size changes.
  R.on('resize', () => { W = app.screen.width; H = app.screen.height; rt.resize(W, H); drawFade(); clearRT(); });

  // Log message to check that it runs.
  console.info('[FLUX] running with ' + N + ' particles' + (calm ? ' (calm mode: reduced motion is on)' : ''));
  const wrap = new PIXI.Container(); wrap.addChild(ringG);
  // Main loop. Runs every frame.
  app.ticker.add(delta => {
    // Move time forward. Slower in calm mode.
    t += (calm ? 0.0012 : 0.0035) * delta;
    // If there is no input for 2.5 seconds, the point moves around by itself.
    if (performance.now() - lastInput > 2500 && !down) { mx = W / 2 + Math.cos(t * 5.1) * W * .32; my = H / 2 + Math.sin(t * 7.3) * H * .28; }
    // Slowly blend the colors toward the chosen palette.
    cb += (PALS[pi].b - cb) * .03; cs += (PALS[pi].s - cs) * .03;

    // Holding makes the area bigger and the swirl stronger, and adds a pull.
    const rad = down ? 380 : 230, swirl = down ? .55 : .32, pull = down ? 1.15 : 0;
    for (let i = 0; i < N; i++) {
      // Update each particle: flow push, pointer swirl, friction, speed limit, then move.
      let x = px[i], y = py[i];
      const a = flow(x, y);
      vx[i] += Math.cos(a) * .09; vy[i] += Math.sin(a) * .09;
      // If the particle is close to the pointer, it swirls around it. It gets pulled in when held.
      const dx = mx - x, dy = my - y, d2 = dx * dx + dy * dy;
      if (d2 < rad * rad) {
        const d = Math.sqrt(d2) + .001, f = 1 - d / rad;
        vx[i] += (-dy / d) * f * swirl + (dx / d) * f * pull;
        vy[i] += (dx / d) * f * swirl + (dy / d) * f * pull;
      }
      // Friction slows the particle down.
      vx[i] *= .955; vy[i] *= .955;
      const v2 = vx[i] * vx[i] + vy[i] * vy[i];
      // Speed limit.
      if (v2 > 100) { const k = 10 / Math.sqrt(v2); vx[i] *= k; vy[i] *= k; }
      x += vx[i]; y += vy[i]; px[i] = x; py[i] = y;
      // Age the particle. Respawn it if it is old or off screen.
      if (++life[i] > max[i] || x < -20 || x > W + 20 || y < -20 || y > H + 20) respawn(i, false);
      const s = sp[i];
      s.x = px[i]; s.y = py[i];
      // Fade in and out over its life, then pick its color from the hue table.
      s.alpha = Math.sin(Math.PI * life[i] / max[i]) * .5;
      s.tint = LUT[((cb + cs * (.5 + .5 * Math.sin(a + hs[i] * 6.283)) + t * 40) % 360) | 0];
    }

    // Draw the rings from releases. They grow and fade out.
    ringG.clear();
    for (let k = rings.length - 1; k >= 0; k--) {
      const r = rings[k]; r.r += 14 * delta; r.a -= .02 * delta;
      if (r.a <= 0) { rings.splice(k, 1); continue; }
      ringG.lineStyle(3, LUT[(cb + cs * .5) % 360 | 0], r.a * .8).drawCircle(r.x, r.y, r.r);
    }

    // Dim the old picture a little so trails fade, then draw the particles and rings on it.
    fade.alpha = .1; R.render(fade, { renderTexture: rt, clear: false });
    R.render(pc, { renderTexture: rt, clear: false });
    R.render(wrap, { renderTexture: rt, clear: false });
  });
})();
