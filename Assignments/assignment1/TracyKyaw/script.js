// ---- EXAM TIMER (PERSISTENT) ----
function getExamDate() {
  let saved = localStorage.getItem("examTime");

  if (!saved) {
    const exam = new Date();
    exam.setDate(exam.getDate() + 3);
    exam.setHours(9, 0, 0, 0);
    localStorage.setItem("examTime", exam.getTime());
    return exam;
  }

  return new Date(parseInt(saved));
}

function startCountdown() {
  const timer = document.getElementById("timer");
  if (!timer) return;

  const examDate = getExamDate();

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

// ---- VIDEO DISTRACTION ----
function showVideo() {
  const overlay = document.getElementById("videoOverlay");
  overlay.style.display = "flex";

  setTimeout(() => {
    overlay.style.display = "none";
  }, 7000);
}

// ---- DOOM SCROLL ----
function startDoomScroll() {
  const box = document.getElementById("scroll");
  if (!box) return;

  const messages = [
    "POV: you said you'd start three days ago",
    "One more scroll won’t hurt",
    "Everyone procrastinates… right?",
    "Why am I still awake?",
    "I’ll deal with it tomorrow",
    "At least I’m not alone"
  ];

  setInterval(() => {
    const p = document.createElement("p");
    p.textContent = messages[Math.floor(Math.random() * messages.length)];
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
  }, 1500);
}
