(() => {
  const DEFAULT_BALANCE = 100;
  let balance = DEFAULT_BALANCE;

  const balanceEl = document.getElementById("balanceValue");
  const cards = document.querySelectorAll(".inhabitant-card");

  const updateBalanceDisplay = () => {
    if (balanceEl) {
      balanceEl.textContent = `${balance.toFixed(2)} ★`;
    }
  };

  const responses = [
    "Their balance shifts. Your choice echoes.",
    "Logged. The economy adjusts.",
    "Recorded. They'll feel this tomorrow.",
    "Your rating becomes their reality.",
    "Transmitted. Kindness or cruelty — it's done.",
  ];

  const getRandomResponse = () => {
    return responses[Math.floor(Math.random() * responses.length)];
  };

  cards.forEach((card) => {
    const buttons = card.querySelectorAll(".star-btn");
    const resultEl = card.querySelector(".rating-result");
    let rated = false;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (rated) return;
        rated = true;

        const stars = parseInt(btn.getAttribute("data-stars"), 10);
        if (!Number.isFinite(stars)) return;

        balance = Math.round((balance + stars) * 100) / 100;
        updateBalanceDisplay();

        buttons.forEach((b) => {
          b.disabled = true;
        });

        btn.style.background = "var(--glow-gold)";
        btn.style.color = "var(--void)";
        btn.style.boxShadow = "0 0 20px rgba(255, 204, 102, 0.6)";

        if (resultEl) {
          resultEl.textContent = `+${stars}★ earned. ${getRandomResponse()}`;
        }

        window.dispatchEvent(
          new CustomEvent("starstruck:rated", {
            detail: { stars, newBalance: balance },
          })
        );
      });
    });
  });

  updateBalanceDisplay();
})();
