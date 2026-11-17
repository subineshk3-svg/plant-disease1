/**
 * AgriScan AI - Results Page Controller
 * Renders the 16 diagnostic fields, bounding boxes, severity meter, and differential analyses.
 */

let activeResultImageMode = 'annotated';

function renderDiagnosisResults(d) {
  if (!d) return;

  // Header & Title
  const titleEl = document.getElementById('res-disease-title');
  const sciEl = document.getElementById('res-scientific-name');
  const badgeEl = document.getElementById('res-badge-status');
  const timeEl = document.getElementById('res-scan-time');

  if (titleEl) titleEl.textContent = `${d.crop} — ${d.disease_name}`;
  if (sciEl) sciEl.textContent = `${d.scientific_name} | Pathogen: ${d.pathogen_name} (${d.pathogen_type})`;
  if (timeEl) timeEl.textContent = `Analysis Date: ${d.created_at || new Date().toLocaleString()}`;

  if (badgeEl) {
    if (d.is_uncertain) {
      badgeEl.textContent = "Uncertain / Insufficient Evidence";
      badgeEl.className = "text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider";
    } else if (d.pathogen_type === 'Healthy') {
      badgeEl.textContent = "Certified Healthy Specimen";
      badgeEl.className = "text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider";
    } else {
      badgeEl.textContent = "AI Model Prediction";
      badgeEl.className = "text-xs font-bold text-agri-800 bg-agri-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider";
    }
  }

  // Image Viewport
  activeResultImageMode = 'annotated';
  updateResultImage();

  // Symptom Bounding Boxes Legend
  renderSymptomLegend(d.symptom_boxes || []);

  // Severity Gauge
  const sevBadge = document.getElementById('res-severity-badge');
  const sevBar = document.getElementById('res-severity-bar');
  const sevPct = d.severity_pct || 0.0;

  if (sevBadge) sevBadge.textContent = d.severity_label || `${sevPct}% damage`;
  if (sevBar) {
    sevBar.style.width = `${Math.min(100, Math.max(5, sevPct))}%`;
    if (sevPct < 5) {
      sevBar.className = "severity-bar-fill h-full rounded-full bg-emerald-500";
    } else if (sevPct < 15) {
      sevBar.className = "severity-bar-fill h-full rounded-full bg-blue-500";
    } else if (sevPct < 30) {
      sevBar.className = "severity-bar-fill h-full rounded-full bg-amber-500";
    } else {
      sevBar.className = "severity-bar-fill h-full rounded-full bg-rose-500";
    }
  }

  // Confidence & Quality Metrics
  const confEl = document.getElementById('res-confidence-score');
  const confBar = document.getElementById('res-confidence-bar');
  const confVal = Math.round((d.confidence || 0) * 100);

  if (confEl) confEl.textContent = `${confVal}%`;
  if (confBar) confBar.style.width = `${confVal}%`;

  const q = d.image_quality || {};
  const sharpEl = document.getElementById('res-quality-sharpness');
  const expoEl = document.getElementById('res-quality-exposure');
  if (sharpEl) sharpEl.textContent = `${q.quality_label || 'Optimal'} (Laplacian: ${q.sharpness_laplacian || 'N/A'})`;
  if (expoEl) expoEl.textContent = `${q.brightness_mean || 'N/A'} (Luminance Mean)`;

  // Differential Alternatives
  const altsContainer = document.getElementById('res-alternatives-list');
  if (altsContainer) {
    altsContainer.innerHTML = '';
    const alts = d.alternative_diagnoses || [];
    if (alts.length === 0) {
      altsContainer.innerHTML = '<div class="text-slate-400 italic">No strong alternative candidates identified.</div>';
    } else {
      alts.forEach(alt => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100';
        const confPct = Math.round((alt.confidence || 0) * 100);
        item.innerHTML = `
          <div class="truncate pr-2">
            <span class="font-bold text-slate-800">${alt.disease_name}</span>
            <span class="text-slate-400 block text-[10px]">${alt.crop}</span>
          </div>
          <span class="font-extrabold text-agri-700 whitespace-nowrap">${confPct}%</span>
        `;
        altsContainer.appendChild(item);
      });
    }
  }

  // Populate 16 Field Cards
  setFieldText('res-field-symptoms', d.symptoms);
  setFieldText('res-field-tamil-symptoms', d.tamil_symptoms);
  setFieldText('res-field-pathogen', `${d.pathogen_name} (${d.pathogen_type})`);
  setFieldText('res-field-causes', d.causes);
  setFieldText('res-field-organic', d.organic_treatment);
  setFieldText('res-field-tamil-organic', d.tamil_organic_treatment);
  setFieldText('res-field-chemical', d.chemical_treatment);
  setFieldText('res-field-tamil-chemical', d.tamil_chemical_treatment);
  setFieldText('res-field-prevention', d.prevention_methods);
  setFieldText('res-field-tamil-prevention', d.tamil_prevention);
  setFieldText('res-field-monitoring', d.monitoring_recommendations);
  setFieldText('res-field-expert', d.when_to_consult_expert);

  // Multimodal Vision Explanation Card (if present)
  const geminiCard = document.getElementById('gemini-explanation-card');
  const geminiBody = document.getElementById('gemini-explanation-body');
  if (d.gemini_explanation && geminiCard && geminiBody) {
    let cleanExp = d.gemini_explanation
      .replace(/NVIDIA\s+NIM\s+Multimodal\s+Vision\s+Diagnostic\s+Evaluation\s*\([^\)]*\)/gi, 'Multimodal Vision Diagnostic Evaluation')
      .replace(/NVIDIA\s+NIM\s+Diagnostic\s+Evaluation\s*\([^\)]*\)/gi, 'Multimodal Vision Diagnostic Evaluation')
      .replace(/NVIDIA\s+NIM\s*\([^\)]*\)/gi, 'AI Engine')
      .replace(/nemotron-3\.5-super-vl-120b(-a12b)?/gi, '')
      .replace(/NVIDIA\s+NIM/gi, 'AI Vision Engine');
    geminiBody.textContent = cleanExp;
    geminiCard.classList.remove('hidden');
  } else if (geminiCard) {
    geminiCard.classList.add('hidden');
  }

  if (window.lucide) lucide.createIcons();
}
window.renderDiagnosisResults = renderDiagnosisResults;

function setFieldText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || 'N/A';
}

function updateResultImage() {
  const imgEl = document.getElementById('res-main-image');
  const btnAnno = document.getElementById('btn-toggle-annotated');
  const btnOrig = document.getElementById('btn-toggle-original');
  const d = AppState.activeDiagnosis;
  if (!imgEl || !d) return;

  if (activeResultImageMode === 'annotated') {
    imgEl.src = d.annotated_image_path || d.original_image_path;
    if (btnAnno) {
      btnAnno.className = "px-3 py-1 rounded-md bg-white text-slate-900 shadow-sm transition-all";
    }
    if (btnOrig) {
      btnOrig.className = "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 transition-all";
    }
  } else {
    imgEl.src = d.original_image_path;
    if (btnOrig) {
      btnOrig.className = "px-3 py-1 rounded-md bg-white text-slate-900 shadow-sm transition-all";
    }
    if (btnAnno) {
      btnAnno.className = "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 transition-all";
    }
  }
}

function toggleResultImage(mode) {
  activeResultImageMode = mode;
  updateResultImage();
}

function renderSymptomLegend(boxes) {
  const container = document.getElementById('symptom-boxes-legend');
  if (!container) return;

  container.innerHTML = '';
  if (!boxes || boxes.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400 italic">No localized necrotic lesions detected.</span>';
    return;
  }

  boxes.forEach(box => {
    const pill = document.createElement('span');
    pill.className = 'inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200';
    pill.innerHTML = `
      <span class="w-2 h-2 rounded-full" style="background-color: ${box.color}"></span>
      <span>#${box.id} ${box.type} (${Math.round(box.confidence * 100)}%)</span>
    `;
    container.appendChild(pill);
  });
}

// Download PDF
function downloadPdf(lang) {
  const d = AppState.activeDiagnosis;
  if (!d || !d.id) {
    alert("No active diagnosis record available for PDF export.");
    return;
  }
  const url = `/api/report/pdf/${d.id}?lang=${lang}`;
  window.open(url, '_blank');
}

// Open Chatbot with Current Diagnosis Context
function openChatWithContext() {
  navigateTo('chat');
}
