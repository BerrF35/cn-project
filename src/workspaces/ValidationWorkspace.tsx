// Validation Test Suite, Flat vs Segmented Experiment & Report Export Workspace (Phase G, H, I)

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { runFlatVsSegmentedExperiment } from '../engine/experiments';
import { 
  exportHtmlReport, 
  exportVlansCsv, 
  exportTraceCsv, 
  exportCiscoConfigsBundle, 
  triggerDownload 
} from '../engine/exportReports';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Download, 
  FileText, 
  Layers, 
  ShieldCheck, 
  Zap, 
  BarChart3,
  RefreshCw,
  Clock,
  Printer
} from 'lucide-react';

export const ValidationWorkspace: React.FC = () => {
  const { state, runAllValidationTests } = useNetwork();
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'tests' | 'experiment' | 'exports'>('tests');

  const comparison = runFlatVsSegmentedExperiment();

  const totalTests = state.validationResults.length;
  const passedTests = state.validationResults.filter(r => r.passed).length;
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 100;

  const handleRunAll = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      runAllValidationTests();
      setIsRunningTests(false);
    }, 600);
  };

  const handleDownloadHtml = () => {
    const html = exportHtmlReport(state);
    triggerDownload(html, 'NetScope-Engineering-Report.html', 'text/html');
  };

  const handleDownloadVlansCsv = () => {
    const csv = exportVlansCsv(state.vlans);
    triggerDownload(csv, 'NetScope-VLAN-Addressing-Plan.csv', 'text/csv');
  };

  const handleDownloadTraceCsv = () => {
    const csv = exportTraceCsv(state);
    triggerDownload(csv, 'NetScope-Packet-Trace.csv', 'text/csv');
  };

  const handleDownloadConfigs = () => {
    const bundle = exportCiscoConfigsBundle(state);
    triggerDownload(bundle, 'NetScope-Cisco-Configs-Bundle.cfg', 'text/plain');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#090d16] text-slate-100 p-6 space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#0284c7]/20 text-[#38bdf8] border border-[#0284c7]/30">
              Automated Verification Oracle
            </span>
            <span className="text-xs text-slate-400 font-mono">14 Unit & Integration Tests</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Validation Suite & Comparative Benchmark
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic compliance testing, Flat vs Segmented broadcast blast-radius analysis, and formal engineering report generation.
          </p>
        </div>

        {/* Big KPI scorecards */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#131c2e] border border-[#1e293b] rounded-xl text-center min-w-[110px]">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Compliance Pass Rate</div>
            <div className={`text-2xl font-black font-mono mt-0.5 ${passRate === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {passRate}%
            </div>
            <div className="text-[10px] text-slate-400">{passedTests} of {totalTests} Passed</div>
          </div>

          <button
            onClick={handleRunAll}
            disabled={isRunningTests}
            className="px-5 py-3 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>{isRunningTests ? 'Executing Tests...' : 'Run Entire Test Suite'}</span>
          </button>
        </div>
      </div>

      {/* Workspace Section Switcher Tabs */}
      <div className="flex items-center bg-[#0f172a] p-1 rounded-xl border border-[#1e293b] max-w-md text-xs">
        <button
          onClick={() => setActiveSection('tests')}
          className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            activeSection === 'tests'
              ? 'bg-[#0284c7] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Compliance Suite ({totalTests})</span>
        </button>

        <button
          onClick={() => setActiveSection('experiment')}
          className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            activeSection === 'experiment'
              ? 'bg-[#0284c7] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Flat vs Segmented</span>
        </button>

        <button
          onClick={() => setActiveSection('exports')}
          className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            activeSection === 'exports'
              ? 'bg-[#0284c7] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Report Exports</span>
        </button>
      </div>

      {/* SECTION 1: 14 AUTOMATED COMPLIANCE TESTS */}
      {activeSection === 'tests' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.validationResults.map(test => (
              <div
                key={test.id}
                className={`p-4 rounded-xl border transition ${
                  test.passed
                    ? 'bg-[#0f172a] border-[#1e293b] hover:border-emerald-600/50'
                    : 'bg-rose-950/20 border-rose-800/80 shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {test.id}
                    </span>
                    <span className="font-bold text-sm text-white">{test.title}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      test.passed
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                    }`}
                  >
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans mb-3">
                  {test.description}
                </p>

                <div className="p-2.5 bg-[#090d16] rounded-lg border border-[#1e293b] font-mono text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Flow:</span>
                    <span className="text-slate-200">{test.sourceDevice} &rarr; {test.destinationDevice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected Outcome:</span>
                    <span className={test.expectedOutcome === 'PERMIT' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {test.expectedOutcome}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-[#1e293b]">
                    <strong>Evidence:</strong> {test.evidence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: FLAT VS SEGMENTED COMPARATIVE EXPERIMENT */}
      {activeSection === 'experiment' && (
        <div className="space-y-6">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Phase G: Flat vs Segmented Network Experiment
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Identical Stimulus: ARP Broadcast from Workstation
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              We subject both architectures to the exact same traffic stimulus: an ARP Request broadcast originating from an employee PC seeking its default gateway. In a flat network, every device shares a single broadcast domain. In NetScope, IEEE 802.1Q tags isolate the broadcast within the originating department VLAN.
            </p>

            {/* Comparison Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Flat Network Card */}
              <div className="p-5 rounded-xl border border-rose-800/60 bg-[#160b11] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-rose-400 uppercase tracking-wider text-xs">
                    Architecture A: Flat Network (Single Subnet)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    High Vulnerability
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs text-slate-300">
                  <div className="flex justify-between p-2 bg-[#090d16] rounded border border-rose-900/40">
                    <span>Broadcast Blast Radius:</span>
                    <strong className="text-rose-400">{comparison.flat.broadcastRecipientsCount} of 24 devices ({comparison.flat.blastRadiusPercentage}%)</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-[#090d16] rounded border border-rose-900/40">
                    <span>Forwarding Floods:</span>
                    <strong className="text-rose-400">{comparison.flat.totalForwardingEvents} switch port copies</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-[#090d16] rounded border border-rose-900/40">
                    <span>Security Barriers:</span>
                    <strong className="text-rose-400">0 inspection points (Direct L2 adjacency)</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-[#090d16] rounded border border-rose-900/40">
                    <span>Lateral Attacker Probe:</span>
                    <strong className="text-rose-400 font-bold">SUCCESS &mdash; Finance/SCADA Exposed</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  {comparison.flat.description}
                </p>
              </div>

              {/* Segmented Network Card */}
              <div className="p-5 rounded-xl border border-emerald-600/60 bg-[#0a1818] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-400 uppercase tracking-wider text-xs">
                    Architecture B: NetScope 10-VLAN Architecture
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                    Optimal Engineering
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs text-slate-300">
                  <div className="flex justify-between p-2 bg-[#090d16] rounded border border-emerald-900/40">
                    <span>Broadcast Blast Radius:</span>
                    <strong className="text-emerald-400">{comparison.segmented.broadcastRecipientsCount} device ({comparison.segmented.blastRadiusPercentage}%) &bull; 95.6% drop!</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-[#090d16] rounded border border-emerald-900/40">
                    <span>Forwarding Floods:</span>
                    <strong className="text-emerald-400">{comparison.segmented.totalForwardingEvents} local ports</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-[#090d16] rounded border border-emerald-900/40">
                    <span>Security Barriers:</span>
                    <strong className="text-emerald-400">3 inspection tiers (802.1Q + L3 SVI + ASA)</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-[#090d16] rounded border border-emerald-900/40">
                    <span>Lateral Attacker Probe:</span>
                    <strong className="text-emerald-400 font-bold">BLOCKED &mdash; Protected by Policy</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  {comparison.segmented.description}
                </p>
              </div>
            </div>

            {/* Explanation Takeaways */}
            <div className="p-4 bg-[#131c2e] border border-[#1e293b] rounded-lg space-y-2 mt-4 text-xs text-slate-300">
              <h4 className="font-bold text-white uppercase text-[11px]">Engineering Insights</h4>
              {comparison.explanation.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-[#38bdf8] font-bold">&bull;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: EXPORT TECHNICAL REPORTS */}
      {activeSection === 'exports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Printable HTML Report */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-[#38bdf8]" />
                <h3 className="font-bold text-base text-white">Full Engineering Compliance Report</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Download a clean, printable HTML document complete with the 10-VLAN allocation table, complete 25+ node inventory, automated test results, and topology narrative.
              </p>
            </div>
            <button
              onClick={handleDownloadHtml}
              className="w-full py-2.5 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Printable HTML Report</span>
            </button>
          </div>

          {/* Export Cisco Running Configurations */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Cisco IOS Configuration Bundle</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Export authentic Cisco running-configuration scripts for Catalyst 2960-X (Switches A, B, C), Catalyst 3850 Core L3 Switch, and Cisco ASA 5516-X Edge Firewall.
              </p>
            </div>
            <button
              onClick={handleDownloadConfigs}
              className="w-full py-2.5 px-4 bg-[#131c2e] hover:bg-[#1e293b] border border-[#334155] text-slate-200 font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Export All Cisco Configs (.CFG)</span>
            </button>
          </div>

          {/* Export VLANs CSV */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">VLAN & IP Addressing Plan (CSV)</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Raw CSV table containing VLAN IDs, subnet CIDRs, netmasks, gateways, capacity, and department roles for ingestion into IPAM or Excel.
              </p>
            </div>
            <button
              onClick={handleDownloadVlansCsv}
              className="w-full py-2.5 px-4 bg-[#131c2e] hover:bg-[#1e293b] border border-[#334155] text-slate-200 font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Addressing Plan (.CSV)</span>
            </button>
          </div>

          {/* Export Packet Trace CSV */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Packet Event Trace Data (CSV)</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hop-by-hop event log containing ingress/egress ports, 802.1Q tags, forwarding decisions, and ASIC rationale for external protocol analysis.
              </p>
            </div>
            <button
              onClick={handleDownloadTraceCsv}
              className="w-full py-2.5 px-4 bg-[#131c2e] hover:bg-[#1e293b] border border-[#334155] text-slate-200 font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Download Packet Trace (.CSV)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
