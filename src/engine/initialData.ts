// NetScope Initial Enterprise Topology, Addressing & Device Inventory Data

import { 
  NetworkDevice, 
  NetworkLink, 
  VlanDefinition, 
  NetworkState,
  FirewallRule
} from '../types/network';

export const INITIAL_VLANS: VlanDefinition[] = [
  {
    id: 10,
    name: 'Network Management',
    subnet: '10.20.10.0/26',
    gatewayIp: '10.20.10.1',
    description: 'Out-of-band switch & router management, SNMP, SSH consoles',
    colorHex: '#38bdf8', // Light blue
    category: 'management',
    dhcpRange: ['10.20.10.10', '10.20.10.50']
  },
  {
    id: 20,
    name: 'Human Resources (HR)',
    subnet: '10.20.20.0/24',
    gatewayIp: '10.20.20.1',
    description: 'Confidential employee records, payroll workstations',
    colorHex: '#ec4899', // Pink
    category: 'corporate',
    dhcpRange: ['10.20.20.10', '10.20.20.200']
  },
  {
    id: 30,
    name: 'Finance & Accounting',
    subnet: '10.20.30.0/24',
    gatewayIp: '10.20.30.1',
    description: 'General ledger, banking portals, PCI-DSS compliant segment',
    colorHex: '#10b981', // Emerald green
    category: 'restricted',
    dhcpRange: ['10.20.30.10', '10.20.30.200']
  },
  {
    id: 40,
    name: 'Engineering & R&D',
    subnet: '10.20.40.0/23',
    gatewayIp: '10.20.40.1',
    description: 'CAD workstations, Git repositories, software build systems',
    colorHex: '#8b5cf6', // Violet
    category: 'corporate',
    dhcpRange: ['10.20.40.10', '10.20.41.200']
  },
  {
    id: 50,
    name: 'Production & OT (SCADA)',
    subnet: '10.20.50.0/24',
    gatewayIp: '10.20.50.1',
    description: 'Shop-floor PLCs, SCADA telemetry, industrial assembly lines',
    colorHex: '#f59e0b', // Amber
    category: 'restricted',
    dhcpRange: ['10.20.50.50', '10.20.50.200']
  },
  {
    id: 60,
    name: 'Corporate Staff',
    subnet: '10.20.60.0/23',
    gatewayIp: '10.20.60.1',
    description: 'General office laptops, marketing, sales, desktop endpoints',
    colorHex: '#06b6d4', // Cyan
    category: 'corporate',
    dhcpRange: ['10.20.60.10', '10.20.61.200']
  },
  {
    id: 70,
    name: 'Guest Wi-Fi',
    subnet: '10.20.72.0/22',
    gatewayIp: '10.20.72.1',
    description: 'Zero-trust isolated visitor BYOD devices, internet-only egress',
    colorHex: '#f97316', // Orange
    category: 'edge',
    dhcpRange: ['10.20.72.10', '10.20.75.200']
  },
  {
    id: 80,
    name: 'Internal Data Center Servers',
    subnet: '10.20.80.0/24',
    gatewayIp: '10.20.80.1',
    description: 'Core infrastructure: Active Directory, DNS/DHCP, ERP Database',
    colorHex: '#3b82f6', // Blue
    category: 'services',
    dhcpRange: ['10.20.80.50', '10.20.80.100']
  },
  {
    id: 90,
    name: 'Printers & IoT Peripherals',
    subnet: '10.20.90.0/24',
    gatewayIp: '10.20.90.1',
    description: 'Network multifunction printers, HVAC telemetry, environmental sensors',
    colorHex: '#14b8a6', // Teal
    category: 'services',
    dhcpRange: ['10.20.90.50', '10.20.90.200']
  },
  {
    id: 100,
    name: 'DMZ Perimeter Services',
    subnet: '10.20.100.0/27',
    gatewayIp: '10.20.100.1',
    description: 'Public-facing reverse proxy, mail relay, SSL VPN gateway',
    colorHex: '#ef4444', // Red
    category: 'edge',
    dhcpRange: ['10.20.100.20', '10.20.100.28']
  }
];

export const INITIAL_FIREWALL_RULES: FirewallRule[] = [
  {
    id: 'FW-RULE-01',
    description: 'Permit established & related return state traffic',
    sourceZone: 'ANY',
    destZone: 'ANY',
    sourceSubnet: 'ANY',
    destSubnet: 'ANY',
    protocol: 'ANY',
    action: 'PERMIT',
    enabled: true,
    hitCount: 1420
  },
  {
    id: 'FW-RULE-02',
    description: 'Permit public Internet access to DMZ Web Server (TCP 80, 443)',
    sourceZone: 'OUTSIDE',
    destZone: 'DMZ',
    sourceSubnet: 'ANY',
    destSubnet: '10.20.100.10/32',
    protocol: 'TCP',
    destPort: 80,
    action: 'PERMIT',
    enabled: true,
    hitCount: 524
  },
  {
    id: 'FW-RULE-03',
    description: 'Permit internal campus out to Public Internet with PAT',
    sourceZone: 'INSIDE',
    destZone: 'OUTSIDE',
    sourceSubnet: '10.20.0.0/16',
    destSubnet: 'ANY',
    protocol: 'ANY',
    action: 'PERMIT',
    enabled: true,
    hitCount: 3890
  },
  {
    id: 'FW-RULE-04',
    description: 'ISOLATION: Deny Guest Wi-Fi access to Internal Data Center (VLAN 80)',
    sourceZone: 'INSIDE',
    destZone: 'INSIDE',
    sourceSubnet: '10.20.72.0/22',
    destSubnet: '10.20.80.0/24',
    protocol: 'ANY',
    action: 'DENY',
    enabled: true,
    hitCount: 88
  },
  {
    id: 'FW-RULE-05',
    description: 'ISOLATION: Deny Production OT SCADA from reaching Corporate Staff VLAN 60',
    sourceZone: 'INSIDE',
    destZone: 'INSIDE',
    sourceSubnet: '10.20.50.0/24',
    destSubnet: '10.20.60.0/23',
    protocol: 'ANY',
    action: 'DENY',
    enabled: true,
    hitCount: 12
  },
  {
    id: 'FW-RULE-06',
    description: 'SECURITY: Deny DMZ initiating unsolicited connections to Internal Inside LAN',
    sourceZone: 'DMZ',
    destZone: 'INSIDE',
    sourceSubnet: '10.20.100.0/27',
    destSubnet: '10.20.0.0/16',
    protocol: 'ANY',
    action: 'DENY',
    enabled: true,
    hitCount: 45
  },
  {
    id: 'FW-RULE-07',
    description: 'Default implicit deny all unmanaged traffic',
    sourceZone: 'ANY',
    destZone: 'ANY',
    sourceSubnet: 'ANY',
    destSubnet: 'ANY',
    protocol: 'ANY',
    action: 'DENY',
    enabled: true,
    hitCount: 168
  }
];

export const INITIAL_DEVICES: NetworkDevice[] = [
  // 1. Edge Firewall
  {
    id: 'dev-fw-01',
    name: 'Edge Firewall (ASA 5516-X)',
    hostname: 'FW-EDGE-01',
    type: 'firewall',
    model: 'Cisco ASA 5516-X with FirePOWER Services',
    location: 'Building 1 - MDF Perimeter Rack',
    x: 480,
    y: 70,
    interfaces: [
      {
        id: 'Gi1/1',
        name: 'GigabitEthernet1/1',
        macAddress: '00:1c:58:22:aa:01',
        ipAddress: '198.51.100.2',
        subnetMask: '255.255.255.252',
        mode: 'routed',
        adminStatus: 'up',
        speedMbps: 1000,
        connectedTo: { deviceId: 'dev-cloud-01', interfaceId: 'eth0' }
      },
      {
        id: 'Gi1/2',
        name: 'GigabitEthernet1/2',
        macAddress: '00:1c:58:22:aa:02',
        ipAddress: '10.20.254.1',
        subnetMask: '255.255.255.252',
        mode: 'routed',
        adminStatus: 'up',
        speedMbps: 1000,
        connectedTo: { deviceId: 'dev-core-01', interfaceId: 'Gi1/0/24' }
      },
      {
        id: 'Gi1/3',
        name: 'GigabitEthernet1/3',
        macAddress: '00:1c:58:22:aa:03',
        ipAddress: '10.20.100.1',
        subnetMask: '255.255.255.224',
        mode: 'routed',
        accessVlan: 100,
        adminStatus: 'up',
        speedMbps: 1000,
        connectedTo: { deviceId: 'dev-dmz-sw-01', interfaceId: 'Gi0/1' }
      }
    ],
    routingTable: [
      { id: 'r1', network: '0.0.0.0', mask: '0.0.0.0', nextHop: '198.51.100.1', interfaceId: 'Gi1/1', protocol: 'S', metric: 1 },
      { id: 'r2', network: '10.20.0.0', mask: '255.255.0.0', nextHop: '10.20.254.2', interfaceId: 'Gi1/2', protocol: 'S', metric: 1 },
      { id: 'r3', network: '10.20.100.0', mask: '255.255.255.224', nextHop: 'DIRECT', interfaceId: 'Gi1/3', protocol: 'C', metric: 0 },
      { id: 'r4', network: '10.20.254.0', mask: '255.255.255.252', nextHop: 'DIRECT', interfaceId: 'Gi1/2', protocol: 'C', metric: 0 }
    ],
    arpTable: [
      { ipAddress: '10.20.254.2', macAddress: '00:1c:58:11:bb:24', interfaceId: 'Gi1/2', type: 'DYNAMIC' },
      { ipAddress: '198.51.100.1', macAddress: '00:fe:c8:99:00:01', interfaceId: 'Gi1/1', type: 'DYNAMIC' },
      { ipAddress: '10.20.100.10', macAddress: '00:50:56:a1:00:10', interfaceId: 'Gi1/3', type: 'DYNAMIC' }
    ],
    firewallRules: INITIAL_FIREWALL_RULES,
    natTranslations: [
      { insideIp: '10.20.20.10', insidePort: 49152, outsideIp: '198.51.100.2', outsidePort: 10240, protocol: 'TCP', timestamp: Date.now() - 30000 },
      { insideIp: '10.20.60.10', insidePort: 52140, outsideIp: '198.51.100.2', outsidePort: 10241, protocol: 'TCP', timestamp: Date.now() - 15000 }
    ]
  },

  // 2. Core Layer 3 Switch
  {
    id: 'dev-core-01',
    name: 'Core L3 Switch (Catalyst 3850)',
    hostname: 'CORE-SW-01',
    type: 'l3_core',
    model: 'Cisco Catalyst 3850-24T Layer 3 Core Switch',
    location: 'Building 1 - MDF Data Center',
    x: 480,
    y: 230,
    interfaces: [
      {
        id: 'Gi1/0/24',
        name: 'GigabitEthernet1/0/24',
        macAddress: '00:1c:58:11:bb:24',
        ipAddress: '10.20.254.2',
        subnetMask: '255.255.255.252',
        mode: 'routed',
        adminStatus: 'up',
        speedMbps: 1000,
        connectedTo: { deviceId: 'dev-fw-01', interfaceId: 'Gi1/2' }
      },
      {
        id: 'Gi1/0/1',
        name: 'GigabitEthernet1/0/1',
        macAddress: '00:1c:58:11:bb:01',
        mode: 'trunk',
        allowedVlans: [10, 20, 30, 80],
        nativeVlan: 1,
        adminStatus: 'up',
        speedMbps: 1000,
        isUplink: true,
        connectedTo: { deviceId: 'dev-acc-sw-a', interfaceId: 'Gi0/1' }
      },
      {
        id: 'Gi1/0/2',
        name: 'GigabitEthernet1/0/2',
        macAddress: '00:1c:58:11:bb:02',
        mode: 'trunk',
        allowedVlans: [10, 40, 50, 80],
        nativeVlan: 1,
        adminStatus: 'up',
        speedMbps: 1000,
        isUplink: true,
        connectedTo: { deviceId: 'dev-acc-sw-b', interfaceId: 'Gi0/1' }
      },
      {
        id: 'Gi1/0/3',
        name: 'GigabitEthernet1/0/3',
        macAddress: '00:1c:58:11:bb:03',
        mode: 'trunk',
        allowedVlans: [10, 60, 70, 80, 90],
        nativeVlan: 1,
        adminStatus: 'up',
        speedMbps: 1000,
        isUplink: true,
        connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Gi0/1' }
      }
    ],
    svis: [
      { vlanId: 10, ipAddress: '10.20.10.1', subnetMask: '255.255.255.192', adminStatus: 'up' },
      { vlanId: 20, ipAddress: '10.20.20.1', subnetMask: '255.255.255.0', adminStatus: 'up', ipHelperAddress: '10.20.80.10' },
      { vlanId: 30, ipAddress: '10.20.30.1', subnetMask: '255.255.255.0', adminStatus: 'up', ipHelperAddress: '10.20.80.10' },
      { vlanId: 40, ipAddress: '10.20.40.1', subnetMask: '255.255.254.0', adminStatus: 'up', ipHelperAddress: '10.20.80.10' },
      { vlanId: 50, ipAddress: '10.20.50.1', subnetMask: '255.255.255.0', adminStatus: 'up' },
      { vlanId: 60, ipAddress: '10.20.60.1', subnetMask: '255.255.254.0', adminStatus: 'up', ipHelperAddress: '10.20.80.10' },
      { vlanId: 70, ipAddress: '10.20.72.1', subnetMask: '255.255.252.0', adminStatus: 'up', ipHelperAddress: '10.20.80.10' },
      { vlanId: 80, ipAddress: '10.20.80.1', subnetMask: '255.255.255.0', adminStatus: 'up' },
      { vlanId: 90, ipAddress: '10.20.90.1', subnetMask: '255.255.255.0', adminStatus: 'up', ipHelperAddress: '10.20.80.10' }
    ],
    routingTable: [
      { id: 'cr1', network: '0.0.0.0', mask: '0.0.0.0', nextHop: '10.20.254.1', interfaceId: 'Gi1/0/24', protocol: 'S', metric: 1 },
      { id: 'cr2', network: '10.20.10.0', mask: '255.255.255.192', nextHop: 'DIRECT', interfaceId: 'Vlan10', protocol: 'C', metric: 0 },
      { id: 'cr3', network: '10.20.20.0', mask: '255.255.255.0', nextHop: 'DIRECT', interfaceId: 'Vlan20', protocol: 'C', metric: 0 },
      { id: 'cr4', network: '10.20.30.0', mask: '255.255.255.0', nextHop: 'DIRECT', interfaceId: 'Vlan30', protocol: 'C', metric: 0 },
      { id: 'cr5', network: '10.20.40.0', mask: '255.255.254.0', nextHop: 'DIRECT', interfaceId: 'Vlan40', protocol: 'C', metric: 0 },
      { id: 'cr6', network: '10.20.50.0', mask: '255.255.255.0', nextHop: 'DIRECT', interfaceId: 'Vlan50', protocol: 'C', metric: 0 },
      { id: 'cr7', network: '10.20.60.0', mask: '255.255.254.0', nextHop: 'DIRECT', interfaceId: 'Vlan60', protocol: 'C', metric: 0 },
      { id: 'cr8', network: '10.20.72.0', mask: '255.255.252.0', nextHop: 'DIRECT', interfaceId: 'Vlan70', protocol: 'C', metric: 0 },
      { id: 'cr9', network: '10.20.80.0', mask: '255.255.255.0', nextHop: 'DIRECT', interfaceId: 'Vlan80', protocol: 'C', metric: 0 },
      { id: 'cr10', network: '10.20.90.0', mask: '255.255.255.0', nextHop: 'DIRECT', interfaceId: 'Vlan90', protocol: 'C', metric: 0 },
      { id: 'cr11', network: '10.20.254.0', mask: '255.255.255.252', nextHop: 'DIRECT', interfaceId: 'Gi1/0/24', protocol: 'C', metric: 0 }
    ],
    macTable: [
      { vlanId: 20, macAddress: '00:50:56:01:20:01', port: 'Gi1/0/1', type: 'DYNAMIC', ageSec: 15 },
      { vlanId: 20, macAddress: '00:50:56:01:20:02', port: 'Gi1/0/1', type: 'DYNAMIC', ageSec: 42 },
      { vlanId: 30, macAddress: '00:50:56:01:30:01', port: 'Gi1/0/1', type: 'DYNAMIC', ageSec: 25 },
      { vlanId: 40, macAddress: '00:50:56:02:40:01', port: 'Gi1/0/2', type: 'DYNAMIC', ageSec: 8 },
      { vlanId: 50, macAddress: '00:50:56:02:50:01', port: 'Gi1/0/2', type: 'DYNAMIC', ageSec: 60 },
      { vlanId: 60, macAddress: '00:50:56:03:60:01', port: 'Gi1/0/3', type: 'DYNAMIC', ageSec: 11 },
      { vlanId: 80, macAddress: '00:50:56:03:80:01', port: 'Gi1/0/3', type: 'DYNAMIC', ageSec: 5 }
    ],
    arpTable: [
      { ipAddress: '10.20.20.10', macAddress: '00:50:56:01:20:01', interfaceId: 'Vlan20', type: 'DYNAMIC' },
      { ipAddress: '10.20.30.10', macAddress: '00:50:56:01:30:01', interfaceId: 'Vlan30', type: 'DYNAMIC' },
      { ipAddress: '10.20.40.10', macAddress: '00:50:56:02:40:01', interfaceId: 'Vlan40', type: 'DYNAMIC' },
      { ipAddress: '10.20.50.10', macAddress: '00:50:56:02:50:01', interfaceId: 'Vlan50', type: 'DYNAMIC' },
      { ipAddress: '10.20.60.10', macAddress: '00:50:56:03:60:01', interfaceId: 'Vlan60', type: 'DYNAMIC' },
      { ipAddress: '10.20.80.10', macAddress: '00:50:56:03:80:01', interfaceId: 'Vlan80', type: 'DYNAMIC' },
      { ipAddress: '10.20.80.12', macAddress: '00:50:56:03:80:03', interfaceId: 'Vlan80', type: 'DYNAMIC' },
      { ipAddress: '10.20.254.1', macAddress: '00:1c:58:22:aa:02', interfaceId: 'Gi1/0/24', type: 'DYNAMIC' }
    ]
  },

  // 3. Access Switch A (Building 1 - HR / Finance)
  {
    id: 'dev-acc-sw-a',
    name: 'Access Switch A (Building 1)',
    hostname: 'ACC-SW-A',
    type: 'l2_switch',
    model: 'Cisco Catalyst 2960-X 24-Port Gigabit',
    location: 'Building 1 - 2nd Floor Wiring Closet',
    x: 180,
    y: 390,
    interfaces: [
      {
        id: 'Gi0/1',
        name: 'GigabitEthernet0/1',
        macAddress: '00:1c:58:33:01:01',
        mode: 'trunk',
        allowedVlans: [10, 20, 30, 80],
        nativeVlan: 1,
        adminStatus: 'up',
        speedMbps: 1000,
        isUplink: true,
        connectedTo: { deviceId: 'dev-core-01', interfaceId: 'Gi1/0/1' }
      },
      {
        id: 'Fa0/1',
        name: 'FastEthernet0/1',
        macAddress: '00:1c:58:33:01:02',
        mode: 'access',
        accessVlan: 10,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-mgmt-01', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/2',
        name: 'FastEthernet0/2',
        macAddress: '00:1c:58:33:01:03',
        mode: 'access',
        accessVlan: 20,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-hr-01', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/3',
        name: 'FastEthernet0/3',
        macAddress: '00:1c:58:33:01:04',
        mode: 'access',
        accessVlan: 20,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-hr-02', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/4',
        name: 'FastEthernet0/4',
        macAddress: '00:1c:58:33:01:05',
        mode: 'access',
        accessVlan: 30,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-fin-01', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/5',
        name: 'FastEthernet0/5',
        macAddress: '00:1c:58:33:01:06',
        mode: 'access',
        accessVlan: 30,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-fin-02', interfaceId: 'eth0' }
      },
      // Hardened unused ports
      {
        id: 'Fa0/21',
        name: 'FastEthernet0/21',
        macAddress: '00:1c:58:33:01:21',
        mode: 'access',
        accessVlan: 999,
        adminStatus: 'down',
        speedMbps: 100
      },
      {
        id: 'Fa0/22',
        name: 'FastEthernet0/22',
        macAddress: '00:1c:58:33:01:22',
        mode: 'access',
        accessVlan: 999,
        adminStatus: 'down',
        speedMbps: 100
      }
    ],
    macTable: [
      { vlanId: 10, macAddress: '00:50:56:01:10:01', port: 'Fa0/1', type: 'DYNAMIC', ageSec: 20 },
      { vlanId: 20, macAddress: '00:50:56:01:20:01', port: 'Fa0/2', type: 'DYNAMIC', ageSec: 10 },
      { vlanId: 20, macAddress: '00:50:56:01:20:02', port: 'Fa0/3', type: 'DYNAMIC', ageSec: 40 },
      { vlanId: 30, macAddress: '00:50:56:01:30:01', port: 'Fa0/4', type: 'DYNAMIC', ageSec: 15 },
      { vlanId: 30, macAddress: '00:50:56:01:30:02', port: 'Fa0/5', type: 'DYNAMIC', ageSec: 50 },
      { vlanId: 20, macAddress: '00:1c:58:11:bb:01', port: 'Gi0/1', type: 'DYNAMIC', ageSec: 5 },
      { vlanId: 30, macAddress: '00:1c:58:11:bb:01', port: 'Gi0/1', type: 'DYNAMIC', ageSec: 5 }
    ]
  },

  // 4. Access Switch B (Building 2 - Engineering / Production)
  {
    id: 'dev-acc-sw-b',
    name: 'Access Switch B (Building 2)',
    hostname: 'ACC-SW-B',
    type: 'l2_switch',
    model: 'Cisco Catalyst 2960-X 24-Port Gigabit',
    location: 'Building 2 - R&D Engineering Lab',
    x: 530,
    y: 390,
    interfaces: [
      {
        id: 'Gi0/1',
        name: 'GigabitEthernet0/1',
        macAddress: '00:1c:58:33:02:01',
        mode: 'trunk',
        allowedVlans: [10, 40, 50, 80],
        nativeVlan: 1,
        adminStatus: 'up',
        speedMbps: 1000,
        isUplink: true,
        connectedTo: { deviceId: 'dev-core-01', interfaceId: 'Gi1/0/2' }
      },
      {
        id: 'Fa0/1',
        name: 'FastEthernet0/1',
        macAddress: '00:1c:58:33:02:02',
        mode: 'access',
        accessVlan: 10,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-mgmt-02', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/2',
        name: 'FastEthernet0/2',
        macAddress: '00:1c:58:33:02:03',
        mode: 'access',
        accessVlan: 40,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-eng-01', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/3',
        name: 'FastEthernet0/3',
        macAddress: '00:1c:58:33:02:04',
        mode: 'access',
        accessVlan: 40,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-eng-02', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/4',
        name: 'FastEthernet0/4',
        macAddress: '00:1c:58:33:02:05',
        mode: 'access',
        accessVlan: 50,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-prod-01', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/5',
        name: 'FastEthernet0/5',
        macAddress: '00:1c:58:33:02:06',
        mode: 'access',
        accessVlan: 50,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-prod-02', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/21',
        name: 'FastEthernet0/21',
        macAddress: '00:1c:58:33:02:21',
        mode: 'access',
        accessVlan: 999,
        adminStatus: 'down',
        speedMbps: 100
      }
    ],
    macTable: [
      { vlanId: 10, macAddress: '00:50:56:02:10:01', port: 'Fa0/1', type: 'DYNAMIC', ageSec: 18 },
      { vlanId: 40, macAddress: '00:50:56:02:40:01', port: 'Fa0/2', type: 'DYNAMIC', ageSec: 12 },
      { vlanId: 40, macAddress: '00:50:56:02:40:02', port: 'Fa0/3', type: 'DYNAMIC', ageSec: 35 },
      { vlanId: 50, macAddress: '00:50:56:02:50:01', port: 'Fa0/4', type: 'DYNAMIC', ageSec: 22 },
      { vlanId: 50, macAddress: '00:50:56:02:50:02', port: 'Fa0/5', type: 'DYNAMIC', ageSec: 65 },
      { vlanId: 40, macAddress: '00:1c:58:11:bb:02', port: 'Gi0/1', type: 'DYNAMIC', ageSec: 5 }
    ]
  },

  // 5. Access Switch C (Building 3 - Corporate / Guest / Servers / IoT)
  {
    id: 'dev-acc-sw-c',
    name: 'Access Switch C (Building 3)',
    hostname: 'ACC-SW-C',
    type: 'l2_switch',
    model: 'Cisco Catalyst 2960-X 48-Port Gigabit PoE+',
    location: 'Building 3 - Main Corporate Data & Operations',
    x: 880,
    y: 390,
    interfaces: [
      {
        id: 'Gi0/1',
        name: 'GigabitEthernet0/1',
        macAddress: '00:1c:58:33:03:01',
        mode: 'trunk',
        allowedVlans: [10, 60, 70, 80, 90],
        nativeVlan: 1,
        adminStatus: 'up',
        speedMbps: 1000,
        isUplink: true,
        connectedTo: { deviceId: 'dev-core-01', interfaceId: 'Gi1/0/3' }
      },
      {
        id: 'Fa0/1',
        name: 'FastEthernet0/1',
        macAddress: '00:1c:58:33:03:02',
        mode: 'access',
        accessVlan: 60,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-staff-01', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/2',
        name: 'FastEthernet0/2',
        macAddress: '00:1c:58:33:03:03',
        mode: 'access',
        accessVlan: 60,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-staff-02', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/3',
        name: 'FastEthernet0/3',
        macAddress: '00:1c:58:33:03:04',
        mode: 'access',
        accessVlan: 70,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-ap-01', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/4',
        name: 'FastEthernet0/4',
        macAddress: '00:1c:58:33:03:05',
        mode: 'access',
        accessVlan: 80,
        adminStatus: 'up',
        speedMbps: 1000,
        connectedTo: { deviceId: 'dev-srv-dc', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/5',
        name: 'FastEthernet0/5',
        macAddress: '00:1c:58:33:03:06',
        mode: 'access',
        accessVlan: 80,
        adminStatus: 'up',
        speedMbps: 1000,
        connectedTo: { deviceId: 'dev-srv-dns', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/6',
        name: 'FastEthernet0/6',
        macAddress: '00:1c:58:33:03:07',
        mode: 'access',
        accessVlan: 80,
        adminStatus: 'up',
        speedMbps: 1000,
        connectedTo: { deviceId: 'dev-srv-erp', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/7',
        name: 'FastEthernet0/7',
        macAddress: '00:1c:58:33:03:08',
        mode: 'access',
        accessVlan: 90,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-print-01', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/8',
        name: 'FastEthernet0/8',
        macAddress: '00:1c:58:33:03:09',
        mode: 'access',
        accessVlan: 90,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-iot-01', interfaceId: 'eth0' }
      }
    ],
    macTable: [
      { vlanId: 60, macAddress: '00:50:56:03:60:01', port: 'Fa0/1', type: 'DYNAMIC', ageSec: 15 },
      { vlanId: 60, macAddress: '00:50:56:03:60:02', port: 'Fa0/2', type: 'DYNAMIC', ageSec: 30 },
      { vlanId: 70, macAddress: '00:50:56:03:70:01', port: 'Fa0/3', type: 'DYNAMIC', ageSec: 5 },
      { vlanId: 70, macAddress: '00:50:56:03:70:02', port: 'Fa0/3', type: 'DYNAMIC', ageSec: 12 },
      { vlanId: 80, macAddress: '00:50:56:03:80:01', port: 'Fa0/4', type: 'DYNAMIC', ageSec: 5 },
      { vlanId: 80, macAddress: '00:50:56:03:80:02', port: 'Fa0/5', type: 'DYNAMIC', ageSec: 5 },
      { vlanId: 80, macAddress: '00:50:56:03:80:03', port: 'Fa0/6', type: 'DYNAMIC', ageSec: 8 },
      { vlanId: 90, macAddress: '00:50:56:03:90:01', port: 'Fa0/7', type: 'DYNAMIC', ageSec: 45 },
      { vlanId: 90, macAddress: '00:50:56:03:90:02', port: 'Fa0/8', type: 'DYNAMIC', ageSec: 60 }
    ]
  },

  // 6. DMZ Switch (VLAN 100)
  {
    id: 'dev-dmz-sw-01',
    name: 'DMZ Switch (Catalyst 2960)',
    hostname: 'DMZ-SW-01',
    type: 'l2_switch',
    model: 'Cisco Catalyst 2960-C Compact',
    location: 'Building 1 - DMZ Secure Zone',
    x: 820,
    y: 70,
    interfaces: [
      {
        id: 'Gi0/1',
        name: 'GigabitEthernet0/1',
        macAddress: '00:1c:58:44:01:01',
        mode: 'access',
        accessVlan: 100,
        adminStatus: 'up',
        speedMbps: 1000,
        connectedTo: { deviceId: 'dev-fw-01', interfaceId: 'Gi1/3' }
      },
      {
        id: 'Fa0/1',
        name: 'FastEthernet0/1',
        macAddress: '00:1c:58:44:01:02',
        mode: 'access',
        accessVlan: 100,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-dmz-web', interfaceId: 'eth0' }
      },
      {
        id: 'Fa0/2',
        name: 'FastEthernet0/2',
        macAddress: '00:1c:58:44:01:03',
        mode: 'access',
        accessVlan: 100,
        adminStatus: 'up',
        speedMbps: 100,
        connectedTo: { deviceId: 'dev-dmz-vpn', interfaceId: 'eth0' }
      }
    ],
    macTable: [
      { vlanId: 100, macAddress: '00:1c:58:22:aa:03', port: 'Gi0/1', type: 'DYNAMIC', ageSec: 5 },
      { vlanId: 100, macAddress: '00:50:56:a1:00:10', port: 'Fa0/1', type: 'DYNAMIC', ageSec: 10 },
      { vlanId: 100, macAddress: '00:50:56:a1:00:11', port: 'Fa0/2', type: 'DYNAMIC', ageSec: 25 }
    ]
  },

  // 7. ISP / Cloud Router
  {
    id: 'dev-cloud-01',
    name: 'Internet Gateway (ISP Uplink)',
    hostname: 'ISP-EDGE-RTR',
    type: 'cloud_router',
    model: 'Carrier Edge BGP Router',
    location: 'Public Internet / Telco Fiber POP',
    x: 180,
    y: 70,
    interfaces: [
      {
        id: 'eth0',
        name: 'Ethernet0/0',
        macAddress: '00:fe:c8:99:00:01',
        ipAddress: '198.51.100.1',
        subnetMask: '255.255.255.252',
        mode: 'routed',
        adminStatus: 'up',
        speedMbps: 10000,
        connectedTo: { deviceId: 'dev-fw-01', interfaceId: 'Gi1/1' }
      },
      {
        id: 'eth1',
        name: 'Ethernet0/1',
        macAddress: '00:fe:c8:99:00:02',
        ipAddress: '8.8.8.1',
        subnetMask: '255.255.255.0',
        mode: 'routed',
        adminStatus: 'up',
        speedMbps: 10000,
        connectedTo: { deviceId: 'dev-ext-dns', interfaceId: 'eth0' }
      }
    ],
    routingTable: [
      { id: 'isp-r1', network: '0.0.0.0', mask: '0.0.0.0', nextHop: 'DIRECT', interfaceId: 'eth0', protocol: 'C', metric: 0 }
    ],
    arpTable: [
      { ipAddress: '198.51.100.2', macAddress: '00:1c:58:22:aa:01', interfaceId: 'eth0', type: 'DYNAMIC' }
    ],
    defaultGateway: '198.51.100.2'
  },

  // --- Endpoints & Workstations ---

  // VLAN 10: Management
  {
    id: 'dev-mgmt-01',
    name: 'Network Admin Console',
    hostname: 'MGMT-WS-01',
    type: 'workstation',
    model: 'Dell Precision Tower 5820',
    location: 'Building 1 - IT Operations Center',
    x: 80,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:01:10:01',
      ipAddress: '10.20.10.10',
      subnetMask: '255.255.255.192',
      mode: 'access',
      accessVlan: 10,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-a', interfaceId: 'Fa0/1' }
    }],
    defaultGateway: '10.20.10.1',
    dnsServer: '10.20.80.11',
    arpTable: [{ ipAddress: '10.20.10.1', macAddress: '00:1c:58:11:bb:01', interfaceId: 'eth0', type: 'DYNAMIC' }]
  },

  // VLAN 20: HR Endpoints
  {
    id: 'dev-hr-01',
    name: 'HR Lead Workstation',
    hostname: 'HR-PC-01',
    type: 'workstation',
    model: 'Lenovo ThinkCentre M90q Gen 3',
    location: 'Building 1 - HR Suite Rm 204',
    x: 150,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:01:20:01',
      ipAddress: '10.20.20.10',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 20,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-a', interfaceId: 'Fa0/2' }
    }],
    defaultGateway: '10.20.20.1',
    dnsServer: '10.20.80.11',
    arpTable: [
      { ipAddress: '10.20.20.1', macAddress: '00:1c:58:11:bb:01', interfaceId: 'eth0', type: 'DYNAMIC' },
      { ipAddress: '10.20.20.11', macAddress: '00:50:56:01:20:02', interfaceId: 'eth0', type: 'DYNAMIC' }
    ]
  },
  {
    id: 'dev-hr-02',
    name: 'Payroll Specialist PC',
    hostname: 'HR-PC-02',
    type: 'workstation',
    model: 'Lenovo ThinkCentre M90q Gen 3',
    location: 'Building 1 - HR Suite Rm 205',
    x: 220,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:01:20:02',
      ipAddress: '10.20.20.11',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 20,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-a', interfaceId: 'Fa0/3' }
    }],
    defaultGateway: '10.20.20.1',
    dnsServer: '10.20.80.11',
    arpTable: [{ ipAddress: '10.20.20.1', macAddress: '00:1c:58:11:bb:01', interfaceId: 'eth0', type: 'DYNAMIC' }]
  },

  // VLAN 30: Finance Endpoints
  {
    id: 'dev-fin-01',
    name: 'Chief Accountant PC',
    hostname: 'FIN-PC-01',
    type: 'workstation',
    model: 'HP EliteDesk 800 G9',
    location: 'Building 1 - Finance Vault Rm 210',
    x: 290,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:01:30:01',
      ipAddress: '10.20.30.10',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 30,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-a', interfaceId: 'Fa0/4' }
    }],
    defaultGateway: '10.20.30.1',
    dnsServer: '10.20.80.11',
    arpTable: [{ ipAddress: '10.20.30.1', macAddress: '00:1c:58:11:bb:01', interfaceId: 'eth0', type: 'DYNAMIC' }]
  },
  {
    id: 'dev-fin-02',
    name: 'Auditor Workstation',
    hostname: 'FIN-PC-02',
    type: 'workstation',
    model: 'HP EliteDesk 800 G9',
    location: 'Building 1 - Finance Vault Rm 212',
    x: 360,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:01:30:02',
      ipAddress: '10.20.30.11',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 30,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-a', interfaceId: 'Fa0/5' }
    }],
    defaultGateway: '10.20.30.1',
    dnsServer: '10.20.80.11'
  },

  // VLAN 40: Engineering & R&D
  {
    id: 'dev-eng-01',
    name: 'CAD Engineering Workstation',
    hostname: 'ENG-CAD-01',
    type: 'workstation',
    model: 'HP Z4 G5 Workstation (NVIDIA RTX A5000)',
    location: 'Building 2 - R&D Design Pod 1',
    x: 430,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:02:40:01',
      ipAddress: '10.20.40.10',
      subnetMask: '255.255.254.0',
      mode: 'access',
      accessVlan: 40,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-b', interfaceId: 'Fa0/2' }
    }],
    defaultGateway: '10.20.40.1',
    dnsServer: '10.20.80.11',
    arpTable: [{ ipAddress: '10.20.40.1', macAddress: '00:1c:58:11:bb:02', interfaceId: 'eth0', type: 'DYNAMIC' }]
  },
  {
    id: 'dev-eng-02',
    name: 'Firmware Developer PC',
    hostname: 'ENG-DEV-02',
    type: 'workstation',
    model: 'Apple Mac Studio M2 Ultra',
    location: 'Building 2 - Embedded Firmware Lab',
    x: 500,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:02:40:02',
      ipAddress: '10.20.40.11',
      subnetMask: '255.255.254.0',
      mode: 'access',
      accessVlan: 40,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-b', interfaceId: 'Fa0/3' }
    }],
    defaultGateway: '10.20.40.1',
    dnsServer: '10.20.80.11'
  },

  // VLAN 50: Production & OT
  {
    id: 'dev-prod-01',
    name: 'SCADA Master HMI Terminal',
    hostname: 'PROD-SCADA-01',
    type: 'workstation',
    model: 'Siemens SIMATIC Industrial IPC',
    location: 'Building 2 - Shopfloor Control Booth',
    x: 570,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:02:50:01',
      ipAddress: '10.20.50.10',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 50,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-b', interfaceId: 'Fa0/4' }
    }],
    defaultGateway: '10.20.50.1',
    dnsServer: '10.20.80.11',
    arpTable: [{ ipAddress: '10.20.50.1', macAddress: '00:1c:58:11:bb:02', interfaceId: 'eth0', type: 'DYNAMIC' }]
  },
  {
    id: 'dev-prod-02',
    name: 'Assembly Line PLC Controller',
    hostname: 'PROD-PLC-02',
    type: 'iot',
    model: 'Rockwell Allen-Bradley ControlLogix 5580',
    location: 'Building 2 - Robotic Line #3 Enclosure',
    x: 640,
    y: 520,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:02:50:02',
      ipAddress: '10.20.50.11',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 50,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-b', interfaceId: 'Fa0/5' }
    }],
    defaultGateway: '10.20.50.1'
  },

  // VLAN 60: Corporate Staff
  {
    id: 'dev-staff-01',
    name: 'Sales Manager Laptop',
    hostname: 'STAFF-LAPTOP-01',
    type: 'laptop',
    model: 'Dell Latitude 7440 Ultrabook',
    location: 'Building 3 - Open Office Desk 42',
    x: 740,
    y: 510,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:03:60:01',
      ipAddress: '10.20.60.10',
      subnetMask: '255.255.254.0',
      mode: 'access',
      accessVlan: 60,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Fa0/1' }
    }],
    defaultGateway: '10.20.60.1',
    dnsServer: '10.20.80.11',
    arpTable: [{ ipAddress: '10.20.60.1', macAddress: '00:1c:58:11:bb:03', interfaceId: 'eth0', type: 'DYNAMIC' }]
  },
  {
    id: 'dev-staff-02',
    name: 'Marketing Specialist Laptop',
    hostname: 'STAFF-LAPTOP-02',
    type: 'laptop',
    model: 'Dell Latitude 7440 Ultrabook',
    location: 'Building 3 - Creative Studio Desk 12',
    x: 810,
    y: 550,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:03:60:02',
      ipAddress: '10.20.60.11',
      subnetMask: '255.255.254.0',
      mode: 'access',
      accessVlan: 60,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Fa0/2' }
    }],
    defaultGateway: '10.20.60.1',
    dnsServer: '10.20.80.11'
  },

  // VLAN 70: Guest Wi-Fi (via Access Point)
  {
    id: 'dev-ap-01',
    name: 'Lobby Cisco Catalyst 9120 AP',
    hostname: 'AP-GUEST-01',
    type: 'access_point',
    model: 'Cisco Catalyst 9120AX Series Wi-Fi 6 AP',
    location: 'Building 3 - Visitor Reception Lobby',
    x: 880,
    y: 505,
    interfaces: [{
      id: 'eth0',
      name: 'GigabitEthernet0',
      macAddress: '00:50:56:03:70:00',
      ipAddress: '10.20.72.2',
      subnetMask: '255.255.252.0',
      mode: 'access',
      accessVlan: 70,
      adminStatus: 'up',
      speedMbps: 1000,
      connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Fa0/3' }
    }],
    defaultGateway: '10.20.72.1'
  },
  {
    id: 'dev-guest-01',
    name: 'Visitor iPhone (Guest Wi-Fi)',
    hostname: 'GUEST-PHONE-01',
    type: 'laptop',
    model: 'Apple iPhone 15 Pro (BYOD)',
    location: 'Building 3 - Visitor Lounge',
    x: 880,
    y: 575,
    interfaces: [{
      id: 'wlan0',
      name: 'Wi-Fi 6',
      macAddress: '00:50:56:03:70:01',
      ipAddress: '10.20.72.10',
      subnetMask: '255.255.252.0',
      mode: 'access',
      accessVlan: 70,
      adminStatus: 'up',
      speedMbps: 300,
      connectedTo: { deviceId: 'dev-ap-01', interfaceId: 'eth0' }
    }],
    defaultGateway: '10.20.72.1',
    dnsServer: '10.20.80.11',
    arpTable: [{ ipAddress: '10.20.72.1', macAddress: '00:1c:58:11:bb:03', interfaceId: 'wlan0', type: 'DYNAMIC' }]
  },

  // VLAN 80: Internal Core Servers
  {
    id: 'dev-srv-dc',
    name: 'Active Directory & DHCP Server',
    hostname: 'SRV-DC-DHCP',
    type: 'server',
    model: 'Dell PowerEdge R750 (Windows Server 2022 DC)',
    location: 'Data Center Rack A01',
    x: 1080,
    y: 340,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:03:80:01',
      ipAddress: '10.20.80.10',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 80,
      adminStatus: 'up',
      speedMbps: 10000,
      connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Fa0/4' }
    }],
    defaultGateway: '10.20.80.1',
    dnsServer: '10.20.80.11',
    dhcpLeases: [
      { ip: '10.20.20.10', mac: '00:50:56:01:20:01', hostname: 'HR-PC-01', vlanId: 20, leasedAt: Date.now() - 3600000 },
      { ip: '10.20.30.10', mac: '00:50:56:01:30:01', hostname: 'FIN-PC-01', vlanId: 30, leasedAt: Date.now() - 7200000 },
      { ip: '10.20.60.10', mac: '00:50:56:03:60:01', hostname: 'STAFF-LAPTOP-01', vlanId: 60, leasedAt: Date.now() - 1800000 },
      { ip: '10.20.72.10', mac: '00:50:56:03:70:01', hostname: 'GUEST-PHONE-01', vlanId: 70, leasedAt: Date.now() - 900000 }
    ]
  },
  {
    id: 'dev-srv-dns',
    name: 'Enterprise DNS Nameserver',
    hostname: 'SRV-DNS-AUTH',
    type: 'server',
    model: 'Cisco UCS C220 M6 (BIND9 / Unbound)',
    location: 'Data Center Rack A02',
    x: 1080,
    y: 400,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:03:80:02',
      ipAddress: '10.20.80.11',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 80,
      adminStatus: 'up',
      speedMbps: 10000,
      connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Fa0/5' }
    }],
    defaultGateway: '10.20.80.1',
    dnsRecords: [
      { domain: 'dc01.corp.internal', type: 'A', value: '10.20.80.10', ttl: 3600 },
      { domain: 'ns1.corp.internal', type: 'A', value: '10.20.80.11', ttl: 3600 },
      { domain: 'erp.corp.internal', type: 'A', value: '10.20.80.12', ttl: 3600 },
      { domain: 'printer-fl1.corp.internal', type: 'A', value: '10.20.90.10', ttl: 3600 },
      { domain: 'portal.dmz.corp', type: 'A', value: '10.20.100.10', ttl: 300 },
      { domain: 'vpn.dmz.corp', type: 'A', value: '10.20.100.11', ttl: 300 }
    ]
  },
  {
    id: 'dev-srv-erp',
    name: 'SAP ERP & Database Server',
    hostname: 'SRV-ERP-INTERNAL',
    type: 'server',
    model: 'Dell PowerEdge R840 Enterprise Database Node',
    location: 'Data Center Rack A03',
    x: 1080,
    y: 460,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:03:80:03',
      ipAddress: '10.20.80.12',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 80,
      adminStatus: 'up',
      speedMbps: 10000,
      connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Fa0/6' }
    }],
    defaultGateway: '10.20.80.1',
    dnsServer: '10.20.80.11'
  },

  // VLAN 90: Printers & IoT
  {
    id: 'dev-print-01',
    name: 'Floor 1 Office Multifunction Printer',
    hostname: 'PRINT-FLOOR1',
    type: 'printer',
    model: 'Canon imageRUNNER ADVANCE DX C5840i',
    location: 'Building 3 - Copier Alcove',
    x: 955,
    y: 510,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:03:90:01',
      ipAddress: '10.20.90.10',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 90,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Fa0/7' }
    }],
    defaultGateway: '10.20.90.1',
    dnsServer: '10.20.80.11'
  },
  {
    id: 'dev-iot-01',
    name: 'Building Management IoT Hub',
    hostname: 'IOT-SENSOR-HUB',
    type: 'iot',
    model: 'Schneider Electric EcoStruxure IoT Edge Gate',
    location: 'Building 3 - Utility Basement',
    x: 1025,
    y: 550,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:03:90:02',
      ipAddress: '10.20.90.11',
      subnetMask: '255.255.255.0',
      mode: 'access',
      accessVlan: 90,
      adminStatus: 'up',
      speedMbps: 100,
      connectedTo: { deviceId: 'dev-acc-sw-c', interfaceId: 'Fa0/8' }
    }],
    defaultGateway: '10.20.90.1'
  },

  // VLAN 100: DMZ Servers
  {
    id: 'dev-dmz-web',
    name: 'Public Corporate Portal (DMZ)',
    hostname: 'DMZ-WEB-PUBLIC',
    type: 'server',
    model: 'Supermicro 1U NGINX / Envoy Reverse Proxy',
    location: 'DMZ Enclave Rack',
    x: 950,
    y: 70,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:a1:00:10',
      ipAddress: '10.20.100.10',
      subnetMask: '255.255.255.224',
      mode: 'access',
      accessVlan: 100,
      adminStatus: 'up',
      speedMbps: 1000,
      connectedTo: { deviceId: 'dev-dmz-sw-01', interfaceId: 'Fa0/1' }
    }],
    defaultGateway: '10.20.100.1',
    dnsServer: '10.20.80.11'
  },
  {
    id: 'dev-dmz-vpn',
    name: 'Secure AnyConnect SSL VPN Gateway',
    hostname: 'DMZ-VPN-GATEWAY',
    type: 'server',
    model: 'Cisco Secure Client Remote Access Concentrator',
    location: 'DMZ Enclave Rack',
    x: 950,
    y: 130,
    interfaces: [{
      id: 'eth0',
      name: 'Ethernet0',
      macAddress: '00:50:56:a1:00:11',
      ipAddress: '10.20.100.11',
      subnetMask: '255.255.255.224',
      mode: 'access',
      accessVlan: 100,
      adminStatus: 'up',
      speedMbps: 1000,
      connectedTo: { deviceId: 'dev-dmz-sw-01', interfaceId: 'Fa0/2' }
    }],
    defaultGateway: '10.20.100.1',
    dnsServer: '10.20.80.11'
  },

  // External simulated targets
  {
    id: 'dev-ext-dns',
    name: 'Google Public DNS (8.8.8.8)',
    hostname: 'EXT-DNS-ROOT',
    type: 'server',
    model: 'Anycast DNS Resolver',
    location: 'Global WAN',
    x: 80,
    y: 30,
    interfaces: [{
      id: 'eth0',
      name: 'eth0',
      macAddress: '00:aa:bb:cc:dd:01',
      ipAddress: '8.8.8.8',
      subnetMask: '255.255.255.255',
      mode: 'routed',
      adminStatus: 'up',
      speedMbps: 10000,
      connectedTo: { deviceId: 'dev-cloud-01', interfaceId: 'eth0' }
    }],
    defaultGateway: '198.51.100.1'
  }
];

export const INITIAL_LINKS: NetworkLink[] = [
  // Internet Backbone Link: Root DNS to ISP Edge Router
  {
    id: 'link-internet-01',
    sourceDeviceId: 'dev-ext-dns',
    sourceInterfaceId: 'eth0',
    targetDeviceId: 'dev-cloud-01',
    targetInterfaceId: 'eth1',
    linkType: 'wan',
    status: 'up',
    colorHex: '#38bdf8'
  },
  // WAN Link: ISP to Firewall Outside
  {
    id: 'link-wan-01',
    sourceDeviceId: 'dev-cloud-01',
    sourceInterfaceId: 'eth0',
    targetDeviceId: 'dev-fw-01',
    targetInterfaceId: 'Gi1/1',
    linkType: 'wan',
    status: 'up',
    colorHex: '#38bdf8'
  },
  // Transit Link: Firewall Inside to Core L3 Switch
  {
    id: 'link-transit-01',
    sourceDeviceId: 'dev-fw-01',
    sourceInterfaceId: 'Gi1/2',
    targetDeviceId: 'dev-core-01',
    targetInterfaceId: 'Gi1/0/24',
    linkType: 'routed',
    status: 'up',
    colorHex: '#f59e0b'
  },
  // DMZ Link: Firewall to DMZ Switch
  {
    id: 'link-dmz-01',
    sourceDeviceId: 'dev-fw-01',
    sourceInterfaceId: 'Gi1/3',
    targetDeviceId: 'dev-dmz-sw-01',
    targetInterfaceId: 'Gi0/1',
    linkType: 'access',
    status: 'up',
    allowedVlans: [100],
    colorHex: '#ef4444'
  },
  // Trunk Link 1: Core to Access Switch A
  {
    id: 'link-trunk-01',
    sourceDeviceId: 'dev-core-01',
    sourceInterfaceId: 'Gi1/0/1',
    targetDeviceId: 'dev-acc-sw-a',
    targetInterfaceId: 'Gi0/1',
    linkType: 'trunk',
    status: 'up',
    allowedVlans: [10, 20, 30, 80],
    colorHex: '#a855f7'
  },
  // Trunk Link 2: Core to Access Switch B
  {
    id: 'link-trunk-02',
    sourceDeviceId: 'dev-core-01',
    sourceInterfaceId: 'Gi1/0/2',
    targetDeviceId: 'dev-acc-sw-b',
    targetInterfaceId: 'Gi0/1',
    linkType: 'trunk',
    status: 'up',
    allowedVlans: [10, 40, 50, 80],
    colorHex: '#a855f7'
  },
  // Trunk Link 3: Core to Access Switch C
  {
    id: 'link-trunk-03',
    sourceDeviceId: 'dev-core-01',
    sourceInterfaceId: 'Gi1/0/3',
    targetDeviceId: 'dev-acc-sw-c',
    targetInterfaceId: 'Gi0/1',
    linkType: 'trunk',
    status: 'up',
    allowedVlans: [10, 60, 70, 80, 90],
    colorHex: '#a855f7'
  },
  // Access Links - Switch A
  { id: 'link-a-fa1', sourceDeviceId: 'dev-acc-sw-a', sourceInterfaceId: 'Fa0/1', targetDeviceId: 'dev-mgmt-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#38bdf8' },
  { id: 'link-a-fa2', sourceDeviceId: 'dev-acc-sw-a', sourceInterfaceId: 'Fa0/2', targetDeviceId: 'dev-hr-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#ec4899' },
  { id: 'link-a-fa3', sourceDeviceId: 'dev-acc-sw-a', sourceInterfaceId: 'Fa0/3', targetDeviceId: 'dev-hr-02', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#ec4899' },
  { id: 'link-a-fa4', sourceDeviceId: 'dev-acc-sw-a', sourceInterfaceId: 'Fa0/4', targetDeviceId: 'dev-fin-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#10b981' },
  { id: 'link-a-fa5', sourceDeviceId: 'dev-acc-sw-a', sourceInterfaceId: 'Fa0/5', targetDeviceId: 'dev-fin-02', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#10b981' },
  // Access Links - Switch B
  { id: 'link-b-fa2', sourceDeviceId: 'dev-acc-sw-b', sourceInterfaceId: 'Fa0/2', targetDeviceId: 'dev-eng-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#8b5cf6' },
  { id: 'link-b-fa3', sourceDeviceId: 'dev-acc-sw-b', sourceInterfaceId: 'Fa0/3', targetDeviceId: 'dev-eng-02', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#8b5cf6' },
  { id: 'link-b-fa4', sourceDeviceId: 'dev-acc-sw-b', sourceInterfaceId: 'Fa0/4', targetDeviceId: 'dev-prod-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#f59e0b' },
  { id: 'link-b-fa5', sourceDeviceId: 'dev-acc-sw-b', sourceInterfaceId: 'Fa0/5', targetDeviceId: 'dev-prod-02', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#f59e0b' },
  // Access Links - Switch C
  { id: 'link-c-fa1', sourceDeviceId: 'dev-acc-sw-c', sourceInterfaceId: 'Fa0/1', targetDeviceId: 'dev-staff-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#06b6d4' },
  { id: 'link-c-fa2', sourceDeviceId: 'dev-acc-sw-c', sourceInterfaceId: 'Fa0/2', targetDeviceId: 'dev-staff-02', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#06b6d4' },
  { id: 'link-c-fa3', sourceDeviceId: 'dev-acc-sw-c', sourceInterfaceId: 'Fa0/3', targetDeviceId: 'dev-ap-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#f97316' },
  { id: 'link-c-fa4', sourceDeviceId: 'dev-acc-sw-c', sourceInterfaceId: 'Fa0/4', targetDeviceId: 'dev-srv-dc', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#3b82f6' },
  { id: 'link-c-fa5', sourceDeviceId: 'dev-acc-sw-c', sourceInterfaceId: 'Fa0/5', targetDeviceId: 'dev-srv-dns', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#3b82f6' },
  { id: 'link-c-fa6', sourceDeviceId: 'dev-acc-sw-c', sourceInterfaceId: 'Fa0/6', targetDeviceId: 'dev-srv-erp', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#3b82f6' },
  { id: 'link-c-fa7', sourceDeviceId: 'dev-acc-sw-c', sourceInterfaceId: 'Fa0/7', targetDeviceId: 'dev-print-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#14b8a6' },
  { id: 'link-c-fa8', sourceDeviceId: 'dev-acc-sw-c', sourceInterfaceId: 'Fa0/8', targetDeviceId: 'dev-iot-01', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#14b8a6' },
  // Access Links - DMZ Switch
  { id: 'link-dmz-fa1', sourceDeviceId: 'dev-dmz-sw-01', sourceInterfaceId: 'Fa0/1', targetDeviceId: 'dev-dmz-web', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#ef4444' },
  { id: 'link-dmz-fa2', sourceDeviceId: 'dev-dmz-sw-01', sourceInterfaceId: 'Fa0/2', targetDeviceId: 'dev-dmz-vpn', targetInterfaceId: 'eth0', linkType: 'access', status: 'up', colorHex: '#ef4444' }
];

export const INITIAL_NETWORK_STATE: NetworkState = {
  devices: INITIAL_DEVICES,
  links: INITIAL_LINKS,
  vlans: INITIAL_VLANS,
  transitSubnet: '10.20.254.0/30',
  activeFaults: [],
  validationResults: []
};
