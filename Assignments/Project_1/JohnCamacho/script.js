// Ren'Py-style sample – add dialogue/click logic here as needed

// Use $name data from start page (passed as URL param)
(function () {
    var params = new URLSearchParams(window.location.search);
    var name = params.get('name');
    var el = document.getElementById('player-name');
    if (el) {
        el.textContent = name && name.trim() ? name.trim() : 'Guest';
    }
})();
