import { validateUrlFormat, isPrivateIPv4, isPrivateIPv6, validateHostSafety } from '../src/security/urlValidator.js';
import { probeDNS, probeTCP } from '../src/measurements/probeWorker.js';
import { initDatabase, getAllAudits, getAuditById } from '../src/db/database.js';
import { seedInitialDataIfEmpty } from '../src/db/seedData.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('============================================================');
  console.log(' Running Backend Automated Test Suite (PS-027)');
  console.log('============================================================\n');

  // Test 1: URL Validation & Scheme Restrictions
  console.log('1. URL Validation & Scheme Restrictions:');
  const validUrl = validateUrlFormat('https://nic.in');
  assert(validUrl.valid === true && validUrl.hostname === 'nic.in', 'Valid HTTPS URL accepted');

  const invalidScheme = validateUrlFormat('ftp://example.com/file');
  assert(invalidScheme.valid === false, 'Non-HTTP/HTTPS schemes rejected');

  const emptyUrl = validateUrlFormat('');
  assert(emptyUrl.valid === false, 'Empty URL input rejected');

  // Test 2: SSRF Protections & Address Range Checks
  console.log('\n2. SSRF Protections & IP Range Filtering:');
  assert(isPrivateIPv4('127.0.0.1') === true, 'Loopback 127.0.0.1 flagged as private');
  assert(isPrivateIPv4('10.0.0.1') === true, 'RFC 1918 10.0.0.0/8 flagged as private');
  assert(isPrivateIPv4('192.168.1.1') === true, 'RFC 1918 192.168.0.0/16 flagged as private');
  assert(isPrivateIPv4('169.254.169.254') === true, 'Cloud Metadata 169.254.169.254 blocked');
  assert(isPrivateIPv4('8.8.8.8') === false, 'Public IP 8.8.8.8 allowed');

  assert(isPrivateIPv6('::1') === true, 'IPv6 loopback ::1 blocked');
  assert(isPrivateIPv6('fe80::1') === true, 'IPv6 link-local fe80::/10 blocked');
  assert(isPrivateIPv6('fc00::1') === true, 'IPv6 unique local fc00::/7 blocked');

  const ssrfCheck = await validateHostSafety('127.0.0.1');
  assert(ssrfCheck.safe === false, 'Direct 127.0.0.1 host rejected by safety validator');

  const publicSafety = await validateHostSafety('cloudflare.com');
  assert(publicSafety.safe === true, 'Public domain cloudflare.com allowed');

  // Test 3: Low-Level DNS Probes
  console.log('\n3. DNS Probe Isolation (A vs AAAA):');
  const dnsRes = await probeDNS('google.com');
  assert(dnsRes.ipv4.addresses.length > 0, 'IPv4 A records resolved for google.com');
  assert(dnsRes.ipv6.addresses.length > 0, 'IPv6 AAAA records resolved for google.com');

  const githubDns = await probeDNS('github.com');
  assert(githubDns.ipv4.addresses.length > 0, 'IPv4 A records resolved for github.com');
  assert(githubDns.ipv6.status === 'NO_AAAA', 'GitHub correctly detected as having NO_AAAA record');

  // Test 4: Database Persistence & Seeder
  console.log('\n4. Database Initialization & Seeding:');
  await initDatabase();
  seedInitialDataIfEmpty();
  const audits = getAllAudits(10);
  assert(audits.length >= 10, 'Initial benchmark audits successfully stored in SQLite');

  const nicAudit = getAuditById('audit-ind-01');
  assert(nicAudit !== null && nicAudit.url === 'https://nic.in', 'Retrieved seeded audit audit-ind-01 from SQLite');

  // Summary
  console.log('\n============================================================');
  console.log(` Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner encountered an error:', err);
  process.exit(1);
});
