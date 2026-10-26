// Switch & Router Internal Hardware Architecture & ASIC Pipeline (Anatomy Skill)

import React, { useState } from 'react';
import { NetworkDevice } from '../types/network';
import { Cpu, Zap, Activity, ShieldCheck, ArrowRight, Layers, Database, Radio, RefreshCw } from 'lucide-react';

interface SwitchAnatomyProps {
  device: NetworkDevice;
  onClose?: () => void;
}

export const SwitchAnatomy: React.FC<SwitchAnatomyProps> = ({ device, onClose }) => {
  const [pipelineStep, setPipelineStep] = useState<number>(2);
  const [activeFrameType, setActiveFrameType] = useState<'tagged' | 'untagged'>('tagged');
  const isL3 = device.type === 'l3_core';

  const pipelineStages = [
    {
      id: 0,
      title: '1. Ingress SerDes & PHY Buffer',
      shortTitle: 'PHY & SerDes',
      tech: '100BASE-TX / 1000BASE-T SerDes',
      desc: 'Physical layer receiver deserializes bitstream, detects SFD (Start Frame Delimiter 0xD5), verifies FCS (CRC32), and places frame into ingress FIFO buffer.'
    },
    {
      id: 1,
      title: '2. Ingress 802.1Q VLAN Tag Parser',
      shortTitle: '802.1Q Parser',
      tech: 'IEEE 802.1Q Header Demux',
      desc: activeFrameType === 'tagged'
        ? 'Parser detects TPID 0x8100 after source MAC. Decodes 3-bit CoS priority (PCP), 1-bit DEI, and 12-bit VLAN ID (VID). Validates VLAN against port membership table.'
        : 'Untagged frame received on Access Port. Parser associates frame with Port Default PVID and binds internal metadata tag for internal fabric forwarding.'
    },
    {
      id: 2,
      title: '3. TCAM & CAM Forwarding Engine',
      shortTitle: 'TCAM / CAM Lookup',
      tech: 'ASIC Fast Binary CAM Table',
      desc: 'Hardware CAM executes single-clock-cycle parallel lookup on (Dest MAC + VLAN ID) to resolve egress port mask. Simultaneously executes Source MAC learning logic with aging timer.'
    },
    ...(isL3 ? [{
      id: 3,
      title: '4. Layer 3 CEF Forwarding & MAC Rewrite',
      shortTitle: 'L3 CEF Routing',
      tech: 'Cisco Express Forwarding FIB',
      desc: 'Layer 3 route lookup decrements IPv4 TTL, updates IP checksum, rewrites L2 source MAC to Core SVI MAC, and replaces destination MAC with next-hop ARP entry.'
    }] : []),
    {
      id: isL3 ? 4 : 3,
      title: `${isL3 ? '5' : '4'}. Non-Blocking Crossbar Switch Fabric`,
      shortTitle: 'Switch Fabric',
      tech: 'Terabit Shared Memory Matrix',
      desc: 'High-speed non-blocking crossbar interconnect shuttles frame data cells from ingress queue to designated egress port FIFO at wire speed (1.488 Mpps/Gbps).'
    },
    {
      id: isL3 ? 5 : 4,
      title: `${isL3 ? '6' : '5'}. Egress 802.1Q Tag Engine & PHY Tx`,
      shortTitle: 'Egress Tag Engine',
      tech: '802.1Q Inserter / Stripper',
      desc: 'If transmitting on an Access Port, the 4-byte 802.1Q tag is stripped so client receives standard Ethernet II. If transmitting on a Trunk Port, 802.1Q tag is formatted and serialized to cable.'
    }
  ];

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-xl overflow-hidden shadow-2xl text-slate-100 max-w-5xl mx-auto my-4">
      {/* Header */}
      <div className="bg-[#1e293b] px-6 py-4 border-b border-[#334155] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#0284c7]/20 border border-[#0284c7]/40 text-[#38bdf8]">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Hardware Anatomy: {device.hostname}
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#0284c7]/20 text-[#38bdf8] border border-[#0284c7]/30">
                {device.model}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Silicon ASIC Micro-Architecture, 802.1Q Tag Processing & Non-Blocking Switch Fabric
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0f172a] p-1 rounded-lg border border-[#334155] text-xs">
            <button
              onClick={() => setActiveFrameType('tagged')}
              className={`px-3 py-1 rounded font-medium transition ${
                activeFrameType === 'tagged'
                  ? 'bg-[#38bdf8] text-slate-900 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              802.1Q Tagged (Trunk)
            </button>
            <button
              onClick={() => setActiveFrameType('untagged')}
              className={`px-3 py-1 rounded font-medium transition ${
                activeFrameType === 'untagged'
                  ? 'bg-[#38bdf8] text-slate-900 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Untagged (Access)
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white border border-[#334155] rounded hover:bg-slate-800 transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Schematic Body */}
      <div className="p-6 space-y-6">
        {/* Isometric / Precision Architectural Diagram */}
        <div className="relative bg-[#090d16] border border-[#1e293b] rounded-xl p-6 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Stage Pipeline Buttons */}
            <div className="grid grid-cols-5 md:grid-cols-6 gap-2 mb-6">
              {pipelineStages.map((stage, idx) => {
                const isActive = pipelineStep === idx;
                return (
                  <button
                    key={stage.id}
                    onClick={() => setPipelineStep(idx)}
                    className={`p-2.5 rounded-lg border text-left transition relative ${
                      isActive
                        ? 'bg-[#0284c7]/20 border-[#38bdf8] text-white shadow-lg ring-1 ring-[#38bdf8]'
                        : 'bg-[#131c2e] border-[#1e293b] text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Stage {idx + 1}
                      </span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />}
                    </div>
                    <div className="text-xs font-semibold truncate">{stage.shortTitle}</div>
                  </button>
                );
              })}
            </div>

            {/* SVG Engineering Flowchart */}
            <svg viewBox="0 0 860 260" className="w-full h-auto select-none font-mono">
              <defs>
                <linearGradient id="grad-bus" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
                </linearGradient>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>

              <rect width="860" height="260" fill="url(#grid)" rx="8" />

              {/* Data Flow Pipeline Backing Line */}
              <line x1="80" y1="130" x2="780" y2="130" stroke="#334155" strokeWidth="6" strokeDasharray="6 4" />
              <line
                x1="80"
                y1="130"
                x2={80 + (pipelineStep * (700 / (pipelineStages.length - 1)))}
                y2="130"
                stroke="#38bdf8"
                strokeWidth="6"
              />

              {/* 1. Ingress Port */}
              <g transform="translate(40, 70)">
                <rect width="90" height="120" rx="6" fill="#131c2e" stroke={pipelineStep === 0 ? '#38bdf8' : '#334155'} strokeWidth="2" />
                <text x="45" y="30" fill="#94a3b8" fontSize="10" textAnchor="middle">INGRESS</text>
                <text x="45" y="50" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">RJ45 / SFP</text>
                <circle cx="45" cy="80" r="16" fill="#1e293b" stroke="#0284c7" strokeWidth="1.5" />
                <text x="45" y="84" fill="#38bdf8" fontSize="10" textAnchor="middle">PHY</text>
                <text x="45" y="110" fill="#64748b" fontSize="8" textAnchor="middle">Rx SerDes</text>
              </g>

              {/* 2. 802.1Q Parser */}
              <g transform="translate(180, 70)">
                <rect width="100" height="120" rx="6" fill="#131c2e" stroke={pipelineStep === 1 ? '#38bdf8' : '#334155'} strokeWidth="2" />
                <text x="50" y="30" fill="#94a3b8" fontSize="10" textAnchor="middle">VLAN TAG</text>
                <text x="50" y="50" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">802.1Q</text>
                <rect x="15" y="65" width="70" height="30" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                <text x="50" y="80" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">TPID 0x8100</text>
                <text x="50" y="91" fill="#94a3b8" fontSize="8" textAnchor="middle">VID: 12-bit</text>
                <text x="50" y="110" fill="#64748b" fontSize="8" textAnchor="middle">Tag Extractor</text>
              </g>

              {/* 3. TCAM & CAM */}
              <g transform="translate(330, 60)">
                <rect width="110" height="140" rx="6" fill="#131c2e" stroke={pipelineStep === 2 ? '#38bdf8' : '#334155'} strokeWidth="2" />
                <text x="55" y="26" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">ASIC ENGINE</text>
                <text x="55" y="44" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">TCAM / CAM</text>
                <rect x="12" y="56" width="86" height="50" rx="4" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
                <text x="55" y="72" fill="#10b981" fontSize="9" textAnchor="middle">MAC Lookup</text>
                <text x="55" y="87" fill="#f59e0b" fontSize="8" textAnchor="middle">VLAN Table</text>
                <text x="55" y="100" fill="#38bdf8" fontSize="8" textAnchor="middle">Aging Timer</text>
                <text x="55" y="124" fill="#64748b" fontSize="8" textAnchor="middle">&lt; 150ns cycle</text>
              </g>

              {/* 4. Layer 3 CEF (if L3) */}
              {isL3 && (
                <g transform="translate(480, 70)">
                  <rect width="100" height="120" rx="6" fill="#131c2e" stroke={pipelineStep === 3 ? '#38bdf8' : '#334155'} strokeWidth="2" />
                  <text x="50" y="30" fill="#94a3b8" fontSize="10" textAnchor="middle">LAYER 3</text>
                  <text x="50" y="50" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">CEF FIB</text>
                  <rect x="15" y="65" width="70" height="30" rx="4" fill="#1e293b" stroke="#ec4899" strokeWidth="1" />
                  <text x="50" y="79" fill="#ec4899" fontSize="9" textAnchor="middle">TTL Decrement</text>
                  <text x="50" y="90" fill="#94a3b8" fontSize="8" textAnchor="middle">MAC Rewrite</text>
                  <text x="50" y="110" fill="#64748b" fontSize="8" textAnchor="middle">SVI Routing</text>
                </g>
              )}

              {/* 5. Crossbar Fabric */}
              <g transform={`translate(${isL3 ? 610 : 490}, 70)`}>
                <rect width="100" height="120" rx="6" fill="#131c2e" stroke={pipelineStep === (isL3 ? 4 : 3) ? '#38bdf8' : '#334155'} strokeWidth="2" />
                <text x="50" y="30" fill="#94a3b8" fontSize="10" textAnchor="middle">FABRIC</text>
                <text x="50" y="50" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">Crossbar</text>
                <circle cx="50" cy="80" r="16" fill="url(#grad-bus)" opacity="0.3" />
                <path d="M 40 75 L 60 75 M 40 85 L 60 85 M 50 65 L 50 95" stroke="#38bdf8" strokeWidth="2" />
                <text x="50" y="110" fill="#64748b" fontSize="8" textAnchor="middle">Wire-Speed Bus</text>
              </g>

              {/* 6. Egress Port */}
              <g transform={`translate(${isL3 ? 740 : 640}, 70)`}>
                <rect width="90" height="120" rx="6" fill="#131c2e" stroke={pipelineStep === (isL3 ? 5 : 4) ? '#38bdf8' : '#334155'} strokeWidth="2" />
                <text x="45" y="30" fill="#94a3b8" fontSize="10" textAnchor="middle">EGRESS</text>
                <text x="45" y="50" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">Port Tx</text>
                <circle cx="45" cy="80" r="16" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                <text x="45" y="84" fill="#10b981" fontSize="10" textAnchor="middle">PHY</text>
                <text x="45" y="110" fill="#64748b" fontSize="8" textAnchor="middle">Tag Strip/Ins</text>
              </g>

              {/* Animated Packet Token moving along active step */}
              <circle
                cx={85 + (pipelineStep * ((isL3 ? 785 : 685) - 85) / (pipelineStages.length - 1))}
                cy="130"
                r="7"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="2"
              >
                <animate attributeName="r" values="6;8;6" dur="1.2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        </div>

        {/* Selected Stage Detail Panel */}
        <div className="bg-[#131c2e] border border-[#1e293b] rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                ACTIVE STAGE: {pipelineStages[pipelineStep]?.title}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Architecture: {pipelineStages[pipelineStep]?.tech}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {pipelineStages[pipelineStep]?.desc}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPipelineStep(prev => (prev > 0 ? prev - 1 : pipelineStages.length - 1))}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-slate-200 transition"
            >
              &larr; Prev Stage
            </button>
            <button
              onClick={() => setPipelineStep(prev => (prev < pipelineStages.length - 1 ? prev + 1 : 0))}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-lg transition flex items-center gap-1.5"
            >
              Next Stage <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Deep 802.1Q Header Breakdown Card (Phase B Requirement) */}
        <div className="bg-[#090d16] border border-[#1e293b] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#38bdf8]" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                IEEE 802.1Q Tag Structure (Inserted into Ethernet Frame)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">4-Byte Overhead (32 Bits)</span>
          </div>

          <div className="grid grid-cols-12 gap-1.5 text-center font-mono text-xs">
            {/* TPID */}
            <div className="col-span-6 bg-[#0284c7]/20 border border-[#0284c7]/40 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400">TPID (Tag Protocol Identifier)</div>
              <div className="text-sm font-bold text-[#38bdf8] mt-0.5">0x8100</div>
              <div className="text-[10px] text-slate-500 mt-1">16 Bits (Identifies 802.1Q Frame)</div>
            </div>

            {/* PCP */}
            <div className="col-span-2 bg-[#ec4899]/20 border border-[#ec4899]/40 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400">PCP</div>
              <div className="text-sm font-bold text-[#ec4899] mt-0.5">3 Bits</div>
              <div className="text-[10px] text-slate-500 mt-1">CoS 0–7</div>
            </div>

            {/* DEI */}
            <div className="col-span-1 bg-[#f59e0b]/20 border border-[#f59e0b]/40 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400">DEI</div>
              <div className="text-sm font-bold text-[#f59e0b] mt-0.5">1b</div>
              <div className="text-[10px] text-slate-500 mt-1">Drop</div>
            </div>

            {/* VID */}
            <div className="col-span-3 bg-[#10b981]/20 border border-[#10b981]/40 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400">VID (VLAN Identifier)</div>
              <div className="text-sm font-bold text-[#10b981] mt-0.5">12 Bits</div>
              <div className="text-[10px] text-slate-500 mt-1">Range 1–4094</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            The 802.1Q tag is inserted immediately following the 6-byte Source MAC and precedes the original EtherType field. On trunk links, access switches use the 12-bit VID to demultiplex incoming frames into isolated broadcast domains without leaky broadcast contamination.
          </p>
        </div>

        {/* Live Silicon Telemetry Dials */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#131c2e] border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>TCAM Lookup Latency</span>
              <Activity className="w-3.5 h-3.5 text-[#38bdf8]" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">142 <span className="text-xs font-normal text-slate-400">ns</span></div>
            <div className="text-[10px] text-emerald-400 mt-0.5">&bull; Single Clock Hardware Match</div>
          </div>

          <div className="bg-[#131c2e] border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Fabric Line Rate</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">100.0 <span className="text-xs font-normal text-slate-400">%</span></div>
            <div className="text-[10px] text-slate-400 mt-0.5">1.488 Mpps Wire-Speed</div>
          </div>

          <div className="bg-[#131c2e] border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Ingress Buffer Depth</span>
              <Database className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">12 <span className="text-xs font-normal text-slate-400">/ 512 KB</span></div>
            <div className="text-[10px] text-emerald-400 mt-0.5">&bull; 0 Drops Recorded</div>
          </div>

          <div className="bg-[#131c2e] border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>ASIC Pipeline Clock</span>
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">800 <span className="text-xs font-normal text-slate-400">MHz</span></div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cisco Stratum Silicon</div>
          </div>
        </div>
      </div>
    </div>
  );
};
