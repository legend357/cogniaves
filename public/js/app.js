const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let history = [];
let isLoading = false;
let currentChatId = null;
let username = '';
let currentMode = 'general';

const MODE_INFO = {
  general:  { label: '🌐 General Assistant',       emoji: '🌐', desc: 'I can help with anything. Select a mode or just start chatting!' },
  coding:   { label: '💻 Coding Assistant',         emoji: '💻', desc: 'Ask me to generate code, fix bugs, or explain any programming concept.' },
  math:     { label: '📐 Math Assistant',           emoji: '📐', desc: 'Ask me any math problem — I will solve it step by step.' },
  science:  { label: '🔬 Science Assistant',        emoji: '🔬', desc: 'Ask me about physics, chemistry, biology, or any science topic.' },
  writing:  { label: '✍️ Writing Assistant',        emoji: '✍️', desc: 'Ask me to write, proofread, or improve any text.' },
  language: { label: '🌍 Language Assistant',       emoji: '🌍', desc: 'Ask me about grammar, vocabulary, or help translating text.' },
  history:  { label: '📜 History Assistant',        emoji: '📜', desc: 'Ask me about historical events, figures, or civilizations.' },
  news:     { label: '🗞️ Current Affairs',          emoji: '🗞️', desc: 'Ask me about today\'s top news and current events worldwide.' },
};

// Live clock
function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  if (!timeEl) return;
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  timeEl.textContent = h + ':' + m + ':' + s;
  dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

async function init() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.userId) return window.location.href = '/';
    username = data.username;
    document.getElementById('user-name').textContent = username;
    document.getElementById('user-avatar').textContent = username[0].toUpperCase();
  } catch { window.location.href = '/'; }

  const saved = localStorage.getItem('theme') || 'light';
  setTheme(saved);
  loadChatList();
  showWelcome();
}

function showWelcome() {
  const info = MODE_INFO[currentMode];
  messagesEl.innerHTML = `
    <div class="welcome">
      <div class="welcome-emoji">${info.emoji}</div>
      <h1>Hello, <span style="color:var(--blue)">${escHtml(username)}</span>!</h1>
      <p>${info.desc}</p>
      <div class="mode-cards">
        <div class="mode-card" onclick="setMode('coding')"><span>💻</span><b>Coding</b></div>
        <div class="mode-card" onclick="setMode('math')"><span>📐</span><b>Math</b></div>
        <div class="mode-card" onclick="setMode('science')"><span>🔬</span><b>Science</b></div>
        <div class="mode-card" onclick="setMode('writing')"><span>✍️</span><b>Writing</b></div>
        <div class="mode-card" onclick="setMode('language')"><span>🌍</span><b>Language</b></div>
        <div class="mode-card" onclick="setMode('history')"><span>📜</span><b>History</b></div>
        <div class="mode-card" onclick="setMode('news')"><span>🗞️</span><b>News</b></div>
        <div class="mode-card" onclick="setMode('general')"><span>🌐</span><b>General</b></div>
      </div>
    </div>`;
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-item').forEach(el => el.classList.toggle('active', el.dataset.mode === mode));
  document.getElementById('mode-badge').textContent = MODE_INFO[mode].label;
  inputEl.placeholder = 'Ask CogniAves (' + MODE_INFO[mode].label + ')...';
  const welcome = messagesEl.querySelector('.welcome');
  if (welcome) showWelcome();
  inputEl.focus();
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.querySelector('.sun-icon').style.display = theme === 'dark' ? 'none' : 'block';
  document.querySelector('.moon-icon').style.display = theme === 'dark' ? 'block' : 'none';
}
function toggleTheme() { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('hidden'); }
async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }

async function loadChatList() {
  try {
    const res = await fetch('/api/history');
    const chats = await res.json();
    const el = document.getElementById('chat-history');
    if (!chats.length) { el.innerHTML = '<div class="history-empty">No chats yet</div>'; return; }
    el.innerHTML = chats.map(c => `
      <div class="history-item ${c.id === currentChatId ? 'active' : ''}" onclick="loadChat(${c.id})">
        <span class="history-item-title">${escHtml(c.title)}</span>
        <button class="history-item-del" onclick="deleteChat(event,${c.id})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>`).join('');
  } catch {}
}

async function loadChat(chatId) {
  try {
    const res = await fetch('/api/history/' + chatId);
    const data = await res.json();
    currentChatId = chatId;
    history = data.messages.map(m => ({ role: m.role, content: m.content }));
    messagesEl.innerHTML = '';
    data.messages.forEach(m => appendMsg(m.role === 'user' ? 'user' : 'ai', m.role === 'user' ? escHtml(m.content) : formatText(m.content)));
    loadChatList();
  } catch {}
}

async function deleteChat(e, chatId) {
  e.stopPropagation();
  await fetch('/api/history/' + chatId, { method: 'DELETE' });
  if (currentChatId === chatId) newChat();
  else loadChatList();
}

function newChat() {
  currentChatId = null; history = [];
  showWelcome();
  loadChatList();
}

function appendMsg(role, content) {
  messagesEl.querySelector('.welcome')?.remove();
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const avatar = role === 'ai' ? MODE_INFO[currentMode].emoji : username[0]?.toUpperCase() || 'U';
  div.innerHTML = '<div class="avatar ' + role + '">' + avatar + '</div><div class="bubble">' + (content || '') + '</div>';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div.querySelector('.bubble');
}

function formatText(text) {
  const codeRe = /```(\w+)?\n([\s\S]*?)```/g;
  let result = '', lastIdx = 0, match;
  while ((match = codeRe.exec(text)) !== null) {
    const before = text.slice(lastIdx, match.index);
    if (before.trim()) result += '<span>' + escHtml(before).replace(/\n/g, '<br>') + '</span>';
    const lang = match[1] || 'code';
    const code = match[2].replace(/\n$/, '');
    const id = 'cb' + Math.random().toString(36).slice(2, 8);
    result += '<div class="code-block"><div class="code-header"><span class="code-lang">' + escHtml(lang) + '</span><button class="copy-btn" data-target="' + id + '">Copy</button></div><pre id="' + id + '">' + syntaxHighlight(code, lang) + '</pre></div>';
    lastIdx = match.index + match[0].length;
  }
  const rest = text.slice(lastIdx);
  if (rest.trim()) result += escHtml(rest).replace(/\n/g, '<br>');
  return result;
}

document.addEventListener('click', function(e) {
  if (!e.target.classList.contains('copy-btn')) return;
  const pre = document.getElementById(e.target.dataset.target);
  if (!pre) return;
  navigator.clipboard.writeText(pre.innerText).then(() => {
    e.target.textContent = 'Copied!'; e.target.classList.add('copied');
    setTimeout(() => { e.target.textContent = 'Copy'; e.target.classList.remove('copied'); }, 2000);
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = pre.innerText;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    e.target.textContent = 'Copied!'; e.target.classList.add('copied');
    setTimeout(() => { e.target.textContent = 'Copy'; e.target.classList.remove('copied'); }, 2000);
  });
});

inputEl.addEventListener('input', () => { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px'; });
inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || isLoading) return;
  inputEl.value = ''; inputEl.style.height = 'auto';
  appendMsg('user', escHtml(text));
  history.push({ role: 'user', content: text });

  if (!currentChatId) {
    try {
      const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: text.slice(0, 40) }) });
      const data = await res.json();
      currentChatId = data.id; loadChatList();
    } catch {}
  }

  isLoading = true; sendBtn.disabled = true;
  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg ai'; typingDiv.id = 'typing';
  typingDiv.innerHTML = '<div class="avatar ai">' + MODE_INFO[currentMode].emoji + '</div><div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  messagesEl.appendChild(typingDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  let fullText = '';
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history, chatId: currentChatId, mode: currentMode }) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    document.getElementById('typing')?.remove();
    const bubble = appendMsg('ai', '<div class="typing-dots"><span></span><span></span><span></span></div>');
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim(); if (!json) continue;
        try {
          const ev = JSON.parse(json);
          if (ev.type === 'text') { fullText += ev.text; bubble.innerHTML = formatText(fullText); messagesEl.scrollTop = messagesEl.scrollHeight; }
          else if (ev.type === 'done') { history.push({ role: 'assistant', content: fullText }); }
          else if (ev.type === 'error') { bubble.innerHTML = '<span style="color:var(--red)">Error: ' + escHtml(ev.message) + '</span>'; }
        } catch {}
      }
    }
  } catch (err) {
    document.getElementById('typing')?.remove();
    appendMsg('ai', '<span style="color:var(--red)">Error: ' + escHtml(err.message) + '</span>');
  }
  isLoading = false; sendBtn.disabled = false; inputEl.focus();
}

init();
