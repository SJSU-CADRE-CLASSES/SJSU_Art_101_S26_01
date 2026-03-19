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

  // Procedural wireframe preview renders (hub cards only)
  const wireTargets = document.querySelectorAll("[data-wire]");
  if (wireTargets.length) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const project = (p, rotY, rotX, dist) => {
      // rotate Y
      let x = p[0];
      let y = p[1];
      let z = p[2];
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);

      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;

      // rotate X
      const y2 = y * cx - z1 * sx;
      const z2 = y * sx + z1 * cx;

      const k = dist / (dist + z2);
      return [x1 * k, y2 * k, k];
    };

    const shapes = {
      token: () => {
        const pts = [];
        const edges = [];
        const rings = 22;
        for (let i = 0; i < rings; i++) {
          const a = (i / rings) * Math.PI * 2;
          pts.push([Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0]);
          edges.push([i, (i + 1) % rings]);
        }
        const inner = pts.length;
        for (let i = 0; i < rings; i++) {
          const a = (i / rings) * Math.PI * 2;
          pts.push([Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.18]);
          edges.push([inner + i, inner + ((i + 1) % rings)]);
          edges.push([i, inner + i]);
        }
        return { pts, edges };
      },
      house: () => {
        const pts = [
          [-1.4, -0.9, -0.9],
          [1.4, -0.9, -0.9],
          [1.4, 0.9, -0.9],
          [-1.4, 0.9, -0.9],
          [-1.4, -0.9, 0.9],
          [1.4, -0.9, 0.9],
          [1.4, 0.9, 0.9],
          [-1.4, 0.9, 0.9],
          [0, 1.6, -0.9],
          [0, 1.6, 0.9],
        ];
        const edges = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [4, 5],
          [5, 6],
          [6, 7],
          [7, 4],
          [0, 4],
          [1, 5],
          [2, 6],
          [3, 7],
          [3, 8],
          [2, 8],
          [7, 9],
          [6, 9],
          [8, 9],
        ];
        return { pts, edges };
      },
      shirt: () => {
        const pts = [
          [-1.2, 1.0, 0],
          [1.2, 1.0, 0],
          [0.9, -1.2, 0],
          [-0.9, -1.2, 0],
          [-1.7, 0.35, 0],
          [-1.2, 0.1, 0],
          [1.2, 0.1, 0],
          [1.7, 0.35, 0],
          [-0.35, 1.0, 0.25],
          [0.35, 1.0, 0.25],
        ];
        const edges = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [0, 4],
          [4, 5],
          [5, 0],
          [1, 7],
          [7, 6],
          [6, 1],
          [8, 9],
          [8, 0],
          [9, 1],
        ];
        return { pts, edges };
      },
      bowl: () => {
        const pts = [];
        const edges = [];
        const rings = 18;
        for (let i = 0; i <= rings; i++) {
          const t = i / rings;
          const r = 1.3 * (1 - t * 0.35);
          const y = -0.9 + t * 1.6;
          const segs = 24;
          const base = pts.length;
          for (let j = 0; j < segs; j++) {
            const a = (j / segs) * Math.PI * 2;
            pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
            edges.push([base + j, base + ((j + 1) % segs)]);
            if (i > 0) edges.push([base + j, base + j - segs]);
          }
        }
        return { pts, edges };
      },
      news: () => {
        const pts = [
          [-1.6, 1.1, 0],
          [1.6, 1.1, 0],
          [1.6, -1.1, 0],
          [-1.6, -1.1, 0],
          [-1.2, 0.55, 0.15],
          [1.2, 0.55, 0.15],
          [1.2, 0.05, 0.15],
          [-1.2, 0.05, 0.15],
          [-1.2, -0.35, 0.15],
          [0.6, -0.35, 0.15],
        ];
        const edges = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [4, 5],
          [5, 6],
          [6, 7],
          [7, 4],
          [8, 9],
        ];
        return { pts, edges };
      },
    };

    const palette = {
      lifestyle: { a: "rgba(70,245,255,0.92)", b: "rgba(255,55,185,0.82)" },
      shopping: { a: "rgba(255,55,185,0.9)", b: "rgba(141,114,255,0.84)" },
      food: { a: "rgba(255,230,107,0.92)", b: "rgba(70,245,255,0.78)" },
      news: { a: "rgba(70,245,255,0.85)", b: "rgba(255,55,185,0.75)" },
      token: { a: "rgba(255,230,107,0.95)", b: "rgba(70,245,255,0.68)" },
    };

    const instances = [];
    for (const el of wireTargets) {
      const kind = el.getAttribute("data-wire") || "news";
      const canvas = document.createElement("canvas");
      el.prepend(canvas);
      const ctx = canvas.getContext("2d");
      const shape =
        kind === "lifestyle"
          ? shapes.house()
          : kind === "shopping"
            ? shapes.shirt()
            : kind === "food"
              ? shapes.bowl()
              : kind === "token"
                ? shapes.token()
                : shapes.news();

      instances.push({ el, canvas, ctx, kind, shape, t: Math.random() * 1000 });
    }

    function resizeOne(inst) {
      const rect = inst.el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (inst.canvas.width !== w || inst.canvas.height !== h) {
        inst.canvas.width = w;
        inst.canvas.height = h;
      }
    }

    function draw(inst, timeMs) {
      const { ctx, canvas, kind, shape } = inst;
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return;

      const pal = palette[kind] || palette.news;

      ctx.clearRect(0, 0, w, h);

      // Background gradient
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "rgba(8, 0, 30, 0.92)");
      g.addColorStop(1, "rgba(2, 6, 23, 0.92)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Grid floor cue
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(70,245,255,0.16)";
      const gridY = h * 0.68;
      for (let i = 0; i < 14; i++) {
        const y = gridY + i * (h * 0.03);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,55,185,0.12)";
      for (let i = 0; i < 16; i++) {
        const x = (i / 15) * w;
        ctx.beginPath();
        ctx.moveTo(x, gridY);
        ctx.lineTo(w * 0.5 + (x - w * 0.5) * 0.15, h);
        ctx.stroke();
      }
      ctx.restore();

      // Wireframe shape
      const t = timeMs * 0.001 + inst.t;
      const rotY = t * 0.8;
      const rotX = -0.18 + Math.sin(t * 0.7) * 0.06;
      const dist = 4.2;

      const centerX = w * 0.5;
      const centerY = h * 0.54;
      const scale = Math.min(w, h) * 0.16;

      const proj = shape.pts.map((p) => project(p, rotY, rotX, dist));

      // Glow pass
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = pal.b;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (const e of shape.edges) {
        const a = proj[e[0]];
        const b = proj[e[1]];
        const ax = centerX + a[0] * scale;
        const ay = centerY - a[1] * scale;
        const bx = centerX + b[0] * scale;
        const by = centerY - b[1] * scale;
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.restore();

      // Main pass
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = pal.a;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const e of shape.edges) {
        const a = proj[e[0]];
        const b = proj[e[1]];
        const depth = clamp((a[2] + b[2]) * 0.5, 0.25, 1.2);
        const ax = centerX + a[0] * scale;
        const ay = centerY - a[1] * scale;
        const bx = centerX + b[0] * scale;
        const by = centerY - b[1] * scale;
        ctx.globalAlpha = 0.55 + depth * 0.35;
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.restore();

      // Subtle glitch slice
      if (Math.sin(t * 1.7) > 0.96) {
        const sliceY = Math.floor(h * (0.34 + Math.random() * 0.32));
        const sliceH = Math.floor(h * 0.035);
        ctx.globalAlpha = 0.25;
        ctx.drawImage(canvas, 0, sliceY, w, sliceH, Math.floor(w * 0.01), sliceY, w, sliceH);
        ctx.globalAlpha = 1;
      }
    }

    function tick(timeMs) {
      for (const inst of instances) {
        resizeOne(inst);
        draw(inst, timeMs);
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    window.addEventListener("resize", () => {
      for (const inst of instances) resizeOne(inst);
    });
  }
})();

