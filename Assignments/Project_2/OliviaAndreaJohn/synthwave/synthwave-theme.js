(() => {
  const root = document.documentElement;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function updateScene() {
    const scrollY = window.scrollY;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight || 1;
    const t = Math.min(Math.max(scrollY / docHeight, 0), 1);

    // Sun movement – half set at bottom
    const sunOffset = t * 140;
    root.style.setProperty("--sun-offset", sunOffset + "px");

    // Sky colors: blend from magenta / pink to deeper red + navy
    const topR = lerp(76, 255, t);
    const topG = lerp(29, 99, t);
    const topB = lerp(149, 71, t);

    const bottomR = lerp(4, 15, t);
    const bottomG = lerp(0, 23, t);
    const bottomB = lerp(23, 56, t);

    root.style.setProperty(
      "--bg-top",
      `rgb(${topR.toFixed(0)}, ${topG.toFixed(0)}, ${topB.toFixed(0)})`
    );
    root.style.setProperty(
      "--bg-bottom",
      `rgb(${bottomR.toFixed(0)}, ${bottomG.toFixed(0)}, ${bottomB.toFixed(0)})`
    );

    // Sun color warms as it descends
    const core = `rgb(${lerp(255, 255, t).toFixed(0)}, ${lerp(247, 179, t).toFixed(
      0
    )}, ${lerp(204, 71, t).toFixed(0)})`;
    const mid = `rgb(${lerp(255, 230, t).toFixed(0)}, ${lerp(
      230,
      137,
      t
    ).toFixed(0)}, ${lerp(107, 60, t).toFixed(0)})`;
    const rim = `rgb(${lerp(249, 239, t).toFixed(0)}, ${lerp(
      115,
      68,
      t
    ).toFixed(0)}, ${lerp(22, 35, t).toFixed(0)})`;
    const glow = `rgba(${lerp(249, 239, t).toFixed(0)}, ${lerp(
      115,
      68,
      t
    ).toFixed(0)}, ${lerp(22, 35, t).toFixed(0)}, ${lerp(0.95, 0.65, t)})`;

    root.style.setProperty("--sun-core", core);
    root.style.setProperty("--sun-mid", mid);
    root.style.setProperty("--sun-rim", rim);
    root.style.setProperty("--sun-glow", glow);

    const sunOpacity = 0.88 - t * 0.32;
    root.style.setProperty("--sun-opacity", sunOpacity.toString());

    const glowOpacity = 0.95 - t * 0.55;
    root.style.setProperty("--glow-opacity", glowOpacity.toString());
  }

  updateScene();
  window.addEventListener("scroll", updateScene, { passive: true });
  window.addEventListener("resize", updateScene);

  // Section reveal on scroll
  const revealEls = document.querySelectorAll(".reveal-on-scroll");
  if (revealEls.length) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.35,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    revealEls.forEach((el) => observer.observe(el));
  }
})();

