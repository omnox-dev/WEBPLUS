const express = require('express');
const cors = require('cors');
const path = require('path');
const { run15PointAudit } = require('./lib/scanner');
const { SAMPLE_DEMO_REPORT } = require('./lib/mockDemoData');
const dbAdapter = require('./lib/dbAdapter');
const { registerUser, authenticateUser, getSessionUser, revokeSession, requireAuth, optionalAuth } = require('./lib/auth');

// Load .env variables (Node 20+ native or manual parse)
try {
  process.loadEnvFile();
} catch (e) {
  // If native loadEnvFile fails or .env format varies, parse manually
  try {
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          const val = vals.join('=').replace(/^["']|["']$/g, '').trim();
          if (!process.env[key.trim()]) process.env[key.trim()] = val;
        }
      });
    }
  } catch (err) {}
}

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database connection (Platform MongoDB if MONGO_URI set, else persistent engine)
dbAdapter.initDatabase();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------
// 0. AUTHENTICATION ENDPOINTS (Sign Up, Sign In, Profile, Logout)
// -----------------------------------------------------------------

// POST /api/auth/signup - Register new account
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }
  try {
    const result = registerUser(name, email, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login - Sign in
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const result = authenticateUser(email, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// GET /api/auth/me - Check current authentication status
app.get('/api/auth/me', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ success: true, authenticated: false, user: null });
  }
  res.json({ success: true, authenticated: true, user: req.user });
});

// POST /api/auth/logout - Sign out
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    revokeSession(authHeader.substring(7).trim());
  }
  res.json({ success: true });
});

// -----------------------------------------------------------------
// 1. SCANNING & AUDIT ENDPOINTS
// -----------------------------------------------------------------

// POST /api/scan - Trigger live website health audit (Protected: Requires Login)
app.post('/api/scan', requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a valid website URL.' });
    }

    console.log(`[AUDIT] User ${req.user.email} started 15-Point Scan for: ${url}`);
    const auditResult = await run15PointAudit(url);
    auditResult.userId = req.user.userId;
    auditResult.userEmail = req.user.email;

    // Save audit to Database (MongoDB / persistent engine)
    await dbAdapter.saveAudit(auditResult);

    res.json({
      success: true,
      report: auditResult
    });
  } catch (err) {
    console.error('[AUDIT ERROR]', err);
    res.status(500).json({
      error: 'Failed to complete website audit.',
      details: err.message
    });
  }
});

// GET /api/scan/:id - Retrieve an audit report
app.get('/api/scan/:id', async (req, res) => {
  const { id } = req.params;
  if (id === 'sample' || id === 'audit-sample-bakery') {
    return res.json({ success: true, report: SAMPLE_DEMO_REPORT });
  }

  const found = await dbAdapter.getAuditById(id);
  if (!found) {
    return res.status(404).json({ error: 'Audit report not found.' });
  }

  res.json({ success: true, report: found });
});

// GET /api/audits - List all recent audits
app.get('/api/audits', async (req, res) => {
  const audits = await dbAdapter.getAudits();
  const list = audits.map(a => ({
    id: a.id,
    domain: a.domain,
    url: a.url,
    healthScore: a.healthScore,
    scannedAt: a.scannedAt,
    criticalCount: a.criticalCount,
    needsCount: a.needsCount,
    goodCount: a.goodCount
  }));
  res.json({ success: true, audits: list });
});

// -----------------------------------------------------------------
// 2. LEAD & BOOKING ENDPOINTS
// -----------------------------------------------------------------

// POST /api/leads - Submit contact or audit booking request
app.post('/api/leads', async (req, res) => {
  const { name, email, phone, site, package: pkg, notes, auditId } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const newLead = {
    id: 'lead-' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : '',
    site: site ? site.trim() : '',
    package: pkg || 'Starter',
    status: 'New',
    notes: notes ? notes.trim() : '',
    auditId: auditId || null,
    createdAt: new Date().toISOString()
  };

  await dbAdapter.saveLead(newLead);
  console.log(`[LEAD] New lead booked: ${newLead.name} (${newLead.email}) for ${newLead.package}`);
  res.json({ success: true, lead: newLead });
});

// GET /api/leads - List all booked leads
app.get('/api/leads', async (req, res) => {
  const leads = await dbAdapter.getLeads();
  res.json({ success: true, leads });
});

// PATCH /api/leads/:id - Update lead status or notes
app.patch('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const updated = await dbAdapter.updateLead(id, {
    ...(status && { status }),
    ...(notes !== undefined && { notes })
  });

  if (!updated) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  res.json({ success: true, lead: updated });
});

// -----------------------------------------------------------------
// 3. WORKSHOP EXPERIMENT & DISCOVERY TRACKER (PPT SLIDES 4, 6, 8, 9)
// -----------------------------------------------------------------

function calculateMatrixVerdict(conversations, metrics, settings) {
  const painCount = conversations.filter(c => c.hadPainAndTriedToFix).length;
  const totalInterviews = conversations.length;

  let totalReach = 0;
  let totalStopped = 0;
  let totalCommitted = 0;

  metrics.forEach(m => {
    totalReach += Number(m.sawIt || 0);
    totalStopped += Number(m.stoppedAsked || 0);
    totalCommitted += Number(m.committed || 0);
  });

  const passMark = Number(settings.passMark || 8);
  const killMark = Number(settings.killMark || 3);

  const highPain = painCount >= 8;
  const highCommit = totalCommitted >= passMark;

  let verdict = "Pending Data";
  let explanation = "";

  if (totalInterviews < 3 && totalReach < 10) {
    verdict = "Collecting Evidence";
    explanation = "Log at least 3-5 interviews and outreach figures to see real matrix projections.";
  } else if (highPain && highCommit) {
    verdict = "CONTINUE";
    explanation = "Strong problem validation: customers have real pain, already spend effort fixing it, and are committing to audit bookings.";
  } else if (highPain && !highCommit) {
    verdict = "MODIFY THE SOLUTION";
    explanation = "Owners strongly confirm website pain, but the offer/pricing isn't triggering commitments. Simplify the report or adjust the guarantee.";
  } else if (!highPain && highCommit) {
    verdict = "MODIFY THE CUSTOMER";
    explanation = "Commitments were achieved, but broad customer discovery showed low inherent urgency. Focus outreach exclusively on highest-converting niches (e.g. multi-location clinics, busy cafés).";
  } else {
    verdict = "KILL";
    explanation = "Neither pain count nor commitments met thresholds. The customer segment does not care enough about website errors to justify investment.";
  }

  return {
    painCount,
    totalInterviews,
    targetInterviews: settings.targetInterviews || 15,
    totalReach,
    totalStopped,
    totalCommitted,
    passMark,
    killMark,
    commitmentsRatio: passMark > 0 ? (totalCommitted / passMark).toFixed(2) : 0,
    verdict,
    explanation
  };
}

// GET /api/experiment - Retrieve discovery logs, funnel metrics, and matrix verdict
app.get('/api/experiment', async (req, res) => {
  const { conversations, channelMetrics, settings } = await dbAdapter.getExperimentData();
  const analysis = calculateMatrixVerdict(conversations, channelMetrics, settings);
  res.json({
    success: true,
    conversations,
    channelMetrics,
    settings,
    analysis
  });
});

// POST /api/experiment/conversation - Log a customer discovery conversation
app.post('/api/experiment/conversation', async (req, res) => {
  const { interviewer, customerName, businessType, date, incidentProblem, currentFix, exactQuotes, hadPainAndTriedToFix } = req.body;

  if (!customerName || !incidentProblem) {
    return res.status(400).json({ error: 'Customer name and incident description are required.' });
  }

  const newConversation = {
    id: 'disc-' + Date.now(),
    interviewer: interviewer || 'Piyush Yashvant Shinde',
    customerName: customerName.trim(),
    businessType: businessType ? businessType.trim() : 'Small Business',
    date: date || new Date().toISOString().split('T')[0],
    incidentProblem: incidentProblem.trim(),
    currentFix: currentFix ? currentFix.trim() : 'Did nothing / unsure',
    exactQuotes: exactQuotes ? exactQuotes.trim() : '',
    hadPainAndTriedToFix: Boolean(hadPainAndTriedToFix),
    createdAt: new Date().toISOString()
  };

  await dbAdapter.addDiscoveryConversation(newConversation);
  res.json({ success: true, conversation: newConversation });
});

// DELETE /api/experiment/conversation/:id
app.delete('/api/experiment/conversation/:id', async (req, res) => {
  const { id } = req.params;
  await dbAdapter.deleteDiscoveryConversation(id);
  res.json({ success: true });
});

// POST /api/experiment/channel - Update funnel numbers for a channel
app.post('/api/experiment/channel', async (req, res) => {
  const { channel, sawIt, stoppedAsked, committed } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel name required.' });

  const updatedMetrics = await dbAdapter.updateChannelMetric(channel, {
    ...(sawIt !== undefined && { sawIt: Number(sawIt) }),
    ...(stoppedAsked !== undefined && { stoppedAsked: Number(stoppedAsked) }),
    ...(committed !== undefined && { committed: Number(committed) })
  });

  res.json({ success: true, channelMetrics: updatedMetrics });
});

// POST /api/experiment/settings - Update pass/kill marks
app.post('/api/experiment/settings', (req, res) => {
  const { passMark, killMark, targetInterviews, targetReach } = req.body;
  const currentDb = readDb();
  currentDb.experimentSettings = {
    ...currentDb.experimentSettings,
    ...(passMark !== undefined && { passMark: Number(passMark) }),
    ...(killMark !== undefined && { killMark: Number(killMark) }),
    ...(targetInterviews !== undefined && { targetInterviews: Number(targetInterviews) }),
    ...(targetReach !== undefined && { targetReach: Number(targetReach) })
  };
  writeDb(currentDb);
  res.json({ success: true, settings: currentDb.experimentSettings });
});

// -----------------------------------------------------------------
// 4. CLIENT ROUTING
// -----------------------------------------------------------------

// Serve report view
app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

// Serve admin portal
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback to index
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(portToUse) {
  const srv = app.listen(portToUse, () => {
    console.log(`====================================================`);
    console.log(`  WEB PLUS - Premium Website Health Engine`);
    console.log(`  Server running at: http://localhost:${portToUse}`);
    console.log(`  Client Landing & Live Scanner: http://localhost:${portToUse}`);
    console.log(`  Interactive Report: http://localhost:${portToUse}/report?id=sample`);
    console.log(`  Team Operations Dashboard: http://localhost:${portToUse}/admin`);
    console.log(`====================================================`);
  });

  srv.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = Number(portToUse) + 1;
      console.log(`[SERVER] Port ${portToUse} in use. Switching to port ${fallbackPort}...`);
      startServer(fallbackPort);
    } else {
      console.error('[SERVER ERROR]', err);
    }
  });

  return srv;
}

startServer(PORT);
