(() => {
  const grid = document.getElementById("news-grid");
  const loading = document.getElementById("news-loading");
  if (!grid || !loading) return;

  const clamp = (v, a2, b2) => Math.max(a2, Math.min(b2, v));

  const project = (p, rotY, rotX, dist) => {
    let x = p[0];
    let y = p[1];
    let z = p[2];
    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);

    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;

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
        const ang = (i / rings) * Math.PI * 2;
        pts.push([Math.cos(ang) * 1.2, Math.sin(ang) * 1.2, 0]);
        edges.push([i, (i + 1) % rings]);
      }
      const inner = pts.length;
      for (let i = 0; i < rings; i++) {
        const ang = (i / rings) * Math.PI * 2;
        pts.push([Math.cos(ang) * 0.7, Math.sin(ang) * 0.7, 0.18]);
        edges.push([inner + i, inner + ((i + 1) % rings)]);
        edges.push([i, inner + i]);
      }
      return { pts, edges };
    },
    camera: () => {
      const pts = [
        [-1.2, -0.6, -0.8],
        [1.2, -0.6, -0.8],
        [1.2, 0.6, -0.8],
        [-1.2, 0.6, -0.8],
        [-1.2, -0.6, 0.8],
        [1.2, -0.6, 0.8],
        [1.2, 0.6, 0.8],
        [-1.2, 0.6, 0.8],
        [0, 0, 1.25],
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
        [4, 8],
        [5, 8],
        [6, 8],
        [7, 8],
      ];
      return { pts, edges };
    },
    bowl: () => {
      const pts = [];
      const edges = [];
      const rings = 12;
      for (let i = 0; i <= rings; i++) {
        const t = i / rings;
        const r = 1.2 * (1 - t * 0.35);
        const y = -0.9 + t * 1.5;
        const segs = 20;
        const base = pts.length;
        for (let j = 0; j < segs; j++) {
          const ang = (j / segs) * Math.PI * 2;
          pts.push([Math.cos(ang) * r, y, Math.sin(ang) * r]);
          edges.push([base + j, base + ((j + 1) % segs)]);
          if (i > 0) edges.push([base + j, base + j - segs]);
        }
      }
      return { pts, edges };
    },
    monorail: () => {
      const pts = [];
      const edges = [];
      const segs = 30;
      for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        pts.push([-1.6 + 3.2 * t, Math.sin(t * Math.PI) * 0.8, 0]);
        if (i > 0) edges.push([i - 1, i]);
      }
      pts.push([-1.2, -0.9, 0.4], [-1.2, 0.1, 0.4], [1.2, -0.9, 0.4], [1.2, 0.1, 0.4]);
      const b = segs;
      edges.push([b, b + 1], [b + 2, b + 3]);
      return { pts, edges };
    },
    paper: () => {
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

  const kindFromLabel = (label) => {
    const up = String(label || "").toUpperCase();
    if (up.includes("TOKEN") || up.includes("TOKENS") || up.includes("CURATE"))
      return "token";
    if (up.includes("VISION") || up.includes("SAFE") || up.includes("ALERT"))
      return "camera";
    if (up.includes("TRANSIT")) return "monorail";
    if (up.includes("MENU")) return "bowl";
    return "paper";
  };

  const svg = (a, b, label) => {
    // Kept name "svg" so the existing article list doesn't need to change.
    // It now generates a wireframe thumbnail image (data URL).
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "rgba(8, 0, 30, 1)");
    bg.addColorStop(1, "rgba(2, 6, 23, 1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Floor grid
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(70,245,255,0.18)";
    const gridY = h * 0.72;
    for (let i = 0; i < 14; i++) {
      const y = gridY + i * (h * 0.03);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,55,185,0.14)";
    for (let i = 0; i < 16; i++) {
      const x = (i / 15) * w;
      ctx.beginPath();
      ctx.moveTo(x, gridY);
      ctx.lineTo(w * 0.5 + (x - w * 0.5) * 0.14, h);
      ctx.stroke();
    }
    ctx.restore();

    // Label pill
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(2,6,23,0.55)";
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 3;
    const pillW = 560;
    const pillH = 66;
    const pillX = 90;
    const pillY = 88;
    const r = 18;
    ctx.beginPath();
    ctx.moveTo(pillX + r, pillY);
    ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, r);
    ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, r);
    ctx.arcTo(pillX, pillY + pillH, pillX, pillY, r);
    ctx.arcTo(pillX, pillY, pillX + pillW, pillY, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(248,250,252,0.92)";
    ctx.font = '30px "Orbitron", Arial';
    ctx.fillText(label, pillX + 28, pillY + 44);
    ctx.restore();

    const kind = kindFromLabel(label);
    const shape = (shapes[kind] || shapes.paper)();

    const rotY = 0.75;
    const rotX = -0.22;
    const dist = 4.3;
    const centerX = w * 0.5;
    const centerY = h * 0.56;
    const scale = Math.min(w, h) * 0.16;

    const proj = shape.pts.map((p) => project(p, rotY, rotX, dist));

    // Glow
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = b;
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (const e of shape.edges) {
      const pa = proj[e[0]];
      const pb = proj[e[1]];
      ctx.moveTo(centerX + pa[0] * scale, centerY - pa[1] * scale);
      ctx.lineTo(centerX + pb[0] * scale, centerY - pb[1] * scale);
    }
    ctx.stroke();
    ctx.restore();

    // Main
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = a;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (const e of shape.edges) {
      const pa = proj[e[0]];
      const pb = proj[e[1]];
      const depth = clamp((pa[2] + pb[2]) * 0.5, 0.25, 1.2);
      ctx.globalAlpha = 0.55 + depth * 0.35;
      ctx.moveTo(centerX + pa[0] * scale, centerY - pa[1] * scale);
      ctx.lineTo(centerX + pb[0] * scale, centerY - pb[1] * scale);
    }
    ctx.stroke();
    ctx.restore();

    // Glitch slice
    ctx.globalAlpha = 0.18;
    const sliceY = Math.floor(h * 0.44);
    const sliceH = Math.floor(h * 0.05);
    ctx.drawImage(canvas, 0, sliceY, w, sliceH, Math.floor(w * 0.01), sliceY, w, sliceH);
    ctx.globalAlpha = 1;

    return canvas.toDataURL("image/png");
  };

  const base = [
    {
      tag: "SECTOR BULLETIN",
      title: "City playlist upgraded to reduce unapproved silence",
      body: "Audio gaps have been identified as a source of independent thought. The loop is now continuous.",
      img: svg("#ff37b9", "#050011", "WAVES VERIFIED"),
    },
    {
      tag: "COMFORT UPDATE",
      title: "New lighting standard softens edges on public cameras",
      body: "Street glow has been recalibrated to make all faces equally legible. You’re welcome.",
      img: svg("#46f5ff", "#050011", "CLARITY PATCH"),
    },
    {
      tag: "MARKET NOTICE",
      title: "Token ‘friction’ introduced for luxury items",
      body: "Purchases now include a brief pause for reflection. Reflection is mandatory.",
      img: svg("#ffe66b", "#1a003a", "TOKENS"),
    },
    {
      tag: "PUBLIC HEALTH",
      title: "Mood stabilizers detected in fog machines (approved)",
      body: "Trace amounts improve crowd flow and prevent ‘spiral events.’ The fog remains aesthetic.",
      img: svg("#8d72ff", "#050011", "SAFE AIR"),
    },
    {
      tag: "CIVIC DESIGN",
      title: "Balcony rails raised to discourage horizon fixation",
      body: "Extended viewing of the grid can produce questions. Rails help you look inward.",
      img: svg("#ff6b6b", "#050011", "DESIGN"),
    },
    {
      tag: "SECURITY",
      title: "Wireframe support avatars assigned to every block",
      body: "They do not sleep. If they wave, wave back. It helps them catalog friendliness.",
      img: svg("#2dff9d", "#050011", "SUPPORT"),
    },
    {
      tag: "EVENTS",
      title: "Midnight parade rescheduled to match compliance tempo",
      body: "Crowds will march at 120 BPM. Deviations will be gently corrected by bass.",
      img: svg("#ff37b9", "#0a031e", "PARADE"),
    },
    {
      tag: "TRANSPORT",
      title: "Monorail windows now display ‘helpful’ scenery",
      body: "Outside visuals are distracting. Riders may select: Sunset, Grid, or Product Demo.",
      img: svg("#46f5ff", "#0a031e", "TRANSIT"),
    },
    {
      tag: "COMMUNITY",
      title: "New etiquette: asking ‘why’ replaced with ‘how to comply’",
      body: "The sector thrives when questions resolve quickly. Try the new phrasing today.",
      img: svg("#ffe66b", "#050011", "ETIQUETTE"),
    },
    {
      tag: "INFRASTRUCTURE",
      title: "Sunset bands extended for ‘emotional consistency’",
      body: "The horizon now fades slower. If you feel relief, please report it as gratitude.",
      img: svg("#8d72ff", "#1a003a", "SUNSET"),
    },
    {
      tag: "COMMERCE",
      title: "Mirror fabrics recommended for all official photos",
      body: "Reflective clothing improves brand unity. Personal style remains ‘optional.’",
      img: svg("#ff6b6b", "#0a031e", "STYLE"),
    },
    {
      tag: "ALERT",
      title: "Unlicensed colors spotted in Alley 7",
      body: "A rogue palette was reported. Teams are restoring approved cyan-magenta balance.",
      img: svg("#2dff9d", "#1a003a", "ALERT"),
    },
    {
      tag: "EDUCATION",
      title: "Daily reminder: nostalgia is a product feature",
      body: "Longing makes you loyal. The loop knows what you miss and sells it back gently.",
      img: svg("#ff37b9", "#050011", "REMINDER"),
    },
    {
      tag: "CULTURE",
      title: "New club opens: ‘Quiet Room’ (not actually quiet)",
      body: "Silence is simulated via softer bass. Please enjoy the approximation responsibly.",
      img: svg("#46f5ff", "#050011", "CLUB"),
    },
    {
      tag: "SYSTEM NOTE",
      title: "Terms updated: ‘free will’ renamed to ‘user preference’",
      body: "This change improves readability and reduces confusion for new visitors.",
      img: svg("#ffe66b", "#0a031e", "TERMS"),
    },
    {
      tag: "FOOD",
      title: "Taste profiles now required for ordering noodles",
      body: "Curators will pick the spice level that best supports productivity.",
      img: svg("#8d72ff", "#050011", "MENU"),
    },
    {
      tag: "WEATHER",
      title: "Neon rain forecasted to improve street reflections",
      body: "The drizzle is scheduled. Please do not call it ‘sad.’ It is ‘cinematic.’",
      img: svg("#ff6b6b", "#1a003a", "RAIN"),
    },
    {
      tag: "SURVEILLANCE",
      title: "Cameras upgraded to recognize ‘uncertain posture’",
      body: "If you’re unsure, stand straighter. Confidence helps the system help you.",
      img: svg("#2dff9d", "#050011", "VISION"),
    },
    {
      tag: "MAINTENANCE",
      title: "Gridlines repainted to reduce drift in pedestrian flow",
      body: "Walk the lines. The lines walk you. Everyone arrives on time.",
      img: svg("#ff37b9", "#0a031e", "GRID"),
    },
    {
      tag: "ANNOUNCEMENT",
      title: "New slogan deployed across billboards: ‘Relax, We Curate’",
      body: "The phrase tested well with focus groups. Please repeat it when prompted.",
      img: svg("#46f5ff", "#1a003a", "CURATE"),
    },
  ];

  let cursor = 0;

  function makeCard(article) {
    const card = document.createElement("article");
    card.className = "news-card";

    const img = document.createElement("img");
    img.className = "news-img";
    img.alt = article.title;
    img.src = article.img;

    const meta = document.createElement("div");
    meta.className = "news-meta";

    const eyebrow = document.createElement("p");
    eyebrow.className = "news-eyebrow";
    eyebrow.textContent = article.tag;

    const h = document.createElement("h2");
    h.className = "news-h";
    h.textContent = article.title;

    const p = document.createElement("p");
    p.className = "news-p";
    p.textContent = article.body;

    meta.appendChild(eyebrow);
    meta.appendChild(h);
    meta.appendChild(p);

    card.appendChild(img);
    card.appendChild(meta);
    return card;
  }

  function appendBatch(count = 10) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const a = base[cursor % base.length];
      frag.appendChild(makeCard(a));
      cursor++;
    }
    grid.appendChild(frag);
  }

  appendBatch(12);

  const sentinel = document.createElement("div");
  sentinel.style.height = "1px";
  grid.after(sentinel);

  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        loading.style.opacity = "1";
        // Small delay to feel like a feed loading
        window.setTimeout(() => {
          appendBatch(10);
          loading.style.opacity = "0.78";
        }, 350);
      }
    },
    { rootMargin: "900px 0px" },
  );

  obs.observe(sentinel);
})();

