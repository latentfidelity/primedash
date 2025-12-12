// Terminal Dashboard - Script

// Update datetime display
function updateDateTime() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    const formatted = now.toLocaleString('en-US', options);
    document.getElementById('datetime').textContent = formatted;
}

// Initialize datetime and update every second
updateDateTime();
setInterval(updateDateTime, 1000);

// Session/login handling and submission capture (.zip only)
const loginButton = document.getElementById('loginButton');
const loginInput = document.getElementById('loginInput');
const loginMessage = document.getElementById('loginMessage');
const sessionTimer = document.getElementById('sessionTimer');
const submissionList = document.getElementById('submissionList');
const usdEarnedEl = document.getElementById('usdEarned');
const gbpEarnedEl = document.getElementById('gbpEarned');
const zipFileInput = document.getElementById('zipFileInput');
const uploadButton = document.getElementById('uploadButton');

const STORAGE_KEY = 'primedashState';
let loggedIn = false;
let sessionStart = null;
let sessionInterval = null;
let pendingEarnings = null;
let currentUserId = null;
let submissions = [];
let compensationApplied = false;

const usdRatePerHour = 16;
const usdToGbp = 0.79; // simple static conversion

function loadState() {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

function persistState() {
    if (typeof localStorage === 'undefined') return;
    const state = {
        loggedIn,
        sessionStart,
        pendingEarnings,
        currentUserId,
        submissions,
        compensationApplied
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // ignore quota / serialization issues
    }
}

function hydrateFromState() {
    const state = loadState();
    if (!state) return;
    loggedIn = Boolean(state.loggedIn);
    sessionStart = typeof state.sessionStart === 'number' ? state.sessionStart : null;
    pendingEarnings = state.pendingEarnings && typeof state.pendingEarnings === 'object' ? state.pendingEarnings : null;
    currentUserId = typeof state.currentUserId === 'string' ? state.currentUserId : null;
    submissions = Array.isArray(state.submissions) ? state.submissions : [];
    compensationApplied = Boolean(state.compensationApplied);
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function computeEarnings(elapsedMs) {
    const hours = elapsedMs / (1000 * 60 * 60);
    const usd = hours * usdRatePerHour;
    const gbp = usd * usdToGbp;
    return { usd, gbp };
}

function ensureCompensationEntry() {
    if (compensationApplied) return;
    const alreadyPresent = submissions.some((entry) => entry && entry.kind === 'compensation');
    if (alreadyPresent) {
        compensationApplied = true;
        persistState();
        return;
    }
    const threeHoursMs = 3 * 60 * 60 * 1000;
    submissions.unshift({
        filename: 'Compensation (3 hours)',
        earnings: computeEarnings(threeHoursMs),
        timestamp: Date.now(),
        userId: currentUserId,
        kind: 'compensation'
    });
    if (submissions.length > 50) {
        submissions.splice(0, submissions.length - 50);
    }
    compensationApplied = true;
    persistState();
}

function addSubmission(filename, earnings) {
    if (!submissionList) return;
    const placeholder = submissionList.querySelector('.submission-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = filename;
    link.textContent = filename;
    link.target = '_blank';
    li.appendChild(link);
    if (earnings && typeof earnings.usd === 'number' && typeof earnings.gbp === 'number') {
        const earn = document.createElement('span');
        earn.className = 'submission-earnings';
        earn.textContent = `dY'æ $${earnings.usd.toFixed(2)} ƒ?› dY'ú Aœ${earnings.gbp.toFixed(2)}`;
        li.appendChild(earn);
    }
    submissionList.insertBefore(li, submissionList.firstChild);
    while (submissionList.children.length > 6) {
        submissionList.removeChild(submissionList.lastChild);
    }
}

function renderSubmissions() {
    if (!submissionList) return;
    submissionList.innerHTML = '';
    if (!submissions.length) {
        const placeholder = document.createElement('li');
        placeholder.className = 'submission-placeholder';
        placeholder.textContent = 'ƒ?"';
        submissionList.appendChild(placeholder);
        return;
    }
    submissions.forEach((entry) => {
        addSubmission(entry.filename, entry.earnings);
    });
}

function syncLoginUI() {
    if (!loginButton || !loginMessage) return;
    if (loggedIn) {
        loginButton.textContent = 'Logout';
        loginButton.classList.add('active');
        loginMessage.textContent = currentUserId ? `Logged in as ${currentUserId}.` : 'Logged in.';
        loginMessage.style.color = '';
    } else {
        loginButton.textContent = 'Login';
        loginButton.classList.remove('active');
        if (pendingEarnings) {
            loginMessage.textContent = 'Pending upload from last session. Click Upload .zip to log it.';
        } else {
            loginMessage.textContent = 'Enter user ID to begin.';
        }
        loginMessage.style.color = '';
    }
    if (uploadButton) {
        uploadButton.style.display = !loggedIn && pendingEarnings ? 'block' : 'none';
    }
}

function openZipPicker() {
    if (!zipFileInput) return;
    zipFileInput.value = '';
    try {
        if (typeof zipFileInput.showPicker === 'function') {
            zipFileInput.showPicker();
        } else {
            zipFileInput.click();
        }
    } catch {
        zipFileInput.click();
    }
}

function updateTimerDisplay() {
    if (!sessionTimer) return;
    if (!loggedIn || !sessionStart) {
        sessionTimer.textContent = '00:00:00';
        if (usdEarnedEl) usdEarnedEl.textContent = '0.00';
        if (gbpEarnedEl) gbpEarnedEl.textContent = '0.00';
        return;
    }
    const elapsedMs = Date.now() - sessionStart;
    sessionTimer.textContent = formatDuration(elapsedMs);
    const { usd, gbp } = computeEarnings(elapsedMs);
    if (usdEarnedEl) usdEarnedEl.textContent = usd.toFixed(2);
    if (gbpEarnedEl) gbpEarnedEl.textContent = gbp.toFixed(2);
}

function handleLogin() {
    if (!loginInput || !loginButton) return;
    const entered = loginInput.value.trim();
    if (!entered) {
        loginMessage.textContent = 'Enter a user ID to begin.';
        loginMessage.style.color = '#ff4444';
        return;
    }
    currentUserId = entered;
    loggedIn = true;
    sessionStart = Date.now();
    if (sessionInterval) {
        clearInterval(sessionInterval);
        sessionInterval = null;
    }
    persistState();
    syncLoginUI();
    updateTimerDisplay();
    sessionInterval = setInterval(updateTimerDisplay, 1000);
}

function handleLogout() {
    loggedIn = false;
    if (sessionInterval) {
        clearInterval(sessionInterval);
        sessionInterval = null;
    }
    const elapsedMs = sessionStart ? Date.now() - sessionStart : 0;
    pendingEarnings = computeEarnings(elapsedMs);
    sessionStart = null;
    updateTimerDisplay();
    persistState();
    syncLoginUI();
    openZipPicker();
}

if (loginButton) {
    loginButton.addEventListener('click', () => {
        if (loggedIn) {
            handleLogout();
        } else {
            handleLogin();
        }
    });
}

if (loginInput) {
    loginInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (loggedIn) {
                handleLogout();
            } else {
                handleLogin();
            }
        }
    });
}

if (uploadButton) {
    uploadButton.addEventListener('click', openZipPicker);
}

if (zipFileInput) {
    zipFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                addSubmission(file.name, pendingEarnings);
                submissions.push({
                    filename: file.name,
                    earnings: pendingEarnings,
                    timestamp: Date.now(),
                    userId: currentUserId
                });
                if (submissions.length > 50) {
                    submissions.splice(0, submissions.length - 50);
                }
                pendingEarnings = null;
                persistState();
                syncLoginUI();
            } else {
                alert('Only .zip files are accepted.');
            }
        }
        zipFileInput.value = '';
    });
}

// Hydrate persisted state on load
hydrateFromState();
ensureCompensationEntry();
renderSubmissions();
syncLoginUI();
updateTimerDisplay();
if (loggedIn && sessionStart) {
    sessionInterval = setInterval(updateTimerDisplay, 1000);
}

window.addEventListener('beforeunload', persistState);
