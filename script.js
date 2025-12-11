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
let loggedIn = false;
let sessionStart = null;
let sessionInterval = null;
let pendingEarnings = null;
const requiredUserId = 'PrimeGenLordofBrits';
const usdRatePerHour = 16;
const usdToGbp = 0.79; // simple static conversion

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

function addSubmission(filename) {
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
    if (arguments.length > 1) {
        const earnings = arguments[1];
        const earn = document.createElement('span');
        earn.className = 'submission-earnings';
        earn.textContent = `💵 $${earnings.usd.toFixed(2)} • 💷 £${earnings.gbp.toFixed(2)}`;
        li.appendChild(earn);
    }
    submissionList.insertBefore(li, submissionList.firstChild);
    while (submissionList.children.length > 6) {
        submissionList.removeChild(submissionList.lastChild);
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
    if (entered !== requiredUserId) {
        loginMessage.textContent = 'Access denied. Check your user ID.';
        loginMessage.style.color = '#ff4444';
        return;
    }
    loggedIn = true;
    sessionStart = Date.now();
    loginButton.textContent = 'Logout';
    loginButton.classList.add('active');
    loginMessage.textContent = `Logged in as ${requiredUserId}.`;
    loginMessage.style.color = '';
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
    loginButton.textContent = 'Login';
    loginButton.classList.remove('active');
    loginMessage.textContent = 'Select a .zip file to submit.';
    loginMessage.style.color = '';
    if (zipFileInput) {
        zipFileInput.click();
    }
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

if (zipFileInput) {
    zipFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                addSubmission(file.name, pendingEarnings);
                loginMessage.textContent = 'Enter user ID to begin.';
            } else {
                alert('Only .zip files are accepted.');
            }
        }
        pendingEarnings = null;
        zipFileInput.value = '';
    });
}
