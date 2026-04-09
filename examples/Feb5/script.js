const display = document.getElementById("number-display");
let count = 0;

if (count <= 100) {
    setInterval(() => {
        count++;
        display.textContent = count;
    }, 1000);
} else {
    display.textContent = "0";
    count = 0;
}