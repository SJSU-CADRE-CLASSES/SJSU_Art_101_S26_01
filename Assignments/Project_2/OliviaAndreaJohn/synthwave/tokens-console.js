(() => {
  const balanceEl = document.getElementById("token-balance");
  const daysEl = document.getElementById("token-days");
  const typeEl = document.getElementById("job-type");
  const lengthEl = document.getElementById("job-length");
  const detailsEl = document.getElementById("job-details");
  const acceptEl = document.getElementById("job-accept");
  const declineEl = document.getElementById("job-decline");
  const logEl = document.getElementById("job-log");

  if (
    !balanceEl ||
    !daysEl ||
    !typeEl ||
    !lengthEl ||
    !detailsEl ||
    !acceptEl ||
    !declineEl ||
    !logEl
  ) {
    return;
  }

  const STORAGE_KEY = "waves_tokens_balance_v1";

  const DAILY_FOOD_ESTIMATE = 3200; // "about 3 days" from the starting balance

  const jobs = [
    {
      id: "neon-dishpit",
      name: "Neon Dishpit (Diner Backline)",
      basePayPerHour: 120,
      risk: "Low",
      replaceable: "Instant",
      blurb:
        "Scrub chrome plates until they reflect the ad stream. Smiles optional. Speed required.",
    },
    {
      id: "grid-runner",
      name: "Grid Runner (Delivery Loop)",
      basePayPerHour: 155,
      risk: "Medium",
      replaceable: "Same-day",
      blurb:
        "Carry sealed packages along the grid. Do not open. If you fall behind, another runner will take the route.",
    },
    {
      id: "camera-wipe",
      name: "Camera Wipe (Lens Sanitation)",
      basePayPerHour: 140,
      risk: "Medium",
      replaceable: "Same-day",
      blurb:
        "Clean public lenses and keep the city sharp. You are visible while you work. That is the point.",
    },
    {
      id: "hazard-sweep",
      name: "Hazard Sweep (Maintenance Fogline)",
      basePayPerHour: 210,
      risk: "High",
      replaceable: "Immediate",
      blurb:
        "Enter restricted corridors to reset humming equipment. Protective gear is provided when available.",
      mortalityChance: 0.22,
    },
    {
      id: "billboard-crew",
      name: "Billboard Crew (Slogan Rotation)",
      basePayPerHour: 175,
      risk: "High",
      replaceable: "Immediate",
      blurb:
        "Climb the glowing towers and swap the message tiles. Wind is cosmetic. Falling is permanent.",
      mortalityChance: 0.18,
    },
    {
      id: "crowd-calibration",
      name: "Crowd Calibration (Event BPM Marshal)",
      basePayPerHour: 165,
      risk: "Medium",
      replaceable: "Same-day",
      blurb:
        "Keep foot traffic at the approved tempo. If someone stops, you help them move again.",
    },
  ];

  const fmt = (n) => `${Math.max(0, Math.floor(n)).toLocaleString()} TOK`;

  function loadBalance() {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed)) return parsed;
    return 9800; // intentionally low
  }

  function saveBalance(n) {
    window.localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(n))));
  }

  let balance = loadBalance();

  function updateUI() {
    balanceEl.textContent = fmt(balance);
    const days = balance / DAILY_FOOD_ESTIMATE;
    const daysText =
      days >= 1 ? `${days.toFixed(1)} days` : `${Math.max(0, days * 24).toFixed(0)} hours`;
    daysEl.textContent = daysText;
  }

  function setLog(msg) {
    logEl.textContent = msg;
  }

  function currentJob() {
    const id = typeEl.value;
    return jobs.find((j) => j.id === id) || jobs[0];
  }

  function currentHours() {
    const h = Number(lengthEl.value);
    return Number.isFinite(h) ? h : 2;
  }

  function payFor(job, hours) {
    // Exploitative: tiny "fees" keep you poor
    const gross = job.basePayPerHour * hours;
    const processingFee = Math.max(40, Math.round(gross * 0.08));
    const uniformFee = Math.max(30, Math.round(gross * 0.05));
    const net = gross - processingFee - uniformFee;
    return { gross, processingFee, uniformFee, net: Math.max(0, net) };
  }

  function renderDetails() {
    const job = currentJob();
    const hours = currentHours();
    const pay = payFor(job, hours);

    detailsEl.innerHTML = `
      <div class="job-name">${job.name}</div>
      <div class="job-blurb">${job.blurb}</div>
      <div class="job-stats">
        <div><span class="job-stat-k">Risk</span> <span class="job-stat-v job-risk job-risk--${job.risk.toLowerCase()}">${job.risk}</span></div>
        <div><span class="job-stat-k">Replacement</span> <span class="job-stat-v">${job.replaceable}</span></div>
        <div><span class="job-stat-k">Gross</span> <span class="job-stat-v">${fmt(pay.gross)}</span></div>
        <div><span class="job-stat-k">Fees</span> <span class="job-stat-v">-${fmt(pay.processingFee + pay.uniformFee)}</span></div>
        <div><span class="job-stat-k">Net</span> <span class="job-stat-v">${fmt(pay.net)}</span></div>
      </div>
      <div class="job-fineprint">
        “Participation implies consent.” Shifts may be terminated early if a more efficient worker is found.
      </div>
    `;
  }

  function populateJobs() {
    typeEl.innerHTML = "";
    for (const j of jobs) {
      const opt = document.createElement("option");
      opt.value = j.id;
      opt.textContent = j.name;
      typeEl.appendChild(opt);
    }
  }

  populateJobs();
  updateUI();
  renderDetails();

  typeEl.addEventListener("change", renderDetails);
  lengthEl.addEventListener("change", renderDetails);

  declineEl.addEventListener("click", () => {
    setLog(
      "Request submitted. Estimated review time: 14–21 days. Suggestion: accept a shift to maintain access.",
    );
  });

  acceptEl.addEventListener("click", () => {
    const job = currentJob();
    const hours = currentHours();
    const pay = payFor(job, hours);

    setLog("Shift accepted. Please remain calm while your labor is processed…");

    window.setTimeout(() => {
      const mortality = job.mortalityChance ?? 0;
      if (mortality > 0 && Math.random() < mortality) {
        balance = 0;
        saveBalance(balance);
        updateUI();
        setLog(
          "Incident recorded. Worker terminated. Replacement assigned. Your access will be restored when your next identity is approved.",
        );
        return;
      }

      balance += pay.net;
      saveBalance(balance);
      updateUI();
      setLog(
        `Shift complete. Net payout: ${fmt(pay.net)}. (Fees deducted automatically.) Stay available. The system prefers availability.`,
      );
    }, 650);
  });
})();

