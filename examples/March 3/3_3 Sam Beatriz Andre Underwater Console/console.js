/**
 * Navigation Console — Clickable fingers, sonar ripple reveals environment image
 */

document.addEventListener('DOMContentLoaded', () => {
  AudioSystem.init();

  const sonarOverlay = document.getElementById('sonar-overlay');
  const sonarCanvas = document.getElementById('sonar-canvas');
  const ctx = sonarCanvas.getContext('2d');

  const SONAR_IMAGE = new Image();
  SONAR_IMAGE.src = 'medievalenvwireframe.webp';

  const DIR_TONES = {
    nw: [392, 494],
    n: [440, 554],
    ne: [494, 587],
    w: [349, 440],
    center: [523],
    e: [587, 698],
    sw: [330, 392],
    s: [392, 494],
    se: [440, 523],
  };

  function resizeCanvas() {
    sonarCanvas.width = window.innerWidth;
    sonarCanvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function drawRippleReveal(progress) {
    const w = sonarCanvas.width;
    const h = sonarCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!SONAR_IMAGE.complete || !SONAR_IMAGE.naturalWidth) return;

    // Ripple starts from bottom center
    const cx = w / 2;
    const cy = h;
    const maxRadius = Math.sqrt(cx * cx + cy * cy) * 1.1;

    // Phase: 0-0.4 = ripple expand, 0.4+ = full reveal
    const rippleProgress = Math.min(1, progress * 2.5);
    const rippleRadius = maxRadius * rippleProgress;

    // Alpha: fade in during reveal, hold when full, then fade out (handled by overlay opacity)
    const alpha = rippleProgress >= 1 ? 1 : Math.min(1, progress * 4);

    ctx.save();

    ctx.globalAlpha = alpha;
    ctx.drawImage(SONAR_IMAGE, 0, 0, w, h);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (rippleProgress < 1) {
      ctx.strokeStyle = `rgba(74, 179, 209, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function triggerSonarPing() {
    sonarOverlay.classList.add('visible');
    sonarOverlay.style.opacity = '0';
    sonarOverlay.setAttribute('aria-hidden', 'false');

    const RIPPLE_DURATION = 800;
    const HOLD_DURATION = 400;
    const FADE_DURATION = 1500;
    const TOTAL = RIPPLE_DURATION + HOLD_DURATION + FADE_DURATION;

    let start = null;
    function animate(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      if (elapsed >= TOTAL) {
        sonarOverlay.classList.remove('visible');
        sonarOverlay.style.opacity = '';
        sonarOverlay.setAttribute('aria-hidden', 'true');
        return;
      }

      const progress = elapsed / TOTAL;

      // Ripple phase (0-800ms): progress 0 to ~0.27
      // Hold phase (800-1200ms): full reveal
      // Fade phase (1200-2700ms): slowly fade out
      const rippleProgress = Math.min(1, elapsed / RIPPLE_DURATION);
      const fadeStart = (RIPPLE_DURATION + HOLD_DURATION) / TOTAL;
      const fadeProgress = progress >= fadeStart ? (progress - fadeStart) / (FADE_DURATION / TOTAL) : 0;
      const fadeOut = 1 - Math.min(1, fadeProgress);

      sonarOverlay.style.opacity = String(Math.min(1, rippleProgress * 3) * fadeOut);
      drawRippleReveal(Math.min(1, rippleProgress));
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  document.querySelectorAll('.finger').forEach((finger) => {
    finger.addEventListener('click', (e) => {
      e.stopPropagation();
      const dir = finger.dataset.dir;
      const freqs = DIR_TONES[dir] || [440];
      AudioSystem.playNavTone(freqs);
      AudioSystem.playSonarPing();
      triggerSonarPing();
    });
  });

  AudioSystem.playChime([523, 659, 784]);
});
