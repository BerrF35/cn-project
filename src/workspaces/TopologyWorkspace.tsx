import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { DeviceInspector } from '../components/DeviceInspector';
import { LinkInspector } from '../components/LinkInspector';
import { DeviceContextMenu } from '../components/DeviceContextMenu';
import { PacketFlightOverlay, PacketFlight, FlightPathNode } from '../components/PacketFlightOverlay';
import { NetworkDevice } from '../types/network';
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
  Info,
  Send,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  Zap,
  X,
  ExternalLink
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
    setActiveWorkspace,
    runSimulation
  } = useNetwork();

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    device: NetworkDevice;
    x: number;
    y: number;
  } | null>(null);

  // Canvas Target Selection State
  const [targetSelectSource, setTargetSelectSource] = useState<NetworkDevice | null>(null);

  // Active Paper Airplane Packet Flights State (Multiple simultaneous flights)
  const [activeFlights, setActiveFlights] = useState<PacketFlight[]>([]);

  // Flight Completion Telemetry Notification
  const [flightNotification, setFlightNotification] = useState<{
    id: string;
    success: boolean;
    summary: string;
    sourceName: string;
    targetName: string;
    rtt: string;
    hops: number;
    timestamp: string;
  } | null>(null);

  // Escape key listener to cancel target selection or context menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setTargetSelectSource(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to verify if two devices share an active physical link
  const hasDirectLink = useCallback((links: typeof state.links, idA: string, idB: string): boolean => {
    return links.some(
      l => (l.sourceDeviceId === idA && l.targetDeviceId === idB) ||
           (l.targetDeviceId === idA && l.sourceDeviceId === idB)
    );
  }, [state.links]);

  // BFS shortest physical link path finder (only traverses active lines)
  const findLinkHopPath = useCallback((links: typeof state.links, startId: string, endId: string): string[] => {
    if (startId === endId) return [startId];
    const adj = new Map<string, string[]>();
    for (const l of links) {
      if (l.status === 'down') continue;
      if (!adj.has(l.sourceDeviceId)) adj.set(l.sourceDeviceId, []);
      if (!adj.has(l.targetDeviceId)) adj.set(l.targetDeviceId, []);
      adj.get(l.sourceDeviceId)!.push(l.targetDeviceId);
      adj.get(l.targetDeviceId)!.push(l.sourceDeviceId);
    }
    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const last = cur[cur.length - 1];
      if (last === endId) return cur;
      for (const next of adj.get(last) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([...cur, next]);
        }
      }
    }
    return [startId, endId];
  }, []);

  // Trigger Packet Flight between two devices (STRICTLY ON NETWORK LINES)
  const triggerPacketFlight = useCallback((
    source: NetworkDevice, 
    target: NetworkDevice, 
    options?: { label?: string; colorHex?: string }
  ) => {
    setContextMenu(null);
    setTargetSelectSource(null);

    // Run authoritative deterministic simulation
    const trace = runSimulation({
      protocol: 'ICMP_PING',
      sourceDeviceId: source.id,
      destinationDeviceId: target.id
    });

    // 1. Collect sequence of device IDs from simulation trace
    const rawDeviceSequence: string[] = [];
    let dropDeviceId: string | null = null;
    let dropReasonText: string | undefined = undefined;

    for (const step of trace.steps) {
      if (!step.currentDeviceId) continue;
      if (step.dropped) {
        dropDeviceId = step.currentDeviceId;
        dropReasonText = step.dropReason;
      }
      const lastDev = rawDeviceSequence[rawDeviceSequence.length - 1];
      if (step.currentDeviceId !== lastDev) {
        rawDeviceSequence.push(step.currentDeviceId);
      }
      if (step.dropped) break;
    }

    if (rawDeviceSequence.length === 0) {
      rawDeviceSequence.push(source.id);
    }

    // 2. Strict Physical Link Expansion:
    // Guarantee that EVERY adjacent pair (A -> B) is connected by a real network cable in state.links!
    const strictlyConnectedDeviceIds: string[] = [rawDeviceSequence[0]];

    for (let i = 0; i < rawDeviceSequence.length - 1; i++) {
      const currentId = rawDeviceSequence[i];
      const nextId = rawDeviceSequence[i + 1];

      if (hasDirectLink(state.links, currentId, nextId)) {
        strictlyConnectedDeviceIds.push(nextId);
      } else {
        // Expand path along real network cables using graph search
        const expandedHops = findLinkHopPath(state.links, currentId, nextId);
        for (let j = 1; j < expandedHops.length; j++) {
          strictlyConnectedDeviceIds.push(expandedHops[j]);
        }
      }
    }

    // 3. Map to FlightPathNode with exact (x, y) coordinates
    const flightNodes: FlightPathNode[] = [];
    const srcVlan = source.interfaces[0]?.accessVlan || 20;

    for (let i = 0; i < strictlyConnectedDeviceIds.length; i++) {
      const devId = strictlyConnectedDeviceIds[i];
      const dev = state.devices.find(d => d.id === devId);
      if (!dev) continue;

      // Check if the link to the next device is a trunk link
      let isTrunk = false;
      if (i < strictlyConnectedDeviceIds.length - 1) {
        const nextId = strictlyConnectedDeviceIds[i + 1];
        const connectingLink = state.links.find(
          l => (l.sourceDeviceId === devId && l.targetDeviceId === nextId) ||
               (l.targetDeviceId === devId && l.sourceDeviceId === nextId)
        );
        isTrunk = connectingLink?.linkType === 'trunk';
      }

      const isDropNode = devId === dropDeviceId;

      flightNodes.push({
        x: dev.x,
        y: dev.y,
        deviceId: dev.id,
        name: dev.hostname || dev.name,
        vlanId: dev.interfaces[0]?.accessVlan || srcVlan,
        isTrunk,
        action: isDropNode ? 'DROP' : 'FORWARD',
        dropped: isDropNode,
        dropReason: isDropNode ? dropReasonText : undefined
      });
    }

    const newFlight: PacketFlight = {
      id: `flight-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceDeviceId: source.id,
      destinationDeviceId: target.id,
      protocol: 'ICMP_PING',
      trace,
      nodes: flightNodes,
      isTwoWay: trace.success,
      colorHex: options?.colorHex,
      label: options?.label
    };

    setActiveFlights(prev => [...prev.slice(-6), newFlight]);
  }, [runSimulation, state.devices, state.links, hasDirectLink, findLinkHopPath]);

  // Handle flight completion
  const handleFlightComplete = useCallback((flightId: string, success: boolean, summary: string) => {
    setActiveFlights(prev => {
      const flight = prev.find(f => f.id === flightId);
      if (flight) {
        const sourceDev = state.devices.find(d => d.id === flight.sourceDeviceId);
        const targetDev = state.devices.find(d => d.id === flight.destinationDeviceId);

        setFlightNotification({
          id: `notif-${Date.now()}`,
          success,
          summary,
          sourceName: sourceDev?.hostname || 'Source Host',
          targetName: targetDev?.hostname || 'Destination Host',
          rtt: success ? `${(Math.random() * 2 + 1.2).toFixed(1)}ms` : 'Packet Dropped',
          hops: Math.max(1, flight.nodes.length - 1),
          timestamp: new Date().toLocaleTimeString()
        });
      }
      return prev.filter(f => f.id !== flightId);
    });
  }, [state.devices]);

  // Multi-message simultaneous policy storm simulation
  const simulateAllPoliciesSimultaneously = useCallback(() => {
    const hr = state.devices.find(d => d.id === 'dev-hr-01');
    const hrPortal = state.devices.find(d => d.id === 'dev-srv-dc');
    const fin = state.devices.find(d => d.id === 'dev-fin-01');
    const finErp = state.devices.find(d => d.id === 'dev-srv-erp');
    const guest = state.devices.find(d => d.id === 'dev-guest-01');
    const prod = state.devices.find(d => d.id === 'dev-prod-01');
    const prodHist = state.devices.find(d => d.id === 'dev-iot-01');

    if (hr && hrPortal) {
      setTimeout(() => triggerPacketFlight(hr, hrPortal, { label: 'HR -> HR Portal [PERMIT]', colorHex: '#ec4899' }), 0);
    }
    if (fin && finErp) {
      setTimeout(() => triggerPacketFlight(fin, finErp, { label: 'Finance -> ERP [PERMIT]', colorHex: '#10b981' }), 200);
    }
    if (guest && finErp) {
      setTimeout(() => triggerPacketFlight(guest, finErp, { label: 'Guest -> Internal [BLOCKED]', colorHex: '#ef4444' }), 400);
    }
    if (prod && prodHist) {
      setTimeout(() => triggerPacketFlight(prod, prodHist, { label: 'Production -> Historian [PERMIT]', colorHex: '#f59e0b' }), 600);
    }
  }, [state.devices, triggerPacketFlight]);

  // Right-click on department zone halo
  const handleDepartmentZoneContextMenu = (e: React.MouseEvent, defaultDeviceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const dev = state.devices.find(d => d.id === defaultDeviceId);
    if (dev) {
      setContextMenu({ device: dev, x: e.clientX, y: e.clientY });
    }
  };

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

          {/* Active flight count badge */}
          {activeFlights.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#334155] text-emerald-400 font-mono text-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{activeFlights.length} {activeFlights.length === 1 ? 'Message' : 'Messages'} in Flight</span>
            </div>
          )}
        </div>

        {/* Policy-Based Inter-VLAN Security Multi-Flight Bar (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap items-center gap-2 bg-[#0f172a]/95 backdrop-blur-md p-2 rounded-xl border border-indigo-500/40 shadow-2xl">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/50 text-[11px] font-bold text-indigo-300">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Policy Security Matrix</span>
            </div>

            {/* Simultaneous Multi-Message Storm Button */}
            <button
              onClick={simulateAllPoliciesSimultaneously}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition active:scale-95"
              title="Launch 4 simultaneous messages across the network cables"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
              <span>Simulate All 4 Simultaneously</span>
            </button>

            {/* Quick individual policy simulations */}
            <button
              onClick={() => {
                const hr = state.devices.find(d => d.id === 'dev-hr-01');
                const hrPortal = state.devices.find(d => d.id === 'dev-srv-dc');
                if (hr && hrPortal) triggerPacketFlight(hr, hrPortal, { label: 'HR -> HR Portal [PERMIT]', colorHex: '#ec4899' });
              }}
              className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-slate-800 border border-pink-500/40 text-pink-300 text-xs font-medium transition"
              title="HR accessing designated HR Portal (VLAN 80)"
            >
              HR → HR Portal <span className="text-[10px] text-emerald-400 font-bold ml-0.5">ALLOW</span>
            </button>

            <button
              onClick={() => {
                const fin = state.devices.find(d => d.id === 'dev-fin-01');
                const finErp = state.devices.find(d => d.id === 'dev-srv-erp');
                if (fin && finErp) triggerPacketFlight(fin, finErp, { label: 'Finance -> ERP [PERMIT]', colorHex: '#10b981' });
              }}
              className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition"
              title="Finance accessing approved Accounting ERP (VLAN 80)"
            >
              Finance → ERP <span className="text-[10px] text-emerald-400 font-bold ml-0.5">ALLOW</span>
            </button>

            <button
              onClick={() => {
                const guest = state.devices.find(d => d.id === 'dev-guest-01');
                const finErp = state.devices.find(d => d.id === 'dev-srv-erp');
                if (guest && finErp) triggerPacketFlight(guest, finErp, { label: 'Guest -> Internal [BLOCKED]', colorHex: '#ef4444' });
              }}
              className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-slate-800 border border-rose-500/40 text-rose-300 text-xs font-medium transition"
              title="Guest Wi-Fi probing Internal ERP Server (VLAN 80)"
            >
              Guest → Internal <span className="text-[10px] text-rose-400 font-bold ml-0.5">BLOCK</span>
            </button>

            <button
              onClick={() => {
                const prod = state.devices.find(d => d.id === 'dev-prod-01');
                const prodHist = state.devices.find(d => d.id === 'dev-iot-01');
                if (prod && prodHist) triggerPacketFlight(prod, prodHist, { label: 'Prod -> SCADA Historian [PERMIT]', colorHex: '#f59e0b' });
              }}
              className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-medium transition"
              title="Production PLC accessing required Operational SCADA Historian (VLAN 90)"
            >
              Prod → Historian <span className="text-[10px] text-emerald-400 font-bold ml-0.5">ALLOW</span>
            </button>
          </div>
        </div>

        {/* Target Selection Crosshair Prompt Banner */}
        {targetSelectSource && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-sky-950/95 border border-sky-400/80 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            <div className="text-xs text-sky-100 font-mono">
              Source: <strong className="text-white">{targetSelectSource.hostname}</strong> ({targetSelectSource.interfaces[0]?.ipAddress}) → <span className="text-sky-300 font-bold">Click any destination host on canvas</span>
            </div>
            <button
              onClick={() => setTargetSelectSource(null)}
              className="p-1 rounded-md bg-sky-900 hover:bg-sky-800 text-sky-200 text-xs px-2 font-mono ml-2 transition"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

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
          className={`flex-1 w-full h-full select-none overflow-hidden ${
            targetSelectSource ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
          }`}
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
            <g opacity="0.45">
              {/* Building 1 (Admin & Finance) */}
              <g
                className="cursor-pointer"
                onContextMenu={(e) => handleDepartmentZoneContextMenu(e, 'dev-hr-01')}
              >
                <rect x="40" y="310" width="320" height="300" rx="16" fill="#1e293b" stroke="#334155" strokeDasharray="4 4" />
                <text x="60" y="335" fill="#94a3b8" fontSize="12" fontWeight="bold">BUILDING 1: HR & FINANCE</text>
                <text x="60" y="352" fill="#64748b" fontSize="9" className="font-mono">Right-click zone for HR packet</text>
              </g>

              {/* Building 2 (Engineering & R&D) */}
              <g
                className="cursor-pointer"
                onContextMenu={(e) => handleDepartmentZoneContextMenu(e, 'dev-eng-01')}
              >
                <rect x="380" y="310" width="300" height="300" rx="16" fill="#1e293b" stroke="#334155" strokeDasharray="4 4" />
                <text x="400" y="335" fill="#94a3b8" fontSize="12" fontWeight="bold">BUILDING 2: ENGINEERING & OT</text>
                <text x="400" y="352" fill="#64748b" fontSize="9" className="font-mono">Right-click zone for R&D packet</text>
              </g>

              {/* Building 3 (Corporate Data & Services) */}
              <g
                className="cursor-pointer"
                onContextMenu={(e) => handleDepartmentZoneContextMenu(e, 'dev-srv-erp')}
              >
                <rect x="700" y="300" width="480" height="310" rx="16" fill="#1e293b" stroke="#334155" strokeDasharray="4 4" />
                <text x="720" y="325" fill="#94a3b8" fontSize="12" fontWeight="bold">BUILDING 3: DC & OPERATIONS</text>
                <text x="720" y="342" fill="#64748b" fontSize="9" className="font-mono">Right-click zone for Server packet</text>
              </g>

              {/* DMZ Zone */}
              <g
                className="cursor-pointer"
                onContextMenu={(e) => handleDepartmentZoneContextMenu(e, 'dev-dmz-web')}
              >
                <rect x="760" y="30" width="350" height="150" rx="16" fill="#450a0a" stroke="#991b1b" strokeDasharray="4 4" />
                <text x="780" y="55" fill="#fca5a5" fontSize="12" fontWeight="bold">DMZ SECURE ZONE (VLAN 100)</text>
              </g>
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
                      if (targetSelectSource) {
                        triggerPacketFlight(targetSelectSource, dev);
                        return;
                      }
                      setSelectedDeviceId(dev.id);
                      setSelectedLinkId(null);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ device: dev, x: e.clientX, y: e.clientY });
                    }}
                    className={`cursor-pointer group ${targetSelectSource ? 'cursor-crosshair' : ''}`}
                    opacity={isDimmed ? 0.2 : 1}
                  >
                    {/* Selection Halo */}
                    {isSelected && (
                      <circle cx="0" cy="0" r="28" fill="#38bdf8" opacity="0.25">
                        <animate attributeName="r" values="24;30;24" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Target Selection Pulse Halo if active selection mode */}
                    {targetSelectSource && targetSelectSource.id !== dev.id && (
                      <circle cx="0" cy="0" r="24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3">
                        <animate attributeName="r" values="20;26;20" dur="1.5s" repeatCount="indefinite" />
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

            {/* Packet Flight Animation Layer (Multiple Paper Planes gliding along links concurrently) */}
            <PacketFlightOverlay
              flights={activeFlights}
              onFlightComplete={handleFlightComplete}
            />
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

      {/* Floating Flight Completion Notification Toast */}
      {flightNotification && (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-[#0f172a]/95 border border-[#334155] rounded-xl shadow-2xl p-4 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              {flightNotification.success ? (
                <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-white font-mono">
                  {flightNotification.success ? 'ICMP Echo Reply Received' : 'Packet Transmission Dropped'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {flightNotification.sourceName} → {flightNotification.targetName} • RTT: {flightNotification.rtt} • {flightNotification.hops} Hops
                </div>
              </div>
            </div>
            <button
              onClick={() => setFlightNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2.5 text-xs text-slate-300 bg-[#090d16] p-2.5 rounded-lg border border-[#1e293b] font-mono leading-relaxed text-[11px]">
            {flightNotification.summary}
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <button
              onClick={() => {
                setActiveWorkspace('traffic');
                setFlightNotification(null);
              }}
              className="text-xs text-[#38bdf8] hover:underline flex items-center gap-1 font-mono"
            >
              <span>Inspect Step-by-Step in Traffic Lab</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={() => setFlightNotification(null)}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Interactive Right-Click Device Context Menu */}
      {contextMenu && (
        <DeviceContextMenu
          device={contextMenu.device}
          x={contextMenu.x}
          y={contextMenu.y}
          vlans={state.vlans}
          allDevices={state.devices}
          onClose={() => setContextMenu(null)}
          onSendPacket={(src, dst) => triggerPacketFlight(src, dst)}
          onStartCanvasTargetSelect={(src) => setTargetSelectSource(src)}
          onInspect={(dev) => {
            setSelectedDeviceId(dev.id);
            if (['l3_core', 'l2_switch'].includes(dev.type)) {
              setShowAnatomyModal(true);
            }
          }}
          onOpenCli={(dev) => {
            setSelectedDeviceId(dev.id);
            setActiveWorkspace('studio');
          }}
          onArpBroadcast={(dev) => {
            const trace = runSimulation({ protocol: 'ARP', sourceDeviceId: dev.id });
            setFlightNotification({
              id: `arp-${Date.now()}`,
              success: trace.success,
              summary: trace.summary,
              sourceName: dev.hostname,
              targetName: 'VLAN Broadcast Domain (ff:ff:ff:ff:ff:ff)',
              rtt: '0.8ms',
              hops: 1,
              timestamp: new Date().toLocaleTimeString()
            });
          }}
        />
      )}
    </div>
  );
};
