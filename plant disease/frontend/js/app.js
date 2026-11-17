/**
 * AgriScan AI - Main Application Router & Global State
 */

const AppState = {
  currentPage: 'home',
  activeDiagnosis: null,
  chatLanguage: 'en',
  sampleImages: [],
  supportedCrops: []
};

let adminDashboardLocked = true;

async function checkAdminLockStatus() {
  try {
    const res = await fetch('/api/admin/lock-status');
    if (res.ok) {
      const data = await res.json();
      adminDashboardLocked = !!data.locked;
    }
  } catch (e) {
    adminDashboardLocked = true;
  }
}

function interceptDirectAdminNavigation() {
  const hash = (window.location.hash || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  if (hash.includes('admin') || search.includes('admin')) {
    if (adminDashboardLocked) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      setTimeout(() => {
        if (typeof showAuthNotification === 'function') {
          showAuthNotification('Admin Dashboard is currently locked.');
        } else {
          alert('Admin Dashboard is currently locked.');
        }
        navigateTo('home');
      }, 50);
    }
  }
}

window.addEventListener('hashchange', interceptDirectAdminNavigation);
window.addEventListener('popstate', interceptDirectAdminNavigation);

// Navigation Controller
function navigateTo(pageId) {
  // Centralized Admin Dashboard Access Lock (Blocks everyone, including admins)
  if (pageId === 'admin') {
    if (adminDashboardLocked) {
      if (typeof showAuthNotification === 'function') {
        showAuthNotification('Admin Dashboard is currently locked.');
      } else {
        alert('Admin Dashboard is currently locked.');
      }
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      pageId = 'home';
    }
  }

  // Route Protection Guard
  const protectedPages = ['detection', 'history', 'profile'];
  if (protectedPages.includes(pageId) && typeof isAuthenticated === 'function' && !isAuthenticated()) {
    sessionStorage.setItem('agriscan_redirect_after_login', pageId);
    showAuthError('login-error-alert', 'Please sign in or create a free account to access this feature.');
    pageId = 'login';
  }

  AppState.currentPage = pageId;

  // Hide all pages
  document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));

  // Show target page
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update nav item active styling
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('bg-agri-50', 'text-agri-800', 'font-bold');
    el.classList.add('text-slate-600');
  });

  const activeNav = document.getElementById(`nav-${pageId}`);
  if (activeNav) {
    activeNav.classList.add('bg-agri-50', 'text-agri-800', 'font-bold');
    activeNav.classList.remove('text-slate-600');
  }

  // Page-specific initialization triggers
  if (pageId === 'library') {
    if (typeof loadLibraryData === 'function') loadLibraryData();
  } else if (pageId === 'history') {
    if (typeof loadHistoryData === 'function') loadHistoryData();
  } else if (pageId === 'admin') {
    if (typeof loadAdminData === 'function') loadAdminData();
  } else if (pageId === 'chat') {
    if (typeof syncChatContext === 'function') syncChatContext();
  } else if (pageId === 'profile') {
    if (typeof populateProfileData === 'function') populateProfileData();
  }

  // Refresh lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Fetch System Health Status
async function checkSystemHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const pill = document.getElementById('system-health-pill');
    const label = document.getElementById('health-label');
    if (data.status === 'healthy') {
      if (data.nvidia_nim_connected) {
        label.textContent = 'Multimodal AI Online';
      } else if (data.gemini_vision_connected) {
        label.textContent = 'CV + Gemini Online';
      } else {
        label.textContent = 'CV Engine Online';
      }
      pill.classList.remove('hidden');
    }
  } catch (e) {
    console.warn('[AgriScan] Backend health check warning:', e);
  }
}

// Load One-Click Test Samples for Home Page
async function loadHomeSamples() {
  const container = document.getElementById('home-samples-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/samples');
    const samples = await res.json();
    AppState.sampleImages = samples;

    container.innerHTML = '';
    samples.forEach(s => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-agri-400 transition-all cursor-pointer group';
      card.onclick = () => testWithSample(s);

      card.innerHTML = `
        <div class="aspect-square bg-slate-900 overflow-hidden relative">
          <img src="${s.url}" alt="${s.crop}" class="w-full h-full object-cover group-hover:scale-105 transition-all">
          <div class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-900 backdrop-blur-xs">
            ${s.crop}
          </div>
        </div>
        <div class="p-3">
          <div class="font-bold text-xs text-slate-900 truncate">${s.expected}</div>
          <div class="text-[11px] text-slate-400 truncate mt-0.5">${s.desc}</div>
        </div>
      `;
      container.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error('Error loading sample gallery:', e);
  }
}

// Trigger Instant Analysis from Sample Card
async function testWithSample(sample) {
  navigateTo('detection');
  // Load sample into staged queue and immediately trigger analysis
  try {
    const response = await fetch(sample.url);
    const blob = await response.blob();
    const file = new File([blob], sample.filename, { type: 'image/jpeg' });

    if (window.stageFiles) {
      window.stageFiles([file]);
      if (document.getElementById('crop-selector')) {
        document.getElementById('crop-selector').value = sample.crop === 'auto' ? 'auto' : sample.crop;
      }
      setTimeout(() => {
        const btn = document.getElementById('btn-analyze');
        if (btn) btn.click();
      }, 300);
    }
  } catch (e) {
    console.error('Failed to stage sample file:', e);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  await checkAdminLockStatus();
  interceptDirectAdminNavigation();
  checkSystemHealth();
  loadHomeSamples();
  navigateTo('home');
});
