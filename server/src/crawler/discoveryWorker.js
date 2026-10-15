import { chromium } from 'playwright';
import { runFullProbePipeline, probeDNS } from '../measurements/probeWorker.js';

/**
 * Resource Discovery & Dependency Graph Builder
 * Uses Playwright CDP trace when available, with resilient HTTP HTML fallback parser.
 */

export async function discoverAndMeasureDependencies(targetUrl, options = {}) {
  const timeoutSec = options.timeout || 15;
  const mode = options.mode || 'both'; // 'both', 'ipv6', 'ipv4'
  const maxResources = options.maxResources || 60;

  const discoveredRaw = [];
  let browserEngine = 'Playwright Chromium';
  let browserObserved = false;

  // 1. Try Playwright browser automation
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 IPv6Auditor/1.0',
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    // Listen to network events
    page.on('request', (req) => {
      if (discoveredRaw.length < maxResources) {
        discoveredRaw.push({
          url: req.url(),
          type: normalizeResourceType(req.resourceType()),
          initiator: req.initiator()?.url || targetUrl,
          method: req.method(),
          headers: req.headers()
        });
      }
    });

    page.on('response', (res) => {
      const match = discoveredRaw.find(r => r.url === res.url());
      if (match) {
        match.statusCode = res.status();
        match.remoteAddress = res.serverAddr()?.ipAddress || null;
        match.fromServiceWorker = res.fromServiceWorker();
        match.protocol = res.headerValue('x-firefox-spdy') || 'h2';
      }
    });

    page.on('requestfailed', (req) => {
      const match = discoveredRaw.find(r => r.url === req.url());
      if (match) {
        match.failureText = req.failure()?.errorText || 'REQUEST_FAILED';
      }
    });

    // Navigate to page
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutSec * 1000
    });

    // Wait slightly for dynamic lazy scripts
    await page.waitForTimeout(1500);
    await browser.close();
    browserObserved = true;
  } catch (err) {
    // Playwright failed (e.g. driver missing on host) -> fallback to active HTTP parser
    browserEngine = 'Resilient HTTP Stream Parser (Playwright binary fallback)';
    const parsed = await fallbackHtmlDiscovery(targetUrl, timeoutSec);
    discoveredRaw.push(...parsed);
  }

  // Ensure root URL is present as first element
  if (!discoveredRaw.some(r => r.url === targetUrl)) {
    discoveredRaw.unshift({
      url: targetUrl,
      type: 'html',
      initiator: 'Main Document',
      statusCode: 200
    });
  }

  // 2. Deduplicate resources by URL while preserving unique request entries
  const uniqueResourcesMap = new Map();
  for (const item of discoveredRaw) {
    if (!uniqueResourcesMap.has(item.url)) {
      uniqueResourcesMap.set(item.url, item);
    }
  }

  const uniqueList = Array.from(uniqueResourcesMap.values()).slice(0, maxResources);

  // 3. Measure & Classify each discovered hostname via low-level socket probe
  const hostnameCache = new Map();
  const measuredResources = [];

  for (let i = 0; i < uniqueList.length; i++) {
    const item = uniqueList[i];
    let domain = 'unknown';
    try {
      domain = new URL(item.url).hostname;
    } catch {
      continue;
    }

    // Measure host if not already in cache
    let hostProbeResult = hostnameCache.get(domain);
    if (!hostProbeResult) {
      // Run forced IPv6 probe
      const v6Run = await runFullProbePipeline(item.url, 6, 6);
      // Run forced IPv4 control probe
      const v4Run = await runFullProbePipeline(item.url, 4, 6);

      hostProbeResult = {
        v6: v6Run,
        v4: v4Run,
        dns: v6Run.dns
      };
      hostnameCache.set(domain, hostProbeResult);
    }

    // Determine protocol reachability verdict
    const v6Pass = hostProbeResult.v6.firstFailingStage === null;
    const v4Pass = hostProbeResult.v4.firstFailingStage === null;
    const hasV6Address = (hostProbeResult.dns?.ipv6?.addresses?.length || 0) > 0;
    const hasV4Address = (hostProbeResult.dns?.ipv4?.addresses?.length || 0) > 0;

    let protocolStatus = 'DEGRADED';
    let failureClass = hostProbeResult.v6.failureClass;
    let firstFailingStage = hostProbeResult.v6.firstFailingStage;

    if (v6Pass && v4Pass) {
      protocolStatus = 'DUAL_STACK';
      failureClass = 'IPV6_OK';
    } else if (v4Pass && !hasV6Address) {
      protocolStatus = 'IPV4_ONLY';
      failureClass = 'NO_AAAA';
      firstFailingStage = 'DNS';
    } else if (v4Pass && !v6Pass) {
      protocolStatus = 'DEGRADED';
    } else if (!v4Pass && !v6Pass) {
      protocolStatus = 'FAILED';
    }

    const ttfb = hostProbeResult.v6.http?.ttfbMs || hostProbeResult.v4.http?.ttfbMs || 0;

    measuredResources.push({
      id: `res-${i + 1}`,
      url: item.url,
      type: item.type || 'fetch',
      domain,
      initiator: item.initiator || targetUrl,
      ipv4: hostProbeResult.dns?.ipv4?.addresses?.[0] || null,
      ipv6: hostProbeResult.dns?.ipv6?.addresses?.[0] || null,
      protocolStatus,
      v4Result: v4Pass ? 'SUCCESS' : 'FAIL',
      v6Result: v6Pass ? 'SUCCESS' : 'FAIL',
      firstFailingStage,
      failureClass,
      ttfbMs: ttfb,
      sizeBytes: hostProbeResult.v6.http?.sizeBytes || 0,
      statusCode: item.statusCode || hostProbeResult.v6.http?.statusCode || 200,
      dnsTiming: hostProbeResult.dns?.ipv6?.latencyMs || 10,
      tcpTiming: hostProbeResult.v6.tcp?.latencyMs || 0,
      tlsTiming: hostProbeResult.v6.tls?.latencyMs || 0,
      httpTiming: hostProbeResult.v6.http?.ttfbMs || 0,
      evidence: hostProbeResult.v6.evidence || hostProbeResult.v4.evidence,
      confidence: browserObserved ? 'HIGH_CDP_AND_SOCKET_EVIDENCE' : 'HIGH_SOCKET_PROBE_EVIDENCE'
    });
  }

  // 4. Construct React Flow Dependency Graph (Nodes & Edges)
  const graph = buildReactFlowGraph(measuredResources, targetUrl);

  return {
    browserEngine,
    browserObserved,
    resources: measuredResources,
    graph
  };
}

/**
 * Fallback HTML parser that extracts sub-resources when Playwright binary is not present
 */
async function fallbackHtmlDiscovery(targetUrl, timeoutSec) {
  const list = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutSec * 1000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPv6Auditor-PS027/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timer);

    const html = await res.text();
    list.push({
      url: targetUrl,
      type: 'html',
      initiator: 'Main Document',
      statusCode: res.status
    });

    // Extract script tags
    const scriptRegex = /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*?>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      const fullUrl = safeResolveUrl(match[1], targetUrl);
      if (fullUrl) list.push({ url: fullUrl, type: 'script', initiator: targetUrl });
    }

    // Extract stylesheet links
    const cssRegex = /<link\b[^>]*?\bhref=["']([^"']+)["'][^>]*?>/gi;
    while ((match = cssRegex.exec(html)) !== null) {
      if (/rel=["']stylesheet["']/i.test(match[0])) {
        const fullUrl = safeResolveUrl(match[1], targetUrl);
        if (fullUrl) list.push({ url: fullUrl, type: 'stylesheet', initiator: targetUrl });
      }
    }

    // Extract images
    const imgRegex = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*?>/gi;
    let imgCount = 0;
    while ((match = imgRegex.exec(html)) !== null && imgCount < 10) {
      const fullUrl = safeResolveUrl(match[1], targetUrl);
      if (fullUrl && !fullUrl.startsWith('data:')) {
        list.push({ url: fullUrl, type: 'image', initiator: targetUrl });
        imgCount++;
      }
    }
  } catch (err) {
    // If main URL fails, return minimal record
    list.push({
      url: targetUrl,
      type: 'html',
      initiator: 'Main Document',
      statusCode: 0
    });
  }
  return list;
}

function safeResolveUrl(relative, base) {
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

function normalizeResourceType(type) {
  switch (type?.toLowerCase()) {
    case 'document':
      return 'html';
    case 'stylesheet':
      return 'stylesheet';
    case 'script':
      return 'script';
    case 'image':
      return 'image';
    case 'font':
      return 'font';
    case 'xhr':
    case 'fetch':
      return 'fetch';
    default:
      return 'fetch';
  }
}

/**
 * Builds React Flow layout nodes and directed edges
 */
function buildReactFlowGraph(resources, rootUrl) {
  const nodes = [];
  const edges = [];

  const rootResource = resources.find(r => r.url === rootUrl) || resources[0];

  // Root Node
  if (rootResource) {
    nodes.push({
      id: rootResource.id,
      type: 'customResource',
      position: { x: 400, y: 30 },
      data: {
        label: rootResource.url,
        type: 'html',
        domain: rootResource.domain,
        status: rootResource.failureClass === 'IPV6_OK' ? 'READY' : 'FAIL',
        failureClass: rootResource.failureClass,
        protocol: rootResource.protocolStatus,
        ipv4: rootResource.ipv4,
        ipv6: rootResource.ipv6,
        isRoot: true,
        size: `${Math.round(rootResource.sizeBytes / 1024)} KB`,
        ttfb: `${rootResource.ttfbMs} ms`,
        timing: {
          dns: rootResource.dnsTiming,
          tcp: rootResource.tcpTiming,
          tls: rootResource.tlsTiming,
          http: rootResource.httpTiming
        }
      }
    });
  }

  // Position sub-nodes in structured grid rows
  const subResources = resources.filter(r => r !== rootResource);
  const itemsPerRow = 4;
  const colWidth = 280;
  const rowHeight = 160;

  subResources.forEach((res, index) => {
    const col = index % itemsPerRow;
    const row = Math.floor(index / itemsPerRow) + 1;

    const x = 50 + col * colWidth;
    const y = 50 + row * rowHeight;

    nodes.push({
      id: res.id,
      type: 'customResource',
      position: { x, y },
      data: {
        label: res.url.split('/').pop() || res.url,
        type: res.type,
        domain: res.domain,
        status: res.failureClass === 'IPV6_OK' ? 'READY' : (res.failureClass?.includes('TIMEOUT') ? 'WARNING' : 'FAIL'),
        failureClass: res.failureClass,
        protocol: res.protocolStatus,
        ipv4: res.ipv4,
        ipv6: res.ipv6,
        size: res.sizeBytes > 0 ? `${Math.round(res.sizeBytes / 1024)} KB` : '0 KB',
        ttfb: `${res.ttfbMs} ms`,
        timing: {
          dns: res.dnsTiming,
          tcp: res.tcpTiming,
          tls: res.tlsTiming,
          http: res.httpTiming
        }
      }
    });

    // Directed Edge from root or initiator
    const isSuccess = res.failureClass === 'IPV6_OK';
    edges.push({
      id: `e-${rootResource?.id || 'root'}-${res.id}`,
      source: rootResource?.id || 'res-1',
      target: res.id,
      animated: !isSuccess,
      style: {
        stroke: isSuccess ? '#10b981' : '#f43f5e',
        strokeWidth: 2,
        strokeDasharray: isSuccess ? undefined : '4 4'
      }
    });
  });

  return { nodes, edges };
}
