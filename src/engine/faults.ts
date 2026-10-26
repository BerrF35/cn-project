// Fault Lab Scenarios, Mutation Injections & Live Diagnostic Verifications

import { FaultScenario, NetworkState } from '../types/network';

export const FAULT_SCENARIOS: FaultScenario[] = [
  {
    id: 'fault-vlan-misconfig',
    title: 'Access Port Misassigned to Foreign VLAN',
    severity: 'HIGH',
    category: 'VLAN_MISCONFIG',
    objective: 'Restore connectivity for HR-PC-01 by diagnosing and reassigning its switchport back to HR VLAN 20.',
    symptoms: [
      'HR-PC-01 cannot ping its default gateway 10.20.20.1.',
      'HR-PC-01 cannot reach HR-PC-02 on what should be the same department subnet.',
      'ARP requests from HR-PC-01 are isolated inside Finance VLAN 30 and dropped.'
    ],
    diagnosticClues: [
      'Inspect ACC-SW-A interface Fa0/2 using "show vlan brief" or device inspector.',
      'Check if the port VLAN matches HR-PC-01 IP addressing (10.20.20.10/24).',
      'Look for VLAN ID 30 on port Fa0/2.'
    ],
    targetDeviceId: 'dev-acc-sw-a',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const sw = cloned.devices.find(d => d.id === 'dev-acc-sw-a');
      const port = sw?.interfaces.find(i => i.id === 'Fa0/2');
      if (port) {
        port.accessVlan = 30; // Put HR PC in Finance VLAN 30!
      }
      if (!cloned.activeFaults.includes('fault-vlan-misconfig')) {
        cloned.activeFaults.push('fault-vlan-misconfig');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const sw = cloned.devices.find(d => d.id === 'dev-acc-sw-a');
      const port = sw?.interfaces.find(i => i.id === 'Fa0/2');
      if (port) {
        port.accessVlan = 20; // Reassign back to VLAN 20
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-vlan-misconfig');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const sw = state.devices.find(d => d.id === 'dev-acc-sw-a');
      const port = sw?.interfaces.find(i => i.id === 'Fa0/2');
      const isFixed = port?.accessVlan === 20;
      return {
        isFixed,
        reason: isFixed
          ? 'Port Fa0/2 is correctly assigned to VLAN 20 (HR).'
          : `Port Fa0/2 is still assigned to VLAN ${port?.accessVlan} instead of VLAN 20.`
      };
    }
  },

  {
    id: 'fault-trunk-prune',
    title: 'Engineering VLAN 40 Pruned from 802.1Q Trunk',
    severity: 'CRITICAL',
    category: 'TRUNK_PRUNING',
    objective: 'Re-add VLAN 40 to trunk Gi0/1 allowed list on ACC-SW-B to restore Engineering R&D connectivity to Core.',
    symptoms: [
      'Engineering CAD workstation (ENG-CAD-01) cannot communicate with Internal Servers or other buildings.',
      'Trunk link Gi0/1 on ACC-SW-B drops all 802.1Q tagged frames with VID 40.',
      'Intra-VLAN local traffic on Switch B works, but all inter-switch traffic fails.'
    ],
    diagnosticClues: [
      'Run "show interfaces trunk" on ACC-SW-B or check Gi0/1 allowed VLAN list.',
      'Check if VLAN 40 is listed in "VLANs allowed on trunk".',
      'Notice that allowed list only contains [10, 50, 80], omitting 40.'
    ],
    targetDeviceId: 'dev-acc-sw-b',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const sw = cloned.devices.find(d => d.id === 'dev-acc-sw-b');
      const trunk = sw?.interfaces.find(i => i.id === 'Gi0/1');
      if (trunk) {
        trunk.allowedVlans = [10, 50, 80]; // Pruned 40!
      }
      if (!cloned.activeFaults.includes('fault-trunk-prune')) {
        cloned.activeFaults.push('fault-trunk-prune');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const sw = cloned.devices.find(d => d.id === 'dev-acc-sw-b');
      const trunk = sw?.interfaces.find(i => i.id === 'Gi0/1');
      if (trunk) {
        trunk.allowedVlans = [10, 40, 50, 80]; // Re-add 40
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-trunk-prune');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const sw = state.devices.find(d => d.id === 'dev-acc-sw-b');
      const trunk = sw?.interfaces.find(i => i.id === 'Gi0/1');
      const isFixed = trunk?.allowedVlans?.includes(40) === true;
      return {
        isFixed,
        reason: isFixed
          ? 'Trunk Gi0/1 includes VLAN 40 in its allowed VLAN list.'
          : 'Trunk Gi0/1 still prunes VLAN 40.'
      };
    }
  },

  {
    id: 'fault-port-shutdown',
    title: 'Core-to-Firewall Transit Port Shutdown',
    severity: 'CRITICAL',
    category: 'PORT_SHUTDOWN',
    objective: 'Re-enable GigabitEthernet1/0/24 on Core Switch to restore transit routing to Firewall and Internet.',
    symptoms: [
      'Entire campus loses all outbound Internet access.',
      'All internal devices fail to reach DMZ Public Web Portal.',
      'Core switch log shows: %LINK-5-CHANGED: Interface GigabitEthernet1/0/24, changed state to administratively down.'
    ],
    diagnosticClues: [
      'Run "show ip interface brief" on CORE-SW-01.',
      'Check status of Gi1/0/24.',
      'Issue "no shutdown" under interface Gi1/0/24.'
    ],
    targetDeviceId: 'dev-core-01',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const core = cloned.devices.find(d => d.id === 'dev-core-01');
      const iface = core?.interfaces.find(i => i.id === 'Gi1/0/24');
      if (iface) {
        iface.adminStatus = 'down';
      }
      const transitLink = cloned.links.find(l => l.id === 'link-transit-01');
      if (transitLink) {
        transitLink.status = 'down';
      }
      if (!cloned.activeFaults.includes('fault-port-shutdown')) {
        cloned.activeFaults.push('fault-port-shutdown');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const core = cloned.devices.find(d => d.id === 'dev-core-01');
      const iface = core?.interfaces.find(i => i.id === 'Gi1/0/24');
      if (iface) {
        iface.adminStatus = 'up';
      }
      const transitLink = cloned.links.find(l => l.id === 'link-transit-01');
      if (transitLink) {
        transitLink.status = 'up';
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-port-shutdown');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const core = state.devices.find(d => d.id === 'dev-core-01');
      const iface = core?.interfaces.find(i => i.id === 'Gi1/0/24');
      const isFixed = iface?.adminStatus === 'up';
      return {
        isFixed,
        reason: isFixed
          ? 'Transit interface Gi1/0/24 is UP and active.'
          : 'Transit interface Gi1/0/24 is still administratively DOWN.'
      };
    }
  },

  {
    id: 'fault-bad-gateway',
    title: 'Host Configured with Invalid Default Gateway',
    severity: 'HIGH',
    category: 'ROUTING_MISMATCH',
    objective: 'Reconfigure HR-PC-01 default gateway to 10.20.20.1 to allow routed outbound packets.',
    symptoms: [
      'HR-PC-01 can ping HR-PC-02 on same subnet.',
      'HR-PC-01 completely fails when attempting to ping ERP Server or Internet.',
      'Packet trace reveals host fails with "Network Unreachable: Gateway unreachable".'
    ],
    diagnosticClues: [
      'Inspect HR-PC-01 IP configuration.',
      'Observe Default Gateway is set to 10.20.99.1 instead of 10.20.20.1.',
      'The gateway does not belong to the local subnet 10.20.20.0/24.'
    ],
    targetDeviceId: 'dev-hr-01',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const dev = cloned.devices.find(d => d.id === 'dev-hr-01');
      if (dev) {
        dev.defaultGateway = '10.20.99.1';
      }
      if (!cloned.activeFaults.includes('fault-bad-gateway')) {
        cloned.activeFaults.push('fault-bad-gateway');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const dev = cloned.devices.find(d => d.id === 'dev-hr-01');
      if (dev) {
        dev.defaultGateway = '10.20.20.1';
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-bad-gateway');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const dev = state.devices.find(d => d.id === 'dev-hr-01');
      const isFixed = dev?.defaultGateway === '10.20.20.1';
      return {
        isFixed,
        reason: isFixed
          ? 'Default Gateway correctly set to 10.20.20.1.'
          : `Default Gateway is ${dev?.defaultGateway} instead of 10.20.20.1.`
      };
    }
  },

  {
    id: 'fault-blocking-acl',
    title: 'Errant ACL Denying Internal ERP Database Flow',
    severity: 'HIGH',
    category: 'ACL_DENIAL',
    objective: 'Remove or disable the faulty firewall/ACL rule blocking Corporate Staff from reaching ERP Server 10.20.80.12.',
    symptoms: [
      'Corporate Staff laptops (VLAN 60) receive "Connection Timed Out" when accessing ERP.',
      'ICMP Echo requests are dropped at the Layer 3 Core with ACL match indication.',
      'Firewall rule hit counter increments for deny rule.'
    ],
    diagnosticClues: [
      'Check Firewall rules or Core ACLs.',
      'Look for an accidental deny rule targeting destination 10.20.80.12.',
      'Notice rule "BLOCK_ALL_TO_ERP" in active state.'
    ],
    targetDeviceId: 'dev-fw-01',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const fw = cloned.devices.find(d => d.id === 'dev-fw-01');
      if (fw && fw.firewallRules) {
        fw.firewallRules.unshift({
          id: 'FW-FAULT-ERRANT',
          description: 'FAULT: Misconfigured blanket block to ERP server',
          sourceZone: 'ANY',
          destZone: 'INSIDE',
          sourceSubnet: 'ANY',
          destSubnet: '10.20.80.12/32',
          protocol: 'ANY',
          action: 'DENY',
          enabled: true,
          hitCount: 0
        });
      }
      if (!cloned.activeFaults.includes('fault-blocking-acl')) {
        cloned.activeFaults.push('fault-blocking-acl');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const fw = cloned.devices.find(d => d.id === 'dev-fw-01');
      if (fw && fw.firewallRules) {
        fw.firewallRules = fw.firewallRules.filter(r => r.id !== 'FW-FAULT-ERRANT');
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-blocking-acl');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const fw = state.devices.find(d => d.id === 'dev-fw-01');
      const hasBadRule = fw?.firewallRules?.some(r => r.id === 'FW-FAULT-ERRANT' && r.enabled);
      return {
        isFixed: !hasBadRule,
        reason: !hasBadRule
          ? 'Faulty ACL rule removed; legitimate ERP traffic flows unobstructed.'
          : 'Errant deny rule FW-FAULT-ERRANT is still active.'
      };
    }
  },

  {
    id: 'fault-dhcp-scope',
    title: 'Missing DHCP Relay (ip helper-address) on SVI',
    severity: 'MEDIUM',
    category: 'DHCP_FAULT',
    objective: 'Reconfigure "ip helper-address 10.20.80.10" under interface Vlan20 on CORE-SW-01.',
    symptoms: [
      'New HR workstations fail to obtain an IP lease and default to APIPA 169.254.x.x.',
      'DHCP Discover broadcasts terminate at SVI Vlan20 without being forwarded to DHCP server.',
      'DHCP server receives 0 requests from VLAN 20.'
    ],
    diagnosticClues: [
      'Inspect CORE-SW-01 SVI Vlan20 configuration.',
      'Check if "ip helper-address" is configured.',
      'Observe that helper address is missing on Vlan20.'
    ],
    targetDeviceId: 'dev-core-01',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const core = cloned.devices.find(d => d.id === 'dev-core-01');
      const svi = core?.svis?.find(s => s.vlanId === 20);
      if (svi) {
        delete svi.ipHelperAddress;
      }
      if (!cloned.activeFaults.includes('fault-dhcp-scope')) {
        cloned.activeFaults.push('fault-dhcp-scope');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const core = cloned.devices.find(d => d.id === 'dev-core-01');
      const svi = core?.svis?.find(s => s.vlanId === 20);
      if (svi) {
        svi.ipHelperAddress = '10.20.80.10';
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-dhcp-scope');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const core = state.devices.find(d => d.id === 'dev-core-01');
      const svi = core?.svis?.find(s => s.vlanId === 20);
      const isFixed = svi?.ipHelperAddress === '10.20.80.10';
      return {
        isFixed,
        reason: isFixed
          ? 'DHCP Relay helper address 10.20.80.10 is active on Vlan20.'
          : 'SVI Vlan20 is missing ip helper-address.'
      };
    }
  },

  {
    id: 'fault-rogue-dhcp',
    title: 'Rogue DHCP Server Poisoning Default Gateway',
    severity: 'HIGH',
    category: 'ROGUE_ATTACK',
    objective: 'Isolate rogue DHCP server and enable DHCP Snooping on untrusted access ports.',
    symptoms: [
      'Clients in VLAN 60 report being redirected to malicious gateway 10.20.60.250.',
      'Man-in-the-middle sniffing detected on untrusted access port Fa0/2.',
      'Legitimate DHCP ACK messages are being raced by rogue server.'
    ],
    diagnosticClues: [
      'Inspect connected devices on ACC-SW-C.',
      'Look for an unauthorized host advertising rogue DHCP replies.',
      'Disable rogue DHCP server or shutdown the offending access port.'
    ],
    targetDeviceId: 'dev-acc-sw-c',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const dev = cloned.devices.find(d => d.id === 'dev-staff-02');
      if (dev) {
        dev.rogueDhcpEnabled = true;
      }
      if (!cloned.activeFaults.includes('fault-rogue-dhcp')) {
        cloned.activeFaults.push('fault-rogue-dhcp');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const dev = cloned.devices.find(d => d.id === 'dev-staff-02');
      if (dev) {
        dev.rogueDhcpEnabled = false;
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-rogue-dhcp');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const dev = state.devices.find(d => d.id === 'dev-staff-02');
      const isFixed = dev?.rogueDhcpEnabled !== true;
      return {
        isFixed,
        reason: isFixed
          ? 'Rogue DHCP server disabled and untrusted port sanitized.'
          : 'Rogue DHCP service is still active on the network.'
      };
    }
  },

  {
    id: 'fault-native-vlan',
    title: '802.1Q Native VLAN Mismatch on Trunk Link',
    severity: 'MEDIUM',
    category: 'VLAN_MISCONFIG',
    objective: 'Align native VLAN on ACC-SW-A Gi0/1 (set native vlan 1) to match Core Switch.',
    symptoms: [
      'Switch console logs %CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (999), with CORE-SW-01 GigabitEthernet1/0/1 (1).',
      'Untagged frames transmitted from SW-A bleed into VLAN 1 on Core.',
      'Spanning-tree PVID inconsistencies cause port blocking.'
    ],
    diagnosticClues: [
      'Inspect ACC-SW-A Gi0/1 native VLAN setting.',
      'Observe native VLAN is 999 while Core expects 1.',
      'Execute: "switchport trunk native vlan 1" on Gi0/1.'
    ],
    targetDeviceId: 'dev-acc-sw-a',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const sw = cloned.devices.find(d => d.id === 'dev-acc-sw-a');
      const trunk = sw?.interfaces.find(i => i.id === 'Gi0/1');
      if (trunk) {
        trunk.nativeVlan = 999;
      }
      if (!cloned.activeFaults.includes('fault-native-vlan')) {
        cloned.activeFaults.push('fault-native-vlan');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const sw = cloned.devices.find(d => d.id === 'dev-acc-sw-a');
      const trunk = sw?.interfaces.find(i => i.id === 'Gi0/1');
      if (trunk) {
        trunk.nativeVlan = 1;
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-native-vlan');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const sw = state.devices.find(d => d.id === 'dev-acc-sw-a');
      const trunk = sw?.interfaces.find(i => i.id === 'Gi0/1');
      const isFixed = trunk?.nativeVlan === 1;
      return {
        isFixed,
        reason: isFixed
          ? 'Trunk native VLAN is synchronized to VLAN 1.'
          : `Trunk native VLAN is set to ${trunk?.nativeVlan} (mismatch!).`
      };
    }
  },

  {
    id: 'fault-bad-dns',
    title: 'DNS Host Record Poisoned / Incorrect IP',
    severity: 'MEDIUM',
    category: 'DNS_FAULT',
    objective: 'Correct the DNS A record for "erp.corp.internal" on SRV-DNS-AUTH to point to 10.20.80.12.',
    symptoms: [
      'Users typing http://erp.corp.internal receive DNS resolution pointing to invalid IP 192.0.2.1.',
      'Application traffic attempts to connect to wrong host and fails.',
      'DNS query returns incorrect authoritative A record.'
    ],
    diagnosticClues: [
      'Inspect DNS records on SRV-DNS-AUTH.',
      'Look for erp.corp.internal record.',
      'Notice IP is 192.0.2.1 instead of 10.20.80.12.'
    ],
    targetDeviceId: 'dev-srv-dns',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const dns = cloned.devices.find(d => d.id === 'dev-srv-dns');
      const rec = dns?.dnsRecords?.find(r => r.domain === 'erp.corp.internal');
      if (rec) {
        rec.value = '192.0.2.1';
      }
      if (!cloned.activeFaults.includes('fault-bad-dns')) {
        cloned.activeFaults.push('fault-bad-dns');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const dns = cloned.devices.find(d => d.id === 'dev-srv-dns');
      const rec = dns?.dnsRecords?.find(r => r.domain === 'erp.corp.internal');
      if (rec) {
        rec.value = '10.20.80.12';
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-bad-dns');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const dns = state.devices.find(d => d.id === 'dev-srv-dns');
      const rec = dns?.dnsRecords?.find(r => r.domain === 'erp.corp.internal');
      const isFixed = rec?.value === '10.20.80.12';
      return {
        isFixed,
        reason: isFixed
          ? 'DNS record correctly maps erp.corp.internal -> 10.20.80.12.'
          : `DNS record maps to ${rec?.value} instead of 10.20.80.12.`
      };
    }
  },

  {
    id: 'fault-transit-route',
    title: 'Missing Core Switch Default Route (0.0.0.0/0)',
    severity: 'CRITICAL',
    category: 'ROUTING_MISMATCH',
    objective: 'Add "ip route 0.0.0.0 0.0.0.0 10.20.254.1" to CORE-SW-01 routing table.',
    symptoms: [
      'Internal campus hosts can communicate between VLANs, but cannot reach DMZ or Internet.',
      'Core switch CEF FIB drops packets destined outside 10.20.0.0/16 with "No gateway of last resort".',
      'Ping to 8.8.8.8 fails immediately at Core hop.'
    ],
    diagnosticClues: [
      'Run "show ip route" on CORE-SW-01.',
      'Notice absence of "Gateway of last resort".',
      'Static route to 10.20.254.1 is missing.'
    ],
    targetDeviceId: 'dev-core-01',
    inject: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const core = cloned.devices.find(d => d.id === 'dev-core-01');
      if (core && core.routingTable) {
        core.routingTable = core.routingTable.filter(r => r.network !== '0.0.0.0');
      }
      if (!cloned.activeFaults.includes('fault-transit-route')) {
        cloned.activeFaults.push('fault-transit-route');
      }
      return cloned;
    },
    repair: (state: NetworkState) => {
      const cloned = JSON.parse(JSON.stringify(state)) as NetworkState;
      const core = cloned.devices.find(d => d.id === 'dev-core-01');
      if (core) {
        core.routingTable = core.routingTable || [];
        if (!core.routingTable.some(r => r.network === '0.0.0.0')) {
          core.routingTable.unshift({
            id: 'cr1',
            network: '0.0.0.0',
            mask: '0.0.0.0',
            nextHop: '10.20.254.1',
            interfaceId: 'Gi1/0/24',
            protocol: 'S',
            metric: 1
          });
        }
      }
      cloned.activeFaults = cloned.activeFaults.filter(f => f !== 'fault-transit-route');
      return cloned;
    },
    verifyFixed: (state: NetworkState) => {
      const core = state.devices.find(d => d.id === 'dev-core-01');
      const hasDefRoute = core?.routingTable?.some(r => r.network === '0.0.0.0' && r.nextHop === '10.20.254.1');
      return {
        isFixed: !!hasDefRoute,
        reason: hasDefRoute
          ? 'Default route 0.0.0.0/0 via 10.20.254.1 is present.'
          : 'Core switch is missing default route to Firewall.'
      };
    }
  }
];
