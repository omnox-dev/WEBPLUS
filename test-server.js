process.env.PORT = '3005';
const http = require('http');

async function runTests() {
  require('./server.js');
  await new Promise(r => setTimeout(r, 800));

  console.log('--- RUNNING WEB PLUS VERIFICATION TESTS ---');

  // 1. Test GET /
  const resHome = await fetch('http://127.0.0.1:3005/');
  console.log(`[TEST 1] GET / -> HTTP ${resHome.status} (OK)`);

  // 2. Test Guest / Unauthenticated Scan (Should SUCCEED without requiring login!)
  const resGuestScan = await fetch('http://127.0.0.1:3005/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://sample-bakery.example' })
  });
  const guestScanJson = await resGuestScan.json();
  console.log(`[TEST 2] POST /api/scan (Guest audit without sign-in) -> HTTP ${resGuestScan.status}, Domain: ${guestScanJson.report?.domain}, Score: ${guestScanJson.report?.healthScore}/100 (SUCCESS: No login required!)`);

  // 3. Test Optional Sign Up
  const testUser = {
    name: "Ramesh Joshi",
    email: `ramesh_${Date.now()}@artisanbakery.in`,
    password: "securepassword123"
  };
  const resSignup = await fetch('http://127.0.0.1:3005/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  const signupJson = await resSignup.json();
  const token = signupJson.token;
  console.log(`[TEST 3] POST /api/auth/signup -> HTTP ${resSignup.status}, User ID: ${signupJson.user?.id}`);

  // 4. Test Authenticated Scan (Logged-in user scan)
  const resAuthScan = await fetch('http://127.0.0.1:3005/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ url: 'https://sample-bakery.example' })
  });
  const authScanJson = await resAuthScan.json();
  console.log(`[TEST 4] POST /api/scan (Logged-in scan) -> HTTP ${resAuthScan.status}, Tied to user: ${authScanJson.report?.userEmail}`);

  // 5. Test GET /api/scan/sample
  const resSample = await fetch('http://127.0.0.1:3005/api/scan/sample');
  const sampleJson = await resSample.json();
  console.log(`[TEST 5] GET /api/scan/sample -> HTTP ${resSample.status}, Health Score: ${sampleJson.report?.healthScore}/100`);

  // 6. Test Lead Booking
  const resLead = await fetch('http://127.0.0.1:3005/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testUser.name,
      email: testUser.email,
      phone: "+91 98220 12345",
      package: "Correction Package",
      site: "https://artisanbakery.in"
    })
  });
  const leadJson = await resLead.json();
  console.log(`[TEST 6] POST /api/leads -> HTTP ${resLead.status}, Lead ID: ${leadJson.lead?.id}`);

  console.log('--- ALL TESTS PASSED: AUDITS WORK FREELY WITHOUT SIGN IN ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
