(() => {
  const grid = document.getElementById("news-grid");
  const loading = document.getElementById("news-loading");
  if (!grid || !loading) return;

  const svg = (a, b, label) => {
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.9 0" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1200" height="675" fill="url(#g)"/>
  <g opacity="0.6">
    <path d="M0 520 L1200 380" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
    <path d="M0 560 L1200 420" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
    <path d="M0 600 L1200 460" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  </g>
  <g filter="url(#glow)">
    <circle cx="940" cy="170" r="82" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" stroke-width="3"/>
    <rect x="88" y="86" width="560" height="62" rx="18" fill="rgba(2,6,23,0.45)" stroke="rgba(255,255,255,0.22)"/>
    <text x="118" y="128" font-family="Orbitron, Arial" font-size="30" letter-spacing="6" fill="rgba(248,250,252,0.92)">${label}</text>
  </g>
</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
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

