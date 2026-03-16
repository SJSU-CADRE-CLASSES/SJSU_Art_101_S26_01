// Ren'Py-style sample – dialogue, proceed prompt, BGM

var PLAYER_NAME = 'Guest';
(function () {
    var params = new URLSearchParams(window.location.search);
    PLAYER_NAME = (params.get('name') || '').trim() || 'Guest';
    var nameEl = document.getElementById('player-name');
    if (nameEl) nameEl.textContent = PLAYER_NAME;
})();

// Dialogue list: {{name}} is replaced with player name
var DIALOGUES = [
    { name: 'Mysterious Stranger', text: 'Welcome, {{name}}. So you\'ve chosen to go through with it. <em>Interesting.</em> I hope you\'re ready for what comes next.' },
    { name: 'Voice', text: 'Nothing is as it seems here, {{name}}. Trust no one. Not even yourself.' },
    { name: 'The Guide', text: 'The path ahead splits many times. Every choice will matter.' },
    { name: 'Mysterious Stranger', text: 'You hear a faint melody. It grows louder. <em>Do you want to listen?</em>' },
    { name: '???', text: 'Some doors, once opened, cannot be closed again.' },
    { name: 'Narrator', text: 'The room feels colder. Something has changed.' }
];

// Track which dialogue lines have been seen (first one is shown on load)
var dialogueSeen = DIALOGUES.map(function (_, i) { return i === 0; });

function allDialogueSeen() {
    return dialogueSeen.indexOf(false) === -1;
}

function substituteName(text) {
    return text.replace(/\{\{name\}\}/g, PLAYER_NAME);
}

function showDialogue(entry, index) {
    var nameEl = document.getElementById('dialogue-name');
    var innerEl = document.getElementById('dialogue-text-inner');
    if (!nameEl || !innerEl) return;
    nameEl.textContent = entry.name;
    innerEl.innerHTML = substituteName(entry.text);
    innerEl.classList.remove('reveal');
    void innerEl.offsetWidth;
    innerEl.classList.add('reveal');
    if (index >= 0 && index < dialogueSeen.length) dialogueSeen[index] = true;
}

function showRandomDialogue() {
    var unseen = [];
    for (var i = 0; i < DIALOGUES.length; i++) {
        if (!dialogueSeen[i]) unseen.push(i);
    }
    var idx;
    if (unseen.length > 0) {
        idx = unseen[Math.floor(Math.random() * unseen.length)];
    } else {
        idx = Math.floor(Math.random() * DIALOGUES.length);
    }
    showDialogue(DIALOGUES[idx], idx);
}

// One advance action: next dialogue, or proceed modal if all dialogue seen
function advance() {
    if (allDialogueSeen()) {
        var modal = document.getElementById('proceed-modal');
        if (modal) modal.removeAttribute('hidden');
    } else {
        showRandomDialogue();
    }
}

// Click on dialogue box or arrow -> advance (next dialogue or proceed modal)
(function () {
    var box = document.querySelector('.dialogue-box');
    var arrow = document.getElementById('next-arrow');
    if (box) {
        box.addEventListener('click', function (e) {
            if (arrow && (e.target === arrow || arrow.contains(e.target))) return;
            advance();
        });
        box.style.cursor = 'pointer';
    }
    if (arrow) {
        arrow.addEventListener('click', function (e) {
            e.stopPropagation();
            advance();
        });
    }
})();

// Proceed modal: No -> index, Yes -> start BGM
(function () {
    var modal = document.getElementById('proceed-modal');
    var btnNo = document.getElementById('proceed-no');
    var btnYes = document.getElementById('proceed-yes');
    var audio = document.getElementById('bgm');
    if (!modal) return;

    function closeModal() {
        modal.setAttribute('hidden', '');
    }

    if (btnNo) {
        btnNo.addEventListener('click', function () {
            closeModal();
            window.location.href = 'index.html';
        });
    }
    if (btnYes) {
        btnYes.addEventListener('click', function () {
            closeModal();
            if (audio) audio.play();
        });
    }
})();

// Sprite dissolve/fragment effect synced to BGM duration
(function () {
    var audio = document.getElementById('bgm');
    var sprite = document.getElementById('sprite-placeholder');
    if (!audio || !sprite) return;

    var rafId = null;

    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function fragmentClipPath(progress) {
        var p = 1 - progress;
        if (p <= 0) return "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)";
        var spread = 50 * p;
        var jitter = 3 * (1 - p);
        var pts = [
            [50 - spread + jitter, 50 - spread],
            [50 + spread, 50 - spread - jitter],
            [50 + spread + jitter, 50 + spread],
            [50 + spread, 50 + spread + jitter],
            [50 - spread, 50 + spread - jitter],
            [50 - spread - jitter, 50 - spread],
        ];
        return "polygon(" + pts.map(function (pt) { return pt[0] + "% " + pt[1] + "%"; }).join(", ") + ")";
    }

    function tick() {
        var duration = audio.duration;
        if (!duration || !isFinite(duration)) {
            rafId = requestAnimationFrame(tick);
            return;
        }
        var current = audio.currentTime;
        var progress = Math.min(current / duration, 1);
        var eased = easeInOut(progress);

        sprite.classList.add('sprite-dissolving');
        sprite.style.opacity = String(1 - eased);
        sprite.style.filter = "blur(" + (eased * 32) + "px)";
        sprite.style.clipPath = fragmentClipPath(eased);
        sprite.style.webkitClipPath = fragmentClipPath(eased);

        if (progress >= 1) {
            sprite.style.visibility = 'hidden';
            sprite.style.pointerEvents = 'none';
            cancelAnimationFrame(rafId);
            rafId = null;
            return;
        }
        rafId = requestAnimationFrame(tick);
    }

    function startEffect() {
        sprite.style.visibility = '';
        sprite.style.pointerEvents = '';
        sprite.style.opacity = '1';
        sprite.style.filter = 'blur(0px)';
        sprite.style.clipPath = '';
        sprite.style.webkitClipPath = '';
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);
    }

    audio.addEventListener('play', startEffect);
    audio.addEventListener('ended', function () {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        sprite.classList.add('sprite-dissolving');
        sprite.style.visibility = 'hidden';
        sprite.style.opacity = '0';
        sprite.style.filter = 'blur(32px)';
        sprite.style.pointerEvents = 'none';
    });
})();
