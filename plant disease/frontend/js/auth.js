/**
 * AgriScan AI - Authentication, User Session & Security Module
 * Handles login, signup, session persistence, route protection,
 * password validation, recovery workflows, and bilingual support.
 */

const AuthStrings = {
  en: {
    loginTitle: "Welcome Back to AgriScan AI",
    loginSubtitle: "Sign in to access your crop diagnostic reports and personal farm history",
    email: "Email Address",
    password: "Password",
    rememberMe: "Remember me for 30 days",
    forgotPassword: "Forgot password?",
    loginBtn: "Sign In to AgriScan AI",
    noAccount: "Don't have an account?",
    signUpNow: "Create an account",
    signupTitle: "Join AgriScan AI",
    signupSubtitle: "Empower your farm with enterprise plant disease intelligence",
    fullName: "Full Name",
    mobile: "Mobile Number (Optional)",
    country: "Country",
    preferredLang: "Preferred Language",
    confirmPassword: "Confirm Password",
    acceptTerms: "I accept the AgriScan AI Terms of Service and Privacy Policy",
    createAccountBtn: "Create Free Account",
    alreadyHaveAccount: "Already registered?",
    signInNow: "Sign In here",
    forgotTitle: "Reset Your Password",
    forgotSubtitle: "Enter your registered email address and we'll dispatch a recovery link",
    sendResetBtn: "Send Recovery Link",
    backToLogin: "Back to Sign In",
    resetTitle: "Create New Password",
    resetSubtitle: "Enter your secure token and choose a strong new password",
    resetBtn: "Update Password",
    profileTitle: "Farmer Profile & Account Settings",
    profileSubtitle: "Manage your personal credentials, contact details, and platform preferences",
    saveProfileBtn: "Save Profile Changes",
    changePwdTitle: "Change Account Password",
    currentPwd: "Current Password",
    newPwd: "New Password",
    confirmNewPwd: "Confirm New Password",
    updatePwdBtn: "Update Password",
    logoutBtn: "Log Out",
    demoLoginBtn: "Quick Demo Farmer Login (farmer@agriscan.ai)",
    pwdReqLength: "At least 8 characters",
    pwdReqLetter: "At least one letter",
    pwdReqNumber: "At least one number",
    pwdMatch: "Passwords match",
    pwdMismatch: "Passwords do not match",
    loginRequired: "Please sign in or create an account to access this feature.",
    sessionExpired: "Your session has expired. Please log in again."
  },
  ta: {
    loginTitle: "அக்ரிஸ்கேன் AI-க்கு மீண்டும் வருக",
    loginSubtitle: "உங்கள் பயிர் நோய் கண்டறிதல் மற்றும் முந்தைய பதிவுகளை காண உள்நுழையவும்",
    email: "மின்னஞ்சல் முகவரி",
    password: "கடவுச்சொல்",
    rememberMe: "30 நாட்களுக்கு என்னை நினைவில் கொள்க",
    forgotPassword: "கடவுச்சொல் மறந்துவிட்டதா?",
    loginBtn: "உள்நுழைக",
    noAccount: "புதிய கணக்கு வேண்டுமா?",
    signUpNow: "புதிய கணக்கு தொடங்கவும்",
    signupTitle: "அக்ரிஸ்கேன் AI-ல் இணையுங்கள்",
    signupSubtitle: "நவீன பயிர் நோய் கண்டறியும் AI தொழில்நுட்பத்தை இலவசமாக பெறுங்கள்",
    fullName: "முழு பெயர்",
    mobile: "கைபேசி எண் (விருப்பத்தேர்வு)",
    country: "நாடு",
    preferredLang: "விருப்ப மொழி",
    confirmPassword: "கடவுச்சொல்லை மீண்டும் உள்ளிடவும்",
    acceptTerms: "விதிமுறைகள் மற்றும் தனியுரிமைக் கொள்கைகளை ஏற்றுக்கொள்கிறேன்",
    createAccountBtn: "கணக்கை உருவாக்குக",
    alreadyHaveAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
    signInNow: "இங்கே உள்நுழைக",
    forgotTitle: "கடவுச்சொல் மீட்பு",
    forgotSubtitle: "பதிவுசெய்த மின்னஞ்சல் முகவரியை உள்ளிட்டு மீட்பு இணைப்பை பெறவும்",
    sendResetBtn: "மீட்பு இணைப்பை அனுப்புக",
    backToLogin: "உள்நுழைவுக்குத் திரும்பு",
    resetTitle: "புதிய கடவுச்சொல்லை அமைக்கவும்",
    resetSubtitle: "டோக்கனை உள்ளிட்டு பாதுகாப்பான புதிய கடவுச்சொல்லை அமைக்கவும்",
    resetBtn: "கடவுச்சொல்லை புதுப்பிக்கவும்",
    profileTitle: "விவசாயி சுயவிவரம் மற்றும் அமைப்புகள்",
    profileSubtitle: "உங்கள் சுயவிவரம் மற்றும் கடவுச்சொல்லை நிர்வகிக்கவும்",
    saveProfileBtn: "மாற்றங்களைச் சேமி",
    changePwdTitle: "கடவுச்சொல்லை மாற்றுக",
    currentPwd: "தற்போதைய கடவுச்சொல்",
    newPwd: "புதிய கடவுச்சொல்",
    confirmNewPwd: "புதிய கடவுச்சொல்லை மீண்டும் உள்ளிடவும்",
    updatePwdBtn: "கடவுச்சொல்லை மாற்றுக",
    logoutBtn: "வெளியேறுக",
    demoLoginBtn: "மாதிரி விவசாயி உள்நுழைவு (farmer@agriscan.ai)",
    pwdReqLength: "குறைந்தது 8 எழுத்துக்கள்",
    pwdReqLetter: "குறைந்தது ஒரு எழுத்து",
    pwdReqNumber: "குறைந்தது ஒரு எண்",
    pwdMatch: "கடவுச்சொற்கள் பொருந்துகின்றன",
    pwdMismatch: "கடவுச்சொற்கள் பொருந்தவில்லை",
    loginRequired: "இச்சேவையைப் பயன்படுத்த தயவுசெய்து உள்நுழையவும் அல்லது பதிவு செய்யவும்.",
    sessionExpired: "அமர்வு காலாவதியானது. தயவுசெய்து மீண்டும் உள்நுழையவும்."
  }
};

const AuthState = {
  token: localStorage.getItem('agriscan_token') || null,
  user: null,
  lang: localStorage.getItem('agriscan_lang') || 'en'
};

// Parse initial user from localStorage if present
try {
  const cached = localStorage.getItem('agriscan_user');
  if (cached) {
    AuthState.user = JSON.parse(cached);
  }
} catch (e) {
  AuthState.user = null;
}

// ---------------- CORE SESSION UTILITIES ----------------

function getAuthToken() {
  return AuthState.token || localStorage.getItem('agriscan_token');
}

function getCurrentUser() {
  return AuthState.user;
}

function isAuthenticated() {
  return !!(AuthState.token && AuthState.user);
}

function setAuthSession(token, user) {
  AuthState.token = token;
  AuthState.user = user;
  localStorage.setItem('agriscan_token', token);
  localStorage.setItem('agriscan_user', JSON.stringify(user));
  if (user && user.language) {
    AuthState.lang = user.language;
    localStorage.setItem('agriscan_lang', user.language);
  }
  updateAuthUI();
}

function clearAuthSession() {
  AuthState.token = null;
  AuthState.user = null;
  localStorage.removeItem('agriscan_token');
  localStorage.removeItem('agriscan_user');
  
  // Call backend logout
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  updateAuthUI();
}

/**
 * Enhanced fetch wrapper that attaches Authorization bearer header
 */
async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = options.headers ? { ...options.headers } : {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const opts = { ...options, headers };
  
  const res = await fetch(url, opts);
  if (res.status === 401) {
    // If unauthorized, session may have expired
    console.warn('[AgriScan Auth] 401 Unauthorized received');
  }
  return res;
}
window.authFetch = authFetch;

// ---------------- UI & NAVIGATION SYNC ----------------

function updateAuthUI() {
  const user = getCurrentUser();
  const guestNav = document.getElementById('header-guest-nav');
  const userNav = document.getElementById('header-user-nav');
  const userPillName = document.getElementById('header-user-name');
  const userPillAvatar = document.getElementById('header-user-avatar');

  if (isAuthenticated() && user) {
    if (guestNav) guestNav.classList.add('hidden');
    if (userNav) userNav.classList.remove('hidden');
    if (userPillName) userPillName.textContent = user.name || user.email;
    if (userPillAvatar) {
      const initial = (user.name || user.email || 'U')[0].toUpperCase();
      userPillAvatar.textContent = initial;
    }
  } else {
    if (guestNav) guestNav.classList.remove('hidden');
    if (userNav) userNav.classList.add('hidden');
  }

  // Refresh profile page fields if active
  if (document.getElementById('page-profile') && !document.getElementById('page-profile').classList.contains('hidden')) {
    populateProfileData();
  }

  if (window.lucide) lucide.createIcons();
}

// ---------------- FORM HANDLERS ----------------

// 1. LOGIN HANDLER
async function handleLoginSubmit(event) {
  if (event) event.preventDefault();

  const emailEl = document.getElementById('login-email');
  const pwdEl = document.getElementById('login-password');
  const rememberEl = document.getElementById('login-remember');
  const errBox = document.getElementById('login-error-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  if (!emailEl || !pwdEl) return;

  const email = emailEl.value.trim();
  const password = pwdEl.value;
  const rememberMe = rememberEl ? rememberEl.checked : false;

  if (!email || !password) {
    showAuthError('login-error-alert', 'Please enter both email and password.');
    return;
  }

  // UI loading
  setButtonLoading(submitBtn, true, 'Signing In...');
  hideAuthError('login-error-alert');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me: rememberMe })
    });

    const data = await res.json();
    setButtonLoading(submitBtn, false, 'Sign In to AgriScan AI');

    if (!res.ok) {
      throw new Error(data.detail || 'Invalid email or password.');
    }

    // Success: store session
    setAuthSession(data.token, data.user);

    // Redirect to stored target or home
    const redirectPage = sessionStorage.getItem('agriscan_redirect_after_login') || 'home';
    sessionStorage.removeItem('agriscan_redirect_after_login');
    
    // Clear form
    pwdEl.value = '';
    
    showAuthNotification(`Welcome back, ${data.user.name}!`);
    navigateTo(redirectPage);

  } catch (err) {
    setButtonLoading(submitBtn, false, 'Sign In to AgriScan AI');
    showAuthError('login-error-alert', err.message);
  }
}

// 2. QUICK DEMO LOGIN
function handleDemoLogin() {
  const emailEl = document.getElementById('login-email');
  const pwdEl = document.getElementById('login-password');
  if (emailEl && pwdEl) {
    emailEl.value = 'farmer@agriscan.ai';
    pwdEl.value = 'Farmer@123';
    handleLoginSubmit();
  }
}

// 3. SIGNUP HANDLER
async function handleSignupSubmit(event) {
  if (event) event.preventDefault();

  const nameEl = document.getElementById('signup-name');
  const emailEl = document.getElementById('signup-email');
  const mobileEl = document.getElementById('signup-mobile');
  const pwdEl = document.getElementById('signup-password');
  const confirmEl = document.getElementById('signup-confirm-password');
  const countryEl = document.getElementById('signup-country');
  const langEl = document.getElementById('signup-language');
  const termsEl = document.getElementById('signup-terms');
  const submitBtn = document.getElementById('signup-submit-btn');

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const mobile = mobileEl ? mobileEl.value.trim() : '';
  const password = pwdEl.value;
  const confirmPassword = confirmEl.value;
  const country = countryEl ? countryEl.value : 'India';
  const language = langEl ? langEl.value : 'en';
  const termsAccepted = termsEl ? termsEl.checked : false;

  if (!name || !email || !password) {
    showAuthError('signup-error-alert', 'Please complete all required fields.');
    return;
  }

  if (!termsAccepted) {
    showAuthError('signup-error-alert', 'Please accept the Terms of Service and Privacy Policy to continue.');
    return;
  }

  if (password !== confirmPassword) {
    showAuthError('signup-error-alert', 'Passwords do not match.');
    return;
  }

  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    showAuthError('signup-error-alert', 'Password must be at least 8 characters and include both letters and numbers.');
    return;
  }

  setButtonLoading(submitBtn, true, 'Creating Account...');
  hideAuthError('signup-error-alert');

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        mobile,
        password,
        confirm_password: confirmPassword,
        country,
        language,
        accept_terms: termsAccepted
      })
    });

    const data = await res.json();
    setButtonLoading(submitBtn, false, 'Create Free Account');

    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed.');
    }

    // Success: auto-login
    setAuthSession(data.token, data.user);
    
    // Clear signup form
    pwdEl.value = '';
    confirmEl.value = '';

    showAuthNotification(`Account created successfully! Welcome to AgriScan AI, ${data.user.name}!`);
    navigateTo('home');

  } catch (err) {
    setButtonLoading(submitBtn, false, 'Create Free Account');
    showAuthError('signup-error-alert', err.message);
  }
}

// 4. FORGOT PASSWORD HANDLER
async function handleForgotPasswordSubmit(event) {
  if (event) event.preventDefault();

  const emailEl = document.getElementById('forgot-email');
  const submitBtn = document.getElementById('forgot-submit-btn');
  const alertBox = document.getElementById('forgot-alert');
  const devBox = document.getElementById('forgot-dev-token-box');

  if (!emailEl) return;
  const email = emailEl.value.trim();

  if (!email) {
    showAuthError('forgot-alert', 'Please provide your registered email address.');
    return;
  }

  setButtonLoading(submitBtn, true, 'Sending...');

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setButtonLoading(submitBtn, false, 'Send Recovery Link');

    if (alertBox) {
      alertBox.className = 'p-4 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 block';
      alertBox.innerHTML = `<div class="flex items-start space-x-2"><i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 mt-0.5"></i><span>${data.message}</span></div>`;
      if (window.lucide) lucide.createIcons();
    }

    // If local test environment returns token, show quick one-click link
    if (data.reset_token && devBox) {
      devBox.classList.remove('hidden');
      const resetLink = document.getElementById('forgot-dev-reset-link');
      if (resetLink) {
        resetLink.onclick = () => {
          openResetPasswordModal(data.reset_token);
        };
      }
    }

  } catch (err) {
    setButtonLoading(submitBtn, false, 'Send Recovery Link');
    showAuthError('forgot-alert', 'Unable to process request. Please try again.');
  }
}

// 5. RESET PASSWORD HANDLER
function openResetPasswordModal(token) {
  const tokenEl = document.getElementById('reset-token-input');
  if (tokenEl) tokenEl.value = token;
  navigateTo('reset-password');
}

async function handleResetPasswordSubmit(event) {
  if (event) event.preventDefault();

  const tokenEl = document.getElementById('reset-token-input');
  const newPwdEl = document.getElementById('reset-new-password');
  const confirmEl = document.getElementById('reset-confirm-password');
  const submitBtn = document.getElementById('reset-submit-btn');

  const token = tokenEl ? tokenEl.value.trim() : '';
  const newPassword = newPwdEl.value;
  const confirmPassword = confirmEl.value;

  if (!token) {
    showAuthError('reset-error-alert', 'Recovery token is missing or invalid.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showAuthError('reset-error-alert', 'New passwords do not match.');
    return;
  }

  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    showAuthError('reset-error-alert', 'Password must be at least 8 characters long and contain letters and numbers.');
    return;
  }

  setButtonLoading(submitBtn, true, 'Updating Password...');
  hideAuthError('reset-error-alert');

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        new_password: newPassword,
        confirm_new_password: confirmPassword
      })
    });

    const data = await res.json();
    setButtonLoading(submitBtn, false, 'Update Password');

    if (!res.ok) {
      throw new Error(data.detail || 'Password reset failed.');
    }

    showAuthNotification('Password reset successfully! Please sign in with your new password.');
    navigateTo('login');

  } catch (err) {
    setButtonLoading(submitBtn, false, 'Update Password');
    showAuthError('reset-error-alert', err.message);
  }
}

// 6. PROFILE DATA POPULATION & EDIT
async function populateProfileData() {
  const user = getCurrentUser();
  if (!user) return;

  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  const mobileEl = document.getElementById('profile-mobile');
  const countryEl = document.getElementById('profile-country');
  const langEl = document.getElementById('profile-lang');
  const createdEl = document.getElementById('profile-created');
  const cardName = document.getElementById('profile-card-name');
  const cardEmail = document.getElementById('profile-card-email');
  const cardAvatar = document.getElementById('profile-card-avatar');

  if (nameEl) nameEl.value = user.name || '';
  if (emailEl) emailEl.value = user.email || '';
  if (mobileEl) mobileEl.value = user.mobile || '';
  if (countryEl) countryEl.value = user.country || 'India';
  if (langEl) langEl.value = user.language || 'en';
  if (createdEl) {
    const d = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active Member';
    createdEl.textContent = `Member since: ${d}`;
  }
  if (cardName) cardName.textContent = user.name || 'Farmer';
  if (cardEmail) cardEmail.textContent = user.email || '';
  if (cardAvatar) {
    cardAvatar.textContent = (user.name || user.email || 'U')[0].toUpperCase();
  }

  // Fetch personal stats
  loadUserPersonalStats();
}

async function handleProfileSave(event) {
  if (event) event.preventDefault();

  const nameEl = document.getElementById('profile-name');
  const mobileEl = document.getElementById('profile-mobile');
  const countryEl = document.getElementById('profile-country');
  const langEl = document.getElementById('profile-lang');
  const btn = document.getElementById('profile-save-btn');

  const name = nameEl.value.trim();
  const mobile = mobileEl ? mobileEl.value.trim() : '';
  const country = countryEl ? countryEl.value : 'India';
  const language = langEl ? langEl.value : 'en';

  if (!name) {
    showAuthError('profile-alert', 'Name cannot be empty.');
    return;
  }

  setButtonLoading(btn, true, 'Saving...');

  try {
    const res = await authFetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mobile, country, language })
    });

    const data = await res.json();
    setButtonLoading(btn, false, 'Save Profile Changes');

    if (!res.ok) {
      throw new Error(data.detail || 'Could not update profile.');
    }

    setAuthSession(getAuthToken(), data.user);
    showProfileSuccess('Profile updated successfully!');

  } catch (err) {
    setButtonLoading(btn, false, 'Save Profile Changes');
    showAuthError('profile-alert', err.message);
  }
}

// 7. CHANGE PASSWORD HANDLER
async function handleChangePasswordSubmit(event) {
  if (event) event.preventDefault();

  const currEl = document.getElementById('pwd-current');
  const newEl = document.getElementById('pwd-new');
  const confEl = document.getElementById('pwd-confirm');
  const btn = document.getElementById('pwd-change-btn');

  const current_password = currEl.value;
  const new_password = newEl.value;
  const confirm_new_password = confEl.value;

  if (!current_password || !new_password) {
    showAuthError('change-pwd-alert', 'Please complete all password fields.');
    return;
  }

  if (new_password !== confirm_new_password) {
    showAuthError('change-pwd-alert', 'New passwords do not match.');
    return;
  }

  setButtonLoading(btn, true, 'Updating...');

  try {
    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password, confirm_new_password })
    });

    const data = await res.json();
    setButtonLoading(btn, false, 'Update Password');

    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update password.');
    }

    currEl.value = '';
    newEl.value = '';
    confEl.value = '';

    const alertBox = document.getElementById('change-pwd-alert');
    if (alertBox) {
      alertBox.className = 'p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 block';
      alertBox.textContent = 'Password changed successfully!';
    }

  } catch (err) {
    setButtonLoading(btn, false, 'Update Password');
    showAuthError('change-pwd-alert', err.message);
  }
}

// 8. LOGOUT HANDLER
function handleLogout() {
  clearAuthSession();
  showAuthNotification('Logged out successfully.');
  navigateTo('home');
}

// 9. PERSONAL STATS IN PROFILE
async function loadUserPersonalStats() {
  try {
    const res = await authFetch('/api/diagnoses?limit=100');
    if (!res.ok) return;
    const items = await res.json();
    
    const countEl = document.getElementById('profile-stat-count');
    const healthyEl = document.getElementById('profile-stat-healthy');
    const diseasedEl = document.getElementById('profile-stat-diseased');

    if (countEl) countEl.textContent = items.length;
    
    let healthy = 0;
    let diseased = 0;
    items.forEach(d => {
      if ((d.disease_name || '').toLowerCase().includes('healthy')) {
        healthy++;
      } else {
        diseased++;
      }
    });

    if (healthyEl) healthyEl.textContent = healthy;
    if (diseasedEl) diseasedEl.textContent = diseased;
  } catch (e) {
    console.warn('Could not load user profile stats:', e);
  }
}

// ---------------- VALIDATION & HELPER UTILITIES ----------------

function checkPasswordStrengthRealtime(pwd) {
  const bar = document.getElementById('signup-pwd-strength-bar');
  const label = document.getElementById('signup-pwd-strength-label');
  const reqLen = document.getElementById('pwd-req-length');
  const reqLet = document.getElementById('pwd-req-letter');
  const reqNum = document.getElementById('pwd-req-number');

  let score = 0;
  const hasLen = pwd.length >= 8;
  const hasLet = /[A-Za-z]/.test(pwd);
  const hasNum = /\d/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  if (hasLen) score++;
  if (hasLet) score++;
  if (hasNum) score++;
  if (hasSpecial) score++;

  if (reqLen) {
    reqLen.className = hasLen ? 'text-emerald-600 font-semibold flex items-center space-x-1' : 'text-slate-400 flex items-center space-x-1';
  }
  if (reqLet) {
    reqLet.className = hasLet ? 'text-emerald-600 font-semibold flex items-center space-x-1' : 'text-slate-400 flex items-center space-x-1';
  }
  if (reqNum) {
    reqNum.className = hasNum ? 'text-emerald-600 font-semibold flex items-center space-x-1' : 'text-slate-400 flex items-center space-x-1';
  }

  if (!bar || !label) return;

  if (pwd.length === 0) {
    bar.style.width = '0%';
    label.textContent = '';
  } else if (score <= 1) {
    bar.style.width = '25%';
    bar.className = 'h-1.5 rounded-full bg-rose-500 transition-all';
    label.textContent = 'Weak';
    label.className = 'text-rose-500 font-semibold';
  } else if (score === 2) {
    bar.style.width = '55%';
    bar.className = 'h-1.5 rounded-full bg-amber-500 transition-all';
    label.textContent = 'Fair';
    label.className = 'text-amber-600 font-semibold';
  } else if (score === 3) {
    bar.style.width = '80%';
    bar.className = 'h-1.5 rounded-full bg-teal-500 transition-all';
    label.textContent = 'Good';
    label.className = 'text-teal-600 font-semibold';
  } else {
    bar.style.width = '100%';
    bar.className = 'h-1.5 rounded-full bg-emerald-600 transition-all';
    label.textContent = 'Strong Enterprise Grade';
    label.className = 'text-emerald-600 font-semibold';
  }
}

function checkPasswordMatchRealtime() {
  const pwd = document.getElementById('signup-password')?.value || '';
  const confirm = document.getElementById('signup-confirm-password')?.value || '';
  const matchNotice = document.getElementById('signup-pwd-match-notice');

  if (!matchNotice) return;
  if (!confirm) {
    matchNotice.classList.add('hidden');
    return;
  }
  matchNotice.classList.remove('hidden');
  if (pwd === confirm) {
    matchNotice.textContent = '✓ Passwords match';
    matchNotice.className = 'text-[11px] text-emerald-600 font-semibold mt-1';
  } else {
    matchNotice.textContent = '✗ Passwords do not match';
    matchNotice.className = 'text-[11px] text-rose-500 font-semibold mt-1';
  }
}

function togglePasswordVisibility(inputId, iconBtn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (iconBtn) iconBtn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4 text-slate-500"></i>';
  } else {
    input.type = 'password';
    if (iconBtn) iconBtn.innerHTML = '<i data-lucide="eye" class="w-4 h-4 text-slate-400"></i>';
  }
  if (window.lucide) lucide.createIcons();
}

function showAuthError(elementId, msg) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = 'p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 block';
  el.textContent = msg;
}

function hideAuthError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add('hidden');
}

function showProfileSuccess(msg) {
  const el = document.getElementById('profile-alert');
  if (!el) return;
  el.className = 'p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 block';
  el.textContent = msg;
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function showAuthNotification(msg) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-5 right-5 z-50 bg-agri-950 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-agri-800 animate-bounce';
  toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-agri-400"></i><span>${msg}</span>`;
  document.body.appendChild(toast);
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function setButtonLoading(btn, isLoading, originalText) {
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ${originalText}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = originalText || btn.dataset.origText || 'Submit';
  }
}

// Initialize Auth on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();

  // URL token parsing (e.g., #reset-password?token=XYZ)
  const hash = window.location.hash || '';
  if (hash.includes('reset-password')) {
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const tok = params.get('token');
    if (tok) {
      setTimeout(() => openResetPasswordModal(tok), 200);
    }
  }
});
