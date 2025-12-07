// 1️⃣ Select elements by ID
const menu = document.getElementById("menu");
const startBtn = document.getElementById("start-btn");
const pizza = document.getElementById("pizza");

// 2️⃣ Game settings
let currentLevel = 1;
const maxLevel = 70;
let score = 0;
let gameRunning = false; // prevent multiple concurrent games
let currentInterval = null;
let currentHideTimeout = null;
let hitsThisLevel = 0;
let pendingNext = null;

// 5 positions pizza can appear
const positions = [
    {top: "10%", left: "50%", name: 'top'},   // top-middle
    {top: "50%", left: "97%", name: 'right'}, // right-middle (near edge)
    {top: "90%", left: "50%", name: 'bottom'},// bottom-middle
    {top: "50%", left: "3%", name: 'left'},  // very-left (near edge)
    {top: "50%", left: "50%", name: 'center'} // center
];
let currentPosName = null;
const game = document.getElementById('game');

// scoring system
let streak = 0; // consecutive successful catches
let multiplier = 1; // visual multiplier
let pointsThisLevel = 0;
let pizzaCaughtThisAppearance = false;
let highScore = parseInt(localStorage.getItem('pizzaHighScore') || '0', 10) || 0;

// 3️⃣ Start button click
startBtn.addEventListener("click", () => {
    if (gameRunning) return; // ignore repeated clicks
    gameRunning = true;
    // hide menu and start
    menu.style.display = "none";
    updateHUD();
    startLevel(currentLevel);
});

// results modal elements
const resultsModal = document.getElementById('level-results');
const resLevel = document.getElementById('res-level');
const resHits = document.getElementById('res-hits');
const resScore = document.getElementById('res-score');
const continueBtn = document.getElementById('continue-btn');
const quitBtn = document.getElementById('quit-btn');

function showResults(level, hits) {
    if (!resultsModal) return;
    resLevel.textContent = `Level: ${level}`;
    resHits.textContent = `Hits: ${hits}`;
    resScore.textContent = `Score: ${score}`;
    const resPoints = document.getElementById('res-points');
    if (resPoints) resPoints.textContent = `Points: ${pointsThisLevel}`;
    resultsModal.style.display = 'flex';
    // play a special sound if player scored 0 this level
    if (hits === 0) playZeroSound();
}

function hideResults() {
    if (!resultsModal) return;
    resultsModal.style.display = 'none';
}

continueBtn.addEventListener('click', () => {
    hideResults();
    if (pendingNext) {
        if (pendingNext <= maxLevel) {
            currentLevel = pendingNext;
            pendingNext = null;
            updateHUD();
            startLevel(currentLevel);
            return;
        }
        // finished all levels
        alert("Congratulations! You finished all levels!");
    }
    // reset and show menu
    gameRunning = false;
    menu.style.display = 'block';
    currentLevel = 1;
    score = 0;
    pendingNext = null;
    updateHUD();
});

quitBtn.addEventListener('click', () => {
    hideResults();
    // stop game and return to menu
    if (currentInterval) { clearInterval(currentInterval); currentInterval = null; }
    if (currentHideTimeout) { clearTimeout(currentHideTimeout); currentHideTimeout = null; }
    gameRunning = false;
    menu.style.display = 'block';
    currentLevel = 1;
    score = 0;
    pendingNext = null;
    updateHUD();
});

// update HUD display
function updateHUD() {
    const scoreEl = document.getElementById("score");
    const levelEl = document.getElementById("level");
    const comboEl = document.getElementById('combo');
    const hsEl = document.getElementById('highscore');
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    if (levelEl) levelEl.textContent = `Level: ${currentLevel}`;
    if (comboEl) comboEl.textContent = `Combo: x${multiplier.toFixed(2)}`;
    if (hsEl) hsEl.textContent = `High: ${highScore}`;
}

// 4️⃣ Function to start a level
function startLevel(level) {
    // each level should show the pizza 20 times
    const appearances = 20;
    let count = 0;
    hitsThisLevel = 0;

    // show small hint every 10 levels
    if (level % 10 === 0) {
        alert(`Level ${level}! Difficulty increased!`);
    }

    // clear any previous interval/timeout just in case
    if (currentInterval) {
        clearInterval(currentInterval);
        currentInterval = null;
    }
    if (currentHideTimeout) {
        clearTimeout(currentHideTimeout);
        currentHideTimeout = null;
    }

    // speed: visible time and gap reduce as level increases
    const visibleMs = Math.max(300, 1000 - (level - 1) * 10); // decreases by 10ms per level
    const gapMs = Math.max(150, 500 - Math.floor((level - 1) * 5)); // decreases by 5ms per level
    const intervalMs = visibleMs + gapMs;

    currentInterval = setInterval(() => {
        // pizza random position
        const pos = positions[Math.floor(Math.random() * positions.length)];
        pizza.style.top = pos.top;
        pizza.style.left = pos.left;
        currentPosName = pos.name || null;
        // adjust transform so edge positions don't overflow the viewport
        let transformValue = 'translate(-50%, -50%)';
        if (currentPosName === 'left') transformValue = 'translate(0, -50%)';
        if (currentPosName === 'right') transformValue = 'translate(-100%, -50%)';
        pizza.style.transform = transformValue;
        // center appearance: no special sound
        pizza.style.display = "block";

        // hide pizza after visibleMs if not clicked
        // store the timeout so we can clear it when clicked or when level ends
        if (currentHideTimeout) {
            clearTimeout(currentHideTimeout);
            currentHideTimeout = null;
        }
        pizzaCaughtThisAppearance = false;
        currentHideTimeout = setTimeout(() => {
            // if it wasn't caught, reset streak/multiplier
            if (!pizzaCaughtThisAppearance) {
                streak = 0;
                multiplier = 1;
                updateHUD();
            }
            pizza.style.display = "none";
            currentHideTimeout = null;
        }, visibleMs);

        // If pizza is clicked, the click handler will hide it and increment score.

        count++;

        if (count >= appearances) {
            // stop this level
            if (currentInterval) {
                clearInterval(currentInterval);
                currentInterval = null;
            }
            if (currentHideTimeout) {
                clearTimeout(currentHideTimeout);
                currentHideTimeout = null;
            }
            pizza.style.display = 'none';
            // show results for this level and wait for user to continue
            pendingNext = level + 1;
            showResults(level, hitsThisLevel);
            // reset per-level points (will be updated when continuing)
            // pointsThisLevel is preserved for display
        }
    }, intervalMs);
}

// Handle pizza clicks (score)
pizza.addEventListener('click', () => {
    // only count click when pizza is visible
    if (pizza.style.display === 'block') {
        // clear any pending hide timeout so it doesn't race
        if (currentHideTimeout) {
            clearTimeout(currentHideTimeout);
            currentHideTimeout = null;
        }
        pizzaCaughtThisAppearance = true;
        // handle scoring
        streak++;
        // multiplier increases every 3-streaks by +0.5, cap at +4 steps
        multiplier = 1 + Math.min(4, Math.floor(streak / 3)) * 0.5;
        awardPoints(currentLevel);
        hitsThisLevel++;
        pizza.style.display = 'none';
        // play click sound (synth)
        playDropSound();
    }
});

// Keyboard controls: Arrow keys catch pizza if it appears in that position
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;
    if (pizza.style.display !== 'block') return;
    const key = e.key;
    let matched = false;
    if (key === 'ArrowUp' && currentPosName === 'top') matched = true;
    if (key === 'ArrowDown' && currentPosName === 'bottom') matched = true;
    if (key === 'ArrowLeft' && currentPosName === 'left') matched = true;
    if (key === 'ArrowRight' && currentPosName === 'right') matched = true;
    // allow '0' (zero) or numpad 0 to catch the center pizza
    if ((key === '0' || key === 'Numpad0') && currentPosName === 'center') matched = true;
    if (matched) {
        // simulate click/catch
        if (currentHideTimeout) { clearTimeout(currentHideTimeout); currentHideTimeout = null; }
        pizzaCaughtThisAppearance = true;
        streak++;
        multiplier = 1 + Math.min(4, Math.floor(streak / 3)) * 0.5;
        awardPoints(currentLevel);
        hitsThisLevel++;
        pizza.style.display = 'none';
        playDropSound();
    }
});

// award points for a single catch
function awardPoints(level) {
    const base = 10 + Math.floor(level * 1.5);
    const points = Math.round(base * multiplier);
    score += points;
    pointsThisLevel += points;
    // update high score
    if (score > highScore) {
        highScore = score;
        try { localStorage.setItem('pizzaHighScore', String(highScore)); } catch (e) {}
    }
    updateHUD();
    // show floating points
    showPointsPop(points);
}

function showPointsPop(points) {
    if (!game) return;
    const rect = pizza.getBoundingClientRect();
    const parentRect = game.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - parentRect.left;
    const y = rect.top + rect.height / 2 - parentRect.top;
    const el = document.createElement('div');
    el.className = 'points-pop';
    el.textContent = `+${points}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    game.appendChild(el);
    setTimeout(() => { el.remove(); }, 800);
}

// Global synthesized water-drop sound on any click in the document
let audioCtx = null;
function ensureAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            audioCtx = null;
        }
    }
}

function playDropSound() {
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    // simple short filtered noise burst to sound like a water drop
    const bufferSize = audioCtx.sampleRate * 0.15; // 150ms
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    // fill with random noise shaped by an envelope
    for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        // fast decay envelope
        const env = Math.pow(1 - t, 3);
        data[i] = (Math.random() * 2 - 1) * 0.6 * env;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 700;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(now);
    source.stop(now + 0.16);
}

// Play drop sound on any click anywhere in the page
document.addEventListener('click', (e) => {
    // avoid double-playing when pizza click already called playDropSound: debounce by tiny timeout
    // but it's okay if it plays twice, so we simply call playDropSound for every click
    playDropSound();
});



// play a low short 'zero' sound to indicate zero hits
function playZeroSound() {
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(120, now);
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.36);
}

// Rules modal handlers
const rulesBtn = document.getElementById('rules-btn');
const rulesModal = document.getElementById('rules-modal');
const closeRules = document.getElementById('close-rules');
if (rulesBtn && rulesModal) {
    rulesBtn.addEventListener('click', () => {
        rulesModal.style.display = 'flex';
    });
}
if (closeRules && rulesModal) {
    closeRules.addEventListener('click', () => {
        rulesModal.style.display = 'none';
    });
}
