// IPv4 Subnetting and Address Allocation Engine for NetScope

export interface SubnetDetails {
  cidr: string; // e.g. "10.20.20.0/24"
  ip: string; // "10.20.20.0"
  prefixLength: number; // 24
  netmask: string; // "255.255.255.0"
  wildcardMask: string; // "0.0.0.255"
  networkAddress: string; // "10.20.20.0"
  broadcastAddress: string; // "10.20.20.255"
  firstUsableIp: string; // "10.20.20.1"
  lastUsableIp: string; // "10.20.20.254"
  totalAddresses: number; // 256
  usableHosts: number; // 254
  binaryMask: string; // "11111111.11111111.11111111.00000000"
}

export function ipToNumber(ip: string): number {
  const octets = ip.trim().split('.').map(Number);
  if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

export function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}

export function cidrToNetmask(prefixLength: number): string {
  if (prefixLength < 0 || prefixLength > 32) {
    throw new Error(`Invalid prefix length: ${prefixLength}`);
  }
  if (prefixLength === 0) return '0.0.0.0';
  const mask = (~0 << (32 - prefixLength)) >>> 0;
  return numberToIp(mask);
}

export function netmaskToCidr(netmask: string): number {
  const num = ipToNumber(netmask);
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((num >>> i) & 1) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function calculateSubnet(cidrNotation: string): SubnetDetails {
  const [baseIp, prefixStr] = cidrNotation.trim().split('/');
  const prefixLength = parseInt(prefixStr, 10);
  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    throw new Error(`Invalid CIDR prefix in ${cidrNotation}`);
  }

  const ipNum = ipToNumber(baseIp);
  const maskNum = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
  const wildcardNum = (~maskNum) >>> 0;

  const networkNum = (ipNum & maskNum) >>> 0;
  const broadcastNum = (networkNum | wildcardNum) >>> 0;

  const totalAddresses = Math.pow(2, 32 - prefixLength);
  const usableHosts = prefixLength >= 31 ? (prefixLength === 31 ? 2 : 1) : totalAddresses - 2;

  const firstUsableNum = prefixLength >= 31 ? networkNum : networkNum + 1;
  const lastUsableNum = prefixLength >= 31 ? broadcastNum : broadcastNum - 1;

  const binaryMask = Array.from({ length: 4 }, (_, i) => {
    const shift = (3 - i) * 8;
    const octet = (maskNum >>> shift) & 255;
    return octet.toString(2).padStart(8, '0');
  }).join('.');

  return {
    cidr: `${numberToIp(networkNum)}/${prefixLength}`,
    ip: baseIp,
    prefixLength,
    netmask: numberToIp(maskNum),
    wildcardMask: numberToIp(wildcardNum),
    networkAddress: numberToIp(networkNum),
    broadcastAddress: numberToIp(broadcastNum),
    firstUsableIp: numberToIp(firstUsableNum),
    lastUsableIp: numberToIp(lastUsableNum),
    totalAddresses,
    usableHosts: Math.max(0, usableHosts),
    binaryMask
  };
}

export function isIpInSubnet(ip: string, networkAddress: string, prefixLength: number): boolean {
  try {
    const target = ipToNumber(ip);
    const net = ipToNumber(networkAddress);
    const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
    return (target & mask) === (net & mask);
  } catch {
    return false;
  }
}

export function validateSubnetOverlap(subnets: { id: number; name: string; cidr: string }[]): {
  hasOverlap: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const parsed = subnets.map(s => {
    try {
      const calc = calculateSubnet(s.cidr);
      return {
        ...s,
        start: ipToNumber(calc.networkAddress),
        end: ipToNumber(calc.broadcastAddress)
      };
    } catch (e: any) {
      errors.push(`VLAN ${s.id} (${s.name}): Invalid CIDR ${s.cidr} (${e.message})`);
      return null;
    }
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];
      // Check collision: [a.start, a.end] overlaps [b.start, b.end]
      if (Math.max(a.start, b.start) <= Math.min(a.end, b.end)) {
        errors.push(
          `Overlap conflict: VLAN ${a.id} (${a.name} [${a.cidr}]) overlaps with VLAN ${b.id} (${b.name} [${b.cidr}])`
        );
      }
    }
  }

  return {
    hasOverlap: errors.length > 0,
    errors
  };
}
