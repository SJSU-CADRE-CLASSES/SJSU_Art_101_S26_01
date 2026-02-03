function fakeDistraction() {
  alert("Just one quick distraction...");
}

function tooLate() {
  alert("It’s too late.");
}

function addDoomScroll() {
  const box = document.getElementById("scroll");
  const messages = [
    "POV: you said you'd start three days ago",
    "One more scroll won't hurt",
    "Everyone procrastinates, right?",
    "Why am I still awake?",
    "I'll deal with it tomorrow",
    "At least I'm not alone"
  ];

  setInterval(() => {
    const p = document.createElement("p");
    p.textContent = messages[Math.floor(Math.random() * messages.length)];
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
  }, 1500);
}

