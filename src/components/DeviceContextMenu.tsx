// Context Menu for Right-Clicking Devices on the Topology Canvas
// Enables 1-click packet dispatch, cross-department ping, and Cisco CLI navigation

import React, { useEffect, useRef } from 'react';
import { NetworkDevice, VlanDefinition } from '../types/network';
import { 
  Send, 
  Crosshair, 
  Activity, 
  Terminal, 
  Radio, 
  X, 
  Building2, 
  Server, 
  ArrowRight
} from 'lucide-react';

interface DeviceContextMenuProps {
  device: NetworkDevice;
  x: number;
  y: number;
  vlans: VlanDefinition[];
  allDevices: NetworkDevice[];
  onClose: () => void;
  onSendPacket: (source: NetworkDevice, destination: NetworkDevice) => void;
  onStartCanvasTargetSelect: (source: NetworkDevice) => void;
  onInspect: (device: NetworkDevice) => void;
  onOpenCli: (device: NetworkDevice) => void;
  onArpBroadcast: (device: NetworkDevice) => void;
}

export const DeviceContextMenu: React.FC<DeviceContextMenuProps> = ({
  device,
  x,
  y,
  vlans,
  allDevices,
  onClose,
  onSendPacket,
  onStartCanvasTargetSelect,
  onInspect,
  onOpenCli,
  onArpBroadcast
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const devVlanId = device.interfaces[0]?.accessVlan || 10;
  const devVlan = vlans.find(v => v.id === devVlanId);

  // Filter other candidate destination devices from different departments
  const candidateTargets = allDevices.filter(d => 
    d.id !== device.id && 
    !['dev-acc-sw-a', 'dev-acc-sw-b', 'dev-acc-sw-c', 'dev-core-01', 'dev-dmz-sw-01'].includes(d.id)
  );

  // Quick department presets
  const quickTargets = [
    { label: 'HR Dept (VLAN 20)', devId: 'dev-hr-02', color: '#ec4899' },
    { label: 'Finance (VLAN 30)', devId: 'dev-fin-01', color: '#10b981' },
    { label: 'Engineering R&D (VLAN 40)', devId: 'dev-eng-01', color: '#8b5cf6' },
    { label: 'Production SCADA (VLAN 50)', devId: 'dev-prod-01', color: '#f59e0b' },
    { label: 'Corporate Staff (VLAN 60)', devId: 'dev-staff-01', color: '#06b6d4' },
    { label: 'Internal ERP Server (VLAN 80)', devId: 'dev-srv-erp', color: '#3b82f6' },
    { label: 'Public Internet (8.8.8.8)', devId: 'dev-ext-dns', color: '#38bdf8' }
  ].filter(t => t.devId !== device.id);

  // Keep menu within viewport bounds
  const adjustedX = Math.min(x, window.innerWidth - 320);
  const adjustedY = Math.min(y, window.innerHeight - 440);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-76 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header with Device Identity */}
      <div className="bg-[#1e293b] p-3 border-b border-[#334155] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="text-xs font-bold text-white font-mono">{device.hostname}</div>
            <div className="text-[10px] text-slate-400">
              {devVlan ? `VLAN ${devVlan.id}: ${devVlan.name}` : device.name}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2 space-y-1">
        {/* Interactive Canvas Target Selector */}
        <button
          onClick={() => {
            onClose();
            onStartCanvasTargetSelect(device);
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 border border-sky-800/40 font-semibold transition"
        >
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#38bdf8]" />
            <span>Select Target on Canvas</span>
          </div>
          <span className="text-[10px] font-mono bg-sky-900/80 px-1.5 py-0.5 rounded text-sky-200">
            Click Node
          </span>
        </button>

        {/* Quick Send Cross-Department Ping Flyout Section */}
        <div className="pt-1">
          <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Send Packet To Department:</span>
            <Send className="w-3 h-3 text-slate-500" />
          </div>
          <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
            {quickTargets.map(target => {
              const targetDev = candidateTargets.find(d => d.id === target.devId);
              if (!targetDev) return null;
              return (
                <button
                  key={target.devId}
                  onClick={() => {
                    onClose();
                    onSendPacket(device, targetDev);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1e293b] text-slate-300 hover:text-white transition group text-left"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: target.color }} 
                    />
                    <span className="truncate max-w-[170px]">{target.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Technical Actions */}
        <div className="border-t border-[#1e293b] pt-1.5 space-y-0.5">
          <button
            onClick={() => {
              onClose();
              onInspect(device);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1e293b] text-slate-300 hover:text-white transition"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Inspect Hardware & Port Telemetry</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCli(device);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1e293b] text-slate-300 hover:text-white transition"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Open in Cisco CLI Terminal</span>
          </button>

          {device.type !== 'l3_core' && device.type !== 'firewall' && (
            <button
              onClick={() => {
                onClose();
                onArpBroadcast(device);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1e293b] text-slate-300 hover:text-white transition"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Broadcast ARP Who-Has Frame</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
