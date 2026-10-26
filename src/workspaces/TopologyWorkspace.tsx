// Interactive Enterprise Campus Topology Workspace (Phase C)

import React, { useState, useRef } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { DeviceInspector } from '../components/DeviceInspector';
import { LinkInspector } from '../components/LinkInspector';
import { 
  Server, 
  Cpu, 
  Shield, 
  Laptop, 
  Printer, 
  Radio, 
  Cloud, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter,
  Eye,
  Info
} from 'lucide-react';

export const TopologyWorkspace: React.FC = () => {
  const { 
    state, 
    selectedDeviceId, 
    setSelectedDeviceId, 
    selectedLinkId, 
    setSelectedLinkId, 
    activeVlanFilter, 
    setActiveVlanFilter,
    setShowAnatomyModal,
    setActiveWorkspace
  } = useNetwork();

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'canvas-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Helper to render distinct device icons
  const renderDeviceIcon = (type: string) => {
    switch (type) {
      case 'firewall':
        return <Shield className="w-5 h-5 text-rose-400" />;
      case 'l3_core':
        return <Cpu className="w-6 h-6 text-[#38bdf8]" />;
      case 'l2_switch':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'server':
        return <Server className="w-5 h-5 text-blue-400" />;
      case 'workstation':
        return <Server className="w-4 h-4 text-emerald-400" />;
      case 'laptop':
        return <Laptop className="w-4 h-4 text-cyan-400" />;
      case 'printer':
        return <Printer className="w-4 h-4 text-teal-400" />;
      case 'access_point':
        return <Radio className="w-4 h-4 text-amber-400" />;
      case 'cloud_router':
        return <Cloud className="w-5 h-5 text-sky-400" />;
      default:
        return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-[#090d16]">
      {/* Topology Canvas Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Controls Toolbar Overlay */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-[#0f172a]/90 backdrop-blur-md p-2 rounded-xl border border-[#1e293b] shadow-xl">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-r border-[#334155] pr-2">
            <button
              onClick={() => setZoom(z => Math.min(2, z + 0.15))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* VLAN Filter Selector */}
          <div className="flex items-center gap-1.5 pl-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">VLAN Filter:</span>
            <select
              value={activeVlanFilter || ''}
              onChange={(e) => setActiveVlanFilter(e.target.value ? Number(e.target.value) : null)}
              className="bg-[#1e293b] border border-[#334155] text-xs text-white rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-[#38bdf8]"
            >
              <option value="">All VLANs (Show Full Topology)</option>
              {state.vlans.map(v => (
                <option key={v.id} value={v.id}>
                  VLAN {v.id}: {v.name} ({v.subnet})
                </option>
              ))}
            </select>
          </div>

          {activeVlanFilter && (
            <button
              onClick={() => setActiveVlanFilter(null)}
              className="text-[11px] text-[#38bdf8] hover:underline ml-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Legend Overlay at bottom-left */}
        <div className="absolute bottom-4 left-4 z-20 bg-[#0f172a]/90 backdrop-blur-md p-3 rounded-xl border border-[#1e293b] shadow-xl text-xs space-y-1.5 hidden md:block">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Campus Hierarchy
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#f59e0b]" />
            <span className="text-slate-300 text-[11px]">Point-to-Point Transit Link (10.20.254.0/30)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#a855f7]" />
            <span className="text-slate-300 text-[11px]">802.1Q Dot1q Trunk Uplink (Allowed VLANs)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#38bdf8]" />
            <span className="text-slate-300 text-[11px]">Access Switchport (Untagged Department Link)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-rose-500 border-b border-dashed" />
            <span className="text-rose-400 text-[11px]">Disconnected / Down Interface</span>
          </div>
        </div>

        {/* Interactive SVG Canvas */}
        <div 
          className="flex-1 w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 1200 680"
            className="w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            <defs>
              <pattern id="topo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="15" r="0.8" fill="#1e293b" />
              </pattern>
            </defs>

            <rect id="canvas-bg" width="1200" height="680" fill="url(#topo-grid)" />

            {/* Department Zone Backing Halos */}
            <g opacity="0.35">
              {/* Building 1 (Admin & Finance) */}
              <rect x="40" y="310" width="320" height="300" rx="16" fill="#1e293b" stroke="#334155" strokeDasharray="4 4" />
              <text x="60" y="335" fill="#94a3b8" fontSize="12" fontWeight="bold">BUILDING 1: HR & FINANCE</text>

              {/* Building 2 (Engineering & R&D) */}
              <rect x="380" y="310" width="300" height="300" rx="16" fill="#1e293b" stroke="#334155" strokeDasharray="4 4" />
              <text x="400" y="335" fill="#94a3b8" fontSize="12" fontWeight="bold">BUILDING 2: ENGINEERING & OT</text>

              {/* Building 3 (Corporate Data & Services) */}
              <rect x="700" y="300" width="480" height="310" rx="16" fill="#1e293b" stroke="#334155" strokeDasharray="4 4" />
              <text x="720" y="325" fill="#94a3b8" fontSize="12" fontWeight="bold">BUILDING 3: DC & OPERATIONS</text>

              {/* DMZ Zone */}
              <rect x="760" y="30" width="350" height="150" rx="16" fill="#450a0a" stroke="#991b1b" strokeDasharray="4 4" />
              <text x="780" y="55" fill="#fca5a5" fontSize="12" fontWeight="bold">DMZ SECURE ZONE (VLAN 100)</text>
            </g>

            {/* Links */}
            <g>
              {state.links.map(link => {
                const src = state.devices.find(d => d.id === link.sourceDeviceId);
                const dst = state.devices.find(d => d.id === link.targetDeviceId);
                if (!src || !dst) return null;

                const isSelected = selectedLinkId === link.id;
                const isDown = link.status === 'down';
                const color = isDown ? '#ef4444' : (link.colorHex || '#38bdf8');
                const strokeWidth = link.linkType === 'trunk' ? 3.5 : (link.linkType === 'routed' ? 3 : 2);

                // Check VLAN filter dimming
                let isDimmed = false;
                if (activeVlanFilter) {
                  if (link.linkType === 'trunk') {
                    isDimmed = !link.allowedVlans?.includes(activeVlanFilter);
                  } else {
                    const srcIface = src.interfaces.find(i => i.id === link.sourceInterfaceId);
                    const dstIface = dst.interfaces.find(i => i.id === link.targetInterfaceId);
                    isDimmed = srcIface?.accessVlan !== activeVlanFilter && dstIface?.accessVlan !== activeVlanFilter;
                  }
                }

                return (
                  <g
                    key={link.id}
                    onClick={() => {
                      setSelectedLinkId(link.id);
                      setSelectedDeviceId(null);
                    }}
                    className="cursor-pointer"
                    opacity={isDimmed ? 0.15 : 1}
                  >
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={dst.x}
                      y2={dst.y}
                      stroke={color}
                      strokeWidth={isSelected ? strokeWidth + 3 : strokeWidth}
                      strokeDasharray={isDown ? '6 4' : undefined}
                    />

                    {/* Trunk Indicator label */}
                    {link.linkType === 'trunk' && (
                      <g transform={`translate(${(src.x + dst.x) / 2}, ${(src.y + dst.y) / 2})`}>
                        <rect x="-24" y="-9" width="48" height="18" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1" />
                        <text x="0" y="3" fill="#c084fc" fontSize="9" fontWeight="bold" textAnchor="middle">
                          TRUNK
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Devices Nodes */}
            <g>
              {state.devices.map(dev => {
                const isSelected = selectedDeviceId === dev.id;
                const iface = dev.interfaces[0];
                const devVlan = iface?.accessVlan;

                let isDimmed = false;
                if (activeVlanFilter) {
                  if (['l2_switch', 'l3_core', 'firewall'].includes(dev.type)) {
                    isDimmed = false; // Core and switches are part of all VLANs
                  } else {
                    isDimmed = devVlan !== activeVlanFilter;
                  }
                }

                return (
                  <g
                    key={dev.id}
                    transform={`translate(${dev.x}, ${dev.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDeviceId(dev.id);
                      setSelectedLinkId(null);
                    }}
                    className="cursor-pointer group"
                    opacity={isDimmed ? 0.2 : 1}
                  >
                    {/* Selection Halo */}
                    {isSelected && (
                      <circle cx="0" cy="0" r="28" fill="#38bdf8" opacity="0.25">
                        <animate attributeName="r" values="24;30;24" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Node Body */}
                    <circle
                      cx="0"
                      cy="0"
                      r={dev.type === 'l3_core' ? 22 : dev.type === 'firewall' ? 20 : 16}
                      fill={
                        dev.type === 'l3_core'
                          ? '#0284c7'
                          : dev.type === 'firewall'
                          ? '#991b1b'
                          : dev.type === 'l2_switch'
                          ? '#1e293b'
                          : '#131c2e'
                      }
                      stroke={isSelected ? '#38bdf8' : dev.type === 'l2_switch' ? '#6366f1' : '#334155'}
                      strokeWidth={isSelected ? 3 : 2}
                    />

                    {/* Icon centered */}
                    <g transform="translate(-10, -10)">
                      {renderDeviceIcon(dev.type)}
                    </g>

                    {/* Hostname Label */}
                    <text
                      x="0"
                      y={dev.type === 'l3_core' ? 34 : 26}
                      fill={isSelected ? '#38bdf8' : '#f8fafc'}
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono tracking-tight"
                    >
                      {dev.hostname}
                    </text>

                    {/* Sub-label (IP or role) */}
                    <text
                      x="0"
                      y={dev.type === 'l3_core' ? 45 : 37}
                      fill="#94a3b8"
                      fontSize="8"
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {dev.interfaces.find(i => i.ipAddress)?.ipAddress || dev.model.split(' ')[1] || ''}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Contextual Inspector Drawer */}
      {(selectedDeviceId || selectedLinkId) && (
        <div className="w-full lg:w-[420px] border-t lg:border-t-0 lg:border-l border-[#1e293b] flex flex-col max-h-[45vh] lg:max-h-full overflow-hidden bg-[#0f172a] shadow-2xl z-30">
          {selectedDeviceId && <DeviceInspector />}
          {selectedLinkId && <LinkInspector />}
        </div>
      )}
    </div>
  );
};
