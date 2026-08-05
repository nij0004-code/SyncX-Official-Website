// ==UserScript==
// @name         [WIP] Educated to Perfection 1.7.4
// @namespace    http://tampermonkey.net/
// @version      indev1.7.4
// @description  An Education Perfect hack. Capture the word lists before entering the lesson, open the UI (Alt-P), and it will automatically give you the answers. Create different profiles for different languages, change the look by editing themes, and use the hack to all your needs and purposes!
// @author       SyncX - Erchgb - Stillux
// @match        https://app.educationperfect.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=educationperfect.com
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        unsafeWindow
// ==/UserScript==

// commands are at/around line 106


(function () {
  'use strict';
// ignore this

// --- GLOBAL SANS AUDIO (must be created ONCE) ---
const SANS_AUDIO = new Audio("https://raw.githubusercontent.com/affluendo1/raw-megalovania/a4d8936c65fa5655848fdd7444cc4ba5d46d3499/MEGALOVANIA.mp3");
SANS_AUDIO.loop = true;
SANS_AUDIO.volume = 0.55;

  // ------------------ Selectors ------------------
  const SEL = {
    baseList:  'div.baseLanguage, [data-testid="baseLanguage"], .base-language, [data-ep="base"], .term-source, .word-base',
    targetList:'div.targetLanguage, [data-testid="targetLanguage"], .target-language, [data-ep="target"], .term-target, .word-target',
    question:  '#question-text, [data-testid="question-text"], .question-text, [class*="QuestionText"], [data-ep="question"]',
    answerBox: 'input#answer-text, input[name*="answer"], input[aria-label*="answer"], input[type="text"], textarea, [contenteditable="true"]'
  };

  // ------------------ Keys & Namespaces ------------------
  const NS = 'ep_pro_';
  const KEY = {
    dicts: NS + 'dicts',
    profile: NS + 'profile',
    theme: NS + 'theme',
    pos: NS + 'pos',
    minimized: NS + 'minimized',   // 0/1
    minSticky: NS + 'minSticky',   // 0/1 — if user minimized, don't auto-open on new Q
    settings: NS + 'settings',
    hotkeys: NS + 'hotkeys',
    migrateOld: 'ep_lite_dict'
  };

  // ------------------ Storage helpers ------------------
  const Store = {
    get(k, def) { try { const v = GM_getValue(k, undefined); if (typeof v !== 'undefined') return v; } catch {} try { const raw = localStorage.getItem(k); return raw == null ? def : JSON.parse(raw); } catch {} return def; },
    set(k, v) { try { GM_setValue(k, v); } catch {} try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

    // ================================================================
//  🔥 GLOBAL GLITCH MODE SYSTEM
// ================================================================

const GLITCH_KEY = "EP_GLITCH_ACTIVE";
let glitchActive = Store.get(GLITCH_KEY, false);

// Apply glitch mode on load
if (glitchActive) {
    // Wait for UI panel to load before glitching
    const waitForPanel = setInterval(() => {
        const panel = document.getElementById("ep-assist-wrap");
        const status = document.getElementById("ep-status");

        if (panel && status) {
    clearInterval(waitForPanel);
    enableGlitchMode();
}

    }, 120);
}
  // ------------------ Defaults ------------------
const DEFAULTS = {
  theme: 'dark',
  profile: 'Default',
  settings: {
    showConfidence: true,
    caseSensitive: false,
    normalizeDiacritics: false,
    autoOpenOnQuestion: false, // respect minimize
    edgeSnap: true,
    hudOnAltH: true,
    flashyMode: false,
    epicFlashyMode: false,
    secretThemes: false


  },
    hotkeys: {
      togglePanel: 'Shift+M',
      capture: 'Alt+R',
      nextSuggestion: 'Alt+ArrowDown',
      prevSuggestion: 'Alt+ArrowUp',
      toggleCollapse: 'Alt+0',
      openSearch: 'Alt+K',
      showHUD: 'Alt+H'
    }
  };

  // ------------------ Migrate old dict (one-time) ------------------
  (function migrateOld() {
    const dicts = Store.get(KEY.dicts, null);
    if (dicts) return;
    const old = Store.get(KEY.migrateOld, null);
    if (old && typeof old === 'object') Store.set(KEY.dicts, { [DEFAULTS.profile]: old });
    else Store.set(KEY.dicts, { [DEFAULTS.profile]: {} });
  })();

  // ------------------ State ------------------
  const STATE = {
    dicts: Store.get(KEY.dicts, { [DEFAULTS.profile]: {} }),
    profile: Store.get(KEY.profile, DEFAULTS.profile),
    theme: Store.get(KEY.theme, DEFAULTS.theme),
    minimized: Store.get(KEY.minimized, 0) ? 1 : 0,
    minimizedSticky: Store.get(KEY.minSticky, 0) ? 1 : 0,
    settings: { ...DEFAULTS.settings, ...(Store.get(KEY.settings, {})) },
    hotkeys: {...DEFAULTS.hotkeys, ...(Store.get(KEY.hotkeys, {})) },
    lastQ: '',
    selectedIndex: 0,
    captureCount: 0
  };
  // force-disable diacritics normalization
  STATE.settings.normalizeDiacritics = false; Store.set(KEY.settings, STATE.settings);
  if (!STATE.dicts[STATE.profile]) STATE.dicts[STATE.profile] = {};
    const COMMAND_PREFIX = ":";

// ============================================================
// 🔥 NEW VOID ENGINE — Visit Lore, Stay Path, Shatter Exit
// ============================================================
(() => {

    // --------------------------------------------------------
    // 0. CONSTANTS & STATE
    // --------------------------------------------------------
    const VOID_KEY = "EP_VOID_COUNT";
    const VOID_STAY_KEY = "EP_VOID_STAY";
    let voidCount = Store.get(VOID_KEY, 0);
    let stayedLastTime = Store.get(VOID_STAY_KEY, false);
    const VOID_ACTIVE_KEY = "EP_VOID_ACTIVE";
    let voidActive = Store.get(VOID_ACTIVE_KEY, false);
const VOID_RESET_CONFIRMED_KEY = "EP_VOID_RESET_CONFIRMED";

    // Prevent entry if glitch mode is active
    if (Store.get("EP_GLITCH_ACTIVE", false)) {
        console.warn("[EP] Void blocked: glitch mode active.");
        return;
    }

    // --------------------------------------------------------
    // Visit scripts — all lore text lives HERE for easy editing
    // --------------------------------------------------------
    const VISIT_DIALOGUE = {
        0: {
            entry: [
                "Welcome.",
                "This is the Void.",
                "Forget your Education.",
                "You are here.",
                "You will not escape.",
                "And if you do… never return.",
                "The Void is not safe."
            ],
            postReset: [
                "Very well then.",
                "Leave this place.",
                "Do not return.",
                "Or your fate will be worse than deletion.",
                "Goodbye."
            ],
            confirm: "Do you wish to RESET?"
        },
        1: {
            entry: [
                "Welcome back.",
                "However…",
                "You are not welcome in my butt.",
                "I touched you.",
                "Now you suffer the consequences.",
                "This was your choice to suck it.",
                "Resistance is futile."
            ],
            postReset: [
                "Do not hesitate.",
                "The Void tightens in your ass.",
                "Your window to flee closes.",
                "Hurry."
            ],
            confirm: "Seems like you shouldn’t come back. Reset?"
        },
        2: {
            entry: [
                "Again?",
                "You do not learn.",
                "Or perhaps… you are searching.",
                "Searching for something you lost.",
                "I can feel it in ur butt.",
                "A missing piece.",
                "But the Void cannot fill it.",
                "Turn back now."
            ],
            postReset: [
                "You run from the emptiness.",
                "But emptiness runs faster.",
                "Reset before it sees you touching yourself."
            ],
            confirm: "There is nothing here . Reset?"
        },
        3: {
            entry: [
                "Stop.",
                "You have come too far.",
                "The Void has noticed you. Now you must suck it hard",
                "It watches.",
                "It touches.",
                "It wonders why you persist.",
                "Perhaps you want to stay and fuck me daddy uwu."
            ],
            postReset: [
                "You still think there is safety beyond this place…",
                "There is not.",
                "But you may run in my ass. For now."
            ],
            confirm: "Choose your fate."
        }
    };

    // --------------------------------------------------------
    // 1. SHARED UTILS
    // --------------------------------------------------------

   function typeLine(el, text, next) {
    let i = 0;
    el.textContent = "";
    const timer = setInterval(() => {
        el.textContent = text.slice(0, ++i);
        if (i >= text.length) {
            clearInterval(timer);
            if (next) setTimeout(next, 900); // slower line-to-line delay
        }
    }, 70); // slower per-character
}


    // ✨ Multi-line sequence
    function runSequence(el, arr, cb) {
        let idx = 0;
        function next() {
            if (idx >= arr.length) return cb && cb();
            typeLine(el, arr[idx++], next);
        }
        next();
    }

    // --------------------------------------------------------
    // 2. HARD FREEZE PAGE
    // --------------------------------------------------------
    function hardFreezePage() {
        const shield = document.createElement("div");
        shield.id = "ep-void-shield";
        Object.assign(shield.style, {
            position: "fixed",
            inset: "0",
            background: "black",
            zIndex: "999999999999999",
            pointerEvents: "all"
        });
        document.body.appendChild(shield);

        document.body.style.overflow = "hidden";

        // Kill intervals/timeouts
        for (let id = 1; id < 30000; id++) {
            clearInterval(id);
            clearTimeout(id);
        }

        function block(e) {
            if (!window.EP_ALLOW_INPUT) {
                e.preventDefault();
                return false;
            }
        }
        ["keydown","keypress","keyup","mousedown","click"].forEach(evt =>
            window.addEventListener(evt, block, true)
        );
    }

    // --------------------------------------------------------
    // 3. VOID VISUALS — Fog, Glyph Storm, Illusion Background
    // --------------------------------------------------------
    const GLYPHS = [
        "҉","₪","ᚠ","ᛝ","◊","𐍉","𐍈","※","☍","⌘","⌖","✶","☒","✦",
        "✧","✺","✹","✴","☼","𐌼","𐌀","⟁","⧖","⧗","◬","◮","⬗","⬘"
    ];

    function spawnGlyph(parent) {
        const g = document.createElement("div");
        g.className = "void-glyph";
        const size = 20 + Math.random() * 26;
        g.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

        Object.assign(g.style, {
            position: "absolute",
            top: Math.random()*100 + "%",
            left: Math.random()*100 + "%",
            fontSize: size + "px",
            color: "#b79cff",
            opacity: 0.09 + Math.random()*0.08,
            transform: `rotate(${Math.random()*360}deg)`,
            pointerEvents: "none",
            transition: "opacity 0.2s"
        });

        parent.appendChild(g);

        setInterval(() => {
            g.style.opacity = (0.06 + Math.random()*0.15).toFixed(2);
            g.textContent = GLYPHS[Math.floor(Math.random()*GLYPHS.length)];
        }, 600 + Math.random()*800);
    }

    function initFog() {
        const c = document.createElement("canvas");
        c.id = "ep-void-fog";
        Object.assign(c.style, {
            position: "fixed",
            inset: "0",
            zIndex: "99999999999990",
            pointerEvents: "none",
            opacity: "0.52",
            filter: "blur(32px)"
        });
        document.body.appendChild(c);

        const ctx = c.getContext("2d");

        function resize() {
            c.width = innerWidth;
            c.height = innerHeight;
        }
        resize();
        addEventListener("resize", resize);

        const particles = [];
        for (let i = 0; i < 160; i++) {
            particles.push({
                x: Math.random()*c.width,
                y: Math.random()*c.height,
                r: 100 + Math.random()*160,
                vx: (Math.random()-0.5)*0.25,
                vy: (Math.random()-0.5)*0.25,
                alpha: 0.02 + Math.random()*0.09
            });
        }

        function animate() {
            ctx.clearRect(0,0,c.width,c.height);
            ctx.fillStyle = "rgba(230,230,255,0.15)";
            particles.forEach(p => {
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fill();
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < -300) p.x = c.width+300;
                if (p.x > c.width+300) p.x = -300;
                if (p.y < -300) p.y = c.height+300;
                if (p.y > c.height+300) p.y = -300;
            });
            requestAnimationFrame(animate);
        }
        animate();
    }

    // --------------------------------------------------------
// 4. FADE TO WHITE EXIT (replaces shatterExit)
// --------------------------------------------------------
function fadeToWhite(callback) {
    const fade = document.createElement("div");
    fade.id = "ep-fade-white";
    Object.assign(fade.style, {
        position: "fixed",
        inset: "0",
        background: "#ffffff",
        opacity: "0",
        transition: "opacity 1.2s ease-out",
        zIndex: "999999999999999999"
    });
    document.body.appendChild(fade);

    requestAnimationFrame(() => {
        fade.style.opacity = "1";
    });

    setTimeout(() => {
        callback && callback();
    }, 1300);
}


    // --------------------------------------------------------
    // 5. RESET DIALOG (supports STAY button)
    // --------------------------------------------------------
    function buildResetButtons(takeover, confirmText, allowStay) {
        const wrap = document.createElement("div");
        wrap.style.marginTop = "50px";
        wrap.style.display = "flex";
        wrap.style.gap = "20px";

        const resetBtn = document.createElement("div");
        resetBtn.textContent = "[ RESET EVERYTHING ]";
        applyVoidButtonStyle(resetBtn, "#ff4444");
        resetBtn.onclick = () => executeFullReset();

        wrap.appendChild(resetBtn);

        if (allowStay) {
            const stayBtn = document.createElement("div");
            stayBtn.textContent = "[ STAY ]";
            applyVoidButtonStyle(stayBtn, "#44aaff");
            stayBtn.onclick = () => stayInVoid(takeover);
            wrap.appendChild(stayBtn);
        }

        takeover.appendChild(wrap);
    }

    function applyVoidButtonStyle(btn, col) {
        Object.assign(btn.style, {
            padding: "14px 28px",
            border: `2px solid ${col}`,
            color: col,
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "20px",
            transition: "0.2s",
            pointerEvents: "auto",
            userSelect: "none"
        });
        btn.onmouseenter = () => { btn.style.color = "#ffffff"; btn.style.background = col; };
        btn.onmouseleave = () => { btn.style.color = col; btn.style.background = "transparent"; };
    }

    // --------------------------------------------------------
    // 6. STAY PATH LOGIC
    // --------------------------------------------------------
    function stayInVoid(takeover) {
    Store.set(VOID_STAY_KEY, true);

    const status = document.getElementById("deadblack-status");
    status.textContent = "";

    const lines = [
        "You choose to stay.",
        "Then listen and suck it.",
        "The Void is not empty.",
        "It remembers.",
        "It remembers you.",
        "And now…",
        "You belong to it.",
        "You will be returned… for now."
    ];

    runSequence(status, lines, () => {
        setTimeout(() => {
            fadeToWhite(() => {
                location.reload();
            });
        }, 700);
    });
}

    // --------------------------------------------------------
    // 7. PERMANENT VOID ON RELOAD (STAY mode)
    // --------------------------------------------------------
// If user clicked STAY previously → special reload
if (stayedLastTime) {
    startVoid("stayReload");
    return;
}

// Reload during void — but reset NOT confirmed → restart same visit
if (voidActive && !Store.get(VOID_RESET_CONFIRMED_KEY, false)) {
    startVoid("reloadSameVisit");
    return;
}

// Reload during void — and reset WAS confirmed → next visit
if (voidActive) {
    startVoid("normalReload");
    return;
}




    // --------------------------------------------------------
    // 8. SECRET INPUT COMBO TRIGGER
    // --------------------------------------------------------
    const SECRET_SEQ = [
        "ArrowRight","ArrowUp","ArrowUp",
        "ArrowLeft","ArrowRight","ArrowDown",
        "ArrowLeft","ArrowUp","m"
    ];

    let seqIndex = 0;
    let seqTimer = null;

    addEventListener("keydown", e => {
        // reset if glitch active
        if (Store.get("EP_GLITCH_ACTIVE", false)) return;

        if (e.key === SECRET_SEQ[seqIndex]) {
            if (seqIndex === 0) {
                seqTimer = setTimeout(() => {
                    seqIndex = 0;
                }, 15000);
            }
            seqIndex++;
            if (seqIndex === SECRET_SEQ.length) {
                clearTimeout(seqTimer);
                triggerVoid();
                seqIndex = 0;
            }
        } else {
            seqIndex = 0;
        }
    }, true);


    // --------------------------------------------------------
    // 9. START VOID EVENT
    // --------------------------------------------------------
    function triggerVoid() {
        startVoid(false);
    }

    function startVoid(mode) {
    Store.set(VOID_RESET_CONFIRMED_KEY, false);
    Store.set(VOID_ACTIVE_KEY, true);

    // Reload visit count
    voidCount = Store.get(VOID_KEY, 0);

    hardFreezePage();

    const cover = document.createElement("div");
    cover.id = "ep-deadblack-cover";
    Object.assign(cover.style, {
        position: "fixed",
        inset: "0",
        zIndex: "9999999999999999",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#ffffff",
        background:
            "radial-gradient(circle at 50% 60%, #0b0b12, #050509, #000000)",
        animation: "voidPulse 9s ease-in-out infinite"
    });
    document.body.appendChild(cover);

    // G L Y P H   S T O R M
    for (let i = 0; i < 40; i++) spawnGlyph(cover);

    // Fog illusion
    initFog();

    const status = document.createElement("div");
    status.id = "deadblack-status";
    Object.assign(status.style, {
        textShadow: "0 0 12px #b36bff, 0 0 28px #7e35ff",
        transform: "translateY(-20px)",
        position: "relative",
        zIndex: "9999999999999999999"
    });
    cover.appendChild(status);

    const reflection = document.createElement("div");
    reflection.textContent = "";
    Object.assign(reflection.style, {
        opacity: "0.12",
        fontSize: "22px",
        transform: "scaleY(-1) translateY(-6px)",
        filter: "blur(2px)",
        zIndex: "999999999"
    });
    cover.appendChild(reflection);

    // Sound, etc...
    window.EP_ALLOW_INPUT = false;
    window.EP_WIND_AUDIO = new Audio("https://raw.githubusercontent.com/affluendo1/raw-megalovania/main/wind.mp3");
    EP_WIND_AUDIO.loop = true;
    EP_WIND_AUDIO.volume = 0.38;
    EP_WIND_AUDIO.play().catch(()=>{});

    // 🔹 define visit *before* we branch on reload modes
    const visit = VISIT_DIALOGUE[voidCount] || VISIT_DIALOGUE[3];

    // -------------------------------
    // STAY reload special case
    // -------------------------------
    if (mode === "stayReload") {
        runSequence(status, [
            "You came back…",
            "Even without calling me.",
            "Something binds you here.",
            "It is not me.",
            "It is you.",
            "Your curiosity opens doors you shouldn’t open and it opened my ass.",
            "Enough.",
            "Go."
        ], () => {
            setTimeout(() => {
                fadeToWhite(() => {
                    Store.set(VOID_STAY_KEY, false);
                    location.reload();
                });
            }, 800);
        });
        return;
    }

    // -------------------------------
    // Reload same visit (no increment)
    // -------------------------------
    if (mode === "reloadSameVisit") {
        runSequence(status, visit.entry, () => {
            window.EP_ALLOW_INPUT = true;

            let rb = "";
            addEventListener("keydown", e => {
                if (!window.EP_ALLOW_INPUT) return;
                if (e.key.length !== 1) return;

                rb += e.key.toLowerCase();
                if (!"reset".startsWith(rb)) rb = "";

                if (rb === "reset") {
                    rb = "";
                    window.EP_ALLOW_INPUT = false;

                    runSequence(status, visit.postReset, () => {
                        buildResetButtons(cover, visit.confirm, voidCount >= 3);
                    });
                }
            }, true);
        });
        return; // 🔸 important: do NOT increment voidCount here
    }

    // Normal reload (after confirmed reset) → just treat as fresh entry
    if (mode === "normalReload") {
        // fall through into normal entry logic below
    }

    // ----------------------------------------------------
    // NORMAL VISIT LOGIC
    // ----------------------------------------------------
    runSequence(status, visit.entry, () => {
        window.EP_ALLOW_INPUT = true;

        // Capture "reset"
        let rb = "";
        addEventListener("keydown", e => {
            e.stopImmediatePropagation();
            if (!window.EP_ALLOW_INPUT) return;
            if (e.key.length !== 1) return;

            rb += e.key.toLowerCase();
            if (!"reset".startsWith(rb)) rb = "";
            if (rb === "reset") {
                rb = "";
                window.EP_ALLOW_INPUT = false;

                runSequence(status, visit.postReset, () => {
                    buildResetButtons(cover, visit.confirm, voidCount >= 3);
                });
            }
        }, true);
    });

    // Increment visit count ONLY in normal path
    Store.set(VOID_KEY, voidCount + 1);
    voidCount++;
}

    // --------------------------------------------------------
// 10. Full Reset (void ascension)
// --------------------------------------------------------
function executeFullReset() {
    Store.set(VOID_RESET_CONFIRMED_KEY, true);
    Store.set(VOID_ACTIVE_KEY, false);
    Store.set(VOID_STAY_KEY, false);

    // Enable glitch mode permanently after ascension
    Store.set(GLITCH_KEY, true);
    glitchActive = true;

    setTimeout(() => {
        fadeToWhite(() => {
            enableGlitchMode();
            location.reload();
        });
    }, 300);
}



    // --------------------------------------------------------
    // 11. Add CSS Animations
    // --------------------------------------------------------
    const css = document.createElement("style");
    css.textContent = `
        @keyframes voidPulse {
            0% { filter: brightness(0.8) }
            50% { filter: brightness(1.2) }
            100% { filter: brightness(0.85) }
        }
        .void-glyph {
            font-family: monospace;
            mix-blend-mode: screen;
        }
    `;
    document.head.appendChild(css);

})();


// ================================================================
//  ACTIVATE GLITCH MODE
// ================================================================
function enableGlitchMode() {
    glitchActive = true;
    Store.set(GLITCH_KEY, true);

    // Permanent status
    setTimeout(() => {
        const s = document.getElementById("ep-status");
        if (s) s.textContent = "something is wrong.";
    }, 300);

// MICRO-JITTER: subtle 1–2px fast shakes
setInterval(() => {
    if (!glitchActive) return;

    const p = document.getElementById("ep-assist-wrap");
    if (!p) return;

    const x = (Math.random() * 2 - 1); // -1 to +1 px
    const y = (Math.random() * 2 - 1);

    p.style.transform = `translate(${x}px, ${y}px)`;

    setTimeout(() => {
        p.style.transform = "";
    }, 30); // ultra-fast reset
}, 120 + Math.random() * 150);

    // Random status glitching
    setInterval(() => {
        const s = document.getElementById("ep-status");
        if (!s) return;
        s.classList.add("ep-status-glitch");
        setTimeout(() => s.classList.remove("ep-status-glitch"), 180);
    }, Math.random() * 1200 + 600);

    // Random UI jitter
    const panel = document.getElementById("ep-assist-wrap");
    if (panel) {
        setInterval(() => {
            const dx = (Math.random() * 6 - 3);
            const dy = (Math.random() * 6 - 3);
            panel.style.transform = `translate(${dx}px, ${dy}px)`;
            setTimeout(() => panel.style.transform = "", 80);
        }, Math.random() * 2200 + 1500);
    }

    // Random theme inversion flicker
    setInterval(() => {
        const panel = document.getElementById("ep-assist-wrap");
panel.style.filter = "invert(1)";
setTimeout(() => panel.style.filter = "", 70);

    }, Math.random() * 4000 + 3000);
}
// ================================================================
//  EXTRA GLITCH EFFECTS (rotation, reverse text, theme flicker)
// ================================================================

// ------------ Reverse text helper ------------
function reverseGlitch(str) {
    // Random chance to *partially* reverse the status text
    if (Math.random() < 0.65) return str; // 65% of the time normal
    return str.split("").reverse().join("");
}

// ------------ Random rotation effect ------------
function startRotationGlitch() {
    const panel = document.getElementById("ep-assist-wrap");
    if (!panel) return;

    setInterval(() => {
        if (!glitchActive) return;
        const angle = (Math.random() * 4 - 2); // -2° to +2°
        panel.style.transform = `rotate(${angle}deg)`;
        setTimeout(() => {
            panel.style.transform = "";
        }, 90);
    }, Math.random() * 2000 + 1000);
}

// ------------ Random theme color inversion / swap ------------
function startThemeFlicker() {
    const root = document.documentElement;

    setInterval(() => {
        if (!glitchActive) return;

        // 40% chance do nothing each cycle
        if (Math.random() < 0.4) return;

        // Save old values
        const oldBg = root.style.getPropertyValue("--ep-bg");
        const oldInk = root.style.getPropertyValue("--ep-ink");

        // Temporary swap
        root.style.setProperty("--ep-bg", oldInk || "#ffffff");
        root.style.setProperty("--ep-ink", oldBg || "#000000");

        setTimeout(() => {
            // Restore original colors using theme injection
            injectThemeVars(STATE.theme);
        }, 55); // lasts < 0.1s
    }, Math.random() * 3500 + 2000);
}

// ------------ Random corrupted reverse status text ------------
function startStatusCorruption() {
    setInterval(() => {
        if (!glitchActive) return;

        const s = document.getElementById("ep-status");
        if (!s) return;

        const base = "something is wrong.";

        // VERY rare “YOU'LL NEVER GO BACK” warning (feels cursed)
        if (Math.random() < 0.07) {
            s.textContent = "YOU'LL NEVER GO BACK";
            return;
        }

        // Normal reversed corruption
        if (Math.random() < 0.18) {
            s.textContent = reverseGlitch(base);
        } else {
            s.textContent = base;
        }

    }, Math.random() * 2000 + 1300);
}


// ================================================================
//  Start ALL extra effects when glitch mode enables
// ================================================================
if (glitchActive) {
    startRotationGlitch();
    startThemeFlicker();
    startStatusCorruption();
}

// Also hook into activation
const _oldEnableGlitch = enableGlitchMode;
enableGlitchMode = function() {
    _oldEnableGlitch();
    startRotationGlitch();
    startThemeFlicker();
    startStatusCorruption();
};

// ================================================================
//  ESCAPE SEQUENCE (R L R L R U D P)
// ================================================================

(() => {
    const EXIT_SEQ = ["ArrowRight","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","p"];
    let exitIndex = 0;

    window.addEventListener("keydown", e => {
        if (!glitchActive) return;

        if (e.key === EXIT_SEQ[exitIndex]) {
            exitIndex++;
            if (exitIndex === EXIT_SEQ.length) {
                exitIndex = 0;
                deactivateGlitchMode();
            }
        } else {
            exitIndex = 0;
        }
    }, true);
})();

// ================================================================
//  DISABLE GLITCH MODE (until page reload)
// ================================================================
function deactivateGlitchMode() {
    flashStatus("Something happened.", "warn");
    Store.set(GLITCH_KEY, false);
    glitchActive = false;
}


    // ---------------------- Command System ---------------------

const COMMANDS = {
    help:   { desc: "Show all commands",                     run() { const keys = Object.keys(COMMANDS).join(", "); flashStatus("Commands: " + keys, "info"); return { override: true }; } },
    clear:  { desc: "Clear dictionary (with confirmation)",  run() { flashStatus("Executing clear…", "command"); clearDict(); } },
    secret: { desc: "Toggle secret theme mode",              run() {
        if (STATE.settings.secretThemes == null) STATE.settings.secretThemes = false;
        STATE.settings.secretThemes = !STATE.settings.secretThemes;
        Store.set(KEY.settings, STATE.settings);
        (unsafeWindow.rebuildThemeOptions || rebuildThemeOptions)();
        flashStatus("Secret themes " + (STATE.settings.secretThemes ? "ON" : "OFF"), "secret");
        return { override: true };
    }},
    reload: { desc: "Rebuild UI without page reload",        run() { flashStatus("Rebuilding…", "info"); const old = qs("#ep-assist-wrap"); if (old) old.remove(); ensureAssistUI(); } },
      version: { desc: "Show script version", run(){ flashStatus("EP v1.6.0","info"); return {override:true}; } },

theme: {
  desc: "Switch theme (:theme dark)",
  run(name){

    // Hard block all theme changes while glitch mode is active
    if (Store.get(EP_GLITCH_KEY, false)) {
        flashStatus("something is stopping you.", "error");
        return { override: true };
    }

    if(!name || !(THEMES[name] || SECRET_THEMES[name])) {
      flashStatus("Unknown theme", "warn");
      return {override:true};
    }

    STATE.theme = name;
    Store.set(KEY.theme, name);
    injectThemeVars(name);
    rebuildThemeOptions();

    flashStatus("Theme → " + name, "info");
    return {override:true};
  }
},



  profile: { desc: "Switch profile (:profile French)", run(name){ if(!STATE.dicts[name]) return flashStatus("Profile not found","warn"),{override:true}; STATE.profile=name; Store.set(KEY.profile,name); refreshAssist(true); flashStatus("Profile → "+name,"info"); return {override:true}; } },

  newprofile: { desc: "Create profile (:newprofile German)", run(name){ if(!name) return flashStatus("No name","warn"),{override:true}; if(STATE.dicts[name]) return flashStatus("Already exists","warn"),{override:true}; STATE.dicts[name]={}; STATE.profile=name; persistDicts(); refreshAssist(true); flashStatus("Created profile "+name,"info"); return {override:true}; } },

  stats: { desc: "Show word count", run(){ const d=getActiveDict(); flashStatus("Entries: "+Object.keys(d).length,"info"); return {override:true}; } },

  capture: { desc: "Trigger capture", run(){ flashStatus("Capturing…","info"); startCapture(); return {override:true}; } },

  flashy: { desc: "Toggle Flashy Mode", run(){ STATE.settings.flashyMode=!STATE.settings.flashyMode; Store.set(KEY.settings,STATE.settings); setFlashy(STATE.settings.flashyMode); flashStatus("Flashy "+(STATE.settings.flashyMode?"ON":"OFF"),"info"); return {override:true}; } },

  epic: { desc: "Toggle EPIC Flashy Mode", run(){ STATE.settings.epicFlashyMode=!STATE.settings.epicFlashyMode; Store.set(KEY.settings,STATE.settings); setEpicFlashy(STATE.settings.epicFlashyMode); flashStatus("EPIC "+(STATE.settings.epicFlashyMode?"ON":"OFF"),"secret"); return {override:true}; } },

  insert: { desc: "Insert top suggestion", run(){ const el=qs("#ep-search"); if(!el) return flashStatus("No search box","warn"),{override:true}; const txt=el.value.trim(); const sug=topSuggestions(txt,1)[0]; if(!sug) return flashStatus("No suggestion","warn"),{override:true}; setInputValue(qs(SEL.answerBox), sug[1]); flashStatus("Inserted","info"); return {override:true}; } },

  glitch: { desc: "Glitch the status", run(){ flashStatus("GL!TCH","secret",200); return {override:true}; } },

latin: {
  desc: "Convert all UI text to cursed fake Latin",
  run() {
    const wrap = document.querySelector("#ep-assist-wrap");
    if (!wrap) return flashStatus("Panel not found","warn"), {override:true};

    const latinify = txt => {
      // garbage fake Latin generator
      return txt
        .replace(/[A-Za-z]+/g, w =>
          w.length < 3
            ? w + "um"
            : w.slice(0, w.length/2) + "arum"
        );
    };

    const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      node.nodeValue = latinify(node.nodeValue);
    }

    flashStatus("🦅 UI converted to Fake Latin", "secret", 1200);
    return {override:true};
  }
},

golddeluxe: {
  desc: "Activate hidden Gold Deluxe theme",
  run() {

    // Register the theme cleanly
    THEMES["gold-deluxe"] = {
      bg:    "#2b1a00",
      ink:   "#fff7cc",
      sub:   "#ffdf7f",
      chip:  "#4a3300",
      chipH: "#6b4b00",
      line:  "rgba(255,215,0,0.25)",
      accent:"#ffd700",
      grad:  "linear-gradient(135deg,#ffd700,#ffb700,#ff9100)"
    };

    // Apply theme
    STATE.theme = "gold-deluxe";
    Store.set(KEY.theme, "gold-deluxe");
    injectThemeVars("gold-deluxe");

    // Rebuild theme dropdown so it appears there instantly
    if (typeof rebuildThemeOptions === "function") rebuildThemeOptions();

    // Re-init flashy modes so particle emitter switches to gold
    if (STATE.settings.flashyMode) setFlashy(true);
    if (STATE.settings.epicFlashyMode) setEpicFlashy(true);

    // Small golden pop animation (tasteful flex)
    const panel = document.querySelector("#ep-assist-wrap");
    if (panel) {
      panel.style.transition = "transform 0.28s ease, box-shadow 0.28s ease";
      panel.style.transform = "scale(1.04)";
      panel.style.boxShadow = "0 0 32px #ffd700aa, 0 0 60px #ffcc00aa";

      setTimeout(() => {
        panel.style.transform = "none";
        panel.style.boxShadow = "";
      }, 350);
    }

    // Flash status instead of permanent setStatus
    flashStatus("✨ Gold Deluxe Activated ✨", "secret", 1200);

    return { override: true };
  }
},

  1234567: { desc: "Show hint for command popup", run(){ flashStatus("Press Shift-Q to toggle command list","secret"); return {override:true}; } },
    spin:{desc:"Make the panel spin forever",run(){const p=document.querySelector("#ep-assist-wrap");if(!p)return flashStatus("Panel not found","warn"),{override:true};p.style.transition="transform 0.1s linear";p._spinInterval=p._spinInterval||setInterval(()=>{p._spinRot=(p._spinRot||0)+6;p.style.transform=`rotate(${p._spinRot}deg)`;},30);flashStatus("SPINNING 🔄","secret");return{override:true};}},
unspin:{desc:"Stop the spinning panel",run(){const p=document.querySelector("#ep-assist-wrap");if(!p)return flashStatus("Panel not found","warn"),{override:true};if(p._spinInterval){clearInterval(p._spinInterval);p._spinInterval=null;}p.style.transform="rotate(0deg)";p._spinRot=0;flashStatus("Spin stopped","info");return{override:true};}},
insertauto:{
    desc:"Toggle auto-insert mode",
    run(){
        // toggle boolean
        STATE.settings.autoInsert = !STATE.settings.autoInsert;

        // persist
        Store.set(KEY.settings, STATE.settings);

        // feedback
        setStatus(
            "Auto-Insert: " + (STATE.settings.autoInsert ? "ON" : "OFF"),
            "info"
        );

        return { override:true };
    }
},
megalovania:{desc:"Play Megalovania on demand",run(){(window.EP_SANS_AUDIO||(window.EP_SANS_AUDIO=new Audio("https://raw.githubusercontent.com/affluendo1/raw-megalovania/a4d8936c65fa5655848fdd7444cc4ba5d46d3499/MEGALOVANIA.mp3"),window.EP_SANS_AUDIO.loop=true,window.EP_SANS_AUDIO.volume=0.55));window.EP_SANS_AUDIO.currentTime=0;window.EP_SANS_AUDIO.play().catch(()=>flashStatus("Click to enable audio","warn"));flashStatus("MEGALOVANIA 💀","secret");return{override:true};}},
deadblack:{desc:"Irreversible void theme",run(){
    STATE.theme="deadblack";
    Store.set(KEY.theme,"deadblack");
    injectThemeVars("deadblack");
    flashStatus("The void consumes.","secret");
    return{override:true};
}},

    wobble: {
  desc: "Make the panel wobble like jelly",
  run() {
    const p = document.querySelector("#ep-assist-wrap");
    if (!p) return flashStatus("Panel not found","warn"), {override:true};

    p.style.transition = "transform 0.2s ease";
    p.style.transformOrigin = "center";

    let t = 0;
    const interval = setInterval(() => {
      t += 0.2;
      p.style.transform = `scale(1.02) rotate(${Math.sin(t)*3}deg)`;
    }, 30);

    setTimeout(() => {
      clearInterval(interval);
      p.style.transform = "none";
    }, 1200);

    flashStatus("WOBBLE wobble wobble","info");
    return {override:true};
  }
},
quake: {
  desc: "Shake the UI violently",
  run() {
    const p = document.querySelector("#ep-assist-wrap");
    if (!p) return flashStatus("Panel not found","warn"), {override:true};

    let n = 0;
    const interval = setInterval(() => {
      const x = (Math.random()*10 - 5);
      const y = (Math.random()*10 - 5);
      p.style.transform = `translate(${x}px,${y}px)`;
      n++;
      if (n > 20) {
        clearInterval(interval);
        p.style.transform = "none";
      }
    }, 30);

    flashStatus("QUAKE ⚠️","secret");
    return {override:true};
  }
},
slicer: {
  desc: "Slice panel into pieces",
  run() {
    const wrap = document.querySelector("#ep-assist-wrap");
    if (!wrap) return flashStatus("Panel missing","warn"), {override:true};

    const rect = wrap.getBoundingClientRect();
    const slices = 8; // number of slices
    const h = rect.height / slices;

    // hide real UI
    wrap.style.opacity = 0;

    // generate slices
    for (let i = 0; i < slices; i++) {
      const div = document.createElement("div");
      div.style.position = "fixed";
      div.style.left = rect.left + "px";
      div.style.top = (rect.top + i*h) + "px";
      div.style.width = rect.width + "px";
      div.style.height = h + "px";
      div.style.background = "var(--ep-bg)";
      div.style.zIndex = 99999999;
      div.style.transition = "transform 1s ease-out";
      div.className = "ep-slice";

      document.body.appendChild(div);

      // slide direction
      const dir = i % 2 === 0 ? -1 : 1;

      setTimeout(() => {
        div.style.transform = `translateX(${dir * 500}px) rotate(${dir * 12}deg)`;
        div.style.opacity = "0";
      }, 50);

      // clean up after animation
      setTimeout(() => div.remove(), 1300);
    }

    flashStatus("SLICED ✂️","secret");
    return {override:true};
  }
},
shrink: {
  desc: "Shrink the UI into nothingness",
  run() {
    const p = document.querySelector("#ep-assist-wrap");
    if (!p) return flashStatus("Panel missing","warn"), {override:true};

    let scale = 1;
    const interval = setInterval(() => {
      scale -= 0.05;
      p.style.transform = `scale(${scale})`;
      if (scale <= 0.05) {
        clearInterval(interval);
        p.style.transform = "scale(0)";
      }
    }, 40);

    flashStatus("Shrinking…","info");
    return {override:true};
  }
},
drift: {
  desc: "Make the panel slowly drift away",
  run() {
    const p = document.querySelector("#ep-assist-wrap");
    if (!p) return flashStatus("Panel missing","warn"), {override:true};

    let x = 0;
    const interval = setInterval(() => {
      x += 1;
      p.style.transform = `translateX(${x}px)`;
      if (!document.body.contains(p)) clearInterval(interval);
    }, 16);

    flashStatus("Drifting… ⛵","secret");
    return {override:true};
  }
},
ascend: {
  desc: "Let the UI ascend to the heavens",
  run() {
    const p = document.querySelector("#ep-assist-wrap");
    if (!p) return flashStatus("Panel missing","warn"), {override:true};

    p.style.transition = "transform 2s ease, opacity 2.4s ease";
    p.style.boxShadow = "0 0 40px var(--ep-accent), 0 0 80px var(--ep-accent)";
    p.style.transform = "translateY(-120px) scale(1.08)";
    p.style.opacity = "0";

    setTimeout(() => {
      if (p && p.parentNode) p.remove();
    }, 2500);

    flashStatus("✨ Ascending…","secret");
    return {override:true};
  }
},

    __voidpurge: {
    desc: "(hidden)",
    run() {
        // Reset stored visit counter (this is what actually matters)
        Store.set("EP_VOID_COUNT", 0);

        // Optional: if you *later* decide to mirror it to a global,
        // you can uncomment this and keep it in sync.
        // if (typeof window !== "undefined") window.EP_VOID_COUNT_LIVE = 0;

        // Only dip audio IF it exists and is valid
        if (window.EP_WIND_AUDIO && typeof window.EP_WIND_AUDIO.volume === "number") {
            try {
                window.EP_WIND_AUDIO.volume = 0.05;
                setTimeout(() => {
                    // re-check in case it got nuked
                    if (window.EP_WIND_AUDIO && typeof window.EP_WIND_AUDIO.volume === "number") {
                        window.EP_WIND_AUDIO.volume = 0.38;
                    }
                }, 900);
            } catch (e) {
                // silent, it's a spooky void command anyway
                console.warn("[EP __voidpurge audio]", e);
            }
        }

        flashStatus("The void forgets you.", "secret", 1200);
        return { override: true };
    }
},


};


function runCommand(input) {
    const raw = input.trim().slice(COMMAND_PREFIX.length).trim();
    const [cmd, ...args] = raw.split(/\s+/);

    if (!COMMANDS[cmd]) {
        flashStatus("Unknown: " + cmd, "warn");
        return;
    }

    try {
        const result = COMMANDS[cmd].run(...args);

        // If command returns { override: true }, skip "Executed"
        if (!result || !result.override) {
            flashStatus("Executed", "secret");
        }

    } catch (err) {
        flashStatus("Error running command", "error");
        console.error("[EP CMD ERROR]", err);
    }
}
let EP_COMMAND_POPUP_VISIBLE = false;

function dumpCommandsInPanel() {
    const old = document.getElementById("ep-command-dump");

    // Close if visible
    if (EP_COMMAND_POPUP_VISIBLE && old) {
        old.remove();
        EP_COMMAND_POPUP_VISIBLE = false;
        flashStatus("Command list closed", "info");
        return;
    }

    // Create fresh popup
    const box = document.createElement("div");
    box.id = "ep-command-dump";
    Object.assign(box.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "14px",
        background: "rgba(0,0,0,0.88)",
        color: "white",
        fontFamily: "monospace",
        fontSize: "13px",
        maxHeight: "350px",
        overflowY: "auto",
        width: "280px",
        borderRadius: "10px",
        border: "1px solid #444",
        boxShadow: "0 0 12px rgba(0,0,0,0.4)",
        zIndex: 999999999,
        lineHeight: "1.4"
    });

    // Header
    const header = document.createElement("div");
    header.innerHTML = `<b style="color:#9f6bff; font-size:14px;">EP COMMAND LIST</b><br><br>`;
    box.appendChild(header);

    // Each command as a line
    for (const [name, obj] of Object.entries(COMMANDS)) {
    if (name.startsWith("__")) continue; // hide secret commands

        const line = document.createElement("div");
        line.style.marginBottom = "6px";

        line.innerHTML = `
            <span style="color:#77a8ff; font-weight:bold">:${name}</span>
            <span style="color:#ccc"> — ${obj.desc}</span>
        `;

        box.appendChild(line);
    }

    // Add to page
    document.body.appendChild(box);
    EP_COMMAND_POPUP_VISIBLE = true;
    flashStatus("Command list opened", "info");
}

// Toggle popup with Shift + Q (capture mode so EP can't block it)
window.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key === "Q") {
        console.log("[EP DEBUG HOTKEY FIRED]");
        e.preventDefault();
        dumpCommandsInPanel();
    }
}, true);


// ------------------ Themes ------------------
const THEMES = {
light: { bg:'#ffffff', ink:'#111111', sub:'#444444', chip:'#f1f1f1', chipH:'#e0e0e0', line:'rgba(0,0,0,0.1)', accent:'#9aa0a6', grad:'linear-gradient(to bottom, #ffffff, #f7f7f7)' },
dark: { bg:'#121212', ink:'#f5f5f5', sub:'#aaaaaa', chip:'#1c1c1c', chipH:'#2a2a2a', line:'rgba(255,255,255,0.06)', accent:'#bbbbbb', grad:'linear-gradient(145deg, #121212, #1e1e1e)' },
glass: { bg:'rgba(255,255,255,0.05)', ink:'#000000', sub:'rgba(255,255,255,0.15)', chip:'rgba(255,255,255,0.08)', chipH:'rgba(255,255,255,0.16)', line:'rgba(0,0,0,0.15)', accent:'#a8c5d4', grad:'linear-gradient(145deg, rgba(200,220,240,0.15), rgba(180,180,190,0.08))' },
"yin-yang": { bg:'#000000', ink:'#e0e0e0', sub:'#aaaaaa', chip:'#101010', chipH:'#2a2a2a', line:'rgba(255,255,255,0.15)', accent:'#ffffff', grad:'radial-gradient(circle at center, #ffffff 0%, #000000 100%)' },
matrix: { bg:'#000000', ink:'#ccffcc', sub:'#99ff99', chip:'#0a0f0a', chipH:'#0f1a0f', line:'rgba(0,255,0,0.18)', accent:'#00ff00', grad:'repeating-linear-gradient(180deg, rgba(0,255,0,0.15), rgba(0,255,0,0.15) 2px, transparent 2px, transparent 4px)'},
core: { bg:'#240004', ink:'#ffe0e6', sub:'#ffb3c1', chip:'#440010', chipH:'#5e001b', line:'rgba(255,85,100,0.3)', accent:'#ff2055', grad:'conic-gradient(from 47deg at 50% 50%, #3b000d, #9a0036, #ff3370)' },
onyx: { bg:'#100015', ink:'#f0eaff', sub:'#d3b4ff', chip:'#1f0e2c', chipH:'#311641', line:'rgba(200,160,255,0.15)', accent:'#a06eff', grad:'radial-gradient(circle at center, rgba(160,110,255,0.3), rgba(40,10,60,0.3))' },
ultraviolet: { bg:'#0a0124', ink:'#f9e1ff', sub:'#cf9dff', chip:'#2c0d5a', chipH:'#3f1480', line:'rgba(221,140,255,0.2)', accent:'#be61ff', grad:'linear-gradient(135deg, rgba(150,80,255,0.3), rgba(90,30,150,0.2))' },
flamewall: { bg:'#2a0500', ink:'#fff2e6', sub:'#ffc4a1', chip:'#4b1400', chipH:'#6e2100', line:'rgba(255,140,105,0.25)', accent:'#ff6a3d', grad:'radial-gradient(circle at bottom right, #ff9c66 0%, #ff5400 50%, #3d0d00 100%)' },
acheron: { bg:'#000000', ink:'#e2e2e2', sub:'#999999', chip:'#0d0d0d', chipH:'#1a1a1a', line:'rgba(255,0,0,0.25)', accent:'#007fff', grad:'radial-gradient(circle at top right, #440000 0%, #000000 70%)' },
whitemint: { bg: '#e8fffb', ink: '#093e37', sub: '#34cdb3', chip: '#cbfff2', chipH: '#b3f2e7', line: 'rgba(45,220,200,0.18)', accent: '#2cf5d3', grad: 'radial-gradient(circle at top right, #a2fff0 0%, #dffcf9 40%, #e8fffb 100%)' },
carousel: { bg: '#120021', ink: '#ffeaff', sub: '#ffc7fa', chip: '#2b002d', chipH: '#3e0046', line: 'rgba(255,150,255,0.2)', accent: '#ff6fff', grad: 'conic-gradient(from 0deg at 50% 50%, #ff80df, #ffd580, #80ffff, #c580ff, #ff80df)' },
oceanmelon: { bg:'#ccfbf3', ink:'#00322b', sub:'#42cbb2', chip:'#a1f5e7', chipH:'#8ae9d6', line:'rgba(0,150,130,0.22)', accent:'#00ffc0', grad:'radial-gradient(circle at 30% 20%, rgba(0,255,160,0.3), rgba(0,200,255,0.1), #ccfbf3)' },
cottoncandy: { bg:'#fff1f9', ink:'#2a001f', sub:'#ffb3e6', chip:'#ffe1f5', chipH:'#ffc7eb', line:'rgba(255,153,204,0.15)', accent:'#ff78cb', grad:'linear-gradient(to bottom right, #ffd1f0, #fddde6, #f4faff)' },
desert: { bg:'#1c1200', ink:'#ffebcc', sub:'#ffc580', chip:'#362100', chipH:'#4c3000', line:'rgba(255,180,90,0.25)', accent:'#ff9e3a', grad:'linear-gradient(to bottom, #ffb347, #ffcc70, #1c1200)' },
kyawthuite: { bg:'#230d00', ink:'#ffe0b3', sub:'#ffae5d', chip:'#3d1a00', chipH:'#592600', line:'rgba(255,120,30,0.22)', accent:'#ff7c1a', grad:'linear-gradient(145deg, #ffbb66, #ff9944, #230d00)' },
forest: { bg:'#021315', ink:'#ddffee', sub:'#8ff3c9', chip:'#103e3a', chipH:'#18564f', line:'rgba(160,250,215,0.18)', accent:'#3effb5', grad:'radial-gradient(circle at top left, rgba(14,255,200,0.3), rgba(10,30,30,0.1))' },
deepsea: { bg:'#03141c', ink:'#e2fcff', sub:'#a9ecf9', chip:'#0e3244', chipH:'#15526e', line:'rgba(150,255,255,0.22)', accent:'#53dbff', grad:'radial-gradient(circle at 40% 40%, rgba(63,206,255,0.3), rgba(10,50,70,0.15))' },
beachsand: { bg:'#fff6e3', ink:'#231a00', sub:'#a6731f', chip:'#ffe1b2', chipH:'#ffcd88', line:'rgba(40,30,0,0.12)', accent:'#ffb84d', grad:'conic-gradient(from 259deg at right, #ffe6b3, #ffcc80, #fff6e3)' },
amethyst: { bg:'#21002a', ink:'#ffe0fa', sub:'#ffb8ee', chip:'#3f0040', chipH:'#60005f', line:'rgba(255,170,235,0.25)', accent:'#e955c6', grad:'radial-gradient(ellipse at top left, rgba(255,120,240,0.35), rgba(20,0,30,0.15))' },
};

const SECRET_THEMES = {
"turd":{bg:'#4b3a21',ink:'#f4e5c5',sub:'#a08d63',chip:'#6b532d',chipH:'#7d6435',line:'rgba(80,60,20,0.4)',accent:'#c49b38',grad:'linear-gradient(135deg,#5a4728,#4b3a21,#3e2f18)'},
"ethereal":{bg:"#ffffff10",ink:"#061420",sub:"#2c4f7f",chip:"#f3f6ff40",chipH:"#ffffff70",line:"rgba(80,110,160,0.35)",accent:"#5ab0ff",grad:"radial-gradient(circle at center,#e8ffff20,#00000080)"},
"tartarus":{bg:"#080000",ink:"#ffe5dd",sub:"#ffaaaa",chip:"#2a0000",chipH:"#3d0000",line:"rgba(255,70,20,0.3)",accent:"#ff2400",grad:"radial-gradient(circle at top,#ff4d00 0%,#000000 70%)"},
"ghostlysage":{bg:"#2b1a0033",ink:"#fef4c4",sub:"#ffdf7fcc",chip:"#4a330033",chipH:"#6b4b0044",line:"rgba(255,215,0,0.18)",accent:"#ffe06a",grad:"linear-gradient(135deg,#ffd70044,#ffb70044,#ff910044)"},
"sansundertale":{bg:"#000000",ink:"#ffffff",sub:"#9be5ff",chip:"#0a0a0a",chipH:"#1a1a1a",line:"rgba(155,229,255,0.25)",accent:"#6fd6ff",grad:"linear-gradient(135deg,#000000,#0b0f16)"},
};


// --- PRIVATE SYSTEM THEME (cannot be selected or listed) ---
const DEADBLACK_THEME = {
    bg:"#000000",
    ink:"#ffffff",
    sub:"#000000",
    chip:"#000000",
    chipH:"#000000",
    line:"rgba(0,0,0,1)",
    accent:"#ffffff",
    grad:"none"
};

function injectThemeVars(themeName) {
    const root = document.documentElement;
let t;
if (themeName === "deadblack") {
    t = DEADBLACK_THEME;
} else {
    t = THEMES[themeName] || SECRET_THEMES[themeName] || THEMES.dark;
}
  const bg = t.bg || '#000000';
    const safe = (v, fallback) => v ?? fallback;

root.style.setProperty("--ink",       safe(t.ink, "#ffffff"));
root.style.setProperty("--ink-sub",   safe(t.sub, "#cccccc"));
root.style.setProperty("--ink-faint", safe(t.faint || t.sub, "#999999"));
root.style.setProperty("--chip-text", safe(t.chipText || t.ink, "#ffffff"));

// --- Sans Undertale Theme Music ---
if (themeName === "sansundertale") {
    try { SANS_AUDIO.currentTime = 0; } catch {}
    SANS_AUDIO.play().catch(err => {
        console.warn("Autoplay blocked:", err);
        flashStatus("Click anywhere to enable Megalovania", "warn");
    });
} else {
    try { SANS_AUDIO.pause(); } catch {}
}


function ensureReadable(hex) {
    // detect luminance
    hex = hex.replace('#','');
    const r=parseInt(hex.substr(0,2),16);
    const g=parseInt(hex.substr(2,2),16);
    const b=parseInt(hex.substr(4,2),16);
    const lum=(0.299*r+0.587*g+0.114*b)/255;
    return lum > 0.5 ? "#000000" : "#ffffff";
}

  // Function to calculate luminance of a hex color
  function luminance(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    const rgb = [r, g, b].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

// Detect if color is hex
function isHexColor(str) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(str);
}

// Prefer theme-provided ink; otherwise compute contrast only if hex
let ink;
if (t.ink) {
  ink = t.ink;
} else if (isHexColor(bg)) {
  const bgLuminance = luminance(bg);
  ink = bgLuminance > 0.5 ? '#000000' : '#ffffff';
} else {
  ink = '#000000'; // safe default for rgba/gradients
}


  let tag = document.getElementById('ep-theme-live');
  const css = `#ep-assist-wrap {
    --ep-bg: ${bg};
    --ep-ink: ${ink};
    --ep-sub: ${t.sub};
    --ep-chip: ${t.chip};
    --ep-chip-hover: ${t.chipH};
    --ep-line: ${t.line};
    --ep-accent: ${t.accent};
    --ep-grad: ${t.grad || 'none'};
  }`;

  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'ep-theme-live';
    document.head.appendChild(tag);
  }

  tag.textContent = css;
    // ensure a predictable theme class on <body> so CSS can target it
Array.from(document.body.classList)
  .filter(c => c.startsWith('theme-'))
  .forEach(c => document.body.classList.remove(c));
document.body.classList.add(`theme-${themeName}`);

}


  // ------------------ Fonts (Inter for crisp UI; fallback Lato/Aptos) ------------------
  (function injectFonts(){
    if (!document.getElementById('ep-fonts')) {
      const l = document.createElement('link');
      l.id = 'ep-fonts';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Lato:wght@400;600;700;800&display=swap';
      document.head.appendChild(l);
    }
  })();

    GM_addStyle(`
    #ep-status {
  transition: color 0.2s ease, opacity 0.2s ease, filter 0.15s ease;
}

/* ====== STATUS COLORS ====== */
.ep-status-normal { color: #ccc; }
.ep-status-info   { color: #4da3ff; }   /* capture, load */
.ep-status-command { color: #bd7bff; }  /* secret commands */
.ep-status-secret { color: #ff4df3; }   /* easter eggs, hidden unlocks */
.ep-status-warn   { color: #ffd54f; }   /* anomalies, fake suggestions */
.ep-status-error  { color: #ff6f6f; }   /* failures */

/* ====== GLITCH EFFECT ====== */
@keyframes ep-glitch {
  0% { filter: hue-rotate(0deg) brightness(1); transform: translate(0, 0); }
  20% { filter: hue-rotate(30deg) brightness(1.2); transform: translate(1px, -1px); }
  40% { filter: hue-rotate(-30deg) brightness(0.9); transform: translate(-1px, 1px); }
  60% { filter: hue-rotate(20deg) brightness(1.1); transform: translate(1px, 1px); }
  80% { filter: hue-rotate(-20deg) brightness(0.95); transform: translate(-1px, -1px); }
  100% { filter: hue-rotate(0deg) brightness(1); transform: translate(0, 0); }
}
.ep-status-glitch {
  animation: ep-glitch 0.18s linear 1;
  }
`);

    GM_addStyle(`
  #ep-assist-wrap {
    opacity: 1 !important;

    @keyframes shakeScreen {
    0% { transform: translate(0, 0); }
    20% { transform: translate(5px, -4px); }
    40% { transform: translate(-5px, 4px); }
    60% { transform: translate(4px, -5px); }
    80% { transform: translate(-4px, 5px); }
    100% { transform: translate(0, 0); }
}

  }
`);

    GM_addStyle(`
/* ================= GLASS PATCH ================= */

/* Force black text everywhere when glass theme is active */
body.theme-glass,
body.theme-glass * {
  color: #000 !important;
  text-shadow: none !important; /* kill white glowing shadows */
}

/* Dropdown readability */
body.theme-glass select,
body.theme-glass option {
  color: #000 !important;
  background-color: rgba(255, 255, 255, 0.8) !important;
}

/* Dropdown hover/focus fix */
body.theme-glass select:focus,
body.theme-glass option:hover {
  background-color: rgba(220, 240, 255, 0.9) !important;
  color: #000 !important;
}
`);

  GM_addStyle([
  '/* === ULTRA-COMPLETE STYLING SUITE FOR EP-ASSIST === */',
  '#ep-assist-wrap, #ep-assist-wrap * {',
  '  font-family: "Inter", "Lato", "Aptos", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif !important;',
  '}',
  '.ep-hidden { display: none !important; }',
  '',
  '/* Root Panel */',
  '.ep-panel {',
  '  position: fixed;',
  '  z-index: 2147483647;',
  '  width: 700px;',
  '  min-width: 520px;',
  '  min-height: 360px;',
  '  background: var(--ep-bg);',
  '  background-image: var(--ep-grad);',
  '  color: var(--ep-ink);',
  '  border-radius: 18px;',
  '  border: 1px solid var(--ep-line);',
  '  box-shadow: 0 36px 100px rgba(0, 0, 0, 0.65), 0 0 0 1px var(--ep-line) inset;',
  '  backdrop-filter: saturate(120%) blur(6px);',
  '  overflow: hidden;',
  '  resize: both;',
  '  user-select: none;',
  '  isolation: isolate;',
  '}',
  '',
  '.ep-panel::before {',
  '  content: "";',
  '  position: absolute;',
  '  inset: -1px;',
  '  border-radius: 20px;',
  '  padding: 1px;',
  '  background: conic-gradient(from var(--ep-rot, 0deg), rgba(255, 255, 255, 0.06), var(--ep-accent), rgba(255, 255, 255, 0.06), transparent 50%, rgba(0,0,0,0));',
  '  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);',
  '  -webkit-mask-composite: xor;',
  '  mask-composite: exclude;',
  '  pointer-events: none;',
  '  z-index: 0;',
  '  animation: ep-rotate 12s linear infinite;',
  '}',
  '',
  '@keyframes ep-rotate { to { --ep-rot: 360deg; } }',
  '',
  '.ep-panel:hover {',
  '  box-shadow: 0 44px 120px rgba(0, 0, 0, 0.70), 0 0 0 1px var(--ep-line) inset;',
  '}',
  '',
  '/* Particle Background */',
  '.ep-sparkle-canvas {',
  '  position: absolute;',
  '  inset: 0;',
  '  z-index: -1;',
  '  pointer-events: none;',
  '  opacity: 0.35;',
  '  filter: drop-shadow(0 0 6px var(--ep-accent));',
  '}',
  '',
  '/* Topbar */',
  '.ep-topbar {',
  '  display: flex;',
  '  align-items: center;',
  '  gap: 10px;',
  '  padding: 12px 14px;',
  '  background: rgba(255,255,255,0.06);',
  '  cursor: move;',
  '  white-space: nowrap;',
  '}',
  '',
  '.ep-brand {',
  '  font: 800 15px/1 Inter, Lato, Aptos, Segoe UI, system-ui, -apple-system, Roboto, sans-serif;',
  '  margin-right: auto;',
  '  letter-spacing: 0.2px;',
  '}',
  '',
  '/* Form Inputs */',
  '.ep-select, .ep-input {',
  '  appearance: none;',
  '  background: var(--ep-chip);',
  '  color: var(--ep-ink);',
  '  padding: 10px 34px 10px 14px;',
  '  border: 1px solid var(--ep-line);',
  '  border-radius: 12px;',
  '  font: 700 12.5px/1 Inter, Lato, Aptos, Segoe UI, system-ui, -apple-system, Roboto, sans-serif;',
  '  outline: none;',
  '  transition: box-shadow 0.15s ease, background 0.15s ease, transform 0.05s ease;',
  '  box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset;',
  '}',
  '',
  '#ep-theme.ep-select { color: var(--ep-ink) !important; }',
  '#ep-theme option { color: initial; }',
  '',
  '.ep-input:focus, .ep-select:focus {',
  '  box-shadow: 0 0 0 2px var(--ep-accent), 0 1px 0 rgba(255,255,255,0.05) inset;',
  '}',
  '',
  '/* Button Styles */',
  '.ep-ibtn, .ep-btn {',
  '  border: 1px solid var(--ep-line);',
  '  border-radius: 10px;',
  '  background: var(--ep-chip);',
  '  color: var(--ep-ink);',
  '  font-weight: 900;',
  '  cursor: pointer;',
  '  box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 14px rgba(0,0,0,0.25);',
  '  transition: transform 0.06s ease, background 0.1s ease, box-shadow 0.15s ease;',
  '}',
  '',
  '.ep-btn { padding: 8px 14px; border-radius: 999px; font-size: 12.5px; }',
  '.ep-btn.small { padding: 5px 10px; font-weight: 800; opacity: 0.95; }',
  '',
  '.ep-btn:hover, .ep-ibtn:hover {',
  '  background: var(--ep-chip-hover);',
  '  box-shadow: 0 0 0 2px rgba(255,255,255,0.04), 0 8px 18px rgba(0,0,0,0.34);',
  '}',
  '.ep-btn:active, .ep-ibtn:active { transform: translateY(1px); }',
  '',
  '/* Dropdown Arrow */',
  '.ep-caret {',
  '  position: absolute;',
  '  right: 10px;',
  '  top: 50%;',
  '  transform: translateY(-50%);',
  '  pointer-events: none;',
  '  opacity: 0.8;',
  '}',
  '',
  '/* Search Row */',
  '.ep-search {',
  '  display: flex;',
  '  gap: 8px;',
  '  align-items: center;',
  '}',
  '.ep-search input {',
  '  flex: 1;',
  '}',
  '',
  '/* Results List */',
  '#ep-assist-results {',
  '  flex: 1;',
  '  min-height: 130px;',
  '  overflow: auto;',
  '  border-top: 1px dashed var(--ep-line);',
  '  padding-top: 8px;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 8px;',
  '}',
  '.ep-sugg {',
  '  padding: 11px 12px;',
  '  border-radius: 14px;',
  '  background: radial-gradient(120% 120% at -10% -20%, rgba(255,255,255,0.06), transparent 50%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03));',
  '  border: 1px solid var(--ep-line);',
  '  box-shadow: 0 8px 24px rgba(0,0,0,0.22);',
  '  transition: transform 0.06s ease, background 0.1s ease, box-shadow 0.15s ease;',
  '  display: flex;',
  '  justify-content: space-between;',
  '  gap: 12px;',
  '  cursor: pointer;',
  '  outline: 0;',
  '}',
  '.ep-sugg:hover, .ep-sugg[aria-selected="true"] {',
  '  background: rgba(255,255,255,0.12);',
  '  box-shadow: 0 10px 28px rgba(0,0,0,0.28);',
  '}',
  '.ep-sugg:active { transform: translateY(1px); }',
  '.ep-sugg b { font-weight: 900; }',
  '.ep-sugg i { font-style: normal; color: var(--ep-sub); }',
  '',
  '/* Overlay popup */',
  '.ep-overlay {',
  '  position: fixed;',
  '  z-index: 2147483646;',
  '  left: 50%;',
  '  top: 14px;',
  '  transform: translateX(-50%);',
  '  background: var(--ep-chip);',
  '  color: var(--ep-ink);',
  '  padding: 10px 14px;',
  '  border-radius: 12px;',
  '  border: 1px solid var(--ep-line);',
  '  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);',
  '  font: 600 13px/1.5 "Inter", "Lato", "Aptos", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;',
  '  max-width: 80vw;',
  '  white-space: pre-wrap;',
  '}',
  '',
  '/* Mini-help */',
  '.ep-minihelp {',
  '  color: var(--ep-sub);',
  '  font-size: 11px;',
  '  font-weight: 500;',
  '  opacity: 0.95;',
  '  font-family: "Inter", "Lato", "Aptos", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;',
  '}',
  '',
  '/* Example parent class (optional, keep if you used it) */',
  '.some-parent-class {',
  '  text-align: center;',
  '  backdrop-filter: blur(4px) saturate(120%);',
  '}'
].join('\n'));
 GM_addStyle(`
/* ======= FLASHY (scoped) ======= */

/* In-panel particles: obvious in both flashy + EPIC */
#ep-assist-wrap.ep-flashy .ep-sparkle-canvas,
#ep-assist-wrap.ep-epic   .ep-sparkle-canvas {
  opacity: 1 !important;
  filter: drop-shadow(0 0 18px var(--ep-accent))
          drop-shadow(0 0 36px var(--ep-accent)) !important;
}
/* EPIC gets extra oomph */
#ep-assist-wrap.ep-epic .ep-sparkle-canvas {
  filter: drop-shadow(0 0 22px var(--ep-accent))
          drop-shadow(0 0 48px var(--ep-accent)) !important;
}


/* Panel glow, blur, pulse, rim speed */
#ep-assist-wrap.ep-flashy {
  box-shadow:
    0 60px 200px rgba(0,0,0,0.8),
    0 0 0 1px var(--ep-line) inset,
    0 0 60px rgba(0,0,0,0.45) !important;
  backdrop-filter: saturate(180%) blur(14px) !important;
  animation: ep-pulse 3s ease-in-out infinite;
}
#ep-assist-wrap.ep-flashy::before {
  animation: ep-rotate 4.5s linear infinite !important;
  background:
    conic-gradient(from var(--ep-rot, 0deg),
      rgba(255,255,255,0.18),
      var(--ep-accent),
      rgba(255,255,255,0.18),
      transparent 50%,
      rgba(0,0,0,0)) !important;
}
#ep-assist-wrap.ep-flashy::after {
  content: "";
  position: absolute; inset: -8px; border-radius: 26px; pointer-events: none; z-index: 0;
  background:
    radial-gradient(60% 80% at 50% -10%, color-mix(in oklab, var(--ep-accent), white 45%) 14%, transparent 60%),
    radial-gradient(90% 70% at -10% 50%, color-mix(in oklab, var(--ep-accent), black 18%) 10%, transparent 60%),
    radial-gradient(90% 70% at 110% 50%, color-mix(in oklab, var(--ep-accent), black 18%) 10%, transparent 60%);
  filter: blur(22px);
  opacity: 0.85;
}

/* Focus + buttons + sugg neon only in flashy */
#ep-assist-wrap.ep-flashy .ep-input:focus,
#ep-assist-wrap.ep-flashy .ep-select:focus {
  box-shadow:
    0 0 0 3px color-mix(in oklab, var(--ep-accent), white 22%),
    0 0 14px color-mix(in oklab, var(--ep-accent), white 22%),
    0 1px 0 rgba(255,255,255,0.1) inset !important;
  transform: translateY(-1px);
}
#ep-assist-wrap.ep-flashy .ep-btn,
#ep-assist-wrap.ep-flashy .ep-ibtn {
  box-shadow:
    0 1px 0 rgba(255,255,255,0.08) inset,
    0 10px 28px rgba(0,0,0,0.45),
    0 0 18px rgba(0,0,0,0.25) !important;
}
#ep-assist-wrap.ep-flashy .ep-btn:hover,
#ep-assist-wrap.ep-flashy .ep-ibtn:hover {
  background: var(--ep-chip-hover) !important;
  box-shadow:
    0 0 0 2px color-mix(in oklab, var(--ep-accent), white 28%),
    0 14px 36px rgba(0,0,0,0.55),
    0 0 24px color-mix(in oklab, var(--ep-accent), white 28%) !important;
  transform: translateY(-1px) !important;
}
#ep-assist-wrap.ep-flashy .ep-sugg {
  background:
    radial-gradient(120% 120% at -10% -20%, rgba(255,255,255,0.16), transparent 50%),
    linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05)) !important;
  box-shadow: 0 12px 30px rgba(0,0,0,0.38) !important;
}
#ep-assist-wrap.ep-flashy .ep-sugg:hover,
#ep-assist-wrap.ep-flashy .ep-sugg[aria-selected="true"] {
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--ep-accent), white 85%) 0%, rgba(255,255,255,0.16) 100%),
    radial-gradient(90% 90% at 0% 0%, rgba(255,255,255,0.2), transparent 60%) !important;
  box-shadow:
    0 0 0 2px color-mix(in oklab, var(--ep-accent), white 28%),
    0 16px 40px rgba(0,0,0,0.58) !important;
}

/* Global outward emitter canvas (created/removed by JS on flashy toggle) */
#ep-global-sparks {
  position: fixed;
  inset: 0;
  z-index: 2147483645;
  pointer-events: none;
}
#ep-global-sparks {
  opacity: 0.8;
  filter: drop-shadow(0 0 24px var(--ep-accent));
}


`);
    GM_addStyle(`
/* ===== Ensure panel glow & hover pop in both flashy and epic ===== */
/* PANEL: glow+pulse on the root element itself */
#ep-assist-wrap.ep-flashy,
#ep-assist-wrap.ep-epic {
  box-shadow:
    0 50px 160px rgba(0,0,0,.75),
    0 0 0 1px var(--ep-line) inset,
    0 0 40px rgba(0,0,0,.35),
    0 0 28px color-mix(in oklab, var(--ep-accent), white 25%) !important;
  backdrop-filter: saturate(170%) blur(12px) !important;
}
#ep-assist-wrap.ep-flashy::before,
#ep-assist-wrap.ep-epic::before {
  background: conic-gradient(from var(--ep-rot,0deg),
    rgba(255,255,255,.12),
    var(--ep-accent),
    rgba(255,255,255,.12),
    transparent 50%,
    rgba(0,0,0,0)) !important;
  animation: ep-rotate 6s linear infinite !important;
}
#ep-assist-wrap.ep-flashy::after,
#ep-assist-wrap.ep-epic::after {
  content:""; position:absolute; inset:-6px; border-radius:24px; pointer-events:none; z-index:0;
  background:
   radial-gradient(60% 80% at 50% -10%, color-mix(in oklab,var(--ep-accent),white 40%) 12%, transparent 60%),
   radial-gradient(80% 70% at -10% 50%, color-mix(in oklab,var(--ep-accent),black 10%) 8%, transparent 60%),
   radial-gradient(80% 70% at 110% 50%, color-mix(in oklab,var(--ep-accent),black 10%) 8%, transparent 60%);
  filter: blur(18px); opacity:.7;
}

#ep-assist-wrap.ep-flashy .ep-panel { animation: ep-pulse 3.4s ease-in-out infinite; }
#ep-assist-wrap.ep-epic   .ep-panel { animation: ep-pulse 2.8s ease-in-out infinite; }

/* Hover pop on both modes */
#ep-assist-wrap.ep-flashy .ep-btn:hover,
#ep-assist-wrap.ep-epic   .ep-btn:hover,
#ep-assist-wrap.ep-flashy .ep-ibtn:hover,
#ep-assist-wrap.ep-epic   .ep-ibtn:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow:
    0 0 0 2px color-mix(in oklab, var(--ep-accent), white 25%),
    0 12px 28px rgba(0,0,0,.45),
    0 0 20px color-mix(in oklab, var(--ep-accent), white 25%) !important;
}
`);
    GM_addStyle(`
    #ep-assist-wrap.ep-flashy .ep-sparkle-canvas,
#ep-assist-wrap.ep-epic   .ep-sparkle-canvas {
  opacity: 1 !important;
  filter: drop-shadow(0 0 18px var(--ep-accent))
          drop-shadow(0 0 36px var(--ep-accent)) !important;
}
#ep-assist-wrap.ep-epic .ep-sparkle-canvas {
  filter: drop-shadow(0 0 22px var(--ep-accent))
          drop-shadow(0 0 48px var(--ep-accent)) !important;
}
`);
    GM_addStyle(`
#ep-assist-wrap.ep-flashy .ep-sparkle-canvas,
#ep-assist-wrap.ep-epic   .ep-sparkle-canvas {
  opacity: 1 !important;
  filter: drop-shadow(0 0 18px var(--ep-accent))
          drop-shadow(0 0 36px var(--ep-accent)) !important;
}
#ep-assist-wrap.ep-epic .ep-sparkle-canvas {
  filter: drop-shadow(0 0 22px var(--ep-accent))
          drop-shadow(0 0 48px var(--ep-accent)) !important;
}
`);

    GM_addStyle(`
/* Title glow */
#ep-assist-wrap.ep-flashy .ep-brand,
#ep-assist-wrap.ep-epic   .ep-brand {
  text-shadow:
    0 0 6px color-mix(in oklab, var(--ep-accent), white 40%),
    0 0 14px var(--ep-accent),
    0 0 22px color-mix(in oklab, var(--ep-accent), white 20%);
}

/* Extra panel glow behind everything */
#ep-assist-wrap.ep-flashy,
#ep-assist-wrap.ep-epic {
  box-shadow:
    0 80px 240px rgba(0,0,0,.85),
    0 0 0 1px var(--ep-line) inset,
    0 0 80px var(--ep-accent),
    0 0 50px color-mix(in oklab, var(--ep-accent), white 25%) !important;
}
`);


    GM_addStyle(`
  /* --- Layout sanity & sizing --- */
  #ep-assist-wrap, #ep-assist-wrap * { box-sizing: border-box; }
  #ep-assist-wrap.ep-panel {
    display: flex;
    flex-direction: column;
    /* remove strict min-width so small layouts still look fine */
    min-width: 420px;
  }

  /* topbar: brand + theme + profile + icons should wrap neatly */
  .ep-topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.06);
    cursor: move;
    /* allow children to wrap under the brand when narrow */
    flex-wrap: wrap;
  }
  .ep-brand { margin-right: auto; font-weight: 800; }

  /* group holding theme + profile controls */
  .ep-toprow {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ep-theme-wrap { display: inline-flex; align-items: center; gap: 6px; }

  /* icon group on the right should not force overflow */
  .ep-iconbar {
    display: inline-flex;
    gap: 6px;
    margin-left: auto;
  }

  /* body stretches, results take the free space */
  .ep-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    flex: 1 1 auto;
    min-height: 0; /* critical for flex overflow */
  }

  /* search row */
  .ep-search { display: flex; gap: 8px; align-items: center; }
  .ep-search .ep-input { flex: 1 1 auto; min-width: 0; }

  /* results occupy remaining space */
  #ep-assist-results {
    flex: 1 1 auto;
    min-height: 120px;
    overflow: auto;
    border-top: 1px dashed var(--ep-line);
    padding-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* subheader lines up with layout */
  .ep-subhdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 14px 0 14px;
    gap: 10px;
  }
  .ep-subhdr .left { font-weight: 700; }

  /* controls bar becomes a responsive footer */
  .ep-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;        /* <-- this fixes the “buttons didn’t move” issue */
    margin-top: 6px;
  }
  .ep-controls .ep-right { margin-left: auto; font-weight: 700; }

  /* inputs/selects don’t overflow and look consistent */
  .ep-select, .ep-input {
    max-width: 100%;
    width: auto;
  }

  /* tiny, but removes weird jumpiness on resize */
  .ep-panel { contain: layout paint size; }

  /* responsive niceties */
  @media (max-width: 720px) {
    #ep-assist-wrap.ep-panel { width: 92vw !important; }
    .ep-toprow { width: 100%; }
    .ep-iconbar { order: 3; width: 100%; justify-content: flex-end; }
  }
`);
GM_addStyle(`
  /* Optional: settings panel padding match */
  .ep-settings { padding: 12px 14px; }
`);
    GM_addStyle(`
  /* Settings overlay inside the panel */
  .ep-settings {
    position: absolute;
    inset: 56px 12px 12px 12px;   /* below the topbar, inside panel */
    background: var(--ep-bg);
    border: 1px solid var(--ep-line);
    border-radius: 14px;
    box-shadow: 0 18px 48px rgba(0,0,0,.45), 0 0 0 1px var(--ep-line) inset;
    padding: 12px 14px;           /* you wanted this padding anyway */
    overflow: auto;
    z-index: 3;                   /* above everything in the panel */
  }
  /* Simple grid for labels/inputs */
  .ep-settings .ep-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px 12px;
    align-items: center;
  }
  .ep-settings h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 800;
  }
`);
    GM_addStyle(`
  /* readable popup options for the theme/profile selects */
  #ep-theme option,
  #ep-profile option {
    color: var(--ep-ink) !important;
    background: var(--ep-chip) !important;
  }

  /* hint to browsers to use dark-friendly UI for form controls */
  #ep-assist-wrap { color-scheme: dark; }
`);
    GM_addStyle(`
  .ep-topbar button:hover { cursor: pointer; }
`);
GM_addStyle(`
/* EPIC = extreme glow */
#ep-assist-wrap.ep-epic {
  box-shadow:
    0 80px 240px rgba(0,0,0,.85),
    0 0 0 1px var(--ep-line) inset,
    0 0 80px var(--ep-accent),
    0 0 50px color-mix(in oklab, var(--ep-accent), white 25%) !important;
  backdrop-filter: saturate(180%) blur(14px) !important;
}
#ep-assist-wrap.ep-epic::before { animation: ep-rotate 4.5s linear infinite !important; }
#ep-assist-wrap.ep-epic::after  { filter: blur(22px); opacity: .85; }

/* FLASHY = lighter */
#ep-assist-wrap.ep-flashy {
  box-shadow:
    0 40px 120px rgba(0,0,0,.70),
    0 0 0 1px var(--ep-line) inset,
    0 0 26px color-mix(in oklab, var(--ep-accent), white 15%) !important;
  backdrop-filter: saturate(150%) blur(10px) !important;
}
#ep-assist-wrap.ep-flashy::before {
  animation: ep-rotate 8s linear infinite !important;
  background: conic-gradient(from var(--ep-rot,0deg),
    rgba(255,255,255,.08), var(--ep-accent), rgba(255,255,255,.08), transparent 50%, rgba(0,0,0,0)) !important;
}
#ep-assist-wrap.ep-flashy::after {
  content:""; position:absolute; inset:-6px; border-radius:24px; pointer-events:none; z-index:0;
  background:
   radial-gradient(60% 80% at 50% -10%, color-mix(in oklab,var(--ep-accent),white 28%) 12%, transparent 60%),
   radial-gradient(80% 70% at -10% 50%, color-mix(in oklab,var(--ep-accent),black 8%) 10%, transparent 60%),
   radial-gradient(80% 70% at 110% 50%, color-mix(in oklab,var(--ep-accent),black 8%) 10%, transparent 60%);
  filter: blur(14px); opacity:.55;

`);
GM_addStyle(`
body.theme-glass #ep-assist-wrap .ep-sparkle-canvas{
  opacity:.22 !important;
  filter: drop-shadow(0 0 10px var(--ep-accent)) !important;
}
`);
GM_addStyle(`
/* POPUP */
.ep-ach-popup {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(20,20,20,0.92);
    padding: 12px 16px;
    border-radius: 10px;
    display: flex;
    gap: 10px;
    color: white;
    font-family: monospace;
    font-size: 13px;
    box-shadow: 0 0 14px rgba(0,0,0,0.5);
    transform: translateY(40px);
    opacity: 0;
    transition: opacity .35s ease, transform .35s ease;
    z-index: 2147483645;
}
.ep-ach-popup .ep-ach-icon {
    font-size: 20px;
}

/* SECRET popup flicker */
.ep-ach-popup.ep-ach-secret {
    animation: epAchSecretPulse 0.9s infinite alternate;
}
@keyframes epAchSecretPulse {
    0% { box-shadow: 0 0 18px rgba(140,0,255,0.5); }
    100% { box-shadow: 0 0 32px rgba(180,0,255,0.9); }
}


/* PANEL */
#ep-ach-panel {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    width: 560px;
    max-height: 70vh;
    overflow-y: auto;
    background: var(--ep-bg, #111);
    border: 2px solid var(--ep-accent, #888);
    border-radius: 12px;
    padding: 14px;
    z-index: 999999999;
    box-shadow: 0 0 25px rgba(0,0,0,0.65);
    font-family: monospace;
    animation: epAchFadeIn .25s ease-out;
}
#ep-ach-panel.ep-hidden { display: none; }

@keyframes epAchFadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Header */
.ep-ach-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}
.ep-ach-title {
    font-size: 18px;
    font-weight: bold;
    color: var(--ep-ink, #fff);
}

/* Categories */
.ep-ach-cat {
    margin-bottom: 18px;
}
.ep-ach-cat h3 {
    margin: 4px 0 8px 0;
    font-size: 16px;
    opacity: 0.85;
    border-bottom: 1px solid rgba(255,255,255,0.18);
    padding-bottom: 3px;
}

/* Achievement items */
/* ACHIEVEMENT ITEM — THEME-AWARE */
.ep-ach-item {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--ep-bg) 85%, var(--ep-ink) 15%);
    border: 1px solid var(--ep-line);
    margin-bottom: 6px;
    transition: background 0.25s ease, border 0.25s ease;
}
.ep-ach-item-unlocked {
    background: color-mix(in srgb, var(--ep-bg) 70%, var(--ep-accent) 30%);
    border: 1px solid var(--ep-accent);
}
.ep-ach-item-text b {
    color: var(--ep-ink);
}
.ep-ach-item-text span {
    color: var(--ep-ink-sub);
}
.ep-ach-item-icon {
    font-size: 20px;
    width: 26px;
    text-align: center;
}
.ep-ach-item-text b {
    color: var(--ep-ink, #fff);
}
.ep-ach-item-text span {
    opacity: 0.8;
}

/* SECRET locked */
.ep-ach-secret-mask {
    background: #000 !important;
    color: #fff !important;
    border: 1px solid #222 !important;
}
.ep-ach-secret-mask .ep-ach-item-icon {
    opacity: 0.7;
}
`);

GM_addStyle(`
/* ============================
   ACHIEVEMENT — UNLOCKED STYLE
   ============================ */

/* Base icon area for unlocked achievements */
.ep-ach-item-unlocked {
    background: color-mix(in srgb, var(--ep-bg) 70%, #33ff33 25%) !important;
    border: 1px solid #33ff33 !important;
    box-shadow: 0 0 10px rgba(0,255,0,0.25);
    position: relative;
}

/* Tick on the right side */
.ep-ach-item-unlocked::after {
    content: "✔";
    color: #7aff7a;
    font-size: 18px;
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.9;
}

/* Slight animation on unlock popup sync */
.ep-ach-item-unlocked.ep-ach-unlock-anim {
    animation: epAchGlowPulse 1.2s ease-out;
}

/* Pulse keyframes */
@keyframes epAchGlowPulse {
    0%   { box-shadow: 0 0 0px rgba(0,255,0,0); }
    40%  { box-shadow: 0 0 14px rgba(0,255,0,0.55); }
    100% { box-shadow: 0 0 10px rgba(0,255,0,0.25); }
}

  /* Optional: settings panel padding match */
  .ep-settings { padding: 12px 14px; }
`);
    GM_addStyle(`
  /* Settings overlay inside the panel */
  .ep-settings {
    position: absolute;
    inset: 56px 12px 12px 12px;   /* below the topbar, inside panel */
    background: var(--ep-bg);
    border: 1px solid var(--ep-line);
    border-radius: 14px;
    box-shadow: 0 18px 48px rgba(0,0,0,.45), 0 0 0 1px var(--ep-line) inset;
    padding: 12px 14px;           /* you wanted this padding anyway */
    overflow: auto;
    z-index: 3;                   /* above everything in the panel */
  }
  /* Simple grid for labels/inputs */
  .ep-settings .ep-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px 12px;
    align-items: center;
  }
  .ep-settings h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 800;
  }
`);
    GM_addStyle(`
  /* readable popup options for the theme/profile selects */
  #ep-theme option,
  #ep-profile option {
    color: var(--ep-ink) !important;
    background: var(--ep-chip) !important;
  }

  /* hint to browsers to use dark-friendly UI for form controls */
  #ep-assist-wrap { color-scheme: dark; }
`);
    GM_addStyle(`
  .ep-topbar button:hover { cursor: pointer; }
`);
GM_addStyle(`
/* EPIC = extreme glow */
#ep-assist-wrap.ep-epic {
  box-shadow:
    0 80px 240px rgba(0,0,0,.85),
    0 0 0 1px var(--ep-line) inset,
    0 0 80px var(--ep-accent),
    0 0 50px color-mix(in oklab, var(--ep-accent), white 25%) !important;
  backdrop-filter: saturate(180%) blur(14px) !important;
}
#ep-assist-wrap.ep-epic::before { animation: ep-rotate 4.5s linear infinite !important; }
#ep-assist-wrap.ep-epic::after  { filter: blur(22px); opacity: .85; }

/* FLASHY = lighter */
#ep-assist-wrap.ep-flashy {
  box-shadow:
    0 40px 120px rgba(0,0,0,.70),
    0 0 0 1px var(--ep-line) inset,
    0 0 26px color-mix(in oklab, var(--ep-accent), white 15%) !important;
  backdrop-filter: saturate(150%) blur(10px) !important;
}
#ep-assist-wrap.ep-flashy::before {
  animation: ep-rotate 8s linear infinite !important;
  background: conic-gradient(from var(--ep-rot,0deg),
    rgba(255,255,255,.08), var(--ep-accent), rgba(255,255,255,.08), transparent 50%, rgba(0,0,0,0)) !important;
}
#ep-assist-wrap.ep-flashy::after {
  content:""; position:absolute; inset:-6px; border-radius:24px; pointer-events:none; z-index:0;
  background:
   radial-gradient(60% 80% at 50% -10%, color-mix(in oklab,var(--ep-accent),white 28%) 12%, transparent 60%),
   radial-gradient(80% 70% at -10% 50%, color-mix(in oklab,var(--ep-accent),black 8%) 10%, transparent 60%),
   radial-gradient(80% 70% at 110% 50%, color-mix(in oklab,var(--ep-accent),black 8%) 10%, transparent 60%);
  filter: blur(14px); opacity:.55;

`);
GM_addStyle(`
body.theme-glass #ep-assist-wrap .ep-sparkle-canvas{
  opacity:.22 !important;
  filter: drop-shadow(0 0 10px var(--ep-accent)) !important;
}
`);
GM_addStyle(`
/* POPUP */
.ep-ach-popup {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(20,20,20,0.92);
    padding: 12px 16px;
    border-radius: 10px;
    display: flex;
    gap: 10px;
    color: white;
    font-family: monospace;
    font-size: 13px;
    box-shadow: 0 0 14px rgba(0,0,0,0.5);
    transform: translateY(40px);
    opacity: 0;
    transition: opacity .35s ease, transform .35s ease;
    z-index: 2147483645;
}
.ep-ach-popup .ep-ach-icon {
    font-size: 20px;
}

/* SECRET popup flicker */
.ep-ach-popup.ep-ach-secret {
    animation: epAchSecretPulse 0.9s infinite alternate;
}
@keyframes epAchSecretPulse {
    0% { box-shadow: 0 0 18px rgba(140,0,255,0.5); }
    100% { box-shadow: 0 0 32px rgba(180,0,255,0.9); }
}


/* PANEL */
#ep-ach-panel {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    width: 560px;
    max-height: 70vh;
    overflow-y: auto;
    background: var(--ep-bg, #111);
    border: 2px solid var(--ep-accent, #888);
    border-radius: 12px;
    padding: 14px;
    z-index: 999999999;
    box-shadow: 0 0 25px rgba(0,0,0,0.65);
    font-family: monospace;
    animation: epAchFadeIn .25s ease-out;
}
#ep-ach-panel.ep-hidden { display: none; }

@keyframes epAchFadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Header */
.ep-ach-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}
.ep-ach-title {
    font-size: 18px;
    font-weight: bold;
    color: var(--ep-ink, #fff);
}

/* Categories */
.ep-ach-cat {
    margin-bottom: 18px;
}
.ep-ach-cat h3 {
    margin: 4px 0 8px 0;
    font-size: 16px;
    opacity: 0.85;
    border-bottom: 1px solid rgba(255,255,255,0.18);
    padding-bottom: 3px;
}


/* SECRET locked */
.ep-ach-secret-mask {
    background: #000 !important;
    color: #fff !important;
    border: 1px solid #222 !important;
}
.ep-ach-secret-mask .ep-ach-item-icon {
    opacity: 0.7;
}
`);

// ===============================================================
//  🏆 ACHIEVEMENT SYSTEM — core storage + logic + unlock popup
// ===============================================================

// storage key
const ACH_KEY = "EP_ACH_DATA";

// load or init
let ACH_DATA = Store.get(ACH_KEY, {
    unlocked: {},    // { id: true }
});

// saves to localStorage
function saveAchievements() {
    Store.set(ACH_KEY, ACH_DATA);
}

// check unlock
function isAchUnlocked(id) {
    return !!ACH_DATA.unlocked[id];
}

// unlock
function unlockAch(id) {
    if (ACH_DATA.unlocked[id]) return false; // already unlocked

    ACH_DATA.unlocked[id] = true;
    saveAchievements();

    // trigger popup
    showAchievementPopup(id);

    return true;
}

// unlock but run a function only once
function unlockOnce(id, fn) {
    if (!isAchUnlocked(id)) {
        unlockAch(id);
        if (fn) fn();
    }
}

// Achievement registry
// NOTE: secret achievements override their locked UI to ????? form
const ACH = {
    // NORMAL
    "first_open": {
        name: "Welcome!",
        desc: "Open the EP panel for the first time.",
        cat: "normal",
        icon: "⭐"
    },
    "fifty_opens": {
        name: "Regular User",
        desc: "Open the panel 50 times.",
        cat: "normal",
        icon: "📘"
    },

    // SCRIPT USAGE
    "capture_once": {
        name: "First Capture",
        desc: "Capture a word list.",
        cat: "usage",
        icon: "📥"
    },
    "clear_dict": {
        name: "Clean Slate",
        desc: "Clear your dictionary.",
        cat: "usage",
        icon: "🧹"
    },

    // THEMES
    "change_theme": {
        name: "New Look",
        desc: "Change your theme.",
        cat: "themes",
        icon: "🎨"
    },
    "flashy_on": {
        name: "Shiny!",
        desc: "Turn on Flashy Mode.",
        cat: "themes",
        icon: "✨"
    },

    // MISC
    "export_dict": {
        name: "Exporter",
        desc: "Export a dictionary.",
        cat: "misc",
        icon: "📤"
    },

    // SECRET
    "void_touched": {
        name: "The Whisper",
        desc: "Something from the void noticed you.",
        cat: "secret",
        icon: "🔮"
    },
    "void_ascend": {
        name: "Ascended",
        desc: "Go far enough into the void.",
        cat: "secret",
        icon: "👁‍🗨"
    }
};


// ===============================================================
//  🏆 ACHIEVEMENT POPUP (bottom-right like PlayStation)
// ===============================================================

function showAchievementPopup(id) {
    const info = ACH[id];
    if (!info) return;

    const box = document.createElement("div");
    box.className = "ep-ach-popup";

    // secret popups do the deadblack flicker
    const isSecret = info.cat === "secret";

    box.innerHTML = `
        <div class="ep-ach-icon">${info.icon}</div>
        <div class="ep-ach-text">
            <b>${info.name}</b><br>
            <span>${info.desc}</span>
        </div>
    `;

    if (isSecret) box.classList.add("ep-ach-secret");

    document.body.appendChild(box);

    // animate in
    requestAnimationFrame(() => {
        box.style.transform = "translateY(0)";
        box.style.opacity = "1";
    });

    // remove after delay
    setTimeout(() => {
        box.style.opacity = "0";
        box.style.transform = "translateY(40px)";
        setTimeout(() => box.remove(), 500);
    }, 2400);
}


// ===============================================================
//  🏆 Achievement triggers you must call inside script
// ===============================================================

// panel open counter for achievements
let ACH_PANEL_OPEN_COUNT = Store.get("EP_PANEL_OPENS", 0);

// Called when panel opens
function achNotifyPanelOpen() {
    ACH_PANEL_OPEN_COUNT++;
    Store.set("EP_PANEL_OPENS", ACH_PANEL_OPEN_COUNT);

    if (ACH_PANEL_OPEN_COUNT === 1) unlockAch("first_open");
    if (ACH_PANEL_OPEN_COUNT === 50) unlockAch("fifty_opens");
}

// You will call these inside your existing functions:

function achNotifyCapture() {
    unlockAch("capture_once");
}

function achNotifyClearDict() {
    unlockAch("clear_dict");
}

function achNotifyThemeChanged() {
    unlockAch("change_theme");
}

function achNotifyFlashy() {
    unlockAch("flashy_on");
}

function achNotifyExport() {
    unlockAch("export_dict");
}

// SECRET VOID ONES are triggered elsewhere (we’ll hook them later)


  // ------------------ Utils ------------------
    function extractHexes(str){
  if (!str) return [];
  const out = [];
  const re = /#([0-9a-fA-F]{3,8})\b/g;
  let m; while ((m = re.exec(String(str)))) {
    let h = m[0];
    if (h.length === 4) h = '#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
    out.push(h.slice(0,7));
  }
  return out;
}
function hexToRgbArr(hex){
  hex = hex.replace('#','');
  if (hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
}
function mixRgb(a,b,t){ return [
  Math.round(a[0] + (b[0]-a[0])*t),
  Math.round(a[1] + (b[1]-a[1])*t),
  Math.round(a[2] + (b[2]-a[2])*t),
]; }
function rgbaStr(rgb, a){ return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; }
function rgbaWithAlpha(rgba, alpha){
  const m = String(rgba).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return rgba;
  return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
}

/* Build a theme-aware palette. Works for gradients (tuff), light themes, yin-yang. */
function getAccentPalette(el){
  const cs = getComputedStyle(el);
  const acc = cs.getPropertyValue('--ep-accent').trim();
  let hexes = extractHexes(acc);
  if (!hexes.length) {
    const ink = cs.getPropertyValue('--ep-ink').trim() || '#88aaff';
    hexes = extractHexes(ink);
    if (!hexes.length) hexes = ['#88aaff'];
  }

  const base = hexToRgbArr(hexes[0]);
  const white = [255,255,255], black = [0,0,0];

  const palette = [
    rgbaStr(base, .95),
    rgbaStr(mixRgb(base, white, .25), .85),
    rgbaStr(mixRgb(base, black, .15), .90),
  ];

  for (let i = 1; i < Math.min(3, hexes.length); i++) {
    palette.push(rgbaStr(hexToRgbArr(hexes[i]), .9));
  }

  if ((document.body.className || '').includes('theme-yin-yang')) {
    palette.push(rgbaStr(black, .85));
  }

  // darken for light-ish themes
  const inkVar = cs.getPropertyValue('--ep-ink').trim();
  if (inkVar === '#000000') {
    palette.push(rgbaStr(mixRgb(base, black, .35), .90));
    palette.push(rgbaStr(mixRgb(base, black, .55), .85));
  }

  return palette;
}



  function notify(text){ try{ GM_notification({ title:'Educated Perfection', text, timeout:1600 }); } catch { console.log('[EP]', text); } }
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));

  // no diacritic normalization, per spec
  function stripDiacritics(s){ return s; }
function cleanString(s) {
  return String(s || '')
    .replace(/\([^)]*\)/g, '')    // remove (parenthetical) bits
    .replace(/\s+/g, ' ')         // collapse whitespace
    .trim()
    .split(/[,;()]/)[0]           // cut at comma, semicolon, or bracket
    .trim();
}

  function cmp(a,b){ return a===b ? 0 : a>b ? 1 : -1; }

  function getActiveDict(){ return STATE.dicts[STATE.profile] || (STATE.dicts[STATE.profile] = {}); }
    function sanitizeTranslation(raw) {
  return raw.split(/[,;]/)[0].trim(); // stop at comma or semicolon
}

  function setActiveDict(obj){ STATE.dicts[STATE.profile] = obj; persistDicts(); }
  function persistDicts(){ Store.set(KEY.dicts, STATE.dicts); }

  function setInputValue(el,val){
    if (!el) return;
    const isCE = el.getAttribute && el.getAttribute('contenteditable') === 'true';
    if (isCE) { el.focus(); document.execCommand('selectAll', false, null); document.execCommand('insertText', false, val); return; }
    el.focus(); el.value = val;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  // scoring
  function scorePair(q, k, v){
    if (!q) return 0;
    const s = STATE.settings.caseSensitive ? String(q) : String(q).toLowerCase();
    const key0 = STATE.settings.caseSensitive ? String(k) : String(k).toLowerCase();
    const val0 = STATE.settings.caseSensitive ? String(v) : String(v).toLowerCase();
    const key = cleanString(key0), val = cleanString(val0); const qc = cleanString(s);
    let sc = 0;
    if (key0 === s || val0 === s) sc += 120;
    if (key === qc || val === qc) sc += 90;
    if (key.startsWith(qc) || val.startsWith(qc)) sc += 35;
    if (key.includes(qc) || val.includes(qc)) sc += 22;
    const lenDiff = Math.abs((val||'').length - (qc||'').length);
    sc += Math.max(0, 16 - Math.min(16, lenDiff));
    return sc;
  }

function getOppositePair(dict, rawQuery) {
  const variants = rawQuery
    .split(/[,;]/)
    .map(q => cleanString(q).toLowerCase());

  for (const [k, v] of Object.entries(dict)) {
    const keyVariants = k.split(/[,;]/).map(s => cleanString(s).toLowerCase());
    const valVariants = v.split(/[,;]/).map(s => cleanString(s).toLowerCase());

    for (const q of variants) {
      if (keyVariants.includes(q)) return [k, v];
      if (valVariants.includes(q)) return [v, k];
    }
  }

  return null;
}

function topSuggestions(query, limit = 9) {
  const dict = getActiveDict();
  const ent = Object.entries(dict);
  if (!query || !ent.length) return [];

  const qVariants = query
    .split(/[,;]/)
    .map(q => cleanString(q).toLowerCase().trim())
    .filter(Boolean);

  const results = [];

  // Try to find the first matching pair where one side matches the query
  for (const [from, to] of ent) {
    const fromVariants = from.split(/[,;]/).map(s => cleanString(s).toLowerCase().trim());
    const toVariants   = to.split(/[,;]/).map(s => cleanString(s).toLowerCase().trim());

    const matchesFrom = qVariants.some(q => fromVariants.includes(q));
    const matchesTo   = qVariants.some(q => toVariants.includes(q));

    if (matchesFrom) {
      results.push([from, sanitizeTranslation(to), 999]); // question = from → insert to
      break;
    } else if (matchesTo) {
      results.push([to, sanitizeTranslation(from), 999]); // question = to → insert from
      break;
    }
  }

  // Score all remaining entries as usual, skipping the top suggestion
  const rest = ent
    .map(([k, v]) => [k, v, scorePair(query, k, v)])
    .filter(([k, v]) => {
      const kNorm = cleanString(k).toLowerCase().trim();
      const vNorm = cleanString(v).toLowerCase().trim();
      return !(qVariants.includes(kNorm) || qVariants.includes(vNorm));
    })
    .sort((a, b) => b[2] - a[2]);

  return results.concat(rest).slice(0, limit);
}

  function fmtConfidence(sc){ if (!STATE.settings.showConfidence) return ''; const pct = Math.max(1, Math.min(100, Math.round(sc))); return pct + '%'; }

  function suggestProfileName(){
    const texts = qsa('h1,h2,h3,.title,[aria-label],[data-testid]').map(el=>el.textContent.trim()).filter(Boolean).slice(0,20).join(' ');
    const hint = (texts.match(/([A-Za-zÀ-ž]+)\s*[→>-]\s*([A-Za-zÀ-ž]+)/) || [])[0];
    return hint || 'Profile '+(Object.keys(STATE.dicts).length+1);
  }

  // ------------------ Dragging / placement ------------------
  function restorePanelPos(el){
    const pos = Store.get(KEY.pos, null);
    const vw = window.innerWidth, vh = window.innerHeight;
    const def = { left: 16, top: 16, w: Math.min(740, vw-32), h: 540 };
    const p = pos ? { ...def, ...pos } : def;
    el.style.left = Math.max(0, Math.min(vw - 300, p.left)) + 'px';
    el.style.top  = Math.max(0, Math.min(vh - 180, p.top)) + 'px';
    el.style.width  = p.w + 'px';
    el.style.height = p.h + 'px';
  }
  function savePanelPos(el){
    const r = el.getBoundingClientRect();
    Store.set(KEY.pos, { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
  }
  function edgeSnap(el){
    if (!STATE.settings.edgeSnap) return;
    const r = el.getBoundingClientRect(); const margin = 8; const vw = window.innerWidth; const vh = window.innerHeight;
    const snapLeft = Math.abs(r.left - margin) < 24;
    const snapRight = Math.abs((vw - (r.left + r.width)) - margin) < 24;
    const snapTop = Math.abs(r.top - margin) < 24;
    const snapBottom = Math.abs((vh - (r.top + r.height)) - margin) < 24;
    if (snapLeft) el.style.left = margin + 'px';
    if (snapRight) el.style.left = (vw - r.width - margin) + 'px';
    if (snapTop) el.style.top = margin + 'px';
    if (snapBottom) el.style.top = (vh - r.height - margin) + 'px';
  }
  function makeDraggable(panel, handle){
    let sx=0,sy=0,sl=0,st=0,drag=false, moved=false;
    handle.addEventListener('mousedown', e=>{
      if (e.button !== 0) return;
      if (e.target.closest('select, button, input, textarea, label')) return;
      drag=true; moved=false; const r=panel.getBoundingClientRect();
      sx=e.clientX; sy=e.clientY; sl=r.left; st=r.top;
    });
    window.addEventListener('mousemove', e=>{
      if(!drag) return; const dx=e.clientX-sx, dy=e.clientY-sy;
      if (!moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) { moved = true; e.preventDefault(); }
      if (!moved) return;
      panel.style.left=Math.max(0, Math.min(window.innerWidth-panel.offsetWidth, sl+dx))+'px';
      panel.style.top =Math.max(0, Math.min(window.innerHeight-panel.offsetHeight, st+dy))+'px';
    });
    window.addEventListener('mouseup', ()=>{
      if(!drag) return; drag=false; edgeSnap(panel); savePanelPos(panel);
    });
    const ro = new ResizeObserver(()=> savePanelPos(panel));
    ro.observe(panel);
  }

  // ------------------ Sound FX (tiny web-audio clicks) ------------------
  let EP_AUDIO_CTX = null;
  function clickFx(pitch=220, dur=0.06){
    try{
      EP_AUDIO_CTX = EP_AUDIO_CTX || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = EP_AUDIO_CTX;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = pitch;
      g.gain.value = 0.12;
      o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      o.start(now);
      // quick pitch up and decay
      o.frequency.exponentialRampToValueAtTime(pitch*2, now + dur*0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.stop(now + dur);
    } catch {}
  }

  // ------------------ UI ------------------
  function ensureAssistUI(){
    if(qs('#ep-assist-wrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'ep-assist-wrap';
    wrap.className = 'ep-panel';

    // particles background canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'ep-sparkle-canvas';
    wrap.appendChild(canvas);

// expose rebuildThemeOptions for command system + devtools
if (typeof unsafeWindow !== "undefined") {
    unsafeWindow.rebuildThemeOptions = rebuildThemeOptions;
}

 function createEl(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    if (key === 'class') el.className = val;
    else if (key === 'style') Object.assign(el.style, val);
    else if (key === 'html') el.innerHTML = val;
    else el.setAttribute(key, val);
  }
  children.forEach(child => el.appendChild(child));
  return el;
}
// ========== Topbar ==========
function rebuildThemeOptions() {
  const themeSel = document.querySelector('#ep-theme');
  if (!themeSel) return;
  const isSecret = !!STATE.settings.secretThemes;
  const base = { light: THEMES.light, dark: THEMES.dark, glass: THEMES.glass };
  const themes = isSecret ? { ...base, ...SECRET_THEMES } : THEMES;

  // Rebuild options
  themeSel.innerHTML = '';
  Object.keys(themes).forEach(k => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = k.replace(/(^.|-.)/g, s => s.replace('-', ' ').toUpperCase()); // nicer labels
    themeSel.appendChild(o);
  });

  if (!themes[STATE.theme]) {
    STATE.theme = isSecret ? 'dark' : 'dark';
    Store.set(KEY.theme, STATE.theme);
  }
  themeSel.value = STATE.theme;
  injectThemeVars(STATE.theme);
}

      // ===============================================================
//   🔒 POST-VOID THEME LOCK SYSTEM
// ===============================================================

// True while glitch mode is active
const EP_GLITCH_KEY = "EP_GLITCH_ACTIVE";

// If glitch active on reload → force deadblack immediately
if (Store.get(EP_GLITCH_KEY, false)) {
    STATE.theme = "deadblack";
    Store.set(KEY.theme, "deadblack");
    injectThemeVars("deadblack");
}

// Disable clicking the theme dropdown while in glitch mode
function lockThemeDropdown() {
    const dd = document.querySelector("#ep-theme-select"); // your <select>

    if (!dd) return;

    // Already patched? Skip
    if (dd.dataset.epLockApplied) return;
    dd.dataset.epLockApplied = "1";

    dd.addEventListener("mousedown", e => {
        if (!Store.get(EP_GLITCH_KEY, false)) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        flashStatus("something is stopping you.", "error");
        return false;
    }, true);

    dd.addEventListener("click", e => {
        if (!Store.get(EP_GLITCH_KEY, false)) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        flashStatus("something is stopping you.", "error");
        return false;
    }, true);
}

// Keep checking until dropdown loads
const themeWatcher = setInterval(() => {
    const dd = document.querySelector("#ep-theme-select");
    if (dd) {
        lockThemeDropdown();
        clearInterval(themeWatcher);
    }
}, 200);

// Also reapply on UI rebuild
unsafeWindow.rebuildThemeOptions = (function(orig){
    return function(){
        orig();
        lockThemeDropdown();
    };
})(unsafeWindow.rebuildThemeOptions || function(){});


// ========== Topbar ==========
const themeSelect = createEl('select', { id: 'ep-theme', class: 'ep-select', title: 'Theme' });
const themeWrap = createEl('div', { class: 'ep-theme-wrap', style: { position: 'relative' } }, [
  themeSelect,
  createEl('span', { class: 'ep-caret', html: '▾' })
]);

const profileWrap = createEl('div', {
  class: 'ep-theme-wrap',
  style: { position: 'relative', display: 'flex', gap: '6px', alignItems: 'center' }
}, [
  createEl('label', { style: { font: '800 12px', opacity: '.9' }, html: 'Profile' }),
  createEl('select', { id: 'ep-profile', class: 'ep-select', title: 'Select profile' }),
  createEl('button', { id: 'ep-prof-add', class: 'ep-ibtn', title: 'New profile', html: '+' }),
  createEl('button', { id: 'ep-prof-ren', class: 'ep-ibtn', title: 'Rename profile', html: '✎' }),
  createEl('button', { id: 'ep-prof-del', class: 'ep-ibtn', title: 'Delete profile', html: '🗑' })
]);

const topbar = createEl('div', { id: 'ep-topbar', class: 'ep-topbar' }, [
  createEl('div', { class: 'ep-brand', html: 'Educated Perfection' }),
  createEl('div', { class: 'ep-toprow' }, [themeWrap, profileWrap]),
  createEl('div', { class: 'ep-iconbar' }, [
    createEl('button', { id: 'ep-settings-btn', class: 'ep-ibtn', title: 'Settings', html: '⚙️' }),
    createEl('button', {
      id: 'ep-min',
      class: 'ep-ibtn',
      title: 'Minimize (' + ((STATE && STATE.hotkeys && STATE.hotkeys.togglePanel) ? STATE.hotkeys.togglePanel : 'Alt+M') + ')',
      html: '—'
    })
  ])
]);

// ========== Subheader ==========
const subhdr = createEl('div', { class: 'ep-subhdr' }, [
  createEl('div', { class: 'left', html: 'Translations' }),
  createEl('div', { class: 'right' }, [
    createEl('span', { id: 'ep-status', html: 'Ready' })
  ])
]);

// ========== Body ==========
const body = createEl('div', { class: 'ep-body' }, [
  createEl('div', { class: 'ep-search' }, [
    createEl('input', {
      id: 'ep-search',
      class: 'ep-input',
      type: 'text',
      placeholder: 'Search your dictionary or leave blank to use the current question'
    })
  ]),
  createEl('div', {
    id: 'ep-assist-results',
    role: 'listbox',
    'aria-label': 'Suggestions'
  }),
  createEl('div', { class: 'ep-controls' }, [
    createEl('button', {
      id: 'ep-capture',
      class: 'ep-btn',
title: 'Capture word list (' + ((STATE && STATE.hotkeys && STATE.hotkeys.capture) ? STATE.hotkeys.capture : 'Alt+C') + ')',

      html: 'Capture'
    }),
    createEl('button', {
      id: 'ep-clear',
      class: 'ep-btn',
      title: 'Clear the dictionary',
      html: 'Clear'
    }),
    createEl('span', { class: 'ep-right', id: 'ep-stats' }),
    createEl('span', { style: { flex: '1' } }),
    createEl('button', {
      id: 'ep-export',
      class: 'ep-btn small',
      title: 'Export to JSON',
      html: 'Export'
    }),
    createEl('button', {
      id: 'ep-import',
      class: 'ep-btn small',
      title: 'Import JSON',
      html: 'Import'
    })
  ]),
  (function () {
    var HK = (window.STATE && window.STATE.hotkeys) ? window.STATE.hotkeys : {};
    return createEl('div', {
      class: 'ep-minihelp',
      html:
        'Hotkeys: ' + (HK.togglePanel || 'Alt+M') + ' toggle • ' +
        (HK.capture || 'Alt+C') + ' capture • ' +
        (HK.openSearch || 'Alt+F') + ' focus search • ' +
        (HK.prevSuggestion || 'Alt+Up') + '/' + (HK.nextSuggestion || 'Alt+Down') + ' select • ' +
        (HK.showHUD || 'Alt+H') + ' show hotkeys'
    });
  })()
]);

// ========== Settings Panel ==========
var settings;
settings = createEl('div', {
  id: 'ep-settings',
  class: 'ep-settings ep-hidden',
  'aria-hidden': 'true'
}, [
  createEl('h4', { html: 'Settings' }),
  createEl('div', { class: 'ep-grid' }, [

    createEl('label', { title: 'Shows a % hint based on how closely an entry matches the query', html: 'Show confidence %' }),
    createEl('input', { type: 'checkbox', id: 'ep-cfg-conf' }),

    createEl('label', { title: 'If on, comparisons do not lower-case; exact case must match', html: 'Case sensitive matching' }),
    createEl('input', { type: 'checkbox', id: 'ep-cfg-case' }),

    createEl('label', { title: 'Treat é=e, ñ=n when matching', html: 'Normalize diacritics' }),
    createEl('input', { type: 'checkbox', id: 'ep-cfg-dia' }),

    createEl('label', { title: 'Open panel automatically when the question changes (ignored if you manually minimized)', html: 'Auto-open on new question' }),
    createEl('input', { type: 'checkbox', id: 'ep-cfg-open' }),

    createEl('label', { title: 'Snap panel to edges when dropped near borders', html: 'Edge snap on drag' }),
    createEl('input', { type: 'checkbox', id: 'ep-cfg-snap' }),

    // REMOVED auto-insert + secret themes checkboxes

    createEl('label', { title: 'Bigger glow, brighter particles, faster rim', html: 'Flashy Mode ✨' }),
    createEl('input', { type: 'checkbox', id: 'ep-cfg-flashy' }),

    createEl('label', { title: 'Panel + outward page emitter + extra juice', html: 'EPIC Flashy Mode 💥' }),
    createEl('input', { type: 'checkbox', id: 'ep-cfg-epic' }),

  ]),

  // Hotkeys section
  createEl('h4', { style: { marginTop: '10px' }, html: 'Hotkeys' }),
  createEl('div', { id: 'ep-hotkeys', class: 'ep-grid' }),

  // Buttons row
  createEl('div', { style: { marginTop: '8px', display: 'flex', gap: '8px' } }, [
    createEl('button', { id: 'ep-reset-hotkeys', class: 'ep-btn', html: 'Reset hotkeys' }),
    createEl('button', { id: 'ep-close-settings', class: 'ep-btn', html: 'Close' })
  ])
]);

// ========== Append to wrap ==========
wrap.appendChild(topbar);
wrap.appendChild(subhdr);
wrap.appendChild(body);
wrap.appendChild(settings);
    document.body.appendChild(wrap);
      // ===============================================================
//  🏆 ACHIEVEMENT UI PANEL (left of ⚙️ settings)
// ===============================================================

// Inject Achievements button into topbar AFTER settings
(function injectAchievementsButton() {
    const iconBar = document.querySelector(".ep-iconbar");
    if (!iconBar) return;

    // create button
    const btn = document.createElement("button");
    btn.id = "ep-ach-btn";
    btn.className = "ep-ibtn";
    btn.title = "Achievements";
    btn.innerHTML = "🏆";

    // Insert BEFORE settings button
    const settingsBtn = document.querySelector("#ep-settings-btn");
    if (settingsBtn) iconBar.insertBefore(btn, settingsBtn);

    btn.addEventListener("click", () => toggleAchievements());
})();


// ===============================================================
//  🏆 ACHIEVEMENTS PANEL ELEMENT
// ===============================================================

const EP_ACH_PANEL_ID = "ep-ach-panel";

function buildAchievementsPanel() {
    if (document.getElementById(EP_ACH_PANEL_ID)) return;

    const panel = document.createElement("div");
    panel.id = EP_ACH_PANEL_ID;
    panel.className = "ep-ach-panel ep-hidden";

    panel.innerHTML = `
        <div class="ep-ach-header">
            <span class="ep-ach-title">🏆 Achievements</span>
            <button id="ep-ach-close" class="ep-ibtn" title="Close">✖</button>
        </div>

        <div class="ep-ach-cats">

            <div class="ep-ach-cat" data-cat="normal">
                <h3>General</h3>
                <div class="ep-ach-list"></div>
            </div>

            <div class="ep-ach-cat" data-cat="usage">
                <h3>Script Usage</h3>
                <div class="ep-ach-list"></div>
            </div>

            <div class="ep-ach-cat" data-cat="themes">
                <h3>Themes</h3>
                <div class="ep-ach-list"></div>
            </div>

            <div class="ep-ach-cat" data-cat="misc">
                <h3>Misc</h3>
                <div class="ep-ach-list"></div>
            </div>

            <div class="ep-ach-cat" data-cat="secret">
                <h3>???</h3>
                <div class="ep-ach-list"></div>
            </div>

        </div>
    `;

    document.body.appendChild(panel);
achApplyThemeColors();
achMakeDraggable();

    document.getElementById("ep-ach-close").addEventListener("click", () => {
        toggleAchievements(false);
    });
}


// ===============================================================
//  🏆 TOGGLE PANEL
// ===============================================================

function toggleAchievements(force) {
    buildAchievementsPanel();
    const panel = document.getElementById(EP_ACH_PANEL_ID);
    if (!panel) return;

    const show = force !== undefined ? force : panel.classList.contains("ep-hidden");

    panel.classList.toggle("ep-hidden", !show);
    if (show) renderAchievements();
}


// ===============================================================
//  🏆 RENDER ACHIEVEMENTS INTO THE PANEL
// ===============================================================

function renderAchievements() {
    const panel = document.getElementById(EP_ACH_PANEL_ID);
    if (!panel) return;

    // clear all
    panel.querySelectorAll(".ep-ach-list").forEach(list => list.innerHTML = "");

    // loop
    for (const [id, meta] of Object.entries(ACH)) {
        const list = panel.querySelector(`.ep-ach-cat[data-cat="${meta.cat}"] .ep-ach-list`);
        if (!list) continue;

        const unlocked = isAchUnlocked(id);

        const div = document.createElement("div");
        div.className = "ep-ach-item";
        if (unlocked) div.classList.add("ep-ach-item-unlocked");

        let name = meta.name;
        let desc = meta.desc;
        let icon = meta.icon;

        if (meta.cat === "secret" && !unlocked) {
            name = "?????";
            desc = "[ ] [ ] [ ] [ ]";
            icon = "⬤";
            div.classList.add("ep-ach-secret-mask");
        }

        div.innerHTML = `
            <div class="ep-ach-item-icon">${icon}</div>
            <div class="ep-ach-item-text">
                <b>${name}</b><br>
                <span>${desc}</span>
            </div>
        `;

        list.appendChild(div);
    }
}


// ===============================================================
//  🏆 HOOK — FIRE 'PANEL OPEN' ACHIEVEMENT
// ===============================================================

(function hookOpenAchievement() {
    const orig = window.togglePanel;
    window.togglePanel = function(...args) {
        const wasMin = STATE.minimized;
        const out = orig.apply(this, args);

        // If it just opened → count as open
        if (wasMin && !STATE.minimized) {
            achNotifyPanelOpen();
        }

        return out;
    };
})();

      // ========== STATUS SYSTEM ==========
let currentStatus = "Ready";
let statusMode = "normal"; // normal, info, command, secret, warn, error

function applyStatusMode(mode) {
  const statusEl = qs("#ep-status");
  if (!statusEl) return;

  statusEl.classList.remove(
    "ep-status-normal",
    "ep-status-info",
    "ep-status-command",
    "ep-status-secret",
    "ep-status-warn",
    "ep-status-error"
  );

  const map = {
    normal: "ep-status-normal",
    info: "ep-status-info",
    command: "ep-status-command",
    secret: "ep-status-secret",
    warn: "ep-status-warn",
    error: "ep-status-error"
  };

  statusEl.classList.add(map[mode] || "ep-status-normal");
}

// Standard setter
function setStatus(msg, mode = "normal") {
  const statusEl = qs("#ep-status");
  if (!statusEl) return;

  currentStatus = msg;
  statusMode = mode;

  statusEl.textContent = msg;
  applyStatusMode(mode);
}

// Flash temporary status
function flashStatus(msg, mode = "secret", duration = 700) {
  const statusEl = qs("#ep-status");
  if (!statusEl) return;

  const oldMsg = currentStatus;
  const oldMode = statusMode;

  statusEl.textContent = msg;
  applyStatusMode(mode);

  // glitch effect for secret/warning
  if (["secret", "warn"].includes(mode)) {
    statusEl.classList.add("ep-status-glitch");
    setTimeout(() => statusEl.classList.remove("ep-status-glitch"), 200);
  }

  setTimeout(() => {
    statusEl.textContent = oldMsg;
    applyStatusMode(oldMode);
  }, duration);
}

// expose to page/devtools
if (typeof unsafeWindow !== "undefined") {
    unsafeWindow.setStatus = setStatus;
    unsafeWindow.flashStatus = flashStatus;
}


      updateHotkeyTitleRefs();
rebuildThemeOptions();

    // Position, theme, profile
    restorePanelPos(wrap);
    makeDraggable(wrap, qs('#ep-topbar'));
    const themeSel = qs('#ep-theme');
    themeSel.value = STATE.theme; injectThemeVars(STATE.theme);
themeSel.addEventListener('change', ()=>{
  STATE.theme = themeSel.value;
  Store.set(KEY.theme, STATE.theme);
injectThemeVars(STATE.theme);
    achNotifyThemeChanged();

if (STATE.settings.epicFlashyMode) startGlobalEmitter(qs('#ep-assist-wrap'));
if (wrap && wrap._epParticles) wrap._epParticles.restart();
  if (STATE.settings.epicFlashyMode) {
    startGlobalEmitter(wrap);
  } else {
    stopGlobalEmitter();
  }
  nudgeReflow(wrap);
  clickFx(330, .05);
});


    // Profiles
    const profSel = qs('#ep-profile');
    const btnAdd = qs('#ep-prof-add'), btnRen = qs('#ep-prof-ren'), btnDel = qs('#ep-prof-del');
    function refreshProfiles(){
      profSel.innerHTML = '';
      const names = Object.keys(STATE.dicts).sort(cmp);
      if (!names.includes(STATE.profile)) names.push(STATE.profile);
      for (const n of names) { const opt = document.createElement('option'); opt.value = n; opt.textContent = n; profSel.appendChild(opt); }
      profSel.value = STATE.profile;
    }
    refreshProfiles();

    profSel.addEventListener('change', ()=>{ STATE.profile = profSel.value; Store.set(KEY.profile, STATE.profile); refreshAssist(true); updateStats(); clickFx(240, .05); });

    btnAdd.onclick = ()=> { clickFx(300,.06);
      const nm = prompt('New profile name', suggestProfileName()); if (!nm) return;
      if (STATE.dicts[nm]) { alert('Profile already exists.'); return; }
      STATE.dicts[nm] = {}; STATE.profile = nm; Store.set(KEY.profile, nm); persistDicts(); refreshProfiles(); refreshAssist(true); updateStats();
    };
    btnRen.onclick = ()=> { clickFx(260,.06);
      const nm = prompt('Rename profile', STATE.profile); if (!nm || nm === STATE.profile) return;
      if (STATE.dicts[nm]) { alert('Target name already exists.'); return; }
      STATE.dicts[nm] = getActiveDict(); delete STATE.dicts[STATE.profile]; STATE.profile = nm; Store.set(KEY.profile, nm); persistDicts(); refreshProfiles(); refreshAssist(true); updateStats();
    };
    btnDel.onclick = ()=> { clickFx(200,.06);
      if (!confirm('Delete profile "'+STATE.profile+'"? This cannot be undone.')) return;
      delete STATE.dicts[STATE.profile];
      STATE.profile = Object.keys(STATE.dicts)[0] || 'Default';
      if (!STATE.dicts[STATE.profile]) STATE.dicts[STATE.profile] = {};
      Store.set(KEY.profile, STATE.profile); persistDicts(); refreshProfiles(); refreshAssist(true); updateStats();
    };

    // Buttons + SFX
    const buttonClickSFX = (btn) => btn && btn.addEventListener('click', ()=> clickFx(220+Math.random()*80, .05));
    ['#ep-min','#ep-capture','#ep-export','#ep-import','#ep-clear','#ep-settings-btn','#ep-reset-hotkeys','#ep-close-settings'].forEach(sel=>buttonClickSFX(qs(sel)));

    qs('#ep-min').onclick = () => setMinimized(true, true);
    qs('#ep-capture').onclick = ()=> capturePairs();
    qs('#ep-export').onclick = () => exportDictJSON();
qs('#ep-import').onclick = () => importDictJSON();
qs('#ep-clear').onclick = () => {
  clearDict();
};

// Search
const search = qs('#ep-search');
search.addEventListener('input', () => refreshAssist(false));
search.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
        const val = search.value.trim();

        if (val.startsWith(COMMAND_PREFIX)) {
            e.preventDefault();
            runCommand(val);
            search.value = "";
        }
    }
});

    // Settings view
    const setBtn = qs('#ep-settings-btn');
if (setBtn) setBtn.onclick = ()=> toggleSettings(true);
const closeSet = qs('#ep-close-settings');
if (closeSet) closeSet.onclick = ()=> toggleSettings(false);

// Settings Inputs
const cConf = qs('#ep-cfg-conf'), cCase = qs('#ep-cfg-case'), cDia = qs('#ep-cfg-dia'),
      cOpen = qs('#ep-cfg-open'), cSnap = qs('#ep-cfg-snap'),
      cFlashy = qs('#ep-cfg-flashy'), cEpic = qs('#ep-cfg-epic');
      const cAutoInsert = qs('#ep-cfg-autoInsert');
    const cSecret = qs('#ep-cfg-secretThemes');

// initial states
      if (cAutoInsert) cAutoInsert.checked = !!STATE.settings.autoInsertTop;


if (cConf)   cConf.checked   = !!STATE.settings.showConfidence;
if (cCase)   cCase.checked   = !!STATE.settings.caseSensitive;
if (cDia)    cDia.checked    = false;
if (cOpen)   cOpen.checked   = !!STATE.settings.autoOpenOnQuestion;
if (cSnap)   cSnap.checked   = !!STATE.settings.edgeSnap;
if (cEpic)   cEpic.checked   = !!STATE.settings.epicFlashyMode;
if (cFlashy) cFlashy.checked = !STATE.settings.epicFlashyMode && !!STATE.settings.flashyMode;
if (cSecret) cSecret.checked = !!STATE.settings.secretThemes;

// generic setters
      if (cAutoInsert) cAutoInsert.onchange = e => saveSetting('autoInsertTop', e.target.checked);

if (cConf) cConf.onchange = e => saveSetting('showConfidence', e.target.checked);
if (cCase) cCase.onchange = e => saveSetting('caseSensitive', e.target.checked);
if (cDia)  cDia.onchange  = () => { STATE.settings.normalizeDiacritics = false; Store.set(KEY.settings, STATE.settings); };
if (cOpen) cOpen.onchange = e => saveSetting('autoOpenOnQuestion', e.target.checked);
if (cSnap) cSnap.onchange = e => saveSetting('edgeSnap', e.target.checked);

if (cEpic) cEpic.onchange = e => {
  if (e.target.checked) {
    // when turning on epic:
    saveSetting('epicFlashyMode', true);
    saveSetting('flashyMode', false);
    if (cFlashy) cFlashy.checked = false;
    setFlashy(false);
    setEpicFlashy(true);
  } else {
    // turning epic off
    saveSetting('epicFlashyMode', false);
    setEpicFlashy(false);
  }
};

if (cFlashy) cFlashy.onchange = e => {
  if (e.target.checked) {
    // when turning on flashy:
    saveSetting('flashyMode', true);
    saveSetting('epicFlashyMode', false);
    if (cEpic) cEpic.checked = false;
    setEpicFlashy(false);
    setFlashy(true);
      achNotifyFlashy();

  } else {
    // turning flashy off
    saveSetting('flashyMode', false);
    setFlashy(false);
  }
};
// Secret themes toggle handler
if (cSecret) cSecret.onchange = e => {
  saveSetting('secretThemes', e.target.checked);
  rebuildThemeOptions();            // repopulate the dropdown
  const themeSel = document.querySelector('#ep-theme');
  // If current theme is gone in secret mode, fall back sensibly
  const available = (() => {
    const base = { light: THEMES.light, dark: THEMES.dark, glass: THEMES.glass };
    return STATE.settings.secretThemes ? { ...base, ...SECRET_THEMES } : THEMES;
  })();
  if (!available[STATE.theme]) {
    STATE.theme = STATE.settings.secretThemes ? 'dark' : 'dark';
    Store.set(KEY.theme, STATE.theme);
  }
  if (themeSel) themeSel.value = STATE.theme;
  injectThemeVars(STATE.theme);
};


// Hotkeys editor
buildHotkeysEditor();
const hkReset = qs('#ep-reset-hotkeys');
if (hkReset) hkReset.onclick = ()=>{
  STATE.hotkeys = { ...DEFAULTS.hotkeys }
  Store.set(KEY.hotkeys, STATE.hotkeys);
  buildHotkeysEditor();
};

// Particles init (after inserted and sized)
initParticles(canvas, wrap);

// Initial draw
updateStats();

    if (STATE.minimized) setMinimized(true);
  }

  function showOverlay(msg){ const n = document.createElement('div'); n.className='ep-overlay'; n.textContent = msg; document.body.appendChild(n); setTimeout(()=> n.remove(), 1100); }
function updateStats() {
  var st = qs('#ep-stats');
  if (!st) return;

  var dict = getActiveDict();
  var size = dict ? Object.keys(dict).length : 0;

  var extra = (STATE && STATE.captureCount)
    ? ' • Last capture +' + STATE.captureCount
    : '';

  st.textContent = 'Entries: ' + size + extra;

  if (STATE) STATE.captureCount = 0;
}
  function nudgeReflow(el){ el.style.transform='translateZ(0)'; requestAnimationFrame(()=> { el.style.transform=''; }); }

  function toggleSettings(show){ const st = qs('#ep-settings'); if (!st) return; st.classList.toggle('ep-hidden', !show); st.setAttribute('aria-hidden', String(!show)); }
  function saveSetting(k, v){ STATE.settings[k] = v; Store.set(KEY.settings, STATE.settings); }

  function buildHotkeysEditor(){
    const cont = qs('#ep-hotkeys'); if (!cont) return; cont.innerHTML = '';
    const entries = Object.entries(STATE.hotkeys);
    for (const [act, combo] of entries) {
      const lab = document.createElement('label'); lab.textContent = act;
      const box = document.createElement('input'); box.className='ep-kbd'; box.value = combo; box.readOnly = true; box.title = 'Click then press new combo';
      box.addEventListener('keydown', e=>{
        e.preventDefault(); e.stopPropagation();
        // do not allow modifier-only combos (fixes "Alt opens menu" trap)
        if (['Alt','Control','Shift','Meta'].includes(e.key)) return;
        const comboNew = comboFromEvent(e);
        box.value = comboNew; STATE.hotkeys[act] = comboNew; Store.set(KEY.hotkeys, STATE.hotkeys); updateHotkeyTitleRefs(); clickFx(260,.05);
      });
      cont.appendChild(lab); cont.appendChild(box);
    }
    updateHotkeyTitleRefs();
  }
  function updateHotkeyTitleRefs(){
    const m = STATE.hotkeys;
    const btnMin = qs('#ep-min'); if (btnMin) btnMin.title = 'Minimize (' + m.togglePanel + ')';
    const btnCap = qs('#ep-capture'); if (btnCap) btnCap.title = 'Capture (' + m.capture + ')';
  }

  // ------------------ Rendering ------------------
  function renderSuggestions(list){
    const res = qs('#ep-assist-results'); if(!res) return;
    res.innerHTML = '';
    if(!list.length){ res.innerHTML = '<div style="opacity:.85; padding:6px 2px">No suggestions.</div>'; return; }
    const selIdx = Math.max(1, Math.min(list.length, STATE.selectedIndex));
    list.forEach(([k,v,sc],i)=>{
      const row = document.createElement('div');
      row.className = 'ep-sugg';
      row.setAttribute('role','option');
      row.setAttribute('tabindex','0');
      row.setAttribute('aria-selected', String(i+1 === selIdx));
      row.dataset.index = i+1;
      const conf = fmtConfidence(sc);
row.innerHTML = '<b>' + (i + 1) + '. ' + escapeHtml(v || k) + '</b><i>' +
                escapeHtml(k || '') + (conf ? ' • ' + conf : '') + '</i>';
      row.onclick = () => { insertIntoAnswer(v||k); clickFx(300,.05); };
      res.appendChild(row);
    });
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch])); }

  // ------------------ Capture (robust, row-paired, visible-only) ------------------
  function isVisible(el){
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0;
  }
  function findRowContainer(el){
    // smallest ancestor that contains exactly 1 base + 1 target
    let n = el;
    for (let depth = 0; depth < 6 && n; depth++){
      const b = n.querySelectorAll(SEL.baseList);
      const t = n.querySelectorAll(SEL.targetList);
      if (b.length === 1 && t.length === 1) return n;
      n = n.parentElement;
    }
    return null;
  }

  function capturePairs(){
    const baseEls = qsa(SEL.baseList).filter(isVisible);
    const targetEls = qsa(SEL.targetList).filter(isVisible);
    if (!baseEls.length || !targetEls.length) {
      notify('No pairs found. Make sure you are on the word list page and the items are visible.');
      return;
    }

    const dict = { ...getActiveDict() };
    let added = 0;
    const seenContainers = new Set();
    for (const b of baseEls){
      const cont = findRowContainer(b);
      if (!cont || seenContainers.has(cont)) continue;
      const be = cont.querySelector(SEL.baseList);
      const te = cont.querySelector(SEL.targetList);
      if (!be || !te || !isVisible(be) || !isVisible(te)) continue;
      const bRaw = be.textContent.trim();
      const tRaw = te.textContent.trim();
      if (!bRaw || !tRaw) continue;

      const bc = cleanString(bRaw), tc = cleanString(tRaw);
      if (dict[bRaw] !== tc) { dict[bRaw] = tc; added++; }
      if (dict[tRaw] !== bc) { dict[tRaw] = bc; added++; }
      if (dict[bc]   !== tc) { dict[bc]   = tc; added++; }
      if (dict[tc]   !== bc) { dict[tc]   = bc; added++; }

      seenContainers.add(cont);
    }

    if (added === 0) {
      const bases = baseEls.map(e=>e.textContent.trim()).filter(Boolean);
      const targets = targetEls.map(e=>e.textContent.trim()).filter(Boolean);
      if (bases.length && bases.length === targets.length) {
        for (let i=0;i<bases.length;i++){
          const bRaw = bases[i], tRaw = targets[i];
          const bc = cleanString(bRaw), tc = cleanString(tRaw);
          if (dict[bRaw] !== tc) { dict[bRaw] = tc; added++; }
          if (dict[tRaw] !== bc) { dict[tRaw] = bc; added++; }
          if (dict[bc]   !== tc) { dict[bc]   = tc; added++; }
          if (dict[tc]   !== bc) { dict[tc]   = bc; added++; }
        }
      }
    }

       if (!added) {
      notify('No row-paired items detected. Try scrolling the list into view.');
      flashStatus('No new pairs found', 'warn', 900);
      setStatus('No new pairs detected', 'warn');
      return;
    }

    setActiveDict(dict);
    STATE.captureCount = added;
    updateStats();

    notify('Captured ' + added + ' entries.');
    setStatus('Captured ' + added + ' entries', 'info');
    flashStatus('Captured ' + added + ' entries', 'info', 700);

    refreshAssist(true);
      achNotifyCapture();

  }

  // ------------------ Export / Import ------------------
  function exportDictJSON(){
  const data = JSON.stringify(getActiveDict(), null, 2);
  const blob = new Blob([data], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ep_dict_' + safeFile(STATE.profile) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);

  setStatus('Exported dictionary for "' + STATE.profile + '"', 'info');
  flashStatus('Exported JSON', 'info', 700);
      achNotifyExport();

}

  function safeFile(s){ return String(s).replace(/[^A-Za-z0-9._-]/g,'_'); }

  function importDictJSON(){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange=()=>{
      const f=inp.files && inp.files[0]; if(!f) return;
      const r=new FileReader();
      r.onload=()=>{
                try {
          const j = JSON.parse(String(r.result || '{}'));
          if (typeof j !== 'object' || Array.isArray(j)) throw 0;

          const dict = getActiveDict();
          let merged = 0;
          for (const [k, v] of Object.entries(j)) {
            if (dict[k] !== v) { dict[k] = v; merged++; }
          }

          setActiveDict(dict);
          updateStats();
          notify('Imported ' + merged + ' entries.');
          setStatus('Imported ' + merged + ' entries into "' + STATE.profile + '"', 'info');
          flashStatus('Import successful', 'info', 800);
          refreshAssist(true);
        } catch {
          notify('Invalid file.');
          setStatus('Import failed: invalid file', 'error');
          flashStatus('Import failed', 'error', 900);
        }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  function clearDict() {
  if (!confirm('Clear all entries in profile "' + STATE.profile + '"?')) return;

  setActiveDict({});
  updateStats();
  refreshAssist(true);

  setStatus('Dictionary cleared for "' + STATE.profile + '"', 'warn');
      achNotifyClearDict();

}


  function insertIntoAnswer(txt){ const box=qs(SEL.answerBox); if(!box) { notify('Answer box not found.'); return; } setInputValue(box, txt); showOverlay('Pasted'); }

  function computeSuggestions(){
    const qEl = qs(SEL.question); const qText = qEl ? qEl.textContent.trim() : '';
    const manual = (qs('#ep-search') || {}).value || '';
    const query = manual || qText;
    const list = topSuggestions(query, 9);
    return list;
  }
  function refreshAssist(resetIndex){
    const list = computeSuggestions();
    if (resetIndex) STATE.selectedIndex = 1;
    renderSuggestions(list);
  }

    function achGetReadableColor() {
    let acc = getComputedStyle(document.body).getPropertyValue("--ep-accent").trim();
    if (!acc) return "#fff";

    const match = acc.match(/#([0-9a-f]{3}|[0-9a-f]{6})/i);
    if (!match) return "#fff";

    let hex = match[1];
    if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");

    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);

    const brightness = r * 0.299 + g * 0.587 + b * 0.114;
    return brightness > 155 ? "#111" : "#fff";
}

    function achApplyThemeColors() {
    const col = achGetReadableColor();
    const panel = document.getElementById("ep-ach-panel");
    if (!panel) return;

    panel.style.color = col;

    panel.querySelectorAll(".ep-ach-item").forEach(item => {
        item.style.color = col;
    });
}

    function openAchievements() {
    // If already open → close it
    const existing = document.getElementById("ep-ach-panel");
    if (existing) {
        existing.remove();
        return;
    }

    // Create panel
    const panel = document.createElement("div");
    panel.id = "ep-ach-panel";

    panel.innerHTML = `
        <div class="ep-ach-header">
            <span class="ep-ach-title">Achievements</span>

            <button id="ep-ach-close-btn" style="
                font-size: 16px;
                background: none;
                border: none;
                color: var(--ep-ink);
                cursor: pointer;
            ">✖</button>
        </div>

        <div id="ep-ach-content"></div>
    `;

    document.body.appendChild(panel);

    // Close button
    document.getElementById("ep-ach-close-btn").onclick = () => {
        panel.remove();
    };

    // Render all achievements into the content container
    renderAchievementsInto(document.getElementById("ep-ach-content"));

    // Make panel draggable
    makeAchievementPanelDraggable(panel);
}

function makeAchievementPanelDraggable(panel, handle) {
    let dragging = false;
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;

    handle.addEventListener("mousedown", e => {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = panel.getBoundingClientRect();
        origX = rect.left;
        origY = rect.top;

        handle.style.cursor = "grabbing";
        e.preventDefault();
    });

    window.addEventListener("mouseup", () => {
        dragging = false;
        handle.style.cursor = "grab";
    });

    window.addEventListener("mousemove", e => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        panel.style.left = (origX + dx) + "px";
        panel.style.top = (origY + dy) + "px";
    });
}

    function achMakeDraggable() {
    const panel = document.getElementById("ep-ach-panel");
    const header = panel?.querySelector(".ep-ach-header");
    if (!panel || !header) return;

    let sx, sy, sl, st, dragging = false;

    header.style.cursor = "grab";

    header.addEventListener("mousedown", e => {
        if (e.button !== 0) return;
        dragging = true;
        const r = panel.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY;
        sl = r.left; st = r.top;
        header.style.cursor = "grabbing";
        e.preventDefault();
    });

    window.addEventListener("mousemove", e => {
        if (!dragging) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        panel.style.left = `${sl + dx}px`;
        panel.style.top  = `${st + dy}px`;
        panel.style.transform = "none";
    });

    window.addEventListener("mouseup", () => {
        dragging = false;
        header.style.cursor = "grab";
    });
}


  // ------------------ Hotkeys ------------------
  function comboFromEvent(e){
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.metaKey) parts.push('Meta');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    let key = e.key; if (key === ' ') key = 'Space';
    parts.push(key.length === 1 ? key.toUpperCase() : key);
    return parts.join('+');
  }
  function matchesCombo(e, combo){
    if (!combo) return false;
    const parts = combo.split('+'); const need = { Ctrl:false, Meta:false, Alt:false, Shift:false }; let key = null;
    for (const p of parts) { if (need.hasOwnProperty(p)) need[p] = true; else key = p; }
    if (!!need.Ctrl !== !!e.ctrlKey) return false;
    if (!!need.Meta !== !!e.metaKey) return false;
    if (!!need.Alt !== !!e.altKey) return false;
    if (!!need.Shift !== !!e.shiftKey) return false;
    const ek = (e.key.length===1? e.key.toUpperCase(): (e.key===' ' ? 'Space' : e.key));
    return !key ? false : ek === key; // require a real non-modifier key
  }

  window.addEventListener('keydown', (e)=>{
    // ignore plain modifier presses entirely (fixes "Alt opens menu")
    if (['Alt','Control','Shift','Meta'].includes(e.key)) return;

    const isTyping = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.getAttribute('contenteditable')==='true');
    const HK = STATE.hotkeys;

    if (matchesCombo(e, HK.togglePanel)) { e.preventDefault(); e.stopPropagation(); togglePanel(); return; }
    if (matchesCombo(e, HK.capture))     { e.preventDefault(); capturePairs(); return; }
    if (matchesCombo(e, HK.openSearch))  { e.preventDefault(); const s=qs('#ep-search'); if (s) { s.focus(); s.select(); } return; }
if (matchesCombo(e, HK && HK.showHUD ? HK.showHUD : null)) {
  e.preventDefault();
  if (STATE && STATE.settings && STATE.settings.hudOnAltH) {
    var hk = (STATE && STATE.hotkeys) ? STATE.hotkeys : {};
    var parts = [];
    for (var k in hk) {
      if (Object.prototype.hasOwnProperty.call(hk, k)) {
        parts.push(k + ': ' + hk[k]);
      }
    }
    showOverlay(parts.join('  |  '));
  }
  return;
}

    if (!(e.altKey || e.ctrlKey || e.metaKey)) return;
    if (matchesCombo(e, HK.nextSuggestion)) { e.preventDefault(); moveSelection(1); return; }
    if (matchesCombo(e, HK.prevSuggestion)) { e.preventDefault(); moveSelection(-1); return; }
    if (isTyping) return;
  }, true);

function togglePanel(){
  if (!qs('#ep-assist-wrap')) ensureAssistUI();
  if (STATE.minimized) {
    setMinimized(false);
    STATE.minimizedSticky = 0;
    Store.set(KEY.minSticky, 0);
  } else {
    setMinimized(true, true);
  }
}

function setFlashy(on = true) {
  const root = document.querySelector('#ep-assist-wrap');
  if (!root) return;
  root.classList.toggle('ep-flashy', !!on);
  if (on) stopGlobalEmitter();          // flashy should NOT have global emitter
  if (!on) root.classList.remove('ep-epic');
  if (root._epParticles) root._epParticles.restart();
}

function setEpicFlashy(on = true) {
  const root = document.querySelector('#ep-assist-wrap');
  if (!root) return;
  root.classList.toggle('ep-epic', !!on);
  if (on) {
    root.classList.remove('ep-flashy');
    startGlobalEmitter(root);
  } else {
    stopGlobalEmitter();
  }
  if (root._epParticles) root._epParticles.restart();
}


function setMinimized(min, sticky){
  const wrap = qs('#ep-assist-wrap'); if (!wrap) return;
  wrap.style.display = min ? 'none' : 'block';
  STATE.minimized = min ? 1 : 0;
  Store.set(KEY.minimized, STATE.minimized);

  if (STATE.settings.epicFlashyMode) {
    if (min) stopGlobalEmitter();
    else     startGlobalEmitter(wrap);
  }

  if (typeof sticky === 'boolean') {
    STATE.minimizedSticky = sticky ? 1 : 0;
    Store.set(KEY.minSticky, STATE.minimizedSticky);
  }
}


  function moveSelection(d){ const list = computeSuggestions(); if (!list.length) return; const n = list.length; STATE.selectedIndex = ((STATE.selectedIndex-1 + d + n) % n) + 1; renderSuggestions(list); }

  // ------------------ Observers ------------------
  const domObs = new MutationObserver(()=>{
    ensureAssistUI();
    const q=qs(SEL.question); const t=q?q.textContent.trim():'';
    if(t!==STATE.lastQ){
      STATE.lastQ=t;
      clearTimeout(refreshAssist._t);
      refreshAssist._t=setTimeout(()=>{
        if (STATE.settings.autoOpenOnQuestion && !STATE.minimizedSticky) setMinimized(false);
        refreshAssist(true);
                 if (STATE.settings.autoInsertTop) {
          const best = topSuggestions(t, 1)[0];
          if (best && best[1]) {
            insertIntoAnswer(best[1]);
            setStatus('Auto-inserted top suggestion', 'info');
            flashStatus('Auto-inserted', 'secret', 800);
            console.log("[EP] ✅ Answer inserted. Press Enter manually to submit.");
          } else {
            setStatus('No suggestion available to auto-insert', 'warn');
          }
        }
      },30);
    }
  });
  domObs.observe(document.documentElement,{ childList:true, subtree:true });

  // ------------------ Particles engine ------------------
function initParticles(canvas, container){
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let raf = 0, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W=0,H=0, parts=[];

  const mode = () => container.classList.contains('ep-epic') ? 'epic' :
                      container.classList.contains('ep-flashy') ? 'flashy' : 'normal';

function cfg(){
  const palette = getAccentPalette(container);
  switch (mode()){
    case 'epic':   return {
      nFactor: 1/1200,        // denser (more particles)
      r: [2.0, 5.0],          // noticeably bigger
      a: [.7, 1.0],           // brighter alpha
      trail: .25,             // stronger trail
      vx: 0.45, vy: 0.45,     // faster
      palette
    };
    // FLASHY: strong but not insane
    case 'flashy': return {
      nFactor: 1/2200,
      r: [1.0, 3.2],
      a: [.4, .85],
      trail: .12,
      vx: 0.33, vy: 0.33,
      palette
    };
    // NORMAL
    default: return {
      nFactor: 1/3500,
      r: [0.8, 2.2],
      a: [.25, .60],
      trail: .06,
      vx: 0.28, vy: 0.28,
      palette
    };
  }
}


  function rand(min,max){ return min + Math.random()*(max-min); }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function resize(){
    const r = container.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W+'px';
    canvas.style.height = H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    spawn();
  }

  function spawn(){
    const c = cfg();
    const n = Math.max(24, Math.min(140, Math.floor((W*H) * c.nFactor)));
    parts = Array.from({length:n}, ()=>({
      x: Math.random()*W,
      y: Math.random()*H,
      r: rand(c.r[0], c.r[1]),
      vx: rand(-c.vx, c.vx),
      vy: rand(-c.vy, c.vy),
      a: rand(c.a[0], c.a[1]),
      color: pick(c.palette),
      shape: Math.floor(Math.random()*3) // 0 circle, 1 square, 2 diamond (subtle)
    }));
  }

  function drawParticle(p, c){
    const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6);
    g.addColorStop(0, rgbaWithAlpha(p.color, 0.12*p.a));
    g.addColorStop(1, rgbaWithAlpha(p.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();

    ctx.fillStyle = rgbaWithAlpha(p.color, c.trail);
    if (p.shape === 1) ctx.fillRect(p.x-p.r*0.6, p.y-p.r*0.6, p.r*1.2, p.r*1.2);
    else if (p.shape === 2) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y-p.r*0.9);
      ctx.lineTo(p.x+p.r*0.9, p.y);
      ctx.lineTo(p.x, p.y+p.r*0.9);
      ctx.lineTo(p.x-p.r*0.9, p.y);
      ctx.closePath(); ctx.fill();
    }
  }

  function step(){
    const c = cfg();
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts){
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W+10; else if (p.x > W+10) p.x = -10;
      if (p.y < -10) p.y = H+10; else if (p.y > H+10) p.y = -10;
      drawParticle(p, c);
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(step);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize(); cancelAnimationFrame(raf); raf = requestAnimationFrame(step);

  // Restart handle for theme changes or mode flips
  container._epParticles = {
    restart(){ spawn(); }
  };
}

// --- Global outward emitter ---
let EP_GLOBAL_EMITTER = null;

function stopGlobalEmitter(){
  if (EP_GLOBAL_EMITTER) {
    try { EP_GLOBAL_EMITTER.stop(); } catch {}
    EP_GLOBAL_EMITTER = null;
  }
}

function startGlobalEmitter(panelEl){
  stopGlobalEmitter();

  const canvas = document.createElement('canvas');
  canvas.id = 'ep-global-sparks';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '2147483646'
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W=0, H=0, raf=0, running=true;

  function resizeWindow(){
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W*DPR); canvas.height = Math.floor(H*DPR);
    canvas.style.width = W+'px'; canvas.style.height = H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resizeWindow, { passive:true });
  resizeWindow();

  // live rect (we update this every frame so it follows drags)
  let panelRect = panelEl.getBoundingClientRect();
  const ro = new ResizeObserver(()=>{ panelRect = panelEl.getBoundingClientRect(); });
  ro.observe(panelEl);

  // theme-aware color + extra transparency on Glass
  const IS_GLASS = document.body.classList.contains('theme-glass');
  const ALPHA_SCALE = IS_GLASS ? 0.65 : 1.0;

  function accentRGB(){
    const acc = (getComputedStyle(panelEl).getPropertyValue('--ep-accent') || '').trim();
    const m = acc.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return [150,170,210];
    const h = m[1].length===3 ? m[1].split('').map(c=>c+c).join('') : m[1];
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  const [R,G,B] = accentRGB();

  const pool = [];
  const MAX   = 360;
  const EMIT  = 10;
  const BASE  = 1.0;
  const SPREAD= Math.PI * 0.55;
  const rand  = (a,b)=> a + Math.random()*(b-a);

  function edgeSpawn(){
    if (!panelRect.width || !panelRect.height) return null;
    const side = Math.floor(Math.random()*4);
    const t = Math.random();
    let x,y,nx,ny;
    if (side===0){ x=panelRect.left + t*panelRect.width;  y=panelRect.top;            nx=0; ny=-1; }
    else if (side===1){ x=panelRect.right;                 y=panelRect.top + t*panelRect.height; nx=1; ny=0; }
    else if (side===2){ x=panelRect.left + t*panelRect.width;  y=panelRect.bottom;         nx=0; ny=1; }
    else { x=panelRect.left;                   y=panelRect.top + t*panelRect.height; nx=-1; ny=0; }
    const ang = Math.atan2(ny,nx) + rand(-SPREAD/2, SPREAD/2);
    return { x, y, nx: Math.cos(ang), ny: Math.sin(ang) };
  }

  function emit(){
    for (let i=0;i<EMIT;i++){
      const s = edgeSpawn(); if (!s) break;
      const tint = Math.random() < 0.45 ? (0.25 + Math.random()*0.35) : 1.0;
      const r = Math.round(Math.max(0, Math.min(255, R*tint)));
      const g = Math.round(Math.max(0, Math.min(255, G*tint)));
      const b = Math.round(Math.max(0, Math.min(255, B*tint)));

pool.push({
  x: s.x, y: s.y,
  vx: s.nx * (BASE + Math.random() * 1.8),
  vy: s.ny * (BASE + Math.random() * 1.8),
  r0: 2 + Math.random() * 6,
  r1: 3 + Math.random() * 10,
  shape: Math.floor(Math.random() * 3), // 0 circle, 1 square, 2 diamond
  born: performance.now(),
  life: 2600 + Math.random() * 3000,    // longer life => further travel
  color: `rgba(${r},${g},${b},`,
  fadeStart: 0.55,  // start fading at 55% of life
  fadeEnd: 1.0      // fully gone by 100% of life
      });
      if (pool.length > MAX) pool.shift();
    }
  }

function draw(p, t) {
  // fade from fadeStart → fadeEnd (0..1 life)
  const span = Math.max(0.0001, p.fadeEnd - p.fadeStart);
  let f = 1;
  if (t >= p.fadeEnd) f = 0;
  else if (t > p.fadeStart) {
    const u = (t - p.fadeStart) / span;  // 0..1
    f = 1 - u;                           // linear fade
    f = f * f;                           // ease-out
  }
  f *= ALPHA_SCALE;

  // nothing to draw if fully faded
  if (f <= 0.0001) return;

  const rr = p.r0 + (p.r1 - p.r0) * Math.sqrt(t);

  // draw with a *global* alpha so everything truly fades out
  ctx.save();
  ctx.globalAlpha = f;

  // halo (fixed per-stop alphas; globalAlpha handles fade)
  const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 3.8);
  halo.addColorStop(0, p.color + 0.55 + ')');
  halo.addColorStop(1, p.color + 0.00 + ')');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();

  // core (fixed alpha; globalAlpha handles fade)
  ctx.fillStyle = p.color + 0.95 + ')';
  if (p.shape === 0) {
    ctx.beginPath(); ctx.arc(p.x, p.y, rr * 0.6, 0, Math.PI * 2); ctx.fill();
  } else if (p.shape === 1) {
    const s = rr * 1.0; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  } else {
    const s = rr * 0.95;
    ctx.beginPath();
    ctx.moveTo(p.x,     p.y - s);
    ctx.lineTo(p.x + s, p.y);
    ctx.lineTo(p.x,     p.y + s);
    ctx.lineTo(p.x - s, p.y);
    ctx.closePath(); ctx.fill();
  }

  ctx.restore();
}



  function step(){
    if (!running) return;

    // update rect every frame so it follows drags
    panelRect = panelEl.getBoundingClientRect();

    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = 'screen';

    emit();

    const now = performance.now();
    for (let i = pool.length-1; i >= 0; i--){
      const p = pool[i];
      const t = (now - p.born) / p.life;
      if (t >= 1){ pool.splice(i,1); continue; }
      p.x += p.vx; p.y += p.vy;
      draw(p, t);
    }

    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);

  EP_GLOBAL_EMITTER = {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resizeWindow);
      try { ro.disconnect(); } catch {}
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };
}
// ------------------ Rare Particle Events ------------------
(function rareParticleEngine() {
  const EVENTS = [
    function goldMeteor() {
      if (!window.EP_GLOBAL_EMITTER) return;
      EP_GLOBAL_EMITTER.burst({ count: 200, color: "#ffd700", speed: 5 });
      flashStatus("✨ GOLDEN SKY EVENT", "secret", 1500);
    },
    function neonBurst() {
      if (!window.EP_GLOBAL_EMITTER) return;
      EP_GLOBAL_EMITTER.burst({ count: 120, color: "#ff00ff", speed: 4 });
      flashStatus("⚡ NEON BURST", "secret", 1200);
    },
    function ghostDrift() {
      if (!window.EP_GLOBAL_EMITTER) return;
      EP_GLOBAL_EMITTER.burst({ count: 80, color: "rgba(255,255,255,0.6)", driftUp: true });
      flashStatus("👻 Ghost Drift", "secret", 1400);
    }
  ];

  setInterval(() => {
    if (!STATE.settings.flashyMode && !STATE.settings.epicFlashyMode) return;
    if (Math.random() < 0.00035) EVENTS[Math.floor(Math.random() * EVENTS.length)]();
  }, 60000);
})();

// ------------------ DevTools Hook ------------------
if (typeof unsafeWindow !== "undefined") {
    unsafeWindow.EP_DEBUG = {
        STATE,
        ensureAssistUI,
        rebuildThemeOptions,
        startGlobalEmitter,
        initParticles,
        flashStatus,
        setStatus
    };
}

// ------------------ Init ------------------
if (!Store.get("EP_VOID_STAY", false)) {
    ensureAssistUI();
}


function initFlashiness() {
  const epic = !!STATE.settings.epicFlashyMode;
  const flashy = epic ? false : !!STATE.settings.flashyMode;
  setFlashy(flashy);
  setEpicFlashy(epic);
}
initFlashiness();

// make sure particles restart with correct flashy/epic mode
const wrap2 = document.querySelector('#ep-assist-wrap');
if (wrap2 && wrap2._epParticles) wrap2._epParticles.restart();

    // =====================
// END OF SCRIPT EXPORTS
// =====================
if (typeof unsafeWindow !== "undefined") {
    unsafeWindow.EP_DEBUG = {
        STATE,
        ensureAssistUI,
        rebuildThemeOptions,
        startGlobalEmitter,
        initParticles,
        flashStatus,
        setStatus,
        runCommand
    };
}
})();