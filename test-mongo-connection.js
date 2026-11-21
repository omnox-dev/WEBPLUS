// MongoDB Atlas Connection Diagnostics
const path = require('path');
const fs = require('fs');

try {
  process.loadEnvFile();
} catch (e) {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        process.env[k.trim()] = v.join('=').replace(/^["']|["']$/g, '').trim();
      }
    });
  } catch (err) {}
}

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

console.log('--- TESTING MONGODB ATLAS CONNECTION ---');
console.log('URI provided:', uri ? uri.replace(/:([^@]+)@/, ':****@') : 'NONE');

// Check 1: Is mongodb package installed?
let MongoClient;
try {
  MongoClient = require('mongodb').MongoClient;
  console.log('✓ "mongodb" npm driver is installed in node_modules.');
} catch (err) {
  console.log('✕ FAIL: "mongodb" package is NOT installed in node_modules.');
  console.log('  Reason:', err.message);
  console.log('\n--> SOLUTION: Run "npm install mongodb"\n');
  process.exit(1);
}

// Check 2: Test network connection to Atlas
async function testConnect() {
  console.log('Attempting network handshake with MongoDB Atlas...');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    console.log('✓ SUCCESS: Handshake verified! Connected to Atlas cluster.');
    const dbs = await client.db().admin().listDatabases();
    console.log('✓ Available Databases in cluster:', dbs.databases.map(d => d.name).join(', '));
    await client.close();
  } catch (err) {
    console.log('✕ CONNECTION FAILED with Atlas:');
    console.log('  Error Name:', err.name);
    console.log('  Error Message:', err.message);

    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.log('\n--> ROOT CAUSE: Incorrect Username or Password.');
      console.log('    Check MongoDB Atlas -> Database Access -> Database Users.');
    } else if (err.message.includes('querySrv') || err.message.includes('ENOTFOUND')) {
      console.log('\n--> ROOT CAUSE: Cluster domain not found (DNS error).');
      console.log('    Check that "cluster0.9kbg7ga.mongodb.net" is spelled correctly.');
    } else if (err.message.includes('Server selection timed out') || err.message.includes('ETIMEDOUT') || err.name === 'MongoServerSelectionError') {
      console.log('\n--> ROOT CAUSE: IP Whitelist Block in MongoDB Atlas (Network Access).');
      console.log('    By default, MongoDB Atlas BLOCKS all IPs until you add 0.0.0.0/0.');
      console.log('    HOW TO FIX IN 30 SECONDS:');
      console.log('    1. Open cloud.mongodb.com');
      console.log('    2. Go to "Network Access" in the left sidebar');
      console.log('    3. Click "Add IP Address"');
      console.log('    4. Click "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0)');
      console.log('    5. Click "Confirm"');
    }
  }
}

testConnect();
