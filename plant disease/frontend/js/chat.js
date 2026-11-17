/**
 * AgriScan AI - AI Agricultural Chatbot Controller
 * Context-aware agricultural advisory supporting English and Tamil.
 */

const QUICK_PROMPTS_EN = [
  "How can I treat this disease?",
  "Why did this disease occur?",
  "Can it spread to other plants?",
  "How can I prevent it?",
  "Is there an organic treatment option?",
  "How should I monitor recovery?"
];

const QUICK_PROMPTS_TA = [
  "இந்த நோயை எவ்வாறு குணப்படுத்துவது?",
  "இந்த நோய் ஏன் ஏற்பட்டது?",
  "இது மற்ற தாவரங்களுக்கும் பரவுமா?",
  "இதை எவ்வாறு தடுப்பது?",
  "இயற்கை வழி சிகிச்சை உள்ளதா?",
  "குணமடைவதை எவ்வாறு கண்காணிப்பது?"
];

function setChatLanguage(lang) {
  AppState.chatLanguage = lang;

  const btnEn = document.getElementById('chat-lang-en');
  const btnTa = document.getElementById('chat-lang-ta');

  if (lang === 'ta') {
    if (btnTa) {
      btnTa.className = "px-3 py-1.5 rounded-lg bg-agri-700 text-white transition-all shadow-sm";
    }
    if (btnEn) {
      btnEn.className = "px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all";
    }
    const initialText = document.getElementById('chat-initial-text');
    if (initialText) {
      initialText.textContent = "வணக்கம்! நான் உங்கள் பயிர் நோயறிதலுடன் இணைந்துள்ளேன். சிகிச்சை முறைகள், இயற்கை மருந்துகள், நோய் பரவுதல் மற்றும் தடுப்பு முறைகள் குறித்து தமிழில் என்னிடம் கேட்கலாம்!";
    }
    const input = document.getElementById('chat-input');
    if (input) input.placeholder = "உங்கள் வேளாண் கேள்வியை இங்கே தட்டச்சு செய்யவும்...";
  } else {
    if (btnEn) {
      btnEn.className = "px-3 py-1.5 rounded-lg bg-agri-700 text-white transition-all shadow-sm";
    }
    if (btnTa) {
      btnTa.className = "px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all";
    }
    const initialText = document.getElementById('chat-initial-text');
    if (initialText) {
      initialText.textContent = "Hello! I am connected to your plant diagnostic scan. Ask me anything about chemical application dosages, organic bio-treatments, disease spread risks, or recovery monitoring in English or Tamil!";
    }
    const input = document.getElementById('chat-input');
    if (input) input.placeholder = "Type your agricultural question here...";
  }

  renderQuickPrompts();
}

function renderQuickPrompts() {
  const container = document.getElementById('quick-prompts-container');
  if (!container) return;

  const prompts = AppState.chatLanguage === 'ta' ? QUICK_PROMPTS_TA : QUICK_PROMPTS_EN;
  container.innerHTML = '';

  prompts.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-3 py-1.5 bg-white hover:bg-agri-50 text-slate-700 hover:text-agri-800 rounded-xl text-xs font-semibold border border-slate-200 transition-all shadow-2xs hover:border-agri-300';
    btn.textContent = p;
    btn.onclick = () => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = p;
        sendChatMessage(new Event('submit'));
      }
    };
    container.appendChild(btn);
  });
}

function syncChatContext() {
  const titleEl = document.getElementById('chat-ctx-title');
  const sevEl = document.getElementById('chat-ctx-severity');
  const d = AppState.activeDiagnosis;

  if (d && titleEl && sevEl) {
    titleEl.textContent = `${d.crop} — ${d.disease_name} (${d.scientific_name})`;
    sevEl.textContent = `Severity: ${d.severity_pct}% (${d.severity_label})`;
  } else if (titleEl) {
    titleEl.textContent = "General Agronomy (No scan currently loaded)";
    if (sevEl) sevEl.textContent = "N/A";
  }

  renderQuickPrompts();
}

async function sendChatMessage(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim()) return;

  const userText = input.value.trim();
  input.value = '';

  appendChatMessage('user', userText);

  // Loading indicator bubble
  const loadingId = 'loading-' + Date.now();
  appendLoadingBubble(loadingId);

  try {
    const fetchFunc = window.authFetch || fetch;
    const res = await fetchFunc('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        diagnosis_id: AppState.activeDiagnosis ? AppState.activeDiagnosis.id : null,
        language: AppState.chatLanguage
      })
    });

    const data = await res.json();
    removeLoadingBubble(loadingId);
    appendChatMessage('assistant', data.reply, data.engine);
  } catch (err) {
    removeLoadingBubble(loadingId);
    appendChatMessage('assistant', "I encountered a communication issue. Please check your network and try again.");
    console.error("Chat error:", err);
  }
}

function appendChatMessage(role, content, engine = "") {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  const isUser = (role === 'user');

  msgDiv.className = isUser
    ? 'flex items-start justify-end space-x-3'
    : 'flex items-start space-x-3 max-w-2xl';

  const avatar = isUser
    ? `<div class="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs font-bold">You</div>`
    : `<div class="w-8 h-8 rounded-full bg-agri-700 text-white flex items-center justify-center shrink-0 text-xs"><i data-lucide="bot" class="w-4 h-4"></i></div>`;

  const bubbleBg = isUser
    ? 'bg-agri-700 text-white rounded-2xl rounded-tr-none p-3.5 text-xs leading-relaxed max-w-lg shadow-2xs'
    : 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-none p-4 text-xs leading-relaxed shadow-2xs space-y-2';

  const cleanEngine = (engine || '')
    .replace(/NVIDIA\s+NIM\s*\([^\)]*\)/gi, 'AI Assistant')
    .replace(/nemotron-3\.5-super-vl-120b(-a12b)?/gi, '')
    .replace(/NVIDIA\s+NIM/gi, 'AI Assistant')
    .trim();

  const engineLabel = cleanEngine ? `<div class="text-[10px] text-slate-400 font-semibold border-b border-slate-200 pb-1">Answered via ${cleanEngine}</div>` : '';

  // Formatted message with optional TTS button
  const ttsBtn = !isUser
    ? `<button onclick="speakText(this)" data-text="${encodeURIComponent(content)}" class="text-slate-400 hover:text-agri-700 ml-2" title="Listen with Text-to-Speech"><i data-lucide="volume-2" class="w-3.5 h-3.5 inline"></i></button>`
    : '';

  msgDiv.innerHTML = isUser
    ? `<div class="${bubbleBg}">${escapeHtml(content)}</div>${avatar}`
    : `${avatar}<div class="${bubbleBg}">${engineLabel}<div class="whitespace-pre-line">${formatMarkdown(content)}</div><div class="text-right">${ttsBtn}</div></div>`;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;

  if (window.lucide) lucide.createIcons();
}

function appendLoadingBubble(id) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const loadDiv = document.createElement('div');
  loadDiv.id = id;
  loadDiv.className = 'flex items-start space-x-3 max-w-xs';
  loadDiv.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-agri-700 text-white flex items-center justify-center shrink-0 text-xs"><i data-lucide="bot" class="w-4 h-4"></i></div>
    <div class="bg-slate-100 rounded-2xl rounded-tl-none p-3 text-xs text-slate-500 flex items-center space-x-1.5 shadow-2xs">
      <span class="w-1.5 h-1.5 bg-agri-600 rounded-full animate-bounce"></span>
      <span class="w-1.5 h-1.5 bg-agri-600 rounded-full animate-bounce" style="animation-delay: 0.15s"></span>
      <span class="w-1.5 h-1.5 bg-agri-600 rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
      <span class="text-[11px] ml-1">Consulting agronomic intelligence...</span>
    </div>
  `;
  container.appendChild(loadDiv);
  container.scrollTop = container.scrollHeight;
  if (window.lucide) lucide.createIcons();
}

function removeLoadingBubble(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Text to Speech playback
function speakText(btn) {
  const rawText = decodeURIComponent(btn.getAttribute('data-text'));
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(rawText);
    if (AppState.chatLanguage === 'ta') {
      utterance.lang = 'ta-IN';
    } else {
      utterance.lang = 'en-US';
    }
    window.speechSynthesis.speak(utterance);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/^• (.*$)/gim, '<li class="ml-4 list-disc">$1</li>');
}
