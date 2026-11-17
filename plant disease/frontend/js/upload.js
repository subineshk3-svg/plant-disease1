/**
 * AgriScan AI - Upload, Live Camera & Analysis Dispatch Module
 */

let stagedFiles = [];
let cameraStream = null;

// Initialize Upload Elements
document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnAnalyze = document.getElementById('btn-analyze');
  const btnStartCam = document.getElementById('btn-start-camera');
  const btnSnapCam = document.getElementById('btn-snap-camera');
  const btnStopCam = document.getElementById('btn-stop-camera');
  const btnClearQueue = document.getElementById('btn-clear-queue');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-agri-500', 'bg-agri-50/50');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-agri-500', 'bg-agri-50/50');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-agri-500', 'bg-agri-50/50');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        stageFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        stageFiles(Array.from(fileInput.files));
        fileInput.value = '';
      }
    });
  }

  // Camera Controls
  if (btnStartCam) btnStartCam.addEventListener('click', startCamera);
  if (btnSnapCam) btnSnapCam.addEventListener('click', takeSnapshot);
  if (btnStopCam) btnStopCam.addEventListener('click', stopCamera);
  if (btnClearQueue) btnClearQueue.addEventListener('click', clearQueue);
  if (btnAnalyze) btnAnalyze.addEventListener('click', runAnalysis);
});

// Staging Files
function stageFiles(files) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];

  files.forEach(f => {
    if (!allowed.includes(f.type) && !f.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      alert(`Format of ${f.name} is not supported. Please upload JPG, PNG, or WEBP.`);
      return;
    }
    // Prevent duplicate filenames
    if (!stagedFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
      stagedFiles.push(f);
    }
  });

  renderQueue();
}
window.stageFiles = stageFiles;

// Render Staged Files Queue
function renderQueue() {
  const queueContainer = document.getElementById('queue-container');
  const queueList = document.getElementById('queue-list');
  const queueCount = document.getElementById('queue-count');
  const btnAnalyze = document.getElementById('btn-analyze');

  if (!queueContainer || !queueList) return;

  if (stagedFiles.length === 0) {
    queueContainer.classList.add('hidden');
    btnAnalyze.disabled = true;
    btnAnalyze.classList.remove('bg-agri-700', 'hover:bg-agri-800', 'text-white', 'shadow-md', 'cursor-pointer');
    btnAnalyze.classList.add('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
    return;
  }

  queueContainer.classList.remove('hidden');
  queueCount.textContent = stagedFiles.length;
  queueList.innerHTML = '';

  btnAnalyze.disabled = false;
  btnAnalyze.classList.remove('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
  btnAnalyze.classList.add('bg-agri-700', 'hover:bg-agri-800', 'text-white', 'shadow-md', 'cursor-pointer');

  stagedFiles.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'relative group bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-2xs';

    const objUrl = URL.createObjectURL(file);
    item.innerHTML = `
      <div class="aspect-square bg-slate-900 relative">
        <img src="${objUrl}" class="w-full h-full object-cover">
        <button onclick="removeStagedFile(${idx})" class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-700 transition-colors shadow-sm">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      <div class="p-2 text-left">
        <div class="text-[11px] font-bold text-slate-800 truncate">${file.name}</div>
        <div class="text-[10px] text-slate-400">${(file.size / 1024).toFixed(0)} KB</div>
      </div>
    `;
    queueList.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

function removeStagedFile(idx) {
  stagedFiles.splice(idx, 1);
  renderQueue();
}

function clearQueue() {
  stagedFiles = [];
  renderQueue();
}

// WebCam Functions
async function startCamera() {
  const container = document.getElementById('camera-container');
  const video = document.getElementById('camera-feed');
  const btnStart = document.getElementById('btn-start-camera');
  const btnSnap = document.getElementById('btn-snap-camera');
  const btnStop = document.getElementById('btn-stop-camera');

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = cameraStream;
    container.classList.remove('hidden');
    btnStart.classList.add('hidden');
    btnSnap.classList.remove('hidden');
    btnStop.classList.remove('hidden');
  } catch (err) {
    alert("Camera access denied or unavailable on this device.");
    console.error("Camera error:", err);
  }
}

function takeSnapshot() {
  const video = document.getElementById('camera-feed');
  const canvas = document.getElementById('camera-canvas');
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (blob) {
      const snapFile = new File([blob], `cam_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
      stageFiles([snapFile]);
      stopCamera();
    }
  }, 'image/jpeg', 0.95);
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const container = document.getElementById('camera-container');
  const btnStart = document.getElementById('btn-start-camera');
  const btnSnap = document.getElementById('btn-snap-camera');
  const btnStop = document.getElementById('btn-stop-camera');

  if (container) container.classList.add('hidden');
  if (btnStart) btnStart.classList.remove('hidden');
  if (btnSnap) btnSnap.classList.add('hidden');
  if (btnStop) btnStop.classList.add('hidden');
}

// Run Analysis Dispatch
async function runAnalysis() {
  if (stagedFiles.length === 0) return;

  const targetFile = stagedFiles[0]; // Process top item
  const cropSelect = document.getElementById('crop-selector');
  const selectedCrop = cropSelect ? cropSelect.value : 'auto';

  // Show Radar Scanning Modal Overlay
  const overlay = document.getElementById('scanning-overlay');
  const previewThumb = document.getElementById('scan-preview-thumb');
  const statusText = document.getElementById('scan-status-text');
  const progressBar = document.getElementById('scan-progress-bar');

  if (previewThumb) {
    previewThumb.src = URL.createObjectURL(targetFile);
  }
  if (overlay) overlay.classList.remove('hidden');

  // Simulated animated progress
  let progress = 20;
  const interval = setInterval(() => {
    progress = Math.min(progress + 15, 90);
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progress > 50 && statusText) {
      statusText.textContent = "Classifying against PlantVillage 38 benchmark profiles...";
    }
  }, 250);

  // Send to backend
  const formData = new FormData();
  formData.append('file', targetFile);
  formData.append('crop', selectedCrop);

  try {
    const fetchFunc = window.authFetch || fetch;
    const res = await fetchFunc('/api/analyze', {
      method: 'POST',
      body: formData
    });

    clearInterval(interval);
    if (progressBar) progressBar.style.width = '100%';

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Analysis request failed');
    }

    const data = await res.json();
    setTimeout(() => {
      if (overlay) overlay.classList.add('hidden');
      // Set Active Diagnosis in Global State and Navigate
      AppState.activeDiagnosis = data.diagnosis;
      if (window.renderDiagnosisResults) {
        window.renderDiagnosisResults(data.diagnosis);
      }
      navigateTo('results');
    }, 400);

  } catch (err) {
    clearInterval(interval);
    if (overlay) overlay.classList.add('hidden');
    alert(`Diagnosis Error: ${err.message}`);
    console.error("Analysis failed:", err);
  }
}
