# GhostPhish Pro — OTP Setup Guide
=====================================

## ══ OPTION 1: EmailJS (No Backend) ══

### Step 1 — EmailJS Account
1. https://www.emailjs.com/ pe jao
2. Free account banao
3. "Add New Service" → Gmail select karo
4. Apni Gmail se connect karo → Service ID copy karo (e.g. service_abc123)

### Step 2 — Email Template Banao
1. "Email Templates" → "Create New Template"
2. Template mein yeh variables use karo:
   - Subject: GhostPhish OTP: {{otp_code}}
   - Body: Your OTP is: {{otp_code}}  (valid 10 min)
3. Template ID copy karo (e.g. template_xyz789)

### Step 3 — Public Key
1. Account → "API Keys"
2. Public Key copy karo

### Step 4 — popup.js mein fill karo
```js
const EMAILJS_SERVICE_ID  = 'service_abc123';   // ← yahan
const EMAILJS_TEMPLATE_ID = 'template_xyz789';  // ← yahan
const EMAILJS_PUBLIC_KEY  = 'AbCdEfGhIjKlMn';  // ← yahan
```

---

## ══ OPTION 2: Python Backend ══

### Step 1 — Gmail App Password Banao
1. myaccount.google.com → Security
2. 2-Step Verification ON karo
3. "App Passwords" → "Mail" → "Windows Computer"
4. 16-digit password copy karo (e.g. abcd efgh ijkl mnop)

### Step 2 — app.py mein fill karo
```python
app.config['MAIL_USERNAME'] = 'yourname@gmail.com'
app.config['MAIL_PASSWORD'] = 'abcd efgh ijkl mnop'  # App Password (spaces hata do)
app.config['MAIL_DEFAULT_SENDER'] = ('GhostPhish Pro', 'yourname@gmail.com')
```

### Step 3 — Backend Install & Run
```bash
cd backend/
pip install -r requirements.txt
python app.py
```

### Step 4 — Extension Load karo
- Chrome → chrome://extensions/
- Developer Mode ON
- Load unpacked → FinalExtension_PythonBackend folder
- Backend HAMESHA chalu rakhna (jab extension use karo)

---

## Notes
- EmailJS: 200 free emails/month
- Python: Unlimited emails, but server chalu rakhna padega
