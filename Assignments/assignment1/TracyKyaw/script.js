// SET EXAM DATE (change if you want)
const examDate = new Date();
examDate.setDate(examDate.getDate() + 3);
examDate.setHours(9, 0, 0);

function startCountdown() {
  const timer = document.getElementById("timer");
  setInterval(() => {
    const now = new Date();
    const diff = examDate - now;

    if (diff <= 0) {
      timer.textContent = "Exam time.";
      return;
    }

    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    timer.textContent = `${hrs}h ${mins}m remaining`;
  }, 1000);
}

// VIDEO DISTRACTION
function showVideo() {
  const overlay = document.getElementById("videoOverlay");
  overlay.style.display = "flex";

  setTimeout(() => {
    overlay.style.display = "none";
  }, 7000);
}

// DOOM SCROLL
function startDoomScroll() {
  const box = document.getElementById("scroll");
  const messages = [
    "POV: you said you'd start three days ago",
    "Everyone procrastinates… right?",
    "One more scroll",
    "Why am I still awake?",
    "I’ll deal with it tomorrow",
    "At least I'm not alone"
  ];

  setInterval(() => {
    const p = document.createElement("p");
    p.textContent = messages[Math.floor(Math.random() * messages.length)];
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
  }, 1600);
}
