// Flat vs Segmented Comparative Architecture Experiment Engine

export interface ExperimentMetrics {
  mode: 'FLAT' | 'SEGMENTED';
  broadcastRecipientsCount: number;
  totalForwardingEvents: number;
  blastRadiusPercentage: number;
  securityInspectionBarriers: number;
  unauthorizedProbeOutcome: 'SUCCESS_EXPOSED' | 'BLOCKED_PROTECTED';
  networkOverheadBytes: number;
  cpuInterruptCount: number;
  description: string;
}

export interface ExperimentComparisonResult {
  flat: ExperimentMetrics;
  segmented: ExperimentMetrics;
  metrics: {
    broadcastReductionPercent: number;
    forwardingEventsReductionPercent: number;
    securityImprovement: string;
    blastRadiusReductionPercent: number;
  };
  explanation: string[];
}

export function runFlatVsSegmentedExperiment(): ExperimentComparisonResult {
  // In a Flat network (all 24 endpoints in single broadcast domain 10.20.0.0/16):
  // When HR-PC-01 sends an ARP broadcast:
  // Every switch floods the broadcast out every access port (23 other devices receive it, wake up CPU, parse ARP).
  const totalEndpoints = 24;

  const flatMetrics: ExperimentMetrics = {
    mode: 'FLAT',
    broadcastRecipientsCount: 23, // All other endpoints receive the broadcast
    totalForwardingEvents: 27, // Switch floods across every port and uplink
    blastRadiusPercentage: 100, // 100% of campus endpoints affected
    securityInspectionBarriers: 0, // Direct L2 adjacency, no ACLs or firewall
    unauthorizedProbeOutcome: 'SUCCESS_EXPOSED', // Guest or rogue host can sniff or reach Finance/SCADA directly!
    networkOverheadBytes: 27 * 64, // 1728 bytes of broadcast traffic generated
    cpuInterruptCount: 23, // 23 endpoint NICs raise hardware IRQ
    description: 'Unsegmented flat network: Single broadcast domain. Every ARP request wakes every CPU on campus. Zero lateral security.'
  };

  // In NetScope 10-VLAN Segmented Network:
  // When HR-PC-01 sends an ARP broadcast within VLAN 20:
  // Broadcast is strictly bounded to VLAN 20 ports on ACC-SW-A (Fa0/2 and Fa0/3).
  // Only HR-PC-02 receives the frame! (1 recipient vs 23!).
  const segmentedMetrics: ExperimentMetrics = {
    mode: 'SEGMENTED',
    broadcastRecipientsCount: 1, // Only HR-PC-02 receives it
    totalForwardingEvents: 2, // Flooded only to ports in VLAN 20
    blastRadiusPercentage: 4.16, // Only 1 of 24 endpoints affected!
    securityInspectionBarriers: 3, // Access VLAN boundary + Core L3 ACL + Perimeter Firewall
    unauthorizedProbeOutcome: 'BLOCKED_PROTECTED', // Blocked by VLAN boundary and Core ACL
    networkOverheadBytes: 2 * 64, // 128 bytes
    cpuInterruptCount: 1, // Only 1 host CPU interrupted
    description: 'IEEE 802.1Q Segmented Network: Isolated broadcast domains per department. Inter-VLAN traffic routed through Core L3 with stateful inspection.'
  };

  const broadcastReduction = ((flatMetrics.broadcastRecipientsCount - segmentedMetrics.broadcastRecipientsCount) / flatMetrics.broadcastRecipientsCount) * 100;
  const forwardingReduction = ((flatMetrics.totalForwardingEvents - segmentedMetrics.totalForwardingEvents) / flatMetrics.totalForwardingEvents) * 100;
  const blastRadiusReduction = flatMetrics.blastRadiusPercentage - segmentedMetrics.blastRadiusPercentage;

  return {
    flat: flatMetrics,
    segmented: segmentedMetrics,
    metrics: {
      broadcastReductionPercent: Math.round(broadcastReduction),
      forwardingEventsReductionPercent: Math.round(forwardingReduction),
      securityImprovement: '3-tier Defense-in-Depth (VLAN Tag Isolation, L3 SVI Filtering, Stateful Edge Firewall)',
      blastRadiusReductionPercent: Math.round(blastRadiusReduction)
    },
    explanation: [
      'In the Flat Network, an ARP broadcast from a single workstation propagates to all 23 other devices, triggering NIC interrupt overhead across Finance, HR, Engineering, and shopfloor SCADA PLCs.',
      'In NetScope Segmented Architecture, IEEE 802.1Q tags isolate broadcasts to members of the specific VLAN (VLAN 20). Only 1 other device receives the frame — delivering a 95.6% reduction in unnecessary broadcast noise.',
      'Unauthorized lateral movement (e.g. Guest or compromised laptop attempting port scan against Finance database or SCADA controller) succeeds in the flat topology due to direct L2 adjacency, but is stopped by Core Access Lists and Firewall Security Zones in the segmented topology.'
    ]
  };
}
