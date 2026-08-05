(function() {
  'use strict';
  if (typeof Game === 'undefined') { alert('CookieGod: Cookie Clicker not detected on this page!'); return; }
  const old = document.getElementById('cookiegod-panel');
  if (old) old.remove();
  const oldToast = document.getElementById('cookiegod-toast');
  if (oldToast) oldToast.remove();

  const style = document.createElement('style');
  style.textContent = `
    #cookiegod-panel { position:fixed; top:60px; right:20px; width:360px; max-height:85vh; background:linear-gradient(160deg,#2b1a0f,#4a2c17); border:3px solid #d4a24c; border-radius:14px; box-shadow:0 8px 30px rgba(0,0,0,.6); z-index:999999; font-family:'Segoe UI',Arial,sans-serif; color:#fff2d8; overflow:hidden; display:flex; flex-direction:column; }
    #cg-header { background:linear-gradient(90deg,#7a4a1e,#a8651f); padding:10px 14px; cursor:move; display:flex; justify-content:space-between; align-items:center; user-select:none; }
    #cg-header h2 { margin:0; font-size:16px; letter-spacing:1px; text-shadow:1px 1px 2px #000; }
    #cg-header button { background:none; border:none; color:#fff; font-size:16px; cursor:pointer; margin-left:6px; }
    #cg-header button:hover { color:#ffd479; }
    #cg-tabs { display:flex; flex-wrap:wrap; background:#3a230f; padding:4px; gap:4px; }
    #cg-tabs button { flex:1 1 auto; background:#5c391b; border:none; color:#f0d9ad; padding:6px 4px; border-radius:6px; font-size:11px; cursor:pointer; min-width:60px; }
    #cg-tabs button.active { background:#d4a24c; color:#2b1a0f; font-weight:bold; }
    #cg-body { padding:10px; overflow-y:auto; flex:1; }
    .cg-section { display:none; flex-direction:column; gap:6px; }
    .cg-section.active { display:flex; }
    .cg-btn { background:#6b4322; border:1px solid #d4a24c; color:#fff2d8; padding:7px 10px; border-radius:8px; cursor:pointer; font-size:12.5px; text-align:left; transition:.15s; }
    .cg-btn:hover { background:#d4a24c; color:#2b1a0f; }
    #cg-status { font-size:11px; padding:6px 10px; background:#2b1a0f; color:#9be89b; min-height:14px; }
    #cg-footer { font-size:10px; text-align:center; padding:5px; background:#1c110a; color:#c9a06a; letter-spacing:.5px; }
    #cookiegod-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); background:linear-gradient(90deg,#7a4a1e,#d4a24c); color:#2b1a0f; font-family:'Segoe UI',Arial,sans-serif; font-weight:bold; padding:14px 26px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,.5); z-index:9999999; font-size:15px; opacity:0; transition:opacity .4s ease; text-align:center; }
    #cookiegod-toast.show { opacity:1; }
    .cg-ai-label { font-size:11px; color:#e0c185; margin-top:4px; font-weight:bold; }
    .cg-ai-input { background:#241505; border:1px solid #d4a24c; color:#fff2d8; padding:6px 8px; border-radius:6px; font-size:12px; width:100%; box-sizing:border-box; }
    .cg-ai-row { display:flex; gap:6px; }
    .cg-ai-row .cg-ai-input { flex:1; }
    .cg-ai-go { background:#d4a24c; color:#2b1a0f; border:none; border-radius:6px; padding:6px 12px; font-weight:bold; cursor:pointer; font-size:12px; white-space:nowrap; }
    .cg-ai-go:hover { background:#ffd479; }
    .cg-divider { border-top:1px solid #6b4322; margin:8px 0; }
    .cg-ai-note { font-size:10px; color:#c9a06a; line-height:1.4; }
    .cg-ai-getkey { font-size:10.5px; color:#ffd479; margin:2px 0 6px 0; }
    .cg-ai-status-line { font-size:10.5px; margin-top:4px; }
    .cg-ai-status-line.set { color:#9be89b; }
    .cg-ai-status-line.unset { color:#ff8a8a; }
  `;
  document.head.appendChild(style);

  // ===== STARTUP TOAST =====
  const toast = document.createElement('div');
  toast.id = 'cookiegod-toast';
  toast.innerHTML = '🍪 Initializing CookieGod...';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.innerHTML = '✅ CookieGod is ready!'; }, 1000);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 2200);

  const panel = document.createElement('div');
  panel.id = 'cookiegod-panel';
  panel.innerHTML = `
    <div id="cg-header">
      <h2>🍪 CookieGod</h2>
      <div>
        <button id="cg-min" title="Minimize">_</button>
        <button id="cg-close" title="Close">✕</button>
      </div>
    </div>
    <div id="cg-tabs"></div>
    <div id="cg-body"></div>
    <div id="cg-status">Ready.</div>
    <div id="cg-footer">Built by SyncX</div>
  `;
  document.body.appendChild(panel);

  const status = msg => { document.getElementById('cg-status').textContent = msg; };
  const safe = fn => { try { fn(); } catch (e) { status('Error: ' + e.message); console.error('CookieGod error:', e); } };

  window.__cgIntervals = window.__cgIntervals || {};
  const setCgInterval = (name, fn, ms) => {
    if (window.__cgIntervals[name]) return false;
    window.__cgIntervals[name] = setInterval(fn, ms);
    return true;
  };
  const clearCgInterval = (name) => { if (window.__cgIntervals[name]) { clearInterval(window.__cgIntervals[name]); window.__cgIntervals[name] = null; } };
  const clearAllCgIntervals = () => { Object.keys(window.__cgIntervals).forEach(clearCgInterval); };

  const addCookies = (n) => {
    if (typeof Game.Earn === 'function') { Game.Earn(n); }
    else { Game.cookies += n; Game.cookiesEarned += n; }
  };

  const categories = {};
  function addFeature(cat, label, fn) {
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ label, fn });
  }

  // ===== RESOURCES =====
  addFeature('Resources', '+1 Million Cookies', () => addCookies(1e6));
  addFeature('Resources', '+1 Billion Cookies', () => addCookies(1e9));
  addFeature('Resources', '+1 Trillion Cookies', () => addCookies(1e12));
  addFeature('Resources', '+1 Quadrillion Cookies', () => addCookies(1e15));
  addFeature('Resources', 'Set Cookies to 1e20', () => { Game.cookies = 1e20; Game.cookiesEarned = Math.max(Game.cookiesEarned, 1e20); });
  addFeature('Resources', 'Zero Out Cookies', () => { Game.cookies = 0; });
  addFeature('Resources', '+1000 Sugar Lumps', () => { Game.sugarLumps = (Game.sugarLumps || 0) + 1000; });
  addFeature('Resources', 'Ripen All Sugar Lumps', () => { Game.lumpT = 0; });
  addFeature('Resources', '+500 Heavenly Chips', () => { Game.heavenlyChips = (Game.heavenlyChips || 0) + 500; Game.CalculateGains(); });
  addFeature('Resources', '+100 Prestige Levels', () => { Game.prestige = (Game.prestige || 0) + 100; Game.CalculateGains(); });

  // ===== BUILDINGS =====
  addFeature('Buildings', 'Buy Max ALL Buildings', () => {
    let bought = 0;
    Game.ObjectsById.forEach(o => { let guard = 0; while (o.price <= Game.cookies && guard < 10000) { o.buy(1); bought++; guard++; } });
    status('Bought ' + bought + ' buildings total.');
  });
  addFeature('Buildings', 'Free Buildings (cost=1)', () => { Game.ObjectsById.forEach(o => o.baseCost = 1); status('Building costs reduced!'); });
  addFeature('Buildings', 'Set All Buildings to 100', () => { Game.ObjectsById.forEach(o => o.amount = 100); Game.CalculateGains(); });
  addFeature('Buildings', 'Set All Buildings to 500', () => { Game.ObjectsById.forEach(o => o.amount = 500); Game.CalculateGains(); });
  addFeature('Buildings', 'Zero All Buildings', () => { Game.ObjectsById.forEach(o => o.amount = 0); Game.CalculateGains(); });
  addFeature('Buildings', 'Max Out Cursor Only', () => { Game.Objects['Cursor'].amount = 99999; Game.CalculateGains(); });
  addFeature('Buildings', 'Max Out Grandma Only', () => { Game.Objects['Grandma'].amount = 99999; Game.CalculateGains(); });
  addFeature('Buildings', 'Max All Building Minigame Levels', () => {
    let count = 0;
    Game.ObjectsById.forEach(o => { if (o.minigame && o.minigame.level !== undefined) { o.minigame.level = 999; count++; } });
    status(count ? 'Maxed ' + count + ' minigame levels.' : 'No active minigames found.');
  });

  // ===== UPGRADES / ACHIEVEMENTS =====
  addFeature('Upgrades', 'Unlock ALL Upgrades', () => {
    Game.UpgradesById.forEach(u => { u.bought = 1; if (typeof u.unlock === 'function') { try { u.unlock(); } catch (e) {} } });
    if (typeof Game.UpdateMenu === 'function') Game.UpdateMenu();
    status('All upgrades unlocked!');
  });
  addFeature('Upgrades', 'Unlock ALL Achievements', () => { Game.AchievementsById.forEach(a => Game.Win(a.name)); status('All achievements unlocked!'); });
  addFeature('Upgrades', 'Reset All Upgrades', () => { Game.UpgradesById.forEach(u => u.bought = 0); });
  addFeature('Upgrades', 'Unlock Shadow Achievements', () => { Game.AchievementsById.forEach(a => { if (a.pool === 'shadow') Game.Win(a.name); }); });
  addFeature('Upgrades', 'Buy Cheapest Available Upgrade', () => {
    const avail = Game.UpgradesInStore.filter(u => u.canBuy());
    if (avail.length) { avail.sort((a, b) => a.getPrice() - b.getPrice()); avail[0].buy(); status('Bought: ' + avail[0].name); }
    else status('No upgrades available.');
  });

  // ===== GOLDEN COOKIES / WRATH =====
  addFeature('Golden', 'Force Spawn Golden Cookie', () => { Game.goldenCookie.time = Game.goldenCookie.minTime = Game.goldenCookie.maxTime = 1; });
  addFeature('Golden', 'Trigger Frenzy Effect', () => Game.gainBuff('Frenzy', 77, 7));
  addFeature('Golden', 'Trigger Click Frenzy Effect', () => Game.gainBuff('Click frenzy', 13, 777));
  addFeature('Golden', 'Trigger Lucky Effect', () => Game.gainBuff('Lucky', 1, 1));
  addFeature('Golden', 'Clear All Buffs', () => { Game.buffs = {}; });
  addFeature('Golden', 'Auto-Click Golden Cookies: ON', () => {
    const started = setCgInterval('golden', () => { if (Game.shimmers.length) Game.shimmers.forEach(s => { try { s.pop(); } catch (e) {} }); }, 500);
    status(started ? 'Auto-clicking golden cookies.' : 'Already running.');
  });
  addFeature('Golden', 'Auto-Click Golden Cookies: OFF', () => { clearCgInterval('golden'); status('Stopped.'); });

  // ===== AUTOMATION =====
  addFeature('Automation', 'Auto-Click Big Cookie: ON', () => { const s = setCgInterval('click', () => Game.ClickCookie(), 50); status(s ? 'Autoclicker started.' : 'Already running.'); });
  addFeature('Automation', 'Auto-Click Big Cookie: OFF', () => { clearCgInterval('click'); status('Autoclicker stopped.'); });
  addFeature('Automation', 'Auto-Buy Best Upgrade: ON', () => {
    const s = setCgInterval('upgrade', () => {
      const avail = Game.UpgradesInStore.filter(u => u.canBuy());
      if (avail.length) { avail.sort((a, b) => a.getPrice() - b.getPrice()); avail[0].buy(); }
    }, 1000);
    status(s ? 'Auto-buying upgrades.' : 'Already running.');
  });
  addFeature('Automation', 'Auto-Buy Best Upgrade: OFF', () => { clearCgInterval('upgrade'); status('Stopped.'); });
  addFeature('Automation', 'Auto-Buy Cheapest Building: ON', () => {
    const s = setCgInterval('building', () => {
      const buyable = Game.ObjectsById.filter(o => o.price <= Game.cookies);
      if (buyable.length) { buyable.sort((a, b) => a.price - b.price); buyable[0].buy(1); }
    }, 1000);
    status(s ? 'Auto-buying buildings.' : 'Already running.');
  });
  addFeature('Automation', 'Auto-Buy Cheapest Building: OFF', () => { clearCgInterval('building'); status('Stopped.'); });
  addFeature('Automation', 'God Mode (cookies never drop): ON', () => { const s = setCgInterval('god', () => { if (Game.cookies < 1e15) Game.cookies = 1e15; }, 500); status(s ? 'God mode enabled.' : 'Already running.'); });
  addFeature('Automation', 'God Mode: OFF', () => { clearCgInterval('god'); status('God mode disabled.'); });

  // ===== SEASONS / SANTA =====
  addFeature('Seasons', 'Set Season: Christmas', () => Game.season = 'christmas');
  addFeature('Seasons', 'Set Season: Halloween', () => Game.season = 'halloween');
  addFeature('Seasons', 'Set Season: Easter', () => Game.season = 'easter');
  addFeature('Seasons', 'Set Season: Valentines', () => Game.season = 'valentines');
  addFeature('Seasons', 'Set Season: None', () => Game.season = '');
  addFeature('Seasons', 'Max Santa Level', () => { Game.santaLevel = 14; });
  addFeature('Seasons', 'Reset Santa', () => { Game.santaLevel = 0; });
  addFeature('Seasons', 'Unlock All Santa Drops', () => { Game.UpgradesById.forEach(u => { if (u.pool === 'santa') { u.bought = 1; if (typeof u.unlock === 'function') { try { u.unlock(); } catch (e) {} } } }); status('Santa drops unlocked.'); });

  // ===== ASCENSION =====
  addFeature('Ascension', 'Ascend Now', () => Game.Ascend(1));
  addFeature('Ascension', 'Descend Now', () => Game.Ascend(0));
  addFeature('Ascension', 'Reset Prestige Level', () => { Game.prestige = 0; Game.CalculateGains(); });
  addFeature('Ascension', 'Unlock All Ascension Upgrades', () => { Game.UpgradesById.forEach(u => { if (u.pool === 'prestige') { u.bought = 1; if (typeof u.unlock === 'function') { try { u.unlock(); } catch (e) {} } } }); status('Ascension upgrades unlocked.'); });
  addFeature('Ascension', 'Recalculate Gains', () => Game.CalculateGains());

  // ===== WRINKLERS =====
  addFeature('Wrinklers', 'Pop All Wrinklers', () => { let n = 0; Game.wrinklers.forEach(w => { if (w.phase > 0) { w.hp = 0; n++; } }); status('Popped ' + n + ' wrinklers.'); });
  addFeature('Wrinklers', 'Spawn a Wrinkler', () => { for (let i = 0; i < Game.wrinklers.length; i++) { if (Game.wrinklers[i].phase === 0) { Game.wrinklers[i].phase = 1; break; } } });
  addFeature('Wrinklers', 'Toggle Shiny Wrinklers', () => { Game.wrinklers.forEach(w => { if (w.phase > 0) w.type = w.type === 1 ? 0 : 1; }); });
  addFeature('Wrinklers', 'Remove All Wrinklers', () => { Game.wrinklers.forEach(w => { w.phase = 0; }); });

  // ===== MISC / SETTINGS =====
  addFeature('Misc', 'Export Save to Clipboard', () => { navigator.clipboard.writeText(Game.WriteSave(1)).then(() => status('Save copied!')).catch(() => status('Clipboard blocked.')); });
  addFeature('Misc', 'Hard Reset Game', () => { if (confirm('This will WIPE your save. Continue?')) Game.HardReset(1); });
  addFeature('Misc', 'Toggle Milk', () => { Game.prefs.milk = Game.prefs.milk ? 0 : 1; });
  addFeature('Misc', 'Toggle Particles', () => { Game.prefs.particles = Game.prefs.particles ? 0 : 1; });
  addFeature('Misc', 'Toggle Fancy Graphics', () => { Game.prefs.fancy = Game.prefs.fancy ? 0 : 1; });
  addFeature('Misc', 'Mute Sound', () => { Game.prefs.music = 0; Game.prefs.sfx = 0; if (typeof Game.UpdatePrefs === 'function') Game.UpdatePrefs(); });
  addFeature('Misc', 'Unmute Sound', () => { Game.prefs.music = 1; Game.prefs.sfx = 1; if (typeof Game.UpdatePrefs === 'function') Game.UpdatePrefs(); });
  addFeature('Misc', 'Force Save Game', () => { Game.Save(); status('Game saved.'); });
  addFeature('Misc', 'Trigger Grandmapocalypse', () => { Game.elderWrath = 1; Game.elderWraith = 1; });
  addFeature('Misc', 'Stop Grandmapocalypse', () => { Game.elderWrath = 0; Game.elderWraith = 0; });

  // ===== BUILD STATIC TABS =====
  const tabNames = Object.keys(categories);
  const tabsDiv = document.getElementById('cg-tabs');
  const bodyDiv = document.getElementById('cg-body');
  const sectionEls = {};

  function buildTab(cat, index) {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.onclick = () => {
      document.querySelectorAll('#cg-tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.cg-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      sectionEls[cat].classList.add('active');
    };
    if (index === 0) btn.classList.add('active');
    tabsDiv.appendChild(btn);

    const section = document.createElement('div');
    section.className = 'cg-section' + (index === 0 ? ' active' : '');
    sectionEls[cat] = section;
    bodyDiv.appendChild(section);
    return section;
  }

  tabNames.forEach((cat, i) => {
    const section = buildTab(cat, i);
    categories[cat].forEach(feat => {
      const b = document.createElement('button');
      b.className = 'cg-btn';
      b.textContent = feat.label;
      b.onclick = () => safe(feat.fn);
      section.appendChild(b);
    });
  });

  // ===== AI ADDED FEATURES TAB =====
  const aiFeaturesSection = buildTab('AI Added', tabNames.length);
  const noAiYet = document.createElement('div');
  noAiYet.className = 'cg-ai-note';
  noAiYet.textContent = 'Buttons you generate in the AI tab will appear here.';
  aiFeaturesSection.appendChild(noAiYet);

  function addAiButton(label, code) {
    if (noAiYet.parentNode) noAiYet.remove();
    const b = document.createElement('button');
    b.className = 'cg-btn';
    b.textContent = '✨ ' + label;
    b.title = code;
    b.onclick = () => safe(() => { new Function('Game', 'status', 'addCookies', code)(Game, status, addCookies); });
    aiFeaturesSection.appendChild(b);
  }

  // ===== AI TAB =====
  const aiTab = buildTab('AI', tabNames.length + 1);
  aiTab.innerHTML = `
    <div class="cg-ai-label">Add AI API Key</div>
    <div class="cg-ai-getkey">You can get a free key from <b>groq.com</b> → console.groq.com → API Keys</div>
    <div class="cg-ai-row">
      <input type="password" id="cg-ai-key" class="cg-ai-input" placeholder="Paste your Groq key here" />
      <button class="cg-ai-go" id="cg-ai-add-key">Add</button>
    </div>
    <div class="cg-ai-status-line unset" id="cg-ai-key-status">No key added yet.</div>
    <div class="cg-divider"></div>
    <div class="cg-ai-label">Describe what you want added or done</div>
    <textarea id="cg-ai-prompt" class="cg-ai-input" rows="3" placeholder="e.g. add a button that unlocks every kitten upgrade"></textarea>
    <div class="cg-ai-row">
      <button class="cg-ai-go" id="cg-ai-run">Ask CookieGod AI</button>
    </div>
    <div class="cg-ai-note" id="cg-ai-result" style="margin-top:6px;"></div>
    <div class="cg-divider"></div>
    <div class="cg-ai-note">The AI can only interact with the Cookie Clicker <code>Game</code> object — nothing outside the game. New buttons show up under the "AI Added" tab. Hover a button to see its code before relying on it.</div>
  `;

  const keyInput = aiTab.querySelector('#cg-ai-key');
  const keyStatusEl = aiTab.querySelector('#cg-ai-key-status');
  const savedKey = localStorage.getItem('cookiegod_groq_key') || '';

  function refreshKeyStatus() {
    const k = localStorage.getItem('cookiegod_groq_key') || '';
    if (k) {
      keyStatusEl.textContent = '✅ Key added (' + k.slice(0, 6) + '••••••••).';
      keyStatusEl.className = 'cg-ai-status-line set';
    } else {
      keyStatusEl.textContent = '⚠️ No key added yet.';
      keyStatusEl.className = 'cg-ai-status-line unset';
    }
  }
  refreshKeyStatus();
  if (savedKey) keyInput.placeholder = 'Key already saved — paste a new one to replace it';

  aiTab.querySelector('#cg-ai-add-key').onclick = () => {
    const val = keyInput.value.trim();
    if (!val) { keyStatusEl.textContent = '⚠️ Paste a key first.'; keyStatusEl.className = 'cg-ai-status-line unset'; return; }
    localStorage.setItem('cookiegod_groq_key', val);
    keyInput.value = '';
    refreshKeyStatus();
    status('AI key added.');
  };

  aiTab.querySelector('#cg-ai-run').onclick = async () => {
    const resultEl = aiTab.querySelector('#cg-ai-result');
    const promptEl = aiTab.querySelector('#cg-ai-prompt');
    const userReq = promptEl.value.trim();
    const key = localStorage.getItem('cookiegod_groq_key') || '';

    if (!key) { resultEl.textContent = '⚠️ Add your AI API key above first (get one free from groq.com).'; return; }
    if (!userReq) { resultEl.textContent = '⚠️ Describe what you want.'; return; }

    resultEl.textContent = '⏳ Thinking...';
    status('AI generating feature...');

    const sysPrompt = `You are a code generator for a Cookie Clicker (the browser game) cheat panel called CookieGod.
You will receive a plain-English request from the user. Respond with STRICT JSON ONLY, no markdown fences, no commentary, in this exact shape:
{"label": "Short Button Label", "code": "JAVASCRIPT_CODE_HERE"}

Rules for "code":
- It runs inside a function(Game, status, addCookies) { ...code... } — you have access to the variables Game, status(msg), and addCookies(n).
- "Game" is the Cookie Clicker global game object (Game.cookies, Game.ObjectsById, Game.UpgradesById, Game.AchievementsById, Game.Objects[name], Game.CalculateGains(), Game.Earn(n), Game.Win(name), etc.)
- Only touch the Game object and the provided helpers. Never reference window, document, localStorage, fetch, eval, or anything outside Game.
- Keep it short, safe, wrap risky loops with a guard so nothing can infinite loop.
- Call status('...') at the end with a short confirmation message.
- Do not include explanations, only the JSON object.`;

    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userReq }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        resultEl.textContent = '❌ API error (' + resp.status + '). Check your key.';
        console.error('CookieGod AI error:', errText);
        return;
      }

      const data = await resp.json();
      let raw = data.choices?.[0]?.message?.content?.trim() || '';
      raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { resultEl.textContent = '❌ Could not parse AI response. Try rephrasing.'; console.error('Raw AI response:', raw); return; }

      if (!parsed.label || !parsed.code) { resultEl.textContent = '❌ AI response missing label/code.'; return; }

      addAiButton(parsed.label, parsed.code);
      document.querySelectorAll('#cg-tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.cg-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('#cg-tabs button')[tabNames.length].classList.add('active');
      aiFeaturesSection.classList.add('active');

      resultEl.textContent = '✅ Added "' + parsed.label + '" to the AI Added tab!';
      promptEl.value = '';
      status('AI feature added: ' + parsed.label);
    } catch (e) {
      resultEl.textContent = '❌ Request failed: ' + e.message;
      console.error(e);
    }
  };

  // Dragging
  let isDragging = false, offsetX = 0, offsetY = 0;
  const header = document.getElementById('cg-header');
  header.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
  });
  document.addEventListener('mousemove', e => {
    if (isDragging) {
      panel.style.left = (e.clientX - offsetX) + 'px';
      panel.style.top = (e.clientY - offsetY) + 'px';
      panel.style.right = 'auto';
    }
  });
  document.addEventListener('mouseup', () => isDragging = false);

  // ===== CLOSE WITH WARNING =====
  document.getElementById('cg-close').onclick = () => {
    const sure = confirm('⚠️ Closing CookieGod will shut down the entire panel and stop any running automations (autoclicker, auto-buy, god mode, etc).\n\nAre you sure you want to close CookieGod?');
    if (sure) { clearAllCgIntervals(); panel.remove(); }
  };

  document.getElementById('cg-min').onclick = () => {
    const body = document.getElementById('cg-body');
    const tabs = document.getElementById('cg-tabs');
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? 'block' : 'none';
    tabs.style.display = hidden ? 'flex' : 'none';
  };

  const total = tabNames.reduce((n, c) => n + categories[c].length, 0);
  status('CookieGod loaded — ' + total + ' features ready.');
})();