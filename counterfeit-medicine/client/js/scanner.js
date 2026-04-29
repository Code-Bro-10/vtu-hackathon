if (document.getElementById('scanner-container')) {
  checkAuth();
  updateHeader('scanner');

  const token = localStorage.getItem('token');
  let isScanning = false;

  // ── On successful QR scan ───────────────────────────────────────
  function onScanSuccess(decodedText) {
    if (isScanning) return;
    isScanning = true;

    // Show verifying state on hint bar
    const hint = document.getElementById('scan-hint');
    if (hint) {
      hint.innerHTML = `
        <div class="verifying-hint">
          <span class="scan-pulse"></span> Verifying barcode&hellip;
        </div>`;
    }

    // Stop camera
    html5QrcodeScanner.clear().catch(() => {});
    verifyQR(decodedText);
  }

  function onScanFailure() { /* silent */ }

  // ── Verify with backend ─────────────────────────────────────────
  async function verifyQR(qrId) {
    try {
      const res = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qrId })
      });

      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      showResultPanel(data, qrId);
    } catch (err) {
      console.error(err);
      showToast('Connection error. Is the server running?', 'error');
      resetScanner();
    }
  }

  // ── Render result below scanner ─────────────────────────────────
  function showResultPanel(data, qrId) {
    const panel = document.getElementById('scan-result-panel');
    const inner = document.getElementById('scan-result-inner');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (data.result === 'Genuine') {
      const med = data.medicine;
      const expDate = new Date(med.expiryDate).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const isExpired = new Date(med.expiryDate) < new Date();
      const expiryClass = isExpired ? 'expiry-warn' : 'expiry-ok';
      const expiryIcon  = isExpired ? '⚠️' : '✅';

      inner.innerHTML = `
        <!-- Glow -->
        <div style="position:absolute;top:-30px;right:-30px;width:140px;height:140px;
             background:var(--success);border-radius:50%;filter:blur(60px);opacity:0.12;pointer-events:none;"></div>

        <!-- Status banner -->
        <div class="result-banner genuine">
          <div class="result-banner-emoji">✅</div>
          <div>
            <div class="result-banner-main">Genuine Medicine Verified</div>
            <div class="result-banner-sub">Registered in the certified manufacturer database</div>
          </div>
        </div>

        <!-- 4 Detail Cards -->
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
            <div class="detail-card-value" style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;">${med.batchNumber}</div>
          </div>
          <div class="detail-card ${expiryClass}" style="animation-delay:0.2s">
            <div class="detail-card-icon">${expiryIcon}</div>
            <div class="detail-card-label">Expiry Date</div>
            <div class="detail-card-value">
              ${expDate}
              ${isExpired ? '<br><span style="font-size:0.72rem;color:#f87171;">⚠️ Expired — Do not use</span>' : ''}
            </div>
          </div>
        </div>

        <!-- Blockchain hash -->
        <div class="mini-hash">
          <div class="mini-hash-label">⛓️ Blockchain Hash</div>
          ${data.log.hash}
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
          <button class="btn-scan-again" onclick="resetScanner()" style="flex:1;">
            📷 Scan Another
          </button>
          <a href="result.html?data=${encodeURIComponent(JSON.stringify(data))}"
             style="flex:1;text-decoration:none;">
            <button class="btn-scan-again" style="background:linear-gradient(135deg,#1e293b,#334155);box-shadow:none;width:100%;">
              📋 Full Report
            </button>
          </a>
        </div>
      `;

      showToast(`✅ ${med.name} — Genuine!`, 'success');

    } else {
      // Fake
      inner.innerHTML = `
        <div style="position:absolute;top:-30px;right:-30px;width:140px;height:140px;
             background:var(--danger);border-radius:50%;filter:blur(60px);opacity:0.12;pointer-events:none;"></div>

        <div class="result-banner fake">
          <div class="result-banner-emoji">❌</div>
          <div>
            <div class="result-banner-main">⚠️ Fake Medicine Detected!</div>
            <div class="result-banner-sub">This code is NOT in our certified database. Do <strong>not</strong> consume.</div>
          </div>
        </div>

        <div style="padding:1rem;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.25);
             border-radius:10px;color:#fca5a5;font-size:0.88rem;line-height:1.6;margin:1rem 0;">
          🚨 This medicine could be <strong>counterfeit</strong>. Please report it to the pharmacy or health authority immediately.
        </div>

        <div class="mini-hash" style="border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.05);">
          <div class="mini-hash-label" style="color:#f87171;">⛓️ Blockchain Hash</div>
          ${data.log.hash}
        </div>

        <button class="btn-scan-again" onclick="resetScanner()">📷 Scan Another</button>
      `;

      showToast('🚨 Fake medicine detected!', 'error');
    }
  }

  // ── Reset: restart scanner, hide result panel ───────────────────
  window.resetScanner = function () {
    isScanning = false;
    document.getElementById('scan-result-panel').style.display = 'none';

    const hint = document.getElementById('scan-hint');
    if (hint) hint.innerHTML = `<span class="scan-pulse"></span> Camera active — hold QR code steady to scan`;

    // Re-render scanner
    html5QrcodeScanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  };

  // ── Init scanner ─────────────────────────────────────────────────
  let html5QrcodeScanner = new Html5QrcodeScanner(
    'reader',
    { fps: 10, qrbox: { width: 250, height: 250 } },
    false
  );
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}
