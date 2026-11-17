/**
 * AgriScan AI - History & Longitudinal Comparison Controller
 */

let allHistoryRecords = [];

async function loadHistoryData() {
  try {
    const fetchFunc = window.authFetch || fetch;
    const res = await fetchFunc('/api/diagnoses?limit=60');
    allHistoryRecords = await res.json();
    renderHistoryTable(allHistoryRecords);
    populateComparisonSelects(allHistoryRecords);
  } catch (err) {
    console.error("Failed to load diagnosis history:", err);
  }
}
window.loadHistoryData = loadHistoryData;

function renderHistoryTable(records) {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!records || records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-400 italic">No past diagnoses recorded yet. Run a scan from the Disease Detection page!</td>
      </tr>
    `;
    return;
  }

  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors';

    const confPct = Math.round((r.confidence || 0) * 100);
    const sevPct = r.severity_pct || 0.0;
    const isUncertain = r.is_uncertain;

    const statusBadge = isUncertain
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Uncertain</span>`
      : r.pathogen_type === 'Healthy'
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Healthy</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">${sevPct}% (${r.severity_label})</span>`;

    tr.innerHTML = `
      <td class="p-4 flex items-center space-x-3">
        <div class="w-10 h-10 rounded-lg bg-slate-900 overflow-hidden shrink-0">
          <img src="${r.annotated_image_path || r.original_image_path}" class="w-full h-full object-cover">
        </div>
        <div>
          <span class="font-mono text-[11px] text-slate-400 block">#AGRI-${String(r.id).padStart(5, '0')}</span>
          <span class="font-bold text-slate-900">${r.original_filename || 'leaf.jpg'}</span>
        </div>
      </td>
      <td class="p-4 font-semibold text-slate-800">${r.crop}</td>
      <td class="p-4">
        <div class="font-bold text-slate-900">${r.disease_name}</div>
        ${r.tamil_name ? `<div class="text-[10px] text-slate-400">${r.tamil_name}</div>` : ''}
      </td>
      <td class="p-4">${statusBadge}</td>
      <td class="p-4 font-extrabold text-agri-700">${confPct}%</td>
      <td class="p-4 text-slate-500 text-[11px] whitespace-nowrap">${r.created_at || 'Recently'}</td>
      <td class="p-4 text-right space-x-2">
        <button onclick="viewHistoricalReport(${r.id})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors">
          View
        </button>
        <button onclick="downloadHistoryPdf(${r.id}, 'en')" class="px-2.5 py-1 bg-agri-50 hover:bg-agri-100 text-agri-800 rounded-lg font-bold text-[11px] transition-colors" title="Download English PDF">
          PDF
        </button>
        <button onclick="deleteHistoricalRecord(${r.id})" class="p-1 text-slate-400 hover:text-rose-600 transition-colors" title="Delete Scan">
          <i data-lucide="trash-2" class="w-4 h-4 inline"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

async function viewHistoricalReport(id) {
  try {
    const fetchFunc = window.authFetch || fetch;
    const res = await fetchFunc(`/api/diagnoses/${id}`);
    const data = await res.json();
    AppState.activeDiagnosis = data;
    if (window.renderDiagnosisResults) {
      window.renderDiagnosisResults(data);
    }
    navigateTo('results');
  } catch (err) {
    alert("Failed to load historical diagnosis: " + err.message);
  }
}

function downloadHistoryPdf(id, lang) {
  window.open(`/api/report/pdf/${id}?lang=${lang}`, '_blank');
}

async function deleteHistoricalRecord(id) {
  if (!confirm(`Are you sure you want to delete scan #AGRI-${String(id).padStart(5, '0')}?`)) return;

  try {
    const fetchFunc = window.authFetch || fetch;
    const res = await fetchFunc(`/api/diagnoses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadHistoryData();
    }
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
}

// Side-by-Side Comparison
function populateComparisonSelects(records) {
  const sel1 = document.getElementById('compare-select-1');
  const sel2 = document.getElementById('compare-select-2');
  if (!sel1 || !sel2) return;

  sel1.innerHTML = '';
  sel2.innerHTML = '';

  records.forEach((r, idx) => {
    const opt1 = document.createElement('option');
    opt1.value = r.id;
    opt1.textContent = `#${r.id} - ${r.crop} (${r.disease_name}) - ${r.created_at || ''}`;
    sel1.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = r.id;
    opt2.textContent = `#${r.id} - ${r.crop} (${r.disease_name}) - ${r.created_at || ''}`;
    sel2.appendChild(opt2);
  });

  if (records.length >= 2) {
    sel2.selectedIndex = 1;
  }
}

function openComparisonSelector() {
  const modal = document.getElementById('compare-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeComparisonModal() {
  const modal = document.getElementById('compare-modal');
  if (modal) modal.classList.add('hidden');
}

async function executeComparison() {
  const sel1 = document.getElementById('compare-select-1');
  const sel2 = document.getElementById('compare-select-2');
  if (!sel1 || !sel2) return;

  const id1 = parseInt(sel1.value);
  const id2 = parseInt(sel2.value);

  if (id1 === id2) {
    alert("Please select two different scans to compare longitudinal progression.");
    return;
  }

  try {
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosis_id_1: id1, diagnosis_id_2: id2 })
    });

    const data = await res.json();
    renderComparisonResult(data);
  } catch (err) {
    alert("Comparison error: " + err.message);
  }
}

function renderComparisonResult(data) {
  const view = document.getElementById('compare-result-view');
  if (!view) return;

  const discEn = document.getElementById('compare-disclaimer-en');
  const discTa = document.getElementById('compare-disclaimer-ta');
  if (discEn) discEn.textContent = data.recovery_disclaimer;
  if (discTa) discTa.textContent = data.tamil_recovery_disclaimer;

  const e = data.early_diagnosis;
  const l = data.later_diagnosis;

  // Baseline
  document.getElementById('comp-date-1').textContent = e.created_at || '';
  document.getElementById('comp-img-1').src = e.annotated_image_path || e.original_image_path;
  document.getElementById('comp-meta-1').innerHTML = `
    <b>${e.crop} — ${e.disease_name}</b><br>
    Severity: ${e.severity_pct}% (${e.severity_label})<br>
    Confidence: ${Math.round(e.confidence*100)}%
  `;

  // Follow-up
  document.getElementById('comp-date-2').textContent = l.created_at || '';
  document.getElementById('comp-img-2').src = l.annotated_image_path || l.original_image_path;
  document.getElementById('comp-meta-2').innerHTML = `
    <b>${l.crop} — ${l.disease_name}</b><br>
    Severity: ${l.severity_pct}% (${l.severity_label})<br>
    Confidence: ${Math.round(l.confidence*100)}%
  `;

  // Summary Delta
  const summaryBox = document.getElementById('comp-summary-box');
  summaryBox.innerHTML = `
    <div class="font-bold text-slate-900">${data.visual_trend}</div>
    <div class="text-slate-600">${data.summary}</div>
    <div class="text-[11px] text-slate-400 mt-1">Severity Delta: ${data.severity_difference_pct > 0 ? '+' : ''}${data.severity_difference_pct}% | Lesion Delta: ${data.lesion_count_difference > 0 ? '+' : ''}${data.lesion_count_difference} clusters</div>
  `;

  view.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}
