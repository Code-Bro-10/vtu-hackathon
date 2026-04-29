// ─── AI MEDICINE ANALYZER — OpenRouter Vision ────────────────────────────────

const OPENROUTER_API_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001'; // Vision-capable model via OpenRouter

let selectedImageBase64 = null;
let selectedImageMimeType = null;

// Init page
if (document.getElementById('analyzer-container')) {
  checkAuth();
  updateHeader('analyze');
  initUploadZone();
}

function initUploadZone() {
  const zone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');

  // Drag and drop
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFile(file);
    } else {
      showToast('Please drop a valid image file.', 'error');
    }
  });

  // Click to browse
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadImageFile(file);
  });
}

function loadImageFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('Image too large. Max 10MB allowed.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    // Extract base64 and mime type
    const [meta, base64] = dataUrl.split(',');
    selectedImageBase64 = base64;
    selectedImageMimeType = file.type;

    // Show preview
    document.getElementById('image-preview').src = dataUrl;
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('preview-section').style.display = 'block';
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('analyze-btn').disabled = false;

    // Clear old results
    document.getElementById('ai-result').innerHTML = '';
    showToast('Image loaded! Click Analyze to get AI insights.', 'info');
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  selectedImageBase64 = null;
  selectedImageMimeType = null;
  document.getElementById('image-preview').src = '';
  document.getElementById('preview-section').style.display = 'none';
  document.getElementById('upload-zone').style.display = 'block';
  document.getElementById('analyze-btn').disabled = true;
  document.getElementById('ai-result').innerHTML = '';
  document.getElementById('file-input').value = '';
}

async function analyzeImage() {
  if (!selectedImageBase64) {
    showToast('Please select a medicine image first.', 'error');
    return;
  }

  const btn = document.getElementById('analyze-btn');
  const btnText = document.getElementById('analyze-btn-text');
  btn.disabled = true;
  btnText.innerHTML = `<span class="scan-pulse" style="display:inline-block;margin-right:8px;"></span>Analyzing with AI…`;

  const resultDiv = document.getElementById('ai-result');
  resultDiv.innerHTML = `
    <div class="ai-loading">
      <div class="dots">
        <span></span><span></span><span></span>
      </div>
      <p style="font-size:0.9rem;">AI is reading the medicine label… this may take a few seconds</p>
    </div>
  `;

  const prompt = `You are a pharmaceutical expert AI. Carefully analyze this medicine image (it may be a medicine box, strip, bottle, or label).

Extract and return the following information in **strict JSON format only** (no extra text outside the JSON):

{
  "medicine_name": "name of the medicine",
  "expiry_date": "expiry date as shown on label, or 'Not visible' if unclear",
  "manufactured_date": "manufacturing date if visible, or 'Not visible'",
  "what_it_is_used_for": "explain in 2-3 sentences what this medicine is used to treat",
  "dosage": "recommended dosage if visible on label",
  "age_limit": {
    "minimum_age": "minimum age (e.g. '12 years and above') or 'No restriction listed'",
    "children_warning": "specific warning for children if any",
    "elderly_warning": "specific warning for elderly patients if any"
  },
  "who_should_avoid": [
    "list of people who should avoid this drug, e.g. 'Pregnant women', 'Patients with kidney disease', etc."
  ],
  "drug_interactions": [
    "list of known drug interactions if mentioned"
  ],
  "side_effects": [
    "common side effects if mentioned on label"
  ],
  "storage_instructions": "storage instructions if visible",
  "manufacturer": "manufacturer name if visible",
  "warnings": "important warnings summary in 1-2 sentences"
}

If a field is not visible or readable on the label, set its value to "Not visible on label".`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MedVerify AI Analyzer'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${selectedImageMimeType};base64,${selectedImageBase64}`
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        max_tokens: 1200,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API Error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response (strip markdown code blocks if present)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned unexpected format.');

    const info = JSON.parse(jsonMatch[0]);
    displayAIResult(info);

  } catch (err) {
    console.error('AI Analysis error:', err);
    resultDiv.innerHTML = `
      <div class="ai-error">
        ⚠️ <div>
          <strong>Analysis failed</strong><br>
          <span style="font-size:0.82rem;">${err.message}</span>
        </div>
      </div>
    `;
    showToast('AI analysis failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btnText.innerHTML = '🔬 Analyze Again';
  }
}

function displayAIResult(info) {
  const resultDiv = document.getElementById('ai-result');

  const avoidList = Array.isArray(info.who_should_avoid) && info.who_should_avoid.length
    ? `<ul>${info.who_should_avoid.map(i => `<li>${i}</li>`).join('')}</ul>`
    : '<p>Not specified on label.</p>';

  const interactionList = Array.isArray(info.drug_interactions) && info.drug_interactions.length
    ? `<ul>${info.drug_interactions.map(i => `<li>${i}</li>`).join('')}</ul>`
    : '<p>None listed on label.</p>';

  const sideEffectsList = Array.isArray(info.side_effects) && info.side_effects.length
    ? `<ul>${info.side_effects.map(i => `<li>${i}</li>`).join('')}</ul>`
    : '<p>None listed on label.</p>';

  resultDiv.innerHTML = `
    <div class="ai-card">
      <div class="ai-card-header">
        <span style="font-size:1.4rem;">🤖</span>
        <h3>AI Analysis Result — ${info.medicine_name || 'Medicine'}</h3>
        <span class="ai-badge">OpenRouter AI</span>
      </div>

      <div class="ai-sections">

        <div class="ai-section expiry">
          <div class="ai-section-label">📅 Expiry & Manufacturing</div>
          <div class="ai-section-content">
            <strong>Expiry Date:</strong> ${info.expiry_date}<br>
            <strong>Manufactured:</strong> ${info.manufactured_date}<br>
            ${info.storage_instructions !== 'Not visible on label' ? `<strong>Storage:</strong> ${info.storage_instructions}` : ''}
          </div>
        </div>

        <div class="ai-section usage">
          <div class="ai-section-label">💊 What It's Used For</div>
          <div class="ai-section-content">
            ${info.what_it_is_used_for}
            ${info.dosage && info.dosage !== 'Not visible on label' ? `<br><br><strong>Dosage:</strong> ${info.dosage}` : ''}
          </div>
        </div>

        <div class="ai-section age">
          <div class="ai-section-label">👤 Age Limits & Special Groups</div>
          <div class="ai-section-content">
            <strong>Minimum Age:</strong> ${info.age_limit?.minimum_age}<br>
            ${info.age_limit?.children_warning !== 'Not visible on label' ? `<strong>Children:</strong> ${info.age_limit?.children_warning}<br>` : ''}
            ${info.age_limit?.elderly_warning !== 'Not visible on label' ? `<strong>Elderly:</strong> ${info.age_limit?.elderly_warning}` : ''}
          </div>
        </div>

        <div class="ai-section warnings">
          <div class="ai-section-label">🚫 Who Should Avoid This Medicine</div>
          <div class="ai-section-content">${avoidList}</div>
        </div>

        <div class="ai-section warnings" style="background:rgba(239,68,68,0.05);">
          <div class="ai-section-label">⚠️ Important Warnings</div>
          <div class="ai-section-content">${info.warnings}</div>
        </div>

        <div class="ai-section general">
          <div class="ai-section-label">💉 Side Effects</div>
          <div class="ai-section-content">${sideEffectsList}</div>
        </div>

        <div class="ai-section general">
          <div class="ai-section-label">🔗 Drug Interactions</div>
          <div class="ai-section-content">${interactionList}</div>
        </div>

        ${info.manufacturer && info.manufacturer !== 'Not visible on label' ? `
        <div class="ai-section general">
          <div class="ai-section-label">🏭 Manufacturer</div>
          <div class="ai-section-content">${info.manufacturer}</div>
        </div>` : ''}

      </div>
    </div>
  `;

  showToast('✅ AI analysis complete!', 'success');
}
