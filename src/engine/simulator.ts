// Deterministic Network Protocol Simulation Engine for NetScope

import {
  NetworkState,
  NetworkDevice,
  NetworkInterface,
  ProtocolType,
  SimulationTrace,
  SimulationStep,
  PacketHeader,
  HardwareInternalState
} from '../types/network';
import { isIpInSubnet, calculateSubnet } from './subnetting';

export interface SimulationParams {
  protocol: ProtocolType;
  sourceDeviceId: string;
  destinationDeviceId?: string;
  destinationIp?: string;
  customDomain?: string; // For DNS
  targetPort?: number; // For TCP
}

export function simulateTraffic(
  state: NetworkState,
  params: SimulationParams
): { updatedState: NetworkState; trace: SimulationTrace } {
  const steps: SimulationStep[] = [];
  let stepCounter = 1;
  let timestampOffset = 0;
  let success = false;
  let summary = '';
  let framesFlooded = 0;
  let l2Rewrites = 0;
  let natTranslations = 0;

  // Clone devices and tables to simulate mutation
  const workingDevices = JSON.parse(JSON.stringify(state.devices)) as NetworkDevice[];
  const findDevice = (id: string) => workingDevices.find(d => d.id === id);

  const srcDev = findDevice(params.sourceDeviceId);
  if (!srcDev) {
    throw new Error(`Source device ${params.sourceDeviceId} not found`);
  }

  let dstDev: NetworkDevice | undefined;
  let targetIp = params.destinationIp || '';

  if (params.destinationDeviceId) {
    dstDev = findDevice(params.destinationDeviceId);
    if (dstDev && !targetIp) {
      targetIp = dstDev.interfaces.find(i => i.ipAddress)?.ipAddress || '';
    }
  } else if (targetIp) {
    dstDev = workingDevices.find(d => d.interfaces.some(i => i.ipAddress === targetIp));
  }

  const srcIface = srcDev.interfaces.find(i => i.ipAddress) || srcDev.interfaces[0];
  const srcIp = srcIface?.ipAddress || '0.0.0.0';
  const srcMac = srcIface?.macAddress || '00:00:00:00:00:00';
  const srcVlan = srcIface?.accessVlan || 1;

  // Helper to record a simulation step
  function recordStep(step: Omit<SimulationStep, 'stepId' | 'timestampMs' | 'rationale'> & { rationale?: string }) {
    timestampOffset += Math.floor(Math.random() * 4) + 2;
    steps.push({
      stepId: stepCounter++,
      timestampMs: timestampOffset,
      rationale: step.rationale || step.dropReason || step.action,
      ...step
    });
  }

  // --- PROTOCOL: DHCP DISCOVER (DORA) ---
  if (params.protocol === 'DHCP_DISCOVER') {
    const dhcpHeader: PacketHeader = {
      layer2: {
        srcMac,
        dstMac: 'ff:ff:ff:ff:ff:ff',
        ethertype: '0x0800'
      },
      layer3: {
        srcIp: '0.0.0.0',
        dstIp: '255.255.255.255',
        ttl: 64,
        protocol: 'UDP',
        checksum: '0x3a1f',
        identification: 1042
      },
      layer4: {
        srcPort: 68,
        dstPort: 67,
        udpLength: 308
      },
      payloadSummary: `DHCP Discover (xid: 0x7fa2b1, Client MAC: ${srcMac}, Requesting IP for VLAN ${srcVlan})`
    };

    recordStep({
      currentDeviceId: srcDev.id,
      egressInterfaceIds: [srcIface.id],
      vlanId: srcVlan,
      has8021qTag: false,
      packetHeader: dhcpHeader,
      action: 'ORIGINATE',
      rationale: `${srcDev.name} broadcast DHCP Discover seeking IP allocation on VLAN ${srcVlan}`,
      hardwareInternals: {
        ingressSerDes: 'Host NIC Driver Tx Ring Buffer',
        tcamLookup: 'N/A (Host Origin)',
        switchFabricBus: 'PCIe bus to PHY',
        egressPortQueue: 'NIC Outbound FIFO',
        tagEngineAction: 'UNTOUCHED',
        latencyNanos: 80
      }
    });

    // Traverse to access switch
    const accessLink = state.links.find(
      l => (l.sourceDeviceId === srcDev.id && l.sourceInterfaceId === srcIface.id) ||
           (l.targetDeviceId === srcDev.id && l.targetInterfaceId === srcIface.id)
    );

    if (!accessLink) {
      recordStep({
        currentDeviceId: srcDev.id,
        egressInterfaceIds: [],
        vlanId: srcVlan,
        has8021qTag: false,
        packetHeader: dhcpHeader,
        action: 'DROP',
        dropped: true,
        dropReason: 'Host physical link disconnected / no carrier'
      });
      summary = 'DHCP Discover failed: Host link disconnected';
    } else {
      const swId = accessLink.sourceDeviceId === srcDev.id ? accessLink.targetDeviceId : accessLink.sourceDeviceId;
      const swPort = accessLink.sourceDeviceId === srcDev.id ? accessLink.targetInterfaceId : accessLink.sourceInterfaceId;
      const sw = findDevice(swId);

      if (sw) {
        // Learn MAC
        sw.macTable = sw.macTable || [];
        if (!sw.macTable.some(m => m.macAddress === srcMac && m.vlanId === srcVlan)) {
          sw.macTable.push({ vlanId: srcVlan, macAddress: srcMac, port: swPort, type: 'DYNAMIC', ageSec: 0 });
        }

        // Trunk uplink
        const trunkIface = sw.interfaces.find(i => i.mode === 'trunk' && i.isUplink);
        const trunkAllowed = trunkIface?.allowedVlans?.includes(srcVlan);

        if (!trunkIface || trunkIface.adminStatus === 'down' || !trunkAllowed) {
          recordStep({
            currentDeviceId: sw.id,
            ingressInterfaceId: swPort,
            egressInterfaceIds: [],
            vlanId: srcVlan,
            has8021qTag: false,
            packetHeader: dhcpHeader,
            action: 'DROP',
            dropped: true,
            dropReason: !trunkAllowed ? `VLAN ${srcVlan} is pruned/missing from trunk allowed list` : 'Trunk interface down'
          });
          summary = `DHCP Discover dropped by ${sw.name}: Trunk pruning error`;
        } else {
          // Tagged 802.1Q on trunk
          const taggedHeader: PacketHeader = {
            ...dhcpHeader,
            layer2: {
              ...dhcpHeader.layer2,
              ethertype: '0x8100',
              vlanTag: { tpid: '0x8100', pcp: 6, dei: 0, vid: srcVlan }
            }
          };

          recordStep({
            currentDeviceId: sw.id,
            ingressInterfaceId: swPort,
            egressInterfaceIds: [trunkIface.id],
            vlanId: srcVlan,
            has8021qTag: true,
            packetHeader: taggedHeader,
            action: 'FORWARD',
            rationale: `Switch ${sw.name} inserted 802.1Q tag (VID ${srcVlan}) and forwarded DHCP broadcast via trunk ${trunkIface.name}`,
            hardwareInternals: {
              ingressSerDes: `Port ${swPort} 100BASE-TX PHY SerDes`,
              tcamLookup: `Broadcast CAM entry -> Flooded to VLAN ${srcVlan} members`,
              switchFabricBus: 'Non-blocking crossbar switch fabric matrix',
              egressPortQueue: `Trunk ${trunkIface.name} High Priority CoS 6 Queue`,
              tagEngineAction: 'TAG_INSERTED',
              latencyNanos: 420
            }
          });

          // Core switch receives
          const core = findDevice('dev-core-01');
          if (core) {
            const coreSvi = core.svis?.find(s => s.vlanId === srcVlan);
            const helper = coreSvi?.ipHelperAddress;

            if (helper) {
              const relayedHeader: PacketHeader = {
                layer2: {
                  srcMac: '00:1c:58:11:bb:03',
                  dstMac: '00:50:56:03:80:01', // DHCP server MAC
                  ethertype: '0x0800'
                },
                layer3: {
                  srcIp: coreSvi.ipAddress,
                  dstIp: helper,
                  ttl: 64,
                  protocol: 'UDP',
                  checksum: '0x2211',
                  identification: 1043
                },
                layer4: {
                  srcPort: 67,
                  dstPort: 67,
                  udpLength: 308
                },
                payloadSummary: `DHCP Relay Agent Forward (giaddr: ${coreSvi.ipAddress}, Relay SVI: Vlan${srcVlan})`
              };

              recordStep({
                currentDeviceId: core.id,
                ingressInterfaceId: 'Gi1/0/3',
                egressInterfaceIds: ['Vlan80'],
                vlanId: 80,
                has8021qTag: false,
                packetHeader: relayedHeader,
                action: 'ROUTE',
                rationale: `Core L3 switch acting as DHCP Relay Agent: Converted L2 broadcast into unicast to helper ${helper} (giaddr ${coreSvi.ipAddress})`,
                hardwareInternals: {
                  ingressSerDes: 'Gi1/0/3 SFP SerDes Receiver',
                  tcamLookup: 'SVI Vlan' + srcVlan + ' ip helper-address interception',
                  switchFabricBus: 'L3 Routing ASIC CEF Engine',
                  egressPortQueue: 'VLAN 80 Egress Queue',
                  tagEngineAction: 'TAG_REMOVED',
                  latencyNanos: 850
                }
              });

              // DHCP Server allocation
              const srvDc = findDevice('dev-srv-dc');
              if (srvDc) {
                const allocatedIp = `10.20.${srcVlan}.115`;
                const ackHeader: PacketHeader = {
                  layer2: {
                    srcMac: '00:50:56:03:80:01',
                    dstMac: '00:1c:58:11:bb:03',
                    ethertype: '0x0800'
                  },
                  layer3: {
                    srcIp: srvDc.interfaces[0].ipAddress!,
                    dstIp: coreSvi.ipAddress,
                    ttl: 64,
                    protocol: 'UDP',
                    checksum: '0x99a2',
                    identification: 1044
                  },
                  layer4: {
                    srcPort: 67,
                    dstPort: 67
                  },
                  payloadSummary: `DHCP ACK: Leased ${allocatedIp} to ${srcMac} (Subnet Mask: 255.255.255.0, Gw: ${coreSvi.ipAddress}, DNS: 10.20.80.11)`
                };

                recordStep({
                  currentDeviceId: srvDc.id,
                  egressInterfaceIds: ['eth0'],
                  vlanId: 80,
                  has8021qTag: false,
                  packetHeader: ackHeader,
                  action: 'REPLY',
                  rationale: `DHCP Server ${srvDc.hostname} verified scope for giaddr ${coreSvi.ipAddress} and generated DHCP ACK offering IP ${allocatedIp}`,
                  hardwareInternals: {
                    ingressSerDes: 'Server 10GbE SFP+ SerDes',
                    tcamLookup: 'Scope database query matched VLAN ' + srcVlan,
                    switchFabricBus: 'PCIe bus',
                    egressPortQueue: 'Tx buffer ring',
                    tagEngineAction: 'UNTOUCHED',
                    latencyNanos: 1200
                  }
                });

                success = true;
                summary = `DHCP DORA sequence completed: ${srcDev.name} successfully leased ${allocatedIp} via DHCP Relay on Core SVI Vlan${srcVlan}.`;
              }
            }
          }
        }
      }
    }
  }

  // --- PROTOCOL: DNS QUERY ---
  else if (params.protocol === 'DNS_QUERY') {
    const queryDomain = params.customDomain || 'erp.corp.internal';
    const dnsSrv = findDevice('dev-srv-dns')!;
    const dnsIp = dnsSrv.interfaces[0].ipAddress!;

    const dnsQueryHeader: PacketHeader = {
      layer2: {
        srcMac,
        dstMac: '00:1c:58:11:bb:01', // Gateway MAC
        ethertype: '0x0800'
      },
      layer3: {
        srcIp,
        dstIp: dnsIp,
        ttl: 64,
        protocol: 'UDP',
        checksum: '0x8821',
        identification: 2011
      },
      layer4: {
        srcPort: 54123,
        dstPort: 53,
        udpLength: 42
      },
      payloadSummary: `DNS Standard Query (0x01a4): A record query for "${queryDomain}"`
    };

    recordStep({
      currentDeviceId: srcDev.id,
      egressInterfaceIds: [srcIface.id],
      vlanId: srcVlan,
      has8021qTag: false,
      packetHeader: dnsQueryHeader,
      action: 'ORIGINATE',
      rationale: `${srcDev.name} sending DNS Query for ${queryDomain} to nameserver ${dnsIp}`
    });

    // Check if DNS server has record
    const record = dnsSrv.dnsRecords?.find(r => r.domain === queryDomain);

    if (record) {
      const dnsResponseHeader: PacketHeader = {
        layer2: {
          srcMac: dnsSrv.interfaces[0].macAddress,
          dstMac: srcMac,
          ethertype: '0x0800'
        },
        layer3: {
          srcIp: dnsIp,
          dstIp: srcIp,
          ttl: 64,
          protocol: 'UDP',
          checksum: '0x8822',
          identification: 2012
        },
        layer4: {
          srcPort: 53,
          dstPort: 54123,
          udpLength: 58
        },
        payloadSummary: `DNS Standard Query Response: ${queryDomain} -> A ${record.value} (TTL ${record.ttl}s)`
      };

      recordStep({
        currentDeviceId: dnsSrv.id,
        egressInterfaceIds: ['eth0'],
        vlanId: 80,
        has8021qTag: false,
        packetHeader: dnsResponseHeader,
        action: 'REPLY',
        rationale: `DNS Server ${dnsSrv.hostname} answered with authoritative A record ${record.value}`
      });

      success = true;
      summary = `DNS Resolution succeeded: ${queryDomain} resolved to ${record.value}`;
    } else {
      recordStep({
        currentDeviceId: dnsSrv.id,
        egressInterfaceIds: ['eth0'],
        vlanId: 80,
        has8021qTag: false,
        packetHeader: dnsQueryHeader,
        action: 'DROP',
        dropped: true,
        dropReason: `DNS NXDOMAIN: Record not found for "${queryDomain}"`
      });
      summary = `DNS Resolution failed: NXDOMAIN for ${queryDomain}`;
    }
  }

  // --- GENERAL IP / ARP / PING / TCP / NAT TRAFFIC ---
  else {
    // 1. Host Local vs Remote Subnet Decision
    const srcVlanDef = state.vlans.find(v => v.id === srcVlan);
    const isSameSubnet = srcVlanDef
      ? isIpInSubnet(targetIp, srcVlanDef.subnet.split('/')[0], parseInt(srcVlanDef.subnet.split('/')[1], 10))
      : false;

    // Check ARP resolution
    let targetMac = '';
    let isArpRequired = false;

    if (isSameSubnet) {
      // Local destination: resolve dstIp MAC directly
      const cached = srcDev.arpTable?.find(a => a.ipAddress === targetIp);
      if (cached) {
        targetMac = cached.macAddress;
      } else {
        isArpRequired = true;
        targetMac = dstDev?.interfaces.find(i => i.ipAddress === targetIp)?.macAddress || '00:50:56:00:00:99';
      }
    } else {
      // Remote destination: resolve Default Gateway MAC
      const gwIp = srcDev.defaultGateway || srcVlanDef?.gatewayIp;
      if (!gwIp) {
        recordStep({
          currentDeviceId: srcDev.id,
          egressInterfaceIds: [],
          vlanId: srcVlan,
          has8021qTag: false,
          packetHeader: {
            layer2: { srcMac, dstMac: '00:00:00:00:00:00', ethertype: '0x0800' },
            payloadSummary: 'Network Unreachable'
          },
          action: 'DROP',
          dropped: true,
          dropReason: 'Host has no Default Gateway configured to reach remote IP'
        });
        return {
          updatedState: { ...state, devices: workingDevices },
          trace: {
            id: `trace-${Date.now()}`,
            protocol: params.protocol,
            sourceDeviceId: srcDev.id,
            destinationDeviceId: dstDev?.id || '',
            destinationIp: targetIp,
            startedAt: new Date().toISOString(),
            completed: true,
            success: false,
            summary: 'Routing failure: No Default Gateway configured on source host',
            steps,
            packetStats: { totalHops: 1, framesFlooded: 0, bytesSimulated: 64, l2Rewrites: 0, natTranslations: 0 }
          }
        };
      }

      const cachedGw = srcDev.arpTable?.find(a => a.ipAddress === gwIp);
      if (cachedGw) {
        targetMac = cachedGw.macAddress;
      } else {
        isArpRequired = true;
        // Default gateway is typically Core SVI or Firewall
        targetMac = '00:1c:58:11:bb:01';
      }
    }

    // ARP Step if cache miss
    if (isArpRequired || params.protocol === 'ARP') {
      const arpHeader: PacketHeader = {
        layer2: {
          srcMac,
          dstMac: 'ff:ff:ff:ff:ff:ff',
          ethertype: '0x0806'
        },
        payloadSummary: `ARP Request: Who has ${isSameSubnet ? targetIp : srcDev.defaultGateway}? Tell ${srcIp} (${srcMac})`
      };

      recordStep({
        currentDeviceId: srcDev.id,
        egressInterfaceIds: [srcIface.id],
        vlanId: srcVlan,
        has8021qTag: false,
        packetHeader: arpHeader,
        action: 'ORIGINATE',
        rationale: `ARP Cache Miss: ${srcDev.name} broadcast ARP Request on VLAN ${srcVlan} for ${isSameSubnet ? targetIp : 'Default Gateway ' + srcDev.defaultGateway}`,
        hardwareInternals: {
          ingressSerDes: 'NIC ARP Subsystem',
          tcamLookup: 'N/A',
          switchFabricBus: 'PCIe bus',
          egressPortQueue: 'Tx buffer ring',
          tagEngineAction: 'UNTOUCHED',
          latencyNanos: 90
        }
      });
      framesFlooded++;

      if (params.protocol === 'ARP') {
        success = true;
        summary = `ARP Request successfully broadcast within VLAN ${srcVlan} boundary.`;
      }
    }

    // Ping / TCP Flow
    if (params.protocol !== 'ARP') {
      const ipHeader: PacketHeader = {
        layer2: {
          srcMac,
          dstMac: targetMac,
          ethertype: '0x0800'
        },
        layer3: {
          srcIp,
          dstIp: targetIp,
          ttl: 128,
          protocol: params.protocol === 'ICMP_PING' ? 'ICMP' : 'TCP',
          checksum: '0x4521',
          identification: 3820
        },
        layer4: params.protocol === 'ICMP_PING' ? {
          icmpType: 'ECHO_REQUEST'
        } : {
          srcPort: 49821,
          dstPort: params.targetPort || 80,
          tcpFlags: ['SYN']
        },
        payloadSummary: params.protocol === 'ICMP_PING' 
          ? `ICMP Echo Request (id=0x021a, seq=1, ttl=128, len=64 bytes)`
          : `TCP SYN [Flags=SYN, Seq=0, Win=64240, MSS=1460, DstPort=${params.targetPort || 80}]`
      };

      recordStep({
        currentDeviceId: srcDev.id,
        egressInterfaceIds: [srcIface.id],
        vlanId: srcVlan,
        has8021qTag: false,
        packetHeader: ipHeader,
        action: 'ORIGINATE',
        rationale: `${srcDev.name} generated ${params.protocol} packet towards ${targetIp}`
      });

      // Find switch connected to srcDev
      const linkToSwitch = state.links.find(
        l => (l.sourceDeviceId === srcDev.id && l.sourceInterfaceId === srcIface.id) ||
             (l.targetDeviceId === srcDev.id && l.targetInterfaceId === srcIface.id)
      );

      if (!linkToSwitch || linkToSwitch.status === 'down') {
        recordStep({
          currentDeviceId: srcDev.id,
          egressInterfaceIds: [],
          vlanId: srcVlan,
          has8021qTag: false,
          packetHeader: ipHeader,
          action: 'DROP',
          dropped: true,
          dropReason: 'Link administrative state is DOWN or disconnected'
        });
        summary = `Packet dropped: Physical link from ${srcDev.name} is down.`;
      } else {
        const swId = linkToSwitch.sourceDeviceId === srcDev.id ? linkToSwitch.targetDeviceId : linkToSwitch.sourceDeviceId;
        const swPort = linkToSwitch.sourceDeviceId === srcDev.id ? linkToSwitch.targetInterfaceId : linkToSwitch.sourceInterfaceId;
        const sw = findDevice(swId);

        if (sw) {
          // Switch ingress port validation
          const ingressIface = sw.interfaces.find(i => i.id === swPort);
          if (ingressIface?.adminStatus === 'down') {
            recordStep({
              currentDeviceId: sw.id,
              ingressInterfaceId: swPort,
              egressInterfaceIds: [],
              vlanId: srcVlan,
              has8021qTag: false,
              packetHeader: ipHeader,
              action: 'DROP',
              dropped: true,
              dropReason: `Switch port ${swPort} is administratively SHUTDOWN`
            });
            summary = `Packet dropped: ${sw.name} port ${swPort} is shutdown.`;
          } else if (ingressIface?.mode === 'access' && ingressIface?.accessVlan !== srcVlan) {
            recordStep({
              currentDeviceId: sw.id,
              ingressInterfaceId: swPort,
              egressInterfaceIds: [],
              vlanId: ingressIface?.accessVlan,
              has8021qTag: false,
              packetHeader: ipHeader,
              action: 'DROP',
              dropped: true,
              dropReason: `VLAN Mismatch: Port ${swPort} is assigned to VLAN ${ingressIface?.accessVlan}, but host is configured on VLAN ${srcVlan}`
            });
            summary = `VLAN Isolation: Packet dropped due to access VLAN mismatch on ${sw.name}.`;
          } else if (sw.type === 'firewall') {
            // Direct firewall ingress from outside WAN
            const isTargetDmz = targetIp.startsWith('10.20.100.');
            const targetPort = params.targetPort || 80;
            const matchingRule = sw.firewallRules?.find(r => r.enabled && r.destZone === 'DMZ' && (!r.destPort || r.destPort === targetPort));
            if (matchingRule && matchingRule.action === 'PERMIT') {
              recordStep({
                currentDeviceId: sw.id,
                ingressInterfaceId: swPort,
                egressInterfaceIds: ['Gi1/3'],
                has8021qTag: false,
                packetHeader: ipHeader,
                action: 'FORWARD',
                rationale: `Firewall Inspection: Matched ${matchingRule.id} (${matchingRule.description}). Permitted TCP traffic forwarded out Gi1/3 to DMZ Switch`,
                hardwareInternals: {
                  ingressSerDes: 'Outside Gi1/1 PHY',
                  tcamLookup: `State Table Permit: Inbound WAN -> DMZ Web :${targetPort}`,
                  switchFabricBus: 'Security Acceleration Bus',
                  egressPortQueue: 'DMZ Gi1/3 Egress Buffer',
                  tagEngineAction: 'UNTOUCHED',
                  latencyNanos: 450
                }
              });

              const dmzSw = findDevice('dev-dmz-sw-01');
              if (dmzSw && dstDev) {
                recordStep({
                  currentDeviceId: dmzSw.id,
                  ingressInterfaceId: 'Gi0/1',
                  egressInterfaceIds: ['Fa0/1'],
                  vlanId: 100,
                  has8021qTag: false,
                  packetHeader: ipHeader,
                  action: 'FORWARD',
                  rationale: `DMZ Switching: Forwarded frame untagged on VLAN 100 to ${dstDev.name}`,
                  hardwareInternals: {
                    ingressSerDes: 'Gi0/1 SerDes',
                    tcamLookup: `CAM match: MAC ${dstDev.interfaces[0].macAddress} -> Fa0/1`,
                    switchFabricBus: 'DMZ Switch Fabric',
                    egressPortQueue: 'Fa0/1 Egress FIFO',
                    tagEngineAction: 'UNTOUCHED',
                    latencyNanos: 180
                  }
                });

                recordStep({
                  currentDeviceId: dstDev.id,
                  ingressInterfaceId: dstDev.interfaces[0].id,
                  egressInterfaceIds: [],
                  vlanId: 100,
                  has8021qTag: false,
                  packetHeader: ipHeader,
                  action: 'CONSUME',
                  rationale: `${dstDev.name} accepted inbound TCP HTTP request on port ${targetPort}`
                });

                success = true;
                summary = `Inbound public access permitted: ${srcDev.name} reached DMZ service at ${targetIp} on port ${targetPort} via ASA Perimeter Firewall.`;
              }
            } else {
              recordStep({
                currentDeviceId: sw.id,
                ingressInterfaceId: swPort,
                egressInterfaceIds: [],
                has8021qTag: false,
                packetHeader: ipHeader,
                action: 'DROP',
                dropped: true,
                dropReason: 'Firewall Policy Denied: Inbound connection refused by perimeter ACL'
              });
              summary = `Firewall Drop: Inbound traffic from ${srcIp} denied by edge security policy.`;
            }
          } else {
            // Check if destination is on the same switch and same VLAN
            if (isSameSubnet && dstDev) {
              const dstLink = state.links.find(
                l => (l.sourceDeviceId === dstDev.id) || (l.targetDeviceId === dstDev.id)
              );
              const dstSwId = dstLink ? (dstLink.sourceDeviceId === dstDev.id ? dstLink.targetDeviceId : dstLink.sourceDeviceId) : '';
              
              if (dstSwId === sw.id) {
                // Same switch, same VLAN intra-switching!
                const dstPort = dstLink?.sourceDeviceId === dstDev.id ? dstLink.targetInterfaceId : dstLink?.sourceInterfaceId;
                recordStep({
                  currentDeviceId: sw.id,
                  ingressInterfaceId: swPort,
                  egressInterfaceIds: [dstPort || 'Fa0/3'],
                  vlanId: srcVlan,
                  has8021qTag: false,
                  packetHeader: ipHeader,
                  action: 'FORWARD',
                  rationale: `L2 Switching: ${sw.name} matched MAC ${targetMac} in VLAN ${srcVlan} CAM table -> forwarded directly out ${dstPort}`,
                  hardwareInternals: {
                    ingressSerDes: `Port ${swPort} SerDes Buffer`,
                    tcamLookup: `Exact Match: MAC ${targetMac} + VID ${srcVlan} -> Port ${dstPort}`,
                    switchFabricBus: 'High-speed shared memory crossbar',
                    egressPortQueue: `Port ${dstPort} Tx FIFO`,
                    tagEngineAction: 'UNTOUCHED',
                    latencyNanos: 350
                  }
                });

                // Host receives
                recordStep({
                  currentDeviceId: dstDev.id,
                  ingressInterfaceId: dstDev.interfaces[0].id,
                  egressInterfaceIds: [],
                  vlanId: srcVlan,
                  has8021qTag: false,
                  packetHeader: ipHeader,
                  action: 'CONSUME',
                  rationale: `${dstDev.name} received packet on local subnet (VLAN ${srcVlan}) and accepted payload`
                });

                success = true;
                summary = `Same-VLAN delivery succeeded: ${srcDev.name} reached ${dstDev.name} within VLAN ${srcVlan} at line rate.`;
              }
            } else {
              // Remote destination: Cross-VLAN Inter-Switch routing required!
              const trunk = sw.interfaces.find(i => i.mode === 'trunk' && i.isUplink);
              const isAllowedOnTrunk = trunk?.allowedVlans?.includes(srcVlan);

              if (!trunk || trunk.adminStatus === 'down' || !isAllowedOnTrunk) {
                recordStep({
                  currentDeviceId: sw.id,
                  ingressInterfaceId: swPort,
                  egressInterfaceIds: [],
                  vlanId: srcVlan,
                  has8021qTag: false,
                  packetHeader: ipHeader,
                  action: 'DROP',
                  dropped: true,
                  dropReason: !isAllowedOnTrunk 
                    ? `VLAN ${srcVlan} is pruned/missing from trunk allowed list on ${trunk?.name}`
                    : `Trunk link ${trunk?.name} is down`
                });
                summary = `Trunk drop: VLAN ${srcVlan} is not permitted on trunk link of ${sw.name}.`;
              } else {
                // Forward across trunk with 802.1Q tag!
                const trunkTaggedHeader: PacketHeader = {
                  ...ipHeader,
                  layer2: {
                    ...ipHeader.layer2,
                    ethertype: '0x8100',
                    vlanTag: { tpid: '0x8100', pcp: 0, dei: 0, vid: srcVlan }
                  }
                };

                recordStep({
                  currentDeviceId: sw.id,
                  ingressInterfaceId: swPort,
                  egressInterfaceIds: [trunk.id],
                  vlanId: srcVlan,
                  has8021qTag: true,
                  packetHeader: trunkTaggedHeader,
                  action: 'FORWARD',
                  rationale: `802.1Q Encapsulation: Inserted 4-byte 802.1Q header with VID ${srcVlan} and transmitted on trunk ${trunk.name} to Core`,
                  hardwareInternals: {
                    ingressSerDes: `Port ${swPort} 100M PHY`,
                    tcamLookup: `MAC ${targetMac} points to Trunk ${trunk.name}`,
                    switchFabricBus: 'Crossbar Fabric',
                    egressPortQueue: `Trunk ${trunk.name} 1Gbps Egress Buffer`,
                    tagEngineAction: 'TAG_INSERTED',
                    latencyNanos: 410
                  }
                });

                // Core Switch Processing
                const core = findDevice('dev-core-01');
                if (core) {
                  // Evaluate Core SVI & ACLs
                  // Check if ACL or security rule denies this flow!
                  let isBlockedByPolicy = false;
                  let blockingReason = '';

                  // Look up target destination VLAN
                  const dstVlanDef = state.vlans.find(v => {
                    const parts = v.subnet.split('/');
                    return isIpInSubnet(targetIp, parts[0], parseInt(parts[1], 10));
                  });
                  const dstVlanId = dstVlanDef ? dstVlanDef.id : (dstDev?.interfaces[0]?.accessVlan || 80);

                  // =========================================================================
                  // Authoritative Policy-Based Inter-VLAN Security Matrix
                  // =========================================================================

                  // Rule 1: Zero-Trust Guest Isolation
                  // Guests (VLAN 70) cannot access ANY internal enterprise departments or data center servers
                  if (srcVlan === 70) {
                    const isInternal = targetIp.startsWith('10.20.') || [10, 20, 30, 40, 50, 60, 80, 90].includes(dstVlanId);
                    if (isInternal) {
                      isBlockedByPolicy = true;
                      blockingReason = 'ACL 170 ZERO-TRUST DENY: Guest Wi-Fi (VLAN 70) is strictly blocked from all internal enterprise departments & data center servers';
                    }
                  }

                  // Rule 2: HR Security Policy (VLAN 20)
                  // HR can access designated HR services (Active Directory / HR Portal dev-srv-dc 10.20.80.10, DNS dev-srv-dns 10.20.80.11, default gateway, and internet)
                  // BUT is denied direct access to Accounting/ERP Database (dev-srv-erp 10.20.80.12) and Production PLCs (VLAN 50)
                  if (srcVlan === 20) {
                    if (targetIp === '10.20.80.12' || dstDev?.id === 'dev-srv-erp') {
                      isBlockedByPolicy = true;
                      blockingReason = 'ACL 120 POLICY DENY: HR Department (VLAN 20) is restricted from direct access to Accounting/ERP Database (10.20.80.12). HR can only access designated HR Portal (10.20.80.10)';
                    } else if (dstVlanId === 50 || dstDev?.id?.startsWith('dev-prod-')) {
                      isBlockedByPolicy = true;
                      blockingReason = 'ACL 120 POLICY DENY: HR Department (VLAN 20) is prohibited from accessing Industrial Production PLCs (VLAN 50)';
                    }
                  }

                  // Rule 3: Finance Security Policy (VLAN 30)
                  // Finance can access approved accounting services (ERP & Accounting DB dev-srv-erp 10.20.80.12, DNS dev-srv-dns 10.20.80.11, gateway, and internet)
                  // BUT is denied access to HR Personnel/Compensation records (dev-srv-dc 10.20.80.10) and Production PLCs (VLAN 50)
                  if (srcVlan === 30) {
                    if (targetIp === '10.20.80.10' || dstDev?.id === 'dev-srv-dc') {
                      isBlockedByPolicy = true;
                      blockingReason = 'ACL 130 POLICY DENY: Finance Department (VLAN 30) is restricted from confidential HR Personnel records (10.20.80.10). Finance must access approved Accounting ERP (10.20.80.12)';
                    } else if (dstVlanId === 50 || dstDev?.id?.startsWith('dev-prod-')) {
                      isBlockedByPolicy = true;
                      blockingReason = 'ACL 130 POLICY DENY: Finance Department (VLAN 30) is prohibited from accessing Industrial Production PLCs (VLAN 50)';
                    }
                  }

                  // Rule 4: Production OT (SCADA) Security Policy (VLAN 50)
                  // Production devices can communicate ONLY with required operational services:
                  // - Operational Historian & SCADA Hub (dev-iot-01 10.20.90.11 on VLAN 90)
                  // - Intra-VLAN production controllers
                  // Denied: general corporate departments (VLAN 20, 30, 60, 70), corporate servers (dev-srv-dc, dev-srv-erp), and direct public internet
                  if (srcVlan === 50) {
                    const isOperationalService = targetIp === '10.20.90.11' || dstDev?.id === 'dev-iot-01' || dstVlanId === 90;
                    const isCoreGateway = core.svis?.some(s => s.ipAddress === targetIp);
                    if (!isOperationalService && !isCoreGateway) {
                      isBlockedByPolicy = true;
                      blockingReason = 'ACL 150 OPERATIONAL POLICY DENY: Production OT (VLAN 50) is restricted to required operational services (VLAN 90 SCADA Historian) only';
                    }
                  }

                  // Rule 5: Inbound protection for Production OT (VLAN 50)
                  // Standard corporate departments cannot probe or initiate sessions to Production PLCs
                  if (dstVlanId === 50 && [20, 30, 60, 70].includes(srcVlan)) {
                    isBlockedByPolicy = true;
                    blockingReason = 'ACL 150 INBOUND DENY: Corporate endpoints are prohibited from direct access to Industrial Production PLCs (VLAN 50)';
                  }

                  if (isBlockedByPolicy) {
                    recordStep({
                      currentDeviceId: core.id,
                      ingressInterfaceId: 'Gi1/0/1',
                      egressInterfaceIds: [],
                      vlanId: srcVlan,
                      has8021qTag: false,
                      packetHeader: ipHeader,
                      action: 'DROP',
                      dropped: true,
                      dropReason: blockingReason
                    });
                    summary = `Access Control List Violation: ${blockingReason}`;
                  } else {
                    // Check if destination is the Core Switch SVI Gateway directly
                    const isCoreSvi = core.svis?.some(s => s.ipAddress === targetIp) || core.interfaces.some(i => i.ipAddress === targetIp);
                    if (isCoreSvi) {
                      recordStep({
                        currentDeviceId: core.id,
                        ingressInterfaceId: 'Gi1/0/1',
                        egressInterfaceIds: [],
                        vlanId: srcVlan,
                        has8021qTag: false,
                        packetHeader: ipHeader,
                        action: 'CONSUME',
                        rationale: `Core Switch L3 SVI (Vlan${srcVlan} - ${targetIp}) received ICMP request and answered with ICMP Echo Reply`,
                        hardwareInternals: {
                          ingressSerDes: 'Trunk SFP Receiver',
                          tcamLookup: `SVI Direct Match: IP ${targetIp} -> Local Switch Virtual Interface Vlan${srcVlan}`,
                          switchFabricBus: 'Cisco Multilayer Switching Control Plane',
                          egressPortQueue: 'Internal CPU Queue',
                          tagEngineAction: 'TAG_REMOVED',
                          latencyNanos: 210
                        }
                      });
                      success = true;
                      summary = `Default gateway ping succeeded: ${srcDev.name} reached local SVI gateway ${targetIp} on Core Switch.`;
                    } else {
                      // Check if route exists to destination
                      const isInternet = targetIp === '8.8.8.8' || targetIp.startsWith('198.51.') || targetIp.startsWith('93.184.');
                      const isDmz = targetIp.startsWith('10.20.100.');

                      if (isInternet || isDmz) {
                        // Route out via Transit link Gi1/0/24 to Firewall (10.20.254.1)
                        const routedTransitHeader: PacketHeader = {
                          layer2: {
                            srcMac: '00:1c:58:11:bb:24', // Core transit MAC
                            dstMac: '00:1c:58:22:aa:02', // FW transit MAC
                            ethertype: '0x0800'
                          },
                          layer3: {
                            ...ipHeader.layer3!,
                            ttl: (ipHeader.layer3?.ttl || 64) - 1
                          },
                          layer4: ipHeader.layer4,
                          payloadSummary: ipHeader.payloadSummary
                        };
                        l2Rewrites++;

                        recordStep({
                          currentDeviceId: core.id,
                          ingressInterfaceId: 'Gi1/0/1',
                          egressInterfaceIds: ['Gi1/0/24'],
                          has8021qTag: false,
                          packetHeader: routedTransitHeader,
                          action: 'ROUTE',
                          rationale: `L3 Routing: Core decremented TTL to ${routedTransitHeader.layer3?.ttl}, rewritten L2 header (Src: Core Gi1/0/24, Dst: FW Gi1/2), forwarded via default route 0.0.0.0/0 to next-hop 10.20.254.1`,
                          hardwareInternals: {
                            ingressSerDes: 'Trunk SFP Receiver',
                            tcamLookup: 'FIB LPM Match: 0.0.0.0/0 -> Next Hop 10.20.254.1',
                            switchFabricBus: 'Cisco Multilayer Switching ASIC',
                            egressPortQueue: 'Gi1/0/24 Transit Outbound Queue',
                            tagEngineAction: 'TAG_REMOVED',
                            latencyNanos: 780
                          }
                        });

                        // Firewall Processing
                        const fw = findDevice('dev-fw-01');
                        if (fw) {
                          if (isInternet) {
                            // Dynamic PAT NAT Translation
                            natTranslations++;
                            const nattedHeader: PacketHeader = {
                              ...routedTransitHeader,
                              layer2: {
                                srcMac: '00:1c:58:22:aa:01', // FW Outside MAC
                                dstMac: '00:fe:c8:99:00:01', // ISP Router MAC
                                ethertype: '0x0800'
                              },
                              layer3: {
                                ...routedTransitHeader.layer3!,
                                srcIp: '198.51.100.2', // Translated public IP!
                                ttl: (routedTransitHeader.layer3?.ttl || 64) - 1
                              }
                            };

                            recordStep({
                              currentDeviceId: fw.id,
                              ingressInterfaceId: 'Gi1/2',
                              egressInterfaceIds: ['Gi1/1'],
                              has8021qTag: false,
                              packetHeader: nattedHeader,
                              action: 'NAT_TRANSLATE',
                              rationale: `Firewall Stateful Inspection & PAT: Translated source ${srcIp} -> 198.51.100.2 (Port 10245). Forwarded to ISP Gateway 198.51.100.1`,
                              hardwareInternals: {
                                ingressSerDes: 'Gi1/2 SerDes',
                                tcamLookup: 'Stateful Connection Flow Table + NAT Rule 1',
                                switchFabricBus: 'Firewall Security Acceleration Engine',
                                egressPortQueue: 'Outside Gi1/1 Queue',
                                tagEngineAction: 'UNTOUCHED',
                                latencyNanos: 920
                              }
                            });

                            // ISP Router Hop
                            const ispRtr = findDevice('dev-cloud-01');
                            if (ispRtr) {
                              recordStep({
                                currentDeviceId: ispRtr.id,
                                ingressInterfaceId: 'eth0',
                                egressInterfaceIds: ['eth1'],
                                has8021qTag: false,
                                packetHeader: nattedHeader,
                                action: 'FORWARD',
                                rationale: `WAN Backbone: ISP Edge Router routed packet across public autonomous system to destination IP ${targetIp}`
                              });
                            }

                            // Public Destination Host
                            if (dstDev) {
                              recordStep({
                                currentDeviceId: dstDev.id,
                                ingressInterfaceId: dstDev.interfaces[0]?.id || 'eth0',
                                egressInterfaceIds: [],
                                has8021qTag: false,
                                packetHeader: nattedHeader,
                                action: 'CONSUME',
                                rationale: `Public Internet Host ${dstDev.name} received packet and generated ICMP Echo Reply`
                              });
                            }

                            success = true;
                            summary = `Outbound internet flow succeeded: ${srcDev.name} reached ${targetIp} via ASA Firewall Dynamic PAT (198.51.100.2).`;
                          } else if (isDmz) {
                            // DMZ forwarding
                            const dmzHeader: PacketHeader = {
                              ...routedTransitHeader,
                              layer2: {
                                srcMac: '00:1c:58:22:aa:03', // FW DMZ MAC
                                dstMac: '00:50:56:a1:00:10', // DMZ Web server MAC
                                ethertype: '0x0800'
                              },
                              layer3: {
                                ...routedTransitHeader.layer3!,
                                ttl: (routedTransitHeader.layer3?.ttl || 64) - 1
                              }
                            };

                            recordStep({
                              currentDeviceId: fw.id,
                              ingressInterfaceId: 'Gi1/2',
                              egressInterfaceIds: ['Gi1/3'],
                              vlanId: 100,
                              has8021qTag: false,
                              packetHeader: dmzHeader,
                              action: 'PERMIT',
                              rationale: `Firewall Policy Permit: Inside -> DMZ (Rule FW-RULE-03) matched and forwarded to DMZ Switch out Gi1/3`
                            });

                            const dmzSw = findDevice('dev-dmz-sw-01');
                            if (dmzSw) {
                              recordStep({
                                currentDeviceId: dmzSw.id,
                                ingressInterfaceId: 'Gi0/1',
                                egressInterfaceIds: ['Fa0/1'],
                                vlanId: 100,
                                has8021qTag: false,
                                packetHeader: dmzHeader,
                                action: 'FORWARD',
                                rationale: `DMZ Switching: Forwarded untagged frame on VLAN 100 to ${dstDev?.name || 'DMZ Server'}`
                              });
                            }

                            if (dstDev) {
                              recordStep({
                                currentDeviceId: dstDev.id,
                                ingressInterfaceId: dstDev.interfaces[0]?.id || 'eth0',
                                egressInterfaceIds: [],
                                vlanId: 100,
                                has8021qTag: false,
                                packetHeader: dmzHeader,
                                action: 'CONSUME',
                                rationale: `${dstDev.name} accepted inbound request in DMZ secure segment`
                              });
                            }

                            success = true;
                            summary = `Inter-Zone routing succeeded: ${srcDev.name} reached DMZ service at ${targetIp} across ASA 5516-X.`;
                          }
                        }
                      } else {
                        // Internal Inter-VLAN routing (e.g. VLAN 20 HR to VLAN 30 Finance, VLAN 40 Engineering, VLAN 80 ERP Server)
                        // Dynamically find physical switch and port connected to dstDev
                        const dstLink = state.links.find(
                          l => (l.sourceDeviceId === dstDev?.id) || (l.targetDeviceId === dstDev?.id)
                        );
                        const dstSwId = dstLink ? (dstLink.sourceDeviceId === dstDev?.id ? dstLink.targetDeviceId : dstLink.sourceDeviceId) : 'dev-acc-sw-a';
                        const dstSw = findDevice(dstSwId);
                        const dstPort = dstLink ? (dstLink.sourceDeviceId === dstDev?.id ? dstLink.targetInterfaceId : dstLink.sourceInterfaceId) : 'Fa0/1';

                        // Find trunk port on Core connected to dstSw
                        const coreTrunkLink = state.links.find(
                          l => (l.sourceDeviceId === core.id && l.targetDeviceId === dstSwId) ||
                               (l.targetDeviceId === core.id && l.sourceDeviceId === dstSwId)
                        );
                        const coreEgressTrunkPort = coreTrunkLink ? (coreTrunkLink.sourceDeviceId === core.id ? coreTrunkLink.sourceInterfaceId : coreTrunkLink.targetInterfaceId) : 'Gi1/0/1';

                        const routedInternalHeader: PacketHeader = {
                          layer2: {
                            srcMac: '00:1c:58:11:bb:03', // Core SVI MAC for dst VLAN
                            dstMac: dstDev?.interfaces[0]?.macAddress || '00:50:56:03:80:03',
                            ethertype: '0x0800'
                          },
                          layer3: {
                            ...ipHeader.layer3!,
                            ttl: (ipHeader.layer3?.ttl || 64) - 1
                          },
                          layer4: ipHeader.layer4,
                          payloadSummary: ipHeader.payloadSummary
                        };
                        l2Rewrites++;

                        recordStep({
                          currentDeviceId: core.id,
                          ingressInterfaceId: 'Gi1/0/1',
                          egressInterfaceIds: [coreEgressTrunkPort],
                          vlanId: dstVlanId,
                          has8021qTag: true,
                          packetHeader: {
                            ...routedInternalHeader,
                            layer2: {
                              ...routedInternalHeader.layer2,
                              ethertype: '0x8100',
                              vlanTag: { tpid: '0x8100', pcp: 0, dei: 0, vid: dstVlanId }
                            }
                          },
                          action: 'ROUTE',
                          rationale: `Inter-VLAN Routing: Core routed packet from Vlan${srcVlan} to Vlan${dstVlanId}. Decremented TTL to ${routedInternalHeader.layer3?.ttl || 63}, rewrote L2 MACs, inserted 802.1Q VID ${dstVlanId} and forwarded on trunk ${coreEgressTrunkPort} to ${dstSw?.name || 'Access Switch'}`,
                          hardwareInternals: {
                            ingressSerDes: 'Trunk SFP SerDes',
                            tcamLookup: `FIB Match: Subnet ${dstVlanDef?.subnet} -> Egress SVI Vlan${dstVlanId}`,
                            switchFabricBus: 'Cisco CEF Layer 3 Forwarding ASIC',
                            egressPortQueue: `Trunk ${coreEgressTrunkPort} High-speed FIFO`,
                            tagEngineAction: 'TAG_INSERTED',
                            latencyNanos: 720
                          }
                        });

                        // Destination switch receives and strips tag for access port
                        if (dstSw && dstDev) {
                          recordStep({
                            currentDeviceId: dstSw.id,
                            ingressInterfaceId: 'Gi0/1',
                            egressInterfaceIds: [dstPort],
                            vlanId: dstVlanId,
                            has8021qTag: false,
                            packetHeader: routedInternalHeader,
                            action: 'FORWARD',
                            rationale: `Access Port Delivery: ${dstSw.name} stripped 802.1Q tag and forwarded untagged frame out ${dstPort} to ${dstDev.name}`,
                            hardwareInternals: {
                              ingressSerDes: 'Trunk Gi0/1 SerDes',
                              tcamLookup: `CAM lookup: MAC ${routedInternalHeader.layer2.dstMac} -> ${dstPort}`,
                              switchFabricBus: 'Shared memory bus',
                              egressPortQueue: `${dstPort} Egress FIFO`,
                              tagEngineAction: 'TAG_REMOVED',
                              latencyNanos: 380
                            }
                          });

                          recordStep({
                            currentDeviceId: dstDev.id,
                            ingressInterfaceId: dstDev.interfaces[0].id,
                            egressInterfaceIds: [],
                            vlanId: dstVlanId,
                            has8021qTag: false,
                            packetHeader: routedInternalHeader,
                            action: 'CONSUME',
                            rationale: `${dstDev.name} received packet, validated IP checksum, and processed ${params.protocol} request`
                          });

                          success = true;
                          summary = `Inter-VLAN routing succeeded: ${srcDev.name} (VLAN ${srcVlan}) reached ${dstDev.name} (VLAN ${dstVlanId}) via Core Switch L3 routing.`;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const trace: SimulationTrace = {
    id: `trace-${Date.now()}`,
    protocol: params.protocol,
    sourceDeviceId: srcDev.id,
    destinationDeviceId: dstDev?.id || '',
    destinationIp: targetIp,
    startedAt: new Date().toISOString(),
    completed: true,
    success,
    summary,
    steps,
    packetStats: {
      totalHops: steps.length,
      framesFlooded,
      bytesSimulated: steps.length * 64,
      l2Rewrites,
      natTranslations
    }
  };

  return {
    updatedState: {
      ...state,
      devices: workingDevices,
      lastTrace: trace
    },
    trace
  };
}
