// Cisco IOS & ASA Configuration Generation & Interactive CLI Engine for NetScope

import { NetworkDevice, NetworkState, NetworkInterface, VlanDefinition } from '../types/network';

export type CliMode = 'USER' | 'PRIVILEGED' | 'CONFIG' | 'CONFIG_IF' | 'CONFIG_VLAN';

export interface CliSession {
  deviceId: string;
  mode: CliMode;
  currentInterfaceId?: string;
  currentVlanId?: number;
  history: string[];
}

export function generateCiscoConfig(device: NetworkDevice, vlans: VlanDefinition[]): string {
  if (device.type === 'l2_switch') {
    return generateCatalyst2960Config(device, vlans);
  } else if (device.type === 'l3_core') {
    return generateCatalyst3850Config(device, vlans);
  } else if (device.type === 'firewall') {
    return generateAsaConfig(device);
  } else {
    return generateHostConfig(device);
  }
}

function generateCatalyst2960Config(device: NetworkDevice, vlans: VlanDefinition[]): string {
  const lines: string[] = [
    `! Last configuration change at ${new Date().toISOString()}`,
    `! NVRAM config last updated by NetScope Simulator`,
    `version 15.2`,
    `service timestamps debug datetime msec`,
    `service timestamps log datetime msec`,
    `no service password-encryption`,
    `!`,
    `hostname ${device.hostname}`,
    `!`,
    `boot-start-marker`,
    `boot-end-marker`,
    `!`,
    `spanning-tree mode rapid-pvst`,
    `spanning-tree extend system-id`,
    `!`,
    `! --- VLAN Database Provisioning ---`
  ];

  for (const v of vlans) {
    if (v.id < 100) {
      lines.push(`vlan ${v.id}`);
      lines.push(` name ${v.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
    }
  }

  lines.push(`!`, `! --- Interface Port Allocations ---`);

  for (const iface of device.interfaces) {
    lines.push(`interface ${iface.name}`);
    if (iface.mode === 'trunk') {
      lines.push(` description 802.1Q High-Speed Trunk Uplink to Core`);
      lines.push(` switchport mode trunk`);
      lines.push(` switchport trunk encapsulation dot1q`);
      lines.push(` switchport trunk allowed vlan ${iface.allowedVlans?.join(',') || 'all'}`);
      lines.push(` switchport trunk native vlan ${iface.nativeVlan || 1}`);
      lines.push(` spanning-tree portfast trunk`);
    } else {
      lines.push(` description Access Port for Host Endpoints`);
      lines.push(` switchport mode access`);
      lines.push(` switchport access vlan ${iface.accessVlan || 1}`);
      lines.push(` spanning-tree portfast`);
      lines.push(` switchport port-security`);
      lines.push(` switchport port-security maximum 2`);
      lines.push(` switchport port-security violation restrict`);
    }

    if (iface.adminStatus === 'down') {
      lines.push(` shutdown`);
    } else {
      lines.push(` no shutdown`);
    }
    lines.push(`!`);
  }

  lines.push(
    `interface Vlan10`,
    ` description In-band Management SVI`,
    ` ip address 10.20.10.${device.id === 'dev-acc-sw-a' ? '2' : device.id === 'dev-acc-sw-b' ? '3' : '4'} 255.255.255.192`,
    ` no shutdown`,
    `!`,
    `ip default-gateway 10.20.10.1`,
    `!`,
    `line con 0`,
    ` logging synchronous`,
    `line vty 0 4`,
    ` transport input ssh`,
    ` login local`,
    `!`,
    `end`
  );

  return lines.join('\n');
}

function generateCatalyst3850Config(device: NetworkDevice, vlans: VlanDefinition[]): string {
  const lines: string[] = [
    `! Catalyst 3850-24T Layer 3 Core Campus Switch`,
    `version 16.9.4`,
    `hostname ${device.hostname}`,
    `!`,
    `ip routing`,
    `ip cef`,
    `!`,
    `spanning-tree mode rapid-pvst`,
    `spanning-tree vlan 1-4094 priority 4096`,
    `!`,
    `! --- Routed Transit Link to Firewall ---`,
    `interface GigabitEthernet1/0/24`,
    ` description Routed Point-to-Point Link to Edge Firewall Gi1/2`,
    ` no switchport`,
    ` ip address 10.20.254.2 255.255.255.252`,
    ` no shutdown`,
    `!`,
    `! --- Trunk Uplinks to Access Switches ---`
  ];

  for (const iface of device.interfaces.filter(i => i.mode === 'trunk')) {
    lines.push(`interface ${iface.name}`);
    lines.push(` switchport mode trunk`);
    lines.push(` switchport trunk encapsulation dot1q`);
    lines.push(` switchport trunk allowed vlan ${iface.allowedVlans?.join(',') || 'all'}`);
    lines.push(` switchport trunk native vlan ${iface.nativeVlan || 1}`);
    lines.push(` no shutdown`);
    lines.push(`!`);
  }

  lines.push(`! --- Switch Virtual Interfaces (SVIs) & Default Gateways ---`);

  if (device.svis) {
    for (const svi of device.svis) {
      lines.push(`interface Vlan${svi.vlanId}`);
      lines.push(` description Gateway for VLAN ${svi.vlanId}`);
      lines.push(` ip address ${svi.ipAddress} ${svi.subnetMask}`);
      if (svi.ipHelperAddress) {
        lines.push(` ip helper-address ${svi.ipHelperAddress}`);
      }
      lines.push(` no shutdown`);
      lines.push(`!`);
    }
  }

  lines.push(`! --- Static Core Routing Table ---`);
  lines.push(`ip route 0.0.0.0 0.0.0.0 10.20.254.1`);
  lines.push(`!`);
  lines.push(`! --- Security Access-Control Lists (ACLs) ---`);
  lines.push(`ip access-list extended BLOCK_GUEST_TO_INTERNAL`);
  lines.push(` remark Block guest Wi-Fi from reaching internal server farm`);
  lines.push(` deny ip 10.20.72.0 0.0.3.255 10.20.80.0 0.0.0.255`);
  lines.push(` permit ip any any`);
  lines.push(`!`);
  lines.push(`ip access-list extended BLOCK_OT_TO_CORP`);
  lines.push(` remark Prevent industrial OT devices from probing corporate endpoints`);
  lines.push(` deny ip 10.20.50.0 0.0.0.255 10.20.60.0 0.0.1.255`);
  lines.push(` permit ip any any`);
  lines.push(`!`, `end`);

  return lines.join('\n');
}

function generateAsaConfig(device: NetworkDevice): string {
  return [
    `: Cisco Adaptive Security Appliance Version 9.14(2)`,
    `: Device: ${device.model}`,
    `!`,
    `hostname ${device.hostname}`,
    `!`,
    `interface GigabitEthernet1/1`,
    ` nameif outside`,
    ` security-level 0`,
    ` ip address 198.51.100.2 255.255.255.252`,
    ` no shutdown`,
    `!`,
    `interface GigabitEthernet1/2`,
    ` nameif inside`,
    ` security-level 100`,
    ` ip address 10.20.254.1 255.255.255.252`,
    ` no shutdown`,
    `!`,
    `interface GigabitEthernet1/3`,
    ` nameif dmz`,
    ` security-level 50`,
    ` ip address 10.20.100.1 255.255.255.224`,
    ` no shutdown`,
    `!`,
    `object network OBJ_INTERNAL_CAMPUS`,
    ` subnet 10.20.0.0 255.255.0.0`,
    ` nat (inside,outside) dynamic interface`,
    `!`,
    `object network OBJ_DMZ_WEB`,
    ` host 10.20.100.10`,
    `!`,
    `access-list OUTSIDE_ACCESS extended permit tcp any host 10.20.100.10 eq 80`,
    `access-list OUTSIDE_ACCESS extended permit tcp any host 10.20.100.10 eq 443`,
    `access-group OUTSIDE_ACCESS in interface outside`,
    `!`,
    `route outside 0.0.0.0 0.0.0.0 198.51.100.1 1`,
    `route inside 10.20.0.0 255.255.0.0 10.20.254.2 1`,
    `!`,
    `policy-map global_policy`,
    ` class inspection_default`,
    `  inspect dns`,
    `  inspect http`,
    `  inspect icmp`,
    `!`,
    `service-policy global_policy global`,
    `!`,
    `: end`
  ].join('\n');
}

function generateHostConfig(device: NetworkDevice): string {
  const iface = device.interfaces[0];
  return [
    `# Linux / Unix Network Configuration for ${device.hostname}`,
    `# Interface: ${iface.name} (${iface.macAddress})`,
    `iface ${iface.name} inet static`,
    `    address ${iface.ipAddress || 'DHCP'}`,
    `    netmask ${iface.subnetMask || '255.255.255.0'}`,
    `    gateway ${device.defaultGateway || 'N/A'}`,
    `    dns-nameservers ${device.dnsServer || '10.20.80.11'}`,
    `    vlan-id ${iface.accessVlan || 'Untagged'}`
  ].join('\n');
}

export function executeCliCommand(
  state: NetworkState,
  session: CliSession,
  rawInput: string
): { updatedState: NetworkState; updatedSession: CliSession; output: string } {
  const input = rawInput.trim();
  const lower = input.toLowerCase();
  const parts = input.split(/\s+/);
  const targetDev = state.devices.find(d => d.id === session.deviceId);

  if (!targetDev) {
    return {
      updatedState: state,
      updatedSession: session,
      output: `% Error: Device ${session.deviceId} not found.`
    };
  }

  // Clone devices to apply changes
  const newDevices = JSON.parse(JSON.stringify(state.devices)) as NetworkDevice[];
  const dev = newDevices.find(d => d.id === targetDev.id)!;
  let newMode = session.mode;
  let newIf = session.currentInterfaceId;
  let newVlan = session.currentVlanId;
  let output = '';

  // --- HELP COMMAND ---
  if (lower === '?' || lower === 'help') {
    if (newMode === 'USER') {
      output = `Exec commands:
  enable             Turn on privileged commands
  show               Show running system information
  ping               Send ICMP echo request
  exit               Exit from the EXEC`;
    } else if (newMode === 'PRIVILEGED') {
      output = `Privileged commands:
  configure terminal Enter configuration mode
  show running-config Show active configuration
  show vlan brief    Display VLAN status table
  show ip int brief  Summary of interface IP addresses & status
  show mac address-table Display switch CAM table
  show arp           Display ARP cache
  show ip route      Display IP routing table
  disable            Turn off privileged commands
  exit               Exit console`;
    } else if (newMode === 'CONFIG') {
      output = `Global config commands:
  interface <name>   Select an interface to configure (e.g. interface Fa0/2, Gi0/1)
  vlan <id>          Configure VLAN (e.g. vlan 20)
  ip route <net> <mask> <next-hop> Add static route
  exit               Exit from configure mode
  end                Exit to privileged EXEC`;
    } else if (newMode === 'CONFIG_IF') {
      output = `Interface config commands:
  switchport mode access | trunk
  switchport access vlan <id>
  switchport trunk allowed vlan [add|remove|all] <vlans>
  ip address <ip> <netmask>
  shutdown
  no shutdown
  exit / end`;
    }
  }
  // --- MODE NAVIGATION ---
  else if (lower === 'enable') {
    newMode = 'PRIVILEGED';
  } else if (lower === 'disable') {
    newMode = 'USER';
  } else if (lower === 'configure terminal' || lower === 'conf t') {
    if (newMode === 'PRIVILEGED') {
      newMode = 'CONFIG';
      output = 'Enter configuration commands, one per line. End with CNTL/Z or "end".';
    } else {
      output = '% Permission denied. Enter "enable" first.';
    }
  } else if (lower === 'end') {
    newMode = 'PRIVILEGED';
    newIf = undefined;
    newVlan = undefined;
  } else if (lower === 'exit') {
    if (newMode === 'CONFIG_IF' || newMode === 'CONFIG_VLAN') {
      newMode = 'CONFIG';
      newIf = undefined;
      newVlan = undefined;
    } else if (newMode === 'CONFIG') {
      newMode = 'PRIVILEGED';
    } else if (newMode === 'PRIVILEGED') {
      newMode = 'USER';
    } else {
      output = '% Connection closed.';
    }
  }

  // --- SHOW COMMANDS ---
  else if (lower === 'show running-config' || lower === 'sh run') {
    output = generateCiscoConfig(dev, state.vlans);
  } else if (lower === 'show vlan brief' || lower === 'sh vlan') {
    output = `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/21, Fa0/22\n`;
    for (const v of state.vlans) {
      const assignedPorts = dev.interfaces
        .filter(i => i.mode === 'access' && i.accessVlan === v.id && i.adminStatus === 'up')
        .map(i => i.name)
        .join(', ');
      output += `${v.id.toString().padEnd(5)}${v.name.padEnd(33)}active    ${assignedPorts || 'None'}\n`;
    }
  } else if (lower === 'show ip interface brief' || lower === 'sh ip int br') {
    output = `Interface                  IP-Address      OK? Method Status                Protocol\n`;
    for (const iface of dev.interfaces) {
      const ip = iface.ipAddress || 'unassigned';
      const status = iface.adminStatus === 'up' ? 'up' : 'administratively down';
      const proto = iface.adminStatus === 'up' ? 'up' : 'down';
      output += `${iface.name.padEnd(27)}${ip.padEnd(16)}YES manual ${status.padEnd(22)}${proto}\n`;
    }
    if (dev.svis) {
      for (const svi of dev.svis) {
        output += `Vlan${svi.vlanId.toString().padEnd(23)}${svi.ipAddress.padEnd(16)}YES manual up                    up\n`;
      }
    }
  } else if (lower === 'show mac address-table' || lower === 'sh mac') {
    output = `          Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
`;
    if (dev.macTable && dev.macTable.length > 0) {
      for (const entry of dev.macTable) {
        output += `${entry.vlanId.toString().padEnd(8)}${entry.macAddress.padEnd(18)}${entry.type.padEnd(12)}${entry.port}\n`;
      }
    } else {
      output += `% No dynamic MAC entries recorded in CAM table.\n`;
    }
  } else if (lower === 'show arp') {
    output = `Protocol  Address          Age (min)  Hardware Addr   Type   Interface\n`;
    if (dev.arpTable && dev.arpTable.length > 0) {
      for (const entry of dev.arpTable) {
        output += `Internet  ${entry.ipAddress.padEnd(17)}-          ${entry.macAddress.padEnd(16)}ARPA   ${entry.interfaceId}\n`;
      }
    } else {
      output += `% ARP cache empty.\n`;
    }
  } else if (lower === 'show ip route' || lower === 'sh ip route') {
    output = `Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area

Gateway of last resort is 10.20.254.1 to network 0.0.0.0

`;
    if (dev.routingTable) {
      for (const r of dev.routingTable) {
        if (r.nextHop === 'DIRECT') {
          output += `${r.protocol}     ${r.network}/${r.mask} is directly connected, ${r.interfaceId}\n`;
        } else {
          output += `${r.protocol}*    ${r.network}/${r.mask} [1/0] via ${r.nextHop}, ${r.interfaceId}\n`;
        }
      }
    }
  }

  // --- CONFIGURATION COMMANDS ---
  else if (newMode === 'CONFIG') {
    if (parts[0].toLowerCase() === 'interface' || parts[0].toLowerCase() === 'int') {
      const ifName = parts[1];
      const matched = dev.interfaces.find(
        i => i.name.toLowerCase() === ifName.toLowerCase() || i.id.toLowerCase() === ifName.toLowerCase()
      );
      if (matched) {
        newMode = 'CONFIG_IF';
        newIf = matched.id;
        output = '';
      } else {
        output = `% Invalid interface identifier: ${ifName}`;
      }
    } else if (parts[0].toLowerCase() === 'vlan') {
      const vlanId = parseInt(parts[1], 10);
      if (!isNaN(vlanId) && vlanId > 0 && vlanId < 4095) {
        newMode = 'CONFIG_VLAN';
        newVlan = vlanId;
        output = '';
      } else {
        output = `% Invalid VLAN number: ${parts[1]}`;
      }
    } else if (lower.startsWith('ip route')) {
      const net = parts[2];
      const mask = parts[3];
      const nextHop = parts[4];
      if (net && mask && nextHop) {
        dev.routingTable = dev.routingTable || [];
        dev.routingTable.push({
          id: `rt-${Date.now()}`,
          network: net,
          mask,
          nextHop,
          interfaceId: 'Gi1/0/24',
          protocol: 'S',
          metric: 1
        });
        output = `Added static route: ${net} ${mask} via ${nextHop}`;
      } else {
        output = '% Incomplete command. Syntax: ip route <network> <mask> <next-hop>';
      }
    } else {
      output = `% Unrecognized command in global config mode: "${input}". Type ? for help.`;
    }
  }

  // --- INTERFACE CONFIG COMMANDS ---
  else if (newMode === 'CONFIG_IF') {
    const curIface = dev.interfaces.find(i => i.id === newIf);
    if (!curIface) {
      output = '% Error: No interface currently selected.';
    } else {
      if (lower === 'shutdown') {
        curIface.adminStatus = 'down';
        output = `% LINK-5-CHANGED: Interface ${curIface.name}, changed state to administratively down`;
      } else if (lower === 'no shutdown') {
        curIface.adminStatus = 'up';
        output = `% LINK-3-UPDOWN: Interface ${curIface.name}, changed state to up\n% LINEPROTO-5-UPDOWN: Line protocol on Interface ${curIface.name}, changed state to up`;
      } else if (lower.startsWith('switchport mode access')) {
        curIface.mode = 'access';
        output = '';
      } else if (lower.startsWith('switchport mode trunk')) {
        curIface.mode = 'trunk';
        curIface.allowedVlans = curIface.allowedVlans || [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];
        output = '';
      } else if (lower.startsWith('switchport access vlan')) {
        const vlanId = parseInt(parts[3], 10);
        if (!isNaN(vlanId)) {
          curIface.accessVlan = vlanId;
          output = '';
        } else {
          output = '% Invalid VLAN ID.';
        }
      } else if (lower.startsWith('switchport trunk allowed vlan')) {
        // e.g. switchport trunk allowed vlan 10,20,30,80 or add 40
        const sub = parts[4];
        if (sub === 'add') {
          const toAdd = parts[5].split(',').map(Number).filter(n => !isNaN(n));
          curIface.allowedVlans = Array.from(new Set([...(curIface.allowedVlans || []), ...toAdd]));
          output = `Added VLAN(s) ${toAdd.join(', ')} to trunk allowed list.`;
        } else if (sub === 'all') {
          curIface.allowedVlans = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];
          output = 'All VLANs allowed on trunk.';
        } else {
          const list = parts[4].split(',').map(Number).filter(n => !isNaN(n));
          curIface.allowedVlans = list;
          output = `Trunk allowed VLANs set to: ${list.join(', ')}`;
        }
      } else if (lower.startsWith('ip address')) {
        const ip = parts[2];
        const mask = parts[3];
        if (ip && mask) {
          curIface.ipAddress = ip;
          curIface.subnetMask = mask;
          output = '';
        } else {
          output = '% Incomplete command. Syntax: ip address <ip> <netmask>';
        }
      } else {
        output = `% Invalid interface subcommand: "${input}". Type ? for help.`;
      }
    }
  }

  // --- VLAN CONFIG COMMANDS ---
  else if (newMode === 'CONFIG_VLAN') {
    if (parts[0].toLowerCase() === 'name') {
      const vlanName = parts.slice(1).join(' ');
      const existing = state.vlans.find(v => v.id === newVlan);
      if (existing) {
        existing.name = vlanName;
      }
      output = '';
    } else {
      output = `% Invalid VLAN subcommand: "${input}".`;
    }
  } else {
    output = `% Unrecognized command: "${input}". Enter ? for list of valid commands.`;
  }

  const updatedSession: CliSession = {
    ...session,
    mode: newMode,
    currentInterfaceId: newIf,
    currentVlanId: newVlan,
    history: [...session.history, input]
  };

  return {
    updatedState: { ...state, devices: newDevices },
    updatedSession,
    output
  };
}

export function getPromptString(device: NetworkDevice, session: CliSession): string {
  const host = device.hostname;
  switch (session.mode) {
    case 'USER':
      return `${host}>`;
    case 'PRIVILEGED':
      return `${host}#`;
    case 'CONFIG':
      return `${host}(config)#`;
    case 'CONFIG_IF':
      return `${host}(config-if)#`;
    case 'CONFIG_VLAN':
      return `${host}(config-vlan)#`;
    default:
      return `${host}#`;
  }
}
