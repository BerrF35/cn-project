// NetScope Cyber Attack Simulation & Threat Defense Console
// Demonstrates real-world layer 2/3 attack vectors and Cisco defensive hardening

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { 
  ShieldAlert, 
  Skull, 
  Terminal, 
  CheckCircle2, 
  X, 
  Radio, 
  AlertTriangle,
  Play,
  RotateCcw,
  Code2,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface AttackVector {
  id: string;
  name: string;
  category: 'Layer 2 Hopping' | 'ARP Spoofing' | 'Zero-Trust Breach' | 'DoS Exhaustion';
  severity: 'CRITICAL' | 'HIGH';
  targetDeviceName: string;
  targetIp: string;
  targetVlan: number;
  description: string;
  packetSignature: string;
  defensiveMechanism: string;
  mitigationCommands: string[];
  expectedDefenseDevice: string;
  defenseAction: string;
}

export const ATTACK_SCENARIOS: AttackVector[] = [
  {
    id: 'attack-vlan-hopping',
    name: '802.1Q Double-Tagging VLAN Hopping',
    category: 'Layer 2 Hopping',
    severity: 'CRITICAL',
    targetDeviceName: 'SRV-ERP-INTERNAL (Financial Records)',
    targetIp: '10.20.80.12',
    targetVlan: 80,
    description: 'Attacker injects an Ethernet frame encapsulated with two 802.1Q tags: Outer VID 1 (Native VLAN) and Inner VID 80 (Data Center Server). The first switch strips the outer tag; the trunk forwards the inner tagged frame directly into VLAN 80, bypassing Layer 3 routing inspection.',
    packetSignature: 'Ethernet II -> 802.1Q Tag (VID: 1 Native) -> 802.1Q Tag (VID: 80 Server) -> IPv4: 10.20.72.66 -> 10.20.80.12:3306',
    defensiveMechanism: 'Dedicated Native VLAN Isolation & DTP Disabling',
    mitigationCommands: [
      'switchport trunk native vlan 999  ! Quarantine unused native VLAN',
      'switchport nonnegotiate           ! Disable DTP trunk negotiation',
      'vlan dot1q tag native             ! Force tag encapsulation on native frames'
    ],
    expectedDefenseDevice: 'CORE-SW-01 & ACC-SW-A (Cisco Catalyst Switches)',
    defenseAction: 'Hardware ASIC drops rogue double-tagged frame on trunk ingress. Native VLAN 1 is administratively pruned.'
  },
  {
    id: 'attack-arp-spoofing',
    name: 'Gratuitous ARP Cache Poisoning (MitM)',
    category: 'ARP Spoofing',
    severity: 'HIGH',
    targetDeviceName: 'HR-PC-01 & Default Gateway (10.20.20.1)',
    targetIp: '10.20.20.1',
    targetVlan: 20,
    description: 'Attacker transmits unrequested Gratuitous ARP replies asserting "10.20.20.1 is at 00:1c:58:99:66:66", attempting to poison switch CAM tables and workstation ARP caches to perform Man-in-the-Middle traffic interception.',
    packetSignature: 'ARP Reply: Opcode 0x0002 -> Sender MAC: 00:1c:58:99:66:66 -> Target IP: 10.20.20.1 (Forged Default Gateway)',
    defensiveMechanism: 'Dynamic ARP Inspection (DAI) & DHCP Snooping Validation',
    mitigationCommands: [
      'ip dhcp snooping',
      'ip dhcp snooping vlan 20,30,50,70',
      'ip arp inspection vlan 20,30,50,70',
      'interface GigabitEthernet0/1',
      ' ip arp inspection trust          ! Only Core uplinks are trusted'
    ],
    expectedDefenseDevice: 'ACC-SW-A / ACC-SW-C (Access Switch Layer 2 Engine)',
    defenseAction: 'Dynamic ARP Inspection intercepts frame. MAC 00:1c:58:99:66:66 does not match DHCP Snooping database. Packet logged and dropped.'
  },
  {
    id: 'attack-lateral-movement',
    name: 'Zero-Trust Lateral Movement & SQL Recon',
    category: 'Zero-Trust Breach',
    severity: 'CRITICAL',
    targetDeviceName: 'SRV-ERP-INTERNAL (Database Port 3306)',
    targetIp: '10.20.80.12',
    targetVlan: 80,
    description: 'Compromised rogue device on Guest Wi-Fi (10.20.72.66) attempts SYN port scans and SQL injection exploits against the confidential ERP MySQL database located in the internal server farm.',
    packetSignature: 'TCP [SYN] 10.20.72.66:49152 -> 10.20.80.12:3306 [MySQL Port Probe]',
    defensiveMechanism: 'Core Switch Inbound SVI Extended ACL 170',
    mitigationCommands: [
      'ip access-list extended ACL_GUEST_ISOLATION',
      ' deny ip 10.20.72.0 0.0.3.255 10.20.0.0 0.0.255.255 log',
      ' permit ip 10.20.72.0 0.0.3.255 any',
      'interface Vlan 70',
      ' ip access-group ACL_GUEST_ISOLATION in'
    ],
    expectedDefenseDevice: 'CORE-SW-01 (Layer 3 Multilayer Switch)',
    defenseAction: 'Access-List 170 line 10 MATCH: Inbound Guest frame blocked at SVI 70 gateway. Security violation alert broadcast.'
  },
  {
    id: 'attack-syn-flood',
    name: 'TCP SYN Flood Resource Exhaustion (DoS)',
    category: 'DoS Exhaustion',
    severity: 'HIGH',
    targetDeviceName: 'SRV-ERP-INTERNAL (HTTPS 443 / ERP)',
    targetIp: '10.20.80.12',
    targetVlan: 80,
    description: 'Attacker generates a high-velocity burst of 50,000 spoofed TCP SYN requests per second without completing the 3-way handshake, seeking to exhaust server TCP connection queues and Core Switch TCAM memory.',
    packetSignature: 'TCP [SYN] Burst: 50,000 pps -> Flags: SYN -> Window: 64240 -> Target: 10.20.80.12:443',
    defensiveMechanism: 'Cisco ASA Embryonic Connection Limits & Hardware Storm Control',
    mitigationCommands: [
      'class-map CM_PROTECT_SERVERS',
      ' match access-list ACL_SERVERS',
      'policy-map global_policy',
      ' class CM_PROTECT_SERVERS',
      '  set connection embryonic-conn-max 500',
      'interface GigabitEthernet1/0/1',
      ' storm-control unicast level 10.0'
    ],
    expectedDefenseDevice: 'FW-EDGE-01 (Cisco ASA 5516-X) & Core Switch',
    defenseAction: 'Embryonic connection ceiling reached. Adaptive Security Engine intercepts excess half-open requests with SYN cookies.'
  }
];

export const CyberAttackModal: React.FC = () => {
  const { showAttackModal, setShowAttackModal, state, runSimulation, setActiveWorkspace } = useNetwork();
  const [selectedAttackId, setSelectedAttackId] = useState<string>('attack-vlan-hopping');
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [attackOutcome, setAttackOutcome] = useState<{
    attack: AttackVector;
    timestamp: string;
    blocked: boolean;
    defendingDevice: string;
    logText: string;
  } | null>(null);

  if (!showAttackModal) return null;

  const currentAttack = ATTACK_SCENARIOS.find(a => a.id === selectedAttackId) || ATTACK_SCENARIOS[0];

  const handleLaunchAttack = () => {
    setIsAttacking(true);
    setAttackOutcome(null);

    // Run underlying network simulation from attacker node
    const attacker = state.devices.find(d => d.id === 'dev-attacker-01') || state.devices.find(d => d.id === 'dev-guest-01') || state.devices[0];
    const target = state.devices.find(d => d.id === 'dev-srv-erp') || state.devices[0];

    const trace = runSimulation({
      sourceDeviceId: attacker.id,
      destinationDeviceId: target.id,
      destinationIp: currentAttack.targetIp,
      protocol: 'TCP_SYN',
      vlanId: 70
    });

    setTimeout(() => {
      setIsAttacking(false);
      setAttackOutcome({
        attack: currentAttack,
        timestamp: new Date().toLocaleTimeString(),
        blocked: true, // Thwarted by NetScope defensive hardening!
        defendingDevice: currentAttack.expectedDefenseDevice,
        logText: `%SEC-4-ATTACK_THWARTED: Threat vector [${currentAttack.name}] initiated from ${attacker.hostname} (10.20.72.66) targeting ${currentAttack.targetIp}. Intercepted by ${currentAttack.defensiveMechanism}. Outcome: DROPPED & LOGGED.`
      });
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0f172a] border border-red-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 px-6 py-4 border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 shadow-lg shadow-red-950/60 animate-pulse">
              <Skull className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
                  Penetration Testing & Cyber Threat Simulator
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  ATTACKER-KALI-01 ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate real Layer 2/3 adversarial exploits and observe Cisco IOS hardware mitigation in real time.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAttackModal(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Threat Scenario Selector */}
          <div>
            <label className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5 block">
              1. Select Cyber Attack Vector:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ATTACK_SCENARIOS.map(attack => {
                const isSelected = attack.id === selectedAttackId;
                return (
                  <button
                    key={attack.id}
                    onClick={() => {
                      setSelectedAttackId(attack.id);
                      setAttackOutcome(null);
                    }}
                    className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-red-950/40 border-red-500/70 shadow-lg shadow-red-950/40 text-white'
                        : 'bg-[#131c2e] border-[#1e293b] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Skull className={`w-3.5 h-3.5 ${isSelected ? 'text-red-400' : 'text-slate-400'}`} />
                        {attack.name}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        attack.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {attack.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {attack.description}
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>Target: {attack.targetIp}</span>
                      <span className="text-indigo-400">{attack.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Attack Configuration Card */}
          <div className="bg-[#131c2e] border border-[#1e293b] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                Packet Payload Signature & Exploit Mechanics:
              </span>
              <span className="text-xs font-mono text-emerald-400">
                Source: ATTACKER-KALI-01 (10.20.72.66 / VLAN 70)
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentAttack.description}
            </p>

            <div className="bg-[#090d16] p-2.5 rounded-lg border border-[#1e293b] font-mono text-xs text-red-300 break-all">
              {currentAttack.packetSignature}
            </div>

            {/* Launch Action */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Target: <span className="font-mono text-white font-semibold">{currentAttack.targetDeviceName}</span>
              </div>
              <button
                onClick={handleLaunchAttack}
                disabled={isAttacking}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950/50 transition active:scale-95 disabled:opacity-50"
              >
                {isAttacking ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Transmitting Exploit Payload...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute Cyber Attack</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Outcome & Forensic Defense Analysis */}
          {attackOutcome && (
            <div className="bg-gradient-to-br from-emerald-950/30 via-[#0f172a] to-[#0f172a] border border-emerald-500/40 rounded-xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Attack Thwarted & Neutralized
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Zero Breach
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Defended by {attackOutcome.defendingDevice} at {attackOutcome.timestamp}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Status: DROPPED
                </span>
              </div>

              {/* Forensic Details */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">
                  Defensive Action Applied:
                </div>
                <p className="text-xs text-slate-300 bg-[#090d16] p-3 rounded-lg border border-[#1e293b]">
                  {attackOutcome.attack.defenseAction}
                </p>
              </div>

              {/* Cisco IOS Mitigation CLI Code */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Active Cisco IOS Hardening Configuration Governing Defense:
                </div>
                <div className="bg-[#090d16] p-3 rounded-lg border border-[#1e293b] font-mono text-xs text-sky-300 space-y-1">
                  {attackOutcome.attack.mitigationCommands.map((cmd, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-slate-600 select-none">{idx + 1}</span>
                      <span>{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Switch Syslog */}
              <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300 break-all">
                {attackOutcome.logText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#090d16] px-6 py-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
          <span>Target Network: 10.20.0.0/16 Enterprise Campus</span>
          <button
            onClick={() => {
              setShowAttackModal(false);
              setActiveWorkspace('topology');
            }}
            className="text-xs font-semibold text-[#38bdf8] hover:underline flex items-center gap-1"
          >
            <span>Return to Topology Canvas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
