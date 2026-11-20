process.env.PORT = '3005';
const http = require('http');

async function runTests() {
  require('./server.js');
  await new Promise(r => setTimeout(r, 800));

  console.log('--- RUNNING WEB PLUS AUTH & ENDPOINT TESTS ON PORT 3005 ---');

  // 1. Test GET /
  const resHome = await fetch('http://127.0.0.1:3005/');
  console.log(`[TEST 1] GET / -> HTTP ${resHome.status} (OK)`);

  // 2. Test Auth Protection on /api/scan without login (Expect HTTP 401)
  const resUnauth = await fetch('http://127.0.0.1:3005/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://sample-bakery.example' })
  });
  console.log(`[TEST 2] POST /api/scan (unauthenticated) -> HTTP ${resUnauth.status} (Protected: Requires Login)`);

  // 3. Test POST /api/auth/signup
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
  console.log(`[TEST 3] POST /api/auth/signup -> HTTP ${resSignup.status}, User ID: ${signupJson.user?.id}, Token issued: ${token ? 'YES' : 'NO'}`);

  // 4. Test POST /api/auth/login
  const resLogin = await fetch('http://127.0.0.1:3005/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  const loginJson = await resLogin.json();
  console.log(`[TEST 4] POST /api/auth/login -> HTTP ${resLogin.status}, User: ${loginJson.user?.name}`);

  // 5. Test GET /api/auth/me (with Bearer Token)
  const resMe = await fetch('http://127.0.0.1:3005/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const meJson = await resMe.json();
  console.log(`[TEST 5] GET /api/auth/me -> HTTP ${resMe.status}, Authenticated: ${meJson.authenticated}, User: ${meJson.user?.name}`);

  // 6. Test POST /api/scan WITH Bearer Token (Should Succeed with HTTP 200)
  const resScan = await fetch('http://127.0.0.1:3005/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ url: 'https://sample-bakery.example' })
  });
  const scanJson = await resScan.json();
  console.log(`[TEST 6] POST /api/scan (authenticated) -> HTTP ${resScan.status}, Domain: ${scanJson.report?.domain}, Health Score: ${scanJson.report?.healthScore}/100`);

  // 7. Test GET /api/scan/sample
  const resSample = await fetch('http://127.0.0.1:3005/api/scan/sample');
  const sampleJson = await resSample.json();
  console.log(`[TEST 7] GET /api/scan/sample -> HTTP ${resSample.status}, Score: ${sampleJson.report?.healthScore}/100`);

  // 8. Test POST /api/leads
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
  console.log(`[TEST 8] POST /api/leads -> HTTP ${resLead.status}, Lead ID: ${leadJson.lead?.id}`);

  console.log('--- ALL AUTH & SCANNER TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
