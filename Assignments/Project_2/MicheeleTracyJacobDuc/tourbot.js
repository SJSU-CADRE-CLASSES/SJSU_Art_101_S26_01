(() => {
  const shell = document.getElementById("tourbotShell");
  const log = document.getElementById("tourbotLog");
  const choices = document.getElementById("tourbotChoices");
  const toggleBtn = document.getElementById("tourbotToggle");
  const resetBtn = document.getElementById("tourbotReset");

  if (!shell || !log || !choices || !toggleBtn || !resetBtn) return;

  const creditChipValue = document.querySelector(".credit-chip span:last-child");
  const BALANCE_KEY = "starstruck_balance";
  const DEFAULT_START_BALANCE = 100;

  const readBalance = () => {
    const raw = localStorage.getItem(BALANCE_KEY);
    if (raw === null) return DEFAULT_START_BALANCE;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : DEFAULT_START_BALANCE;
  };

  const writeBalance = (value) => {
    localStorage.setItem(BALANCE_KEY, String(value));
  };

  let balance = readBalance();

  const isIndex = () => location.pathname.toLowerCase().endsWith("index.html") || location.pathname.endsWith("/");
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
    return false;
  };

  const goTo = (href) => {
    location.href = href;
  };

  const setBalance = (next) => {
    balance = Math.max(0, Math.round(next * 100) / 100);
    writeBalance(balance);
    if (creditChipValue) {
      creditChipValue.textContent = `${balance.toFixed(2)} ★ balance`;
    }
  };

  const addMsg = (text, who = "bot") => {
    const node = document.createElement("div");
    node.className = `tourbot-msg ${who}`;
    node.textContent = text;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
  };

  const clearChoices = () => {
    choices.innerHTML = "";
  };

  const addChoice = (label, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tourbot-choice";
    btn.textContent = label;
    btn.addEventListener("click", () => onClick());
    choices.appendChild(btn);
  };

  const showStarRater = () => {
    const wrap = document.createElement("div");
    wrap.className = "tourbot-stars";
    for (let i = 1; i <= 5; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "starbtn";
      btn.textContent = `${i}★`;
      btn.addEventListener("click", () => {
        addMsg(`${i}★`, "user");
        const earned = i * 0.35;
        setBalance(balance + earned);
        addMsg(
          `Logged. That rating transfers ${earned.toFixed(
            2
          )}★ into the local economy. Kindness compounds.`
        );
        addMsg("Where do you want to go next?");
        offerMenu();
      });
      wrap.appendChild(btn);
    }
    choices.appendChild(wrap);
  };

  const offerMenu = () => {
    clearChoices();

    addChoice("Take the tour", () => {
      addMsg("Take the tour", "user");
      addMsg("Step 1: scroll to switch realities.");
      addMsg("Step 2: every interaction becomes a rating.");
      addMsg("Step 3: ratings are money. Be kind to keep doors open.");
      addMsg("Choose a destination.");
      clearChoices();

      addChoice("Origin", () => {
        addMsg("Origin", "user");
        if (!scrollToId("intro")) goTo("index.html#intro");
      });
      addChoice("Worlds", () => {
        addMsg("Worlds", "user");
        if (!scrollToId("worlds")) goTo("index.html#worlds");
      });
      addChoice("Currency", () => {
        addMsg("Currency", "user");
        if (!scrollToId("economy")) goTo("index.html#economy");
      });
      addChoice("Shop", () => {
        addMsg("Shop", "user");
        if (location.pathname.toLowerCase().endsWith("shop.html")) {
          addMsg("You’re already in the shop. Look at the prices. Imagine the people behind them.");
          offerMenu();
        } else {
          goTo("shop.html");
        }
      });
    });

    addChoice("Rate an encounter", () => {
      addMsg("Rate an encounter", "user");
      addMsg("How many stars did they earn?");
      clearChoices();
      showStarRater();
    });

    addChoice("How stars work", () => {
      addMsg("How stars work", "user");
      addMsg(
        "Stars equal currency. Your rating affects rent, routes, and rations for the person you met."
      );
      addMsg("Recommendation: default to kindness. It's the only exchange rate that doesn't crash.");
      offerMenu();
    });

    if (location.pathname.toLowerCase().endsWith("shop.html")) {
      addChoice("What should I buy?", () => {
        addMsg("What should I buy?", "user");
        addMsg(
          "If your goal is survival: start with food (Warm meal signal). If your goal is safety: buy the Safe walk home. If your goal is status: the Reputation reset."
        );
        addMsg("But the most powerful purchase is still kindness, upstream, before anyone reaches this counter.");
        offerMenu();
      });
    }
  };

  const reset = () => {
    log.innerHTML = "";
    clearChoices();
    balance = readBalance();
    setBalance(balance);

    addMsg("Boot sequence complete.");
    addMsg(
      "Welcome to StarStruck — a world where every interaction matters, and every rating has value."
    );
    addMsg("Scroll to explore. Rate to influence. Remember: not everyone can afford to lose a star.");

    if (location.pathname.toLowerCase().endsWith("shop.html")) {
      addMsg("You’re in the Shop. These prices are built from ratings people live and die by.");
    } else {
      addMsg("You’re in the corridor. Scroll through worlds and watch the rules shift.");
    }

    addMsg("What do you want to do?");
    offerMenu();
  };

  toggleBtn.addEventListener("click", () => {
    const collapsed = shell.parentElement.classList.toggle("tourbot-collapsed");
    toggleBtn.textContent = collapsed ? "▴" : "▾";
  });

  resetBtn.addEventListener("click", () => {
    // keep the stored balance, just restart the conversation
    reset();
  });

  // Initialize visible balance and start dialog
  setBalance(balance);
  reset();
})();

