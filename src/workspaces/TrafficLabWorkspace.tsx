// Interactive Traffic Simulation Lab & Header Dissection Workspace (Phase D)

import React, { useState, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { ProtocolType, SimulationStep } from '../types/network';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Layers, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Send,
  Cpu,
  Clock,
  ShieldAlert,
  ArrowRight,
  Download,
  Code2
} from 'lucide-react';
import { downloadTracePcap, formatWiresharkHexDump, buildRawFrameBytes } from '../engine/pcapExport';

export const TrafficLabWorkspace: React.FC = () => {
  const { state, runSimulation, setSelectedDeviceId } = useNetwork();

  // Test Generator Form State
  const [sourceId, setSourceId] = useState<string>('dev-hr-01');
  const [destId, setDestId] = useState<string>('dev-srv-erp');
  const [protocol, setProtocol] = useState<ProtocolType>('ICMP_PING');
  const [customDomain, setCustomDomain] = useState<string>('erp.corp.internal');
  const [targetPort, setTargetPort] = useState<number>(80);

  // Playback State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x
  const [showHexDump, setShowHexDump] = useState<boolean>(false);

  const lastTrace = state.lastTrace;
  const currentStep: SimulationStep | undefined = lastTrace?.steps[currentStepIndex];

  // Run initial simulation if none exists
  useEffect(() => {
    if (!lastTrace) {
      handleRun();
    }
  }, []);

  // Auto-play timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && lastTrace && currentStepIndex < lastTrace.steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 1500 / playbackSpeed);
    } else if (isPlaying && lastTrace && currentStepIndex >= lastTrace.steps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, lastTrace, playbackSpeed]);

  const handleRun = () => {
    const trace = runSimulation({
      protocol,
      sourceDeviceId: sourceId,
      destinationDeviceId: destId,
      customDomain,
      targetPort
    });
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const handleSelectHopDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  // Endpoint filter for source and dest
  const selectableSources = state.devices.filter(d => 
    ['workstation', 'laptop', 'iot', 'printer', 'cloud_router'].includes(d.type)
  );

  const selectableDests = state.devices.filter(d => 
    d.id !== sourceId && (d.interfaces.some(i => i.ipAddress) || d.type === 'server')
  );

  return (
    <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-[#090d16] text-slate-100">
      {/* Left: Experiment Configuration & Packet Timeline */}
      <div className="w-full xl:w-[480px] border-b xl:border-b-0 xl:border-r border-[#1e293b] flex flex-col bg-[#0f172a] overflow-y-auto">
        {/* Form Header */}
        <div className="p-4 border-b border-[#334155] bg-[#1e293b]">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-[#38bdf8]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Traffic Stimulus Generator
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Inject simulated Ethernet frames and trace wire-speed forwarding decisions.
          </p>
        </div>

        {/* Input Parameters Form */}
        <div className="p-4 space-y-3.5 border-b border-[#1e293b] text-xs">
          {/* Protocol Selector */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Protocol & Application Flow</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as ProtocolType)}
              className="w-full bg-[#090d16] border border-[#334155] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#38bdf8]"
            >
              <option value="ICMP_PING">ICMP Echo Ping (Ping Request/Reply)</option>
              <option value="ARP">ARP Resolution (Address Resolution Protocol)</option>
              <option value="TCP_SYN">TCP SYN 3-Way Handshake Connection</option>
              <option value="HTTP_GET">HTTP GET Web Application Request</option>
              <option value="DHCP_DISCOVER">DHCP DORA (Lease Acquisition via Relay)</option>
              <option value="DNS_QUERY">DNS Standard Query & A Record Resolution</option>
            </select>
          </div>

          {/* Source Endpoint */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Source Endpoint Host</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-[#090d16] border border-[#334155] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#38bdf8]"
            >
              {selectableSources.map(dev => (
                <option key={dev.id} value={dev.id}>
                  {dev.hostname} &bull; {dev.interfaces[0]?.ipAddress || 'DHCP'} (VLAN {dev.interfaces[0]?.accessVlan || '1'})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Endpoint (if applicable) */}
          {protocol !== 'DHCP_DISCOVER' && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Destination Host or Service</label>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="w-full bg-[#090d16] border border-[#334155] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#38bdf8]"
              >
                {selectableDests.map(dev => (
                  <option key={dev.id} value={dev.id}>
                    {dev.hostname} &bull; {dev.interfaces.find(i => i.ipAddress)?.ipAddress} ({dev.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Domain name field if DNS */}
          {protocol === 'DNS_QUERY' && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Target FQDN Domain Name</label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="w-full bg-[#090d16] border border-[#334155] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#38bdf8]"
                placeholder="erp.corp.internal"
              />
            </div>
          )}

          {/* Port field if TCP/HTTP */}
          {(protocol === 'TCP_SYN' || protocol === 'HTTP_GET') && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Destination TCP Port</label>
              <input
                type="number"
                value={targetPort}
                onChange={(e) => setTargetPort(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-[#334155] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#38bdf8]"
              />
            </div>
          )}

          <button
            onClick={handleRun}
            className="w-full py-2.5 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-lg transition shadow-lg flex items-center justify-center gap-2 mt-2"
          >
            <Send className="w-4 h-4" />
            <span>Transmit Simulated Packet</span>
          </button>
        </div>

        {/* Step-by-Step Playback Controls */}
        {lastTrace && (
          <div className="p-4 border-b border-[#1e293b] bg-[#090d16] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">
                Step {currentStepIndex + 1} of {lastTrace.steps.length}
              </span>
              <div className="flex items-center gap-1">
                {[0.5, 1, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                      playbackSpeed === speed
                        ? 'bg-[#38bdf8] text-slate-900'
                        : 'bg-[#1e293b] text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 disabled:opacity-40 transition"
                title="Step Backward"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow flex items-center gap-2 transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play Journey'}</span>
              </button>

              <button
                onClick={() => setCurrentStepIndex(prev => Math.min(lastTrace.steps.length - 1, prev + 1))}
                disabled={currentStepIndex >= lastTrace.steps.length - 1}
                className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 disabled:opacity-40 transition"
                title="Step Forward"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
                className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition"
                title="Reset to Step 1"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Chronological Event Timeline */}
        {lastTrace && (
          <div className="p-4 flex-1 overflow-y-auto space-y-2 text-xs">
            <h3 className="font-bold text-[11px] text-slate-400 uppercase tracking-wider mb-2">
              Hop-by-Hop Packet Event Timeline
            </h3>

            {lastTrace.steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const dev = state.devices.find(d => d.id === step.currentDeviceId);

              return (
                <div
                  key={step.stepId}
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    isActive
                      ? 'bg-[#0284c7]/20 border-[#38bdf8] text-white shadow ring-1 ring-[#38bdf8]'
                      : 'bg-[#131c2e] border-[#1e293b] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono font-bold">
                        {step.stepId}
                      </span>
                      <span className="font-bold text-white font-mono">{dev?.hostname}</span>
                    </div>

                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                        step.dropped
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : step.action === 'ROUTE'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : step.action === 'NAT_TRANSLATE'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {step.action}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-1">
                    {step.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Detailed Packet Inspector & Forwarding Rationale */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
        {/* Outcome Summary Banner */}
        {lastTrace && (
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
              lastTrace.success
                ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-200'
                : 'bg-rose-950/30 border-rose-600/40 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {lastTrace.success ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="font-bold text-base text-white">
                  {lastTrace.success ? 'Transmission & Delivery Succeeded' : 'Packet Filtered / Dropped'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {lastTrace.summary}
                </p>
              </div>
            </div>

            <div className="text-right text-xs font-mono space-y-0.5 shrink-0 hidden sm:block">
              <div>Total Hops: <span className="text-white font-bold">{lastTrace.packetStats.totalHops}</span></div>
              <div>L2 MAC Rewrites: <span className="text-purple-400 font-bold">{lastTrace.packetStats.l2Rewrites}</span></div>
              <div>NAT PAT Translations: <span className="text-amber-400 font-bold">{lastTrace.packetStats.natTranslations}</span></div>
            </div>
          </div>
        )}

        {/* Current Hop Decision Card */}
        {currentStep && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#38bdf8]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Hop Forwarding Rationale & Device Decision
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Device: <strong className="text-white">{currentStep.currentDeviceId}</strong>
              </span>
            </div>

            <div className="p-4 bg-[#131c2e] rounded-lg border border-[#1e293b] text-sm text-slate-200 leading-relaxed font-sans">
              {currentStep.rationale}
            </div>

            {/* Dropped Reason Alert if dropped */}
            {currentStep.dropped && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span><strong>Drop Reason:</strong> {currentStep.dropReason}</span>
              </div>
            )}
          </div>
        )}

        {/* Deep Header Dissection View (Wireshark-grade Inspection) */}
        {currentStep && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Protocol Header Dissection (OSI Layers 2 &ndash; 7)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {currentStep.has8021qTag && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                    802.1Q Encapsulated (VID {currentStep.vlanId})
                  </span>
                )}
                <button
                  onClick={() => setShowHexDump(!showHexDump)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    showHexDump 
                      ? 'bg-purple-900/60 border-purple-500 text-purple-200' 
                      : 'bg-[#131c2e] border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Toggle raw binary packet hex dump and byte offsets"
                >
                  <Code2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Wireshark Hex View</span>
                </button>

                <button
                  onClick={() => lastTrace && downloadTracePcap(lastTrace)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs shadow border border-emerald-500/50 transition active:scale-95"
                  title="Download standard libpcap binary packet trace file for Wireshark"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Export .PCAP (Wireshark)</span>
                </button>
              </div>
            </div>

            {/* Wireshark Raw Hex Dump Section */}
            {showHexDump && (
              <div className="bg-[#05070d] p-3.5 rounded-xl border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 border-b border-purple-900/40 pb-1.5">
                  <span className="font-bold">Raw Packet Hex Dump (Offset | Hex Bytes | ASCII)</span>
                  <span className="text-slate-400">Frame Length: {buildRawFrameBytes(currentStep).length} Bytes</span>
                </div>
                <pre className="font-mono text-[11px] text-purple-200 leading-relaxed overflow-x-auto select-all">
                  {formatWiresharkHexDump(buildRawFrameBytes(currentStep))}
                </pre>
              </div>
            )}

            <div className="space-y-3 font-mono text-xs">
              {/* Layer 2: Ethernet II Header */}
              <div className="p-3 bg-[#131c2e] border border-[#1e293b] rounded-lg space-y-1.5">
                <div className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider">
                  &bull; Layer 2 &mdash; Ethernet II Frame
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-300 text-[11px]">
                  <div>Src MAC: <span className="text-white font-bold">{currentStep.packetHeader.layer2.srcMac}</span></div>
                  <div>Dst MAC: <span className="text-white font-bold">{currentStep.packetHeader.layer2.dstMac}</span></div>
                  <div>EtherType: <span className="text-amber-400 font-bold">{currentStep.packetHeader.layer2.ethertype}</span></div>
                </div>

                {/* 802.1Q Tag breakdown if present */}
                {currentStep.packetHeader.layer2.vlanTag && (
                  <div className="mt-2 p-2 bg-[#090d16] rounded border border-purple-800/60 text-purple-300 grid grid-cols-4 gap-2 text-[10px]">
                    <div>TPID: <strong>0x8100</strong></div>
                    <div>PCP: <strong>{currentStep.packetHeader.layer2.vlanTag.pcp} (CoS)</strong></div>
                    <div>DEI: <strong>{currentStep.packetHeader.layer2.vlanTag.dei}</strong></div>
                    <div>VLAN ID: <strong className="text-white font-bold">{currentStep.packetHeader.layer2.vlanTag.vid}</strong></div>
                  </div>
                )}
              </div>

              {/* Layer 3: IPv4 Header (if IP packet) */}
              {currentStep.packetHeader.layer3 && (
                <div className="p-3 bg-[#131c2e] border border-[#1e293b] rounded-lg space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    &bull; Layer 3 &mdash; Internet Protocol Version 4 (IPv4)
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-300 text-[11px]">
                    <div>Src IP: <span className="text-[#38bdf8] font-bold">{currentStep.packetHeader.layer3.srcIp}</span></div>
                    <div>Dst IP: <span className="text-emerald-400 font-bold">{currentStep.packetHeader.layer3.dstIp}</span></div>
                    <div>TTL: <span className="text-purple-300 font-bold">{currentStep.packetHeader.layer3.ttl}</span></div>
                    <div>Protocol: <span className="text-amber-300 font-bold">{currentStep.packetHeader.layer3.protocol}</span></div>
                  </div>
                </div>
              )}

              {/* Layer 4: TCP / UDP / ICMP */}
              {currentStep.packetHeader.layer4 && (
                <div className="p-3 bg-[#131c2e] border border-[#1e293b] rounded-lg space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    &bull; Layer 4 &mdash; Transport Layer
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-300 text-[11px]">
                    {currentStep.packetHeader.layer4.srcPort && (
                      <div>Src Port: <span className="text-white font-bold">{currentStep.packetHeader.layer4.srcPort}</span></div>
                    )}
                    {currentStep.packetHeader.layer4.dstPort && (
                      <div>Dst Port: <span className="text-white font-bold">{currentStep.packetHeader.layer4.dstPort}</span></div>
                    )}
                    {currentStep.packetHeader.layer4.icmpType && (
                      <div>ICMP Type: <span className="text-emerald-400 font-bold">{currentStep.packetHeader.layer4.icmpType}</span></div>
                    )}
                    {currentStep.packetHeader.layer4.tcpFlags && (
                      <div>TCP Flags: <span className="text-purple-400 font-bold">[{currentStep.packetHeader.layer4.tcpFlags.join(', ')}]</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Payload Summary */}
              <div className="p-3 bg-[#090d16] border border-[#1e293b] rounded-lg text-slate-300 text-[11px]">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Payload:</span> {currentStep.packetHeader.payloadSummary}
              </div>
            </div>
          </div>
        )}

        {/* Hardware Silicon State on Current Hop */}
        {currentStep?.hardwareInternals && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 border-b border-[#334155] pb-3">
              <Cpu className="w-5 h-5 text-[#38bdf8]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Hop Silicon ASIC Internal State
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-2.5 bg-[#131c2e] rounded border border-[#1e293b]">
                <div className="text-[10px] text-slate-400">SerDes Ingress</div>
                <div className="text-white font-bold mt-0.5">{currentStep.hardwareInternals.ingressSerDes}</div>
              </div>
              <div className="p-2.5 bg-[#131c2e] rounded border border-[#1e293b]">
                <div className="text-[10px] text-slate-400">TCAM Match</div>
                <div className="text-emerald-400 font-bold mt-0.5">{currentStep.hardwareInternals.tcamLookup}</div>
              </div>
              <div className="p-2.5 bg-[#131c2e] rounded border border-[#1e293b]">
                <div className="text-[10px] text-slate-400">Switch Fabric Bus</div>
                <div className="text-[#38bdf8] font-bold mt-0.5">{currentStep.hardwareInternals.switchFabricBus}</div>
              </div>
              <div className="p-2.5 bg-[#131c2e] rounded border border-[#1e293b]">
                <div className="text-[10px] text-slate-400">Egress Queue</div>
                <div className="text-purple-300 font-bold mt-0.5">{currentStep.hardwareInternals.egressPortQueue}</div>
              </div>
              <div className="p-2.5 bg-[#131c2e] rounded border border-[#1e293b]">
                <div className="text-[10px] text-slate-400">802.1Q Tag Engine</div>
                <div className="text-amber-400 font-bold mt-0.5">{currentStep.hardwareInternals.tagEngineAction}</div>
              </div>
              <div className="p-2.5 bg-[#131c2e] rounded border border-[#1e293b]">
                <div className="text-[10px] text-slate-400">ASIC Latency</div>
                <div className="text-emerald-300 font-bold mt-0.5">{currentStep.hardwareInternals.latencyNanos} ns</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
