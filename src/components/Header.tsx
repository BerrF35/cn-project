// Application Header & Primary Navigation

import React from 'react';
import { useNetwork, WorkspaceTab } from '../context/NetworkContext';
import { 
  Network, 
  Activity, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  Calculator, 
  Cpu, 
  Presentation, 
  RotateCcw,
  Shield
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    state, 
    activeWorkspace, 
    setActiveWorkspace,
    setShowAnatomyModal,
    setShowSubnetPlanner,
    setShowPresentationMode,
    resetToInitial
  } = useNetwork();

  const activeFaultsCount = state.activeFaults.length;
  const passedTestsCount = state.validationResults.filter(r => r.passed).length;
  const totalTestsCount = state.validationResults.length;

  const tabs: { id: WorkspaceTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'topology', label: 'Topology', icon: Network },
    { id: 'traffic', label: 'Traffic Lab', icon: Activity },
    { id: 'studio', label: 'Config Studio (CLI)', icon: Terminal },
    { id: 'faults', label: 'Fault Lab', icon: AlertTriangle },
    { id: 'validation', label: 'Validation & Report', icon: CheckCircle2 }
  ];

  return (
    <header className="bg-[#0b0f19]/90 backdrop-blur-md border-b border-[#1e293b] sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0284c7] to-[#0369a1] flex items-center justify-center text-white shadow-lg shadow-sky-950/50 border border-sky-400/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                NetScope
                <span className="text-xs font-mono font-semibold text-[#38bdf8] px-1.5 py-0.2 rounded bg-sky-950/60 border border-sky-800/60">
                  v2.4
                </span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                10-VLAN Enterprise
              </span>
              <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Rubric: HR • Finance • Production • R&D
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Interactive Enterprise Network Engineering & Security Simulator
            </p>
          </div>
        </div>

        {/* Central Workspace Navigation Tabs */}
        <nav className="flex items-center bg-[#090d16] p-1 rounded-xl border border-[#1e293b] overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeWorkspace === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveWorkspace(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap relative ${
                  isActive
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131c2e]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>

                {/* Badges */}
                {tab.id === 'faults' && activeFaultsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                    {activeFaultsCount}
                  </span>
                )}

                {tab.id === 'validation' && totalTestsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                    {passedTestsCount}/{totalTestsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Utility & Presentation Actions */}
        <div className="flex items-center gap-2">
          {/* Subnet Planner Tool */}
          <button
            onClick={() => setShowSubnetPlanner(true)}
            title="Open IPv4 Subnetting & Address Allocator"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#131c2e] hover:bg-[#1e293b] border border-[#1e293b] hover:border-slate-700 transition"
          >
            <Calculator className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="hidden md:inline">IP Planner</span>
          </button>

          {/* Switch Hardware Anatomy Modal */}
          <button
            onClick={() => setShowAnatomyModal(true)}
            title="Inspect Switch Hardware Architecture & ASIC Pipeline"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#131c2e] hover:bg-[#1e293b] border border-[#1e293b] hover:border-slate-700 transition"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Hardware Anatomy</span>
          </button>

          {/* Presentation Mode */}
          <button
            onClick={() => setShowPresentationMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg transition"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Present Demo</span>
          </button>

          {/* Reset State Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset network simulator back to baseline enterprise configuration?')) {
                resetToInitial();
              }
            }}
            title="Reset Network to Initial Baseline"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
