// Configuration Studio: Cisco IOS CLI Terminal & Visual Switchport Provisioning (Phase E)

import React, { useState, useRef, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { executeCliCommand, getPromptString, generateCiscoConfig, CliSession } from '../engine/ciscoCli';
import { triggerDownload } from '../engine/exportReports';
import { 
  Terminal, 
  Layers, 
  Download, 
  Settings2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Cpu
} from 'lucide-react';

export const ConfigStudioWorkspace: React.FC = () => {
  const { state, updateDevice } = useNetwork();

  const [activeDeviceId, setActiveDeviceId] = useState<string>('dev-acc-sw-a');
  const [studioMode, setStudioMode] = useState<'cli' | 'visual'>('cli');

  // CLI State
  const [session, setSession] = useState<CliSession>({
    deviceId: 'dev-acc-sw-a',
    mode: 'PRIVILEGED',
    history: []
  });
  const [cliInput, setCliInput] = useState<string>('');
  const [cliLogs, setCliLogs] = useState<{ prompt: string; command: string; output: string }[]>([
    {
      prompt: 'ACC-SW-A#',
      command: 'show vlan brief',
      output: `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/21, Fa0/22
10   Network_Management               active    Fa0/1
20   Human_Resources__HR_             active    Fa0/2, Fa0/3
30   Finance___Accounting             active    Fa0/4, Fa0/5`
    }
  ]);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const activeDevice = state.devices.find(d => d.id === activeDeviceId) || state.devices[0];

  // Synchronize session when active device changes
  const handleDeviceChange = (devId: string) => {
    setActiveDeviceId(devId);
    setSession({
      deviceId: devId,
      mode: 'PRIVILEGED',
      history: []
    });
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cliLogs]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;

    const currentPrompt = getPromptString(activeDevice, session);
    const { updatedState, updatedSession, output } = executeCliCommand(state, session, cliInput);

    // Apply updated device back to state
    const modifiedDev = updatedState.devices.find(d => d.id === activeDeviceId);
    if (modifiedDev) {
      updateDevice(modifiedDev);
    }

    setSession(updatedSession);
    setCliLogs(prev => [
      ...prev,
      { prompt: currentPrompt, command: cliInput, output }
    ]);
    setCliInput('');
  };

  const handleDownloadActiveConfig = () => {
    const config = generateCiscoConfig(activeDevice, state.vlans);
    triggerDownload(config, `${activeDevice.hostname}-running-config.cfg`, 'text/plain');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#090d16] text-slate-100">
      {/* Studio Top Control Bar */}
      <div className="bg-[#1e293b] px-6 py-3 border-b border-[#334155] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0284c7]/20 border border-[#0284c7]/40 text-[#38bdf8]">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Configuration Studio & Cisco IOS Engine
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-[#38bdf8] font-mono border border-slate-700">
                {activeDevice.model}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive CLI parser and visual switchport provisioning engine with live state mutation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Target Device Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Target Device:</span>
            <select
              value={activeDeviceId}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#38bdf8]"
            >
              {state.devices.filter(d => ['l2_switch', 'l3_core', 'firewall'].includes(d.type)).map(d => (
                <option key={d.id} value={d.id}>
                  {d.hostname} ({d.model.split(' ')[1] || d.type})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle CLI vs Visual Studio */}
          <div className="flex items-center bg-[#0f172a] p-1 rounded-lg border border-[#334155] text-xs">
            <button
              onClick={() => setStudioMode('cli')}
              className={`px-3 py-1 rounded font-medium transition ${
                studioMode === 'cli'
                  ? 'bg-[#0284c7] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cisco CLI Terminal
            </button>
            <button
              onClick={() => setStudioMode('visual')}
              className={`px-3 py-1 rounded font-medium transition ${
                studioMode === 'visual'
                  ? 'bg-[#0284c7] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Visual Port Matrix
            </button>
          </div>

          <button
            onClick={handleDownloadActiveConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131c2e] hover:bg-[#1e293b] text-slate-200 border border-[#334155] text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Export .CFG</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6">
        {/* Left: Terminal OR Visual Port Matrix */}
        <div className="flex-1 flex flex-col bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
          {studioMode === 'cli' ? (
            /* CISCO IOS CLI TERMINAL */
            <div className="flex-1 flex flex-col font-mono text-xs">
              {/* Terminal Titlebar */}
              <div className="bg-[#1e293b] px-4 py-2 border-b border-[#334155] flex items-center justify-between text-slate-400 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="font-bold text-slate-200 ml-2">Console Port (9600-8-N-1): {activeDevice.hostname}</span>
                </div>
                <span>Type <strong>?</strong> or <strong>help</strong> for valid commands</span>
              </div>

              {/* Logs output */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#050811] text-slate-200 selection:bg-slate-700">
                <div className="text-slate-500 text-[11px]">
                  Cisco IOS Software, C2960X Software (C2960X-UNIVERSALK9-M), Version 15.2(2)E7<br />
                  Technical Support: http://www.cisco.com/techsupport<br />
                  Copyright (c) 1986-2024 by Cisco Systems, Inc.<br />
                  Connected to {activeDevice.hostname} virtual console port.<br />
                </div>

                {cliLogs.map((log, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-emerald-400 font-bold">
                      {log.prompt} <span className="text-white font-normal">{log.command}</span>
                    </div>
                    {log.output && (
                      <div className="text-slate-300 whitespace-pre-wrap pl-2 leading-relaxed">
                        {log.output}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* CLI Command Input Form */}
              <form onSubmit={handleCommandSubmit} className="bg-[#131c2e] p-2 border-t border-[#334155] flex items-center gap-2">
                <span className="text-emerald-400 font-bold pl-2">
                  {getPromptString(activeDevice, session)}
                </span>
                <input
                  type="text"
                  value={cliInput}
                  onChange={(e) => setCliInput(e.target.value)}
                  placeholder="Enter command (e.g. show vlan brief, interface Fa0/2, shutdown)..."
                  className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs focus:ring-0"
                  autoFocus
                />
              </form>
            </div>
          ) : (
            /* VISUAL SWITCHPORT PROVISIONING MATRIX */
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Visual Interface & VLAN Membership Table</h3>
                  <p className="text-xs text-slate-400">Modify switchport mode, assigned VLANs, and administrative link state.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#334155]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#1e293b] text-slate-300">
                    <tr>
                      <th className="p-3">Interface</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">VLAN Assignment</th>
                      <th className="p-3">Speed</th>
                      <th className="p-3">Link Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] bg-[#090d16]">
                    {activeDevice.interfaces.map(iface => (
                      <tr key={iface.id} className="hover:bg-[#131c2e] transition">
                        <td className="p-3 font-bold text-white">{iface.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            iface.mode === 'trunk' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {iface.mode.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          {iface.mode === 'trunk' ? (
                            <span className="text-purple-400">Allowed: {iface.allowedVlans?.join(',') || 'All'}</span>
                          ) : (
                            <select
                              value={iface.accessVlan || 1}
                              onChange={(e) => {
                                const newVlan = Number(e.target.value);
                                const updated = {
                                  ...activeDevice,
                                  interfaces: activeDevice.interfaces.map(i => i.id === iface.id ? { ...i, accessVlan: newVlan } : i)
                                };
                                updateDevice(updated);
                              }}
                              className="bg-[#090d16] border border-[#334155] rounded px-2 py-1 text-xs text-white"
                            >
                              {state.vlans.map(v => (
                                <option key={v.id} value={v.id}>
                                  VLAN {v.id} ({v.name})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">{iface.speedMbps} Mbps</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            iface.adminStatus === 'up' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}>
                            {iface.adminStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              const updated = {
                                ...activeDevice,
                                interfaces: activeDevice.interfaces.map(i => i.id === iface.id ? { ...i, adminStatus: i.adminStatus === 'up' ? 'down' : 'up' } as typeof i : i)
                              };
                              updateDevice(updated);
                            }}
                            className="px-2 py-1 text-[11px] rounded bg-[#1e293b] hover:bg-slate-700 text-slate-200 transition"
                          >
                            {iface.adminStatus === 'up' ? 'Shutdown' : 'No Shutdown'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Cisco Running-Configuration Preview */}
        <div className="w-full lg:w-[440px] bg-[#0f172a] border border-[#1e293b] rounded-xl flex flex-col overflow-hidden shadow-2xl">
          <div className="bg-[#1e293b] px-4 py-3 border-b border-[#334155] flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Live Running-Config Preview
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono">&bull; NVRAM Synced</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-[#090d16]">
            <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed whitespace-pre selection:bg-slate-700">
              {generateCiscoConfig(activeDevice, state.vlans)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
