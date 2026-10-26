// Canonical Network State Type Definitions for NetScope

export type DeviceType = 
  | 'l2_switch'
  | 'l3_core'
  | 'firewall'
  | 'server'
  | 'workstation'
  | 'laptop'
  | 'printer'
  | 'iot'
  | 'access_point'
  | 'cloud_router';

export type PortMode = 'access' | 'trunk' | 'routed';
export type InterfaceAdminStatus = 'up' | 'down';
export type ProtocolType = 
  | 'ARP'
  | 'ICMP_PING'
  | 'TCP_SYN'
  | 'HTTP_GET'
  | 'DHCP_DISCOVER'
  | 'DNS_QUERY'
  | 'EXTERNAL_NAT';

export interface InterfaceLinkTarget {
  deviceId: string;
  interfaceId: string;
}

export interface NetworkInterface {
  id: string; // e.g. "Fa0/1", "Gi0/1", "eth0"
  name: string;
  macAddress: string;
  ipAddress?: string; // For routed interfaces / host endpoints
  subnetMask?: string;
  mode: PortMode; // access, trunk, routed
  accessVlan?: number; // e.g. 20
  allowedVlans?: number[]; // For trunk ports, e.g. [10, 20, 30, 80]
  nativeVlan?: number; // Default 1
  adminStatus: InterfaceAdminStatus;
  speedMbps: number; // e.g. 100, 1000
  connectedTo?: InterfaceLinkTarget;
  isUplink?: boolean;
}

export interface VlanDefinition {
  id: number;
  name: string;
  subnet: string; // e.g. "10.20.20.0/24"
  gatewayIp: string; // e.g. "10.20.20.1"
  description: string;
  colorHex: string;
  category: 'management' | 'corporate' | 'restricted' | 'services' | 'edge';
  dhcpRange?: [string, string]; // start, end
}

export interface MacTableEntry {
  vlanId: number;
  macAddress: string;
  port: string;
  type: 'DYNAMIC' | 'STATIC';
  ageSec: number;
}

export interface ArpTableEntry {
  ipAddress: string;
  macAddress: string;
  interfaceId: string;
  type: 'DYNAMIC' | 'STATIC';
}

export interface RouteEntry {
  id: string;
  network: string; // "0.0.0.0" or "10.20.0.0"
  mask: string; // "0.0.0.0" or "255.255.0.0"
  nextHop: string; // "10.20.254.1" or "DIRECT"
  interfaceId: string;
  protocol: 'C' | 'S' | 'O'; // Connected, Static, OSPF
  metric: number;
}

export interface SviInterface {
  vlanId: number;
  ipAddress: string;
  subnetMask: string;
  adminStatus: InterfaceAdminStatus;
  ipHelperAddress?: string; // DHCP Relay
}

export type FirewallZone = 'INSIDE' | 'DMZ' | 'OUTSIDE';

export interface FirewallRule {
  id: string;
  description: string;
  sourceZone: FirewallZone | 'ANY';
  destZone: FirewallZone | 'ANY';
  sourceSubnet: string; // "ANY" or "10.20.72.0/22"
  destSubnet: string; // "ANY" or "10.20.80.0/24"
  protocol: 'ANY' | 'TCP' | 'UDP' | 'ICMP';
  destPort?: number | string; // 80, 443, "ANY"
  action: 'PERMIT' | 'DENY';
  enabled: boolean;
  hitCount: number;
}

export interface NatTranslation {
  insideIp: string;
  insidePort: number;
  outsideIp: string;
  outsidePort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  timestamp: number;
}

export interface DhcpLease {
  ip: string;
  mac: string;
  hostname: string;
  vlanId: number;
  leasedAt: number;
}

export interface DnsRecord {
  domain: string;
  type: 'A' | 'CNAME';
  value: string;
  ttl: number;
}

export interface NetworkDevice {
  id: string;
  name: string;
  hostname: string;
  type: DeviceType;
  model: string; // e.g. "Cisco Catalyst 2960-X", "Cisco Catalyst 3850-24T", "Cisco ASA 5516-X"
  location: string; // "Building 1 - MDF", "Data Center"
  x: number;
  y: number;
  interfaces: NetworkInterface[];
  defaultGateway?: string;
  dnsServer?: string;
  macTable?: MacTableEntry[]; // switches
  arpTable?: ArpTableEntry[]; // hosts, L3 switches, firewalls
  routingTable?: RouteEntry[]; // L3 switch, firewall
  svis?: SviInterface[]; // L3 switch
  firewallRules?: FirewallRule[]; // firewall
  natTranslations?: NatTranslation[]; // firewall
  dnsRecords?: DnsRecord[]; // DNS server
  dhcpLeases?: DhcpLease[]; // DHCP server
  rogueDhcpEnabled?: boolean;
}

export interface NetworkLink {
  id: string;
  sourceDeviceId: string;
  sourceInterfaceId: string;
  targetDeviceId: string;
  targetInterfaceId: string;
  linkType: 'access' | 'trunk' | 'routed' | 'wan';
  status: 'up' | 'down';
  allowedVlans?: number[];
  colorHex?: string;
}

export interface PacketHeader {
  layer2: {
    srcMac: string;
    dstMac: string;
    ethertype: string; // "0x0800" (IPv4), "0x0806" (ARP), "0x8100" (802.1Q)
    vlanTag?: {
      tpid: string; // "0x8100"
      pcp: number; // 3-bit priority (0-7)
      dei: number; // 1-bit drop eligible
      vid: number; // 12-bit VLAN ID (1-4094)
    };
  };
  layer3?: {
    srcIp: string;
    dstIp: string;
    ttl: number;
    protocol: 'ICMP' | 'TCP' | 'UDP';
    checksum: string;
    identification: number;
  };
  layer4?: {
    srcPort?: number;
    dstPort?: number;
    icmpType?: 'ECHO_REQUEST' | 'ECHO_REPLY' | 'DEST_UNREACHABLE';
    tcpFlags?: string[]; // ["SYN"], ["SYN", "ACK"], ["ACK"]
    udpLength?: number;
  };
  payloadSummary: string;
}

export type ForwardingAction = 
  | 'ORIGINATE'
  | 'FORWARD'
  | 'FLOOD'
  | 'ROUTE'
  | 'PERMIT'
  | 'DROP'
  | 'NAT_TRANSLATE'
  | 'CONSUME'
  | 'REPLY';

export interface HardwareInternalState {
  ingressSerDes: string;
  tcamLookup: string;
  switchFabricBus: string;
  egressPortQueue: string;
  tagEngineAction: 'UNTOUCHED' | 'TAG_INSERTED' | 'TAG_REMOVED' | 'TAG_PASSTHROUGH';
  latencyNanos: number;
}

export interface SimulationStep {
  stepId: number;
  timestampMs: number;
  currentDeviceId: string;
  ingressInterfaceId?: string;
  egressInterfaceIds: string[]; // Can be multiple in case of flood!
  vlanId?: number;
  has8021qTag: boolean;
  packetHeader: PacketHeader;
  action: ForwardingAction;
  rationale: string;
  hardwareInternals?: HardwareInternalState;
  dropped?: boolean;
  dropReason?: string;
}

export interface SimulationTrace {
  id: string;
  protocol: ProtocolType;
  sourceDeviceId: string;
  destinationDeviceId: string;
  destinationIp: string;
  startedAt: string;
  completed: boolean;
  success: boolean;
  summary: string;
  steps: SimulationStep[];
  packetStats: {
    totalHops: number;
    framesFlooded: number;
    bytesSimulated: number;
    l2Rewrites: number;
    natTranslations: number;
  };
}

export interface FaultScenario {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category: 'VLAN_MISCONFIG' | 'TRUNK_PRUNING' | 'PORT_SHUTDOWN' | 'ROUTING_MISMATCH' | 'ACL_DENIAL' | 'DHCP_FAULT' | 'ROGUE_ATTACK' | 'DNS_FAULT';
  objective: string;
  symptoms: string[];
  diagnosticClues: string[];
  targetDeviceId: string;
  inject: (state: NetworkState) => NetworkState;
  repair: (state: NetworkState) => NetworkState;
  verifyFixed: (state: NetworkState) => { isFixed: boolean; reason: string };
}

export interface ValidationTestResult {
  id: string;
  title: string;
  description: string;
  category: 'VLAN_ISOLATION' | 'ROUTING' | 'SECURITY_POLICY' | 'SERVICES' | 'HARDENING';
  expectedOutcome: 'PERMIT' | 'DENY';
  actualOutcome: 'PERMIT' | 'DENY' | 'ERROR';
  passed: boolean;
  sourceDevice: string;
  destinationDevice: string;
  protocol: ProtocolType;
  evidence: string;
  traceId?: string;
}

export interface NetworkState {
  devices: NetworkDevice[];
  links: NetworkLink[];
  vlans: VlanDefinition[];
  transitSubnet: string;
  activeFaults: string[];
  lastTrace?: SimulationTrace;
  validationResults: ValidationTestResult[];
}
