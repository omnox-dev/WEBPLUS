// Web Plus 15-Point Report Viewer

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const auditId = urlParams.get('id') || 'sample';

  let currentReport = null;

  try {
    const res = await fetch(`/api/scan/${auditId}`);
    const data = await res.json();

    if (data.success && data.report) {
      currentReport = data.report;
      renderReport(currentReport);
    } else {
      document.getElementById('reportDomain').textContent = 'Report Not Found';
      document.getElementById('reportSummary').textContent = data.error || 'Could not load audit details.';
    }
  } catch (err) {
    console.error('Failed to load report:', err);
    document.getElementById('reportDomain').textContent = 'Error Loading Report';
  }

  // Copy shareable link
  const copyShareBtn = document.getElementById('copyShareBtn');
  if (copyShareBtn) {
    copyShareBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href);
      const originalText = copyShareBtn.innerHTML;
      copyShareBtn.innerHTML = '✓ Copied to clipboard!';
      setTimeout(() => { copyShareBtn.innerHTML = originalText; }, 2000);
    });
  }

  // Handle lead submission from report page
  const reportLeadForm = document.getElementById('reportLeadForm');
  const reportLeadBtn = document.getElementById('reportLeadBtn');
  const reportLeadMsg = document.getElementById('reportLeadMsg');

  if (reportLeadForm) {
    reportLeadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      reportLeadBtn.disabled = true;
      reportLeadBtn.textContent = 'Submitting...';

      const formData = new FormData(reportLeadForm);
      const payload = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        package: formData.get('package'),
        site: currentReport ? currentReport.url : formData.get('site'),
        auditId: currentReport ? currentReport.id : null,
        notes: `Customer requested fix package directly from audit report (${currentReport?.healthScore}/100)`
      };

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          reportLeadMsg.style.display = 'block';
          reportLeadMsg.style.color = '#10b981';
          reportLeadMsg.innerHTML = '✓ Request received! Piyush & the Web Plus audit team will review your site and contact you shortly.';
          reportLeadForm.reset();
        } else {
          reportLeadMsg.style.display = 'block';
          reportLeadMsg.style.color = '#ef4444';
          reportLeadMsg.textContent = data.error || 'Failed to submit booking.';
        }
      } catch (err) {
        reportLeadMsg.style.display = 'block';
        reportLeadMsg.style.color = '#ef4444';
        reportLeadMsg.textContent = 'Network error. Please try again.';
      } finally {
        reportLeadBtn.disabled = false;
        reportLeadBtn.textContent = 'Book Fix Package';
      }
    });
  }
});

function renderReport(report) {
  // Populate Meta Info
  document.getElementById('reportDomain').textContent = report.domain;
  document.getElementById('reportUrl').textContent = report.url;
  document.getElementById('reportDate').textContent = new Date(report.scannedAt).toLocaleDateString() + ' ' + new Date(report.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('reportLatency').textContent = report.responseTimeMs ? `${report.responseTimeMs} ms` : 'N/A';
  document.getElementById('reportSize').textContent = report.contentLengthKb ? `${report.contentLengthKb} KB` : 'N/A';

  // Prefill lead booking form
  const leadAuditId = document.getElementById('leadAuditId');
  const leadSite = document.getElementById('leadSite');
  if (leadAuditId) leadAuditId.value = report.id;
  if (leadSite) leadSite.value = report.url;

  // Animate score ring
  const scoreRing = document.getElementById('scoreRing');
  const scoreValue = document.getElementById('scoreValue');
  const targetScore = report.healthScore || 0;

  let current = 0;
  const timer = setInterval(() => {
    current += 2;
    if (current >= targetScore) {
      current = targetScore;
      clearInterval(timer);
    }
    scoreValue.textContent = current;
    scoreRing.style.setProperty('--p', current);
  }, 16);

  // Score verdict
  const scoreVerdict = document.getElementById('scoreVerdict');
  if (targetScore >= 80) {
    scoreVerdict.textContent = 'Strong Website Health';
    scoreVerdict.style.color = 'var(--ok)';
  } else if (targetScore >= 60) {
    scoreVerdict.textContent = 'Moderate Friction Detected';
    scoreVerdict.style.color = 'var(--warn)';
  } else {
    scoreVerdict.textContent = 'Critical Action Needed';
    scoreVerdict.style.color = 'var(--bad)';
  }

  document.getElementById('reportSummary').textContent = report.summary;
  document.getElementById('countCritical').textContent = report.criticalCount || 0;
  document.getElementById('countNeeds').textContent = report.needsCount || 0;
  document.getElementById('countGood').textContent = report.goodCount || 0;

  // Render Action Plan Table
  renderActionPlanTable(report.checks, 'All');

  // Setup Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      renderActionPlanTable(report.checks, filter);
    });
  });

  // Render Categories Breakdown (The 5 Pillars)
  renderCategoriesBreakdown(report.checks);
}

function renderActionPlanTable(checks, filter) {
  const tbody = document.getElementById('actionPlanBody');
  let filtered = checks;

  if (filter === 'Critical') {
    filtered = checks.filter(c => c.status === 'Critical');
  } else if (filter === 'Needs') {
    filtered = checks.filter(c => c.status === 'Needs');
  } else if (filter === 'Good') {
    filtered = checks.filter(c => c.status === 'Good');
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--mute);">No checks found matching filter "${filter}".</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td>
        <strong>${c.name}</strong>
        <div style="font-size:12px; color:var(--mute);">${c.category}</div>
      </td>
      <td>
        <span class="badge ${c.status}">${c.status === 'Good' ? 'Passed' : c.status === 'Needs' ? 'Needs Polish' : 'Critical'}</span>
      </td>
      <td style="font-size:13.5px; color:var(--ink);">${c.detail}</td>
      <td style="font-size:13.5px; color:var(--blue); font-weight:500;">${c.recommendation}</td>
    </tr>
  `).join('');
}

function renderCategoriesBreakdown(checks) {
  const categoriesList = document.getElementById('categoriesList');
  const categories = [...new Set(checks.map(c => c.category))];

  categoriesList.innerHTML = categories.map((catName, idx) => {
    const catChecks = checks.filter(c => c.category === catName);
    const passedInCat = catChecks.filter(c => c.status === 'Good').length;
    const criticalInCat = catChecks.filter(c => c.status === 'Critical').length;

    return `
      <div class="card" style="padding:20px; border-radius:14px; background:var(--bg);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div>
            <strong style="font-size:16px;">Pillar ${idx + 1}: ${catName}</strong>
            <span style="font-size:13px; color:var(--mute); margin-left:8px;">(${passedInCat}/3 Passed)</span>
          </div>
          <div>
            ${criticalInCat > 0 ? `<span class="badge Critical">${criticalInCat} Critical</span>` : `<span class="badge Good">All Clear</span>`}
          </div>
        </div>
        <div style="display:grid; gap:8px;">
          ${catChecks.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:8px 12px; background:var(--card); border:1px solid var(--line); border-radius:10px; font-size:13.5px; gap:12px;">
              <div>
                <strong>${item.name}:</strong> <span style="color:var(--mute);">${item.detail}</span>
              </div>
              <span class="badge ${item.status}" style="flex-shrink:0;">${item.status === 'Good' ? '✓ Passed' : item.status === 'Needs' ? 'Needs Work' : '⚠ Critical'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}
