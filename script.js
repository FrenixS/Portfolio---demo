// Smooth scroll with custom easing
// Scrolls to a section slowly instead of jumping.
function smoothScrollTo(elementId) {
    // href="#" (placeholder project buttons) -> scroll to projects section
    if (elementId === '#') {
        elementId = '#projects';
    }

    const targetElement = document.querySelector(elementId);
    if (!targetElement) return;

    // Where to scroll to. The 70 is the header height, so the title is not hidden.
    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - 70; // fixed header offset
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 800;
    let startTime = null;

    // Easing: starts slow, speeds up, then slows down at the end.
    const easeInOutCubic = (t) =>
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

    // Runs every frame. Moves the page a bit until 800ms have passed.
    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const run = Math.min((currentTime - startTime) / duration, 1);
        window.scrollTo(0, startPosition + distance * easeInOutCubic(run));
        if (run < 1) requestAnimationFrame(animation);
    }

    requestAnimationFrame(animation);
}

// All in-page links (nav + buttons)
// Every link that starts with # uses the smooth scroll.
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        smoothScrollTo(this.getAttribute('href'));
    });
});

// Form submission handler
// Contact form: stops the real send, shows a message and clears the form.
document.getElementById('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Thank you for your message! In a real implementation, this would be sent to a server.');
    this.reset();
});

// Fade-in on scroll
// Wait until the page is loaded first.
document.addEventListener('DOMContentLoaded', function () {
    const sections = document.querySelectorAll('section');
    // Watches the sections. When 10% is visible, it adds the animate class.
    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('animate');
        });
    }, { threshold: 0.1 });
    sections.forEach(section => sectionObserver.observe(section));

    // Hide the cards at first so they can fade in.
    const cards = document.querySelectorAll('.project-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    // Shows each card when it comes into view.
    const cardObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    cards.forEach(card => cardObserver.observe(card));
});

// Forest background. Draws the trees on the #trees canvas.
(() => {
  // Get the canvas and read the tree colors from the CSS variables.
  const canvas = document.getElementById('trees');
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const far  = css.getPropertyValue('--tree-far').trim().split(',').map(Number);
  const near = css.getPropertyValue('--tree-near').trim().split(',').map(Number);

  // Makes random numbers from a seed. Same seed gives the same forest every time.
  function mulberry32(a) {
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Draws one pine tree. First the right side of each tier, then the left side.
  function pine(x, baseY, h, w, rnd) {
    const tiers = 5 + Math.floor(rnd() * 3);
    ctx.beginPath();
    ctx.moveTo(x, baseY - h);
    for (let i = 1; i <= tiers; i++) {
      const t = i / tiers;
      const y = baseY - h * (1 - t) - h * 0.04;
      const half = (w / 2) * t * (0.8 + rnd() * 0.25);
      ctx.lineTo(x + half, y);
      ctx.lineTo(x + half * 0.45, y - h * 0.02);
    }
    ctx.lineTo(x + w * 0.05, baseY);
    ctx.lineTo(x - w * 0.05, baseY);
    for (let i = tiers; i >= 1; i--) {
      const t = i / tiers;
      const y = baseY - h * (1 - t) - h * 0.04;
      const half = (w / 2) * t * (0.8 + rnd() * 0.25);
      ctx.lineTo(x - half * 0.45, y - h * 0.02);
      ctx.lineTo(x - half, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Draws the whole forest. 4 rows of trees: far ones are lighter, near ones are darker.
  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Seed 7 keeps the trees in the same places.
    const rnd = mulberry32(7);
    const rows = 4;
    const maxTreeH = Math.min(H * 0.34, 260);

    for (let r = 0; r < rows; r++) {
      const depth = r / (rows - 1);
      const rgb = far.map((c, i) => Math.round(c + (near[i] - c) * depth));
      const alpha = 0.35 + depth * 0.55;
      ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

      const baseY = H + 20 - (rows - 1 - r) * -0 - (1 - depth) * H * 0.04;
      const scale = 0.55 + depth * 0.45;
      const spacing = (34 + (1 - depth) * 10) * scale * 1.6;

      for (let x = -40 + rnd() * 20; x < W + 40; x += spacing * (0.6 + rnd() * 0.8)) {
        const h = maxTreeH * scale * (0.6 + rnd() * 0.55);
        const w = h * (0.34 + rnd() * 0.1);
        pine(x, baseY, h, w, rnd);
      }
    }

    // Fades the bottom of the trees out so they blend into the background.
    const fade = ctx.createLinearGradient(0, H - maxTreeH * 1.25, 0, H);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, H - maxTreeH * 1.25, W, maxTreeH * 1.25);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Draw once when the page loads.
  draw();
  let timer;
  // Draw again when the window size changes. The small wait stops it from running too often.
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(draw, 80);
  });
})();