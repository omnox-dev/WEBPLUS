const fs = require('fs');
const path = require('path');

// On Vercel / Serverless, /var/task is read-only; /tmp is the only writable directory.
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? '/tmp' : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_DATA = {
  audits: [],
  leads: [
    {
      id: "lead-001",
      name: "Suresh Patil",
      email: "suresh@artisanbakery.in",
      phone: "+91 98220 12345",
      site: "https://artisanbakery.in",
      package: "Professional",
      status: "New",
      notes: "Looking to fix broken menu link and add WhatsApp ordering before festive season.",
      createdAt: new Date().toISOString()
    },
    {
      id: "lead-002",
      name: "Dr. Ananya Rao",
      email: "contact@raodentalclinic.com",
      phone: "+91 99300 45678",
      site: "https://raodentalclinic.com",
      package: "Correction Package",
      status: "Contacted",
      notes: "Website has old clinic timings; patients showed up after closing.",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  discoveryConversations: [
    {
      id: "disc-001",
      interviewer: "Piyush Yashvant Shinde",
      customerName: "Ramesh Joshi (Café Bistro)",
      businessType: "Café / Restaurant",
      date: "2026-11-18",
      incidentProblem: "Customer tried booking a table for Sunday through the website, but the contact form sent emails to an old deactivated inbox.",
      currentFix: "Put a handwritten notice outside the café asking customers to call directly.",
      exactQuotes: "\"We lost at least 4 weekend bookings because nobody knew the form was broken until a regular told us.\"",
      hadPainAndTriedToFix: true,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: "disc-002",
      interviewer: "Shrey Sharma",
      customerName: "Meera Deshmukh (Meera Yoga Studio)",
      businessType: "Fitness & Wellness",
      date: "2026-11-19",
      incidentProblem: "People kept calling asking where the studio is located because the Google Map on the contact page showed a 404 error.",
      currentFix: "Spent 2 hours trying to edit WordPress, gave up and WhatsApped Google pin manually.",
      exactQuotes: "\"I don't have time to fix web code every week; I just want people to find my classes.\"",
      hadPainAndTriedToFix: true,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "disc-003",
      interviewer: "Netra Nirav Kapadia",
      customerName: "Vikram Mehta (Apex Hardware)",
      businessType: "Retail / Shop",
      date: "2026-11-20",
      incidentProblem: "Mobile visitors couldn't tap the 'Call Us' button because it was hidden behind an overlapping image banner.",
      currentFix: "Paid local student 500 Rs to adjust banner, but still looks misaligned on iPhones.",
      exactQuotes: "\"90% of our customers search on phones; if the call button fails, they go to the next shop.\"",
      hadPainAndTriedToFix: true,
      createdAt: new Date().toISOString()
    }
  ],
  channelMetrics: [
    { channel: "WhatsApp outreach", sawIt: 28, stoppedAsked: 9, committed: 3 },
    { channel: "LinkedIn", sawIt: 34, stoppedAsked: 6, committed: 2 },
    { channel: "Email", sawIt: 45, stoppedAsked: 5, committed: 1 },
    { channel: "Local business groups", sawIt: 22, stoppedAsked: 8, committed: 4 }
  ],
  experimentSettings: {
    passMark: 8,
    killMark: 3,
    targetInterviews: 15,
    targetReach: 50
  }
};

// In-memory fallback in case disk writing is restricted
let inMemoryStore = JSON.parse(JSON.stringify(INITIAL_DATA));

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    // Read-only filesystem in serverless, fallback to in-memory
  }
}

function readDb() {
  try {
    ensureDir();
    if (!fs.existsSync(DB_FILE)) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
      } catch (e) {}
      return inMemoryStore;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    inMemoryStore = parsed;
    return parsed;
  } catch (err) {
    return inMemoryStore;
  }
}

function writeDb(data) {
  inMemoryStore = data;
  try {
    ensureDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // If filesystem is read-only (e.g. serverless container), inMemoryStore preserves the data
  }
}

module.exports = {
  readDb,
  writeDb
};
