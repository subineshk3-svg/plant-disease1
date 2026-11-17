/**
 * AgriScan AI - Admin Dashboard & Analytics Controller
 */

let cropsChartInstance = null;
let pathogensChartInstance = null;

async function loadAdminData() {
  try {
    const res = await fetch('/api/admin/stats');
    if (res.status === 423) {
      if (typeof showAuthNotification === 'function') {
        showAuthNotification('Admin Dashboard is currently locked.');
      } else {
        alert('Admin Dashboard is currently locked.');
      }
      if (typeof navigateTo === 'function') navigateTo('home');
      return;
    }
    const data = await res.json();

    // Metric counters
    const totalEl = document.getElementById('adm-total-scans');
    const diseasedEl = document.getElementById('adm-diseased-scans');
    const healthyEl = document.getElementById('adm-healthy-scans');
    const uncertainEl = document.getElementById('adm-uncertain-scans');

    if (totalEl) totalEl.textContent = data.total_scans;
    if (diseasedEl) diseasedEl.textContent = data.diseased_scans;
    if (healthyEl) healthyEl.textContent = data.healthy_scans;
    if (uncertainEl) uncertainEl.textContent = data.uncertain_scans;

    // Charts
    renderCropsChart(data.crop_distribution || []);
    renderPathogensChart(data.pathogen_distribution || []);

    // Failed Analysis Logs
    renderFailedLogs(data.failed_logs || []);

    // API Key inputs
    const keyInput = document.getElementById('gemini-key-input');
    if (keyInput && data.settings && data.settings.gemini_api_key) {
      keyInput.value = data.settings.gemini_api_key;
    }

    const nvInput = document.getElementById('nvidia-key-input');
    if (nvInput && data.settings && data.settings.nvidia_api_key) {
      nvInput.value = data.settings.nvidia_api_key;
    }
  } catch (err) {
    console.error("Failed to load admin statistics:", err);
  }
}
window.loadAdminData = loadAdminData;

async function saveNvidiaApiKey() {
  const nvInput = document.getElementById('nvidia-key-input');
  const statusEl = document.getElementById('nvidia-key-status');
  if (!nvInput) return;

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nvidia_api_key: nvInput.value.trim() })
    });

    if (res.ok) {
      if (statusEl) {
        statusEl.classList.remove('hidden');
        setTimeout(() => statusEl.classList.add('hidden'), 3500);
      }
      if (typeof checkSystemHealth === 'function') checkSystemHealth();
    }
  } catch (err) {
    alert("Error updating API key: " + err.message);
  }
}
window.saveNvidiaApiKey = saveNvidiaApiKey;

function refreshAdminData() {
  loadAdminData();
}

function renderCropsChart(dist) {
  const ctx = document.getElementById('chart-crops');
  if (!ctx || !window.Chart) return;

  if (cropsChartInstance) {
    cropsChartInstance.destroy();
  }

  const labels = dist.length > 0 ? dist.map(d => d.crop) : ['Tomato', 'Potato', 'Corn', 'Apple', 'Grape'];
  const values = dist.length > 0 ? dist.map(d => d.count) : [12, 8, 7, 5, 4];

  cropsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Field Scans',
        data: values,
        backgroundColor: '#16a34a',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderPathogensChart(dist) {
  const ctx = document.getElementById('chart-pathogens');
  if (!ctx || !window.Chart) return;

  if (pathogensChartInstance) {
    pathogensChartInstance.destroy();
  }

  const labels = dist.length > 0 ? dist.map(d => d.pathogen_type || 'Unknown') : ['Fungus', 'Bacteria', 'Virus', 'Healthy', 'Pest'];
  const values = dist.length > 0 ? dist.map(d => d.count) : [18, 9, 5, 6, 2];

  pathogensChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#15803d', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      }
    }
  });
}

function renderFailedLogs(logs) {
  const tbody = document.getElementById('failed-logs-table');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 italic">No failed or rejected scans recorded. All uploads met quality thresholds.</td></tr>`;
    return;
  }

  logs.forEach(l => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors';
    tr.innerHTML = `
      <td class="p-3 font-semibold text-slate-800">${l.filename || 'unknown.jpg'}</td>
      <td class="p-3 text-rose-700 font-bold">${l.reason}</td>
      <td class="p-3 text-slate-500 max-w-xs truncate">${l.details || 'N/A'}</td>
      <td class="p-3 text-slate-400 text-[11px]">${l.created_at || 'Recently'}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveApiKey() {
  const keyInput = document.getElementById('gemini-key-input');
  const statusEl = document.getElementById('gemini-key-status');
  if (!keyInput) return;

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gemini_api_key: keyInput.value.trim() })
    });

    if (res.ok) {
      if (statusEl) {
        statusEl.classList.remove('hidden');
        setTimeout(() => statusEl.classList.add('hidden'), 3500);
      }
      checkSystemHealth();
    }
  } catch (err) {
    alert("Error saving API key: " + err.message);
  }
}
