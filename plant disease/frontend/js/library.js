/**
 * AgriScan AI - Disease Database & Knowledge Library Controller
 */

let allLibraryDiseases = [];

async function loadLibraryData() {
  try {
    const res = await fetch('/api/database');
    const data = await res.json();
    allLibraryDiseases = data.results || [];

    // Populate Crop Filter Dropdown
    const cropSelect = document.getElementById('lib-crop-filter');
    if (cropSelect && cropSelect.options.length <= 1) {
      const crops = [...new Set(allLibraryDiseases.map(d => d.crop))].sort();
      crops.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        cropSelect.appendChild(opt);
      });
    }

    filterLibrary();
  } catch (err) {
    console.error("Failed to load disease library:", err);
  }
}
window.loadLibraryData = loadLibraryData;

function filterLibrary() {
  const searchInput = document.getElementById('library-search');
  const cropSelect = document.getElementById('lib-crop-filter');
  const pathogenSelect = document.getElementById('lib-pathogen-filter');
  const cvOnlyCheckbox = document.getElementById('lib-cv-only');
  const countEl = document.getElementById('library-count');
  const grid = document.getElementById('library-grid');

  if (!grid) return;

  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selCrop = cropSelect ? cropSelect.value : 'All';
  const selPathogen = pathogenSelect ? pathogenSelect.value : 'All';
  const cvOnly = cvOnlyCheckbox ? cvOnlyCheckbox.checked : false;

  const filtered = allLibraryDiseases.filter(d => {
    // Crop filter
    if (selCrop !== 'All' && d.crop !== selCrop) return false;
    // Pathogen filter
    if (selPathogen !== 'All' && d.pathogen_type !== selPathogen) return false;
    // CV only filter
    if (cvOnly && !d.cv_supported) return false;
    // Text search
    if (q) {
      const haystack = `${d.disease_name} ${d.tamil_name || ''} ${d.crop} ${d.scientific_name} ${d.symptoms}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = filtered.length;
  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full p-12 text-center text-slate-400">No diseases matching your selected criteria.</div>';
    return;
  }

  filtered.forEach(d => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-agri-400 transition-all flex flex-col justify-between space-y-4';

    const cvBadge = d.cv_supported
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold badge-cv-supported"><i data-lucide="check" class="w-3 h-3 mr-1 inline"></i>PlantVillage CV Model</span>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold badge-extended">Extended Agronomy</span>`;

    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${d.crop}</span>
          ${cvBadge}
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900">${d.disease_name}</h3>
          <p class="text-xs text-slate-500 italic">${d.scientific_name || ''}</p>
          ${d.tamil_name ? `<p class="text-[11px] text-agri-700 font-medium mt-0.5">${d.tamil_name}</p>` : ''}
        </div>
        <div class="text-xs text-slate-600 line-clamp-3 leading-relaxed">
          ${d.symptoms}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span class="text-[11px] font-semibold text-slate-500">${d.pathogen_type}</span>
        <button onclick="viewDiseaseDetails('${d.key}')" class="text-xs font-bold text-agri-700 hover:text-agri-800 flex items-center space-x-1">
          <span>View Profile</span>
          <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    grid.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function viewDiseaseDetails(key) {
  const d = allLibraryDiseases.find(item => item.key === key);
  if (!d) return;

  const modal = document.getElementById('disease-modal');
  const cropBadge = document.getElementById('modal-crop-badge');
  const title = document.getElementById('modal-disease-title');
  const sci = document.getElementById('modal-scientific-name');
  const symptoms = document.getElementById('modal-symptoms');
  const organic = document.getElementById('modal-organic');
  const chemical = document.getElementById('modal-chemical');
  const prevention = document.getElementById('modal-prevention');

  if (cropBadge) cropBadge.textContent = d.crop;
  if (title) title.textContent = `${d.disease_name} ${d.tamil_name ? '— ' + d.tamil_name : ''}`;
  if (sci) sci.textContent = `${d.scientific_name} | Pathogen: ${d.pathogen_name} (${d.pathogen_type})`;
  if (symptoms) symptoms.textContent = d.symptoms;
  if (organic) organic.textContent = d.organic_treatment;
  if (chemical) chemical.textContent = d.chemical_treatment;
  if (prevention) prevention.textContent = d.prevention_methods;

  if (modal) modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeDiseaseModal() {
  const modal = document.getElementById('disease-modal');
  if (modal) modal.classList.add('hidden');
}
