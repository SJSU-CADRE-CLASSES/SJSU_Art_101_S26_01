// Shared functionality for all world pages
const DEFAULT_BALANCE = 100;

// Initialize balance from session or default
let balance = DEFAULT_BALANCE;

function updateBalance(newVal) {
  balance = newVal;
  const el = document.getElementById("balanceDisplay");
  if (el) el.textContent = balance.toFixed(2) + " ★ balance";
}

// Make updateBalance globally accessible
window.updateBalance = updateBalance;

// Generate floating particles
function generateParticles() {
  const container = document.getElementById("particles");
  if (!container) return;
  
  const count = 40;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.classList.add("particle");
    p.style.left = Math.random() * 100 + "%";
    p.style.animationDelay = Math.random() * 12 + "s";
    p.style.animationDuration = 10 + Math.random() * 8 + "s";
    const hue = Math.random() > 0.5 ? "cyan" : Math.random() > 0.5 ? "pink" : "purple";
    if (hue === "pink") {
      p.style.background = "var(--accent)";
      p.style.boxShadow = "0 0 8px var(--glow-pink)";
    } else if (hue === "purple") {
      p.style.background = "var(--accent-3)";
      p.style.boxShadow = "0 0 8px var(--glow-purple)";
    }
    container.appendChild(p);
  }
}

// Rating feedback popup
function showRatingFeedback(name, rating) {
  const earned = rating;
  balance += earned;
  updateBalance(balance);

  const popup = document.createElement("div");
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px 32px;
    z-index: 1000;
    text-align: center;
    animation: fade-in-out 2s forwards;
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(90, 216, 255, 0.3);
  `;
  popup.innerHTML = `
    <div style="font-size: 2rem; margin-bottom: 8px;">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</div>
    <div style="font-size: 1.1rem; margin-bottom: 4px;">Rated <strong>${name}</strong></div>
    <div style="color: #ffe36f; font-size: 0.9rem;">+${earned.toFixed(2)} ★ earned</div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2000);
}

// Star rating handlers
function initStarRatings() {
  document.querySelectorAll(".star-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const rating = parseInt(this.dataset.star);
      const container = this.closest(".inhabitant-stars");
      const inhabitant = this.closest(".inhabitant");
      const name = inhabitant?.dataset.name || "Unknown";

      // Mark stars as active
      container.querySelectorAll(".star-btn").forEach((b, i) => {
        b.classList.toggle("active", i < rating);
      });

      // Disable further clicks
      container.querySelectorAll(".star-btn").forEach((b) => {
        b.disabled = true;
        b.style.opacity = "0.6";
        b.style.cursor = "default";
      });

      showRatingFeedback(name, rating);
    });
  });
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  generateParticles();
  initStarRatings();
  updateBalance(balance);
});
