<div align="center">

<img src="icons/ghostphish-128.png" width="100" alt="GhostPhish Logo"/>

# 👻 GhostPhish Pro

### Pro Security Sentinel — Chrome Extension

[![Version](https://img.shields.io/badge/version-5.0-blue?style=for-the-badge&logo=google-chrome)](https://github.com/deva3047/GhostPhish)
[![Manifest](https://img.shields.io/badge/Manifest-v3-green?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/license-MIT-purple?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-orange?style=for-the-badge)](https://chromewebstore.google.com)

**GhostPhish Pro** is a powerful browser extension that automatically detects and neutralizes phishing threats in real time — scanning URLs, analyzing DOM structure, and flagging suspicious attachments before they can harm you.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Real-Time URL Scanning** | Heuristic engine scores every URL you visit for phishing risk |
| 🧠 **DOM Analysis** | Detects login form spoofing, brand impersonation & suspicious page structure |
| 📋 **Manual Scan Mode** | Paste any URL or upload a file to scan on-demand |
| 📊 **Scan History Dashboard** | Full log of all scanned pages with risk levels and timestamps |
| 🔐 **Token-Based Secure Access** | OTP-protected advanced export features (EmailJS or Python backend) |
| 📁 **CSV Export** | Download your full scan history as a CSV report |
| 🔔 **Browser Notifications** | Instant alerts when a high-risk page is detected |
| 🌐 **Gmail & Outlook Support** | Extracts and scans links found inside email clients |

---

## 🖼️ Screenshots

### 1 — Main Scanner Panel
> The primary popup interface. Click the extension icon to open it on any page. The **SCAN** tab auto-analyzes the current page, breaking down URL risk, entropy score, and DOM signals.

<img src="screenshots/Screenshot 2026-03-11 035704.png" alt="GhostPhish Main Popup - Scanner Panel" width="360"/>

---

### 2 — Scan History Dashboard
> A full-screen history view listing every URL scanned, color-coded by threat level: **Critical**, **High**, **Medium**, **Low**, and **Safe**. Filter by risk level, search by domain, and export results as CSV.

<img src="screenshots/Screenshot 2026-03-11 035817.png" alt="GhostPhish Scan History Dashboard" width="800"/>

---

### 3 — Secure Token Access
> Advanced export features are protected behind a one-time OTP token. Generate a token from the popup, enter it here to unlock full data export capabilities.

<img src="screenshots/Screenshot 2026-03-11 035944.png" alt="GhostPhish Secure Token Access" width="500"/>

---

## 🚀 Installation

### Step 1 — Download the Extension
Clone or download this repository:
```bash
git clone https://github.com/deva3047/GhostPhish.git
```

### Step 2 — Load into Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `GhostPhish_v5_Secured` folder

> ✅ The GhostPhish icon will appear in your Chrome toolbar.

---

## ⚙️ OTP Setup (Choose One)

GhostPhish Pro uses OTP tokens to protect advanced export features. Set up one of the two options below.

### Option A — EmailJS *(No Backend Required)*

1. Create a free account at [emailjs.com](https://www.emailjs.com/)
2. Add a new Gmail service → copy your **Service ID**
3. Create an email template using these variables:
   - **Subject:** `GhostPhish OTP: {{otp_code}}`
   - **Body:** `Your OTP is: {{otp_code}} (valid 10 min)`
4. Copy your **Template ID** and **Public Key**
5. Open `popup.js` and fill in:

```javascript
const EMAILJS_SERVICE_ID  = 'service_abc123';   // ← Your Service ID
const EMAILJS_TEMPLATE_ID = 'template_xyz789';  // ← Your Template ID
const EMAILJS_PUBLIC_KEY  = 'AbCdEfGhIjKlMn';  // ← Your Public Key
```

> 📧 Free tier includes 200 emails/month.

---

### Option B — Python Backend *(Unlimited Emails)*

1. Enable **2-Step Verification** on your Google account at [myaccount.google.com](https://myaccount.google.com) → Security
2. Generate an **App Password** under Security → App Passwords → Mail
3. Open `backend/app.py` and fill in:

```python
app.config['MAIL_USERNAME']       = 'yourname@gmail.com'
app.config['MAIL_PASSWORD']       = 'abcdefghijklmnop'  # App Password (no spaces)
app.config['MAIL_DEFAULT_SENDER'] = ('GhostPhish Pro', 'yourname@gmail.com')
```

4. Start the backend server:

```bash
cd backend/
pip install -r requirements.txt
python app.py
```

> ⚠️ Keep the Python server running whenever the extension is in use.

---

## 🔬 How the Scanner Works

GhostPhish Pro uses a **multi-layer heuristic scoring engine** to detect phishing threats:

```
Page Visited
     │
     ├─▶ URL Analysis          → Keywords, IP usage, URL length, TLD risk,
     │                            subdomain abuse, lookalike domains, redirects
     │
     ├─▶ DOM Analysis          → Password fields, login forms, brand impersonation,
     │                            suspicious iframes, external script injection
     │
     └─▶ Risk Score (0–20)     → SAFE | LOW | MEDIUM | HIGH | CRITICAL
```

**Risk Level Thresholds:**

| Score | Level | Color |
|-------|-------|-------|
| 0–3 | ✅ Safe | Green |
| 4–6 | 🟡 Low | Yellow |
| 7–10 | 🟠 Medium | Orange |
| 11–15 | 🔴 High | Red |
| 16–20 | ☠️ Critical | Dark Red |

---

## 🗂️ Project Structure

```
GhostPhish_v5_Secured/
├── manifest.json       # Chrome Extension Manifest v3
├── popup.html          # Main extension popup UI
├── popup.js            # Scanner logic, OTP, token system
├── background.js       # Service worker: URL interception & heuristic engine
├── content.js          # DOM analyzer injected into every page
├── history.html        # Full-page scan history dashboard
├── history.js          # History filtering, search & CSV export
├── icons/              # Extension icons (48px, 128px)
├── screenshots/        # UI screenshots
└── SETUP_GUIDE.md      # OTP configuration guide
```

---

## 🛡️ Permissions Used

| Permission | Purpose |
|---|---|
| `activeTab` | Read the current tab's URL for scanning |
| `tabs` & `webNavigation` | Intercept navigation events |
| `scripting` | Inject DOM analysis content script |
| `downloads` | Export scan history as CSV |
| `notifications` | Alert user on high-risk detection |
| `storage` | Save scan history and extension settings |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by [deva3047](https://github.com/deva3047)

⭐ **Star this repo if you find it useful!** ⭐

</div>
