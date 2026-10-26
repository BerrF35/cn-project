// Contextual Device Inspector with Interfaces, CAM, ARP, Routing, Firewall, and Config Tabs

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { generateCiscoConfig } from '../engine/ciscoCli';
import { 
  Server, 
  Cpu, 
  Layers, 
  Route, 
  Shield, 
  Terminal, 
  Wifi, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Network,
  Share2
} from 'lucide-react';

export const DeviceInspector: React.FC = () => {
  const { state, selectedDeviceId, setSelectedDeviceId, setShowAnatomyModal, updateDevice } = useNetwork();
  const [activeTab, setActiveTab] = useState<'interfaces' | 'mac' | 'arp' | 'routes' | 'firewall' | 'services' | 'config'>('interfaces');

  if (!selectedDeviceId) return null;
  const device = state.devices.find(d => d.id === selectedDeviceId);
  if (!device) return null;

  const isSwitch = device.type === 'l2_switch' || device.type === 'l3_core';
  const isL3 = device.type === 'l3_core';
  const isFirewall = device.type === 'firewall';
  const isServer = device.type === 'server';

  // Toggle port status
  const handleTogglePort = (ifaceId: string) => {
    const updated = {
      ...device,
      interfaces: device.interfaces.map(i => {
        if (i.id === ifaceId) {
          return { ...i, adminStatus: i.adminStatus === 'up' ? 'down' : 'up' } as typeof i;
        }
        return i;
      })
    };
    updateDevice(updated);
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-xl text-slate-100 flex flex-col h-full">
      {/* Device Header */}
      <div className="bg-[#1e293b] p-4 border-b border-[#334155] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0284c7]/20 border border-[#0284c7]/40 text-[#38bdf8]">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">{device.hostname}</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {device.type.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{device.name} &bull; {device.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSwitch && (
            <button
              onClick={() => setShowAnatomyModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 transition"
              title="Inspect internal switch silicon architecture & 802.1Q pipeline"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Anatomy</span>
            </button>
          )}

          <button
            onClick={() => setSelectedDeviceId(null)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-[#090d16] px-3 border-b border-[#1e293b] overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('interfaces')}
          className={`px-3 py-2.5 font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'interfaces'
              ? 'border-[#38bdf8] text-[#38bdf8]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Interfaces ({device.interfaces.length})
        </button>

        {isSwitch && (
          <button
            onClick={() => setActiveTab('mac')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'mac'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            MAC Table ({device.macTable?.length || 0})
          </button>
        )}

        {(device.arpTable || isSwitch || isFirewall) && (
          <button
            onClick={() => setActiveTab('arp')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'arp'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ARP Cache ({device.arpTable?.length || 0})
          </button>
        )}

        {(isL3 || isFirewall) && (
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'routes'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Routing Table ({device.routingTable?.length || 0})
          </button>
        )}

        {isFirewall && (
          <button
            onClick={() => setActiveTab('firewall')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'firewall'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Firewall & NAT
          </button>
        )}

        {isServer && (
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'services'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Server Services
          </button>
        )}

        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-2.5 font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-[#38bdf8] text-[#38bdf8]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Cisco Config
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-4 overflow-y-auto flex-1 font-sans text-xs space-y-4">
        {/* INTERFACES TAB */}
        {activeTab === 'interfaces' && (
          <div className="space-y-3">
            {device.interfaces.map(iface => (
              <div
                key={iface.id}
                className="p-3 bg-[#131c2e] border border-[#1e293b] rounded-lg space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        iface.adminStatus === 'up' ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                    />
                    <span className="font-bold text-white font-mono text-sm">{iface.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {iface.mode.toUpperCase()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTogglePort(iface.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition ${
                      iface.adminStatus === 'up'
                        ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800'
                        : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
                    }`}
                  >
                    {iface.adminStatus === 'up' ? 'SHUTDOWN' : 'NO SHUTDOWN'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                  <div>MAC: <span className="text-slate-100">{iface.macAddress}</span></div>
                  <div>Speed: <span className="text-slate-100">{iface.speedMbps} Mbps</span></div>
                  {iface.ipAddress && (
                    <div>IP: <span className="text-[#38bdf8] font-bold">{iface.ipAddress}</span></div>
                  )}
                  {iface.subnetMask && (
                    <div>Mask: <span className="text-slate-400">{iface.subnetMask}</span></div>
                  )}
                  {iface.mode === 'access' && iface.accessVlan && (
                    <div>Access VLAN: <span className="text-purple-400 font-bold">VLAN {iface.accessVlan}</span></div>
                  )}
                  {iface.mode === 'trunk' && (
                    <div className="col-span-2">
                      Allowed VLANs: <span className="text-purple-400 font-bold">{iface.allowedVlans?.join(', ') || 'All'}</span>
                    </div>
                  )}
                  {iface.connectedTo && (
                    <div className="col-span-2 text-slate-400 text-[10px]">
                      Connected to: <span className="text-emerald-400 font-bold">{iface.connectedTo.deviceId}</span> ({iface.connectedTo.interfaceId})
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MAC TABLE TAB */}
        {activeTab === 'mac' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-mono text-[11px]">Dynamic CAM Hardware Table</span>
              <span className="text-emerald-400 font-mono text-[11px]">&bull; Aging Time: 300s</span>
            </div>
            {device.macTable && device.macTable.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[#1e293b]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#131c2e] text-slate-400">
                    <tr>
                      <th className="p-2">VLAN</th>
                      <th className="p-2">MAC Address</th>
                      <th className="p-2">Port</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] bg-[#090d16]">
                    {device.macTable.map((entry, i) => (
                      <tr key={i} className="hover:bg-[#131c2e] transition">
                        <td className="p-2 text-purple-400 font-bold">{entry.vlanId}</td>
                        <td className="p-2 text-slate-200">{entry.macAddress}</td>
                        <td className="p-2 text-[#38bdf8]">{entry.port}</td>
                        <td className="p-2 text-slate-400">{entry.type}</td>
                        <td className="p-2 text-slate-500">{entry.ageSec}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 italic">No entries in MAC table.</p>
            )}
          </div>
        )}

        {/* ARP CACHE TAB */}
        {activeTab === 'arp' && (
          <div>
            {device.arpTable && device.arpTable.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[#1e293b]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#131c2e] text-slate-400">
                    <tr>
                      <th className="p-2">IP Address</th>
                      <th className="p-2">MAC Hardware Addr</th>
                      <th className="p-2">Interface</th>
                      <th className="p-2">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] bg-[#090d16]">
                    {device.arpTable.map((entry, i) => (
                      <tr key={i} className="hover:bg-[#131c2e] transition">
                        <td className="p-2 text-emerald-400 font-bold">{entry.ipAddress}</td>
                        <td className="p-2 text-slate-200">{entry.macAddress}</td>
                        <td className="p-2 text-[#38bdf8]">{entry.interfaceId}</td>
                        <td className="p-2 text-slate-400">{entry.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 italic">No entries in ARP cache.</p>
            )}
          </div>
        )}

        {/* ROUTING TABLE TAB */}
        {activeTab === 'routes' && (
          <div>
            <div className="overflow-x-auto rounded-lg border border-[#1e293b]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#131c2e] text-slate-400">
                  <tr>
                    <th className="p-2">Proto</th>
                    <th className="p-2">Network / Prefix</th>
                    <th className="p-2">Next Hop</th>
                    <th className="p-2">Interface</th>
                    <th className="p-2">Metric</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b] bg-[#090d16]">
                  {device.routingTable?.map((r, i) => (
                    <tr key={i} className="hover:bg-[#131c2e] transition">
                      <td className="p-2 text-purple-400 font-bold">{r.protocol}</td>
                      <td className="p-2 text-white font-bold">{r.network}/{r.mask}</td>
                      <td className="p-2 text-[#38bdf8]">{r.nextHop}</td>
                      <td className="p-2 text-slate-400">{r.interfaceId}</td>
                      <td className="p-2 text-slate-500">{r.metric}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FIREWALL TAB */}
        {activeTab === 'firewall' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-xs text-white mb-2 uppercase tracking-wider">
                Active Security Policy Rules
              </h4>
              <div className="space-y-2">
                {device.firewallRules?.map(rule => (
                  <div
                    key={rule.id}
                    className="p-2.5 bg-[#131c2e] border border-[#1e293b] rounded-lg text-[11px] font-mono flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                          rule.action === 'PERMIT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {rule.action}
                        </span>
                        <span className="font-bold text-slate-200">{rule.id}</span>
                        <span className="text-slate-400 text-[10px]">({rule.sourceZone} &rarr; {rule.destZone})</span>
                      </div>
                      <div className="text-slate-400 mt-1 font-sans text-xs">{rule.description}</div>
                    </div>
                    <span className="text-slate-400 text-[10px] font-mono">{rule.hitCount} hits</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs text-white mb-2 uppercase tracking-wider">
                Dynamic PAT / NAT Translation Table
              </h4>
              <div className="overflow-x-auto rounded-lg border border-[#1e293b]">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-[#131c2e] text-slate-400">
                    <tr>
                      <th className="p-2">Inside IP:Port</th>
                      <th className="p-2">Outside IP:Port</th>
                      <th className="p-2">Proto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] bg-[#090d16]">
                    {device.natTranslations?.map((n, i) => (
                      <tr key={i}>
                        <td className="p-2 text-[#38bdf8]">{n.insideIp}:{n.insidePort}</td>
                        <td className="p-2 text-emerald-400">{n.outsideIp}:{n.outsidePort}</td>
                        <td className="p-2 text-slate-400">{n.protocol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            {device.dnsRecords && (
              <div>
                <h4 className="font-bold text-xs text-white mb-2">Authoritative DNS A Records</h4>
                <div className="space-y-1 font-mono text-xs">
                  {device.dnsRecords.map((rec, i) => (
                    <div key={i} className="p-2 bg-[#131c2e] rounded border border-[#1e293b] flex justify-between">
                      <span className="text-white">{rec.domain}</span>
                      <span className="text-emerald-400 font-bold">&rarr; {rec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {device.dhcpLeases && (
              <div>
                <h4 className="font-bold text-xs text-white mb-2">Active DHCP Dynamic Leases</h4>
                <div className="space-y-1 font-mono text-xs">
                  {device.dhcpLeases.map((lease, i) => (
                    <div key={i} className="p-2 bg-[#131c2e] rounded border border-[#1e293b] flex justify-between">
                      <span className="text-white">{lease.hostname} ({lease.mac})</span>
                      <span className="text-[#38bdf8] font-bold">{lease.ip} (VLAN {lease.vlanId})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CISCO CONFIG PREVIEW TAB */}
        {activeTab === 'config' && (
          <div>
            <pre className="p-3 bg-[#090d16] border border-[#1e293b] rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed">
              {generateCiscoConfig(device, state.vlans)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
