// WEB PLUS - Unified In-Page Application Logic with User Authentication

let currentReportData = null;
let activePillarIndex = 0;
let currentActionFilter = 'All';
let currentUser = null;
let pendingScanUrl = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check User Auth Status
  await checkAuthStatus();

  // 2. Initial Load: Load Sample Report into the interactive views
  await loadReportById('sample');

  // 3. Setup Auth Modal Triggers
  setupAuthHandlers();

  // 4. Setup Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const url = chip.getAttribute('data-url');
      const targetInput = document.getElementById('targetUrl');
      if (url && targetInput) {
        targetInput.value = url;
        triggerScan(url);
      }
    });
  });

  // 5. Setup Scan Form
  const scanForm = document.getElementById('scanForm');
  if (scanForm) {
    scanForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawUrl = document.getElementById('targetUrl').value.trim();
      if (rawUrl) triggerScan(rawUrl);
    });
  }

  // 6. Setup Plan Selection Buttons
  document.querySelectorAll('.select-plan').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const plan = btn.getAttribute('data-plan');
      const pkgSelect = document.getElementById('bookingPackage');
      if (pkgSelect && plan) pkgSelect.value = plan;

      const bookingSec = document.getElementById('booking');
      if (bookingSec) {
        bookingSec.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          const nameInput = document.querySelector('input[name="name"]');
          if (nameInput) nameInput.focus();
        }, 500);
      }
    });
  });

  // 7. Setup Action Plan Filter Buttons
  document.querySelectorAll('#audit-results .preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#audit-results .preset-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentActionFilter = btn.getAttribute('data-filter') || 'All';
      renderActionPlanTable();
    });
  });

  // 8. Setup Lead Booking Form
  const bookingForm = document.getElementById('bookingLeadForm');
  const bookingSubmitBtn = document.getElementById('bookingSubmitBtn');
  const bookingMsg = document.getElementById('bookingMsg');

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      bookingSubmitBtn.disabled = true;
      bookingSubmitBtn.textContent = 'Submitting Request...';

      const fd = new FormData(bookingForm);
      const payload = {
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        site: fd.get('site'),
        package: fd.get('package'),
        notes: fd.get('notes'),
        auditId: document.getElementById('bookingAuditId').value || null
      };

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          bookingMsg.style.display = 'block';
          bookingMsg.style.color = 'var(--ok)';
          bookingMsg.style.fontWeight = '600';
          bookingMsg.innerHTML = `✓ Thank you ${payload.name}! Your request for <strong>${payload.package}</strong> was received. Our team will contact you within 24 hours.`;
          bookingForm.reset();
        } else {
          bookingMsg.style.display = 'block';
          bookingMsg.style.color = 'var(--bad)';
          bookingMsg.textContent = data.error || 'Failed to submit booking.';
        }
      } catch (err) {
        bookingMsg.style.display = 'block';
        bookingMsg.style.color = 'var(--bad)';
        bookingMsg.textContent = 'Network error. Please try again.';
      } finally {
        bookingSubmitBtn.disabled = false;
        bookingSubmitBtn.textContent = 'Submit Request';
      }
    });
  }
});

// -------------------------------------------------------------
// AUTHENTICATION LOGIC (Sign in, Sign up, Session Management)
// -------------------------------------------------------------

async function checkAuthStatus() {
  const token = localStorage.getItem('webplus_token');
  if (!token) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.authenticated) {
      currentUser = data.user;
      updateAuthUI(currentUser);
    } else {
      localStorage.removeItem('webplus_token');
      updateAuthUI(null);
    }
  } catch (err) {
    console.warn('Auth check notice:', err);
    updateAuthUI(null);
  }
}

function updateAuthUI(user) {
  const loggedOutNav = document.getElementById('authNavLoggedOut');
  const loggedInNav = document.getElementById('authNavLoggedIn');
  const userNameSpan = document.getElementById('authUserName');

  if (user) {
    if (loggedOutNav) loggedOutNav.style.display = 'none';
    if (loggedInNav) loggedInNav.style.display = 'flex';
    if (userNameSpan) userNameSpan.textContent = `👤 ${user.name}`;
  } else {
    currentUser = null;
    if (loggedOutNav) loggedOutNav.style.display = 'flex';
    if (loggedInNav) loggedInNav.style.display = 'none';
  }
}

function setupAuthHandlers() {
  const authModal = document.getElementById('authModal');
  const openSignInBtn = document.getElementById('openSignInBtn');
  const openSignUpBtn = document.getElementById('openSignUpBtn');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const tabAuthLogin = document.getElementById('tabAuthLogin');
  const tabAuthSignup = document.getElementById('tabAuthSignup');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const authModalTitle = document.getElementById('authModalTitle');
  const authErrMsg = document.getElementById('authErrMsg');
  const signOutBtn = document.getElementById('signOutBtn');

  const switchTab = (mode) => {
    authErrMsg.style.display = 'none';
    if (mode === 'login') {
      tabAuthLogin.classList.add('active');
      tabAuthSignup.classList.remove('active');
      signInForm.style.display = 'block';
      signUpForm.style.display = 'none';
      authModalTitle.textContent = 'Sign In to WEB PLUS';
    } else {
      tabAuthLogin.classList.remove('active');
      tabAuthSignup.classList.add('active');
      signInForm.style.display = 'none';
      signUpForm.style.display = 'block';
      authModalTitle.textContent = 'Create Your Free Account';
    }
  };

  if (openSignInBtn) openSignInBtn.onclick = () => { switchTab('login'); authModal.classList.add('active'); };
  if (openSignUpBtn) openSignUpBtn.onclick = () => { switchTab('signup'); authModal.classList.add('active'); };
  if (closeAuthModalBtn) closeAuthModalBtn.onclick = () => { authModal.classList.remove('active'); };
  if (tabAuthLogin) tabAuthLogin.onclick = () => switchTab('login');
  if (tabAuthSignup) tabAuthSignup.onclick = () => switchTab('signup');

  // Handle Sign In Submit
  if (signInForm) {
    signInForm.onsubmit = async (e) => {
      e.preventDefault();
      authErrMsg.style.display = 'none';
      const fd = new FormData(signInForm);

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('webplus_token', data.token);
          currentUser = data.user;
          updateAuthUI(currentUser);
          authModal.classList.remove('active');
          signInForm.reset();

          // If user had clicked scan while logged out, auto-trigger scan now!
          if (pendingScanUrl) {
            const urlToRun = pendingScanUrl;
            pendingScanUrl = null;
            triggerScan(urlToRun);
          }
        } else {
          authErrMsg.style.display = 'block';
          authErrMsg.textContent = data.error || 'Failed to sign in.';
        }
      } catch (err) {
        authErrMsg.style.display = 'block';
        authErrMsg.textContent = 'Network error signing in.';
      }
    };
  }

  // Handle Sign Up Submit
  if (signUpForm) {
    signUpForm.onsubmit = async (e) => {
      e.preventDefault();
      authErrMsg.style.display = 'none';
      const fd = new FormData(signUpForm);

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fd.get('name'), email: fd.get('email'), password: fd.get('password') })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('webplus_token', data.token);
          currentUser = data.user;
          updateAuthUI(currentUser);
          authModal.classList.remove('active');
          signUpForm.reset();

          if (pendingScanUrl) {
            const urlToRun = pendingScanUrl;
            pendingScanUrl = null;
            triggerScan(urlToRun);
          }
        } else {
          authErrMsg.style.display = 'block';
          authErrMsg.textContent = data.error || 'Failed to create account.';
        }
      } catch (err) {
        authErrMsg.style.display = 'block';
        authErrMsg.textContent = 'Network error creating account.';
      }
    };
  }

  // Handle Sign Out
  if (signOutBtn) {
    signOutBtn.onclick = async () => {
      const token = localStorage.getItem('webplus_token');
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (err) {}
      }
      localStorage.removeItem('webplus_token');
      updateAuthUI(null);
    };
  }
}

// -------------------------------------------------------------
// LIVE AUDIT SCANNER (Open to all visitors, optional login)
// -------------------------------------------------------------

async function triggerScan(url) {
  const token = localStorage.getItem('webplus_token');
  const scanBtn = document.getElementById('scanBtn');
  const progressBox = document.getElementById('scanProgressBox');
  const progressFill = document.getElementById('progressFill');
  const percentText = document.getElementById('scanPercent');
  const statusDetail = document.getElementById('scanStatusDetail');

  scanBtn.disabled = true;
  scanBtn.innerHTML = 'Scanning...';
  progressBox.classList.add('active');

  // Smooth progress animation
  let p = 15;
  progressFill.style.width = '15%';
  percentText.textContent = '15%';
  statusDetail.textContent = 'Connecting to server & verifying DNS...';

  const pInterval = setInterval(() => {
    if (p < 85) {
      p += Math.floor(Math.random() * 18) + 5;
      if (p > 85) p = 85;
      progressFill.style.width = `${p}%`;
      percentText.textContent = `${p}%`;

      if (p > 30 && p < 60) {
        statusDetail.textContent = 'Parsing HTML, navigation links & interactive forms...';
      } else if (p >= 60) {
        statusDetail.textContent = 'Testing mobile viewport, contact endpoints & security...';
      }
    }
  }, 400);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/scan', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    clearInterval(pInterval);

    progressFill.style.width = '100%';
    percentText.textContent = '100%';
    statusDetail.textContent = 'Audit complete! Rendering health report...';

    if (data.success && data.report) {
      setTimeout(() => {
        progressBox.classList.remove('active');
        scanBtn.disabled = false;
        scanBtn.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg> Audit Website';
        applyReportToUI(data.report);

        // Smooth scroll to results
        const resultsSec = document.getElementById('audit-results');
        if (resultsSec) resultsSec.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } else {
      alert(data.error || 'Failed to scan website.');
      progressBox.classList.remove('active');
      scanBtn.disabled = false;
      scanBtn.innerHTML = 'Audit Website';
    }
  } catch (err) {
    clearInterval(pInterval);
    console.error('Scan error:', err);
    alert('Server error occurred during scan.');
    progressBox.classList.remove('active');
    scanBtn.disabled = false;
    scanBtn.innerHTML = 'Audit Website';
  }
}

async function loadReportById(id) {
  try {
    const res = await fetch(`/api/scan/${id}`);
    const data = await res.json();
    if (data.success && data.report) {
      applyReportToUI(data.report);
    }
  } catch (err) {
    console.warn('Could not load report by id', err);
  }
}

function applyReportToUI(report) {
  currentReportData = report;

  // 1. Update Hero Card Preview
  document.getElementById('heroPreviewDomain').textContent = report.domain;
  document.getElementById('heroPreviewBadge').textContent = report.domain.includes('sample') ? 'Sample Demo' : 'Live Verified';
  document.getElementById('heroScoreVal').textContent = report.healthScore;
  document.getElementById('heroRing').style.setProperty('--p', report.healthScore);
  document.getElementById('heroCritCount').textContent = report.criticalCount;
  document.getElementById('heroNeedsCount').textContent = report.needsCount;
  document.getElementById('heroGoodCount').textContent = report.goodCount;

  // 2. Update Audit Results Header
  document.getElementById('reportDomainTitle').textContent = `Audit Report: ${report.domain}`;
  document.getElementById('reportSummaryText').textContent = report.summary;

  // 3. Prefill Booking Form with this site
  const bookingSite = document.getElementById('bookingSite');
  const bookingAuditId = document.getElementById('bookingAuditId');
  if (bookingSite) bookingSite.value = report.url;
  if (bookingAuditId) bookingAuditId.value = report.id;

  // 4. Render Pillar Tabs (The 5 Pillars)
  renderPillarTabs();

  // 5. Render Action Plan Table
  renderActionPlanTable();
}

function renderPillarTabs() {
  if (!currentReportData || !currentReportData.checks) return;

  const tabsNav = document.getElementById('pillarTabs');
  const categories = [...new Set(currentReportData.checks.map(c => c.category))];

  tabsNav.innerHTML = categories.map((catName, idx) => `
    <button class="tab-btn ${idx === activePillarIndex ? 'active' : ''}" onclick="selectPillar(${idx})">
      ${idx + 1}. ${catName}
    </button>
  `).join('');

  renderActivePillarChecks();
}

function selectPillar(index) {
  activePillarIndex = index;
  document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === index);
  });
  renderActivePillarChecks();
}

function renderActivePillarChecks() {
  if (!currentReportData || !currentReportData.checks) return;
  const categories = [...new Set(currentReportData.checks.map(c => c.category))];
  const activeCat = categories[activePillarIndex];
  const catChecks = currentReportData.checks.filter(c => c.category === activeCat);

  const container = document.getElementById('pillarContent');
  container.innerHTML = catChecks.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 16px; background:var(--bg2); border:1px solid var(--line); border-radius:12px; gap:14px; flex-wrap:wrap;">
      <div style="flex:1; min-width:260px;">
        <div style="font-weight:700; font-size:14.5px; margin-bottom:2px;">${item.name}</div>
        <div style="font-size:13px; color:var(--mute); margin-bottom:4px;">${item.detail}</div>
        <div style="font-size:12.5px; color:var(--blue); font-weight:600;">Fix: ${item.recommendation}</div>
      </div>
      <span class="badge ${item.status}" style="flex-shrink:0;">
        ${item.status === 'Good' ? '✓ Passed' : item.status === 'Needs' ? '⚠ Needs Polish' : '✕ Critical'}
      </span>
    </div>
  `).join('');
}

function renderActionPlanTable() {
  if (!currentReportData || !currentReportData.checks) return;

  const tbody = document.getElementById('actionPlanRows');
  let checks = currentReportData.checks;

  if (currentActionFilter === 'Critical') {
    checks = checks.filter(c => c.status === 'Critical');
  } else if (currentActionFilter === 'Needs') {
    checks = checks.filter(c => c.status === 'Needs');
  } else if (currentActionFilter === 'Good') {
    checks = checks.filter(c => c.status === 'Good');
  }

  if (checks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--mute);">No checks found in category "${currentActionFilter}".</td></tr>`;
    return;
  }

  tbody.innerHTML = checks.map(c => `
    <tr>
      <td>
        <strong>${c.name}</strong>
        <div style="font-size:11.5px; color:var(--mute);">${c.category}</div>
      </td>
      <td>
        <span class="badge ${c.status}">${c.status === 'Good' ? 'Passed' : c.status === 'Needs' ? 'Needs Polish' : 'Critical'}</span>
      </td>
      <td style="font-size:13px; color:var(--ink);">${c.detail}</td>
      <td style="font-size:13px; color:var(--blue); font-weight:600;">${c.recommendation}</td>
    </tr>
  `).join('');
}
