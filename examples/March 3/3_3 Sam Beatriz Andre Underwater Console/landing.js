/**
 * Landing page — Enter button slides out, then navigates to console
 */

document.addEventListener('DOMContentLoaded', () => {
  const enterBtn = document.getElementById('enter-btn');
  const landing = document.getElementById('landing');

  if (!enterBtn || !landing) return;

  enterBtn.addEventListener('click', () => {
    landing.classList.add('exiting');

    setTimeout(() => {
      window.location.href = 'console.html';
    }, 600);
  });
});
