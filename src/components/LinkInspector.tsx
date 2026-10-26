// Contextual Link Inspector Component

import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { NetworkLink } from '../types/network';
import { Cable, X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const LinkInspector: React.FC = () => {
  const { state, selectedLinkId, setSelectedLinkId, updateLink } = useNetwork();

  if (!selectedLinkId) return null;
  const link = state.links.find(l => l.id === selectedLinkId);
  if (!link) return null;

  const srcDev = state.devices.find(d => d.id === link.sourceDeviceId);
  const dstDev = state.devices.find(d => d.id === link.targetDeviceId);
  const srcIface = srcDev?.interfaces.find(i => i.id === link.sourceInterfaceId);
  const dstIface = dstDev?.interfaces.find(i => i.id === link.targetInterfaceId);

  const toggleLinkStatus = () => {
    const newStatus = link.status === 'up' ? 'down' : 'up';
    updateLink({ ...link, status: newStatus });
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between border-b border-[#334155] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#0284c7]/20 border border-[#0284c7]/40 rounded-lg text-[#38bdf8]">
            <Cable className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Link: {link.id}</h3>
            <span className="text-[10px] font-mono uppercase text-slate-400">
              Type: {link.linkType} link &bull; Status: <span className={link.status === 'up' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{link.status.toUpperCase()}</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setSelectedLinkId(null)}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Endpoints Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 bg-[#131c2e] border border-[#1e293b] rounded-lg">
          <div className="text-[10px] text-slate-400 uppercase">Source Endpoint</div>
          <div className="text-white font-bold mt-0.5">{srcDev?.hostname}</div>
          <div className="text-[#38bdf8] text-[11px]">{srcIface?.name}</div>
          <div className="text-slate-400 text-[10px] mt-1">MAC: {srcIface?.macAddress}</div>
          {srcIface?.accessVlan && (
            <div className="text-purple-400 text-[10px]">Access VLAN: {srcIface.accessVlan}</div>
          )}
        </div>

        <div className="p-3 bg-[#131c2e] border border-[#1e293b] rounded-lg">
          <div className="text-[10px] text-slate-400 uppercase">Target Endpoint</div>
          <div className="text-white font-bold mt-0.5">{dstDev?.hostname}</div>
          <div className="text-[#38bdf8] text-[11px]">{dstIface?.name}</div>
          <div className="text-slate-400 text-[10px] mt-1">MAC: {dstIface?.macAddress}</div>
          {dstIface?.accessVlan && (
            <div className="text-purple-400 text-[10px]">Access VLAN: {dstIface.accessVlan}</div>
          )}
        </div>
      </div>

      {/* Trunk Details if trunk */}
      {link.linkType === 'trunk' && (
        <div className="p-3 bg-[#090d16] border border-[#1e293b] rounded-lg text-xs space-y-1">
          <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            802.1Q Dot1q Trunk Configuration
          </div>
          <div className="text-slate-300 font-mono text-[11px]">
            Allowed VLANs: <span className="text-purple-400 font-bold">{link.allowedVlans?.join(', ') || 'All (1-4094)'}</span>
          </div>
          <div className="text-slate-400 text-[10px]">
            Native VLAN: 1 (Untagged traffic default mapping)
          </div>
        </div>
      )}

      {/* Action to Toggle Link */}
      <div className="flex justify-end pt-2">
        <button
          onClick={toggleLinkStatus}
          className={`px-3 py-1.5 text-xs font-bold font-mono rounded-lg transition ${
            link.status === 'up'
              ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
          }`}
        >
          {link.status === 'up' ? 'Disconnect Physical Cable (Cut Link)' : 'Reconnect Cable'}
        </button>
      </div>
    </div>
  );
};
