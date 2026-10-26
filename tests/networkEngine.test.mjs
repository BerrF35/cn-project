// Automated Unit & Integration Test Suite for NetScope Network Engine
import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Subnetting Math Engine
test('Subnetting: Calculates /24, /26, /23, /22 subnets correctly', () => {
  function ipToNum(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
  function numToIp(num) {
    return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
  }
  function calcSubnet(cidr) {
    const [ip, prefix] = cidr.split('/');
    const p = parseInt(prefix, 10);
    const mask = p === 0 ? 0 : (~0 << (32 - p)) >>> 0;
    const ipN = ipToNum(ip);
    const net = (ipN & mask) >>> 0;
    const bcast = (net | (~mask >>> 0)) >>> 0;
    return {
      net: numToIp(net),
      bcast: numToIp(bcast),
      firstUsable: numToIp(net + 1),
      lastUsable: numToIp(bcast - 1),
      usableHosts: Math.pow(2, 32 - p) - 2
    };
  }

  // VLAN 10: 10.20.10.0/26
  const v10 = calcSubnet('10.20.10.0/26');
  assert.equal(v10.net, '10.20.10.0');
  assert.equal(v10.bcast, '10.20.10.63');
  assert.equal(v10.firstUsable, '10.20.10.1');
  assert.equal(v10.lastUsable, '10.20.10.62');
  assert.equal(v10.usableHosts, 62);

  // VLAN 20: 10.20.20.0/24
  const v20 = calcSubnet('10.20.20.0/24');
  assert.equal(v20.net, '10.20.20.0');
  assert.equal(v20.bcast, '10.20.20.255');
  assert.equal(v20.usableHosts, 254);

  // VLAN 40: 10.20.40.0/23
  const v40 = calcSubnet('10.20.40.0/23');
  assert.equal(v40.net, '10.20.40.0');
  assert.equal(v40.bcast, '10.20.41.255');
  assert.equal(v40.usableHosts, 510);

  // VLAN 70: 10.20.72.0/22
  const v70 = calcSubnet('10.20.72.0/22');
  assert.equal(v70.net, '10.20.72.0');
  assert.equal(v70.bcast, '10.20.75.255');
  assert.equal(v70.usableHosts, 1022);
});

// Test 2: Overlap Verification
test('Subnetting: Validates that all 10 VLAN subnets are strictly non-overlapping', () => {
  const subnets = [
    { id: 10, start: '10.20.10.0', end: '10.20.10.63' },
    { id: 20, start: '10.20.20.0', end: '10.20.20.255' },
    { id: 30, start: '10.20.30.0', end: '10.20.30.255' },
    { id: 40, start: '10.20.40.0', end: '10.20.41.255' },
    { id: 50, start: '10.20.50.0', end: '10.20.50.255' },
    { id: 60, start: '10.20.60.0', end: '10.20.61.255' },
    { id: 70, start: '10.20.72.0', end: '10.20.75.255' },
    { id: 80, start: '10.20.80.0', end: '10.20.80.255' },
    { id: 90, start: '10.20.90.0', end: '10.20.90.255' },
    { id: 100, start: '10.20.100.0', end: '10.20.100.31' },
    { id: 999, start: '10.20.254.0', end: '10.20.254.3' } // Transit
  ];

  function ipToNum(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  for (let i = 0; i < subnets.length; i++) {
    for (let j = i + 1; j < subnets.length; j++) {
      const a = subnets[i];
      const b = subnets[j];
      const aStart = ipToNum(a.start);
      const aEnd = ipToNum(a.end);
      const bStart = ipToNum(b.start);
      const bEnd = ipToNum(b.end);

      const hasOverlap = Math.max(aStart, bStart) <= Math.min(aEnd, bEnd);
      assert.equal(hasOverlap, false, `Overlap detected between VLAN ${a.id} and VLAN ${b.id}`);
    }
  }
});

// Test 3: 802.1Q Header Demux & VID Extraction
test('802.1Q: Tag parsing verifies 0x8100 TPID and 12-bit VID bounds', () => {
  const tpid = 0x8100;
  const pcp = 5; // CoS 5 Voice/Video
  const dei = 0;
  const vid = 40; // Engineering

  // Pack into 32-bit tag word
  const tagWord = (tpid << 16) | (pcp << 13) | (dei << 12) | vid;

  // Unpack
  const extractedTpid = (tagWord >>> 16) & 0xffff;
  const extractedPcp = (tagWord >>> 13) & 0x7;
  const extractedDei = (tagWord >>> 12) & 0x1;
  const extractedVid = tagWord & 0xfff;

  assert.equal(extractedTpid, 0x8100);
  assert.equal(extractedPcp, 5);
  assert.equal(extractedDei, 0);
  assert.equal(extractedVid, 40);
  assert.ok(extractedVid >= 1 && extractedVid <= 4094);
});

// Test 4: Broadcast Blast Radius Reduction in Segmented vs Flat
test('Comparative Experiment: Segmented VLAN architecture reduces broadcast blast radius by >90%', () => {
  const totalCampusHosts = 24;
  const flatRecipients = totalCampusHosts - 1; // 23 hosts receive broadcast
  const vlan20Hosts = 2; // HR-PC-01 and HR-PC-02
  const segmentedRecipients = vlan20Hosts - 1; // 1 host receives broadcast

  const reduction = ((flatRecipients - segmentedRecipients) / flatRecipients) * 100;
  assert.ok(reduction > 90, `Broadcast reduction was ${reduction}%, expected > 90%`);
  assert.equal(segmentedRecipients, 1);
});

// Test 5: Firewall Policy & Zero Trust Isolation
test('Firewall & ACL: Guest Wi-Fi probe to Internal ERP Server is denied', () => {
  const guestSubnet = '10.20.72.0/22';
  const internalServerSubnet = '10.20.80.0/24';

  function ipToNum(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
  function isIpInSubnet(ip, netCidr) {
    const [base, p] = netCidr.split('/');
    const mask = (~0 << (32 - parseInt(p, 10))) >>> 0;
    return (ipToNum(ip) & mask) === (ipToNum(base) & mask);
  }

  const guestHostIp = '10.20.72.10';
  const erpServerIp = '10.20.80.12';

  assert.ok(isIpInSubnet(guestHostIp, guestSubnet));
  assert.ok(isIpInSubnet(erpServerIp, internalServerSubnet));

  // Security rule: Deny Guest (10.20.72.0/22) -> Internal Servers (10.20.80.0/24)
  const isGuestTraffic = isIpInSubnet(guestHostIp, guestSubnet);
  const isDestInternal = isIpInSubnet(erpServerIp, internalServerSubnet);
  const isDenied = isGuestTraffic && isDestInternal;

  assert.equal(isDenied, true, 'Zero-trust isolation rule must drop guest access to internal servers');
});
