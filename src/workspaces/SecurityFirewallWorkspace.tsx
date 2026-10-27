// NetScope Security Rules & Cisco ASA Firewall Code Workspace
// Governs system-to-system communication rules, ACL editing, and ASA 5516-X configuration

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Play, 
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Cpu,
  Layers
} from 'lucide-react';
import { triggerDownload } from '../engine/exportReports';

const CISCO_ASA_CONFIG = `! ==============================================================================
! CISCO ASA 5516-X NEXT-GENERATION ADAPTIVE SECURITY APPLIANCE CONFIGURATION
! SOFTWARE VERSION: Cisco Adaptive Security Appliance Software Version 9.8(4)
! DEVICE ROLE: Perimeter Edge Firewall, Stateful Inspection, Dynamic PAT & DMZ
! ==============================================================================
: Saved
:
ASA-Version 9.8(4)
!
hostname FW-EDGE-01
domain-name netscope.corp
!
! ------------------------------------------------------------------------------
! INTERFACE ARCHITECTURE & CISCO SECURITY LEVELS (0 - 100)
! Higher Security Level (100) -> Lower Security Level (0) permitted by default
! Lower Security Level (0) -> Higher Security Level (100) denied unless explicit ACL
! ------------------------------------------------------------------------------
interface GigabitEthernet1/1
 nameif outside
 security-level 0
 ip address 198.51.100.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet1/2
 nameif inside
 security-level 100
 ip address 10.20.254.1 255.255.255.252
 no shutdown
!
interface GigabitEthernet1/3
 nameif dmz
 security-level 50
 ip address 10.20.100.1 255.255.255.224
 no shutdown
!
! ------------------------------------------------------------------------------
! OBJECT NETWORK DEFINITIONS FOR INTERNAL ENTERPRISE CAMPUS
! ------------------------------------------------------------------------------
object network OBJ_ENTERPRISE_INTERNAL
 subnet 10.20.0.0 255.255.0.0
!
object network OBJ_DMZ_WEB_SERVER
 host 10.20.100.10
!
object network OBJ_DMZ_VPN_GATEWAY
 host 10.20.100.11
!
object network OBJ_GUEST_WIFI
 subnet 10.20.72.0 255.255.252.0
!
object network OBJ_ERP_DATABASE
 host 10.20.80.12
!
object network OBJ_PRODUCTION_OT
 subnet 10.20.50.0 255.255.255.0
!
! ------------------------------------------------------------------------------
! DYNAMIC PORT ADDRESS TRANSLATION (PAT / NAT OVERLOAD)
! Translates all RFC 1918 internal campus addresses out to external public IP
! ------------------------------------------------------------------------------
nat (inside,outside) dynamic interface
nat (dmz,outside) dynamic interface
!
! Static 1:1 NAT Mapping for Public DMZ Web Server
nat (dmz,outside) static interface service tcp 80 80
nat (dmz,outside) static interface service tcp 443 443
!
! ------------------------------------------------------------------------------
! ACCESS-LISTS: OUTSIDE PERIMETER DEFENSE (Zero-Trust Inbound Filtering)
! ------------------------------------------------------------------------------
access-list OUTSIDE_ACCESS_IN extended permit tcp any object OBJ_DMZ_WEB_SERVER eq 80
access-list OUTSIDE_ACCESS_IN extended permit tcp any object OBJ_DMZ_WEB_SERVER eq 443
access-list OUTSIDE_ACCESS_IN extended permit udp any object OBJ_DMZ_VPN_GATEWAY eq 500
access-list OUTSIDE_ACCESS_IN extended permit udp any object OBJ_DMZ_VPN_GATEWAY eq 4500
access-list OUTSIDE_ACCESS_IN extended permit icmp any any echo-reply
access-list OUTSIDE_ACCESS_IN extended deny ip any any log interval 300
!
! ------------------------------------------------------------------------------
! ACCESS-LISTS: INSIDE ZERO-TRUST PERIMETER SEGREGATION
! ------------------------------------------------------------------------------
access-list INSIDE_ACCESS_IN extended deny ip object OBJ_GUEST_WIFI object OBJ_ENTERPRISE_INTERNAL log
access-list INSIDE_ACCESS_IN extended deny ip object OBJ_PRODUCTION_OT any log
access-list INSIDE_ACCESS_IN extended permit ip object OBJ_ENTERPRISE_INTERNAL any
!
access-group OUTSIDE_ACCESS_IN in interface outside
access-group INSIDE_ACCESS_IN in interface inside
!
! ------------------------------------------------------------------------------
! ROUTING CONFIGURATION
! ------------------------------------------------------------------------------
! Default Route out to Internet Service Provider Gateway
route outside 0.0.0.0 0.0.0.0 198.51.100.1 1
!
! Return Route back to Internal Enterprise Campus (via Core Switch 10.20.254.2)
route inside 10.20.0.0 255.255.0.0 10.20.254.2 1
!
! ------------------------------------------------------------------------------
! MODULAR POLICY FRAMEWORK (MPF) & STATEFUL INSPECTION ENGINE
! Stateful tracking of TCP SYN/ACK sequence numbers and UDP pseudo-sessions
! ------------------------------------------------------------------------------
class-map inspection_default
 match default-inspection-traffic
!
policy-map global_policy
 class inspection_default
  inspect dns preset_dns_map
  inspect ftp
  inspect http
  inspect icmp
  inspect icmp error
  inspect ip-options
  inspect netbios
  inspect snmp
  inspect tftp
  inspect sip
!
service-policy global_policy global
!
! ------------------------------------------------------------------------------
! THREAT DETECTION & EMBRYONIC TCP SYN FLOOD MITIGATION
! ------------------------------------------------------------------------------
threat-detection basic-threat-control
threat-detection scanning-threat
threat-detection statistics access-list
threat-detection statistics tcp-intercept
!
! Set embryonic connection limit to defend internal servers from DoS
class-map CM_PROTECT_SERVERS
 match access-list OUTSIDE_ACCESS_IN
policy-map global_policy
 class CM_PROTECT_SERVERS
  set connection embryonic-conn-max 500
  set connection conn-max 2000
!
end
write memory`;

export const SecurityFirewallWorkspace: React.FC = () => {
  const { 
    state, 
    toggleInterVlanRule, 
    resetInterVlanRules, 
    runSimulation,
    setActiveWorkspace 
  } = useNetwork();

  const [activeTab, setActiveTab] = useState<'rules' | 'firewall_code' | 'architecture'>('rules');
  const [filterVlan, setFilterVlan] = useState<string>('ALL');
  const [copiedAsa, setCopiedAsa] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{
    ruleId: string;
    message: string;
    success: boolean;
  } | null>(null);

  const rules = state.interVlanRules || [];

  const filteredRules = filterVlan === 'ALL' 
    ? rules 
    : rules.filter(r => r.sourceVlanId.toString() === filterVlan || (r.sourceVlanId === 0 && filterVlan === 'CORP'));

  const handleCopyAsa = () => {
    navigator.clipboard.writeText(CISCO_ASA_CONFIG);
    setCopiedAsa(true);
    setTimeout(() => setCopiedAsa(false), 2000);
  };

  const handleDownloadAsa = () => {
    triggerDownload(CISCO_ASA_CONFIG, 'cisco-asa-5516x-running-config.cfg', 'text/plain');
  };

  const handleTestRule = (rule: typeof rules[0]) => {
    // Map rule to representative test nodes
    let srcDevId = 'dev-hr-01';
    let dstDevId = 'dev-srv-erp';
    let targetIp = rule.targetIp || '10.20.80.12';

    if (rule.sourceVlanId === 70) srcDevId = 'dev-guest-01';
    else if (rule.sourceVlanId === 20) srcDevId = 'dev-hr-01';
    else if (rule.sourceVlanId === 30) srcDevId = 'dev-fin-01';
    else if (rule.sourceVlanId === 50) srcDevId = 'dev-prod-01';

    if (rule.id === 'RULE-HR-PORTAL-PERMIT') {
      dstDevId = 'dev-srv-dc';
      targetIp = '10.20.80.10';
    } else if (rule.id === 'RULE-PROD-OT-HISTORIAN') {
      dstDevId = 'dev-iot-01';
      targetIp = '10.20.90.11';
    } else if (rule.id === 'RULE-FW-INTERNET-PAT') {
      dstDevId = 'dev-ext-dns';
      targetIp = '8.8.8.8';
    }

    const trace = runSimulation({
      sourceDeviceId: srcDevId,
      destinationDeviceId: dstDevId,
      destinationIp: targetIp,
      protocol: 'TCP_SYN',
      vlanId: rule.sourceVlanId || 20
    });

    const isSuccess = trace.success;
    setTestFeedback({
      ruleId: rule.id,
      message: isSuccess 
        ? `Communication Flow PERMITTED: Packet successfully reached target ${targetIp}`
        : `Communication Flow BLOCKED: ${trace.summary}`,
      success: isSuccess
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#090d16] text-slate-100">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border-b border-[#1e293b] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Security Governance Center
            </span>
            <span className="text-xs text-slate-400 font-mono">Layer 3 ACLs & Cisco ASA 5516-X Engine</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            System-to-System Communication Rules & Firewall Code
          </h1>
          <p className="text-xs text-slate-400">
            Define, inspect, and toggle exactly which enterprise communications are permitted or blocked across all 10 VLAN segments.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-[#131c2e] p-1 rounded-xl border border-[#1e293b]">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'rules' ? 'bg-[#0284c7] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Interactive Rules Matrix ({rules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('firewall_code')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'firewall_code' ? 'bg-[#0284c7] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Cisco ASA 5516-X Code</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'architecture' ? 'bg-[#0284c7] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Security Architecture Guide</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: INTER-VLAN COMMUNICATION RULES MATRIX */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {/* Control & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#131c2e] p-3 rounded-xl border border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-300 font-semibold">Filter by Source VLAN:</span>
                <select
                  value={filterVlan}
                  onChange={(e) => setFilterVlan(e.target.value)}
                  className="bg-[#1e293b] border border-[#334155] text-xs text-white rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-[#38bdf8]"
                >
                  <option value="ALL">All Communication Rules ({rules.length})</option>
                  <option value="20">VLAN 20: Human Resources (HR)</option>
                  <option value="30">VLAN 30: Finance & Accounting</option>
                  <option value="50">VLAN 50: Production & OT SCADA</option>
                  <option value="70">VLAN 70: Guest Wi-Fi (Zero-Trust)</option>
                  <option value="CORP">Corporate / Perimeter Edge Rules</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetInterVlanRules}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                  title="Reset all rules back to baseline enterprise security policy"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to Baseline Policy</span>
                </button>
              </div>
            </div>

            {/* Test Feedback Toast if active */}
            {testFeedback && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                testFeedback.success 
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                  : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
              }`}>
                <div className="flex items-center gap-2">
                  {testFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  <span>{testFeedback.message}</span>
                </div>
                <button onClick={() => setTestFeedback(null)} className="text-xs underline hover:text-white">
                  Dismiss
                </button>
              </div>
            )}

            {/* Rules Table */}
            <div className="bg-[#131c2e] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0f172a] text-slate-400 uppercase font-mono text-[11px] border-b border-[#1e293b]">
                  <tr>
                    <th className="py-3 px-4">Rule ID & Name</th>
                    <th className="py-3 px-4">Source Segment</th>
                    <th className="py-3 px-4">Destination Target</th>
                    <th className="py-3 px-4">Governing Device</th>
                    <th className="py-3 px-4">Action & Toggle</th>
                    <th className="py-3 px-4 text-center">Hits</th>
                    <th className="py-3 px-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60">
                  {filteredRules.map(rule => {
                    const isPermit = rule.action === 'PERMIT';
                    return (
                      <tr key={rule.id} className="hover:bg-[#1a2333]/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="font-mono text-sky-400 text-[11px]">{rule.id}</span>
                          </div>
                          <div className="text-[11px] text-slate-300">{rule.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{rule.rationale}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-slate-800 text-slate-200 border border-slate-700">
                            {rule.sourceName}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono text-slate-200 text-xs">
                            {rule.destTarget}
                          </span>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Proto: {rule.protocol} {rule.port ? `:${rule.port}` : ''}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-mono font-medium ${
                            rule.governingDevice.includes('Firewall') ? 'text-amber-400' : 'text-purple-300'
                          }`}>
                            {rule.governingDevice}
                          </span>
                          <div className="text-[10px] font-mono text-sky-300/80 truncate max-w-[220px]" title={rule.ciscoCommand}>
                            {rule.ciscoCommand}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleInterVlanRule(rule.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow active:scale-95 ${
                              isPermit
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                            title={`Click to toggle action between PERMIT and DENY`}
                          >
                            {isPermit ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{rule.action}</span>
                            <span className="text-[10px] opacity-75 font-normal ml-0.5">(Toggle)</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {rule.hitCount}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleTestRule(rule)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e293b] hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition ml-auto"
                            title="Inject test probe into network simulator to verify rule"
                          >
                            <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
                            <span>Test Live Flow</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Answer note for professor */}
            <div className="bg-[#0f172a] border border-sky-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Where are the rules stored and how to change them?</strong>
                <p className="mt-1 leading-relaxed">
                  System-to-system communication rules are governed by <strong>Cisco Catalyst 3850 Extended Access Control Lists (ACLs)</strong> applied inbound on Switched Virtual Interfaces (SVIs) and the <strong>Cisco ASA 5516-X Adaptive Security Algorithm</strong>. Clicking any <span className="text-emerald-400 font-bold">PERMIT</span> or <span className="text-rose-400 font-bold">DENY</span> button above dynamically updates the running ACL policy, immediately reconfiguring the simulation engine and Packet Tracer deployment outputs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CISCO ASA 5516-X FIREWALL CODE INSPECTOR */}
        {activeTab === 'firewall_code' && (
          <div className="space-y-4">
            {/* Metadata and download toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#131c2e] p-4 rounded-xl border border-[#1e293b]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Cisco ASA 5516-X Running Configuration (Software Version 9.8)
                </h3>
                <p className="text-xs text-slate-400">
                  Complete firewall code implementing stateful inspection, perimeter ACLs, dynamic PAT, and DMZ static NAT.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAsa}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow transition active:scale-95"
                >
                  {copiedAsa ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAsa ? 'Copied Running-Config!' : 'Copy ASA Config'}</span>
                </button>

                <button
                  onClick={handleDownloadAsa}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1e293b] hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-600 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .cfg</span>
                </button>
              </div>
            </div>

            {/* ASA Code Viewer */}
            <div className="bg-[#05070d] border border-[#1e293b] rounded-xl p-4 font-mono text-xs text-amber-200/90 leading-relaxed overflow-x-auto max-h-[560px]">
              <pre>{CISCO_ASA_CONFIG}</pre>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY ARCHITECTURE GUIDE */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#131c2e] p-5 rounded-xl border border-[#1e293b] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-[#38bdf8] flex items-center justify-center font-bold font-mono">
                  L2
                </div>
                <h3 className="text-sm font-bold text-white">Layer 2: 802.1Q VLAN Isolation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Switchports are partitioned into distinct VLANs. Frames are tagged with 4-byte IEEE 802.1Q headers (TPID 0x8100). Access switches will NOT forward frames between VLANs at Layer 2 without an external router or Layer 3 switch.
                </p>
              </div>

              <div className="bg-[#131c2e] p-5 rounded-xl border border-[#1e293b] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold font-mono">
                  L3
                </div>
                <h3 className="text-sm font-bold text-white">Layer 3: SVI Routing & Extended ACLs</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cisco Catalyst 3850 Core switch performs hardware-accelerated wire-speed TCAM routing between SVIs. Inbound Extended ACLs inspect IP, TCP, and UDP headers to permit authorized departmental traffic and drop unauthorized probes.
                </p>
              </div>

              <div className="bg-[#131c2e] p-5 rounded-xl border border-[#1e293b] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">
                  L4-7
                </div>
                <h3 className="text-sm font-bold text-white">Perimeter: Cisco ASA 5516-X Firewall</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cisco ASA enforces security levels (Inside: 100, DMZ: 50, Outside: 0). Outbound sessions create entries in the state table (<code className="text-amber-300">xlate</code> & <code className="text-amber-300">conn</code>). Inbound unsolicited sessions from outside are strictly dropped by default.
                </p>
              </div>
            </div>

            {/* Security Levels Matrix Table */}
            <div className="bg-[#131c2e] border border-[#1e293b] rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Cisco ASA Security Levels (Adaptive Security Algorithm)
              </h3>
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0f172a] text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Interface</th>
                    <th className="py-2.5 px-3">Nameif</th>
                    <th className="py-2.5 px-3">Security Level</th>
                    <th className="py-2.5 px-3">Default Inbound Policy</th>
                    <th className="py-2.5 px-3">Default Outbound Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  <tr>
                    <td className="py-2.5 px-3 text-white">Gi1/2</td>
                    <td className="py-2.5 px-3 text-emerald-400">inside</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">100 (Highest)</td>
                    <td className="py-2.5 px-3 text-slate-300">Implicit Permit from any lower zone if return state exists</td>
                    <td className="py-2.5 px-3 text-emerald-300">Permitted to DMZ (50) & Outside (0) with PAT</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-white">Gi1/3</td>
                    <td className="py-2.5 px-3 text-amber-400">dmz</td>
                    <td className="py-2.5 px-3 text-amber-400 font-bold">50 (Isolated)</td>
                    <td className="py-2.5 px-3 text-slate-300">Permit HTTP (80) & HTTPS (443) via OUTSIDE_ACCESS_IN ACL</td>
                    <td className="py-2.5 px-3 text-rose-300">DENIED from initiating sessions to Inside (100)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-white">Gi1/1</td>
                    <td className="py-2.5 px-3 text-rose-400">outside</td>
                    <td className="py-2.5 px-3 text-rose-400 font-bold">0 (Untrusted)</td>
                    <td className="py-2.5 px-3 text-rose-400 font-bold">DENIED by default (Implicit Deny All)</td>
                    <td className="py-2.5 px-3 text-slate-300">N/A (Untrusted public Internet egress)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
