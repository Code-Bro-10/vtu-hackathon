const API_URL = 'http://localhost:5000/api';

// ─── TOAST NOTIFICATIONS ────────────────────────────────────────
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

// ─── BUTTON LOADING STATE ────────────────────────────────────────
function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ─── ANIMATED COUNTER ────────────────────────────────────────────
function animateCount(el, target) {
  if (!el) return;
  let start = 0;
  const duration = 800;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

// ─── AUTH UTILITIES ───────────────────────────────────────────────
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'index.html'; return null; }
  return token;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// ─── BUILD NAVIGATION ─────────────────────────────────────────────
function updateHeader(activePage) {
  const userStr = localStorage.getItem('user');
  if (!userStr) return;
  const user = JSON.parse(userStr);
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  const pages = [
    { href: 'dashboard.html', label: '🏠 Dashboard', key: 'dashboard' },
    { href: 'scanner.html',   label: '📷 Scanner',   key: 'scanner' },
    { href: 'analyze.html',   label: '🤖 AI Analyzer', key: 'analyze' },
  ];
  if (user.role === 'admin') {
    pages.push({ href: 'admin.html', label: '🛡️ Admin', key: 'admin' });
  }

  let html = pages.map(p =>
    `<a href="${p.href}" class="${activePage === p.key ? 'active' : ''}">${p.label}</a>`
  ).join('');
  html += `<a href="#" class="nav-logout" onclick="logout()">Logout</a>`;
  navLinks.innerHTML = html;
}

// ─── LOGIN FORM ───────────────────────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('error-msg');
    errorMsg.textContent = '';
    setLoading(btn, true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('email').value,
          password: document.getElementById('password').value
        })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showToast(`Welcome back, ${data.user.name}! 🎉`);
        setTimeout(() => window.location.href = 'dashboard.html', 700);
      } else {
        errorMsg.textContent = data.message;
        setLoading(btn, false);
      }
    } catch {
      errorMsg.textContent = 'Connection error. Is the server running?';
      setLoading(btn, false);
    }
  });
}

// ─── SIGNUP FORM ──────────────────────────────────────────────────
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signup-btn');
    const errorMsg = document.getElementById('error-msg');
    errorMsg.textContent = '';
    setLoading(btn, true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
          role: document.getElementById('role').value
        })
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Account created! Redirecting to login...', 'success');
        setTimeout(() => window.location.href = 'index.html', 1000);
      } else {
        errorMsg.textContent = data.message;
        setLoading(btn, false);
      }
    } catch {
      errorMsg.textContent = 'Connection error. Is the server running?';
      setLoading(btn, false);
    }
  });
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────
if (document.getElementById('dashboard-container')) {
  checkAuth();
  updateHeader('dashboard');
  loadUserLogs();
}

async function loadUserLogs() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}/scan/logs/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logs = await res.json();
    const tbody = document.getElementById('logs-body');
    const countEl = document.getElementById('scan-count');

    // Update mini stats
    const total = logs.length;
    const genuine = logs.filter(l => l.result === 'Genuine').length;
    const fake = logs.filter(l => l.result === 'Fake').length;
    animateCount(document.getElementById('user-total'), total);
    animateCount(document.getElementById('user-genuine'), genuine);
    animateCount(document.getElementById('user-fake'), fake);
    if (countEl) countEl.textContent = `${total} scan${total !== 1 ? 's' : ''}`;

    tbody.innerHTML = '';
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">📭</div><p>No scans yet. <a href="scanner.html" style="color:var(--primary)">Scan your first medicine →</a></p></div></td></tr>`;
      return;
    }

    logs.forEach((log, i) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${i * 40}ms`;
      tr.style.animation = 'fadeIn 0.3s ease both';
      const date = new Date(log.timestamp).toLocaleString();
      const badge = log.result === 'Genuine'
        ? `<span class="badge-genuine">✅ Genuine</span>`
        : `<span class="badge-fake">🚨 Fake</span>`;
      tr.innerHTML = `
        <td style="color:var(--text)">${date}</td>
        <td><span class="hash-code">${log.qrId.substring(0, 18)}…</span></td>
        <td>${badge}</td>
        <td><span class="hash-code" title="${log.hash}">${log.hash.substring(0, 14)}…</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading logs', err);
    showToast('Failed to load scan history', 'error');
  }
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────
if (document.getElementById('admin-container')) {
  checkAuth();
  updateHeader('admin');
  loadStats();
  loadMedicines();

  const addMedForm = document.getElementById('add-medicine-form');
  addMedForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('add-btn');
    const token = localStorage.getItem('token');
    setLoading(btn, true);

    try {
      const res = await fetch(`${API_URL}/medicine/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: document.getElementById('med-name').value,
          batchNumber: document.getElementById('med-batch').value,
          manufacturer: document.getElementById('med-mfg').value,
          expiryDate: document.getElementById('med-exp').value
        })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Medicine added! QR ID: ${data.medicine.qrId.substring(0, 12)}…`, 'success');
        addMedForm.reset();
        loadMedicines();
        loadStats();
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Error adding medicine', 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

async function loadStats() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}/scan/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await res.json();
    animateCount(document.getElementById('total-scans'), stats.totalScans || 0);
    animateCount(document.getElementById('genuine-scans'), stats.genuineScans || 0);
    animateCount(document.getElementById('fake-scans'), stats.fakeScans || 0);
  } catch (err) {
    console.error('Error loading stats', err);
  }
}

async function loadMedicines() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}/medicine`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meds = await res.json();
    const tbody = document.getElementById('medicines-body');
    const countEl = document.getElementById('med-count');
    if (countEl) countEl.textContent = `${meds.length} medicines`;

    tbody.innerHTML = '';
    if (meds.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💊</div><p>No medicines added yet. Use the form above to get started.</p></div></td></tr>`;
      return;
    }

    meds.forEach((med, i) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${i * 40}ms`;
      tr.style.animation = 'fadeIn 0.3s ease both';
      const date = new Date(med.expiryDate).toLocaleDateString();
      const isExpired = new Date(med.expiryDate) < new Date();
      tr.innerHTML = `
        <td style="color:var(--text);font-weight:500">${med.name}</td>
        <td><span class="hash-code">${med.batchNumber}</span></td>
        <td>${med.manufacturer}</td>
        <td style="color:${isExpired ? 'var(--danger)' : 'var(--success)'}">${date}${isExpired ? ' ⚠️' : ''}</td>
        <td>
          <span class="hash-code" title="${med.qrId}" style="cursor:pointer" onclick="copyToClipboard('${med.qrId}', this)">
            ${med.qrId.substring(0, 16)}…
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading medicines', err);
  }
}

function copyToClipboard(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = el.textContent;
    el.textContent = '✅ Copied!';
    el.style.color = 'var(--success)';
    setTimeout(() => {
      el.textContent = `${text.substring(0, 16)}…`;
      el.style.color = '';
    }, 1800);
    showToast('QR ID copied to clipboard', 'success');
  });
}

// ─── RESULT PAGE ──────────────────────────────────────────────────
if (document.getElementById('result-container')) {
  checkAuth();
  updateHeader('scanner');

  const urlParams = new URLSearchParams(window.location.search);
  const rawData = urlParams.get('data');
  const container = document.getElementById('result-container');

  if (rawData) {
    try {
      const data = JSON.parse(decodeURIComponent(rawData));

      if (data.result === 'Genuine') {
        const med = data.medicine;
        const expDate = new Date(med.expiryDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        const isExpired = new Date(med.expiryDate) < new Date();
        const expiryClass = isExpired ? 'expiry-warn' : 'expiry-ok';
        const expiryIcon = isExpired ? '⚠️' : '✅';

        container.innerHTML = `
          <div class="glass-card" style="padding: 2rem; position: relative; overflow: hidden;">
            <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;background:var(--success);border-radius:50%;filter:blur(70px);opacity:0.12;pointer-events:none;"></div>

            <div class="status-banner genuine">
              <div class="status-emoji">✅</div>
              <div class="status-text-group">
                <div class="status-main">Genuine Medicine Verified</div>
                <div class="status-sub">Registered in our certified manufacturer database</div>
              </div>
            </div>

            <div class="detail-grid">
              <div class="detail-card" style="animation-delay:0.05s">
                <div class="detail-card-icon">💊</div>
                <div class="detail-card-label">Medicine Name</div>
                <div class="detail-card-value">${med.name}</div>
              </div>
              <div class="detail-card" style="animation-delay:0.1s">
                <div class="detail-card-icon">🏭</div>
                <div class="detail-card-label">Manufacturer</div>
                <div class="detail-card-value">${med.manufacturer}</div>
              </div>
              <div class="detail-card" style="animation-delay:0.15s">
                <div class="detail-card-icon">#️⃣</div>
                <div class="detail-card-label">Batch Number</div>
                <div class="detail-card-value" style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;">${med.batchNumber}</div>
              </div>
              <div class="detail-card ${expiryClass}" style="animation-delay:0.2s">
                <div class="detail-card-icon">${expiryIcon}</div>
                <div class="detail-card-label">Expiry Date</div>
                <div class="detail-card-value">${expDate}${isExpired ? '<br><span style="font-size:0.75rem;font-weight:500;color:#f87171;">⚠️ Expired — Do not use</span>' : ''}</div>
              </div>
            </div>

            <div class="blockchain-box">
              <div class="blockchain-label">⛓️ Blockchain Transaction Hash</div>
              <div class="blockchain-hash">${data.log.hash}</div>
            </div>

            <div id="fda-info-container" style="margin-top: 1.25rem; text-align: left;"></div>

            <!-- Actions -->
            <div style="display:flex;gap:0.75rem;margin-top:1.5rem;flex-wrap:wrap;">
              <button class="btn btn-success" onclick="window.location.href='scanner.html'" style="flex:1;min-width:140px;">📷 Scan Another</button>
              <button class="btn btn-outline" onclick="window.location.href='dashboard.html'" style="flex:1;min-width:140px;">📊 Dashboard</button>
              <button class="btn-download" onclick="downloadReport()" style="flex:1;min-width:140px;">⬇️ Download PDF</button>
            </div>
          </div>
        `;

        displayMedicineInfo(med.name);
      } else {
        container.innerHTML = `
          <div class="glass-card result-card fake">
            <div class="result-icon">❌</div>
            <div class="result-title">Fake Medicine Detected!</div>
            <div class="result-subtitle">This QR code is not in our certified database. <strong style="color:var(--danger)">Do NOT consume this medicine.</strong></div>
            <div class="blockchain-box" style="border-color:rgba(239,68,68,0.25);background:rgba(239,68,68,0.06);">
              <div class="blockchain-label" style="color:#f87171;">⛓️ Blockchain Transaction Hash</div>
              <div class="blockchain-hash">${data.log.hash}</div>
            </div>
            <button class="btn btn-danger" onclick="window.location.href='scanner.html'">📷 Scan Another</button>
          </div>
        `;
      }
    } catch {
      container.innerHTML = `<div class="glass-card" style="text-align:center;padding:2rem;"><p style="color:var(--danger)">Error parsing result data.</p></div>`;
    }
  } else {
    container.innerHTML = `<div class="glass-card" style="text-align:center;padding:2rem;"><p style="color:var(--text-muted)">No scan data found.</p><br><a href="scanner.html" class="btn btn-outline" style="width:auto;text-decoration:none;padding:0.6rem 1.2rem;display:inline-flex;">Go to Scanner</a></div>`;
  }
}

// ─── OPENFDA API INTEGRATION ──────────────────────────────────────
async function getMedicineDetails(name) {
  try {
    const encodedName = encodeURIComponent(name);
    const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodedName}&limit=1`;
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;

    const result = data.results[0];
    const openfda = result.openfda || {};

    return {
      brandName: openfda.brand_name ? openfda.brand_name[0] : name,
      genericName: openfda.generic_name ? openfda.generic_name[0] : 'Not specified',
      manufacturer: openfda.manufacturer_name ? openfda.manufacturer_name[0] : 'Not specified',
      purpose: result.purpose ? result.purpose[0] : 'Purpose not listed.',
      warnings: result.warnings ? result.warnings[0] : 'No specific warnings listed.'
    };
  } catch (error) {
    console.error("Failed to fetch medicine details:", error);
    return null; 
  }
}

async function displayMedicineInfo(medicineName) {
  const container = document.getElementById('fda-info-container');
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 1rem; color: var(--text-muted); text-align: center;">
      <span class="scan-pulse" style="display:inline-block; margin-right: 8px;"></span>
      Fetching FDA details for <strong>${medicineName}</strong>...
    </div>
  `;

  const details = await getMedicineDetails(medicineName);

  if (!details) {
    container.innerHTML = `
      <div style="padding: 1rem; background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; font-size: 0.85rem;">
        ℹ️ Medicine info not available in the FDA database.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="padding: 1.25rem; border: 1px solid rgba(108, 99, 255, 0.3); border-radius: 12px; background: rgba(108, 99, 255, 0.05); color: var(--text);">
      <h3 style="margin-top: 0; color: #a78bfa; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 0.5rem; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
        🇺🇸 OpenFDA Information
      </h3>
      
      <div style="margin-top: 1rem; font-size: 0.85rem;">
        <p style="margin: 0.4rem 0;"><strong style="color: var(--text-muted);">Brand Name:</strong> ${details.brandName}</p>
        <p style="margin: 0.4rem 0;"><strong style="color: var(--text-muted);">Generic Name:</strong> ${details.genericName}</p>
        <p style="margin: 0.4rem 0;"><strong style="color: var(--text-muted);">Manufacturer:</strong> ${details.manufacturer}</p>
      </div>
      
      <div style="margin-top: 1rem;">
        <p style="margin: 0 0 0.25rem 0; font-size: 0.8rem; color: #a78bfa; text-transform: uppercase; font-weight: 600;">Purpose</p>
        <p style="margin: 0; font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">
          ${details.purpose}
        </p>
      </div>

      <div style="margin-top: 1rem; padding: 0.75rem; background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid var(--danger); border-radius: 4px;">
        <p style="margin: 0 0 0.25rem 0; color: #f87171; font-size: 0.8rem; text-transform: uppercase; font-weight: 600;">Warnings</p>
        <p style="margin: 0; font-size: 0.85rem; line-height: 1.5; color: #fca5a5;">
          ${details.warnings}
        </p>
      </div>
    </div>
  `;
}

// ─── DOWNLOAD REPORT (Print to PDF) ──────────────────────────────
function downloadReport() {
  // Inject a print-only header before printing
  const existing = document.querySelector('.print-header');
  if (existing) existing.remove();

  const printHeader = document.createElement('div');
  printHeader.className = 'print-header';
  printHeader.innerHTML = `
    <div class="print-logo">💊 MedVerify — Verification Report</div>
    <div class="print-timestamp">Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</div>
  `;

  const card = document.querySelector('#result-container .glass-card');
  if (card) card.prepend(printHeader);

  window.print();
}
