const container = document.getElementById("viz");

container.innerHTML = "";

DAYS.forEach((d) => {
  const day = document.createElement("div");
  day.className = "day";

  const label = document.createElement("div");
  label.className = "label";
  label.textContent = d.day;

  day.appendChild(label);

  CATS.forEach((c) => {
    const bar = document.createElement("div");
    bar.className = "bar " + c.key;

    // minutes -> pixels
    bar.style.width = (d[c.key] * 2) + "px";

    // hover shows exact minutes
    bar.title = c.label + ": " + d[c.key] + " min";

    day.appendChild(bar);
  });

  container.appendChild(day);
});
