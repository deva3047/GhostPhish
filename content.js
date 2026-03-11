// ╔══════════════════════════════════════════════════════╗
// ║       GhostPhish Pro v3.0 — content.js               ║
// ║   DOM Analysis + Gmail/Outlook Email URL Extractor   ║
// ╚══════════════════════════════════════════════════════╝

(function () {
  'use strict';

  let domScore = 0;
  const domReasons = [];

  // ── 1. Password Fields ────────────────────────
  const pwFields = document.querySelectorAll('input[type="password"]');
  if (pwFields.length) {
    domScore += 3;
    domReasons.push(`Password field detected (×${pwFields.length})`);
  }

  // ── 2. Login Form Keywords ────────────────────
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const txt = (form.innerText || '').toLowerCase();
    const hits = ['login','sign in','password','username','email'].filter(p => txt.includes(p));
    if (hits.length >= 2) {
      domScore += 3;
      domReasons.push(`Login form: ${hits.slice(0,3).join(', ')}`);
    }
  });

  // ── 3. Brand Impersonation ────────────────────
  const brands = ['paypal','amazon','netflix','google','microsoft','apple',
                  'facebook','instagram','whatsapp','twitter','linkedin',
                  'chase','wellsfargo','citibank','bankofamerica'];
  const bodyTxt = (document.body?.innerText || '').toLowerCase();
  const host    = window.location.hostname.toLowerCase();
  brands.forEach(b => {
    if (bodyTxt.includes(b) && !host.includes(b.split(' ')[0])) {
      domScore += 4;
      domReasons.push(`Brand impersonation: "${b}" on unrelated domain`);
    }
  });

  // ── 4. External Form Action ───────────────────
  forms.forEach(form => {
    const action = form.getAttribute('action') || '';
    if (action.startsWith('http') && !action.includes(window.location.hostname)) {
      domScore += 4;
      // FIX: Truncate and sanitize action URL in reason text
      const safeAction = action.replace(/[<>"']/g, '').slice(0, 50);
      domReasons.push(`Form posts to external: ${safeAction}`);
    }
  });

  // ── 5. Hidden Fields ─────────────────────────
  const hidden = [...document.querySelectorAll('input')].filter(i => {
    const s = getComputedStyle(i);
    return s.display === 'none' || s.opacity === '0' || i.type === 'hidden';
  });
  if (hidden.length > 5) {
    domScore += 2;
    domReasons.push(`${hidden.length} hidden inputs — possible harvesting`);
  }

  // ── 6. Meta Redirect ─────────────────────────
  if (document.querySelector('meta[http-equiv="refresh"]')) {
    domScore += 2;
    domReasons.push('Meta refresh redirect');
  }

  // ── 7. Clipboard / Keylogger Scripts ─────────
  document.querySelectorAll('script').forEach(s => {
    if (!s.innerText) return;
    if (s.innerText.includes('clipboardData') || s.innerText.includes('oncopy')) {
      domScore += 3; domReasons.push('Clipboard access script');
    }
    if (s.innerText.includes('addEventListener("keydown"') ||
        s.innerText.includes("addEventListener('keydown'")) {
      domScore += 2; domReasons.push('Keydown listener (possible keylogger)');
    }
  });

  // ── 8. Send DOM score to background ──────────
  if (domScore > 0) {
    chrome.runtime.sendMessage({ action: 'domScore', score: domScore, reasons: domReasons });
  }

  // ── 9. DOM Warning Toast (if severe) ─────────
  if (domScore >= 7 && pwFields.length) {
    const toast = document.createElement('div');
    toast.id = 'gp-dom-toast';
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gpFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      #gp-dom-toast{
        position:fixed;bottom:20px;right:20px;z-index:2147483646;
        background:#140000;border:1px solid #ff3300;color:#ff9966;
        font-family:'Courier New',monospace;font-size:12px;
        padding:12px 16px;max-width:290px;line-height:1.5;
        box-shadow:0 0 18px rgba(255,40,0,.25);
        animation:gpFade .4s ease;
      }
    `;
    document.head.appendChild(style);
    toast.innerHTML = `
      <strong style="color:#ff4400">👻 GhostPhish DOM Alert</strong><br>
      Suspicious login patterns on this page.<br>
      <small style="color:#773322">DOM Score: +${domScore}</small>
      <button onclick="document.getElementById('gp-dom-toast').remove()" style="
        float:right;background:none;border:none;color:#ff4400;cursor:pointer;
        font-size:15px;margin-top:-20px;line-height:1
      ">✕</button>
    `;
    document.body?.appendChild(toast);
    setTimeout(() => toast?.remove(), 10000);
  }

  // ══════════════════════════════════════════════
  //  EMAIL URL EXTRACTOR (Gmail & Outlook)
  // ══════════════════════════════════════════════
  const isEmail =
    window.location.hostname.includes('mail.google.com') ||
    window.location.hostname.includes('outlook.live.com') ||
    window.location.hostname.includes('outlook.office.com');

  if (isEmail) {
    const urlPattern = /https?:\/\/[^\s"'<>]+/g;

    function extractAndScan() {
      const emailBody = document.body?.innerText || '';
      const found = [...new Set(emailBody.match(urlPattern) || [])];

      found.forEach(url => {
        chrome.runtime.sendMessage({ action: 'scanEmailUrl', url }, (res) => {
          if (chrome.runtime.lastError || !res) return;
          if (res.score >= 7) {
            // FIX: Use try-catch around querySelector to handle special chars in URLs
            try {
              // Escape CSS selector special characters in attribute value
              const safeUrl = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              document.querySelectorAll(`a[href="${safeUrl}"]`).forEach(a => {
                a.style.cssText = `
                  border: 2px solid #ff3300 !important;
                  background: #1a0000 !important;
                  color: #ff6644 !important;
                  padding: 1px 4px !important;
                  border-radius: 2px !important;
                `;
                a.title = `⚠ GhostPhish: Suspicious URL (Score ${res.score})`;
              });
            } catch(e) {
              // Fallback: iterate all anchors if selector fails
              document.querySelectorAll('a[href]').forEach(a => {
                if (a.href === url) {
                  a.style.cssText = 'border:2px solid #ff3300!important;background:#1a0000!important;color:#ff6644!important;';
                  a.title = `⚠ GhostPhish: Suspicious URL (Score ${res.score})`;
                }
              });
            }
          }
        });
      });
    }

    const emailObserver = new MutationObserver(() => {
      clearTimeout(emailObserver._t);
      emailObserver._t = setTimeout(extractAndScan, 800);
    });
    emailObserver.observe(document.body, { childList: true, subtree: true });
    extractAndScan();
  }

  // ══════════════════════════════════════════════
  //  LINK HOVER SCANNER (all pages)
  // ══════════════════════════════════════════════
  document.addEventListener('mouseover', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a._gpChecked) return;
    a._gpChecked = true;

    const url = a.href;
    if (!url.startsWith('http')) return;

    chrome.runtime.sendMessage({ action: 'scanEmailUrl', url }, (res) => {
      if (chrome.runtime.lastError || !res) return;
      if (res.score >= 7) {
        a.style.outline = '2px solid #ff3300';
        a.title = (a.title ? a.title + '\n' : '') +
          `⚠ GhostPhish Risk: ${res.level} (${res.score})`;
      }
    });
  });


  // ══════════════════════════════════════════════
  //  PAGE LOAD — background ko turant batao
  // ══════════════════════════════════════════════
  try {
    chrome.runtime.sendMessage({
      action : 'pageVisited',
      url    : window.location.href,
      title  : document.title || ''
    });
  } catch(e) {}

})();
