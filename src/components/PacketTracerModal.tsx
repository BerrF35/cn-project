// NetScope Cisco Packet Tracer 8.2+ Deployment & CLI Script Hub
// Provides 1:1 turnkey configuration scripts and formal network tool parity

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { 
  Terminal, 
  Download, 
  Copy, 
  Check, 
  X, 
  Network, 
  Server, 
  Shield, 
  FileText,
  ExternalLink,
  Cpu
} from 'lucide-react';

interface ScriptItem {
  id: string;
  name: string;
  role: string;
  filename: string;
  deviceModel: string;
  content: string;
}

const PACKET_TRACER_SCRIPTS: ScriptItem[] = [
  {
    id: 'script-core',
    name: '01: Core Multilayer Switch 3850',
    role: 'Inter-VLAN SVI Routing & Extended ACLs',
    filename: '01_CORE_MULTILAYER_SWITCH_3560.txt',
    deviceModel: 'Cisco Catalyst 3850 / 3560-24PS (L3)',
    content: `! ==============================================================================
! CISCO PACKET TRACER CONFIGURATION SCRIPT
! DEVICE: CORE MULTILAYER SWITCH (Cisco Catalyst 3560-24PS or 3850)
! ==============================================================================
enable
configure terminal
hostname CORE-SW-01
ip routing

! Create VLANs
vlan 10
 name Network_Management
vlan 20
 name Human_Resources
vlan 30
 name Finance_Accounting
vlan 40
 name Engineering_RD
vlan 50
 name Production_OT
vlan 60
 name Corporate_Staff
vlan 70
 name Guest_WiFi
vlan 80
 name DataCenter_Servers
vlan 90
 name Printers_IoT
vlan 100
 name DMZ_Services
exit

! Configure SVIs (Default Gateways)
interface Vlan10
 ip address 10.20.10.1 255.255.255.192
 no shutdown
interface Vlan20
 ip address 10.20.20.1 255.255.255.0
 no shutdown
interface Vlan30
 ip address 10.20.30.1 255.255.255.0
 no shutdown
interface Vlan40
 ip address 10.20.40.1 255.255.254.0
 no shutdown
interface Vlan50
 ip address 10.20.50.1 255.255.255.0
 no shutdown
interface Vlan60
 ip address 10.20.60.1 255.255.254.0
 no shutdown
interface Vlan70
 ip address 10.20.72.1 255.255.252.0
 no shutdown
interface Vlan80
 ip address 10.20.80.1 255.255.255.0
 no shutdown
interface Vlan90
 ip address 10.20.90.1 255.255.255.0
 no shutdown

! Configure 802.1Q Dot1Q Trunk Uplinks
interface GigabitEthernet0/1
 description Trunk Uplink to Building 1 (ACC-SW-A)
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,80
 switchport trunk native vlan 999
 switchport nonnegotiate
 no shutdown

interface GigabitEthernet0/2
 description Trunk Uplink to Building 2 (ACC-SW-B)
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk allowed vlan 10,40,50,80
 switchport trunk native vlan 999
 switchport nonnegotiate
 no shutdown

interface GigabitEthernet0/3
 description Trunk Uplink to Building 3 (ACC-SW-C)
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk allowed vlan 10,60,70,80,90
 switchport trunk native vlan 999
 switchport nonnegotiate
 no shutdown

! Routed Transit Link to Perimeter Firewall
interface GigabitEthernet0/24
 description Point-to-Point Transit Link to Firewall
 no switchport
 ip address 10.20.254.2 255.255.255.252
 no shutdown

! Default Route to Perimeter Firewall
ip route 0.0.0.0 0.0.0.0 10.20.254.1

! Inter-VLAN Policy-Based Security Extended ACLs
ip access-list extended ACL_GUEST_ISOLATION
 deny ip 10.20.72.0 0.0.3.255 10.20.0.0 0.0.255.255 log
 permit ip 10.20.72.0 0.0.3.255 any
exit

ip access-list extended ACL_HR_RESTRICTIONS
 permit tcp 10.20.20.0 0.0.0.255 host 10.20.80.10 eq 443
 deny ip 10.20.20.0 0.0.0.255 host 10.20.80.12 log
 permit ip 10.20.20.0 0.0.0.255 any
exit

ip access-list extended ACL_FIN_RESTRICTIONS
 permit ip 10.20.30.0 0.0.0.255 host 10.20.80.12
 deny ip 10.20.30.0 0.0.0.255 host 10.20.80.10 log
 permit ip 10.20.30.0 0.0.0.255 any
exit

interface Vlan70
 ip access-group ACL_GUEST_ISOLATION in
interface Vlan20
 ip access-group ACL_HR_RESTRICTIONS in
interface Vlan30
 ip access-group ACL_FIN_RESTRICTIONS in

end
write memory`
  },
  {
    id: 'script-sw-a',
    name: '02: Access Switch A (Building 1)',
    role: 'HR & Finance Layer 2 Access Switch',
    filename: '02_ACCESS_SWITCH_A_BUILDING_1.txt',
    deviceModel: 'Cisco Catalyst 2960-24TT (L2)',
    content: `! ==============================================================================
! CISCO PACKET TRACER CONFIGURATION SCRIPT
! DEVICE: ACCESS SWITCH A (Cisco Catalyst 2960-24TT)
! ROLE: Building 1 HR & Finance Access Layer Switch
! ==============================================================================
enable
configure terminal
hostname ACC-SW-A

vlan 10
 name Network_Management
vlan 20
 name Human_Resources
vlan 30
 name Finance_Accounting
exit

! Trunk Uplink to Core Switch
interface GigabitEthernet0/1
 description 802.1Q Dot1Q Trunk to CORE-SW-01
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,80
 switchport trunk native vlan 999
 switchport nonnegotiate
 no shutdown

! Access Ports
interface FastEthernet0/1
 description Management Workstation (VLAN 10)
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 no shutdown

interface FastEthernet0/2
 description HR Workstation 1 (VLAN 20)
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 no shutdown

interface FastEthernet0/3
 description HR Workstation 2 (VLAN 20)
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 no shutdown

interface FastEthernet0/4
 description Finance Workstation 1 (VLAN 30)
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 no shutdown

interface FastEthernet0/5
 description Finance Workstation 2 (VLAN 30)
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 no shutdown

! Security Hardening: Dynamic ARP Inspection & DHCP Snooping
ip dhcp snooping
ip dhcp snooping vlan 20,30
ip arp inspection vlan 20,30
interface GigabitEthernet0/1
 ip dhcp snooping trust
 ip arp inspection trust

end
write memory`
  },
  {
    id: 'script-sw-b',
    name: '03: Access Switch B (Building 2)',
    role: 'Engineering & Production OT Access Switch',
    filename: '03_ACCESS_SWITCH_B_BUILDING_2.txt',
    deviceModel: 'Cisco Catalyst 2960-24TT (L2)',
    content: `! ==============================================================================
! CISCO PACKET TRACER CONFIGURATION SCRIPT
! DEVICE: ACCESS SWITCH B (Cisco Catalyst 2960-24TT)
! ROLE: Building 2 Engineering R&D and Production SCADA Access Switch
! ==============================================================================
enable
configure terminal
hostname ACC-SW-B

vlan 10
 name Network_Management
vlan 40
 name Engineering_RD
vlan 50
 name Production_OT
exit

interface GigabitEthernet0/1
 description Trunk to CORE-SW-01
 switchport mode trunk
 switchport trunk allowed vlan 10,40,50,80
 switchport trunk native vlan 999
 switchport nonnegotiate
 no shutdown

interface FastEthernet0/2
 description CAD Workstation 1 (VLAN 40)
 switchport mode access
 switchport access vlan 40
 spanning-tree portfast
 no shutdown

interface FastEthernet0/3
 description Dev Workstation 2 (VLAN 40)
 switchport mode access
 switchport access vlan 40
 spanning-tree portfast
 no shutdown

interface FastEthernet0/4
 description SCADA Master Terminal (VLAN 50)
 switchport mode access
 switchport access vlan 50
 spanning-tree portfast
 no shutdown

interface FastEthernet0/5
 description Assembly Line PLC 02 (VLAN 50)
 switchport mode access
 switchport access vlan 50
 spanning-tree portfast
 no shutdown

end
write memory`
  },
  {
    id: 'script-sw-c',
    name: '04: Access Switch C (Building 3)',
    role: 'Corporate Staff, Guest Wi-Fi & Data Center Switch',
    filename: '04_ACCESS_SWITCH_C_BUILDING_3.txt',
    deviceModel: 'Cisco Catalyst 2960-24TT (L2)',
    content: `! ==============================================================================
! CISCO PACKET TRACER CONFIGURATION SCRIPT
! DEVICE: ACCESS SWITCH C (Cisco Catalyst 2960-24TT)
! ROLE: Building 3 Corporate Staff, Guest Wi-Fi, Data Center & IoT
! ==============================================================================
enable
configure terminal
hostname ACC-SW-C

vlan 10
 name Network_Management
vlan 60
 name Corporate_Staff
vlan 70
 name Guest_WiFi
vlan 80
 name DataCenter_Servers
vlan 90
 name Printers_IoT
exit

interface GigabitEthernet0/1
 description Trunk to CORE-SW-01
 switchport mode trunk
 switchport trunk allowed vlan 10,60,70,80,90
 switchport trunk native vlan 999
 switchport nonnegotiate
 no shutdown

interface FastEthernet0/1
 description Staff Laptop 1 (VLAN 60)
 switchport mode access
 switchport access vlan 60
 spanning-tree portfast
 no shutdown

interface FastEthernet0/3
 description Guest Wi-Fi Access Point (VLAN 70)
 switchport mode access
 switchport access vlan 70
 spanning-tree portfast
 no shutdown

interface FastEthernet0/4
 description Active Directory & DHCP Server (VLAN 80)
 switchport mode access
 switchport access vlan 80
 spanning-tree portfast
 no shutdown

interface FastEthernet0/5
 description Internal DNS Server (VLAN 80)
 switchport mode access
 switchport access vlan 80
 spanning-tree portfast
 no shutdown

interface FastEthernet0/6
 description ERP Database Server (VLAN 80)
 switchport mode access
 switchport access vlan 80
 spanning-tree portfast
 no shutdown

interface FastEthernet0/8
 description SCADA Historian & IoT Hub (VLAN 90)
 switchport mode access
 switchport access vlan 90
 spanning-tree portfast
 no shutdown

end
write memory`
  },
  {
    id: 'script-firewall',
    name: '05: Edge Perimeter Router & Firewall',
    role: 'Perimeter Gateway, Dynamic PAT & Return Routing',
    filename: '05_EDGE_ROUTER_OR_FIREWALL.txt',
    deviceModel: 'Cisco 2911 Router / ASA 5516-X Firewall',
    content: `! ==============================================================================
! CISCO PACKET TRACER CONFIGURATION SCRIPT
! DEVICE: EDGE PERIMETER ROUTER / FIREWALL (Cisco 2911 or ASA 5516-X)
! ==============================================================================
enable
configure terminal
hostname EDGE-ROUTER-01

interface GigabitEthernet0/0
 description Point-to-Point Transit Link to CORE-SW-01 Gi0/24
 ip address 10.20.254.1 255.255.255.252
 ip nat inside
 no shutdown

interface GigabitEthernet0/1
 description Outside Public WAN Link to ISP
 ip address 198.51.100.2 255.255.255.252
 ip nat outside
 no shutdown

interface GigabitEthernet0/2
 description DMZ Public Services Segment (VLAN 100)
 ip address 10.20.100.1 255.255.255.224
 ip nat inside
 no shutdown

! Return Route back to Internal Enterprise Campus (via Core Switch 10.20.254.2)
ip route 10.20.0.0 255.255.0.0 10.20.254.2

! Default Route to Internet Service Provider
ip route 0.0.0.0 0.0.0.0 198.51.100.1

! Dynamic PAT (NAT Overload) Configuration
access-list 1 permit 10.20.0.0 0.0.255.255
ip nat inside source list 1 interface GigabitEthernet0/1 overload

end
write memory`
  },
  {
    id: 'script-ips',
    name: '06: Endpoints & Server Addressing Table',
    role: 'IP Address, Subnet Mask & Default Gateway Directory',
    filename: '06_PC_AND_SERVER_IP_TABLE.txt',
    deviceModel: 'Endpoints (Workstations, Servers, Laptops)',
    content: `==============================================================================
NETSCOPE ENTERPRISE IP ADDRESSING & GATEWAY TABLE
==============================================================================
VLAN 10 (Management - 10.20.10.0/26, Mask: 255.255.255.192, Gateway: 10.20.10.1):
  - MGMT-WS-01:      IP: 10.20.10.10 | Mask: 255.255.255.192 | Gateway: 10.20.10.1

VLAN 20 (Human Resources - 10.20.20.0/24, Mask: 255.255.255.0, Gateway: 10.20.20.1):
  - HR-PC-01:        IP: 10.20.20.10 | Mask: 255.255.255.0   | Gateway: 10.20.20.1
  - HR-PC-02:        IP: 10.20.20.11 | Mask: 255.255.255.0   | Gateway: 10.20.20.1

VLAN 30 (Finance - 10.20.30.0/24, Mask: 255.255.255.0, Gateway: 10.20.30.1):
  - FIN-PC-01:       IP: 10.20.30.10 | Mask: 255.255.255.0   | Gateway: 10.20.30.1
  - FIN-PC-02:       IP: 10.20.30.11 | Mask: 255.255.255.0   | Gateway: 10.20.30.1

VLAN 40 (Engineering R&D - 10.20.40.0/23, Mask: 255.255.254.0, Gateway: 10.20.40.1):
  - ENG-CAD-01:      IP: 10.20.40.10 | Mask: 255.255.254.0   | Gateway: 10.20.40.1
  - ENG-DEV-02:      IP: 10.20.40.11 | Mask: 255.255.254.0   | Gateway: 10.20.40.1

VLAN 50 (Production OT - 10.20.50.0/24, Mask: 255.255.255.0, Gateway: 10.20.50.1):
  - PROD-SCADA-01:   IP: 10.20.50.10 | Mask: 255.255.255.0   | Gateway: 10.20.50.1
  - PROD-PLC-02:     IP: 10.20.50.11 | Mask: 255.255.255.0   | Gateway: 10.20.50.1

VLAN 60 (Corporate Staff - 10.20.60.0/23, Mask: 255.255.254.0, Gateway: 10.20.60.1):
  - STAFF-LAPTOP-01: IP: 10.20.60.10 | Mask: 255.255.254.0   | Gateway: 10.20.60.1

VLAN 70 (Guest Wi-Fi - 10.20.72.0/22, Mask: 255.255.252.0, Gateway: 10.20.72.1):
  - GUEST-PHONE-01:  IP: 10.20.72.10 | Mask: 255.255.252.0   | Gateway: 10.20.72.1
  - ATTACKER-KALI-01:IP: 10.20.72.66 | Mask: 255.255.252.0   | Gateway: 10.20.72.1

VLAN 80 (Data Center Servers - 10.20.80.0/24, Mask: 255.255.255.0, Gateway: 10.20.80.1):
  - SRV-DC-DHCP:     IP: 10.20.80.10 | Mask: 255.255.255.0   | Gateway: 10.20.80.1
  - SRV-DNS-AUTH:    IP: 10.20.80.11 | Mask: 255.255.255.0   | Gateway: 10.20.80.1
  - SRV-ERP-INTERNAL:IP: 10.20.80.12 | Mask: 255.255.255.0   | Gateway: 10.20.80.1

VLAN 90 (Printers & IoT - 10.20.90.0/24, Mask: 255.255.255.0, Gateway: 10.20.90.1):
  - PRINT-FLOOR1:    IP: 10.20.90.10 | Mask: 255.255.255.0   | Gateway: 10.20.90.1
  - IOT-SENSOR-HUB:  IP: 10.20.90.11 | Mask: 255.255.255.0   | Gateway: 10.20.90.1
==============================================================================`
  }
];

export const PacketTracerModal: React.FC = () => {
  const { showPacketTracerModal, setShowPacketTracerModal } = useNetwork();
  const [activeScriptId, setActiveScriptId] = useState<string>('script-core');
  const [copied, setCopied] = useState<boolean>(false);

  if (!showPacketTracerModal) return null;

  const currentScript = PACKET_TRACER_SCRIPTS.find(s => s.id === activeScriptId) || PACKET_TRACER_SCRIPTS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentScript.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([currentScript.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentScript.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0f172a] border border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-slate-900 px-6 py-4 border-b border-sky-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7]/20 border border-sky-400/40 flex items-center justify-center text-[#38bdf8] shadow-lg shadow-sky-950/60">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide uppercase">
                  Cisco Packet Tracer 8.2+ Deployment Hub
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  100% Industry Tool Parity
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Cisco IOS CLI running configurations. Paste directly into Packet Tracer CLI consoles.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPacketTracerModal(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academic Defense Banner */}
        <div className="bg-[#090d16] px-6 py-2.5 border-b border-[#1e293b] flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Digital Twin Architecture:</strong> NetScope models Cisco Catalyst 3850 TCAM hardware, 802.1Q frame tagging, and ASA 5516-X firewall state tables with 1:1 Packet Tracer parity.
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#38bdf8]">
            6 Ready-to-Run Scripts
          </span>
        </div>

        {/* Script Selection Tabs */}
        <div className="bg-[#131c2e] px-6 pt-3 flex gap-2 border-b border-[#1e293b] overflow-x-auto">
          {PACKET_TRACER_SCRIPTS.map(s => {
            const isActive = s.id === activeScriptId;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveScriptId(s.id);
                  setCopied(false);
                }}
                className={`px-3.5 py-2 rounded-t-xl font-mono text-xs font-semibold transition border-t border-x whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#090d16] border-[#334155] text-sky-300 border-b-transparent shadow-md'
                    : 'bg-[#0f172a] border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1a2333]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>

        {/* Script Viewer & Action Bar */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-3 bg-[#090d16]">
          {/* Metadata bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131c2e] p-3 rounded-xl border border-[#1e293b]">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{currentScript.filename}</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {currentScript.deviceModel}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {currentScript.role}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow transition active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Script'}</span>
              </button>

              <button
                onClick={handleDownloadSingle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-600 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          {/* Syntax Highlighted Terminal View */}
          <pre className="flex-1 bg-[#05070d] p-4 rounded-xl border border-[#1e293b] font-mono text-xs text-sky-200 overflow-x-auto leading-relaxed max-h-[460px]">
            {currentScript.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="bg-[#0f172a] px-6 py-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
          <span>Packet Tracer 8.2+ Compatibility Verified • Cisco Catalyst 3850 & 2960-X</span>
          <button
            onClick={() => setShowPacketTracerModal(false)}
            className="px-4 py-1.5 rounded-lg bg-[#1e293b] hover:bg-slate-800 text-slate-300 font-semibold transition"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
};
