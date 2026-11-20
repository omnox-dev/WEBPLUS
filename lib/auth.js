const crypto = require('crypto');
const { readDb, writeDb } = require('./storage');

// In-memory or persistent sessions
const activeSessions = new Map();

function hashPassword(password, existingSalt = null) {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const newHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'));
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function registerUser(name, email, password) {
  const db = readDb();
  db.users = db.users || [];

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.users.find(u => u.email === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const { hash, salt } = hashPassword(password);
  const newUser = {
    id: 'user-' + Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hash,
    salt: salt,
    role: db.users.length === 0 ? 'admin' : 'user', // first user is admin
    audits: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);

  const token = generateToken();
  activeSessions.set(token, {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    createdAt: Date.now()
  });

  return {
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    token
  };
}

function authenticateUser(email, password) {
  const db = readDb();
  db.users = db.users || [];

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email === normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  const token = generateToken();
  activeSessions.set(token, {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: Date.now()
  });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token
  };
}

function getSessionUser(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  // Session lasts 7 days
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - session.createdAt > sevenDays) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

function revokeSession(token) {
  if (token) activeSessions.delete(token);
}

// Middleware to protect routes
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in or create an account to run website audits.',
      requiresAuth: true
    });
  }

  req.user = user;
  next();
}

// Optional Auth (for public routes that can be enhanced with user data)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  req.user = getSessionUser(token);
  next();
}

module.exports = {
  registerUser,
  authenticateUser,
  getSessionUser,
  revokeSession,
  requireAuth,
  optionalAuth
};
