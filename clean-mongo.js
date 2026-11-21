// Clean all sample/demo data from MongoDB Atlas collections
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

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

async function cleanCollections() {
  console.log('Connecting to MongoDB Atlas to remove sample data...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('webplus');

    const collections = ['users', 'audits', 'leads', 'discovery_conversations', 'channel_metrics'];

    for (const colName of collections) {
      const res = await db.collection(colName).deleteMany({});
      console.log(`✓ Cleared collection "${colName}" (deleted ${res.deletedCount} sample documents)`);
    }

    console.log('\n====================================================');
    console.log('  SUCCESS: All sample/demo data has been removed!');
    console.log('  Your collections are now completely clean and ready');
    console.log('  for real users, real audits, and real leads.');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Error cleaning collections:', err.message);
  } finally {
    await client.close();
  }
}

cleanCollections();
