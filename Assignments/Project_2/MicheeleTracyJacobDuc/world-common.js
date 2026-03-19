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
    const hue = Math.random() > 0.5 ? "cyan" : Math.random() > 0.5 ? "teal" : "electric";
    if (hue === "teal") {
      p.style.background = "var(--accent-2)";
      p.style.boxShadow = "0 0 8px var(--glow-teal)";
    } else if (hue === "electric") {
      p.style.background = "var(--accent-3)";
      p.style.boxShadow = "0 0 8px var(--glow-electric)";
    }
    container.appendChild(p);
  }
}

// Rating feedback popup
function showRatingFeedback(name, rating) {
  const isElimination = Number(rating) === 1;
  // If the user rates 1★, the inhabitant is eliminated, but the user's
  // balance does not change.
  const delta = isElimination ? 0 : Number(rating);

  balance += delta;
  // Prevent negative balance from breaking downstream UI expectations.
  if (balance < 0) balance = 0;
  updateBalance(balance);

  // Special elimination animation (inject once).
  const ensureElimKeyframes = () => {
    if (document.getElementById("elimKeyframes")) return;
    const style = document.createElement("style");
    style.id = "elimKeyframes";
    style.textContent = `
      @keyframes eliminate-pop {
        0% { opacity: 0; transform: translate(-50%, 18px) scale(0.75) rotate(-1deg); filter: blur(1px); }
        15% { opacity: 1; transform: translate(-50%, -20px) scale(1.12) rotate(0deg); filter: blur(0); }
        45% { transform: translate(-50%, -30px) scale(1.03); }
        100% { opacity: 0; transform: translate(-50%, -80px) scale(0.98); }
      }
    `;
    document.head.appendChild(style);
  };

  ensureElimKeyframes();

  const popup = document.createElement("div");
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${isElimination ? "rgba(20, 4, 10, 0.92)" : "var(--panel)"};
    border: ${isElimination ? "2px solid rgba(255, 77, 106, 0.7)" : "1px solid var(--border)"};
    border-radius: 16px;
    padding: 24px 32px;
    z-index: 1000;
    text-align: center;
    animation: ${isElimination ? "eliminate-pop 3s ease-out forwards" : "fade-in-out 2s forwards"};
    backdrop-filter: blur(12px);
    box-shadow: ${
      isElimination
        ? "0 20px 60px rgba(0,0,0,0.8), 0 0 50px rgba(255,77,106,0.25)"
        : "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 229, 255, 0.3)"
    };
    color: ${isElimination ? "rgba(255,215,225,0.98)" : "var(--text)"};
  `;

  if (isElimination) {
    popup.innerHTML = `
      <div style="font-size: 1.35rem; margin-bottom: 6px; font-weight: 900;">
        ${String(name).trim() || "Inhabitant"} is being eliminated due to their low star balance
      </div>
      <div style="color: rgba(255, 77, 106, 0.98); font-size: 1rem;">
        No stars were deducted from you.
      </div>
    `;
  } else {
    popup.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 8px;">
        ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
      </div>
      <div style="font-size: 1.1rem; margin-bottom: 4px;">
        Rated <strong>${name}</strong>
      </div>
      <div style="color: #40ffd8; font-size: 0.9rem;">
        +${delta.toFixed(2)} ★ earned
      </div>
    `;
  }

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), isElimination ? 3000 : 2000);
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
