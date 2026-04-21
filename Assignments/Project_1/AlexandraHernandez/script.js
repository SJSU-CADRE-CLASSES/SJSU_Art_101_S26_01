// Reveal elements on scroll
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const options = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, options);
  reveals.forEach(function (el) {
    observer.observe(el);
  });
}

// Contact form: prevent default and show feedback (no backend)
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.querySelector('#name').value;
    alert('Thanks, ' + name + '! This form is for display only. Connect it to a server or mailto: to send real messages.');
  });
}

// Mark current page in nav (backup if class="active" is missing)
function setActiveNav() {
  var path = window.location.pathname;
  var page = path.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = a.getAttribute('href');
    a.classList.toggle('active', href === page || (page === '' && href === 'index.html'));
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initReveal();
  initContactForm();
  setActiveNav();
});
