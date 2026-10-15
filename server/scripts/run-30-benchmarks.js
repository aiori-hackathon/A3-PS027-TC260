import { initDatabase, insertAudit } from '../src/db/database.js';
import { probeDNS } from '../src/measurements/probeWorker.js';

const THIRTY_BENCHMARK_SITES = [
  // 10 Indian Gov & Education
  { url: 'https://nic.in', category: 'Indian Gov / Edu' },
  { url: 'https://iitd.ac.in', category: 'Indian Gov / Edu' },
  { url: 'https://india.gov.in', category: 'Indian Gov / Edu' },
  { url: 'https://uidai.gov.in', category: 'Indian Gov / Edu' },
  { url: 'https://ugc.ac.in', category: 'Indian Gov / Edu' },
  { url: 'https://cbse.gov.in', category: 'Indian Gov / Edu' },
  { url: 'https://meity.gov.in', category: 'Indian Gov / Edu' },
  { url: 'https://aiims.edu', category: 'Indian Gov / Edu' },
  { url: 'https://iisc.ac.in', category: 'Indian Gov / Edu' },
  { url: 'https://delhi.gov.in', category: 'Indian Gov / Edu' },

  // 10 Popular Global Sites
  { url: 'https://google.com', category: 'Global Tech' },
  { url: 'https://cloudflare.com', category: 'Global Tech' },
  { url: 'https://wikipedia.org', category: 'Global Tech' },
  { url: 'https://github.com', category: 'Global Tech' },
  { url: 'https://microsoft.com', category: 'Global Tech' },
  { url: 'https://apple.com', category: 'Global Tech' },
  { url: 'https://amazon.com', category: 'Global Tech' },
  { url: 'https://meta.com', category: 'Global Tech' },
  { url: 'https://mozilla.org', category: 'Global Tech' },
  { url: 'https://ietf.org', category: 'Global Tech' },

  // 10 Commercial / 3rd Party Heavy
  { url: 'https://cnn.com', category: 'Commercial / 3rd Party' },
  { url: 'https://flipkart.com', category: 'Commercial / 3rd Party' },
  { url: 'https://nytimes.com', category: 'Commercial / 3rd Party' },
  { url: 'https://bbc.com', category: 'Commercial / 3rd Party' },
  { url: 'https://espn.com', category: 'Commercial / 3rd Party' },
  { url: 'https://reddit.com', category: 'Commercial / 3rd Party' },
  { url: 'https://thehindu.com', category: 'Commercial / 3rd Party' },
  { url: 'https://ndtv.com', category: 'Commercial / 3rd Party' },
  { url: 'https://hotstar.com', category: 'Commercial / 3rd Party' },
  { url: 'https://zomato.com', category: 'Commercial / 3rd Party' }
];

async function runCampaign() {
  console.log('============================================================');
  console.log(' AIORI Hackathon 3: 30-Site Evaluation Campaign (PS-027)');
  console.log('============================================================\n');

  await initDatabase();

  let readyCount = 0;
  let noAaaaCount = 0;

  for (let i = 0; i < THIRTY_BENCHMARK_SITES.length; i++) {
    const site = THIRTY_BENCHMARK_SITES[i];
    const hostname = new URL(site.url).hostname;
    process.stdout.write(`[${i + 1}/30] Testing ${hostname}... `);

    try {
      const dnsRes = await probeDNS(hostname, 3000);
      const hasV4 = (dnsRes.ipv4.addresses || []).length > 0;
      const hasV6 = (dnsRes.ipv6.addresses || []).length > 0;

      if (hasV6) readyCount++;
      else noAaaaCount++;

      const status = hasV6 ? 'PASS (AAAA present)' : 'NO_AAAA (IPv4-only Apex)';
      console.log(`v4: ${hasV4 ? 'OK' : 'FAIL'} | v6: ${status}`);
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Campaign Summary:`);
  console.log(`  Total Sites Probed: 30`);
  console.log(`  Sites with Apex AAAA: ${readyCount} (${Math.round((readyCount / 30) * 100)}%)`);
  console.log(`  Sites Lacking AAAA (IPv4 Only): ${noAaaaCount} (${Math.round((noAaaaCount / 30) * 100)}%)`);
  console.log('============================================================');
}

runCampaign();
