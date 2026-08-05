/ ==UserScript==
// @name         K-Bot | Kahoot Answer Viewer & Auto-Answer Cheat Mod Menu (Working 2026) 
// @version      2.1
// @namespace    syncx
// @description  A minimalist Kahoot mod menu. Features a live answer viewer and automated responding.
// @author       SYNCX
// @match        https://kahoot.it/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kahoot.it
// @license      MIT
// @grant        none
// ==/UserScript==
 
(function() {
    'use strict';
 
    // ─── Config ───────────────────────────────────────────────────────────────────
    const VERSION = '2.1';
    const MULTI_SELECT_STAGGER_MS = 60;
 
    // ─── State ────────────────────────────────────────────────────────────────────
    const state = {
        questions: [],
        numQuestions: 0,
        questionNum: -1,
        lastAnsweredQuestion: -1,
        baseDelay: 0,
        randomDelay: 0,
        autoAnswer: false,
        showAnswers: false,
    };
 
    // Keep track of DOM values to avoid redundant updates
    let lastProcessedQuestionText = "";
 
    // ─── DOM Helpers ──────────────────────────────────────────────────────────────
    function queryBySelector(value, tag = '*') {
        return document.querySelector(`${tag}[data-functional-selector="${value}"]`);
    }
 
    function createElement(tag, { styles = {}, className, text } = {}) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text)      el.textContent = text;
        Object.assign(el.style, styles);
        return el;
    }
 
    // ─── Inject Assets ────────────────────────────────────────────────────────────
    const fontLink = document.createElement('link');
    fontLink.rel  = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
    document.head.appendChild(fontLink);
 
    const globalStyle = document.createElement('style');
globalStyle.textContent = `
        .kb-ui * {
            box-sizing: border-box;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .kb-ui button, .kb-input, .kb-switch-track::before {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kb-ui {
            /* 85% Opacity Backgrounds */
            --bg: rgba(15, 15, 15, 0.75);
            --surface: rgba(24, 24, 24, 0.75);
            --border: rgba(255, 255, 255, 0.1);
            --accent: #f0f0f0;
            --muted: #888;
            --green: #4caf74;
            --red: #c0392b;
            --text: #d8d8d8;
            --label: #aaa;
 
            /* Frosted Glass Effect */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .kb-handle {
            cursor: grab;
            user-select: none;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
        }
        .kb-handle:active { cursor: grabbing; }
 
        .kb-input {
            width: 100% !important;
            background-color: rgba(0, 0, 0, 0.3) !important;
            border: 1px solid var(--border) !important;
            color: #ffffff !important;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 600;
            padding: 5px 8px;
            outline: none;
            transition: all 0.2s ease;
            margin-top: 8px;
        }
        .kb-input:focus { border-color: rgba(255, 255, 255, 0.4) !important; }
        .kb-input.ok  { border-color: var(--green) !important; background: rgba(13, 46, 26, 0.6) !important; }
        .kb-input.err { border-color: var(--red) !important; background: rgba(46, 13, 13, 0.6) !important; }
 
        .kb-slider-wrap  { display: flex; flex-direction: column; gap: 3px; }
        .kb-slider-label { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .kb-slider-label span { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
 
        .kb-range {
            -webkit-appearance: none;
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            outline: none;
        }
        .kb-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            background: var(--accent);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
 
        .kb-toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid var(--border);
        }
        .kb-toggle-label { color: var(--text); font-size: 13px; font-weight: 600; }
 
        .kb-switch { position: relative; width: 34px; height: 18px; }
        .kb-switch input { opacity: 0; width: 0; height: 0; }
        .kb-switch-track {
            position: absolute;
            inset: 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            cursor: pointer;
            transition: 0.3s;
        }
        .kb-switch-track::before {
            content: '';
            position: absolute;
            width: 12px;
            height: 12px;
            left: 3px;
            top: 3px;
            background: #777;
            border-radius: 50%;
            transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kb-switch input:checked + .kb-switch-track { background: rgba(76, 175, 116, 0.3); }
        .kb-switch input:checked + .kb-switch-track::before {
            transform: translateX(16px);
            background: var(--green);
            box-shadow: 0 0 8px var(--green);
        }
 
        .kb-divider { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
        .kb-section-title {
            color: var(--muted);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 3px;
            text-align: center;
        }
        .kb-stat { color: var(--accent); font-size: 18px; font-weight: 700; text-align: center; margin-top: 15px;}
        .kb-credit { color: #666; font-size: 13px; text-align: center; margin-top: 2px; font-weight: 600; }
    `;
    document.head.appendChild(globalStyle);
 
    // ─── UI Construction ──────────────────────────────────────────────────────────
    const uiElement = createElement('div', {
        className: 'kb-ui',
        styles: { position: 'fixed', top: '5%', left: '5%', width: '240px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)', zIndex: '9999' }
    });
 
    const handle = createElement('div', {
        className: 'kb-handle',
        styles: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }
    });
 
    handle.append(createElement('span', { text: 'K-Bot v'+VERSION, styles: { color: 'var(--accent)', fontSize: '13px', fontWeight: '700' } }));
 
    const titleControls = createElement('div', { styles: { display: 'flex', gap: '5px' } });
    const minimizeButton = createElement('button', { text: '-', styles: { background: '#888', border: 'none', width: '22px', height: '20px', cursor: 'pointer', borderRadius: '3px', color: '#fff', fontWeight: '800',} });
    const closeButton = createElement('button', { text: '✕', styles: { background: '#c0392b', color: '#fff', border: 'none', width: '22px', height: '20px', cursor: 'pointer', borderRadius: '3px', fontWeight: '800',} });
 
    titleControls.append(minimizeButton, closeButton);
    handle.append(titleControls);
    uiElement.appendChild(handle);
 
    const body = createElement('div', { styles: { padding: '15px', display: 'flex', flexDirection: 'column', gap: '6px' } });
    uiElement.appendChild(body);
 
    // Quiz ID Input
    const quizSection = document.createElement('div');
    quizSection.append(createElement('div', { className: 'kb-section-title', text: 'Quiz ID' }));
    const inputBox = createElement('input', { className: 'kb-input' });
    inputBox.placeholder = 'Enter Quiz ID (NOT PIN)';
    quizSection.appendChild(inputBox);
    body.appendChild(quizSection);
    body.appendChild(createElement('hr', { className: 'kb-divider' }));
 
    // Sliders
    function makeSlider(labelText, { min, max, step, value }, onInput) {
        const wrap = createElement('div', { className: 'kb-slider-wrap' });
        const labelRow = createElement('div', { className: 'kb-slider-label' });
        const valSpan = createElement('span', { text: `${value} ms`, styles: { color: 'var(--accent)' } });
        labelRow.append(createElement('span', { text: labelText, styles: { color: 'var(--label)' } }), valSpan);
        const input = createElement('input', { className: 'kb-range' });
        input.type = 'range'; Object.assign(input, { min, max, step, value });
        input.oninput = () => { valSpan.textContent = `${input.value} ms`; onInput(+input.value); };
        wrap.append(labelRow, input);
        return wrap;
    }
 
    body.appendChild(createElement('div', { className: 'kb-section-title', text: 'Delay' }));
    body.appendChild(makeSlider('Base', { min: 0, max: 10000, step: 100, value: state.baseDelay }, v => state.baseDelay = v));
    body.appendChild(makeSlider('Random ±', { min: 0, max: 5000, step: 100, value: state.randomDelay }, v => state.randomDelay = v));
    body.appendChild(createElement('hr', { className: 'kb-divider' }));
 
    // Toggles
    function makeToggle(label, key) {
        const row = createElement('div', { className: 'kb-toggle-row' });
        row.append(createElement('span', { className: 'kb-toggle-label', text: label }));
        const sw = createElement('label', { className: 'kb-switch' });
        const input = document.createElement('input'); input.type = 'checkbox';
        input.onchange = () => state[key] = input.checked;
        sw.append(input, createElement('span', { className: 'kb-switch-track' }));
        row.append(sw);
        return row;
    }
 
    body.appendChild(createElement('div', { className: 'kb-section-title', text: 'Answering' }));
    body.appendChild(makeToggle('Auto Answer', 'autoAnswer'));
    body.appendChild(makeToggle('Show Answers', 'showAnswers'));
 
    const questionsLabel = createElement('div', { className: 'kb-stat', text: 'Question 0 / 0' });
    body.appendChild(questionsLabel);
    body.appendChild(createElement('div', { className: 'kb-credit', text: `v${VERSION} · juanbolsa` }));
    document.body.appendChild(uiElement);
 
    // ─── Logic ────────────────────────────────────────────────────────────────────
 
    function triggerReactClick(btn) {
        const fiberKey = Object.keys(btn).find((k) => k.startsWith('__reactFiber'));
        if (!fiberKey) return;
 
        let fiber = btn[fiberKey];
        while (fiber) {
            const onClick = fiber.memoizedProps?.onClick;
            if (onClick) {
                const nativeEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
                const trusted = new Proxy(nativeEvent, {
                    get(target, prop) {
                        if (prop === 'isTrusted') return true;
                        const val = target[prop];
                        return typeof val === 'function' ? val.bind(target) : val;
                    },
                });
                onClick(trusted);
                return;
            }
            fiber = fiber.return;
        }
    }
 
    function answer(question, delay) {
        const performClick = (idx) => {
            const btn = queryBySelector(`answer-${idx}`, 'button');
            if (btn) triggerReactClick(btn);
        };
 
        if (question.type === 'quiz') {
            setTimeout(() => performClick(question.answers[0]), delay);
        } else if (question.type === 'multiple_select_quiz') {
            question.answers.forEach((ans, i) => {
                setTimeout(() => performClick(ans), delay + (i * MULTI_SELECT_STAGGER_MS));
            });
            setTimeout(() => {
                const submit = queryBySelector('multi-select-submit-button', 'button');
                if (submit) triggerReactClick(submit);
            }, delay + (question.answers.length * MULTI_SELECT_STAGGER_MS));
        }
    }
 
    function highlightAnswers(question) {
        question.answers.forEach(i => {
            const btn = queryBySelector(`answer-${i}`, 'button');
            if (btn) btn.style.backgroundColor = 'rgb(0,255,0)';
        });
        question.incorrectAnswers?.forEach(i => {
            const btn = queryBySelector(`answer-${i}`, 'button');
            if (btn) btn.style.backgroundColor = 'rgb(255,0,0)';
        });
    }
 
    function parseQuestions(raw) {
        return raw.map(q => {
            const p = { type: q.type, time: q.time, answers: [] };
            if (q.choices) {
                p.incorrectAnswers = [];
                q.choices.forEach((c, i) => (c.correct ? p.answers : p.incorrectAnswers).push(i));
            }
            return p;
        });
    }
 
    // ─── The Main Loop (Optimized) ────────────────────────────────────────────────
    function pollFrame() {
        const counterEl = queryBySelector('question-index-counter', 'div');
        const currentText = counterEl ? counterEl.textContent : "";
 
        // DIRTY CHECK: Only run logic if the question number text actually changed
        if (currentText !== lastProcessedQuestionText) {
            lastProcessedQuestionText = currentText;
 
            if (currentText) {
                state.questionNum = parseInt(currentText) - 1;
                questionsLabel.textContent = `Question ${state.questionNum + 1} / ${state.numQuestions}`;
            }
        }
 
        // Check if buttons are ready and we haven't answered this specific question index yet
        const firstBtn = queryBySelector('answer-0', 'button');
        if (firstBtn && state.lastAnsweredQuestion !== state.questionNum) {
            state.lastAnsweredQuestion = state.questionNum;
            const qData = state.questions[state.questionNum];
            if (qData) {
                if (state.showAnswers) highlightAnswers(qData);
                if (state.autoAnswer) answer(qData, state.baseDelay + Math.floor(Math.random() * state.randomDelay));
            }
        }
 
        requestAnimationFrame(pollFrame);
    }
 
    // ─── Event Handlers ──────────────────────────────────────────────────────────
    inputBox.oninput = async () => {
        const id = inputBox.value.trim();
        inputBox.className = 'kb-input';
        if (!id) return;
        try {
            const res = await fetch(`https://kahoot.it/rest/kahoots/${id}`);
            if (!res.ok) throw 1;
            const data = await res.json();
            state.questions = parseQuestions(data.questions);
            state.numQuestions = state.questions.length;
            inputBox.classList.add('ok');
            questionsLabel.textContent = `Question 1 / ${state.numQuestions}`;
        } catch(e) {
            inputBox.classList.add('err');
        }
    };
 
    minimizeButton.onclick = () => {
        const isMin = body.style.display === 'none';
        body.style.display = isMin ? 'flex' : 'none';
        minimizeButton.textContent = isMin ? '-' : '+';
    };
 
    closeButton.onclick = () => uiElement.remove();
 
    // Draggable Logic
    let dragging = false, offset = [0,0];
    handle.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        dragging = true;
        const rect = uiElement.getBoundingClientRect();
        offset = [e.clientX - rect.left, e.clientY - rect.top];
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        uiElement.style.left = `${e.clientX - offset[0]}px`;
        uiElement.style.top = `${e.clientY - offset[1]}px`;
    });
    document.addEventListener('mouseup', () => dragging = false);
 
    // Start
    requestAnimationFrame(pollFrame);
 
})();