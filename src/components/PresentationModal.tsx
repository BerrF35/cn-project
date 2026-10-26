// Guided Lecturer Presentation Mode (Phase I)

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { 
  Presentation, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  CheckCircle2, 
  Cpu, 
  Network, 
  Activity, 
  AlertTriangle, 
  FileText,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const PresentationModal: React.FC = () => {
  const { 
    showPresentationMode, 
    setShowPresentationMode, 
    setActiveWorkspace, 
    runSimulation, 
    injectFault, 
    repairFault,
    runAllValidationTests,
    setShowAnatomyModal
  } = useNetwork();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [demoStatus, setDemoStatus] = useState<string>('');

  if (!showPresentationMode) return null;

  const presentationSteps = [
    {
      id: 0,
      badge: 'Step 1: Enterprise Architecture',
      title: 'Enterprise Campus Topology & 10-VLAN Segmentation',
      icon: Network,
      narrative: `Course Rubric Alignment: "VLAN-Based Department Isolation – Separate HR, Finance, Production and R&D traffic." Our earlier Review 1/2 demonstration presented a flat 4-PC prototype on a single switch in Packet Tracer. Following our evaluator's feedback, NetScope preserves those exact 4 core curriculum departments (HR VLAN 20, Finance VLAN 30, Engineering/R&D VLAN 40, Production/OT SCADA VLAN 50) and elevates them into a realistic enterprise architecture. The campus connects 25+ nodes across 10 VLANs (10.20.0.0/16) with a Cisco Catalyst 3850 Core L3 switch, Cisco ASA 5516-X perimeter firewall with DMZ, and dedicated Access Switches across 3 campus buildings.`,
      actionLabel: 'Navigate to Topology Workspace',
      executeAction: () => {
        setActiveWorkspace('topology');
        setShowPresentationMode(false);
        setDemoStatus('Switched to Topology Canvas. Click any device to inspect its CAM table, SVIs, or ARP cache.');
      }
    },
    {
      id: 1,
      badge: 'Step 2: Switch Hardware Anatomy',
      title: 'Silicon Micro-Architecture & 802.1Q Tag Processing',
      icon: Cpu,
      narrative: `How does an enterprise switch actually forward packets in silicon? Switches do not execute generic software loops; they use specialized ASICs. An incoming frame enters the PHY SerDes buffer, where the 802.1Q parser validates the 4-byte VLAN tag (TPID 0x8100, 3-bit CoS, 12-bit VID). A hardware TCAM/CAM lookup resolves the destination MAC address in a single sub-150ns clock cycle. Frames traverse a non-blocking terabit crossbar switch fabric, and egress engines strip or insert tags depending on port mode.`,
      actionLabel: 'Inspect Switch Silicon Anatomy',
      executeAction: () => {
        setShowPresentationMode(false);
        setShowAnatomyModal(true);
        setDemoStatus('Opened Hardware Anatomy Inspector. Walk the evaluator through the 6 ASIC forwarding stages!');
      }
    },
    {
      id: 2,
      badge: 'Step 3: Flat vs Segmented Experiment',
      title: 'Broadcast Storm Elimination (Empirical Proof)',
      icon: Zap,
      narrative: `Why segment? In a flat network, an ARP broadcast from a single employee wakes the CPU of every device in the entire facility (23 victims). In NetScope Segmented Architecture, IEEE 802.1Q broadcast boundaries constrain the frame exclusively to ports within that VLAN. When HR-PC-01 sends an ARP request, only 1 other device receives it — delivering a 95.6% reduction in network interrupt overhead and closing lateral attacker penetration paths.`,
      actionLabel: 'Run Live Broadcast Comparison',
      executeAction: () => {
        setActiveWorkspace('validation');
        setShowPresentationMode(false);
        setDemoStatus('Switched to Validation Workspace. Scroll down to inspect the Flat vs Segmented Comparative Benchmark!');
      }
    },
    {
      id: 3,
      badge: 'Step 4: Inter-VLAN Routing & L2 Rewrite',
      title: 'Cross-VLAN Wire-Speed Routing & Header Dissection',
      icon: Activity,
      narrative: `When HR-PC-01 (10.20.20.10) sends traffic to designated HR Portal Server (10.20.80.10), the host addresses the Layer 2 frame to its Default Gateway MAC (Core SVI). Access Switch A tags the frame with VID 20 across the 802.1Q trunk. Core Switch 3850 terminates Layer 2 encapsulation, decrements the IPv4 TTL, updates the checksum, checks policy ACLs, rewrites the Layer 2 source MAC to Core SVI and destination MAC to HR Portal Server, and forwards onto VLAN 80.`,
      actionLabel: 'Execute Live Cross-VLAN Simulation & View on Topology',
      executeAction: () => {
        setActiveWorkspace('topology');
        setShowPresentationMode(false);
        const trace = runSimulation({
          protocol: 'ICMP_PING',
          sourceDeviceId: 'dev-hr-01',
          destinationDeviceId: 'dev-srv-dc'
        });
        setDemoStatus(`Simulated Cross-VLAN Ping: ${trace.summary}`);
      }
    },
    {
      id: 4,
      badge: 'Step 5: Edge Firewall & Dynamic PAT (NAT)',
      title: 'Perimeter Stateful Inspection & Internet Connectivity',
      icon: ShieldCheck,
      narrative: `To access public resources (like 8.8.8.8) or DMZ web services, packets route through the Point-to-Point Transit link 10.20.254.0/30 to the Cisco ASA 5516-X. The firewall inspects connection state, applies access-list policies, and performs Dynamic Port Address Translation (PAT), substituting the internal private IP with public interface IP 198.51.100.2. Return traffic is verified against the stateful flow table and demultiplexed safely back to the original host.`,
      actionLabel: 'Simulate Outbound Internet Flow & View on Topology',
      executeAction: () => {
        setActiveWorkspace('topology');
        setShowPresentationMode(false);
        const trace = runSimulation({
          protocol: 'ICMP_PING',
          sourceDeviceId: 'dev-hr-01',
          destinationIp: '8.8.8.8'
        });
        setDemoStatus(`Firewall Outbound Flow: ${trace.summary}`);
      }
    },
    {
      id: 5,
      badge: 'Step 6: Fault Lab & Live Troubleshooting',
      title: 'Real-Time Fault Injection, Diagnosis & Remediation',
      icon: AlertTriangle,
      narrative: `To prove that NetScope is a true deterministic simulator rather than pre-rendered animations, we inject deliberate enterprise misconfigurations. For example, if an engineer prunes VLAN 40 from Trunk Gi0/1 on Switch B, packets from Engineering CAD workstations are immediately dropped. The user diagnoses the issue via the packet inspector or Cisco CLI ('show interfaces trunk'), repairs the configuration, and verifies that tests transition from red to green.`,
      actionLabel: 'Inject Fault & Open Fault Lab',
      executeAction: () => {
        setActiveWorkspace('faults');
        setShowPresentationMode(false);
        injectFault('fault-trunk-prune');
        setDemoStatus('Injected Fault: "VLAN 40 Pruned from Trunk Gi0/1". Observe test failure and click "1-Click Interactive Repair" to restore!');
      }
    },
    {
      id: 6,
      badge: 'Step 7: Automated Compliance Suite & Report Export',
      title: 'Automated Test Oracle & Complete Technical Deliverables',
      icon: FileText,
      narrative: `NetScope provides a 19-test automated validation suite checking intra-VLAN switching, cross-VLAN routing, policy-based HR/Finance/Guest/Production access control, DHCP relay, DNS resolution, and switchport security hardening. All test results, topology models, Cisco running-configurations, and packet traces can be exported as printable HTML engineering reports, Markdown summaries, vector SVGs, and CSVs.`,
      actionLabel: 'Run Entire Validation Suite',
      executeAction: () => {
        setActiveWorkspace('validation');
        setShowPresentationMode(false);
        runAllValidationTests();
        setDemoStatus('Executed all automated compliance tests. You can now download the Printable HTML Engineering Report!');
      }
    }
  ];

  const current = presentationSteps[currentStep];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-4xl shadow-2xl text-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e293b] px-6 py-4 border-b border-[#334155] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">NetScope Guided Presentation Walkthrough</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                  Step {currentStep + 1} of {presentationSteps.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Curated Demonstration Sequence for Evaluator / Lecturer Review
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPresentationMode(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presentation Slide Body */}
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0284c7]/20 border border-[#0284c7]/40 rounded-xl text-[#38bdf8]">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#38bdf8]">
                {current.badge}
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">{current.title}</h3>
            </div>
          </div>

          <div className="bg-[#131c2e] border border-[#1e293b] rounded-xl p-6 leading-relaxed text-slate-300 text-sm shadow-inner">
            {current.narrative}
          </div>

          {/* Action Trigger Box */}
          <div className="bg-[#090d16] border border-[#1e293b] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{demoStatus || 'Click below to execute live simulation stimulus for this presentation step:'}</span>
            </div>

            <button
              onClick={current.executeAction}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{current.actionLabel}</span>
            </button>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-[#1e293b] px-6 py-4 border-t border-[#334155] flex items-center justify-between">
          <button
            disabled={currentStep === 0}
            onClick={() => {
              setCurrentStep(prev => Math.max(0, prev - 1));
              setDemoStatus('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-[#131c2e] text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1.5">
            {presentationSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentStep(idx);
                  setDemoStatus('');
                }}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  idx === currentStep ? 'bg-[#38bdf8] w-6' : 'bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (currentStep < presentationSteps.length - 1) {
                setCurrentStep(prev => prev + 1);
                setDemoStatus('');
              } else {
                setShowPresentationMode(false);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-xs font-bold text-white shadow transition"
          >
            <span>{currentStep === presentationSteps.length - 1 ? 'Finish Presentation' : 'Next Step'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
