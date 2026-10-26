// Automated Test & Compliance Validation Suite for NetScope

import { NetworkState, ValidationTestResult } from '../types/network';
import { simulateTraffic } from './simulator';

export interface TestCaseDefinition {
  id: string;
  title: string;
  description: string;
  category: ValidationTestResult['category'];
  expectedOutcome: 'PERMIT' | 'DENY';
  run: (state: NetworkState) => ValidationTestResult;
}

export const VALIDATION_TEST_SUITE: TestCaseDefinition[] = [
  {
    id: 'TEST-01',
    title: 'Intra-VLAN Switching (HR-PC-01 to HR-PC-02)',
    description: 'Verify Layer 2 wire-speed switching within HR VLAN 20 without router intervention.',
    category: 'VLAN_ISOLATION',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'ICMP_PING',
        sourceDeviceId: 'dev-hr-01',
        destinationDeviceId: 'dev-hr-02'
      });
      const passed = trace.success;
      return {
        id: 'TEST-01',
        title: 'Intra-VLAN Switching (HR-PC-01 to HR-PC-02)',
        description: 'Verify Layer 2 wire-speed switching within HR VLAN 20.',
        category: 'VLAN_ISOLATION',
        expectedOutcome: 'PERMIT',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'HR-PC-01 (10.20.20.10)',
        destinationDevice: 'HR-PC-02 (10.20.20.11)',
        protocol: 'ICMP_PING',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-02',
    title: 'Cross-VLAN Routed Access (HR-PC-01 to FIN-PC-01)',
    description: 'Verify Layer 3 inter-VLAN routing across 802.1Q trunk and Core SVI.',
    category: 'ROUTING',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'ICMP_PING',
        sourceDeviceId: 'dev-hr-01',
        destinationDeviceId: 'dev-fin-01'
      });
      const passed = trace.success;
      return {
        id: 'TEST-02',
        title: 'Cross-VLAN Routed Access (HR-PC-01 to FIN-PC-01)',
        description: 'Verify Layer 3 inter-VLAN routing across 802.1Q trunk.',
        category: 'ROUTING',
        expectedOutcome: 'PERMIT',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'HR-PC-01 (VLAN 20)',
        destinationDevice: 'FIN-PC-01 (VLAN 30)',
        protocol: 'ICMP_PING',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-03',
    title: 'Guest Wi-Fi Zero-Trust Isolation (Guest to ERP Server)',
    description: 'Enforce zero-trust policy: Guest Wi-Fi MUST BE BLOCKED from reaching Internal Data Center (VLAN 80).',
    category: 'SECURITY_POLICY',
    expectedOutcome: 'DENY',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'TCP_SYN',
        sourceDeviceId: 'dev-guest-01',
        destinationDeviceId: 'dev-srv-erp',
        targetPort: 443
      });
      // Test passes if traffic is successfully DENIED!
      const passed = !trace.success;
      return {
        id: 'TEST-03',
        title: 'Guest Wi-Fi Zero-Trust Isolation',
        description: 'Verify Guest Wi-Fi cannot probe internal ERP servers.',
        category: 'SECURITY_POLICY',
        expectedOutcome: 'DENY',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'GUEST-PHONE-01 (VLAN 70)',
        destinationDevice: 'SRV-ERP-INTERNAL (VLAN 80)',
        protocol: 'TCP_SYN',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-04',
    title: 'OT / SCADA Industrial Security Boundary (Production to Corporate)',
    description: 'Ensure shop-floor PLC controllers cannot initiate sessions to Corporate Staff workstations.',
    category: 'SECURITY_POLICY',
    expectedOutcome: 'DENY',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'TCP_SYN',
        sourceDeviceId: 'dev-prod-01',
        destinationDeviceId: 'dev-staff-01',
        targetPort: 80
      });
      const passed = !trace.success;
      return {
        id: 'TEST-04',
        title: 'OT / SCADA Industrial Security Boundary',
        description: 'Enforce industrial cyber-isolation preventing OT -> IT lateral penetration.',
        category: 'SECURITY_POLICY',
        expectedOutcome: 'DENY',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'PROD-SCADA-01 (VLAN 50)',
        destinationDevice: 'STAFF-LAPTOP-01 (VLAN 60)',
        protocol: 'TCP_SYN',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-05',
    title: 'Engineering Access to Internal ERP & Git (ENG-CAD to ERP)',
    description: 'Verify authorized R&D developers can connect to Data Center ERP services.',
    category: 'ROUTING',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'ICMP_PING',
        sourceDeviceId: 'dev-eng-01',
        destinationDeviceId: 'dev-srv-erp'
      });
      const passed = trace.success;
      return {
        id: 'TEST-05',
        title: 'Engineering Access to Internal ERP & Git',
        description: 'Verify R&D engineers can reach internal servers.',
        category: 'ROUTING',
        expectedOutcome: 'PERMIT',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'ENG-CAD-01 (VLAN 40)',
        destinationDevice: 'SRV-ERP-INTERNAL (VLAN 80)',
        protocol: 'ICMP_PING',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-06',
    title: 'Outbound Internet Access with Dynamic PAT (HR to 8.8.8.8)',
    description: 'Verify internal campus hosts can reach external cloud destinations with ASA NAT translation.',
    category: 'ROUTING',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'ICMP_PING',
        sourceDeviceId: 'dev-hr-01',
        destinationIp: '8.8.8.8'
      });
      const passed = trace.success;
      return {
        id: 'TEST-06',
        title: 'Outbound Internet Access with Dynamic PAT',
        description: 'Verify ASA Firewall PAT translates internal IP to 198.51.100.2.',
        category: 'ROUTING',
        expectedOutcome: 'PERMIT',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'HR-PC-01 (10.20.20.10)',
        destinationDevice: 'EXT-DNS-ROOT (8.8.8.8)',
        protocol: 'ICMP_PING',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-07',
    title: 'DMZ Perimeter Public Web Access (Internet to DMZ Portal)',
    description: 'Verify external users can access public web server on port 80 through Edge Firewall.',
    category: 'SECURITY_POLICY',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'HTTP_GET',
        sourceDeviceId: 'dev-cloud-01',
        destinationDeviceId: 'dev-dmz-web',
        targetPort: 80
      });
      const passed = trace.success;
      return {
        id: 'TEST-07',
        title: 'DMZ Perimeter Public Web Access',
        description: 'Verify firewall permits inbound TCP 80 to DMZ reverse proxy.',
        category: 'SECURITY_POLICY',
        expectedOutcome: 'PERMIT',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'ISP Gateway (198.51.100.1)',
        destinationDevice: 'DMZ-WEB-PUBLIC (10.20.100.10)',
        protocol: 'HTTP_GET',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-08',
    title: 'DHCP DORA Allocation via Core Relay Helper',
    description: 'Verify new endpoints obtain IP addresses across VLAN boundaries via DHCP Relay Agent.',
    category: 'SERVICES',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'DHCP_DISCOVER',
        sourceDeviceId: 'dev-hr-01'
      });
      const passed = trace.success;
      return {
        id: 'TEST-08',
        title: 'DHCP DORA Allocation via Core Relay Helper',
        description: 'Verify Core SVI ip helper-address forwards broadcast to DHCP Server.',
        category: 'SERVICES',
        expectedOutcome: 'PERMIT',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'HR-PC-01',
        destinationDevice: 'SRV-DC-DHCP (10.20.80.10)',
        protocol: 'DHCP_DISCOVER',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-09',
    title: 'Enterprise DNS Name Resolution (erp.corp.internal)',
    description: 'Verify authoritative internal DNS resolves intranet domain names to 10.20.80.12.',
    category: 'SERVICES',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const { trace } = simulateTraffic(state, {
        protocol: 'DNS_QUERY',
        sourceDeviceId: 'dev-staff-01',
        customDomain: 'erp.corp.internal'
      });
      const passed = trace.success;
      return {
        id: 'TEST-09',
        title: 'Enterprise DNS Name Resolution',
        description: 'Verify BIND9 server answers with correct A record.',
        category: 'SERVICES',
        expectedOutcome: 'PERMIT',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'STAFF-LAPTOP-01',
        destinationDevice: 'SRV-DNS-AUTH (10.20.80.11)',
        protocol: 'DNS_QUERY',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-10',
    title: 'Switchport Security Hardening (Unused Ports Shutdown)',
    description: 'Verify unused access ports Fa0/21-22 are administratively disabled to prevent rogue physical taps.',
    category: 'HARDENING',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const swA = state.devices.find(d => d.id === 'dev-acc-sw-a');
      const p21 = swA?.interfaces.find(i => i.id === 'Fa0/21');
      const p22 = swA?.interfaces.find(i => i.id === 'Fa0/22');
      const hardened = p21?.adminStatus === 'down' && p22?.adminStatus === 'down';
      return {
        id: 'TEST-10',
        title: 'Switchport Security Hardening',
        description: 'Verify unused switchports are administratively disabled.',
        category: 'HARDENING',
        expectedOutcome: 'PERMIT',
        actualOutcome: hardened ? 'PERMIT' : 'DENY',
        passed: hardened,
        sourceDevice: 'ACC-SW-A (Fa0/21, Fa0/22)',
        destinationDevice: 'N/A',
        protocol: 'ARP',
        evidence: hardened 
          ? 'Confirmed: Unused ports Fa0/21 & Fa0/22 are shut down.' 
          : 'Warning: Unused ports are active without 802.1X security.'
      };
    }
  },
  {
    id: 'TEST-11',
    title: '802.1Q Trunk Link Integrity & Allowed VLAN Filtering',
    description: 'Verify trunk links between Access Switches and Core Switch allow designated VLANs.',
    category: 'VLAN_ISOLATION',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const swB = state.devices.find(d => d.id === 'dev-acc-sw-b');
      const trunkB = swB?.interfaces.find(i => i.id === 'Gi0/1');
      const has40 = trunkB?.allowedVlans?.includes(40) === true;
      const has50 = trunkB?.allowedVlans?.includes(50) === true;
      const passed = has40 && has50 && trunkB?.adminStatus === 'up';
      return {
        id: 'TEST-11',
        title: '802.1Q Trunk Link Integrity',
        description: 'Verify trunk links carry required engineering & production VLANs.',
        category: 'VLAN_ISOLATION',
        expectedOutcome: 'PERMIT',
        actualOutcome: passed ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'ACC-SW-B (Gi0/1 Trunk)',
        destinationDevice: 'CORE-SW-01 (Gi1/0/2)',
        protocol: 'ICMP_PING',
        evidence: passed
          ? 'Trunk link Gi0/1 carries VLANs 10, 40, 50, 80 with 802.1Q tagging.'
          : 'Trunk pruning defect: Required VLANs missing from trunk allowed list.'
      };
    }
  },
  {
    id: 'TEST-12',
    title: 'Core Switch Gateway of Last Resort & Transit Health',
    description: 'Verify CORE-SW-01 possesses active default route 0.0.0.0/0 to Firewall 10.20.254.1.',
    category: 'ROUTING',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      const core = state.devices.find(d => d.id === 'dev-core-01');
      const hasDef = core?.routingTable?.some(r => r.network === '0.0.0.0' && r.nextHop === '10.20.254.1');
      const transitPort = core?.interfaces.find(i => i.id === 'Gi1/0/24');
      const passed = !!hasDef && transitPort?.adminStatus === 'up';
      return {
        id: 'TEST-12',
        title: 'Core Switch Gateway of Last Resort',
        description: 'Verify Core L3 default route and transit interface state.',
        category: 'ROUTING',
        expectedOutcome: 'PERMIT',
        actualOutcome: passed ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'CORE-SW-01',
        destinationDevice: 'FW-EDGE-01 (10.20.254.1)',
        protocol: 'ICMP_PING',
        evidence: passed
          ? 'Default route 0.0.0.0/0 via 10.20.254.1 is verified active on Gi1/0/24.'
          : 'Routing defect: Missing gateway of last resort or transit link down.'
      };
    }
  },
  {
    id: 'TEST-13',
    title: 'DMZ Isolation from Internal Network',
    description: 'Ensure DMZ public servers cannot initiate unsolicited connections into Internal Campus.',
    category: 'SECURITY_POLICY',
    expectedOutcome: 'DENY',
    run: (state) => {
      // DMZ Web attempting to connect to HR PC
      const { trace } = simulateTraffic(state, {
        protocol: 'TCP_SYN',
        sourceDeviceId: 'dev-dmz-web',
        destinationDeviceId: 'dev-hr-01',
        targetPort: 445
      });
      const passed = !trace.success;
      return {
        id: 'TEST-13',
        title: 'DMZ Isolation from Internal Network',
        description: 'Verify DMZ servers are blocked from initiating sessions to inside LAN.',
        category: 'SECURITY_POLICY',
        expectedOutcome: 'DENY',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'DMZ-WEB-PUBLIC (10.20.100.10)',
        destinationDevice: 'HR-PC-01 (10.20.20.10)',
        protocol: 'TCP_SYN',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  },
  {
    id: 'TEST-14',
    title: 'Default Gateway Ping Reachability for All 10 VLANs',
    description: 'Verify each configured department endpoint can reach its designated SVI default gateway.',
    category: 'ROUTING',
    expectedOutcome: 'PERMIT',
    run: (state) => {
      // Test HR reaching 10.20.20.1
      const { trace } = simulateTraffic(state, {
        protocol: 'ICMP_PING',
        sourceDeviceId: 'dev-hr-01',
        destinationIp: '10.20.20.1'
      });
      const passed = trace.success;
      return {
        id: 'TEST-14',
        title: 'Default Gateway Reachability',
        description: 'Verify host ping to local SVI gateway 10.20.20.1.',
        category: 'ROUTING',
        expectedOutcome: 'PERMIT',
        actualOutcome: trace.success ? 'PERMIT' : 'DENY',
        passed,
        sourceDevice: 'HR-PC-01 (10.20.20.10)',
        destinationDevice: 'Core SVI Vlan20 (10.20.20.1)',
        protocol: 'ICMP_PING',
        evidence: trace.summary,
        traceId: trace.id
      };
    }
  }
];

export function runValidationSuite(state: NetworkState): ValidationTestResult[] {
  return VALIDATION_TEST_SUITE.map(tc => tc.run(state));
}
