// GhostPhish Pro v3.0 - background.js

const BACKEND_URL = 'http://127.0.0.1:5000';
const GP_HISTORY  = 'gp_history';

// ── ON/OFF ──────────────────────────────────────
async function isEnabled() {
  const d = await chrome.storage.local.get('ghostphish_enabled');
  return d.ghostphish_enabled !== false;
}
function setIcon(on) {
  chrome.action.setBadgeText({ text: on ? '' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: on ? '#ff3333' : '#555555' });
}
chrome.storage.local.get('ghostphish_enabled', d => setIcon(d.ghostphish_enabled !== false));

// ── HEURISTIC ────────────────────────────────────
function localScan(url) {
  let score = 0;
  const reasons = [];
  const lower = url.toLowerCase();

  const keywords = ['login','secure','verify','update','bank','free','gift',
    'account','password','confirm','signin','paypal','invoice',
    'support','billing','wallet','crypto','urgent','suspended'];
  keywords.forEach(w => {
    if (lower.includes(w)) { score += 2; reasons.push('Keyword: "' + w + '"'); }
  });

  if (/\d+\.\d+\.\d+\.\d+/.test(url)) { score += 5; reasons.push('IP address used as domain'); }
  if (url.length > 80)      { score += 2; reasons.push('Very long URL (' + url.length + ')'); }
  else if (url.length > 55) { score += 1; reasons.push('Long URL (' + url.length + ')'); }

  try {
    const { hostname, protocol } = new URL(url);
    if (protocol === 'http:')                        { score += 3; reasons.push('HTTP - No encryption (data at risk!)'); }
    if (hostname.includes('xn--'))                   { score += 4; reasons.push('Punycode/IDN domain (homograph attack)'); }
    if (hostname.split('.').length > 4)              { score += 2; reasons.push('Too many subdomains'); }
    if ((hostname.match(/-/g)||[]).length >= 2)      { score += 2; reasons.push('Hyphen abuse in domain'); }
    if (/\d{4,}/.test(hostname))                     { score += 2; reasons.push('Long number in domain'); }
    const tld = hostname.split('.').pop();
    if (['tk','ml','ga','cf','gq','xyz','top','club','pw','zip'].includes(tld)) {
      score += 3; reasons.push('Risky free TLD: .' + tld);
    }
    ['paypa1','g00gle','arnazon','micros0ft','faceb00k','app1e'].forEach(b => {
      if (hostname.includes(b)) { score += 5; reasons.push('Brand lookalike: ' + b); }
    });
  } catch(e) { score += 2; reasons.push('Malformed URL'); }

  if (['bit.ly','tinyurl','t.co','goo.gl','ow.ly'].some(s => url.includes(s))) {
    score += 3; reasons.push('URL shortener (hides real destination)');
  }
  if ((url.match(/https?:\/\//g)||[]).length > 1) {
    score += 3; reasons.push('Redirect chain embedded in URL');
  }

  return { score: Math.min(score, 20), reasons };
}

function getLevel(score) {
  if (score >= 12) return 'CRITICAL';
  if (score >= 7)  return 'HIGH';
  if (score >= 4)  return 'MEDIUM';
  return 'LOW';
}

// ── SAVE HISTORY ─────────────────────────────────
function saveHistory(url, score, level, reasons) {
  chrome.storage.local.get(GP_HISTORY, (res) => {
    if (chrome.runtime.lastError) return;
    const list = res[GP_HISTORY] || [];
    const now  = Date.now();
    if (list.length && list[0].url === url && now - list[0].time < 30000) return;
    list.unshift({ url, score, level, reasons, source:'local', blocked: score>=12, warned: score>=7, time: now });
    if (list.length > 500) list.length = 500;
    chrome.storage.local.set({ [GP_HISTORY]: list });
  });
}

// ── BANNER ───────────────────────────────────────
function showBanner(tabId, score, level, reasons) {
  const colors = {
    CRITICAL: '#ff2222', HIGH: '#ff5500', MEDIUM: '#ffaa00', LOW: '#00ee77'
  };
  const col = colors[level] || '#ffaa00';
  chrome.scripting.executeScript({
    target: { tabId },
    func: (score, level, reasons, col) => {
      if (document.getElementById('gp-banner')) return;

      // FIX: HTML escape to prevent XSS
      function esc(s) {
        return String(s)
          .replace(/&/g,'&amp;').replace(/</g,'&lt;')
          .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      }

      const safeLevel   = esc(level);
      const safeScore   = esc(String(score));
      const safeReasons = reasons.slice(0,2).map(esc).join(' · ');

      const b = document.createElement('div');
      b.id = 'gp-banner';
      b.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:2147483647;background:#040f16;border-bottom:2px solid '+col+';padding:10px 18px;display:flex;align-items:center;gap:14px;font-family:monospace;box-shadow:0 4px 20px '+col+'44';
      b.innerHTML = '<span style="font-size:22px">👻</span><div style="flex:1"><b style="color:'+col+';font-size:12px;letter-spacing:1px">⚠ GHOSTPHISH — '+safeLevel+' RISK | Score: '+safeScore+'/20</b><div style="color:'+col+'bb;font-size:10px;margin-top:2px">'+safeReasons+'</div></div><button onclick="this.parentNode.remove()" style="background:none;border:1px solid '+col+';color:'+col+';padding:3px 10px;cursor:pointer;font-family:monospace;font-size:10px">✕</button>';
      document.body.prepend(b);
    },
    args: [score, level, reasons, col]
  }).catch(() => {});
}

function blockPage(tabId, url, score, reasons) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (url, score, reasons) => {

      // FIX: HTML escape to prevent XSS
      function esc(s) {
        return String(s)
          .replace(/&/g,'&amp;').replace(/</g,'&lt;')
          .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      }

      // FIX: Validate URL before allowing navigation
      function isSafeUrl(u) {
        try {
          const p = new URL(u).protocol;
          return p === 'http:' || p === 'https:';
        } catch { return false; }
      }

      const safeUrl   = esc(url);
      const safeScore = esc(String(score));
      const rHtml = reasons.slice(0,5).map(r => '<div class="r">&#9889; ' + esc(r) + '</div>').join('');

      const html = '<!DOCTYPE html><html><head><title>BLOCKED</title>'
        + '<style>*{margin:0;padding:0}body{background:#060606;color:#ff3333;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}'
        + '.b{text-align:center;max-width:660px;padding:40px;border:1px solid #300;background:#0c0c0c}'
        + 'h1{font-size:26px;letter-spacing:4px;margin:16px 0 6px}'
        + '.r{text-align:left;padding:6px 10px;border-left:2px solid #f22;margin:3px 0;font-size:11px;background:#100}'
        + '.url{padding:8px;margin:14px 0;border:1px solid #300;word-break:break-all;font-size:10px;color:#633}'
        + '.btns{display:flex;gap:10px;justify-content:center;margin-top:18px}'
        + 'button{padding:9px 22px;cursor:pointer;font-family:monospace}'
        + '.safe{background:#f00;color:#000;border:none}'
        + '.risk{background:none;color:#444;border:1px solid #222}'
        + '</style></head><body><div class="b">'
        + '<div style="font-size:60px">&#128123;</div>'
        + '<h1>BLOCKED</h1>'
        + '<div style="color:#444;font-size:11px;letter-spacing:2px;margin-bottom:14px">CRITICAL THREAT &mdash; Score: ' + safeScore + '/20</div>'
        + rHtml
        + '<div class="url">' + safeUrl + '</div>'
        + '<div class="btns">'
        + '<button class="safe" onclick="history.back()">&larr; GO BACK (SAFE)</button>'
        + '<button class="risk" id="pb">Proceed Anyway</button>'
        + '</div></div></body></html>';

      document.open(); document.write(html); document.close();

      // FIX: Use event listener, validate URL before navigation
      const pb = document.getElementById('pb');
      if (pb) {
        pb.addEventListener('click', function() {
          if (isSafeUrl(url)) { window.location.href = url; }
          else { history.back(); }
        });
      }
    },
    args: [url, score, reasons]
  }).catch(() => {});
}

function notify(title, msg) {
  chrome.notifications.create({ type:'basic', iconUrl:'icons/ghostphish-48.png', title, message: msg });
}

// ── MAIN SCAN ────────────────────────────────────
function doScan(tabId, url) {
  if (!url) return;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('data:') || url.startsWith('moz-extension://')) return;

  const { score, reasons } = localScan(url);
  const level = getLevel(score);

  saveHistory(url, score, level, reasons);
  chrome.storage.local.set({ ['tab_' + tabId]: { url, score, level, reasons, source:'local', time: Date.now() } });

  if (score >= 12) {
    blockPage(tabId, url, score, reasons);
    notify('🚨 GhostPhish CRITICAL', 'Blocked: ' + url.slice(0,60));
  } else if (score >= 7) {
    showBanner(tabId, score, level, reasons);
    notify('⚠ GhostPhish HIGH', url.slice(0,60));
  } else if (score >= 4) {
    showBanner(tabId, score, level, reasons);
  }
}

// ── LISTENERS ────────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;
  if (!await isEnabled()) return;
  doScan(tabId, tab.url);
});

chrome.downloads.onCreated.addListener(async (item) => {
  if (!await isEnabled()) return;
  const bad = ['.exe','.bat','.cmd','.vbs','.ps1','.sh','.jar','.msi','.dll','.scr'];
  if (bad.some(e => (item.filename||'').toLowerCase().endsWith(e))) {
    notify('⚠ GhostPhish: Risky Download', item.filename.split(/[\/]/).pop());
  }
});

// ── MESSAGES ─────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _s, reply) => {

  if (msg.action === 'getResult') {
    chrome.tabs.query({ active:true, currentWindow:true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) return reply({ error:'no tab' });
      chrome.storage.local.get('tab_' + tabs[0].id, (d) => {
        if (chrome.runtime.lastError) return reply({ error:'storage error' });
        const r = d['tab_' + tabs[0].id];
        if (r) return reply(r);
        const { score, reasons } = localScan(tabs[0].url || '');
        reply({ url: tabs[0].url, score, reasons, level: getLevel(score), source:'local' });
      });
    });
    return true;
  }

  if (msg.action === 'deepRescan') {
    chrome.tabs.query({ active:true, currentWindow:true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) return reply({ error:'no tab' });
      const { score, reasons } = localScan(tabs[0].url || '');
      const level = getLevel(score);
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const res = { extra: 0, reasons: [] };
          try {
            const body = (document.body?.innerText || '').toLowerCase().slice(0, 5000);
            const html = document.documentElement.innerHTML.toLowerCase().slice(0, 8000);
            const pwdInputs = document.querySelectorAll('input[type="password"]').length;
            const forms = document.querySelectorAll('form');
            if (pwdInputs > 0 && location.protocol === 'http:') { res.extra += 5; res.reasons.push('Password field on HTTP page — data exposed!'); }
            forms.forEach(f => { if (f.action && !f.action.includes(location.hostname) && f.action.startsWith('http')) { res.extra += 3; res.reasons.push('Form sends data to external domain'); } });
            ['verify your account','enter your credentials','update your payment','unusual activity','account suspended'].forEach(w => {
              if (body.includes(w)) { res.extra += 3; res.reasons.push('Phishing text detected: "' + w + '"'); }
            });
            if (html.includes('onkeypress') || html.includes('onkeydown')) { res.extra += 2; res.reasons.push('Keystroke logger detected'); }
            if (html.includes('oncopy') || html.includes('onpaste')) { res.extra += 2; res.reasons.push('Clipboard hijack detected'); }
            if (document.querySelectorAll('iframe[src*="http://"]').length > 0) { res.extra += 2; res.reasons.push('Insecure HTTP iframe embedded'); }
          } catch(e) {}
          return res;
        },
        args: []
      }).then(results => {
        const deep = results?.[0]?.result || { extra: 0, reasons: [] };
        const newScore   = Math.min(score + deep.extra, 20);
        const newReasons = [...deep.reasons, ...reasons];
        const newLevel   = getLevel(newScore);
        chrome.storage.local.set({ ["tab_" + tabs[0].id]: { url: tabs[0].url, score: newScore, level: newLevel, reasons: newReasons, source: "deep", time: Date.now() } });
        chrome.storage.local.get(GP_HISTORY, (s) => {
          if (chrome.runtime.lastError) return;
          const h = s[GP_HISTORY] || [];
          const idx = h.findIndex(e => e.url === tabs[0].url);
          if (idx !== -1) { h[idx].score = newScore; h[idx].level = newLevel; h[idx].reasons = newReasons; h[idx].deepScanned = true; chrome.storage.local.set({ [GP_HISTORY]: h }); }
        });
        reply({ url: tabs[0].url, score: newScore, reasons: newReasons, level: newLevel, source:'deep' });
      }).catch(() => reply({ url: tabs[0].url, score, reasons, level, source:'local' }));
    });
    return true;
  }

  if (msg.action === 'toggle') {
    chrome.storage.local.get('ghostphish_enabled', (d) => {
      if (chrome.runtime.lastError) return;
      const next = !(d.ghostphish_enabled !== false);
      chrome.storage.local.set({ ghostphish_enabled: next }, () => { setIcon(next); reply({ enabled: next }); });
    });
    return true;
  }

  if (msg.action === 'scanUrl') {
    const { score, reasons } = localScan(msg.url || '');
    reply({ score, reasons, level: getLevel(score), source:'local' });
    return true;
  }

  if (msg.action === 'getState') {
    chrome.storage.local.get('ghostphish_enabled', (d) => reply({ enabled: d.ghostphish_enabled !== false }));
    return true;
  }

  if (msg.action === 'scanEmailUrl') {
    const { score, reasons } = localScan(msg.url || '');
    reply({ score, reasons, level: getLevel(score), source: 'local' });
    return true;
  }

  if (msg.action === 'domScore') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) return;
      const key = 'tab_' + tabs[0].id;
      chrome.storage.local.get(key, (d) => {
        if (chrome.runtime.lastError) return;
        const existing = d[key];
        if (!existing) return;
        const combined   = Math.min((existing.score || 0) + (msg.score || 0), 20);
        const newReasons = [...(msg.reasons || []), ...(existing.reasons || [])];
        const updated    = { ...existing, score: combined, level: getLevel(combined), reasons: newReasons };
        chrome.storage.local.set({ [key]: updated });
        chrome.storage.local.get(GP_HISTORY, (res) => {
          if (chrome.runtime.lastError) return;
          const list = res[GP_HISTORY] || [];
          const idx  = list.findIndex(e => e.url === existing.url);
          if (idx !== -1) {
            list[idx].score   = combined;
            list[idx].level   = getLevel(combined);
            list[idx].reasons = newReasons;
            chrome.storage.local.set({ [GP_HISTORY]: list });
          }
        });
      });
    });
    return true;
  }

  if (msg.action === 'pageVisited') {
    const url = msg.url || '';
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) return;
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (chrome.runtime.lastError || !tabs[0] || !await isEnabled()) return;
      chrome.storage.local.get('tab_' + tabs[0].id, (d) => {
        if (chrome.runtime.lastError) return;
        if (!d['tab_' + tabs[0].id]) doScan(tabs[0].id, url);
      });
    });
    return true;
  }
});
