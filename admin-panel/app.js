const API_BASE = '/api/admin';
let adminPin = localStorage.getItem('calsnap_admin_pin') || '';
let currentProvider = 'openrouter';
let curatedModels = { openrouter_free_models: [], gemini_studio_models: [] };

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupEventListeners();
});

function initAuth() {
    if (adminPin) {
        verifyAndLoadDashboard();
    } else {
        showModal();
    }
}

function showModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('dashboard-app').classList.add('hidden');
}

function unlockDashboard() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('dashboard-app').classList.remove('hidden');
    loadAllData();
    // Auto-refresh stats and logs every 15 seconds
    setInterval(() => {
        if (!document.getElementById('dashboard-app').classList.contains('hidden')) {
            loadStats();
            loadLogs();
        }
    }, 15000);
}

async function verifyAndLoadDashboard() {
    try {
        const resp = await fetch(`${API_BASE}/config`, {
            headers: { 'X-Admin-Pin': adminPin }
        });
        if (resp.status === 401) {
            localStorage.removeItem('calsnap_admin_pin');
            adminPin = '';
            showModal();
            return;
        }
        if (!resp.ok) throw new Error('Failed to connect to API');
        unlockDashboard();
    } catch (err) {
        console.error('Connection error:', err);
        showModal();
    }
}

function setupEventListeners() {
    // PIN Login Form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputPin = document.getElementById('admin-pin').value.trim();
        try {
            const resp = await fetch(`${API_BASE}/config`, {
                headers: { 'X-Admin-Pin': inputPin }
            });
            if (resp.status === 401) {
                const errDiv = document.getElementById('login-error');
                errDiv.classList.remove('hidden');
                errDiv.textContent = 'Invalid PIN Code. Please try again.';
                return;
            }
            if (!resp.ok) throw new Error('API Error');
            adminPin = inputPin;
            localStorage.setItem('calsnap_admin_pin', adminPin);
            document.getElementById('login-error').classList.add('hidden');
            unlockDashboard();
        } catch (err) {
            const errDiv = document.getElementById('login-error');
            errDiv.classList.remove('hidden');
            errDiv.textContent = 'Unable to reach backend server. Ensure API is running.';
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('calsnap_admin_pin');
        adminPin = '';
        showModal();
    });

    // Refresh Buttons
    document.getElementById('refresh-stats-btn').addEventListener('click', () => {
        loadStats();
        loadLogs();
        showToast('Stats and logs refreshed', 'success');
    });
    document.getElementById('refresh-logs-btn').addEventListener('click', loadLogs);

    // Provider Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetProvider = btn.getAttribute('data-provider');
            switchProviderTab(targetProvider);
        });
    });

    // Temperature Slider
    const tempSlider = document.getElementById('temperature-slider');
    const tempValDisplay = document.getElementById('temp-val-display');
    tempSlider.addEventListener('input', (e) => {
        tempValDisplay.textContent = parseFloat(e.target.value).toFixed(2);
    });

    // Save Configuration Form
    document.getElementById('ai-config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveConfiguration();
    });

    // Test AI Playground Form
    document.getElementById('test-ai-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await runAiTest();
    });
}

function switchProviderTab(provider) {
    currentProvider = provider;
    document.getElementById('active-provider-input').value = provider;
    
    if (provider === 'openrouter') {
        document.getElementById('section-openrouter').classList.remove('hidden');
        document.getElementById('section-gemini').classList.add('hidden');
    } else {
        document.getElementById('section-openrouter').classList.add('hidden');
        document.getElementById('section-gemini').classList.remove('hidden');
    }
}

async function loadAllData() {
    await loadCuratedModels();
    await loadConfig();
    await loadStats();
    await loadLogs();
}

async function loadCuratedModels() {
    try {
        const resp = await fetch(`${API_BASE}/models`, {
            headers: { 'X-Admin-Pin': adminPin }
        });
        if (!resp.ok) return;
        curatedModels = await resp.json();

        // Populate OpenRouter Dropdown
        const orSelect = document.getElementById('openrouter-model-select');
        orSelect.innerHTML = curatedModels.openrouter_free_models.map(m => 
            `<option value="${m.id}">${m.name} ${m.multimodal ? '(📷 Vision Supported)' : ''}</option>`
        ).join('');

        // Populate Gemini Dropdown
        const gemSelect = document.getElementById('gemini-model-select');
        gemSelect.innerHTML = curatedModels.gemini_studio_models.map(m => 
            `<option value="${m.id}">${m.name} ${m.multimodal ? '(📷 Vision Supported)' : ''}</option>`
        ).join('');
    } catch (err) {
        console.error('Failed to load models:', err);
    }
}

async function loadConfig() {
    try {
        const resp = await fetch(`${API_BASE}/config`, {
            headers: { 'X-Admin-Pin': adminPin }
        });
        if (!resp.ok) return;
        const cfg = await resp.json();

        // Set provider tab
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(b => {
            if (b.getAttribute('data-provider') === cfg.active_provider) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        switchProviderTab(cfg.active_provider);

        // Populate fields
        if (cfg.openrouter_model) {
            const orSelect = document.getElementById('openrouter-model-select');
            let found = false;
            for (let opt of orSelect.options) {
                if (opt.value === cfg.openrouter_model) { opt.selected = true; found = true; break; }
            }
            if (!found) {
                document.getElementById('openrouter-custom-model').value = cfg.openrouter_model;
            }
        }
        if (cfg.gemini_model) {
            const gemSelect = document.getElementById('gemini-model-select');
            for (let opt of gemSelect.options) {
                if (opt.value === cfg.gemini_model) { opt.selected = true; break; }
            }
        }

        document.getElementById('hint-or-key').textContent = `[Current: ${cfg.openrouter_api_key_masked}]`;
        document.getElementById('hint-gemini-key').textContent = `[Current: ${cfg.gemini_api_key_masked}]`;

        document.getElementById('temperature-slider').value = cfg.temperature;
        document.getElementById('temp-val-display').textContent = cfg.temperature.toFixed(2);
        document.getElementById('system-prompt-input').value = cfg.system_prompt;
        document.getElementById('auto-fallback-toggle').checked = cfg.auto_fallback;
    } catch (err) {
        console.error('Failed to load config:', err);
    }
}

async function loadStats() {
    try {
        const resp = await fetch(`${API_BASE}/stats`, {
            headers: { 'X-Admin-Pin': adminPin }
        });
        if (!resp.ok) return;
        const data = await resp.json();

        document.getElementById('stat-provider').textContent = data.active_provider === 'openrouter' ? 'OpenRouter (Free)' : 'Gemini AI Studio';
        document.getElementById('stat-model-sub').textContent = data.active_model;
        document.getElementById('stat-scans').textContent = data.total_scans;
        document.getElementById('stat-voice').textContent = data.total_voice;
        document.getElementById('stat-coach').textContent = data.total_coach;
        document.getElementById('stat-users').textContent = data.total_users;
        document.getElementById('stat-errors-sub').textContent = `${data.total_errors} Errors recorded`;

        // Update API status badge
        const badge = document.getElementById('api-status-badge');
        badge.className = 'status-indicator online';
        badge.innerHTML = `<span class="status-dot"></span><span class="status-text">API Healthy (${data.active_provider.toUpperCase()})</span>`;
    } catch (err) {
        const badge = document.getElementById('api-status-badge');
        badge.className = 'status-indicator offline';
        badge.innerHTML = `<span class="status-dot" style="background:var(--error)"></span><span class="status-text">Connection Lost</span>`;
    }
}

async function loadLogs() {
    try {
        const resp = await fetch(`${API_BASE}/logs?limit=40`, {
            headers: { 'X-Admin-Pin': adminPin }
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const tbody = document.getElementById('logs-tbody');

        if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No AI requests logged yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.logs.map(log => {
            const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const isOk = log.status === 'success';
            const statusBadge = isOk ? `<span class="badge-status-ok">✔ SUCCESS</span>` : `<span class="badge-status-err">✖ ERROR</span>`;
            const errNote = log.error_detail ? `<br><small class="text-muted" style="color:#F85149">${log.error_detail}</small>` : '';

            return `
                <tr>
                    <td class="text-muted">${dateStr}</td>
                    <td><span class="badge-route">${log.endpoint}</span></td>
                    <td><strong>${log.provider.toUpperCase()}</strong> (${log.model})</td>
                    <td>${log.latency_ms} ms</td>
                    <td>${statusBadge}${errNote}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load logs:', err);
    }
}

async function saveConfiguration() {
    const provider = document.getElementById('active-provider-input').value;
    const customOrModel = document.getElementById('openrouter-custom-model').value.trim();
    const selectedOrModel = document.getElementById('openrouter-model-select').value;
    const openrouterModel = customOrModel || selectedOrModel;
    const geminiModel = document.getElementById('gemini-model-select').value;

    const orKey = document.getElementById('openrouter-api-key').value.trim();
    const gemKey = document.getElementById('gemini-api-key').value.trim();
    const newPin = document.getElementById('new-admin-pin').value.trim();

    const payload = {
        active_provider: provider,
        openrouter_model: openrouterModel,
        gemini_model: geminiModel,
        system_prompt: document.getElementById('system-prompt-input').value,
        temperature: parseFloat(document.getElementById('temperature-slider').value),
        auto_fallback: document.getElementById('auto-fallback-toggle').checked
    };

    if (orKey) payload.openrouter_api_key = orKey;
    if (gemKey) payload.gemini_api_key = gemKey;
    if (newPin) payload.admin_pin = newPin;

    try {
        const resp = await fetch(`${API_BASE}/config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Pin': adminPin
            },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error('Failed to update settings');
        
        if (newPin) {
            adminPin = newPin;
            localStorage.setItem('calsnap_admin_pin', newPin);
            document.getElementById('new-admin-pin').value = '';
        }

        document.getElementById('openrouter-api-key').value = '';
        document.getElementById('gemini-api-key').value = '';

        showToast('AI Engine configuration saved successfully! Active: ' + provider.toUpperCase(), 'success');
        await loadConfig();
        await loadStats();
    } catch (err) {
        showToast('Error saving configuration: ' + err.message, 'error');
    }
}

async function runAiTest() {
    const btn = document.getElementById('btn-run-test');
    const pill = document.getElementById('test-status-pill');
    const wrapper = document.getElementById('test-output-wrapper');
    const metaInfo = document.getElementById('test-meta-info');
    const metaLat = document.getElementById('test-meta-latency');
    const codeBox = document.getElementById('test-output-code');

    const prompt = document.getElementById('test-prompt').value.trim();
    if (!prompt) return;

    btn.disabled = true;
    btn.innerHTML = `<span>⏳ Testing AI Response...</span>`;
    pill.className = 'status-pill hidden';
    wrapper.classList.remove('hidden');
    metaInfo.textContent = 'Querying Active AI Provider...';
    metaLat.textContent = '';
    codeBox.textContent = 'Waiting for response from server...';

    try {
        const resp = await fetch(`${API_BASE}/test-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Pin': adminPin
            },
            body: JSON.stringify({ prompt: prompt })
        });

        const data = await resp.json();
        if (data.success) {
            pill.className = 'status-pill success';
            pill.textContent = '✔ Success';
            metaInfo.textContent = `Provider: ${data.provider.toUpperCase()} • Model: ${data.model}`;
            metaLat.textContent = `Latency: ${data.latency_ms} ms`;
            codeBox.textContent = data.result;
            loadLogs();
        } else {
            pill.className = 'status-pill error';
            pill.textContent = '✖ Error';
            metaInfo.textContent = `Failed (${data.provider.toUpperCase()})`;
            metaLat.textContent = `Latency: ${data.latency_ms} ms`;
            codeBox.textContent = `ERROR DETAILS:\n${data.error}`;
            loadLogs();
        }
    } catch (err) {
        pill.className = 'status-pill error';
        pill.textContent = '✖ Network Error';
        codeBox.textContent = 'Unable to complete test request: ' + err.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>🚀 Test Active AI Engine</span>`;
    }
}

function toggleVis(id) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'success' ? 'var(--success)' : 'var(--error)';
    toast.innerHTML = `
        <span style="font-size:1.3rem">${type === 'success' ? '✅' : '❌'}</span>
        <div>
            <strong style="display:block;font-size:0.9rem">${type === 'success' ? 'Success' : 'Notice'}</strong>
            <span style="font-size:0.85rem;color:var(--text-main)">${message}</span>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
