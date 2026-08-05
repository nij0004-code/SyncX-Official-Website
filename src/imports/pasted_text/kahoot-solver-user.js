// ==UserScript==
// @name         Kahoot ⚡ AutoSolver - 👁️ Answer Viewer - 🥷 Stealth Bot - 🚀 Auto-Join (2026)
// @version      1.0.3
// @description  Automatic answer solver for Kahoot with quiz/slider/jumble/open-ended support, answer highlighting, stealth mode, auto-join.
// @description:it  Risolutore automatico per Kahoot con supporto quiz/slider/jumble/domande aperte, evidenziazione risposte, modalità stealth, auto-join.
// @description:es  Solucionador automático para Kahoot con soporte para quiz/slider/jumble/preguntas abiertas, resaltado de respuestas, modo sigiloso, auto-unión.
// @description:fr  Solveur automatique pour Kahoot avec support quiz/slider/jumble/questions ouvertes, surbrillance des réponses, mode furtif, auto-join.
// @description:de  Automatischer Löser für Kahoot mit Quiz/Slider/Jumble/offene Fragen, Antworthervorhebung, Stealth-Modus, Auto-Join.
// @description:pt  Solucionador automático para Kahoot com suporte a quiz/slider/jumble/perguntas abertas, destaque de respostas, modo furtivo, auto-join.
// @description:ja  Kahoot自動解答ツール。クイズ/スライダー/並べ替え/自由記述対応、回答ハイライト、ステルスモード、自動参加。
// @description:ko  Kahoot 자동 풀이기. 퀴즈/슬라이더/정렬/주관식 지원, 정답 하이라이트, 스텔스 모드, 자동 참가.
// @description:zh  Kahoot自动答题器，支持选择题/滑块/排序/开放式问题，答案高亮，隐身模式，自动加入。
// @description:ru  Автоматический решатель для Kahoot: викторины, слайдеры, сортировка, открытые вопросы, подсветка ответов, стелс-режим, авто-вход.
// @description:ar  حلّال تلقائي لـ Kahoot يدعم الاختبارات والمنزلقات والترتيب والأسئلة المفتوحة مع إبراز الإجابات ووضع التخفي والانضمام التلقائي.
// @author       SyncX
// @match        *://kahoot.it/*
// @match        *://play.kahoot.it/*
// @icon         https://raw.githubusercontent.com/JORKLAN/kahoot-cheat/main/assets/fluxus.png
// @license MIT
// @grant        none
// @run-at       document-start
// @namespace http://tampermonkey.net/
// ==/UserScript==
 
(function () {
    'use strict';
 
    const CONFIG = {
        defaultNickname: 'Player_' + Math.random().toString(36).slice(2, 6),
        baseDelay: 100,
        stealthMinDelay: 800,
        stealthMaxDelay: 2500,
        retryAttempts: 4,
        retryDelay: 800,
        fetchTimeout: 8000,
        domObserverDebounce: 80,
        answerClickRetries: 5,
        answerClickRetryDelay: 300,
    };
 
    const state = {
        autoJoin: true,
        autoAnswer: false,
        speedMode: true,
        stealthMode: false,
        answerViewer: true,
        showStatus: true,
        quizInfo: true,
        debugLog: false,
        scanPin: true,
        nickname: CONFIG.defaultNickname,
        quizId: null,
        connected: false,
        currentQuestion: -1,
        answeredQuestions: new Set(),
        pendingAnswers: new Set(),
        stats: { correct: 0, total: 0, streak: 0 },
        wsInstances: [],
        quizData: null,
        panel: null,
    };
 
    const sleep = ms => new Promise(r => setTimeout(r, ms));
 
    function getDelay() {
        if (state.stealthMode) {
            const b = CONFIG.stealthMinDelay;
            const r = CONFIG.stealthMaxDelay - CONFIG.stealthMinDelay;
            return b + Math.floor(Math.random() * r * (0.4 + Math.random() * 0.6));
        }
        return state.speedMode ? CONFIG.baseDelay : CONFIG.baseDelay * 3;
    }
 
    const debugBuffer = [];
    function log(msg, level = 'info') {
        const ts = new Date().toLocaleTimeString();
        debugBuffer.push(`[${ts}] ${msg}`);
        if (debugBuffer.length > 500) debugBuffer.splice(0, 100);
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log']('[KahootHelper]', msg);
        updatePanelStatus(msg);
        if (state.debugLog) updateDebugPanel();
    }
 
    function setReactInput(el, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        const setter = el.tagName === 'TEXTAREA' ? nativeTextareaValueSetter : nativeInputValueSetter;
        if (setter) setter.call(el, value);
        else el.value = value;
 
        const tracker = el._valueTracker;
        if (tracker) tracker.setValue(value + ' ');
 
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        try { el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' })); } catch (_) {}
    }
 
    function findEl(sels, ctx = document) {
        for (const s of sels) { try { const e = ctx.querySelector(s); if (e) return e; } catch (_) {} }
        return null;
    }
 
    function findAllEls(sels, ctx = document) {
        for (const s of sels) { try { const e = ctx.querySelectorAll(s); if (e.length) return Array.from(e); } catch (_) {} }
        return [];
    }
 
    function waitForEl(sels, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const check = () => findEl(sels);
            const e = check();
            if (e) return resolve(e);
            const t = setTimeout(() => { obs.disconnect(); reject(new Error('waitForEl timeout')); }, timeout);
            const obs = new MutationObserver(() => {
                const e = check();
                if (e) { obs.disconnect(); clearTimeout(t); resolve(e); }
            });
            obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
        });
    }
 
    function fetchWithTimeout(url, opts = {}, ms = CONFIG.fetchTimeout) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
    }
 
    async function retry(fn, attempts = CONFIG.retryAttempts, delay = CONFIG.retryDelay) {
        for (let i = 0; i < attempts; i++) {
            try { return await fn(); } catch (e) {
                if (i === attempts - 1) throw e;
                log(`Retry ${i + 1}/${attempts}\u2026 (${e.message})`);
                await sleep(delay * (1 + i * 0.5));
            }
        }
    }
 
    function debounce(fn, ms) {
        let tid;
        return function (...args) { clearTimeout(tid); tid = setTimeout(() => fn.apply(this, args), ms); };
    }
 
    const STORAGE_KEY = 'fluxus-v6b';
    function saveState() {
        try {
            const toSave = {
                nickname: state.nickname,
                lastQuizId: state.quizId,
                toggles: Object.fromEntries(MODS_LIST.map(id => [id, state[id]])),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (_) {}
    }
    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed?.toggles) parsed.toggles.autoAnswer = false;
            return parsed;
        } catch (_) { return null; }
    }
    const MODS_LIST = ['autoAnswer','autoJoin','speedMode','stealthMode','answerViewer','showStatus','quizInfo','debugLog','scanPin'];
 
    function normalize(text) {
        if (!text) return '';
        return String(text)
            .replace(/<[^>]*>/g, '')
            .replace(/&[a-z]+;/gi, ' ')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
 
    function levenshtein(a, b) {
        const m = a.length, n = b.length;
        if (m === 0) return n;
        if (n === 0) return m;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
        }
        return dp[m][n];
    }
 
    function similarity(a, b) {
        const na = normalize(a), nb = normalize(b);
        if (!na || !nb) return 0;
        if (na === nb) return 1;
 
        if (na.includes(nb) || nb.includes(na)) return 0.92;
 
        const maxLen = Math.max(na.length, nb.length);
        const levRatio = maxLen === 0 ? 0 : 1 - levenshtein(na, nb) / maxLen;
 
        const ta = new Set(na.split(' ').filter(t => t.length > 0));
        const tb = new Set(nb.split(' ').filter(t => t.length > 0));
        const intersection = [...ta].filter(t => tb.has(t)).length;
        const union = new Set([...ta, ...tb]).size;
        const jaccard = union === 0 ? 0 : intersection / union;
 
        const shortText = Math.min(na.length, nb.length) < 20;
        if (shortText) {
            return levRatio * 0.7 + jaccard * 0.3;
        }
        return levRatio * 0.5 + jaccard * 0.5;
    }
 
    function extractUUID(str) {
        const m = String(str).match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        return m ? m[1] : null;
    }
 
    function extractFullChallengeId(str) {
        const s = String(str);
        const qp = s.match(/[?&]challenge-id=([^&\s]+)/i);
        if (qp) return decodeURIComponent(qp[1]);
        const m = s.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:_\d+)?)/i);
        return m ? m[1] : null;
    }
 
    function extractChallengePin(str) {
        const m = String(str).match(/\/(?:challenge|solo)\/(\d{6,12})/i);
        return m ? m[1] : null;
    }
 
    function isChallengeUrl(str) {
        return /\/(?:challenge|solo)\//i.test(String(str)) || /challenge-id=/i.test(String(str));
    }
 
    function triggerReactClick(btn) {
        if (!btn) return false;
 
        const fiberKey = Object.keys(btn).find(k =>
            k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
        );
        const propsKey = Object.keys(btn).find(k => k.startsWith('__reactProps'));
 
        if (propsKey && typeof btn[propsKey]?.onClick === 'function') {
            try {
                const native = new MouseEvent('click', { bubbles: true, cancelable: true });
                const trusted = new Proxy(native, {
                    get(target, prop) {
                        if (prop === 'isTrusted') return true;
                        if (prop === 'nativeEvent') return native;
                        if (prop === 'currentTarget') return btn;
                        if (prop === 'target') return btn;
                        const val = target[prop];
                        return typeof val === 'function' ? val.bind(target) : val;
                    }
                });
                btn[propsKey].onClick(trusted);
                return true;
            } catch (e) { /* continue to fiber walk */ }
        }
 
        if (fiberKey) {
            let fiber = btn[fiberKey];
            let depth = 0;
            while (fiber && depth < 30) {
                const onClick = fiber.memoizedProps?.onClick || fiber.pendingProps?.onClick;
                if (typeof onClick === 'function') {
                    try {
                        const native = new MouseEvent('click', { bubbles: true, cancelable: true });
                        const trusted = new Proxy(native, {
                            get(target, prop) {
                                if (prop === 'isTrusted') return true;
                                if (prop === 'nativeEvent') return native;
                                if (prop === 'currentTarget') return btn;
                                if (prop === 'target') return btn;
                                const val = target[prop];
                                return typeof val === 'function' ? val.bind(target) : val;
                            }
                        });
                        onClick(trusted);
                        return true;
                    } catch (e) {
                        try {
                            onClick(new MouseEvent('click', { bubbles: true, cancelable: true }));
                            return true;
                        } catch (_) {}
                    }
                }
                fiber = fiber.return;
                depth++;
            }
        }
 
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const evOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 };
        btn.dispatchEvent(new PointerEvent('pointerdown', { ...evOpts, pointerId: 1 }));
        btn.dispatchEvent(new MouseEvent('mousedown', evOpts));
        btn.dispatchEvent(new PointerEvent('pointerup', { ...evOpts, pointerId: 1 }));
        btn.dispatchEvent(new MouseEvent('mouseup', evOpts));
        btn.dispatchEvent(new MouseEvent('click', evOpts));
 
        btn.click();
        return true;
    }
 
    function simulateSliderDrag(slider, targetValue) {
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const step = parseFloat(slider.step) || 1;
        targetValue = Math.max(min, Math.min(max, Math.round(targetValue / step) * step));
 
        const rect = slider.getBoundingClientRect();
        const fraction = (targetValue - min) / (max - min);
        const targetX = rect.left + fraction * rect.width;
        const centerY = rect.top + rect.height / 2;
        slider.focus();
 
        const eventInit = { bubbles: true, cancelable: true, view: window,
            clientX: targetX, clientY: centerY, button: 0, buttons: 1 };
 
        slider.dispatchEvent(new PointerEvent('pointerdown', { ...eventInit, pointerId: 1, pointerType: 'mouse' }));
        slider.dispatchEvent(new MouseEvent('mousedown', eventInit));
        slider.dispatchEvent(new PointerEvent('pointermove', { ...eventInit, pointerId: 1, pointerType: 'mouse' }));
        slider.dispatchEvent(new MouseEvent('mousemove', eventInit));
 
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(slider, String(targetValue));
        else slider.value = targetValue;
        const tracker = slider._valueTracker;
        if (tracker) tracker.setValue(String(targetValue - 1));
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
 
        slider.dispatchEvent(new PointerEvent('pointerup', { ...eventInit, pointerId: 1, pointerType: 'mouse' }));
        slider.dispatchEvent(new MouseEvent('mouseup', eventInit));
        return targetValue;
    }
 
    async function simulateDrag(fromEl, toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;
        const toX = toRect.left + toRect.width / 2;
        const toY = toRect.top + toRect.height / 2;
 
        const dt = new DataTransfer();
 
        fromEl.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, cancelable: true, clientX: fromX, clientY: fromY, pointerId: 1
        }));
        await sleep(50);
 
        const steps = 4;
        for (let i = 1; i <= steps; i++) {
            const x = fromX + (toX - fromX) * (i / steps);
            const y = fromY + (toY - fromY) * (i / steps);
            document.elementFromPoint(x, y)?.dispatchEvent(new PointerEvent('pointermove', {
                bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1
            }));
            await sleep(20);
        }
 
        toEl.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, cancelable: true, clientX: toX, clientY: toY, pointerId: 1
        }));
 
        fromEl.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: fromX, clientY: fromY }));
        toEl.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: toX, clientY: toY }));
        toEl.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: toX, clientY: toY }));
        toEl.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: toX, clientY: toY }));
        fromEl.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
 
        try {
            fromEl.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true,
                touches: [new Touch({ identifier: 1, target: fromEl, clientX: fromX, clientY: fromY })] }));
            toEl.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true,
                touches: [new Touch({ identifier: 1, target: toEl, clientX: toX, clientY: toY })] }));
            toEl.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [] }));
        } catch (_) { /* Touch API may not be available */ }
    }
 
    function findPinInPage() {
        const text = document.body ? document.body.innerText : '';
        const explicit = text.match(/(?:game\s*pin|pin\s*code|join\s*code|pin)\s*[:\-]?\s*(\d{6,9})/i);
        if (explicit) return explicit[1];
        const urlPin = new URLSearchParams(window.location.search).get('pin')
            || new URLSearchParams(window.location.search).get('gameId');
        if (urlPin && /^\d{6,9}$/.test(urlPin)) return urlPin;
        const hashMatch = window.location.hash.match(/(\d{6,9})/);
        if (hashMatch) return hashMatch[1];
        if (state.scanPin) {
            const headings = document.querySelectorAll('h1,h2,h3,[class*="pin"],[class*="code"],[class*="game-id"]');
            for (const h of headings) {
                const m = h.textContent.match(/\b(\d{6,9})\b/);
                if (m) return m[1];
            }
            const standalone = text.match(/\b(\d{7,9})\b/);
            if (standalone) return standalone[1];
        }
        return null;
    }
 
    const SVG_ICONS = {
        autoAnswer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
        autoJoin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
        scanPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        speedMode: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10"/><polyline points="12 6 12 12 16 14"/><path d="M20 4l-2 6h6"/></svg>`,
        stealthMode: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v2c0 1.1.3 2.2.8 3.1L3 22h18l-1.8-6.9c.5-.9.8-2 .8-3.1v-2a8 8 0 0 0-8-8z"/></svg>`,
        answerViewer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        showStatus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>`,
        quizInfo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="9" y1="18" x2="12" y2="18"/></svg>`,
        debugLog: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0 1 12 0v3c0 3.3-2.7 6-6 6z"/><path d="M6 13H2M22 13h-4M6 17H4M20 17h-2M12 20v2"/></svg>`,
        search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1.08H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z"/></svg>`,
    };
 
    const ANSWER_BTN_SELECTORS = [
        'button[data-functional-selector="answer-INDEX"]',
        '[data-functional-selector="answer-INDEX"]',
        'button[data-choice="INDEX"]',
        '[data-testid="answer-INDEX"]',
    ];
 
    const ANSWER_GROUP_SELECTORS = [
        'button[data-functional-selector^="answer-"]',
        '[data-functional-selector^="answer-"]',
        '[class*="answer"] button',
        '[class*="choice"] button',
        '[class*="Answer"] button',
        '[data-testid^="answer-"]',
        '[class*="answer"] [role="button"]',
        '[class*="choice"] [role="button"]',
        '[class*="Answer"] [role="button"]',
        '[class*="answer"] div[class*="block"]',
        '[class*="quiz-board"] button',
        '[class*="QuizBoard"] button',
    ];
 
    const SUBMIT_SELECTORS = [
        'button[data-functional-selector="submit-answer"]',
        'button[data-functional-selector="submit-button"]',
        'button[data-functional-selector="multi-select-submit-button"]',
        'button[type="submit"]',
        'button[class*="submit"]',
        'button[class*="Submit"]',
    ];
 
    const TEXT_INPUT_SELECTORS = [
        'input[data-functional-selector="text-answer-input"]',
        'textarea[data-functional-selector="text-answer-input"]',
        'input[type="text"][class*="answer"]',
        'textarea[class*="answer"]',
        'input[placeholder*="answer"]',
        'input[placeholder*="Answer"]',
        'input[placeholder*="risposta"]',
        'input[placeholder*="Risposta"]',
        'input[placeholder*="respuesta"]',
        'input[placeholder*="réponse"]',
        'input[placeholder*="Antwort"]',
        'input[placeholder*="type"]',
        'input[placeholder*="Type"]',
        'input[placeholder*="Scrivi"]',
        'textarea[placeholder*="answer"]',
        'textarea[placeholder*="risposta"]',
        'textarea[placeholder*="Scrivi"]',
        '[class*="question"] input[type="text"]',
        '[class*="question"] textarea',
        '[class*="Question"] input[type="text"]',
        '[class*="Question"] textarea',
        'main input[type="text"]',
        'main textarea',
    ];
 
    const QUESTION_INDEX_SELECTORS = [
        '[data-functional-selector="question-index-counter"]',
        '[data-functional-selector="question-index"]',
        '[class*="question-index"]',
        '[class*="QuestionIndex"]',
        '[data-testid*="question-number"]',
        '[data-testid*="question-index"]',
        '[class*="progress-counter"]',
        '[class*="ProgressCounter"]',
        '[class*="question-count"]',
        '[class*="QuestionCount"]',
        '[class*="challenge-progress"]',
        '[data-functional-selector*="progress"]',
    ];
 
    const JUMBLE_ITEM_SELECTORS = [
        'button[data-functional-selector^="jumble-answer-"]',
        '[data-functional-selector^="jumble-answer-"]',
        '[data-functional-selector^="jumble-"] button',
        '[data-functional-selector^="jumble-"]',
        '[class*="jumble"] button',
        '[class*="jumble"] div',
        '[class*="Jumble"] button',
        '[class*="Jumble"] div',
        '[class*="order"] button',
        '[class*="order"] div[draggable]',
        '[class*="Order"] button',
        '[class*="sortable"] button',
        '[class*="sortable"] div',
        '[data-testid^="jumble-"]',
        '[draggable="true"]',
    ];
 
    const SLIDER_SELECTORS = [
        'input[data-functional-selector="slider-scale"]',
        'input[type="range"]',
        'input[type="range"][data-functional-selector*="slider"]',
        '[data-functional-selector*="slider"] input[type="range"]',
        '[class*="slider"] input[type="range"]',
        '[class*="Slider"] input[type="range"]',
        '[class*="range"] input[type="range"]',
        '[role="slider"]',
        '[aria-valuenow]',
        '[data-functional-selector*="slider"]',
        '[class*="slider-container" i]',
        '[class*="SliderContainer"]',
        '[class*="slider-track" i]',
        '[class*="SliderTrack"]',
        '[class*="number-slider" i]',
        '[class*="NumberSlider"]',
        '[class*="slider__" i]',
        '[class*="nano-slider"]',
        '[class*="ScaleContainer"]',
    ];
 
    const _triedUUIDs = new Set();
 
    async function loadQuizDataOnce(uuid) {
        if (_triedUUIDs.has(uuid)) return false;
        _triedUUIDs.add(uuid);
        const urls = [
            `https://kahoot.it/rest/kahoots/${uuid}`,
            `https://play.kahoot.it/rest/kahoots/${uuid}`,
        ];
        for (const url of urls) {
            try {
                const r = await fetchWithTimeout(url, {}, 4000);
                if (r.ok) {
                    const d = await r.json();
                    const json = d.questions ? d : (d.kahoot?.questions ? d.kahoot : null);
                    if (json?.questions) {
                        AnswerEngine.quizData = { quizId: uuid, title: json.title || '?', questions: json.questions };
                        state.quizId = uuid;
                        state.connected = true;
                        log(`Quiz loaded: "${json.title}" (${json.questions.length} Qs)`);
                        updatePanelQuizInfo(json.questions.length);
                        saveState();
                        return true;
                    }
                }
            } catch (_) {}
        }
        return false;
    }
 
    const AnswerEngine = {
        quizData: null,
 
        async loadQuizData(quizId) {
            if (!quizId || typeof quizId !== 'string') return false;
            if (this.quizData?.quizId === quizId) return true;
 
            return retry(async () => {
                let json = null;
                let lastError = '';
                const urls = [
                    `https://kahoot.it/rest/kahoots/${quizId}`,
                    `https://play.kahoot.it/rest/kahoots/${quizId}`,
                    `https://create.kahoot.it/rest/kahoots/${quizId}`,
                    `https://kahoot.it/rest/kahoots/${quizId}/card/?includeKahoot=true`,
                ];
                for (const url of urls) {
                    try {
                        const r = await fetchWithTimeout(url);
                        if (r.ok) {
                            const d = await r.json();
                            json = d.questions ? d : (d.kahoot?.questions ? d.kahoot : null);
                            if (json?.questions) break;
                        } else {
                            lastError = `HTTP ${r.status}`;
                        }
                    } catch (e) { lastError = e.message; }
                }
                if (!json?.questions) {
                    throw new Error(lastError || 'No quiz data (private quiz?)');
                }
 
                this.quizData = {
                    quizId,
                    title: json.title || '?',
                    questions: json.questions
                };
                state.quizId = quizId;
                log(`Quiz "${this.quizData.title}" \u2014 ${json.questions.length} Qs`);
                updatePanelQuizInfo(json.questions.length);
                saveState();
                return true;
            });
        },
 
        async loadChallengeData(challengeIdOrPin, fallbackPin) {
            if (!challengeIdOrPin && !fallbackPin) return false;
 
            return retry(async () => {
                let lastError = '';
                const idsToTry = [];
                if (challengeIdOrPin) idsToTry.push(challengeIdOrPin);
                if (challengeIdOrPin && challengeIdOrPin.includes('_')) {
                    idsToTry.push(challengeIdOrPin.split('_')[0]);
                }
                if (fallbackPin && fallbackPin !== challengeIdOrPin) {
                    idsToTry.push(fallbackPin);
                }
 
                const bases = ['https://kahoot.it', 'https://play.kahoot.it'];
                const pathTemplates = [
                    '/rest/challenges/{id}',
                    '/rest/challenges/{id}/',
                    '/rest/challenges/pin/{id}',
                    '/rest/challenges/pin/{id}/',
                ];
 
                for (const id of idsToTry) {
                    for (const base of bases) {
                        for (const tpl of pathTemplates) {
                            const url = base + tpl.replace('{id}', id);
                            try {
                                const r = await fetchWithTimeout(url);
                                if (!r.ok) { lastError = `HTTP ${r.status}`; continue; }
                                const d = await r.json();
                                const kid = d.kahoot?.uuid || d.kahoot?.id || d.kahootId || d.quizId;
                                if (d.kahoot?.questions) {
                                    this.quizData = {
                                        quizId: kid || id,
                                        title: d.kahoot.title || '?',
                                        questions: d.kahoot.questions,
                                    };
                                    state.quizId = kid || id;
                                    log(`Challenge "${this.quizData.title}" \u2014 ${d.kahoot.questions.length} Qs`);
                                    updatePanelQuizInfo(d.kahoot.questions.length);
                                    saveState();
                                    return true;
                                }
                                if (kid) {
                                    log(`Got kahootId ${kid} from challenge, fetching quiz\u2026`);
                                    return this.loadQuizData(kid);
                                }
                            } catch (e) { lastError = e.message; }
                        }
                    }
                }
                throw new Error(lastError || 'Challenge fetch failed on all endpoints');
            });
        },
 
        getCorrectIndices(qi) {
            if (!this.quizData) return [];
            const q = this.quizData.questions[qi];
            if (!q?.choices) return [];
            return q.choices.reduce((a, c, i) => { if (c.correct) a.push(i); return a; }, []);
        },
 
        matchQuestionByText() {
            if (!this.quizData) return null;
            const liveText = this._readLiveQuestionText();
            if (!liveText) return null;
            const liveHasBlanks = /_{2,}|\.{3,}/.test(liveText);
            const liveLen = normalize(liveText).length;
 
            let bestIdx = -1, bestScore = 0;
            for (let i = 0; i < this.quizData.questions.length; i++) {
                const q = this.quizData.questions[i];
                const qText = q.question || q.title || '';
                let score = similarity(liveText, qText);
 
                const qType = q.type || q.questionType || 'quiz';
                if (liveHasBlanks && (qType === 'true_false' || qType === 'quiz')) {
                    score *= 0.7;
                }
 
                const qLen = normalize(qText).length;
                if (liveLen > 0 && qLen > 0) {
                    const lenRatio = Math.min(liveLen, qLen) / Math.max(liveLen, qLen);
                    score = score * 0.8 + score * lenRatio * 0.2;
                }
 
                if (score > bestScore) { bestScore = score; bestIdx = i; }
            }
            if (bestScore >= 0.50) return bestIdx;
            return null;
        },
 
        _readLiveQuestionText() {
            const sels = [
                '[data-functional-selector="block-title"]',
                '[data-functional-selector="question-title"]',
                '[class*="question-title"]',
                '[class*="QuestionTitle"]',
                '[class*="question-text"]',
                '[class*="QuestionText"]',
                '[class*="media-text"] p',
                '[class*="MediaText"] p',
                '[class*="question"] p',
                '[class*="Question"] p',
                '[class*="title-text"]',
                '[class*="TitleText"]',
                '[class*="block-text"]',
                '[class*="BlockText"]',
                'h1', 'h2', 'h3',
            ];
            for (const sel of sels) {
                try {
                    const els = document.querySelectorAll(sel);
                    for (const el of els) {
                        const text = el.textContent?.trim();
                        if (text && text.length > 10 && text.length < 500) {
                            return text;
                        }
                    }
                } catch (_) {}
            }
 
            try {
                const candidates = document.querySelectorAll('p, div, span, h1, h2, h3, h4');
                for (const el of candidates) {
                    if (!el.offsetParent || el.offsetWidth < 200) continue;
                    if (el.children.length > 5) continue;
                    const text = el.textContent?.trim();
                    if (text && text.length > 15 && text.length < 500) {
                        if (text.includes('?') || text.includes('___') || text.includes('...')) {
                            return text;
                        }
                    }
                }
            } catch (_) {}
 
            return null;
        },
 
        _readLiveAnswerTexts() {
            const btns = this._getVisibleAnswerBtns();
            return btns.map(b => {
                return (b.getAttribute('aria-label') || b.textContent || '').trim();
            });
        },
 
        mapCorrectToDOMIndices(qi) {
            if (!this.quizData) return [];
            const q = this.quizData.questions[qi];
            if (!q?.choices) return [];
 
            const liveAnswers = this._readLiveAnswerTexts();
            if (!liveAnswers.length) return [];
 
            const result = [];
            const usedDomIndices = new Set();
 
            for (let ci = 0; ci < q.choices.length; ci++) {
                const choice = q.choices[ci];
                if (!choice.correct) continue;
                const choiceText = choice.answer || '';
 
                let bestDomIdx = -1, bestScore = 0;
                for (let di = 0; di < liveAnswers.length; di++) {
                    if (usedDomIndices.has(di)) continue;
                    const score = similarity(choiceText, liveAnswers[di]);
                    if (score > bestScore) { bestScore = score; bestDomIdx = di; }
                }
                const threshold = choiceText.length < 10 ? 0.4 : 0.45;
                if (bestScore >= threshold && bestDomIdx >= 0) {
                    result.push(bestDomIdx);
                    usedDomIndices.add(bestDomIdx);
                    log(`  answer "${choiceText.slice(0,20)}" → DOM[${bestDomIdx}] (score ${bestScore.toFixed(2)})`);
                } else {
                    if (ci < liveAnswers.length && !usedDomIndices.has(ci)) {
                        result.push(ci);
                        usedDomIndices.add(ci);
                        log(`  answer "${choiceText.slice(0,20)}" → fallback DOM[${ci}] (best was ${bestScore.toFixed(2)})`);
                    }
                }
            }
            return result;
        },
 
        getCorrectText(qi) {
            if (!this.quizData) return null;
            const q = this.quizData.questions[qi];
            if (!q?.choices) return null;
            const correct = q.choices.find(c => c.correct);
            return correct?.answer || null;
        },
 
        getCorrectTexts(qi) {
            if (!this.quizData) return [];
            const q = this.quizData.questions[qi];
            if (!q?.choices) return [];
            return q.choices.filter(c => c.correct).map(c => c.answer).filter(Boolean);
        },
 
        getQuestionType(qi) {
            if (!this.quizData) return 'unknown';
            const q = this.quizData.questions[qi];
            return q?.type || q?.questionType || 'quiz';
        },
 
        getJumbleOrder(qi) {
            if (!this.quizData) return [];
            const q = this.quizData.questions[qi];
            if (!q?.choices) return [];
            return q.choices.map(c => c.answer || '').filter(Boolean);
        },
 
        highlightCorrect(qi) {
            if (!state.answerViewer && !state.autoAnswer) return;
 
            document.querySelectorAll('.kb-highlight, .kb-order-badge, .kb-answer-overlay').forEach(e => {
                if (e.classList.contains('kb-order-badge') || e.classList.contains('kb-answer-overlay')) {
                    e.remove();
                } else {
                    e.style.outline = '';
                    e.style.outlineOffset = '';
                    e.style.boxShadow = '';
                    e.classList.remove('kb-highlight');
                }
            });
 
            if (!this.quizData) return;
            const q = this.quizData.questions[qi];
            if (!q) return;
            const qType = q.type || q.questionType || 'quiz';
 
            let answerText = '';
 
            if (['jumble', 'puzzle', 'ordering'].includes(qType)) {
                const order = this.getJumbleOrder(qi);
                if (order.length) {
                    answerText = order.map((t, i) => `${i + 1}. ${t}`).join('  →  ');
                }
            } else if (qType === 'slider') {
                let val = null;
                if (q.choices?.length) {
                    const c = q.choices.find(c => c.correct);
                    if (c?.answer != null) val = c.answer;
                }
                if (val == null && q.answer != null) val = q.answer;
                if (val == null && q.correctAnswer != null) val = q.correctAnswer;
                if (val == null && q.numberOfAnswers != null) val = q.numberOfAnswers;
                if (val == null && q.range?.correct != null) val = q.range.correct;
                if (val == null && q.range?.answer != null) val = q.range.answer;
                if (val == null && q.choices?.length === 1) val = q.choices[0].answer;
                if (val == null && q.choices?.length) {
                    for (const c of q.choices) {
                        if (c.answer != null) { val = c.answer; break; }
                    }
                }
                if (val != null) answerText = `→ ${val}`;
            } else if (['open_ended', 'word_cloud', 'brainstorm'].includes(qType)) {
                const texts = this.getCorrectTexts(qi);
                if (texts.length) answerText = `→ ${texts.join(' / ')}`;
            } else {
                const SHAPES = ['▲ Red', '◆ Blue', '● Orange', '■ Green'];
                if (q.choices?.length) {
                    const correctParts = [];
                    for (let i = 0; i < q.choices.length; i++) {
                        if (q.choices[i].correct) {
                            const shape = SHAPES[i] || `#${i+1}`;
                            const text = q.choices[i].answer || '';
                            correctParts.push(text ? `${shape} ${text}` : shape);
                        }
                    }
                    if (correctParts.length) answerText = `→ ${correctParts.join(' / ')}`;
                }
            }
 
            if (!answerText && q) {
                const fallbacks = [q.answer, q.correctAnswer, q.numberOfAnswers, q.range?.correct];
                for (const fb of fallbacks) {
                    if (fb != null) { answerText = `→ ${fb}`; break; }
                }
                if (!answerText && q.choices?.length) {
                    const correct = q.choices.filter(c => c.correct).map(c => c.answer).filter(Boolean);
                    if (correct.length) answerText = `→ ${correct.join(' / ')}`;
                    else if (q.choices.length === 1 && q.choices[0].answer) answerText = `→ ${q.choices[0].answer}`;
                }
            }
 
            if (answerText) {
                const overlay = document.createElement('div');
                overlay.className = 'kb-answer-overlay';
                overlay.style.cssText = `
                    position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 999999;
                    background: rgba(22, 163, 74, 0.95); color: #fff;
                    padding: 10px 28px; border-radius: 14px;
                    font-size: 17px; font-weight: 700; font-family: Inter, system-ui, sans-serif;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.4); pointer-events: none;
                    max-width: 90vw; text-align: center; line-height: 1.4;
                    animation: kb-fadeIn 0.3s ease;
                    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                    border: 1px solid rgba(255,255,255,0.15);
                `;
                overlay.textContent = answerText;
                document.body.appendChild(overlay);
            }
 
            if (['quiz', 'true_false', 'multiple_select_quiz', 'survey'].includes(qType) || (!['slider', 'jumble', 'puzzle', 'ordering', 'open_ended', 'word_cloud', 'brainstorm'].includes(qType) && q.choices)) {
                try {
                    const domIndices = this.mapCorrectToDOMIndices(qi);
                    const allBtns = this._getVisibleAnswerBtns();
                    for (const di of domIndices) {
                        const btn = allBtns[di];
                        if (btn) {
                            btn.style.outline = '4px solid #22c55e';
                            btn.style.outlineOffset = '-4px';
                            btn.style.boxShadow = '0 0 20px rgba(34,197,94,0.6), inset 0 0 12px rgba(34,197,94,0.15)';
                            btn.classList.add('kb-highlight');
                        }
                    }
                } catch (_) { /* DOM highlight is best-effort */ }
            }
        },
 
        _getVisibleAnswerBtns() {
            return findAllEls(ANSWER_GROUP_SELECTORS).filter(b =>
                b.offsetParent !== null && b.offsetWidth > 30 && b.offsetHeight > 20
            );
        },
 
        async _clickCorrectWithRetry(qi) {
            const qType = this.getQuestionType(qi);
            const isMultiSelect = qType === 'multiple_select_quiz';
            const STAGGER = 80;
 
            for (let attempt = 0; attempt < CONFIG.answerClickRetries; attempt++) {
                const domIndices = this.mapCorrectToDOMIndices(qi);
                if (!domIndices.length) {
                    if (attempt < CONFIG.answerClickRetries - 1) {
                        await sleep(CONFIG.answerClickRetryDelay);
                        continue;
                    }
                    return false;
                }
 
                const allBtns = this._getVisibleAnswerBtns();
                let clicked = 0;
 
                for (let i = 0; i < domIndices.length; i++) {
                    const di = domIndices[i];
                    const btn = allBtns[di];
                    if (btn) {
                        if (isMultiSelect && i > 0) await sleep(STAGGER);
                        triggerReactClick(btn);
                        clicked++;
                    }
                }
 
                if (isMultiSelect && clicked > 0) {
                    await sleep(STAGGER);
                    const submit = findEl(SUBMIT_SELECTORS);
                    if (submit) triggerReactClick(submit);
                }
 
                if (clicked > 0) return true;
 
                if (attempt < CONFIG.answerClickRetries - 1) {
                    log(`Click retry ${attempt + 1}/${CONFIG.answerClickRetries}\u2026`);
                    await sleep(CONFIG.answerClickRetryDelay);
                }
            }
            return false;
        },
 
        _clickBlind() {
            const btns = this._getVisibleAnswerBtns();
            if (btns.length >= 2) {
                const pick = btns[Math.floor(Math.random() * btns.length)];
                triggerReactClick(pick);
                log('Blind answer (random)');
                return true;
            }
            return false;
        },
 
        async _handleOpenEnded(qi) {
            const texts = this.getCorrectTexts(qi);
            const text = texts[0];
            if (!text) {
                log('Open-ended: no correct text in quizData');
                return false;
            }
 
            let input = null;
            for (let i = 0; i < 3; i++) {
                input = findEl(TEXT_INPUT_SELECTORS);
                if (input && input.offsetParent !== null) break;
                input = null;
                await sleep(400);
            }
            if (!input) {
                log('Open-ended: no input element found');
                return false;
            }
 
            log(`Open-ended: typing "${text}" into <${input.tagName.toLowerCase()}>`);
            input.focus();
            await sleep(50);
 
            setReactInput(input, text);
            await sleep(200);
 
            if (input.value !== text) {
                log('Open-ended: value didn\'t stick, retrying with direct assignment');
                input.value = text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                await sleep(150);
            }
 
            const sub = findEl(SUBMIT_SELECTORS);
            if (sub) {
                await sleep(100);
                triggerReactClick(sub);
                log('Open-ended: submitted');
            } else {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                log('Open-ended: no submit button, sent Enter key');
            }
 
            return true;
        },
 
        async _handleSlider(qi) {
            const q = this.quizData?.questions[qi];
            if (!q) return false;
 
            let targetValue = null;
            if (q.choices?.length) {
                const correct = q.choices.find(c => c.correct);
                if (correct?.answer != null) targetValue = parseFloat(correct.answer);
            }
            if (targetValue == null && q.answer != null) targetValue = parseFloat(q.answer);
            if (targetValue == null && q.numberOfAnswers != null) targetValue = parseFloat(q.numberOfAnswers);
 
            if (targetValue == null || isNaN(targetValue)) {
                log('Slider: no correct value found in quizData');
                return false;
            }
 
            log(`Slider: target value = ${targetValue}`);
            await sleep(300);
 
            let rangeInput = findEl(SLIDER_SELECTORS);
            if (rangeInput) {
                log('Slider: found <input type="range">, using native approach');
                simulateSliderDrag(rangeInput, targetValue);
                await sleep(200);
                const sub = findEl(SUBMIT_SELECTORS);
                if (sub) triggerReactClick(sub);
                return true;
            }
 
            const sliderSelectors = [
                '[class*="slider" i]',
                '[class*="Slider"]',
                '[class*="range" i]',
                '[class*="Range"]',
                '[data-functional-selector*="slider"]',
                '[class*="track" i]',
                '[class*="Track"]',
                '[role="slider"]',
                '[aria-valuenow]',
            ];
 
            let sliderEl = null;
            for (const sel of sliderSelectors) {
                try {
                    const candidates = document.querySelectorAll(sel);
                    for (const c of candidates) {
                        if (c.offsetParent && c.offsetWidth > 100 && c.offsetHeight > 5) {
                            sliderEl = c;
                            break;
                        }
                    }
                    if (sliderEl) break;
                } catch (_) {}
            }
 
            if (!sliderEl) {
                const allEls = document.querySelectorAll('[class*="question"] *, [class*="Question"] *, [class*="challenge"] *, main *');
                let bestWidth = 0;
                for (const el of allEls) {
                    const w = el.offsetWidth;
                    const h = el.offsetHeight;
                    if (w > 200 && h >= 10 && h < 100 && el.offsetParent && w > bestWidth) {
                        const textLen = (el.textContent || '').trim().length;
                        if (textLen < 5) {
                            bestWidth = w;
                            sliderEl = el;
                        }
                    }
                }
            }
 
            if (sliderEl) {
                log(`Slider: found custom slider element <${sliderEl.tagName}> (${sliderEl.offsetWidth}x${sliderEl.offsetHeight})`);
 
                let min = parseFloat(sliderEl.getAttribute('aria-valuemin') || '0');
                let max = parseFloat(sliderEl.getAttribute('aria-valuemax') || '100');
 
                const parentArea = sliderEl.closest('[class*="question"], [class*="Question"], [class*="challenge"], main') || document.body;
                const numberLabels = [];
                parentArea.querySelectorAll('*').forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && /^\d+$/.test(text) && el.children.length === 0 && el.offsetParent) {
                        numberLabels.push(parseInt(text));
                    }
                });
                if (numberLabels.length >= 2) {
                    const sorted = [...new Set(numberLabels)].sort((a, b) => a - b);
                    if (sorted.length > 2) {
                        min = sorted[0];
                        max = sorted[sorted.length - 1];
                        log(`Slider: detected range from labels: ${min}-${max}`);
                    }
                }
 
                const expandBtns = parentArea.querySelectorAll('button');
                for (const b of expandBtns) {
                    const t = b.textContent?.trim() || '';
                    const leftMatch = t.match(/[<‹]\s*(\d+)/);
                    const rightMatch = t.match(/(\d+)\s*[>›]/);
                    if (leftMatch) min = Math.min(min, parseInt(leftMatch[1]));
                    if (rightMatch) max = Math.max(max, parseInt(rightMatch[1]));
                }
 
                const rect = sliderEl.getBoundingClientRect();
                const fraction = Math.max(0, Math.min(1, (targetValue - min) / (max - min)));
                const clickX = rect.left + fraction * rect.width;
                const clickY = rect.top + rect.height / 2;
 
                log(`Slider: clicking at fraction=${fraction.toFixed(3)} (${targetValue} in range ${min}-${max})`);
 
                const evOpts = { bubbles: true, cancelable: true, view: window,
                    clientX: clickX, clientY: clickY, button: 0, buttons: 1 };
 
                sliderEl.dispatchEvent(new PointerEvent('pointerdown', { ...evOpts, pointerId: 1, pointerType: 'mouse' }));
                sliderEl.dispatchEvent(new MouseEvent('mousedown', evOpts));
                await sleep(30);
                sliderEl.dispatchEvent(new PointerEvent('pointermove', { ...evOpts, pointerId: 1, pointerType: 'mouse' }));
                sliderEl.dispatchEvent(new MouseEvent('mousemove', evOpts));
                await sleep(30);
                sliderEl.dispatchEvent(new PointerEvent('pointerup', { ...evOpts, pointerId: 1, pointerType: 'mouse' }));
                sliderEl.dispatchEvent(new MouseEvent('mouseup', evOpts));
                sliderEl.dispatchEvent(new MouseEvent('click', evOpts));
 
                let targetEl = sliderEl;
                for (let depth = 0; depth < 5; depth++) {
                    const fk = Object.keys(targetEl).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
                    if (fk) {
                        let fiber = targetEl[fk];
                        let fd = 0;
                        while (fiber && fd < 15) {
                            const props = fiber.memoizedProps || fiber.pendingProps || {};
                            const handler = props.onChange || props.onInput || props.onValueChange
                                || props.onSliderChange || props.onUpdate;
                            if (typeof handler === 'function') {
                                try {
                                    handler(targetValue);
                                    log(`Slider: called React handler at fiber depth ${fd}`);
                                    break;
                                } catch (_) {
                                    try { handler({ target: { value: targetValue } }); } catch (_) {}
                                }
                            }
                            fiber = fiber.return;
                            fd++;
                        }
                    }
                    if (!targetEl.parentElement) break;
                    targetEl = targetEl.parentElement;
                }
 
                await sleep(400);
 
                const sub = findEl(SUBMIT_SELECTORS);
                if (sub) {
                    triggerReactClick(sub);
                    log('Slider: submitted');
                }
                return true;
            }
 
            log('Slider: no slider element found at all');
            return false;
        },
 
        async _handleJumble(qi) {
            const correctOrder = this.getJumbleOrder(qi);
            if (!correctOrder.length) {
                log('Jumble: no correct order in quizData');
                return false;
            }
 
            log(`Jumble: correct order = [${correctOrder.map(t => t.slice(0, 15)).join(', ')}]`);
            await sleep(300);
 
            const itemSelectors = [
                ...JUMBLE_ITEM_SELECTORS,
                '[class*="jumble"] [class*="answer"]',
                '[class*="Jumble"] [class*="Answer"]',
                '[class*="sortable"] [class*="item"]',
                '[class*="draggable"]',
                '[draggable="true"]',
            ];
 
            let items = [];
            for (let attempt = 0; attempt < 4; attempt++) {
                items = findAllEls(itemSelectors).filter(b =>
                    b.offsetParent !== null && b.offsetWidth > 50 && b.offsetHeight > 20
                );
                if (items.length >= correctOrder.length) break;
 
                if (items.length < 2) {
                    items = this._getVisibleAnswerBtns();
                }
                if (items.length >= correctOrder.length) break;
 
                if (items.length < 2) {
                    const questionArea = document.querySelector('[class*="question"], [class*="Question"], [class*="challenge"], main');
                    if (questionArea) {
                        const candidates = questionArea.querySelectorAll('div, button, li');
                        const stacked = [];
                        for (const c of candidates) {
                            if (c.offsetParent && c.offsetWidth > 150 && c.offsetHeight > 30 && c.offsetHeight < 120
                                && c.textContent.trim().length > 0 && c.textContent.trim().length < 100
                                && c.children.length < 10) {
                                stacked.push(c);
                            }
                        }
                        if (stacked.length >= correctOrder.length) {
                            const avgWidth = stacked.reduce((s, e) => s + e.offsetWidth, 0) / stacked.length;
                            items = stacked.filter(e => Math.abs(e.offsetWidth - avgWidth) < 50);
                        }
                    }
                }
                if (items.length >= correctOrder.length) break;
                await sleep(400);
            }
 
            if (items.length < 2) {
                log(`Jumble: only found ${items.length} items, need ${correctOrder.length}`);
                return false;
            }
 
            const itemTexts = items.map(el => (el.getAttribute('aria-label') || el.textContent || '').trim());
            log(`Jumble: live items = [${itemTexts.map(t => t.slice(0, 15)).join(', ')}]`);
 
            const desiredOrder = [];
            const usedIndices = new Set();
            for (const correctText of correctOrder) {
                let bestIdx = -1, bestScore = 0;
                for (let i = 0; i < itemTexts.length; i++) {
                    if (usedIndices.has(i)) continue;
                    const score = similarity(correctText, itemTexts[i]);
                    if (score > bestScore) { bestScore = score; bestIdx = i; }
                }
                if (bestIdx >= 0 && bestScore >= 0.35) {
                    desiredOrder.push(bestIdx);
                    usedIndices.add(bestIdx);
                } else {
                    log(`Jumble: no match for "${correctText.slice(0, 20)}" (best ${bestScore.toFixed(2)})`);
                }
            }
 
            if (desiredOrder.length < correctOrder.length) {
                log(`Jumble: only matched ${desiredOrder.length}/${correctOrder.length} items`);
            }
 
            log('Jumble: trying click-to-order strategy');
            let clicked = 0;
            for (const domIdx of desiredOrder) {
                const item = items[domIdx];
                if (item) {
                    triggerReactClick(item);
                    clicked++;
                    await sleep(180);
                }
            }
 
            log('Jumble: trying drag-and-drop strategy');
            const currentIndices = items.map((_, i) => i);
            for (let targetPos = 0; targetPos < desiredOrder.length; targetPos++) {
                const wantIdx = desiredOrder[targetPos];
                const currentPos = currentIndices.indexOf(wantIdx);
                if (currentPos === targetPos) continue;
 
                const fromEl = items[currentIndices[currentPos]];
                const toEl = items[currentIndices[targetPos]];
                if (!fromEl || !toEl) continue;
 
                await simulateDrag(fromEl, toEl);
                await sleep(150);
 
                const temp = currentIndices[currentPos];
                currentIndices.splice(currentPos, 1);
                currentIndices.splice(targetPos, 0, temp);
            }
 
            if (items[0]) {
                let el = items[0].parentElement;
                for (let d = 0; d < 8 && el; d++) {
                    const fk = Object.keys(el).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
                    if (fk) {
                        let fiber = el[fk];
                        let fd = 0;
                        while (fiber && fd < 20) {
                            const props = fiber.memoizedProps || {};
                            const handler = props.onSortEnd || props.onReorder || props.onDragEnd || props.onOrderChange;
                            if (typeof handler === 'function') {
                                try {
                                    handler({ oldIndex: 0, newIndex: 0, collection: desiredOrder });
                                    log('Jumble: called React sort handler');
                                    break;
                                } catch (_) {}
                            }
                            fiber = fiber.return;
                            fd++;
                        }
                    }
                    el = el.parentElement;
                }
            }
 
            await sleep(300);
 
            const sub = findEl(SUBMIT_SELECTORS);
            if (sub) {
                triggerReactClick(sub);
                log('Jumble: submitted');
            }
 
            return clicked > 0 || desiredOrder.length > 0;
        },
 
        async answerQuestion(liveQi) {
            if (!state.autoAnswer && !state.answerViewer) return false;
            if (state.answeredQuestions.has(liveQi)) return false;
            if (state.pendingAnswers.has(liveQi)) return false;
            state.pendingAnswers.add(liveQi);
 
            try {
                let qi = liveQi;
                let confident = false;
                if (this.quizData) {
                    await sleep(150);
                    const matchedIdx = this.matchQuestionByText();
                    if (matchedIdx !== null) {
                        qi = matchedIdx;
                        confident = true;
                        if (matchedIdx !== liveQi) {
                            log(`Q${liveQi + 1} matched to quizData[${matchedIdx + 1}] by text`);
                        }
                    } else if (this.quizData.questions[liveQi]) {
                        confident = false;
                        log(`Q${liveQi + 1} text match failed, using index (may be wrong if shuffled)`);
                    }
                }
 
                this.highlightCorrect(qi);
 
                if (!state.autoAnswer) return false;
 
                const delay = getDelay();
                const qType = this.getQuestionType(qi);
                log(`Q${liveQi + 1} type="${qType}" \u2014 answering in ${delay}ms`);
                await sleep(delay);
 
                let ok = false;
                let wasInformed = false;
 
                switch (qType) {
                    case 'open_ended':
                    case 'word_cloud':
                    case 'brainstorm':
                        ok = await this._handleOpenEnded(qi);
                        wasInformed = ok;
                        break;
 
                    case 'slider':
                        ok = await this._handleSlider(qi);
                        wasInformed = ok;
                        break;
 
                    case 'jumble':
                    case 'puzzle':
                    case 'ordering':
                        ok = await this._handleJumble(qi);
                        wasInformed = ok;
                        break;
 
                    case 'quiz':
                    case 'multiple_select_quiz':
                    case 'true_false':
                    case 'survey':
                    default:
                        if (this.quizData && this.quizData.questions[qi]?.choices?.length) {
                            ok = await this._clickCorrectWithRetry(qi);
                            wasInformed = ok;
                        }
                        break;
                }
 
                if (ok) {
                    await sleep(150);
                    const sub = findEl(SUBMIT_SELECTORS);
                    if (sub && sub.offsetParent !== null) triggerReactClick(sub);
                }
 
                if (!ok && !['open_ended', 'word_cloud', 'slider', 'jumble', 'puzzle', 'ordering', 'brainstorm'].includes(qType)) {
                    const blindOk = this._clickBlind();
                    if (blindOk) { ok = true; wasInformed = false; }
                }
 
                if (ok) state.answeredQuestions.add(liveQi);
 
                state.stats.total++;
                if (wasInformed) {
                    state.stats.correct++;
                    state.stats.streak++;
                } else {
                    state.stats.streak = 0;
                }
 
                state.currentQuestion = liveQi;
                updatePanelQuestion(liveQi);
                const tag = wasInformed ? `\u2713 (${qType})` : (ok ? 'GUESS' : 'MISS');
                log(`Q${liveQi + 1} ${tag} [${state.stats.correct}/${state.stats.total}]`);
                return ok;
            } finally {
                state.pendingAnswers.delete(liveQi);
            }
        }
    };
 
    const OrigWS = window.WebSocket;
    window.WebSocket = function (...args) {
        const ws = new OrigWS(...args);
 
        state.wsInstances.push(ws);
        if (state.wsInstances.length > 20) {
            state.wsInstances = state.wsInstances.filter(w => w.readyState <= 1);
        }
 
        log(`WS \u2192 ${String(args[0]).slice(0, 60)}`);
 
        const origAEL = ws.addEventListener.bind(ws);
        ws.addEventListener = function (type, fn, opts) {
            if (type === 'message') {
                const wrapped = function (ev) {
                    try { handleWSMsg(ev); } catch (_) {}
                    return fn.call(this, ev);
                };
                return origAEL(type, wrapped, opts);
            }
            return origAEL(type, fn, opts);
        };
 
        let _onmsg = null;
        try {
            Object.defineProperty(ws, 'onmessage', {
                configurable: true,
                get() { return _onmsg; },
                set(fn) {
                    _onmsg = function (ev) {
                        try { handleWSMsg(ev); } catch (_) {}
                        return fn.call(this, ev);
                    };
                    try {
                        Object.getOwnPropertyDescriptor(OrigWS.prototype, 'onmessage').set.call(ws, _onmsg);
                    } catch (_) {
                        origAEL('message', ev => { try { handleWSMsg(ev); } catch (_) {} });
                    }
                }
            });
        } catch (_) {
            origAEL('message', ev => { try { handleWSMsg(ev); } catch (_) {} });
        }
 
        const origSend = ws.send.bind(ws);
        ws.send = function (data) {
            try { sniffOutbound(data); } catch (_) {}
            return origSend(data);
        };
 
        return ws;
    };
    window.WebSocket.prototype = OrigWS.prototype;
    Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
 
    function sniffOutbound(data) {
        if (typeof data !== 'string') return;
        try {
            const parsed = JSON.parse(data);
            const msgs = Array.isArray(parsed) ? parsed : [parsed];
            for (const m of msgs) {
                const id = m.data?.quizId || m.data?.kahootId;
                if (id && !state.quizId) {
                    log(`WS outbound quizId: ${id}`);
                    AnswerEngine.loadQuizData(id).catch(() => {});
                }
            }
        } catch (_) {}
    }
 
    function handleWSMsg(ev) {
        if (typeof ev.data !== 'string') return;
        let msgs;
        try {
            const p = JSON.parse(ev.data);
            msgs = Array.isArray(p) ? p : [p];
        } catch (_) { return; }
 
        for (const m of msgs) {
            let qi = -1;
 
            if (m.channel === '/service/player' && m.data?.content) {
                const c = parseContent(m.data.content);
                if (typeof c?.questionIndex === 'number') qi = c.questionIndex;
            }
            if (qi < 0 && m.data?.gameBlockType) {
                qi = m.data.questionIndex ?? -1;
            }
            if (qi < 0 && typeof m.ext?.questionIndex === 'number') {
                qi = m.ext.questionIndex;
            }
            if (qi < 0 && m.type === 'question') {
                qi = m.questionIndex ?? -1;
            }
            if (qi < 0 && m.data?.id === 2) {
                const c = parseContent(m.data.content);
                if (typeof c?.questionIndex === 'number') qi = c.questionIndex;
            }
            if (qi < 0 && typeof m.data?.questionIndex === 'number') {
                qi = m.data.questionIndex;
            }
 
            if (qi >= 0) {
                log(`WS Q#${qi + 1}`);
                AnswerEngine.answerQuestion(qi);
            }
 
            if (m.channel === '/service/player' && m.data?.content) {
                const c = parseContent(m.data.content);
                if (c && !state.quizId) {
                    if (c.quizQuestionAnswers) {
                        log(`WS live: got ${c.quizQuestionAnswers.length} answer slots, type=${c.gameBlockType || '?'}`);
                    }
                    if (c.questionText || c.question || c.title) {
                        const qText = c.questionText || c.question || c.title;
                        const choices = c.choices || c.answers || c.answerChoices || [];
                        const numChoices = c.numberOfChoices || c.quizQuestionAnswers?.length || choices.length || 4;
                        const correctIdx = c.correctAnswerIndex ?? c.correctAnswer ?? c.quizQuestionAnswers?.[0] ?? null;
 
                        log(`WS live Q: "${qText.slice(0,40)}" choices=${choices.length} correct=${correctIdx}`);
 
                        if (choices.length > 0 || qText) {
                            const SHAPES = ['▲ Red', '◆ Blue', '● Orange', '■ Green'];
                            let overlayText = '';
 
                            if (correctIdx !== null && correctIdx >= 0 && correctIdx < 4) {
                                const shape = SHAPES[correctIdx] || `#${correctIdx+1}`;
                                const ansText = choices[correctIdx]?.answer || choices[correctIdx]?.text || '';
                                overlayText = `→ ${shape}${ansText ? ' ' + ansText : ''}`;
                            } else if (choices.length > 0) {
                                const correct = choices.filter(ch => ch.correct);
                                if (correct.length > 0) {
                                    overlayText = correct.map((ch, i) => {
                                        const idx = choices.indexOf(ch);
                                        return `${SHAPES[idx] || ''} ${ch.answer || ch.text || ''}`.trim();
                                    }).join(' / ');
                                    overlayText = `→ ${overlayText}`;
                                }
                            }
 
                            if (!overlayText && qText) {
                                overlayText = qText;
                                if (choices.length > 0) {
                                    overlayText += '\n' + choices.map((ch, i) =>
                                        `${SHAPES[i] || (i+1)+'.'} ${ch.answer || ch.text || ch}`
                                    ).join('  |  ');
                                }
                            }
 
                            if (overlayText) {
                                document.querySelectorAll('.kb-answer-overlay').forEach(e => e.remove());
                                const overlay = document.createElement('div');
                                overlay.className = 'kb-answer-overlay';
                                overlay.style.cssText = `
                                    position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 999999;
                                    background: rgba(22, 163, 74, 0.95); color: #fff;
                                    padding: 10px 28px; border-radius: 14px;
                                    font-size: 17px; font-weight: 700; font-family: Inter, system-ui, sans-serif;
                                    box-shadow: 0 4px 24px rgba(0,0,0,0.4); pointer-events: none;
                                    max-width: 90vw; text-align: center; line-height: 1.4;
                                    white-space: pre-line;
                                    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                                    border: 1px solid rgba(255,255,255,0.15);
                                `;
                                overlay.textContent = overlayText;
                                document.body.appendChild(overlay);
                            }
                        }
                    }
                }
            }
 
            if (!state.quizId) {
                const id = m.data?.quizId || m.data?.kahootId || m.quizId || m.kahootId
                    || m.ext?.quizId || m.ext?.kahootId;
                if (id) {
                    log(`WS quizId: ${id}`);
                    AnswerEngine.loadQuizData(id).catch(() => {});
                }
            }
 
            if (!state.quizId && m.data?.content) {
                const c = parseContent(m.data.content);
                if (c) {
                    const nestedId = c.quizId || c.kahootId || c.uuid || c.id;
                    if (nestedId && /^[a-f0-9-]{36}$/i.test(nestedId)) {
                        log(`WS nested quizId: ${nestedId}`);
                        AnswerEngine.loadQuizData(nestedId).catch(() => {});
                    }
                }
            }
 
            if (!state.quizId) {
                const raw = JSON.stringify(m);
                const uuids = raw.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi);
                if (uuids) {
                    for (const uuid of [...new Set(uuids)]) {
                        if (uuid === '00000000-0000-0000-0000-000000000000') continue;
                        if (_triedUUIDs.has(uuid)) continue;
                        loadQuizDataOnce(uuid).then(ok => {
                            if (!ok) log(`Private quiz (${uuid.slice(0,8)}...) - using WS answers`);
                        });
                        break;
                    }
                }
            }
        }
    }
 
    function parseContent(content) {
        if (!content) return null;
        if (typeof content === 'object') return content;
        try { return JSON.parse(content); } catch (_) { return null; }
    }
 
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const resp = await origFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
 
            if (/\/kahoots\/[a-f0-9-]{36}/i.test(url) || /\/rest\/kahoots/i.test(url)) {
                const clone = resp.clone();
                clone.json().then(data => {
                    const q = data?.questions ? data : data?.kahoot;
                    if (q?.questions && !state.quizId) {
                        const qid = data.uuid || data.id || url.match(/([a-f0-9-]{36})/i)?.[1];
                        if (qid) {
                            log(`Fetch intercept quizId: ${qid}`);
                            AnswerEngine.quizData = { quizId: qid, title: q.title || '?', questions: q.questions };
                            state.quizId = qid;
                            updatePanelQuizInfo(q.questions.length);
                        }
                    }
                }).catch(() => {});
            }
 
            if (/\/rest\/challenges\//i.test(url) || /\/challenges\//i.test(url)) {
                const clone = resp.clone();
                clone.json().then(data => {
                    if (data?.kahoot?.questions && !AnswerEngine.quizData) {
                        const kid = data.kahoot.uuid || data.kahoot.id || data.kahootId;
                        log(`Fetch intercept challenge: ${kid || 'embedded'} (${data.kahoot.questions.length} Qs)`);
                        AnswerEngine.quizData = {
                            quizId: kid || 'challenge',
                            title: data.kahoot.title || '?',
                            questions: data.kahoot.questions,
                        };
                        state.quizId = kid || 'challenge';
                        state.connected = true;
                        updatePanelQuizInfo(data.kahoot.questions.length);
                    } else if (data?.kahootId && !state.quizId) {
                        log(`Fetch intercept challenge kahootId: ${data.kahootId}`);
                        AnswerEngine.loadQuizData(data.kahootId).catch(() => {});
                    }
                }).catch(() => {});
            }
        } catch (_) {}
        return resp;
    };
 
    const origXHROpen = XMLHttpRequest.prototype.open;
    const origXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._kbUrl = url;
        return origXHROpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (...args) {
        const xhrUrl = this._kbUrl || '';
        if (/\/kahoots\/[a-f0-9-]{36}/i.test(xhrUrl) || /\/rest\/challenges\//i.test(xhrUrl) || /\/challenges\//i.test(xhrUrl)) {
            this.addEventListener('load', function () {
                try {
                    const data = JSON.parse(this.responseText);
                    const q = data?.questions ? data : data?.kahoot;
                    if (q?.questions && !state.quizId) {
                        const qid = data.uuid || data.id || data.kahootId || xhrUrl.match(/([a-f0-9-]{36})/i)?.[1];
                        if (qid) {
                            log(`XHR intercept quizId: ${qid}`);
                            AnswerEngine.quizData = { quizId: qid, title: q.title || '?', questions: q.questions };
                            state.quizId = qid;
                            state.connected = true;
                            updatePanelQuizInfo(q.questions.length);
                        }
                    }
                    if (!state.quizId && data?.kahootId) {
                        log(`XHR intercept challenge kahootId: ${data.kahootId}`);
                        AnswerEngine.loadQuizData(data.kahootId).catch(() => {});
                    }
                } catch (_) {}
            });
        }
        return origXHRSend.apply(this, args);
    };
 
    function startPollLoop() {
        let lastCounterText = '';
        let lastQuestionText = '';
        let lastAnsweredQ = -1;
 
        function frame() {
            try {
                if (!state.autoAnswer && !state.answerViewer) {
                    requestAnimationFrame(frame);
                    return;
                }
 
                const counterEl = findEl(QUESTION_INDEX_SELECTORS);
                const counterText = counterEl ? counterEl.textContent : '';
 
                if (counterText && counterText !== lastCounterText) {
                    lastCounterText = counterText;
                    const qi = parseInt(counterText.replace(/[^\d]/g, '')) - 1;
                    if (!isNaN(qi) && qi >= 0) {
                        state.currentQuestion = qi;
                    }
                }
 
                if (!counterEl) {
                    const liveQ = AnswerEngine._readLiveQuestionText?.() || '';
                    if (liveQ && liveQ.length > 3 && liveQ !== lastQuestionText) {
                        lastQuestionText = liveQ;
                        state.currentQuestion = Math.max(0, state.currentQuestion + 1);
                        log(`Challenge: new question detected (Q${state.currentQuestion + 1}) "${liveQ.slice(0, 40)}\u2026"`);
                    }
                }
 
                const answerBtns = findAllEls(ANSWER_GROUP_SELECTORS).filter(b =>
                    b.offsetParent !== null && b.offsetWidth > 30 && b.offsetHeight > 20
                );
                const hasAnswerBtns = answerBtns.length >= 2;
                const jumbleItem = findEl(JUMBLE_ITEM_SELECTORS);
                const textInput = findEl(TEXT_INPUT_SELECTORS);
                const slider = findEl(SLIDER_SELECTORS);
 
                const questionVisible = !!AnswerEngine._readLiveQuestionText?.();
                const hasInteractable = hasAnswerBtns || jumbleItem || textInput || slider || questionVisible;
 
                const qi = state.currentQuestion;
                if (hasInteractable && qi >= 0
                    && lastAnsweredQ !== qi
                    && !state.answeredQuestions.has(qi)
                    && !state.pendingAnswers.has(qi)) {
                    lastAnsweredQ = qi;
                    AnswerEngine.answerQuestion(qi);
                }
 
                if (hasInteractable && qi < 0) {
                    state.currentQuestion = 0;
                    log('Challenge: forced Q1 detection (interactable found)');
                }
 
            } catch (e) { /* don't kill the loop */ }
            requestAnimationFrame(frame);
        }
 
        requestAnimationFrame(frame);
        
    }
 
    function startDOMObserver() {
        let lastQ = -1;
        let lastObservedText = '';
 
        const check = debounce(() => {
            if (!state.autoAnswer && !state.answerViewer) return;
 
            const qEl = findEl(QUESTION_INDEX_SELECTORS);
            if (qEl) {
                const text = qEl.textContent.replace(/[^\d]/g, '');
                const qi = parseInt(text) - 1;
                if (!isNaN(qi) && qi >= 0 && qi !== lastQ && !state.answeredQuestions.has(qi) && !state.pendingAnswers.has(qi)) {
                    lastQ = qi;
                    AnswerEngine.answerQuestion(qi);
                    return;
                }
            }
 
            const liveQ = AnswerEngine._readLiveQuestionText?.() || '';
            if (liveQ && liveQ.length > 3 && liveQ !== lastObservedText) {
                lastObservedText = liveQ;
                const qi = state.currentQuestion;
                if (qi >= 0 && !state.answeredQuestions.has(qi) && !state.pendingAnswers.has(qi)) {
                    setTimeout(() => {
                        if (!state.answeredQuestions.has(qi) && !state.pendingAnswers.has(qi)) {
                            AnswerEngine.answerQuestion(qi);
                        }
                    }, 120);
                    return;
                }
            }
 
            const btns = findAllEls(ANSWER_GROUP_SELECTORS).filter(b => b.offsetParent !== null && b.offsetWidth > 30);
            const jumble = findAllEls(JUMBLE_ITEM_SELECTORS).filter(b => b.offsetParent !== null);
            const textInput = findEl(TEXT_INPUT_SELECTORS);
            const slider = findEl(SLIDER_SELECTORS);
 
            if (btns.length >= 2 || jumble.length >= 2 || textInput || slider) {
                const est = Math.max(0, state.currentQuestion);
                if (!state.answeredQuestions.has(est) && !state.pendingAnswers.has(est)) {
                    setTimeout(() => {
                        if (!state.answeredQuestions.has(est) && !state.pendingAnswers.has(est)) {
                            if (state.currentQuestion < 0) state.currentQuestion = 0;
                            AnswerEngine.answerQuestion(est);
                        }
                    }, 100);
                }
            }
        }, CONFIG.domObserverDebounce);
 
        const obs = new MutationObserver(check);
        const go = () => {
            if (document.body) {
                obs.observe(document.body, { childList: true, subtree: true });
                
            } else {
                setTimeout(go, 100);
            }
        };
        go();
    }
 
    const PIN_INPUT_SELECTORS = [
        'input[name="gameId"]',
        'input[placeholder*="PIN"]',
        'input[placeholder*="pin"]',
        'input[placeholder*="Game"]',
        'input[type="tel"]',
        'input[data-functional-selector="game-pin-input"]',
    ];
 
    const JOIN_PIN_BTN_SELECTORS = [
        'button[data-functional-selector="join-game-pin"]',
        'button[type="submit"]',
        'form button',
        'button[class*="enter"]',
        'button[class*="join"]',
    ];
 
    const NICKNAME_INPUT_SELECTORS = [
        'input[name="nickname"]',
        'input[data-functional-selector="nickname"]',
        'input[data-functional-selector="username"]',
        'input[placeholder*="ickname"]',
        'input[placeholder*="name"]',
    ];
 
    const JOIN_GAME_BTN_SELECTORS = [
        'button[data-functional-selector="join-button"]',
        'button[data-functional-selector="join-game-button"]',
        'button[type="submit"]',
        'button[class*="join"]',
    ];
 
    async function tryAutoJoin() {
        if (!state.autoJoin) return;
        if (/\/(gameblock|challenge|solo|game\/)/.test(location.href)) return;
 
        const input = findEl(PIN_INPUT_SELECTORS);
        const btn = findEl(JOIN_PIN_BTN_SELECTORS);
        if (!input || !btn) return;
 
        const pin = findPinInPage();
        if (!pin) return;
 
        log(`Auto-join: ${pin}`);
        setReactInput(input, pin);
        await sleep(400);
        btn.click();
        await sleep(2000);
 
        let nick;
        try { nick = await waitForEl(NICKNAME_INPUT_SELECTORS, 5000); } catch (_) { return; }
        if (nick) {
            setReactInput(nick, state.nickname);
            await sleep(300);
            const go = findEl(JOIN_GAME_BTN_SELECTORS);
            if (go) {
                go.click();
                state.connected = true;
                log(`Joined as "${state.nickname}"`);
            }
        }
    }
 
    async function setupLive() {
        if (!/\/(gameblock|game\/)/.test(location.href)) return;
        const params = new URLSearchParams(location.search);
        const pin = findPinInPage() || params.get('pin') || params.get('gameId');
 
        try {
            let qid = params.get('quizId') || params.get('kahootId') || params.get('quiz_id') || null;
 
            if (qid) {
                log(`Live: quizId from URL = ${qid}`);
            }
 
            if (pin) {
                for (const base of ['https://kahoot.it', 'https://play.kahoot.it']) {
                    try {
                        const r = await fetchWithTimeout(`${base}/reserve/session/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ game: pin })
                        });
                        if (r.ok) {
                            const d = await r.json();
                            qid = d.quizId || d.id || d.kahootId;
                            if (qid) break;
                        }
                    } catch (_) {}
                }
            }
 
            if (!qid) {
                for (const s of document.querySelectorAll('script')) {
                    const text = s.textContent;
                    const nextData = text.match(/__NEXT_DATA__\s*=\s*({[\s\S]*?})\s*[;\n]/);
                    if (nextData) {
                        try {
                            const nd = JSON.parse(nextData[1]);
                            qid = nd?.props?.pageProps?.quizId || nd?.props?.pageProps?.kahootId;
                            if (qid) break;
                        } catch (_) {}
                    }
                    const m = text.match(/(?:quizId|kahootId|quiz_id)['":\s]+['"]([a-f0-9-]{36})/i);
                    if (m) { qid = m[1]; break; }
                }
            }
 
            if (!qid) {
                const meta = document.querySelector('meta[name*="quiz"], meta[property*="quiz"]');
                if (meta) {
                    const m = meta.content?.match(/([a-f0-9-]{36})/i);
                    if (m) qid = m[1];
                }
            }
 
            if (qid) {
                await AnswerEngine.loadQuizData(qid);
                state.connected = true;
                log('Live ready');
            } else {
                log('No quizId \u2014 waiting for WS/fetch intercept');
            }
        } catch (e) {
            log(`Live setup: ${e.message} \u2014 DOM fallback`);
        }
    }
 
    async function setupChallenge() {
        const pathMatch = location.pathname.match(/\/(?:challenge|solo)\/([a-f0-9-_]+)/i);
        if (!pathMatch) return;
 
        const pin = pathMatch[1];
        const params = new URLSearchParams(location.search);
        const challengeId = params.get('challenge-id') || null;
 
        log(`Challenge setup: pin=${pin}, challenge-id=${challengeId || 'none'}`);
 
        try {
            let ok = false;
            if (challengeId) {
                ok = await AnswerEngine.loadChallengeData(challengeId, pin);
            }
            if (!ok) {
                ok = await AnswerEngine.loadChallengeData(pin, null);
            }
            if (!ok) {
                ok = await AnswerEngine.loadQuizData(pin).catch(() => false);
            }
            if (ok) {
                state.connected = true;
                log('Challenge: quiz data loaded');
            }
        } catch (e) {
            log(`Challenge load failed: ${e.message} \u2014 trying DOM/fetch intercept`);
        }
 
        await sleep(800);
        const start = findEl([
            'button[data-functional-selector="start-challenge-button"]',
            'button[class*="start"]',
            'button[data-functional-selector="start-button"]',
        ]);
        if (start) {
            start.click();
            await sleep(800);
            let nick;
            try { nick = await waitForEl(NICKNAME_INPUT_SELECTORS, 5000); } catch (_) { return; }
            if (nick) {
                setReactInput(nick, state.nickname);
                await sleep(300);
                const join = findEl([
                    'button[data-functional-selector="join-challenge-button"]',
                    'button[type="submit"]',
                ]);
                if (join) join.click();
            }
        }
    }
 
    const MODS = [
        { id: 'autoAnswer',   label: 'AutoAnswer',       cat: 'game' },
        { id: 'autoJoin',     label: 'AutoJoin',         cat: 'game' },
        { id: 'scanPin',      label: 'ScanPin',          cat: 'game' },
        { id: 'speedMode',    label: 'SpeedMode',        cat: 'game' },
        { id: 'stealthMode',  label: 'StealthMode',      cat: 'game' },
        { id: 'answerViewer', label: 'AnswerView',       cat: 'hud' },
        { id: 'showStatus',   label: 'StatusHUD',        cat: 'hud' },
        { id: 'quizInfo',     label: 'QuizInfo',         cat: 'hud' },
        { id: 'debugLog',     label: 'DebugLog',         cat: 'config' },
    ];
 
    function injectCSS() {
        const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
 
#kb-panel {
    position: fixed; top: 20px; right: 20px; width: 600px;
    background: #131316; border: 1px solid rgba(255,255,255,0.04);
    box-shadow: 0 20px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03);
    border-radius: 14px; color: #8a8a94;
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    z-index: 999999; user-select: none; overflow: hidden; backdrop-filter: blur(20px);
    transition: opacity 0.3s, transform 0.3s;
}
#kb-panel.hidden { opacity: 0; pointer-events: none; transform: scale(0.95) translateY(-10px); }
#kb-panel * { box-sizing: border-box; }
#kb-panel .hdr { display: flex; align-items: center; padding: 14px 16px 0; cursor: move; gap: 0; }
#kb-panel .logo-area { display: flex; align-items: center; gap: 10px; margin-right: 18px; flex-shrink: 0; }
#kb-panel .logo-area img { width: 28px; height: 28px; border-radius: 6px; }
#kb-panel .logo-area .brand {
    font-size: 14px; font-weight: 700; letter-spacing: 0.5px;
    background: linear-gradient(90deg, #ff0000, #ff7700, #ffdd00, #00ff00, #0099ff, #8b00ff, #ff0000);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: kb-rainbow 3s linear infinite;
}
@keyframes kb-rainbow {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
}
#kb-panel .tabs { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
#kb-panel .tab {
    padding: 8px 12px; font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .8px; color: #3a3a42; cursor: pointer; border: none; background: none;
    border-bottom: 2px solid transparent; transition: color .2s, border-color .2s;
    font-family: inherit; white-space: nowrap;
}
#kb-panel .tab:hover { color: #6a6a74; }
#kb-panel .tab.on { color: #e0e0e8; border-bottom-color: #e0e0e8; }
#kb-panel .hdr-right { display: flex; align-items: center; margin-left: auto; gap: 8px; }
#kb-panel .srch { position: relative; display: flex; align-items: center; }
#kb-panel .srch input {
    width: 120px; padding: 5px 8px 5px 6px; background: transparent; border: none;
    color: #4a4a54; font-size: 11px; font-family: inherit; outline: none; transition: color .2s;
}
#kb-panel .srch input:focus { color: #8a8a94; }
#kb-panel .srch input::placeholder { color: #2a2a32; }
#kb-panel .srch .s-icon { width: 14px; height: 14px; color: #2a2a32; flex-shrink: 0; }
#kb-panel .hbtn {
    width: 28px; height: 28px; background: none; border: none; color: #3a3a42;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    border-radius: 6px; transition: color .2s, background .2s; padding: 0;
}
#kb-panel .hbtn:hover { color: #7a7a84; background: rgba(255,255,255,0.03); }
#kb-panel .hbtn svg { width: 16px; height: 16px; }
#kb-panel .grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
    padding: 14px 14px 10px; max-height: 380px; overflow-y: auto;
}
#kb-panel .grid::-webkit-scrollbar { width: 3px; }
#kb-panel .grid::-webkit-scrollbar-thumb { background: #222228; border-radius: 2px; }
#kb-panel .mod {
    display: flex; flex-direction: column; padding: 14px 12px 12px; border-radius: 10px;
    background: #1c1c22; cursor: pointer; transition: background .18s;
    position: relative; min-height: 84px;
}
#kb-panel .mod:hover { background: #222228; }
#kb-panel .mod-top { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: auto; }
#kb-panel .mod-icon { width: 20px; height: 20px; color: #3a3a44; flex-shrink: 0; transition: color .2s; }
#kb-panel .mod.on .mod-icon { color: #9090a0; }
#kb-panel .mod-actions { display: flex; align-items: center; gap: 0; }
#kb-panel .sw {
    width: 36px; height: 18px; background: #2a2a30; border-radius: 9px;
    position: relative; transition: background .25s; flex-shrink: 0;
}
#kb-panel .sw::after {
    content: ''; position: absolute; width: 14px; height: 14px; border-radius: 50%;
    background: #444450; top: 2px; left: 2px;
    transition: all .25s cubic-bezier(.4,.0,.2,1);
}
#kb-panel .mod.on .sw { background: #2d5a28; }
#kb-panel .mod.on .sw::after { left: 20px; background: #5cb85c; box-shadow: 0 0 8px rgba(92,184,92,0.3); }
#kb-panel .dots {
    font-size: 12px; color: transparent; line-height: 1; cursor: pointer;
    transition: color .2s; padding: 0 0 0 4px; width: 0; overflow: hidden;
}
#kb-panel .mod:hover .dots { color: #3a3a42; width: auto; }
#kb-panel .mod:hover .dots:hover { color: #6a6a74; }
#kb-panel .mod-label {
    font-size: 10.5px; font-weight: 500; color: #44444e; margin-top: 12px;
    transition: color .2s; line-height: 1.2; letter-spacing: .2px;
}
#kb-panel .mod.on .mod-label { color: #a8a8b8; }
#kb-panel .stats {
    display: flex; gap: 14px; padding: 8px 16px 10px; font-size: 10px; color: #3a3a42;
    border-top: 1px solid rgba(255,255,255,0.03); align-items: center;
}
#kb-panel .sv { color: #8a8af0; font-weight: 600; }
#kb-panel .nbar { display: flex; gap: 8px; padding: 6px 14px 10px; align-items: center; }
#kb-panel .ninp {
    flex: 1; padding: 8px 12px; background: #1c1c22;
    border: 1px solid rgba(255,255,255,0.04); border-radius: 8px;
    color: #c0c0c8; font-size: 12px; font-family: inherit; outline: none; transition: border-color .2s;
}
#kb-panel .ninp:focus { border-color: rgba(255,255,255,0.08); }
#kb-panel .ninp::placeholder { color: #2a2a32; }
#kb-panel .abtn {
    padding: 8px 16px; background: #1c1c22; border: 1px solid rgba(255,255,255,0.04);
    border-radius: 8px; color: #7a7a84; font-size: 11px; font-weight: 500;
    cursor: pointer; font-family: inherit; white-space: nowrap; transition: all .2s;
}
#kb-panel .abtn:hover { background: #28282e; color: #b0b0b8; border-color: rgba(255,255,255,0.08); }
#kb-panel .abtn:active { transform: scale(0.97); }
#kb-panel .dbg {
    max-height: 90px; overflow-y: auto; padding: 8px 14px;
    font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
    font-size: 9px; line-height: 1.6; color: #3a3a42;
    border-top: 1px solid rgba(255,255,255,0.03); display: none;
}
#kb-panel .dbg.vis { display: block; }
#kb-panel .dbg::-webkit-scrollbar { width: 3px; }
#kb-panel .dbg::-webkit-scrollbar-thumb { background: #222228; border-radius: 2px; }
 
#kb-reopen {
    position: fixed; top: 20px; right: 20px; z-index: 999998;
    width: 44px; height: 44px; border-radius: 12px; border: none;
    background: #131316; box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    cursor: pointer; display: none; align-items: center; justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
    padding: 0; overflow: hidden;
}
#kb-reopen:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.8); }
#kb-reopen:active { transform: scale(0.95); }
#kb-reopen img { width: 28px; height: 28px; border-radius: 6px; }
#kb-reopen.vis { display: flex; }
 
@keyframes kb-fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
`;
        const s = document.createElement('style');
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
    }
 
    function buildPanel() {
        const p = document.createElement('div');
        p.id = 'kb-panel';
 
        const modsHTML = MODS.map(m => `
            <div class="mod ${state[m.id] ? 'on' : ''}" data-id="${m.id}" data-cat="${m.cat}">
                <div class="mod-top">
                    <div class="mod-icon">${SVG_ICONS[m.id]}</div>
                    <div class="mod-actions">
                        <div class="sw"></div>
                        <span class="dots">\u22EE</span>
                    </div>
                </div>
                <div class="mod-label">${m.label}</div>
            </div>`).join('');
 
        p.innerHTML = `
<div class="hdr" id="kb-drag">
    <div class="logo-area">
        <img src="https://raw.githubusercontent.com/JORKLAN/kahoot-cheat/main/assets/fluxus.png" alt="Fluxus">
        <span class="brand">Fluxus</span>
    </div>
    <div class="tabs">
        <button class="tab on" data-f="favorite">FAVORITE</button>
        <button class="tab" data-f="all">ALL</button>
        <button class="tab" data-f="hud">HUD</button>
        <button class="tab" data-f="game">GAME</button>
    </div>
    <div class="hdr-right">
        <div class="srch">
            <input placeholder="Search mods" id="kb-srch">
            <div class="s-icon">${SVG_ICONS.search}</div>
        </div>
        <button class="hbtn" id="kb-settings">${SVG_ICONS.settings}</button>
        <button class="hbtn" id="kb-min" title="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
    </div>
</div>
<div class="grid" id="kb-grid">${modsHTML}</div>
<div class="stats" id="kb-stats">
    <span>Ans: <span class="sv" id="s-tot">0</span></span>
    <span>OK: <span class="sv" id="s-ok">0</span></span>
    <span>Streak: <span class="sv" id="s-str">0</span></span>
    <span style="margin-left:auto"><span id="kb-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#333;vertical-align:middle;margin-right:4px"></span><span id="kb-st" style="font-size:9px">Idle</span></span>
</div>
<div class="nbar">
    <input class="ninp" placeholder="Nickname" value="${state.nickname}" id="kb-nick">
    <button class="abtn" id="kb-scan">Scan & Join</button>
</div>
<div class="nbar">
    <input class="ninp" placeholder="Quiz ID, challenge URL, or live PIN" id="kb-qid">
    <button class="abtn" id="kb-qload">Load</button>
    <button class="abtn" id="kb-qclear" title="Clear saved Quiz ID">Clear</button>
</div>
<div class="dbg" id="kb-dbg"></div>`;
 
        document.body.appendChild(p);
        state.panel = p;
 
        const reopen = document.createElement('button');
        reopen.id = 'kb-reopen';
        reopen.innerHTML = '<img src="https://raw.githubusercontent.com/JORKLAN/kahoot-cheat/main/assets/fluxus.png" alt="Fluxus">';
        document.body.appendChild(reopen);
        reopen.addEventListener('click', () => {
            p.classList.remove('hidden');
            reopen.classList.remove('vis');
        });
 
        p.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
            p.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
            t.classList.add('on');
            const f = t.dataset.f;
            p.querySelectorAll('.mod').forEach(c => {
                if (f === 'all' || f === 'favorite') c.style.display = '';
                else c.style.display = c.dataset.cat === f ? '' : 'none';
            });
        }));
 
        document.getElementById('kb-srch').addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            p.querySelectorAll('.mod').forEach(c => {
                c.style.display = c.querySelector('.mod-label').textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
 
        p.querySelectorAll('.mod').forEach(card => card.addEventListener('click', e => {
            if (e.target.closest('.dots')) return;
            const id = card.dataset.id;
            state[id] = !state[id];
            card.classList.toggle('on', state[id]);
            if (id === 'speedMode' && state.speedMode) {
                state.stealthMode = false;
                p.querySelector('[data-id="stealthMode"]')?.classList.remove('on');
            }
            if (id === 'stealthMode' && state.stealthMode) {
                state.speedMode = false;
                p.querySelector('[data-id="speedMode"]')?.classList.remove('on');
            }
            if (id === 'debugLog') document.getElementById('kb-dbg').classList.toggle('vis', state.debugLog);
            log(`${id} \u2192 ${state[id] ? 'ON' : 'OFF'}`);
            saveState();
        }));
 
        document.getElementById('kb-nick').addEventListener('input', e => {
            state.nickname = e.target.value.trim() || CONFIG.defaultNickname;
            saveState();
        });
 
        document.getElementById('kb-scan').addEventListener('click', async () => {
            const qidVal = document.getElementById('kb-qid')?.value.trim() || '';
 
            if (qidVal && isChallengeUrl(qidVal)) {
                const pin = extractChallengePin(qidVal);
                const fullId = extractFullChallengeId(qidVal);
                log(`Challenge link \u2014 navigating\u2026`);
                let targetUrl = qidVal;
                if (!/^https?:\/\//i.test(targetUrl)) {
                    if (pin) {
                        targetUrl = `https://kahoot.it/challenge/${pin}`;
                        if (fullId) targetUrl += `?challenge-id=${fullId}`;
                    } else { log('Cannot build challenge URL'); return; }
                }
                window.location.href = targetUrl;
                return;
            }
 
            if (qidVal && /^\d{6,9}$/.test(qidVal)) {
                log(`Live PIN from input: ${qidVal}`);
                await fillJoinForm(qidVal);
                return;
            }
 
            if (qidVal && /kahoot\.it/i.test(qidVal)) {
                const u = qidVal.match(/(?:pin|gameId|gameid)=(\d{6,9})/i);
                if (u) { log(`Live PIN from URL: ${u[1]}`); await fillJoinForm(u[1]); return; }
            }
 
            const pin = findPinInPage();
            if (pin) { log(`PIN found in page: ${pin}`); await fillJoinForm(pin); }
            else { log('No PIN found \u2014 paste a PIN or challenge URL in the Quiz ID field'); }
        });
 
        async function fillJoinForm(pin) {
            const inp = findEl(PIN_INPUT_SELECTORS);
            const btn = findEl(JOIN_PIN_BTN_SELECTORS);
            if (!inp) { log('Not on kahoot.it homepage'); return; }
            setReactInput(inp, pin);
            await sleep(400);
            if (btn) btn.click();
            try {
                const nick = await waitForEl(NICKNAME_INPUT_SELECTORS, 5000);
                if (nick) {
                    setReactInput(nick, state.nickname);
                    await sleep(300);
                    const go = findEl(JOIN_GAME_BTN_SELECTORS);
                    if (go) { go.click(); state.connected = true; log(`Joined as "${state.nickname}"`); }
                }
            } catch (_) {}
        }
 
        const qidInput = document.getElementById('kb-qid');
        const qloadBtn = document.getElementById('kb-qload');
        async function loadManualQuizId() {
            const raw = qidInput.value.trim();
            if (!raw) { qidInput.style.borderColor = '#e06060'; log('Paste a Quiz ID or kahoot URL'); return; }
 
            qidInput.style.borderColor = '';
            qloadBtn.textContent = 'Loading\u2026';
            qloadBtn.disabled = true;
 
            try {
                let ok = false;
                if (isChallengeUrl(raw)) {
                    const fullId = extractFullChallengeId(raw);
                    const pin = extractChallengePin(raw);
                    log(`Challenge: id=${fullId?.slice(0, 12)}\u2026 pin=${pin || 'n/a'}`);
                    if (!fullId && !pin) { qidInput.style.borderColor = '#e06060'; throw new Error('No challenge id or PIN in URL'); }
                    ok = await AnswerEngine.loadChallengeData(fullId, pin);
                } else {
                    const uuid = extractUUID(raw);
                    if (!uuid) { qidInput.style.borderColor = '#e06060'; throw new Error('No UUID'); }
                    log(`Loading Quiz ID ${uuid}\u2026`);
                    ok = await AnswerEngine.loadQuizData(uuid);
                }
 
                if (ok) {
                    qidInput.style.borderColor = '#5cb85c';
                    qloadBtn.textContent = 'Loaded';
                    setTimeout(() => { qloadBtn.textContent = 'Load'; qloadBtn.disabled = false; }, 2000);
                } else { throw new Error('Load returned false'); }
            } catch (e) {
                qidInput.style.borderColor = '#e06060';
                qloadBtn.textContent = 'Failed';
                qloadBtn.disabled = false;
                const msg = e.message || 'unknown error';
                log(`Load failed: ${msg}`);
                setTimeout(() => { qloadBtn.textContent = 'Load'; }, 2500);
            }
        }
        qloadBtn.addEventListener('click', loadManualQuizId);
        qidInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadManualQuizId(); });
 
        document.getElementById('kb-qclear').addEventListener('click', () => {
            qidInput.value = '';
            qidInput.style.borderColor = '';
            AnswerEngine.quizData = null;
            state.quizId = null;
            state.answeredQuestions.clear();
            state.pendingAnswers.clear();
            state.currentQuestion = -1;
            updatePanelQuizInfo(0);
            saveState();
            log('Cleared saved Quiz ID and quiz data');
        });
 
        document.getElementById('kb-min').addEventListener('click', () => {
            p.classList.add('hidden');
            document.getElementById('kb-reopen').classList.add('vis');
        });
        document.getElementById('kb-settings').addEventListener('click', () => {});
 
        const hdr = document.getElementById('kb-drag');
        let ox, oy, drag = false;
        hdr.addEventListener('mousedown', e => {
            if (e.target.closest('.hbtn') || e.target.closest('.tab') || e.target.closest('.srch')) return;
            drag = true;
            ox = e.clientX - p.getBoundingClientRect().left;
            oy = e.clientY - p.getBoundingClientRect().top;
        });
        document.addEventListener('mousemove', e => {
            if (!drag) return;
            p.style.left = (e.clientX - ox) + 'px';
            p.style.top = (e.clientY - oy) + 'px';
            p.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { drag = false; });
    }
 
    function updatePanelStatus(t) {
        const e = document.getElementById('kb-st'), d = document.getElementById('kb-dot');
        if (e) e.textContent = t;
        if (d) d.style.background = state.connected ? '#5cb85c' : '#333';
    }
    function updatePanelQuizInfo(c) {
        updatePanelStatus(c ? `Quiz loaded: ${c} Qs` : 'No quiz');
    }
    function updatePanelQuestion(qi) {
        updatePanelStatus(`Q${qi + 1} answered`);
        const t = document.getElementById('s-tot'), o = document.getElementById('s-ok'), s = document.getElementById('s-str');
        if (t) t.textContent = state.stats.total;
        if (o) o.textContent = state.stats.correct;
        if (s) s.textContent = state.stats.streak;
    }
    function updateDebugPanel() {
        const e = document.getElementById('kb-dbg');
        if (!e) return;
        e.textContent = debugBuffer.slice(-50).join('\n');
        e.scrollTop = e.scrollHeight;
    }
 
    function startQuizIdScanner() {
        let scanCount = 0;
        const maxScans = 5;
 
        async function scan() {
            if (state.quizId || scanCount >= maxScans) return;
            scanCount++;
 
            const params = new URLSearchParams(location.search);
            const qidFromUrl = params.get('quizId') || params.get('kahootId');
 
            if (qidFromUrl && !state.quizId) {
                await loadQuizDataOnce(qidFromUrl);
                if (state.quizId) return;
            }
 
            if (!state.quizId) {
                for (const s of document.querySelectorAll('script')) {
                    const text = s.textContent || '';
                    const m = text.match(/(?:quizId|kahootId|quiz_id|quizUuid)['":\s]+['"]([a-f0-9-]{36})/i);
                    if (m) {
                        await loadQuizDataOnce(m[1]);
                        if (state.quizId) return;
                    }
                }
            }
 
            if (!state.quizId) {
                setTimeout(scan, 5000);
            }
        }
 
        setTimeout(scan, 2000);
    }
 
    function init() {
        const saved = loadState();
        if (saved) {
            if (saved.nickname) state.nickname = saved.nickname;
            if (saved.toggles) {
                for (const k of Object.keys(saved.toggles)) {
                    if (k in state) state[k] = saved.toggles[k];
                }
            }
        }
 
        injectCSS();
        buildPanel();
        log('Fluxus 6.0 ready');
 
        if (saved?.lastQuizId) {
            const qidInput = document.getElementById('kb-qid');
            if (qidInput) {
                qidInput.value = saved.lastQuizId;
                qidInput.title = 'Saved from last session \u2014 click Load to use, or Clear to remove';
            }
        }
 
        startPollLoop();
        startDOMObserver();
        startQuizIdScanner();
 
        if (/\/(?:challenge|solo)\//.test(location.href)) setupChallenge();
        else if (/\/(gameblock|game\/)/.test(location.href)) setupLive();
        else {
            tryAutoJoin();
            setTimeout(tryAutoJoin, 2000);
            setTimeout(tryAutoJoin, 5000);
            setTimeout(tryAutoJoin, 10000);
        }
 
        let lastUrl = location.href;
        const urlCheck = () => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                state.answeredQuestions.clear();
                state.pendingAnswers.clear();
                state.currentQuestion = -1;
                if (/\/(gameblock|game\/)/.test(lastUrl)) setupLive();
                else if (/\/(?:challenge|solo)\//.test(lastUrl)) setupChallenge();
                else tryAutoJoin();
            }
        };
        new MutationObserver(urlCheck).observe(document.body, { childList: true, subtree: true });
        window.addEventListener('popstate', urlCheck);
        window.addEventListener('hashchange', urlCheck);
    }
 
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();