(() => {
  const shell = document.getElementById("tourbotShell");
  const log = document.getElementById("tourbotLog");
  const choices = document.getElementById("tourbotChoices");
  const toggleBtn = document.getElementById("tourbotToggle");
  const resetBtn = document.getElementById("tourbotReset");

  if (!shell || !log || !choices || !toggleBtn || !resetBtn) return;

  const DEFAULT_START_BALANCE = 100;
  let balance = DEFAULT_START_BALANCE;

  const creditChipValue =
    document.getElementById("balanceValue") ||
    document.querySelector(".credit-chip span:last-child") ||
    document.querySelector(".balance-chip span:last-child");

  const path = location.pathname.toLowerCase();
  const isHub = path.endsWith("index.html") || path.endsWith("/");
  const isShop = path.endsWith("shop.html");
  const isGlass = path.includes("world-glass");
  const isNeon = path.includes("world-neon");
  const isSignal = path.includes("world-signal");
  const isWorld = isGlass || isNeon || isSignal;

  const getWorldName = () => {
    if (isGlass) return "Glass City";
    if (isNeon) return "Neon Underpass";
    if (isSignal) return "Signal Market";
    return "this world";
  };

  const setBalance = (next) => {
    balance = Math.max(0, Math.round(next * 100) / 100);
    if (creditChipValue) {
      creditChipValue.textContent = `${balance.toFixed(2)} ★`;
    }
  };

  const goTo = (href) => {
    location.href = href;
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
        const earned = i * 1;
        setBalance(balance + earned);
        addMsg(`+${earned}★ earned. Your rating echoes through the dimension.`);
        addMsg("Where do you want to go next?");
        offerMenu();
      });
      wrap.appendChild(btn);
    }
    choices.appendChild(wrap);
  };

  const offerMenu = () => {
    clearChoices();

    if (isHub) {
      addChoice("About StarStruck", () => {
        addMsg("About StarStruck", "user");
        addMsg("StarStruck is the in-between dimension — a void where travelers prepare to enter other worlds.");
        addMsg("Each portal leads to a different reality with its own rules. Enter, observe the inhabitants, and rate them.");
        addMsg("Your rating becomes their currency. Their survival. Their hope.");
        offerMenu();
      });

      addChoice("Enter a world", () => {
        addMsg("Enter a world", "user");
        addMsg("Choose your destination:");
        clearChoices();
        addChoice("Glass City", () => {
          addMsg("Glass City", "user");
          addMsg("Opening rift to Glass City... Politeness is armor there. Rate generously.");
          setTimeout(() => goTo("world-glass.html"), 800);
        });
        addChoice("Neon Underpass", () => {
          addMsg("Neon Underpass", "user");
          addMsg("Opening rift to Neon Underpass... Jokes are currency there. Listen carefully.");
          setTimeout(() => goTo("world-neon.html"), 800);
        });
        addChoice("Signal Market", () => {
          addMsg("Signal Market", "user");
          addMsg("Opening rift to Signal Market... Trust is rented there. Speak gently.");
          setTimeout(() => goTo("world-signal.html"), 800);
        });
        addChoice("Back", () => {
          offerMenu();
        });
      });

      addChoice("Visit Shop", () => {
        addMsg("Visit Shop", "user");
        addMsg("The Star Shop is where ratings turn into survival. Opening...");
        setTimeout(() => goTo("shop.html"), 600);
      });
    }

    if (isWorld) {
      addChoice("World info", () => {
        addMsg("World info", "user");
        if (isGlass) {
          addMsg("Glass City — Upper Tiers. Here, everyone smiles. Everyone rates. A three-star rating is considered an insult.");
          addMsg("The people here have learned to perform kindness. Your job is to see through it — or reward it.");
        } else if (isNeon) {
          addMsg("Neon Underpass — Street Level. Humor is survival. Favors are tracked. Secrets are worth half a star.");
          addMsg("The people here trade in stories and laughs. A good joke might be all they have.");
        } else if (isSignal) {
          addMsg("Signal Market — Fringe Zone. People here rent borrowed ratings just to exist for another day.");
          addMsg("Your kindness here goes further than anywhere else. A single star could change someone's week.");
        }
        offerMenu();
      });

      addChoice("How to rate", () => {
        addMsg("How to rate", "user");
        addMsg("Look at each inhabitant. Read their behavior. Then click a star rating (1-5).");
        addMsg("1★ = 1 currency added to your balance. 5★ = 5 currency.");
        addMsg("Your rating also affects them — imagine it changing their rent, their meals, their safety.");
        offerMenu();
      });

      addChoice("Return to hub", () => {
        addMsg("Return to hub", "user");
        addMsg("Returning to the portal dimension...");
        setTimeout(() => goTo("index.html"), 600);
      });

      addChoice("Visit Shop", () => {
        addMsg("Visit Shop", "user");
        goTo("shop.html");
      });
    }

    if (isShop) {
      addChoice("What is this shop?", () => {
        addMsg("What is this shop?", "user");
        addMsg("This is where stars become survival. Every item here is priced in the currency people earn through ratings.");
        addMsg("A warm meal costs 1.8★. A safe walk home costs 4★. Imagine what it takes to earn that.");
        offerMenu();
      });

      addChoice("What should I buy?", () => {
        addMsg("What should I buy?", "user");
        addMsg("If survival: Warm meal signal. If comfort: Luminous Icewave. If status: Reputation reset or AVTR Drift Capsule.");
        addMsg("But the most powerful purchase is still kindness — given upstream, before anyone reaches this counter.");
        offerMenu();
      });

      addChoice("Return to hub", () => {
        addMsg("Return to hub", "user");
        addMsg("Returning to the portal dimension...");
        setTimeout(() => goTo("index.html"), 600);
      });

      addChoice("Rate an encounter", () => {
        addMsg("Rate an encounter", "user");
        addMsg("How many stars?");
        clearChoices();
        showStarRater();
      });
    }
  };

  const reset = () => {
    log.innerHTML = "";
    clearChoices();
    balance = DEFAULT_START_BALANCE;
    setBalance(balance);

    addMsg("TourBot online.");

    if (isHub) {
      addMsg("Welcome to StarStruck — the in-between dimension.");
      addMsg("You stand in the void between worlds. Glowing rifts shimmer before you, each leading to a different reality.");
      addMsg("Choose a portal. Enter. Observe the inhabitants. Rate them. Your rating becomes their currency.");
      addMsg("Then return here to prepare for the next crossing.");
    } else if (isWorld) {
      addMsg(`You've entered ${getWorldName()}.`);
      addMsg("Look around. Observe the inhabitants. Read their stories. Then decide their worth with a rating.");
      addMsg("Remember: your stars become their survival.");
    } else if (isShop) {
      addMsg("You're in the Star Shop.");
      addMsg("Here, stars have already turned into rent, food, and a chance to feel safe for one more night.");
      addMsg("As you add items to your cart, watch how quickly 100★ vanishes.");
    }

    addMsg("What would you like to do?");
    offerMenu();
  };

  toggleBtn.addEventListener("click", () => {
    const collapsed = shell.parentElement.classList.toggle("tourbot-collapsed");
    toggleBtn.textContent = collapsed ? "▴" : "▾";
  });

  resetBtn.addEventListener("click", () => {
    reset();
  });

  window.addEventListener("starstruck:rated", (e) => {
    if (e.detail && typeof e.detail.newBalance === "number") {
      balance = e.detail.newBalance;
      setBalance(balance);
      addMsg(`Rating registered. Your balance is now ${balance.toFixed(2)}★.`);
    }
  });

  setBalance(balance);
  reset();
})();
