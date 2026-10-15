import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * IP and URL Security Validator (SSRF and Address Range Protection)
 */

// Private & reserved IPv4 blocks (RFC 1918, RFC 3927, loopback, metadata)
const PRIVATE_IPV4_RANGES = [
  { start: ipToLong('127.0.0.0'), end: ipToLong('127.255.255.255') }, // Loopback
  { start: ipToLong('10.0.0.0'), end: ipToLong('10.255.255.255') },   // Class A private
  { start: ipToLong('172.16.0.0'), end: ipToLong('172.31.255.255') }, // Class B private
  { start: ipToLong('192.168.0.0'), end: ipToLong('192.168.255.255') },// Class C private
  { start: ipToLong('169.254.0.0'), end: ipToLong('169.254.255.255') },// Link-local / Cloud metadata (169.254.169.254)
  { start: ipToLong('0.0.0.0'), end: ipToLong('0.255.255.255') },     // Current network
  { start: ipToLong('224.0.0.0'), end: ipToLong('239.255.255.255') }, // Multicast
  { start: ipToLong('240.0.0.0'), end: ipToLong('255.255.255.255') }  // Reserved
];

function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Checks if an IPv4 address is in private, loopback, or metadata ranges
 */
export function isPrivateIPv4(ip) {
  if (!net.isIPv4(ip)) return false;
  const long = ipToLong(ip);
  return PRIVATE_IPV4_RANGES.some(range => long >= range.start && long <= range.end);
}

/**
 * Checks if an IPv6 address is loopback, unique local, or link-local
 */
export function isPrivateIPv6(ip) {
  if (!net.isIPv6(ip)) return false;
  const normalized = ip.toLowerCase();
  // Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // Link-local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  // Unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (normalized.includes('::ffff:')) {
    const v4 = normalized.split('::ffff:')[1];
    if (net.isIPv4(v4)) return isPrivateIPv4(v4);
  }
  return false;
}

/**
 * Validate target URL format and scheme
 */
export function validateUrlFormat(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'Target URL is required' };
  }

  const trimmed = urlString.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Malformed URL. Please include protocol (e.g. https://example.com)' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Invalid scheme "${parsed.protocol}". Only http: and https: are permitted.` };
  }

  if (!parsed.hostname || parsed.hostname.trim() === '') {
    return { valid: false, error: 'Target URL is missing a valid hostname.' };
  }

  return { valid: true, url: parsed.href, hostname: parsed.hostname, protocol: parsed.protocol };
}

/**
 * Comprehensive SSRF check: validates domain resolution to protect internal networks
 * @param {string} hostname
 * @param {boolean} allowControlledTestLocal - allows *.test.local for lab environment
 */
export async function validateHostSafety(hostname, allowControlledTestLocal = true) {
  // Check if it's an allowed controlled test domain
  if (allowControlledTestLocal && (hostname.endsWith('.test.local') || hostname === 'localhost.test')) {
    return { safe: true, isControlledTestDomain: true };
  }

  // Explicit forbidden hostnames
  const forbiddenHosts = ['localhost', '127.0.0.1', '::1', 'metadata.google.internal', 'instance-data'];
  if (forbiddenHosts.includes(hostname.toLowerCase())) {
    return { safe: false, error: `Host "${hostname}" is restricted (loopback / internal metadata).` };
  }

  // If hostname is directly an IP address
  if (net.isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { safe: false, error: `Direct IP ${hostname} is in a private or restricted network range.` };
    }
    return { safe: true, ip: hostname, family: 4 };
  }

  if (net.isIPv6(hostname)) {
    if (isPrivateIPv6(hostname)) {
      return { safe: false, error: `Direct IPv6 ${hostname} is in a private or link-local network range.` };
    }
    return { safe: true, ip: hostname, family: 6 };
  }

  // Resolve hostname in DNS to check actual destination addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, error: `DNS resolution failed for hostname "${hostname}".` };
    }

    for (const addr of addresses) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        return { safe: false, error: `Hostname "${hostname}" resolves to private IP ${addr.address} (SSRF protected).` };
      }
      if (addr.family === 6 && isPrivateIPv6(addr.address)) {
        return { safe: false, error: `Hostname "${hostname}" resolves to private/link-local IPv6 ${addr.address} (SSRF protected).` };
      }
    }

    return { safe: true, resolvedAddresses: addresses };
  } catch (err) {
    // Note: If DNS fails, we allow the audit to proceed so the DNS stage can record the exact DNS failure!
    return { safe: true, dnsUnresolved: true, resolutionError: err.message };
  }
}
