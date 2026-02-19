/**
 * SPA state machine with fade transitions and history management.
 * States: landing, loading, consent, albumSelection, memorySession, postMemory, ending
 * Asset paths: /assets/audio/... , /assets/images/...
 */
(function () {
    const DEV_MODE = true;

    var app = document.getElementById('app');
    if (!app) return;

    var state = 'landing';
    var playerName = 'Guest';
    var rafId = null;
    var consentGiven = false;
    var selectedAlbum = null;
    var visualizerCleanup = null;
    var idleVisualizerCleanup = null;
    var fadeTimeout = null;
    var album1TestTimeout = null;
    var burstTimeouts = [];
    var sessionStarted = false;
    var sessionEnding = false;
    var sayQueue = [];
    var sayTimeouts = [];
    var memorySessionAudioContext = null;
    var memorySessionSource = null;
    var memorySessionAnalyser = null;
    var audioDataProvider = null;
    var prevFreqData = null;

    var STORAGE_KEY = 'spa_albums_used';

    var ALBUMS = [
        { id: 'album1', title: 'Memories of Dawn', yearRange: '1998–2002', audioSrc: 'assets/audio/album1.wav', coverSrc: 'assets/images/album1/cover.jpg', memoryBursts: [{ img: 'assets/images/album1/burst1.jpg', lines: ['A moment of clarity.', 'The past echoes.'] }, { img: 'assets/images/album1/burst2.jpg', lines: ['Something shifts.'] }], used: false },
        { id: 'album2', title: 'Twilight Echoes', yearRange: '2003–2007', audioSrc: '/assets/audio/album2.mp3', coverSrc: 'assets/images/album2/cover.jpg', memoryBursts: [], used: false },
        { id: 'album3', title: 'Midnight Whispers', yearRange: '2008–2012', audioSrc: '/assets/audio/album3.mp3', coverSrc: 'assets/images/album3/cover.jpg', memoryBursts: [], used: false },
        { id: 'album4', title: 'Fading Light', yearRange: '2013–2017', audioSrc: '/assets/audio/album4.mp3', coverSrc: 'assets/images/album4/cover.jpg', memoryBursts: [], used: false }
    ];

    function loadAlbumsUsed() {
        if (DEV_MODE) return;
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                ALBUMS.forEach(function (a) {
                    if (data[a.id]) a.used = true;
                });
            }
        } catch (e) {}
    }

    function saveAlbumsUsed() {
        var data = {};
        ALBUMS.forEach(function (a) {
            data[a.id] = !!a.used;
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function getAlbum(id) {
        for (var i = 0; i < ALBUMS.length; i++) {
            if (ALBUMS[i].id === id) return ALBUMS[i];
        }
        return null;
    }

    function markAlbumUsed(id) {
        if (DEV_MODE) return;
        var album = getAlbum(id);
        if (album) {
            album.used = true;
            saveAlbumsUsed();
        }
    }

    function hasCompletedOneAlbum() {
        return ALBUMS.some(function (a) { return a.used; });
    }

    function allAlbumsUsed() {
        return ALBUMS.every(function (a) { return a.used; });
    }

    loadAlbumsUsed();

    // History management: prevent back navigation after consent
    var historyLockHandler = null;
    function setupHistoryLock() {
        if (consentGiven && !historyLockHandler) {
            history.pushState({ preventBack: true }, '');
            historyLockHandler = function (e) {
                if (consentGiven) {
                    history.pushState({ preventBack: true }, '');
                }
            };
            window.addEventListener('popstate', historyLockHandler);
        }
    }

    function setState(newState, payload) {
        if (state === newState) return;

        // Fade out current view
        var currentView = app.querySelector('.view');
        if (currentView) {
            currentView.classList.add('fade-out');
            setTimeout(function () {
                if (state === 'memorySession') cleanupMemorySession();
                if (state === 'albumSelection') {
                    sayTimeouts.forEach(function (id) { clearTimeout(id); });
                    sayTimeouts = [];
                }
                state = newState;
                if (state === 'albumSelection' && !DEV_MODE && allAlbumsUsed()) {
                    state = 'ending';
                }
                if (state === 'memorySession') {
                    sessionStarted = false;
                    sessionEnding = false;
                }
                if (payload) {
                    if (payload.playerName !== undefined) playerName = payload.playerName || 'Guest';
                    if (payload.selectedAlbum !== undefined) selectedAlbum = payload.selectedAlbum;
                    if (payload.consentGiven !== undefined) consentGiven = payload.consentGiven;
                }
                render();
                bindState();
                setupHistoryLock();
            }, 300);
        } else {
            if (state === 'memorySession') cleanupMemorySession();
            if (state === 'albumSelection') {
                sayTimeouts.forEach(function (id) { clearTimeout(id); });
                sayTimeouts = [];
            }
            state = newState;
            if (state === 'albumSelection' && !DEV_MODE && allAlbumsUsed()) {
                state = 'ending';
            }
            if (state === 'memorySession') {
                sessionStarted = false;
                sessionEnding = false;
            }
            if (payload) {
                if (payload.playerName !== undefined) playerName = payload.playerName || 'Guest';
                if (payload.selectedAlbum !== undefined) selectedAlbum = payload.selectedAlbum;
                if (payload.consentGiven !== undefined) consentGiven = payload.consentGiven;
            }
            render();
            bindState();
            setupHistoryLock();
        }
    }

    function escapeHtml(s) {
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function render() {
        var html = '<div class="view view-' + state + ' fade-in">';

        if (state === 'landing') {
            html +=
                '<div class="background-holder" role="img" aria-label="Background"></div>' +
                '<div class="landing-content">' +
                '  <h1 class="glow-text">Welcome</h1>' +
                '  <nav class="landing-nav">' +
                '    <button class="glow-button" data-action="start">Begin</button>' +
                '  </nav>' +
                '</div>';
        } else if (state === 'loading') {
            html +=
                '<div class="loading-content">' +
                '  <div class="loading-spinner"></div>' +
                '  <p class="glow-text">Loading memories...</p>' +
                '</div>';
        } else if (state === 'consent') {
            html +=
                '<div class="consent-content">' +
                '  <h1 class="glow-text">Release of Liability and Consent</h1>' +
                '  <section class="consent-section">' +
                '    <h2>Agreement</h2>' +
                '    <p>I understand that participation may involve risks, including but not limited to physical injury, discomfort, or other foreseeable and unforeseeable harms. I voluntarily assume all such risks.</p>' +
                '    <p>I hereby release, waive, discharge, and covenant not to sue the organizers, facilitators, and any related parties from any and all liability, claims, demands, or causes of action arising out of or related to my participation, whether caused by negligence or otherwise.</p>' +
                '    <p>I have read this release of liability, understand its terms, and agree to be bound by it. I am signing of my own free will.</p>' +
                '  </section>' +
                '  <form id="consent-form">' +
                '    <fieldset>' +
                '      <legend>Do you agree to the terms above?</legend>' +
                '      <label><input type="radio" name="agree" value="yes" required> Yes</label>' +
                '      <label><input type="radio" name="agree" value="no"> No</label>' +
                '    </fieldset>' +
                '    <p><label for="signature">Signature (type your full name):</label><br>' +
                '    <input type="text" id="signature" name="name" placeholder="Full name" required></p>' +
                '    <p><button type="submit" class="glow-button">Sign and continue</button></p>' +
                '  </form>' +
                '</div>';
        } else if (state === 'albumSelection') {
            html += '<div class="album-selection-content">' +
                '  <div class="album-header">' +
                '    <h1 class="glow-text">Select an Album</h1>' +
                '    <div id="viz-voice"><span id="viz-voice-inner"></span></div>' +
                '  </div>' +
                '  <div class="albums-grid">';
            ALBUMS.forEach(function (album) {
                var used = !!album.used && !DEV_MODE;
                var cls = 'album-card glow-card' + (used ? ' album-used' : '');
                html +=
                    '<div class="' + cls + '" data-album-id="' + escapeHtml(album.id) + '" data-used="' + (used ? 'true' : 'false') + '">' +
                    '  <h3>' + escapeHtml(album.title) + '</h3>' +
                    '  <p class="album-year">' + escapeHtml(album.yearRange) + '</p>' +
                    (used ? '<span class="album-sacrificed">SACRIFICED</span>' : '') +
                    '</div>';
            });
            html +=
                '  </div>' +
                '</div>';
        } else if (state === 'memorySession') {
            var album = getAlbum(selectedAlbum);
            var audioSrc = (album && album.audioSrc) ? album.audioSrc : '/assets/audio/song.mp3';
            html +=
                '<audio id="bgm" src="' + escapeHtml(audioSrc) + '" preload="metadata"></audio>' +
                '<div class="stage">' +
                '  <canvas id="viz"></canvas>' +
                '  <div id="memory-burst-layer">' +
                '    <div id="memory-burst-dim"></div>' +
                '    <img id="memory-burst-img" alt="" />' +
                '    <div id="memory-burst-text"><span class="memory-burst-text-inner"></span></div>' +
                '  </div>' +
                '  <div class="memory-session-fade" id="memory-session-fade" aria-hidden="true"></div>' +
                '</div>' +
                '<div id="viz-voice"><span id="viz-voice-inner"></span></div>' +
                '<div id="audio-debug" style="position:fixed;top:8px;left:8px;font-size:10px;color:rgba(232,228,239,0.6);font-family:monospace;z-index:100;">lowAvg: 0 midAvg: 0</div>' +
                '<button id="proceed-conversion-btn" class="glow-button" style="display:none;">Proceed with conversion</button>';
        } else if (state === 'postMemory') {
            html +=
                '<div class="post-memory-content">' +
                '  <h1 class="glow-text">Memory Complete</h1>' +
                '  <p>The memory has faded. What remains?</p>' +
                '  <div class="post-memory-buttons">' +
                '    <button class="glow-button" data-action="albumSelection">Continue</button>' +
                '    <button class="glow-button glow-button-leave" data-action="ending">Leave</button>' +
                '  </div>' +
                '</div>';
        } else if (state === 'ending') {
            html +=
                '<div class="ending-content">' +
                '  <h1 class="glow-text">The End</h1>' +
                '  <p>Thank you, ' + escapeHtml(playerName) + ', for sharing this journey.</p>' +
                '  <button class="glow-button" data-action="landing">Return to Beginning</button>' +
                '</div>';
        }

        html += '</div>';
        app.innerHTML = html;
    }

    function bindState() {
        if (state === 'landing') {
            var btn = app.querySelector('[data-action="start"]');
            if (btn) btn.addEventListener('click', function () { setState('loading'); });
        } else if (state === 'loading') {
            setTimeout(function () { setState('consent'); }, 1500);
        } else if (state === 'consent') {
            var form = document.getElementById('consent-form');
            var radios = document.querySelectorAll('input[name="agree"]');
            if (form) {
                radios.forEach(function (r) {
                    r.addEventListener('change', function () {
                        if (this.value === 'no') setState('landing');
                    });
                });
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    var nameInput = document.getElementById('signature');
                    var name = (nameInput && nameInput.value) ? nameInput.value.trim() : 'Guest';
                    setState('albumSelection', { playerName: name, consentGiven: true });
                });
            }
        } else if (state === 'albumSelection') {
            say(['Welcome.', 'Select an archive.', 'Conversion is irreversible.']);
            var cards = document.querySelectorAll('.album-card');
            cards.forEach(function (card) {
                if (!DEV_MODE && card.getAttribute('data-used') === 'true') return;
                card.addEventListener('click', function () {
                    var albumId = this.getAttribute('data-album-id');
                    setState('memorySession', { selectedAlbum: albumId });
                });
            });
        } else if (state === 'memorySession') {
            bindMemorySession();
        } else if (state === 'postMemory') {
            var btnContinue = app.querySelector('[data-action="albumSelection"]');
            var btnLeave = app.querySelector('[data-action="ending"]');
            if (btnContinue) {
                btnContinue.addEventListener('click', function () {
                    if (!DEV_MODE && allAlbumsUsed()) setState('ending');
                    else setState('albumSelection');
                });
            }
            if (btnLeave) btnLeave.addEventListener('click', function () { setState('ending'); });
        } else if (state === 'ending') {
            var btn = app.querySelector('[data-action="landing"]');
            if (btn) btn.addEventListener('click', function () { setState('landing'); });
        }
    }

    function showBurst(album, lastTwoIndices) {
        if (sessionEnding || !album || !album.memoryBursts || album.memoryBursts.length === 0) return;
        var available = [];
        for (var i = 0; i < album.memoryBursts.length; i++) {
            if (lastTwoIndices.indexOf(i) === -1) available.push(i);
        }
        if (available.length === 0) available = [0];
        var idx = available[Math.floor(Math.random() * available.length)];
        var burst = album.memoryBursts[idx];
        var dimEl = document.getElementById('memory-burst-dim');
        var imgEl = document.getElementById('memory-burst-img');
        var textEl = document.getElementById('memory-burst-text');
        if (!dimEl || !imgEl || !textEl) return;
        var line = burst.lines && burst.lines.length > 0 ? burst.lines[Math.floor(Math.random() * burst.lines.length)] : '';
        imgEl.src = burst.img || '';
        imgEl.style.opacity = '0.4';
        imgEl.style.filter = 'blur(4px)';
        imgEl.style.transform = 'translate(' + (Math.random() * 8 - 4) + 'px,' + (Math.random() * 8 - 4) + 'px)';
        var inner = textEl.querySelector && textEl.querySelector('.memory-burst-text-inner');
        if (inner) {
            inner.textContent = line;
            inner.classList.remove('reveal');
            void inner.offsetWidth;
            inner.classList.add('reveal');
        }
        var sweepDuration = 1200;
        setTimeout(function () {
            imgEl.style.opacity = '0';
            imgEl.style.filter = '';
            imgEl.style.transform = '';
            if (inner) {
                inner.classList.remove('reveal');
                inner.textContent = '';
            }
        }, sweepDuration + 50);
        return idx;
    }

    function scheduleBursts(album) {
        if (sessionEnding || !album || !album.memoryBursts || album.memoryBursts.length === 0) return;
        var lastTwo = [];
        function scheduleOne() {
            if (sessionEnding) return;
            var delay = 5000 + Math.random() * 5000;
            var id = setTimeout(function () {
                for (var i = 0; i < burstTimeouts.length; i++) {
                    if (burstTimeouts[i] === id) {
                        burstTimeouts.splice(i, 1);
                        break;
                    }
                }
                if (sessionEnding) return;
                var idx = showBurst(album, lastTwo);
                if (idx >= 0) {
                    lastTwo.push(idx);
                    if (lastTwo.length > 2) lastTwo.shift();
                }
                scheduleOne();
            }, delay);
            burstTimeouts.push(id);
        }
        scheduleOne();
    }

    function bindMemorySession() {
        sessionStarted = false;
        sessionEnding = false;
        var audio = document.getElementById('bgm');
        var canvas = document.getElementById('viz');
        var album = getAlbum(selectedAlbum);
        var proceedBtn = document.getElementById('proceed-conversion-btn');
        var voiceEl = document.getElementById('viz-voice-inner');

        if (!canvas) return;

        audioDataProvider = function() { return { freq: null, rms: 0, ptp: 0, zcr: 0 }; };
        idleVisualizerCleanup = initializeVisualizer(canvas, function() { return audioDataProvider(); });

        var introLines = ['Preparing conversion.', 'Memory extraction ready.'];
        say(introLines);

        setTimeout(function () {
            if (proceedBtn && !sessionStarted && !sessionEnding) {
                proceedBtn.style.display = 'block';
            }
        }, introLines.length * 2500 + 500);

        if (proceedBtn) {
            proceedBtn.addEventListener('click', function () {
                if (sessionStarted || sessionEnding) return;
                sessionStarted = true;
                proceedBtn.style.display = 'none';
                if (voiceEl) voiceEl.textContent = '';
                if (audio && canvas) {
                    var freqData = null;
                    var timeData = null;
                    var freqBinCount = 0;
                    
                    function initAudio() {
                        if (memorySessionAudioContext) return memorySessionAudioContext;
                        memorySessionAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                        memorySessionSource = memorySessionAudioContext.createMediaElementSource(audio);
                        memorySessionAnalyser = memorySessionAudioContext.createAnalyser();
                        memorySessionAnalyser.fftSize = 1024;
                        memorySessionAnalyser.smoothingTimeConstant = 0.55;
                        freqBinCount = memorySessionAnalyser.frequencyBinCount;
                        freqData = new Uint8Array(freqBinCount);
                        timeData = new Uint8Array(memorySessionAnalyser.fftSize);
                        memorySessionSource.connect(memorySessionAnalyser);
                        memorySessionAnalyser.connect(memorySessionAudioContext.destination);
                        return memorySessionAudioContext;
                    }
                    
                    function createLiveAnalyserProvider() {
                        initAudio();
                        if (!memorySessionAnalyser || !freqData || !timeData) {
                            return function() { return { freq: null, rms: 0, ptp: 0, zcr: 0 }; };
                        }
                        return function() {
                            if (!memorySessionAnalyser || !freqData || !timeData) {
                                return { freq: null, rms: 0, ptp: 0, zcr: 0 };
                            }
                            memorySessionAnalyser.getByteFrequencyData(freqData);
                            memorySessionAnalyser.getByteTimeDomainData(timeData);
                            
                            var sumSq = 0;
                            var min = 255;
                            var max = 0;
                            var zcCount = 0;
                            var prevSign = null;
                            
                            for (var i = 0; i < timeData.length; i++) {
                                var t = timeData[i];
                                var normalized = (t - 128) / 128;
                                sumSq += normalized * normalized;
                                if (t < min) min = t;
                                if (t > max) max = t;
                                
                                var sign = normalized >= 0 ? 1 : -1;
                                if (prevSign !== null && sign !== prevSign) {
                                    zcCount++;
                                }
                                prevSign = sign;
                            }
                            
                            var rms = Math.sqrt(sumSq / timeData.length);
                            var ptp = (max - min) / 255;
                            var zcr = zcCount / timeData.length;
                            
                            return { freq: freqData, rms: rms, ptp: ptp, zcr: zcr };
                        };
                    }
                    
                    initAudio();
                    if (memorySessionAudioContext && memorySessionAudioContext.state === 'suspended') {
                        memorySessionAudioContext.resume().catch(function (err) {
                            console.warn('AudioContext resume failed:', err);
                        });
                    }
                    audioDataProvider = createLiveAnalyserProvider();
                    visualizerCleanup = idleVisualizerCleanup;
                    idleVisualizerCleanup = null;
                    var playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(function (err) {
                            console.warn('Audio play failed:', err);
                        });
                    }
                    if (selectedAlbum === 'album1') {
                        if (album1TestTimeout) clearTimeout(album1TestTimeout);
                        album1TestTimeout = setTimeout(function () {
                            album1TestTimeout = null;
                            endMemorySession();
                        }, 20000);
                    }
                    if (album && album.memoryBursts && album.memoryBursts.length > 0) {
                        scheduleBursts(album);
                    }
                }
            });
        }

        if (audio) {
            audio.addEventListener('ended', function () {
                endMemorySession();
            });
        }
    }

    function initializeVisualizer(canvasEl, getAudioDataFn) {
        if (!canvasEl) return { destroy: function () {}, startFade: function () {} };
        var ctx = canvasEl.getContext('2d');
        var animationId = null;
        var running = true;
        var startTime = Date.now();
        var globalAngle = 0;
        var rotationSpeed = 0.00015;
        var particleCount = 600;
        var particles = [];
        var resizeHandler = null;
        var fadeStartTime = null;
        var fadeDuration = 1500;

        function resize() {
            var stage = canvasEl.parentElement;
            var cssW = stage ? stage.offsetWidth : window.innerWidth;
            var cssH = stage ? stage.offsetHeight : window.innerHeight;
            var dpr = window.devicePixelRatio || 1;
            canvasEl.width = Math.floor(cssW * dpr);
            canvasEl.height = Math.floor(cssH * dpr);
            canvasEl.style.width = cssW + 'px';
            canvasEl.style.height = cssH + 'px';
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            if (particles.length === 0) {
                var SEGMENTS = 24;
                var freqBinCount = 512;
                for (var i = 0; i < particleCount; i++) {
                    var t = i / (particleCount - 1);
                    var bin = Math.floor(1 + (Math.pow(t, 2.2) * (freqBinCount - 2)));
                    var angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
                    particles.push({
                        angle: angle,
                        radiusOffset: 20 + Math.random() * 60,
                        band: bin,
                        seg: Math.floor((angle / (2 * Math.PI)) * SEGMENTS),
                        size: 2 + Math.random() * 2,
                        hueOffset: Math.random() * 40
                    });
                }
            }
        }

        function startFade() {
            if (fadeStartTime === null) {
                fadeStartTime = Date.now();
            }
        }

        function draw() {
            if (!running || !ctx) return;
            var stage = canvasEl.parentElement;
            var cssW = stage ? stage.offsetWidth : window.innerWidth;
            var cssH = stage ? stage.offsetHeight : window.innerHeight;
            var cx = cssW / 2;
            var cy = cssH / 2;
            var baseRadius = Math.min(cssW, cssH) * 0.18;
            var currentTime = Date.now();
            var time = currentTime - startTime;

            var fadeAlpha = 1;
            if (fadeStartTime !== null) {
                var fadeElapsed = currentTime - fadeStartTime;
                fadeAlpha = Math.max(0, 1 - (fadeElapsed / fadeDuration));
            }

            ctx.fillStyle = 'rgba(10, 10, 15, 0.12)';
            ctx.fillRect(0, 0, cssW, cssH);

            var audioData = getAudioDataFn ? getAudioDataFn() : { freq: null, rms: 0, ptp: 0, zcr: 0 };
            var rms = audioData.rms || 0;
            var ptp = audioData.ptp || 0;
            var zcr = audioData.zcr || 0;
            var freqData = audioData.freq;

            var debugEl = document.getElementById('audio-debug');
            if (debugEl) {
                debugEl.textContent = 'rms: ' + rms.toFixed(3) + ' ptp: ' + ptp.toFixed(3) + ' zcr: ' + zcr.toFixed(3);
            }

            var SEGMENTS = 24;
            var segEnergy = [];
            var base = rms * 12;
            var detail = (zcr * 18) + (ptp * 10);
            for (var s = 0; s < SEGMENTS; s++) {
                segEnergy[s] = base + detail * (0.35 + 0.65 * Math.sin(time * 0.002 + s * 0.6));
            }

            var breath = 1 + rms * 0.10;
            breath = Math.max(1.0, Math.min(breath, 1.18));

            globalAngle += rotationSpeed;

            for (var p = 0; p < particles.length; p++) {
                var pt = particles[p];
                
                var local = segEnergy[pt.seg] || 0;
                var bandPush = Math.min(local, 28);
                
                var baseOffset = pt.radiusOffset;
                var radialVar = Math.sin(pt.angle * 6 + time * 0.0007) * 1.2;
                var dynamicRadiusOffset = baseOffset + radialVar;
                
                var shimmer = Math.sin(time * 0.001 + pt.angle * 3) * (0.4 + zcr * 2.0);
                var r = baseRadius * breath + dynamicRadiusOffset + bandPush + shimmer;
                r = Math.max(baseRadius * 0.6, Math.min(r, baseRadius * 1.6));
                
                var a = pt.angle + globalAngle;
                var x = cx + Math.cos(a) * r;
                var y = cy + Math.sin(a) * r;
                var baseSize = pt.size;
                var sizeMultiplier = 0.8 + (bandPush / 28) * 0.4;
                var size = baseSize * sizeMultiplier;
                var hue = 250 + pt.hueOffset;
                var baseAlpha = 0.4 + 0.5 * (bandPush / 28);
                var alpha = baseAlpha * fadeAlpha;
                
                ctx.shadowColor = 'hsla(' + hue + ', 50%, 70%, ' + (0.8 * fadeAlpha) + ')';
                ctx.shadowBlur = 12;
                ctx.fillStyle = 'hsla(' + hue + ', 45%, 55%, ' + alpha + ')';
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
            }
            ctx.shadowBlur = 0;

            animationId = requestAnimationFrame(draw);
        }

        resize();
        resizeHandler = resize;
        window.addEventListener('resize', resizeHandler);
        animationId = requestAnimationFrame(draw);

        return {
            destroy: function () {
                running = false;
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
                if (resizeHandler) {
                    window.removeEventListener('resize', resizeHandler);
                    resizeHandler = null;
                }
            },
            startFade: startFade
        };
    }

    function say(lines) {
        if (!lines || lines.length === 0) return;
        var voiceEl = document.getElementById('viz-voice-inner');
        if (!voiceEl) return;
        sayTimeouts.forEach(function (id) { clearTimeout(id); });
        sayTimeouts = [];
        sayQueue = Array.isArray(lines) ? lines.slice() : [lines];
        sayQueue.forEach(function (line, idx) {
            var id = setTimeout(function () {
                voiceEl.textContent = line;
                voiceEl.classList.remove('reveal');
                void voiceEl.offsetWidth;
                voiceEl.classList.add('reveal');
            }, idx * 2500);
            sayTimeouts.push(id);
        });
    }

    function endMemorySession() {
        if (sessionEnding) return;
        sessionEnding = true;
        var fadeEl = document.getElementById('memory-session-fade');
        var audio = document.getElementById('bgm');
        if (audio) audio.pause();
        clearAllBurstTimers();
        if (album1TestTimeout) {
            clearTimeout(album1TestTimeout);
            album1TestTimeout = null;
        }
        if (visualizerCleanup && typeof visualizerCleanup.startFade === 'function') {
            visualizerCleanup.startFade();
        }
        if (fadeEl) fadeEl.classList.add('active');
        if (fadeTimeout) clearTimeout(fadeTimeout);
        fadeTimeout = setTimeout(function () {
            fadeTimeout = null;
            cleanupMemorySession();
            if (selectedAlbum) markAlbumUsed(selectedAlbum);
            setState('postMemory');
        }, 1500);
    }

    function clearAllBurstTimers() {
        burstTimeouts.forEach(function (id) { clearTimeout(id); });
        burstTimeouts = [];
    }

    function cleanupMemorySession() {
        sessionEnding = true;
        sayTimeouts.forEach(function (id) { clearTimeout(id); });
        sayTimeouts = [];
        if (fadeTimeout) {
            clearTimeout(fadeTimeout);
            fadeTimeout = null;
        }
        if (album1TestTimeout) {
            clearTimeout(album1TestTimeout);
            album1TestTimeout = null;
        }
        clearAllBurstTimers();
        if (idleVisualizerCleanup && typeof idleVisualizerCleanup.destroy === 'function') {
            idleVisualizerCleanup.destroy();
            idleVisualizerCleanup = null;
        }
        if (visualizerCleanup && typeof visualizerCleanup.destroy === 'function') {
            visualizerCleanup.destroy();
            visualizerCleanup = null;
        }
        if (memorySessionSource && memorySessionAudioContext) {
            try {
                memorySessionSource.disconnect();
            } catch (e) {}
        }
        if (memorySessionAnalyser && memorySessionAudioContext) {
            try {
                memorySessionAnalyser.disconnect();
            } catch (e) {}
        }
        if (memorySessionAudioContext) {
            try {
                if (memorySessionAudioContext.state !== 'closed' && memorySessionAudioContext.close) {
                    memorySessionAudioContext.close();
                }
            } catch (e) {}
        }
        memorySessionAudioContext = null;
        memorySessionSource = null;
        memorySessionAnalyser = null;
        audioDataProvider = null;
        prevFreqData = null;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }



    // Initialize
    render();
    bindState();
})();
