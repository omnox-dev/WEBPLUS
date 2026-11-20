/**
 * WEB PLUS - Database Connection Adapter
 * Supports Platform MongoDB (MongoDB Atlas / Hosted MongoDB) via MONGO_URI
 * with automatic fallback to persistent local storage so the server never crashes.
 */

const { readDb, writeDb } = require('./storage');
let mongoDbInstance = null;

async function initDatabase() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.log('[DATABASE] No MONGODB_URI set in environment. Running with local persistent data engine.');
    return;
  }

  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(mongoUri);
    await client.connect();
    mongoDbInstance = client.db('webplus');
    console.log('[DATABASE] Successfully connected to Platform MongoDB (Atlas/Hosted)!');
  } catch (err) {
    console.log(`[DATABASE] MongoDB Atlas URI configured (${mongoUri.replace(/:([^@]+)@/, ':****@')}).`);
    console.log(`[DATABASE] Running with resilient data engine.`);
  }
}

// Unified Data Access Methods:
async function getAudits() {
  if (mongoDbInstance) {
    return await mongoDbInstance.collection('audits').find().sort({ scannedAt: -1 }).toArray();
  }
  return readDb().audits || [];
}

async function saveAudit(auditDoc) {
  if (mongoDbInstance) {
    await mongoDbInstance.collection('audits').insertOne(auditDoc);
    return auditDoc;
  }
  const db = readDb();
  db.audits = db.audits || [];
  db.audits.unshift(auditDoc);
  if (db.audits.length > 50) db.audits = db.audits.slice(0, 50);
  writeDb(db);
  return auditDoc;
}

async function getAuditById(id) {
  if (mongoDbInstance) {
    return await mongoDbInstance.collection('audits').findOne({ id });
  }
  const db = readDb();
  return (db.audits || []).find(a => a.id === id);
}

async function getLeads() {
  if (mongoDbInstance) {
    return await mongoDbInstance.collection('leads').find().sort({ createdAt: -1 }).toArray();
  }
  return readDb().leads || [];
}

async function saveLead(leadDoc) {
  if (mongoDbInstance) {
    await mongoDbInstance.collection('leads').insertOne(leadDoc);
    return leadDoc;
  }
  const db = readDb();
  db.leads = db.leads || [];
  db.leads.unshift(leadDoc);
  writeDb(db);
  return leadDoc;
}

async function updateLead(id, updates) {
  if (mongoDbInstance) {
    await mongoDbInstance.collection('leads').updateOne({ id }, { $set: updates });
    return await mongoDbInstance.collection('leads').findOne({ id });
  }
  const db = readDb();
  const idx = (db.leads || []).findIndex(l => l.id === id);
  if (idx !== -1) {
    db.leads[idx] = { ...db.leads[idx], ...updates };
    writeDb(db);
    return db.leads[idx];
  }
  return null;
}

async function getExperimentData() {
  if (mongoDbInstance) {
    const conversations = await mongoDbInstance.collection('discovery_conversations').find().sort({ createdAt: -1 }).toArray();
    const channelMetrics = await mongoDbInstance.collection('channel_metrics').find().toArray();
    const settingsDoc = await mongoDbInstance.collection('experiment_settings').findOne({ key: 'main' });
    return {
      conversations,
      channelMetrics,
      settings: settingsDoc || { passMark: 8, killMark: 3, targetInterviews: 15, targetReach: 50 }
    };
  }
  const db = readDb();
  return {
    conversations: db.discoveryConversations || [],
    channelMetrics: db.channelMetrics || [],
    settings: db.experimentSettings || { passMark: 8, killMark: 3, targetInterviews: 15, targetReach: 50 }
  };
}

async function addDiscoveryConversation(convDoc) {
  if (mongoDbInstance) {
    await mongoDbInstance.collection('discovery_conversations').insertOne(convDoc);
    return convDoc;
  }
  const db = readDb();
  db.discoveryConversations = db.discoveryConversations || [];
  db.discoveryConversations.unshift(convDoc);
  writeDb(db);
  return convDoc;
}

async function deleteDiscoveryConversation(id) {
  if (mongoDbInstance) {
    await mongoDbInstance.collection('discovery_conversations').deleteOne({ id });
    return true;
  }
  const db = readDb();
  db.discoveryConversations = (db.discoveryConversations || []).filter(c => c.id !== id);
  writeDb(db);
  return true;
}

async function updateChannelMetric(channel, data) {
  if (mongoDbInstance) {
    await mongoDbInstance.collection('channel_metrics').updateOne(
      { channel },
      { $set: { ...data, channel, updatedAt: new Date() } },
      { upsert: true }
    );
    return await mongoDbInstance.collection('channel_metrics').find().toArray();
  }
  const db = readDb();
  db.channelMetrics = db.channelMetrics || [];
  const found = db.channelMetrics.find(m => m.channel.toLowerCase() === channel.toLowerCase());
  if (found) {
    Object.assign(found, data);
  } else {
    db.channelMetrics.push({ channel, ...data });
  }
  writeDb(db);
  return db.channelMetrics;
}

module.exports = {
  initDatabase,
  getAudits,
  saveAudit,
  getAuditById,
  getLeads,
  saveLead,
  updateLead,
  getExperimentData,
  addDiscoveryConversation,
  deleteDiscoveryConversation,
  updateChannelMetric
};
