// Interactive IPv4 Subnetting & Address Allocation Planner (Phase B)

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { calculateSubnet, validateSubnetOverlap } from '../engine/subnetting';
import { Calculator, X, CheckCircle2, AlertTriangle, Hash, Layers } from 'lucide-react';

export const SubnetPlannerModal: React.FC = () => {
  const { state, showSubnetPlanner, setShowSubnetPlanner } = useNetwork();
  const [selectedVlanId, setSelectedVlanId] = useState<number>(20);
  const [testCidr, setTestCidr] = useState<string>('10.20.20.0/24');

  if (!showSubnetPlanner) return null;

  // Run overlap validator across all 10 VLANs
  const validation = validateSubnetOverlap(
    state.vlans.map(v => ({ id: v.id, name: v.name, cidr: v.subnet }))
  );

  let activeCalc;
  try {
    activeCalc = calculateSubnet(testCidr);
  } catch (e: any) {
    activeCalc = null;
  }

  const handleSelectVlan = (vlanId: number) => {
    setSelectedVlanId(vlanId);
    const v = state.vlans.find(v => v.id === vlanId);
    if (v) {
      setTestCidr(v.subnet);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-[#1e293b] px-6 py-4 border-b border-[#334155] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0284c7]/20 border border-[#0284c7]/40 rounded-lg text-[#38bdf8]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">IPv4 Address Allocation & Subnet Planner</h2>
              <p className="text-xs text-slate-400">
                RFC 1918 Private Allocation Block: <code className="text-[#38bdf8]">10.20.0.0/16</code> &bull; 10 Discrete Departmental Segments
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSubnetPlanner(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Overlap Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              validation.hasOverlap
                ? 'bg-rose-950/40 border-rose-600 text-rose-200'
                : 'bg-emerald-950/30 border-emerald-600/40 text-emerald-200'
            }`}
          >
            {validation.hasOverlap ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <span className="font-bold text-sm">
                {validation.hasOverlap ? 'Subnet Collision / Overlap Detected!' : 'Subnet Plan Structurally Verified & Non-Overlapping'}
              </span>
              <p className="mt-1 text-slate-300">
                {validation.hasOverlap
                  ? validation.errors.join(' | ')
                  : 'All 10 VLAN subnets operate within independent, non-conflicting CIDR ranges. Gateways, network IDs, and broadcast boundaries are mathematically isolated.'}
              </p>
            </div>
          </div>

          {/* Interactive Calculator Section */}
          <div className="bg-[#131c2e] border border-[#1e293b] rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#38bdf8]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Subnet Bitwise Calculator
                </h3>
              </div>

              {/* Quick Select VLAN Button Group */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 mr-1">Load VLAN:</span>
                {state.vlans.map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVlan(v.id)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold transition ${
                      selectedVlanId === v.id
                        ? 'bg-[#0284c7] text-white shadow'
                        : 'bg-[#1e293b] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    V{v.id}
                  </button>
                ))}
              </div>
            </div>

            {/* CIDR Input Box */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  CIDR Notation (IP/Prefix)
                </label>
                <input
                  type="text"
                  value={testCidr}
                  onChange={(e) => setTestCidr(e.target.value)}
                  placeholder="e.g. 10.20.20.0/24"
                  className="w-full px-3.5 py-2 bg-[#090d16] border border-[#334155] rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>

            {/* Calculated Breakdown Grid */}
            {activeCalc ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-[#090d16] p-3 rounded-lg border border-[#1e293b]">
                  <div className="text-[10px] text-slate-400 uppercase">Network ID</div>
                  <div className="text-sm font-bold text-white mt-1">{activeCalc.networkAddress}</div>
                </div>
                <div className="bg-[#090d16] p-3 rounded-lg border border-[#1e293b]">
                  <div className="text-[10px] text-slate-400 uppercase">Subnet Mask</div>
                  <div className="text-sm font-bold text-[#38bdf8] mt-1">{activeCalc.netmask}</div>
                </div>
                <div className="bg-[#090d16] p-3 rounded-lg border border-[#1e293b]">
                  <div className="text-[10px] text-slate-400 uppercase">Broadcast Address</div>
                  <div className="text-sm font-bold text-rose-400 mt-1">{activeCalc.broadcastAddress}</div>
                </div>
                <div className="bg-[#090d16] p-3 rounded-lg border border-[#1e293b]">
                  <div className="text-[10px] text-slate-400 uppercase">Usable Hosts</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">
                    {activeCalc.usableHosts} <span className="text-[10px] font-normal text-slate-400">hosts</span>
                  </div>
                </div>

                <div className="col-span-2 bg-[#090d16] p-3 rounded-lg border border-[#1e293b]">
                  <div className="text-[10px] text-slate-400 uppercase">Usable Host IP Range</div>
                  <div className="text-sm font-bold text-slate-200 mt-1">
                    {activeCalc.firstUsableIp} &mdash; {activeCalc.lastUsableIp}
                  </div>
                </div>
                <div className="col-span-2 bg-[#090d16] p-3 rounded-lg border border-[#1e293b]">
                  <div className="text-[10px] text-slate-400 uppercase">Binary Subnet Mask</div>
                  <div className="text-xs font-bold text-purple-300 mt-1">{activeCalc.binaryMask}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-rose-950/20 border border-rose-800 rounded-lg text-rose-300 text-xs">
                Invalid CIDR format. Please enter an address like <code>10.20.20.0/24</code>.
              </div>
            )}
          </div>

          {/* 10-VLAN Full Enterprise Allocation Matrix Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-[#38bdf8]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Full 10-VLAN Subnet Allocation Matrix
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#334155]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#1e293b] text-slate-300 border-b border-[#334155]">
                  <tr>
                    <th className="p-3">VLAN</th>
                    <th className="p-3">Department Name</th>
                    <th className="p-3">Subnet CIDR</th>
                    <th className="p-3">Subnet Mask</th>
                    <th className="p-3">Default Gateway</th>
                    <th className="p-3">Usable Range</th>
                    <th className="p-3">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b] bg-[#090d16]">
                  {state.vlans.map(v => {
                    const calc = calculateSubnet(v.subnet);
                    return (
                      <tr key={v.id} className="hover:bg-[#131c2e] transition">
                        <td className="p-3 font-bold" style={{ color: v.colorHex }}>
                          VLAN {v.id}
                        </td>
                        <td className="p-3 font-sans font-medium text-white">{v.name}</td>
                        <td className="p-3 text-[#38bdf8] font-bold">{v.subnet}</td>
                        <td className="p-3 text-slate-400">{calc.netmask}</td>
                        <td className="p-3 text-emerald-400 font-bold">{v.gatewayIp}</td>
                        <td className="p-3 text-slate-300 text-[11px]">
                          {calc.firstUsableIp} - {calc.lastUsableIp}
                        </td>
                        <td className="p-3 text-purple-300 font-bold">{calc.usableHosts} hosts</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1e293b] px-6 py-3 border-t border-[#334155] flex justify-end">
          <button
            onClick={() => setShowSubnetPlanner(false)}
            className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg transition shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
