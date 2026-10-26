// Export & Technical Report Generation Engine for NetScope

import { NetworkState, VlanDefinition } from '../types/network';
import { generateCiscoConfig } from './ciscoCli';

export function exportHtmlReport(state: NetworkState): string {
  const dateStr = new Date().toLocaleString();
  const vlansTable = state.vlans.map(v => `
    <tr>
      <td style="padding: 8px; border: 1px solid #334155; font-weight: bold; color: ${v.colorHex};">VLAN ${v.id}</td>
      <td style="padding: 8px; border: 1px solid #334155;">${v.name}</td>
      <td style="padding: 8px; border: 1px solid #334155; font-family: monospace;">${v.subnet}</td>
      <td style="padding: 8px; border: 1px solid #334155; font-family: monospace;">${v.gatewayIp}</td>
      <td style="padding: 8px; border: 1px solid #334155; font-size: 13px;">${v.description}</td>
    </tr>
  `).join('');

  const devicesTable = state.devices.map(d => {
    const iface = d.interfaces[0];
    const ip = iface?.ipAddress || d.interfaces.find(i => i.ipAddress)?.ipAddress || 'Switched / Routed';
    const vlan = iface?.mode === 'trunk' ? 'Trunk (Tagged)' : iface?.accessVlan ? `VLAN ${iface.accessVlan}` : 'Routed';
    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #334155; font-weight: bold;">${d.hostname}</td>
        <td style="padding: 8px; border: 1px solid #334155;">${d.name}</td>
        <td style="padding: 8px; border: 1px solid #334155; font-size: 12px; color: #94a3b8;">${d.model}</td>
        <td style="padding: 8px; border: 1px solid #334155; font-family: monospace;">${ip}</td>
        <td style="padding: 8px; border: 1px solid #334155;">${vlan}</td>
        <td style="padding: 8px; border: 1px solid #334155; font-size: 12px;">${d.location}</td>
      </tr>
    `;
  }).join('');

  const testsTable = (state.validationResults.length > 0 ? state.validationResults : []).map(t => `
    <tr>
      <td style="padding: 8px; border: 1px solid #334155; font-weight: bold;">${t.id}</td>
      <td style="padding: 8px; border: 1px solid #334155;">${t.title}</td>
      <td style="padding: 8px; border: 1px solid #334155; font-family: monospace; font-size: 12px;">${t.sourceDevice} &rarr; ${t.destinationDevice}</td>
      <td style="padding: 8px; border: 1px solid #334155; font-weight: bold; color: ${t.passed ? '#10b981' : '#ef4444'};">${t.passed ? 'PASSED' : 'FAILED'}</td>
      <td style="padding: 8px; border: 1px solid #334155; font-size: 12px;">${t.evidence}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NetScope Enterprise Network Engineering & Compliance Report</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; line-height: 1.6; }
    h1, h2, h3 { color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #1e293b; border-radius: 6px; overflow: hidden; }
    th { background: #0f172a; padding: 10px; border: 1px solid #334155; text-align: left; color: #94a3b8; font-size: 13px; text-transform: uppercase; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .header-box { background: #1e293b; padding: 24px; border-radius: 8px; border-left: 4px solid #38bdf8; margin-bottom: 32px; }
    @media print {
      body { background: #ffffff; color: #000000; padding: 20px; }
      table { background: #ffffff; }
      th { background: #f1f5f9; color: #000000; }
      td { border-color: #cbd5e1 !important; color: #000000 !important; }
      .header-box { background: #f8fafc; border-color: #0284c7; }
    }
  </style>
</head>
<body>
  <div class="header-box">
    <h1>NetScope — Enterprise Network Engineering & Security Report</h1>
    <p><strong>Assessment:</strong> Computer Networks and Data Communications Engineering Project</p>
    <p><strong>Generated on:</strong> ${dateStr} | <strong>Architecture:</strong> IEEE 802.1Q 10-VLAN Segmented Campus</p>
    <p><strong>Evaluation Status:</strong> Production-grade verification with Layer 2 switching, Layer 3 inter-VLAN routing, ASA edge firewall, and automated compliance auditing.</p>
  </div>

  <h2>1. Enterprise IP Addressing & 10-VLAN Allocation Plan</h2>
  <p>The campus utilizes the private RFC 1918 block <code>10.20.0.0/16</code> divided into departmental broadcast domains:</p>
  <table>
    <thead>
      <tr>
        <th>VLAN ID</th>
        <th>Department / Purpose</th>
        <th>Subnet CIDR</th>
        <th>Default Gateway</th>
        <th>Security / Operational Description</th>
      </tr>
    </thead>
    <tbody>
      ${vlansTable}
    </tbody>
  </table>

  <h2>2. Hardware Device & Host Endpoint Inventory (25+ Nodes)</h2>
  <table>
    <thead>
      <tr>
        <th>Hostname</th>
        <th>Device Name</th>
        <th>Hardware Model</th>
        <th>IP Address</th>
        <th>Port / VLAN Assignment</th>
        <th>Physical Location</th>
      </tr>
    </thead>
    <tbody>
      ${devicesTable}
    </tbody>
  </table>

  <h2>3. Automated Compliance & Security Test Results</h2>
  <table>
    <thead>
      <tr>
        <th>Test ID</th>
        <th>Title</th>
        <th>Test Path</th>
        <th>Outcome</th>
        <th>Simulated Rationale & Evidence</th>
      </tr>
    </thead>
    <tbody>
      ${testsTable || '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #94a3b8;">Run the test suite in the Validation workspace to populate test results.</td></tr>'}
    </tbody>
  </table>

  <h2>4. Engineering Topology & Architecture Summary</h2>
  <p>The enterprise network implements a 3-tier hierarchical model:</p>
  <ul>
    <li><strong>Core Layer:</strong> Cisco Catalyst 3850-24T Layer 3 Core Switch providing high-speed wire-rate inter-VLAN routing across SVIs for VLANs 10–90, DHCP Relay forwarding, and trunk termination.</li>
    <li><strong>Access Layer:</strong> Three Cisco Catalyst 2960-X Switches (Building 1, Building 2, Building 3) providing port-security, access VLAN segmentation, and 802.1Q trunking with allowed-VLAN pruning.</li>
    <li><strong>Perimeter Security:</strong> Cisco ASA 5516-X Edge Firewall with three security zones (INSIDE, DMZ, OUTSIDE), Dynamic PAT (NAT) overload translation, and stateful inspection.</li>
  </ul>
</body>
</html>`;
}

export function exportVlansCsv(vlans: VlanDefinition[]): string {
  const headers = ['VLAN_ID', 'Name', 'Subnet', 'Gateway_IP', 'Category', 'Description'];
  const rows = vlans.map(v => [
    v.id,
    `"${v.name}"`,
    v.subnet,
    v.gatewayIp,
    v.category,
    `"${v.description}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportTraceCsv(state: NetworkState): string {
  if (!state.lastTrace) return 'No trace available';
  const headers = ['Step', 'Timestamp_ms', 'Device', 'Ingress_Port', 'Egress_Port', 'VLAN', 'Has_802.1Q', 'Action', 'Rationale'];
  const rows = state.lastTrace.steps.map(s => [
    s.stepId,
    s.timestampMs,
    `"${s.currentDeviceId}"`,
    s.ingressInterfaceId || 'N/A',
    `"${s.egressInterfaceIds.join(';')}"`,
    s.vlanId || 'Untagged',
    s.has8021qTag ? 'YES' : 'NO',
    s.action,
    `"${s.rationale.replace(/"/g, '""')}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportCiscoConfigsBundle(state: NetworkState): string {
  const banner = '======================================================================\n';
  const configs: string[] = [];

  for (const dev of state.devices.filter(d => ['l2_switch', 'l3_core', 'firewall'].includes(d.type))) {
    configs.push(
      `${banner}! DEVICE CONFIGURATION: ${dev.hostname} (${dev.model})\n${banner}` +
      generateCiscoConfig(dev, state.vlans) + '\n\n'
    );
  }

  return configs.join('\n');
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
