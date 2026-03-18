(() => {
  const DEFAULT_START_BALANCE = 100;

  const creditChipValue = document.getElementById("balanceValue") || document.querySelector(".credit-chip span:last-child");
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartBalanceEl = document.getElementById("cartBalance");
  const cartMessageEl = document.getElementById("cartMessage");
  const buttons = document.querySelectorAll(".add-to-cart");

  if (!cartItemsEl || !cartTotalEl || !cartBalanceEl || buttons.length === 0) {
    return;
  }

  let balance = DEFAULT_START_BALANCE;
  let cartTotal = 0;

  const updateDisplays = () => {
    const balanceText = `${balance.toFixed(2)} ★ balance`;
    if (creditChipValue) creditChipValue.textContent = balanceText;
    if (cartBalanceEl) cartBalanceEl.textContent = `${balance.toFixed(2)}★`;
    if (cartTotalEl) cartTotalEl.textContent = `${cartTotal.toFixed(1)}★`;
  };

  updateDisplays();

  const addToCart = (name, cost) => {
    if (cost <= 0 || !Number.isFinite(cost)) return;
    if (balance < cost) {
      if (cartMessageEl) {
        cartMessageEl.textContent =
          "Not enough stars. TourBot recommends earning or saving more before buying this.";
      }
      return;
    }

    balance = Math.max(0, Math.round((balance - cost) * 100) / 100);
    cartTotal = Math.round((cartTotal + cost) * 10) / 10;

    const li = document.createElement("li");
    li.textContent = `${name} — ${cost.toFixed(1)}★`;
    cartItemsEl.appendChild(li);

    if (cartMessageEl) {
      cartMessageEl.textContent = "Item added. Your ratings paid for this.";
    }

    updateDisplays();
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name") || "Unknown item";
      const rawCost = Number(btn.getAttribute("data-cost"));
      const cost = Number.isFinite(rawCost) ? rawCost : 0;
      addToCart(name, cost);
    });
  });
})();

