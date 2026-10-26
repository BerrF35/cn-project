// Fault Lab: 10 Realistic Scenarios, Real-time Injections & Live Diagnostic Remediation (Phase F)

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { FAULT_SCENARIOS } from '../engine/faults';
import { FaultScenario } from '../types/network';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Play, 
  Info, 
  ShieldAlert, 
  Search,
  RotateCcw,
  Terminal,
  Activity
} from 'lucide-react';

export const FaultLabWorkspace: React.FC = () => {
  const { state, injectFault, repairFault, runSimulation, setActiveWorkspace, setSelectedDeviceId } = useNetwork();
  const [selectedFaultId, setSelectedFaultId] = useState<string>(FAULT_SCENARIOS[0].id);
  const [testResult, setTestResult] = useState<string | null>(null);

  const activeFault = FAULT_SCENARIOS.find(f => f.id === selectedFaultId) || FAULT_SCENARIOS[0];
  const isCurrentlyInjected = state.activeFaults.includes(activeFault.id);
  const verification = activeFault.verifyFixed(state);

  const handleInject = () => {
    injectFault(activeFault.id);
    setTestResult(null);
  };

  const handleRepair = () => {
    repairFault(activeFault.id);
    setTestResult(null);
  };

  const handleSimulateSymptom = () => {
    let trace;
    if (activeFault.id === 'fault-vlan-misconfig') {
      trace = runSimulation({ protocol: 'ICMP_PING', sourceDeviceId: 'dev-hr-01', destinationDeviceId: 'dev-hr-02' });
    } else if (activeFault.id === 'fault-trunk-prune') {
      trace = runSimulation({ protocol: 'ICMP_PING', sourceDeviceId: 'dev-eng-01', destinationDeviceId: 'dev-srv-erp' });
    } else if (activeFault.id === 'fault-port-shutdown' || activeFault.id === 'fault-transit-route') {
      trace = runSimulation({ protocol: 'ICMP_PING', sourceDeviceId: 'dev-hr-01', destinationIp: '8.8.8.8' });
    } else if (activeFault.id === 'fault-dhcp-scope') {
      trace = runSimulation({ protocol: 'DHCP_DISCOVER', sourceDeviceId: 'dev-hr-01' });
    } else if (activeFault.id === 'fault-bad-dns') {
      trace = runSimulation({ protocol: 'DNS_QUERY', sourceDeviceId: 'dev-staff-01', customDomain: 'erp.corp.internal' });
    } else {
      trace = runSimulation({ protocol: 'ICMP_PING', sourceDeviceId: 'dev-hr-01', destinationDeviceId: 'dev-srv-erp' });
    }
    setTestResult(trace.summary);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#090d16] text-slate-100">
      {/* Left Column: Fault Scenarios Directory */}
      <div className="w-full lg:w-[420px] border-b lg:border-b-0 lg:border-r border-[#1e293b] flex flex-col bg-[#0f172a] overflow-y-auto">
        <div className="p-4 border-b border-[#334155] bg-[#1e293b]">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Fault Injection Catalog ({FAULT_SCENARIOS.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Realistic enterprise configuration anomalies. Inject faults, observe broken packet traces, and verify repairs.
          </p>
        </div>

        <div className="p-3 space-y-2 flex-1 overflow-y-auto">
          {FAULT_SCENARIOS.map((fault, index) => {
            const isActive = fault.id === selectedFaultId;
            const isInjected = state.activeFaults.includes(fault.id);

            return (
              <div
                key={fault.id}
                onClick={() => {
                  setSelectedFaultId(fault.id);
                  setTestResult(null);
                }}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  isActive
                    ? 'bg-[#0284c7]/20 border-[#38bdf8] text-white ring-1 ring-[#38bdf8]'
                    : 'bg-[#131c2e] border-[#1e293b] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-bold text-xs text-white line-clamp-1">{fault.title}</span>
                  </div>

                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      isInjected
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {isInjected ? 'FAULT ACTIVE' : 'RESOLVED'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Target: {fault.targetDeviceId}</span>
                  <span className={fault.severity === 'CRITICAL' ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                    {fault.severity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Scenario Diagnostic Workbench */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
        {/* Scenario Header Card */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#334155] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0284c7]/20 text-[#38bdf8] border border-[#0284c7]/30">
                  {activeFault.category}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeFault.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'
                }`}>
                  {activeFault.severity} SEVERITY
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{activeFault.title}</h2>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleInject}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Inject Fault</span>
              </button>

              <button
                onClick={handleRepair}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>1-Click Repair</span>
              </button>

              <button
                onClick={handleSimulateSymptom}
                className="px-3.5 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test Symptom</span>
              </button>
            </div>
          </div>

          {/* Objective */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Engineering Objective
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {activeFault.objective}
            </p>
          </div>

          {/* Symptoms List */}
          <div className="bg-[#131c2e] border border-[#1e293b] rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Observable Symptoms in Production
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
              {activeFault.symptoms.map((symptom, i) => (
                <li key={i}>{symptom}</li>
              ))}
            </ul>
          </div>

          {/* Diagnostic Clues */}
          <div className="bg-[#090d16] border border-[#1e293b] rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              Diagnostic Clues & Recommended Cisco Commands
            </h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              {activeFault.diagnosticClues.map((clue, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#38bdf8] font-mono">&bull;</span>
                  <span>{clue}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedDeviceId(activeFault.targetDeviceId);
                  setActiveWorkspace('studio');
                }}
                className="text-xs text-[#38bdf8] hover:underline flex items-center gap-1 font-semibold"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Open in Config Studio CLI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Symptom Test Outcome Box */}
        {testResult && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Activity className="w-4 h-4 text-[#38bdf8]" />
              Live Simulated Traffic Test Evidence
            </div>
            <div className="p-3 bg-[#131c2e] rounded-lg border border-[#334155] font-mono text-xs text-slate-200">
              {testResult}
            </div>
          </div>
        )}

        {/* Live State Verification Banner */}
        <div
          className={`p-5 rounded-xl border flex items-center justify-between gap-4 shadow-xl ${
            verification.isFixed
              ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-600/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {verification.isFixed ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-rose-400 shrink-0 animate-bounce" />
            )}
            <div>
              <h3 className="font-bold text-base text-white">
                Verification Oracle: {verification.isFixed ? 'Defect Repaired & Verified' : 'Anomaly Active & Detected'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {verification.reason}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              // Re-check
              setTestResult(null);
            }}
            className="px-3.5 py-1.5 rounded-lg border border-current font-bold text-xs transition hover:bg-white/10 shrink-0"
          >
            Re-test Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
