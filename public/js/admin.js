// Web Plus Admin & Experiment Management Logic

document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.style.display = 'none');

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.getAttribute('data-tab'));
      if (targetPane) targetPane.style.display = 'block';
    });
  });

  // Modal Handlers
  const convModal = document.getElementById('convModal');
  const openConvModalBtn = document.getElementById('openConvModalBtn');
  const closeConvModalBtn = document.getElementById('closeConvModalBtn');

  if (openConvModalBtn) {
    openConvModalBtn.addEventListener('click', () => convModal.classList.add('active'));
  }
  if (closeConvModalBtn) {
    closeConvModalBtn.addEventListener('click', () => convModal.classList.remove('active'));
  }

  // Initial Data Loads
  loadExperimentData();
  loadLeadsData();
  loadAuditsData();

  // Handle Log Conversation Form
  const convForm = document.getElementById('convForm');
  if (convForm) {
    convForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(convForm);
      const payload = {
        interviewer: fd.get('interviewer'),
        customerName: fd.get('customerName'),
        businessType: fd.get('businessType'),
        incidentProblem: fd.get('incidentProblem'),
        currentFix: fd.get('currentFix'),
        exactQuotes: fd.get('exactQuotes'),
        hadPainAndTriedToFix: fd.get('hadPainAndTriedToFix') === 'true'
      };

      try {
        const res = await fetch('/api/experiment/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          convModal.classList.remove('active');
          convForm.reset();
          loadExperimentData();
        } else {
          alert(data.error || 'Failed to save conversation');
        }
      } catch (err) {
        alert('Network error saving conversation');
      }
    });
  }
});

async function loadExperimentData() {
  try {
    const res = await fetch('/api/experiment');
    const data = await res.json();
    if (!data.success) return;

    const { analysis, conversations, channelMetrics, settings } = data;

    // Funnel KPIs
    document.getElementById('kpiReach').textContent = analysis.totalReach;
    document.getElementById('kpiStopped').textContent = analysis.totalStopped;
    document.getElementById('kpiCommitted').textContent = analysis.totalCommitted;
    document.getElementById('kpiPassMark').textContent = settings.passMark || 8;
    document.getElementById('kpiPainCount').textContent = `${analysis.painCount} / ${conversations.length} logged`;

    // Decision Matrix
    document.getElementById('statPainCount').textContent = `${analysis.painCount} / 15`;
    document.getElementById('statCommitRatio').textContent = analysis.commitmentsRatio;
    document.getElementById('statPassMark').textContent = settings.passMark || 8;
    document.getElementById('statKillMark').textContent = settings.killMark || 3;

    const verdictBadge = document.getElementById('verdictBadge');
    verdictBadge.textContent = analysis.verdict;
    document.getElementById('verdictExplanation').textContent = analysis.explanation;

    // Highlight matrix quadrant
    document.querySelectorAll('.matrix-cell').forEach(c => c.classList.remove('active-verdict'));
    if (analysis.verdict === 'CONTINUE') {
      verdictBadge.style.color = '#10b981';
      document.getElementById('quadContinue').classList.add('active-verdict');
    } else if (analysis.verdict === 'MODIFY THE SOLUTION') {
      verdictBadge.style.color = '#f59e0b';
      document.getElementById('quadModifySol').classList.add('active-verdict');
    } else if (analysis.verdict === 'MODIFY THE CUSTOMER') {
      verdictBadge.style.color = '#3b82f6';
      document.getElementById('quadModifyCust').classList.add('active-verdict');
    } else if (analysis.verdict === 'KILL') {
      verdictBadge.style.color = '#ef4444';
      document.getElementById('quadKill').classList.add('active-verdict');
    }

    // Render Channels Table
    const channelsTbody = document.getElementById('channelsTableBody');
    channelsTbody.innerHTML = channelMetrics.map(m => `
      <tr>
        <td><strong>${m.channel}</strong></td>
        <td><input type="number" class="f" style="margin-bottom:0; width:90px;" value="${m.sawIt}" id="saw_${encodeURIComponent(m.channel)}"></td>
        <td><input type="number" class="f" style="margin-bottom:0; width:90px;" value="${m.stoppedAsked}" id="stopped_${encodeURIComponent(m.channel)}"></td>
        <td><input type="number" class="f" style="margin-bottom:0; width:90px;" value="${m.committed}" id="com_${encodeURIComponent(m.channel)}"></td>
        <td>
          <button class="btn ghost sm" onclick="updateChannel('${encodeURIComponent(m.channel)}')">Save</button>
        </td>
      </tr>
    `).join('');

    // Render Conversations Table
    const convTbody = document.getElementById('conversationsTableBody');
    if (conversations.length === 0) {
      convTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--mute);">No conversations logged yet. Click "+ Log New Conversation" above.</td></tr>';
    } else {
      convTbody.innerHTML = conversations.map(c => `
        <tr>
          <td>
            <strong>${c.customerName}</strong>
            <div style="font-size:12px; color:var(--mute);">${c.businessType || 'Small Business'}</div>
          </td>
          <td style="font-size:13px; color:var(--mute);">${c.interviewer}</td>
          <td style="font-size:13.5px;">${c.incidentProblem}</td>
          <td style="font-size:13px; color:var(--mute);">${c.currentFix}</td>
          <td style="font-size:12.5px; font-style:italic; color:var(--ink);">${c.exactQuotes ? `"${c.exactQuotes}"` : '—'}</td>
          <td>
            ${c.hadPainAndTriedToFix ? '<span class="badge Good">✓ Validated</span>' : '<span class="badge" style="background:var(--line); color:var(--mute);">No Action</span>'}
          </td>
          <td>
            <button class="btn sm ghost" style="color:var(--bad);" onclick="deleteConversation('${c.id}')">Delete</button>
          </td>
        </tr>
      `).join('');
    }

  } catch (err) {
    console.error('Error loading experiment data:', err);
  }
}

async function updateChannel(encodedChannel) {
  const channel = decodeURIComponent(encodedChannel);
  const sawIt = document.getElementById(`saw_${encodedChannel}`).value;
  const stoppedAsked = document.getElementById(`stopped_${encodedChannel}`).value;
  const committed = document.getElementById(`com_${encodedChannel}`).value;

  try {
    const res = await fetch('/api/experiment/channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, sawIt, stoppedAsked, committed })
    });
    const data = await res.json();
    if (data.success) {
      loadExperimentData();
    }
  } catch (err) {
    alert('Failed to update channel');
  }
}

async function deleteConversation(id) {
  if (!confirm('Are you sure you want to delete this conversation entry?')) return;
  try {
    const res = await fetch(`/api/experiment/conversation/${id}`, { method: 'DELETE' });
    if (res.ok) loadExperimentData();
  } catch (err) {
    alert('Failed to delete conversation');
  }
}

async function loadLeadsData() {
  try {
    const res = await fetch('/api/leads');
    const data = await res.json();
    const tbody = document.getElementById('leadsTableBody');

    if (!data.success || data.leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--mute);">No customer leads received yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.leads.map(lead => `
      <tr>
        <td style="font-size:12px; color:var(--mute);">${new Date(lead.createdAt).toLocaleDateString()}</td>
        <td>
          <strong>${lead.name}</strong>
        </td>
        <td style="font-size:13px;">
          <div>${lead.email}</div>
          <div style="color:var(--mute);">${lead.phone || 'No phone'}</div>
        </td>
        <td style="font-size:13px;">
          ${lead.site ? `<a href="${lead.site}" target="_blank" style="color:var(--blue);">${lead.site}</a>` : '—'}
        </td>
        <td><span class="badge" style="background:var(--soft); color:var(--blue);">${lead.package}</span></td>
        <td>
          <select class="f" style="margin-bottom:0; padding:4px 8px; font-size:12px;" onchange="updateLeadStatus('${lead.id}', this.value)">
            <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Audited" ${lead.status === 'Audited' ? 'selected' : ''}>Audited</option>
            <option value="Closed" ${lead.status === 'Closed' ? 'selected' : ''}>Closed / Won</option>
            <option value="Lost" ${lead.status === 'Lost' ? 'selected' : ''}>Lost</option>
          </select>
        </td>
        <td style="font-size:12.5px; color:var(--mute);">${lead.notes || '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading leads:', err);
  }
}

async function updateLeadStatus(id, newStatus) {
  try {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (err) {
    alert('Failed to update lead status');
  }
}

async function loadAuditsData() {
  try {
    const res = await fetch('/api/audits');
    const data = await res.json();
    const tbody = document.getElementById('auditsTableBody');

    if (!data.success || data.audits.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--mute);">No audits recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.audits.map(a => `
      <tr>
        <td style="font-size:12px; color:var(--mute);">${new Date(a.scannedAt).toLocaleString([], { dateStyle:'short', timeStyle:'short' })}</td>
        <td>
          <strong>${a.domain}</strong>
          <div style="font-size:11px; color:var(--mute); overflow:hidden; text-overflow:ellipsis; max-width:200px;">${a.url}</div>
        </td>
        <td>
          <span style="font-size:16px; font-weight:800; color:${a.healthScore >= 75 ? 'var(--ok)' : a.healthScore >= 50 ? 'var(--warn)' : 'var(--bad)'};">
            ${a.healthScore}/100
          </span>
        </td>
        <td><span class="badge Critical">${a.criticalCount}</span></td>
        <td><span class="badge Needs">${a.needsCount}</span></td>
        <td><span class="badge Good">${a.goodCount}</span></td>
        <td>
          <a href="/report?id=${a.id}" class="btn ghost sm" target="_blank">View Report →</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading audits:', err);
  }
}
