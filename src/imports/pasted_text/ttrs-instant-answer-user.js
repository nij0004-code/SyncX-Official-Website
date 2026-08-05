// ==UserScript==
// @name         TTRS Hack Instant Answer (2026) WORKING!
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Cool hack that works and be careful that if you set the time too low the TTRS anti-cheat systems will boot you off (I am not liable to and account bans or anything like that)
// @match        https://play.ttrockstars.com/*
// @grant        none
// @license      MIT
// @author       SYNCX
// @downloadURL https://update.greasyfork.org/scripts/566343/TTRS%20Hack%20Instant%20Answer%20%282026%29%20WORKING%21.user.js
// @updateURL https://update.greasyfork.org/scripts/566343/TTRS%20Hack%20Instant%20Answer%20%282026%29%20WORKING%21.meta.js
// ==/UserScript==

/*
MIT License

Copyright (c) 2026 AJM-123

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/



(function() {
  'use strict';

  let delayMs = 500; // default

  // ===== Corner GUI =====
  const gui = document.createElement('div');
  Object.assign(gui.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'linear-gradient(135deg, #141e30, #243b55)',
    color: '#fff',
    padding: '14px 18px',
    borderRadius: '12px',
    zIndex: '99999',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontSize: '14px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.6)'
  });

  const status = document.createElement('div');
  status.textContent = 'Hack is OFF (Press M)';
  status.style.marginBottom = '10px';
  status.style.fontWeight = 'bold';

  const delayRow = document.createElement('div');
  delayRow.style.display = 'flex';
  delayRow.style.alignItems = 'center';
  delayRow.style.gap = '6px';

  const delayLabel = document.createElement('label');
  delayLabel.textContent = 'Answer delay (seconds):';

  const delayInput = document.createElement('input');
  delayInput.type = 'number';
  delayInput.value = String(delayMs/1000);
  delayInput.step = '0.01';
  Object.assign(delayInput.style, {
    width: '80px',
    padding: '4px',
    borderRadius: '6px',
    border: '1px solid #555',
    background: '#1c1c1c',
    color: '#00c6ff',
    textAlign: 'center',
    fontWeight: 'bold'
  });

  delayRow.appendChild(delayLabel);
  delayRow.appendChild(delayInput);
  gui.appendChild(status);
  gui.appendChild(delayRow);
  document.body.appendChild(gui);

  // ===== Fullscreen Overlay =====
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.9)',
    color: '#00ffcc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontWeight: 'bold',
    zIndex: '100000',
    textAlign: 'center',
    letterSpacing: '2px',
    visibility: 'hidden'
  });
  overlay.textContent = 'CTRL+A TO START!';
  document.body.appendChild(overlay);

  // ===== Explosion Animation =====
  function showExplosion() {
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * 300;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      Object.assign(particle.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: `hsl(${Math.random()*360}, 100%, 50%)`,
        zIndex: '100001',
        animation: `particleAnim 0.8s ease-out forwards`,
        transform: 'translate(-50%, -50%)'
      });
      particle.style.setProperty('--dx', dx + 'px');
      particle.style.setProperty('--dy', dy + 'px');
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 800);
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes particleAnim {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
      70% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.2); opacity: 0.9; }
      100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.8); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Expose for Part 2
  window.ttrsHack = { status, delayInput, overlay, showExplosion };
})();
// ===== Part 2: Hack Logic + Events =====
(function () {
  'use strict';

  // Grab GUI elements from Part 1
  const { status, delayInput, overlay, showExplosion } = window.ttrsHack;

  let tickHandle = null;
  let autoEnabled = false;
  let delayMs = parseFloat(delayInput.value) * 1000 || 500;

  // Select-all mimic
  function trySelectAll(el) {
    if (!el) return false;
    const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
    const text = isInput ? (el.value ?? '') : (el.textContent ?? '');
    const len = text.length;

    if (isInput && typeof el.setSelectionRange === 'function') {
      try { el.setSelectionRange(0, len); return true; } catch (_) {}
    }
    if (isInput && typeof el.select === 'function') {
      try { el.select(); return true; } catch (_) {}
    }
    if (el.isContentEditable) {
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      } catch (_) {}
    }
    return false;
  }

  function selectAllTick() {
    const el = document.activeElement;
    if (!el) return false;
    return trySelectAll(el);
  }

  // Auto-click center
  function autoClickCenter() {
    const x = Math.floor(window.innerWidth / 2);
    const y = Math.floor(window.innerHeight / 2);
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const opts = { bubbles: true, clientX: x, clientY: y };
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function tick() {
    selectAllTick();
    autoClickCenter();
  }

  // Hack control
  function startAuto() {
    stopAuto();
    delayMs = parseFloat(delayInput.value) * 1000 || delayMs;
    autoEnabled = true;
    status.textContent = 'Hack is ON (Press M to stop)';
    overlay.style.visibility = 'visible';
    tick();
    tickHandle = setInterval(tick, delayMs);
  }

  function stopAuto() {
    autoEnabled = false;
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
    status.textContent = 'Hack is OFF (Press M to start)';
    overlay.style.visibility = 'hidden';
  }

  function toggleAuto() {
    if (autoEnabled) stopAuto();
    else startAuto();
  }

  // Events
  delayInput.addEventListener('change', () => {
    delayMs = parseFloat(delayInput.value) * 1000 || delayMs;
    delayInput.value = String(delayMs / 1000);
    if (autoEnabled) startAuto();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key && e.key.toLowerCase() === 'm') {
      toggleAuto();
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'a' && autoEnabled) {
      overlay.style.visibility = 'hidden';
    }
  });

  // Auto-answer mechanics
  function pressKey(key) {
    const isEnter = key === 'Enter';
    const code = isEnter ? 'Enter' : (/^\d$/.test(key) ? `Digit${key}` : key);
    const keyCode = isEnter ? 13 : key.charCodeAt(0);
    const init = { key, code, keyCode, which: keyCode, bubbles: true };
    const target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', init));
    target.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  function typeAnswer(answer) {
    const str = String(answer);
    selectAllTick();
    for (let i = 0; i < str.length; i++) pressKey(str[i]);
    pressKey('Enter');
    showExplosion();
  }

  document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) return;
    const lines = selectedText.split('\n').map(line => line.trim());
    const equationLine = lines.find(line =>
      /^[\d\s×÷\+\-\*\/=]+$/.test(line) &&
      /[\d]+.*[×÷\*\/\+\-]/.test(line) &&
      !line.toLowerCase().includes('next')
    );
    if (equationLine) {
      const cleaned = equationLine.replace(/=/g,'').replace(/×/g,'*').replace(/÷/g,'/').trim();
      try {
        const result = eval(cleaned);
        if (!isNaN(result)) typeAnswer(result);
      } catch(e) { console.warn('Invalid equation:', cleaned, e); }
    }
  });
})();