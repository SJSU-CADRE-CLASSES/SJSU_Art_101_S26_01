(() => {
  const shell = document.getElementById("tourbotShell");
  const log = document.getElementById("tourbotLog");
  const choices = document.getElementById("tourbotChoices");
  const toggleBtn = document.getElementById("tourbotToggle");
  const resetBtn = document.getElementById("tourbotReset");

  if (!shell || !log || !choices || !toggleBtn || !resetBtn) return;

  const creditChipValue = document.querySelector("#balanceDisplay") || 
                          document.querySelector(".credit-chip span:last-child") ||
                          document.querySelector(".hud-balance span:last-child");
  const DEFAULT_START_BALANCE = 100;

  const readBalance = () => DEFAULT_START_BALANCE;

  let balance = readBalance();

  const goTo = (href) => {
    location.href = href;
  };

  const setBalance = (next) => {
    balance = Math.max(0, Math.round(next * 100) / 100);
    if (creditChipValue) {
      creditChipValue.textContent = `${balance.toFixed(2)} ★ balance`;
    }
    if (typeof window.updateBalance === "function") {
      window.updateBalance(balance);
    }
  };

  function spawnBalanceDeltaToast(deltaStars) {
    if (!creditChipValue) return;
    const delta = Number(deltaStars);
    if (Number.isNaN(delta) || delta === 0) return;

    const rect = creditChipValue.getBoundingClientRect();
    const abs = Math.abs(delta);
    const starCount = abs.toFixed(0);

    const toast = document.createElement("div");
    toast.className = `balance-delta-toast ${delta > 0 ? "positive" : "negative"}`;
    toast.textContent =
      delta > 0
        ? `Congratulations, you earned ${starCount} stars`
        : `Sadly, you lost ${starCount} stars`;
    toast.style.left = rect.left + rect.width / 2 + "px";
    toast.style.top = rect.top + "px";

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  function spawnEliminationToast(inhabitantName) {
    if (!creditChipValue) return;
    const name = String(inhabitantName || "").trim() || "Inhabitant";

    const rect = creditChipValue.getBoundingClientRect();

    const toast = document.createElement("div");
    toast.className = "elimination-toast";
    toast.textContent = `${name} is being eliminated due to their low star balance`;
    toast.style.left = rect.left + rect.width / 2 + "px";
    toast.style.top = rect.top + "px";

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1600);
  }

  // Expose a hook so world pages can award or deduct stars after interactions.
  // World pages call: window.adjustBalance(deltaStars, contextText)
  window.adjustBalance = (deltaStars, contextText = "Inhabitant reaction") => {
    const delta = Number(deltaStars);
    if (Number.isNaN(delta) || delta === 0) {
      if (typeof deltaStars === "number" && deltaStars === 0) {
        addMsg(`Inhabitant Verdict: 0★. ${contextText}`, "bot");
      }
      // still clamp / update balance (harmless)
      setBalance(balance + (Number(deltaStars) || 0));
      return;
    }

    const nextRaw = balance + delta;
    const nextRounded = Math.max(0, Math.round(nextRaw * 100) / 100);
    const actualDelta = nextRounded - balance;

    spawnBalanceDeltaToast(actualDelta);
    setBalance(nextRaw);

    const abs = Math.abs(actualDelta);
    const sign = actualDelta > 0 ? "+" : "-";
    addMsg(
      `Inhabitant Verdict: ${sign}${abs.toFixed(0)}★. ${contextText}`,
      "bot"
    );
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

        const targetName =
          window.__currentInhabitantForRating ||
          window.__lastInhabitantForRating ||
          "Inhabitant";

        // 1★ is a brutal verdict: the inhabitant gets eliminated.
        // For 1★, your balance does NOT change (no deduction).
        let delta = i * 1;
        if (i === 1) {
          spawnEliminationToast(targetName);
          delta = 0;
          addMsg(
            `Brutal verdict: ${String(targetName).trim() || "Inhabitant"} is eliminated.`,
            "bot"
          );
        } else {
          addMsg(
            `Logged. That rating earned ${delta.toFixed(0)}★ of currency. This shapes their reality.`,
            "bot"
          );
        }

        setBalance(balance + delta);

        addMsg("What do you want to do next?");
        offerMenu();
      });
      wrap.appendChild(btn);
    }
    choices.appendChild(wrap);
  };

  // Page detection
  const path = location.pathname.toLowerCase();
  const isShopPage = () => path.endsWith("shop.html");
  const isHubPage = () => path.endsWith("index.html") || path.endsWith("/");
  const isGlassCity = () => path.endsWith("glass-city.html");
  const isLegoWorld = () => path.endsWith("lego-world.html");
  const isUndergroundCity = () => path.endsWith("underground-city.html");
  const isWorldPage = () => isGlassCity() || isLegoWorld() || isUndergroundCity();

  const offerMenu = () => {
    clearChoices();

    // Portal navigation - available everywhere except shop
    if (!isShopPage()) {
      addChoice("Travel to a world", () => {
        addMsg("Travel to a world", "user");
        addMsg("Choose your destination. Each world has different rules.");
        clearChoices();

        if (!isGlassCity()) {
          addChoice("Glass City", () => {
            addMsg("Glass City", "user");
            addMsg("Entering World 001. Remember: in Glass City, anything less than 4 stars is an insult.");
            goTo("glass-city.html");
          });
        }

        if (!isLegoWorld()) {
          addChoice("Lego World", () => {
            addMsg("Lego World", "user");
            addMsg("Entering World 002. A realm of bricks and imagination where ratings determine your building rights.");
            goTo("lego-world.html");
          });
        }

        if (!isUndergroundCity()) {
          addChoice("Flat World", () => {
            addMsg("Flat World", "user");
            addMsg("Entering World 003. The Edge — where maps, passage, and coordinates are locked behind stars.");
            goTo("underground-city.html");
          });
        }

        if (!isHubPage()) {
          addChoice("Return to Hub", () => {
            addMsg("Return to Hub", "user");
            addMsg("Returning to the Portal Hub...");
            goTo("index.html");
          });
        }

        addChoice("Back", () => {
          clearChoices();
          offerMenu();
        });
      });
    }

    // Rate encounter - only on world pages
    if (isWorldPage()) {
      addChoice("Rate an encounter", () => {
        addMsg("Rate an encounter", "user");
        addMsg("How many stars did they earn? Remember: your rating determines their rent, rations, and routes home.");
        clearChoices();
        showStarRater();
      });
    }

    // How stars work - available everywhere
    addChoice("How stars work", () => {
      addMsg("How stars work", "user");
      addMsg("Stars are legal tender across all connected worlds.");
      addMsg("Give 1★ to someone? They might lose access to safe routes.");
      addMsg("Give 5★? You've just funded their next meal.");
      addMsg("Your kindness compounds. Your cruelty echoes.");
      offerMenu();
    });

    // Shop-specific options
    if (isShopPage()) {
      addChoice("What should I buy?", () => {
        addMsg("What should I buy?", "user");
        addMsg("If your goal is survival: Warm meal signal (1.8★).");
        addMsg("If your goal is comfort: Luminous Icewave (4.0★).");
        addMsg("If your goal is freedom: AVTR Drift Capsule (45.0★).");
        addMsg("But the most powerful purchase is kindness, given before anyone reaches this counter.");
        offerMenu();
      });

      addChoice("Return to Portal Hub", () => {
        addMsg("Return to Portal Hub", "user");
        goTo("index.html");
      });
    } else {
      addChoice("Visit the Shop", () => {
        addMsg("Visit the Shop", "user");
        addMsg("The shop is where stars harden into reality. Prices are built from ratings people live and die by.");
        goTo("shop.html");
      });
    }
  };

  const reset = () => {
    log.innerHTML = "";
    clearChoices();
    balance = readBalance();
    setBalance(balance);

    addMsg("Portal link established.");

    if (isShopPage()) {
      addMsg("Welcome to the Star Shop.");
      addMsg("Every price tag is paid for with someone's kindness — or cruelty.");
      addMsg("Watch how fast 100★ disappears when survival has a cost.");
    } else if (isGlassCity()) {
      addMsg("You've entered Glass City — World 001.");
      addMsg("A realm of perfect surfaces and polished manners. Everyone smiles, but the silence between words hides their true judgement.");
      addMsg("Below 4 stars, you become invisible. Rate wisely.");
    } else if (isLegoWorld()) {
      addMsg("You've entered Lego World — World 002.");
      addMsg("A realm built brick by brick, where creativity meets commerce. The minifigures here judge each other by their constructions.");
      addMsg("Low ratings mean your creations get dismantled. Build your reputation.");
    } else if (isUndergroundCity()) {
      addMsg("You've entered Flat World — World 003.");
      addMsg("A vast, impossible plain under open space. The horizon feels edited, the edges feel unfinished.");
      addMsg("Here, stars buy maps, passage, and coordinates away from the rim. No rating, no direction.");
    } else {
      addMsg("Welcome to StarStruck — the space between worlds.");
      addMsg("You stand in the Portal Hub — click the main portal to reveal three different worlds.");
      addMsg("Each world has its own rules, its own inhabitants, and its own consequences for ratings.");
      addMsg("Your stars are currency. Your kindness is survival.");
    }

    addMsg("What do you want to do?");
    offerMenu();
  };

  toggleBtn.addEventListener("click", () => {
    const collapsed = shell.parentElement.classList.toggle("tourbot-collapsed");
    toggleBtn.textContent = collapsed ? "▴" : "▾";
  });

  resetBtn.addEventListener("click", () => {
    reset();
  });

  setBalance(balance);
  reset();
})();
