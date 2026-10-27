// NetScope RFC-Compliant Libpcap (PCAP) Binary Capture & Wireshark Dissector Engine
// Generates standard pcap files (format 2.4, microsecond resolution, Ethernet LINKTYPE 1)
// compatible directly with Wireshark, tcpdump, and Packet Tracer packet dissectors.

import { SimulationTrace, SimulationStep, PacketHeader } from '../types/network';

// Helper to convert MAC string "00:1c:58:11:bb:01" into 6 bytes
function macToBytes(macStr: string): number[] {
  const parts = macStr.split(':').map(h => parseInt(h, 16) || 0);
  while (parts.length < 6) parts.push(0);
  return parts.slice(0, 6);
}

// Helper to convert IPv4 string "10.20.20.10" into 4 bytes
function ipToBytes(ipStr: string): number[] {
  const parts = ipStr.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4);
}

// Compute standard Internet Checksum (RFC 1071)
function computeChecksum(bytes: number[]): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const high = bytes[i] || 0;
    const low = bytes[i + 1] || 0;
    sum += (high << 8) | low;
  }
  while (sum >> 16) {
    sum = (sum & 0xffff) + (sum >> 16);
  }
  return (~sum) & 0xffff;
}

/**
 * Builds a raw binary Ethernet II frame + optional 802.1Q tag + IPv4 + ICMP/TCP payload
 */
export function buildRawFrameBytes(step: SimulationStep): Uint8Array {
  const h = step.packetHeader;
  const frame: number[] = [];

  // 1. Destination & Source MAC (12 bytes)
  frame.push(...macToBytes(h.layer2.dstMac || 'ff:ff:ff:ff:ff:ff'));
  frame.push(...macToBytes(h.layer2.srcMac || '00:1c:58:00:00:01'));

  // 2. IEEE 802.1Q Tag (4 bytes) if tagged
  if (step.has8021qTag && step.vlanId) {
    frame.push(0x81, 0x00); // TPID 0x8100
    const vlanId = step.vlanId & 0x0fff;
    const pcp = (h.layer2.vlanTag?.pcp || 0) & 0x07;
    const dei = (h.layer2.vlanTag?.dei || 0) & 0x01;
    const tci = (pcp << 13) | (dei << 12) | vlanId;
    frame.push((tci >> 8) & 0xff, tci & 0xff);
  }

  // 3. EtherType (0x0800 for IPv4, 0x0806 for ARP)
  const isArp = h.layer2.ethertype === '0x0806' || !h.layer3;
  if (isArp) {
    frame.push(0x08, 0x06); // ARP
    // 28-byte ARP payload
    frame.push(0x00, 0x01); // HW Type: Ethernet (1)
    frame.push(0x08, 0x00); // Proto Type: IPv4
    frame.push(0x06, 0x04); // HW size 6, Proto size 4
    frame.push(0x00, 0x01); // Opcode: Request (1)
    frame.push(...macToBytes(h.layer2.srcMac));
    frame.push(...ipToBytes(h.layer3?.srcIp || '10.20.20.10'));
    frame.push(...macToBytes(h.layer2.dstMac));
    frame.push(...ipToBytes(h.layer3?.dstIp || '10.20.20.1'));
  } else {
    frame.push(0x08, 0x00); // IPv4
    const ipHeader: number[] = [];
    const protocol = h.layer3?.protocol === 'TCP' ? 6 : (h.layer3?.protocol === 'UDP' ? 17 : 1);
    
    // IPv4 Header (20 bytes)
    ipHeader.push(0x45); // Version 4, IHL 5 (20 bytes)
    ipHeader.push(0x00); // DSCP/ECN (Best Effort)
    
    // Transport Layer Payload (ICMP Echo Request 32 bytes or TCP SYN 20 bytes)
    const transportPayload: number[] = [];
    if (protocol === 1) {
      // ICMP Echo Request
      transportPayload.push(0x08, 0x00); // Type 8 (Echo), Code 0
      transportPayload.push(0x00, 0x00); // Checksum placeholder
      transportPayload.push(0x00, 0x01); // Identifier
      transportPayload.push(0x00, step.stepId & 0xff); // Sequence number
      // 32-byte standard ping payload
      for (let i = 0; i < 32; i++) {
        transportPayload.push(0x61 + (i % 26)); // 'a', 'b', 'c'...
      }
      // Calculate ICMP checksum
      const icmpChk = computeChecksum(transportPayload);
      transportPayload[2] = (icmpChk >> 8) & 0xff;
      transportPayload[3] = icmpChk & 0xff;
    } else {
      // TCP SYN packet (20 bytes header)
      const srcPort = h.layer4?.srcPort || 49152;
      const dstPort = h.layer4?.dstPort || 443;
      transportPayload.push((srcPort >> 8) & 0xff, srcPort & 0xff);
      transportPayload.push((dstPort >> 8) & 0xff, dstPort & 0xff);
      transportPayload.push(0x00, 0x00, 0x10, 0x00); // Sequence number 4096
      transportPayload.push(0x00, 0x00, 0x00, 0x00); // Acknowledgment number 0
      transportPayload.push(0x50); // Header length 5 (20 bytes)
      transportPayload.push(0x02); // Flags: SYN (0x02)
      transportPayload.push(0xfa, 0xf0); // Window size 64240
      transportPayload.push(0x00, 0x00); // Checksum
      transportPayload.push(0x00, 0x00); // Urgent pointer
    }

    const totalLength = 20 + transportPayload.length;
    ipHeader.push((totalLength >> 8) & 0xff, totalLength & 0xff);
    ipHeader.push(0x1a, 0x2b); // Identification
    ipHeader.push(0x40, 0x00); // Flags: Don't Fragment (DF)
    ipHeader.push(h.layer3?.ttl || 64); // TTL
    ipHeader.push(protocol); // Protocol
    ipHeader.push(0x00, 0x00); // Checksum placeholder
    ipHeader.push(...ipToBytes(h.layer3?.srcIp || '10.20.20.10'));
    ipHeader.push(...ipToBytes(h.layer3?.dstIp || '10.20.80.12'));

    // Calculate IP header checksum
    const ipChk = computeChecksum(ipHeader);
    ipHeader[10] = (ipChk >> 8) & 0xff;
    ipHeader[11] = ipChk & 0xff;

    frame.push(...ipHeader);
    frame.push(...transportPayload);
  }

  // Minimum Ethernet frame size is 60 bytes (plus 4 bytes FCS handled by NIC)
  while (frame.length < 60) {
    frame.push(0x00);
  }

  return new Uint8Array(frame);
}

/**
 * Generates a standard binary .PCAP (libpcap 2.4) file from a simulation trace.
 * This file can be saved to disk and opened natively in Wireshark!
 */
export function generatePcapBinary(trace: SimulationTrace): Uint8Array {
  const steps = trace.steps.filter(s => !s.dropped || s.action === 'DROP');
  const bufferList: Uint8Array[] = [];

  // 1. Global PCAP Header (24 bytes)
  const globalHeader = new Uint8Array(24);
  const dv = new DataView(globalHeader.buffer);
  dv.setUint32(0, 0xa1b2c3d4, false); // Magic Number (Big Endian)
  dv.setUint16(4, 2, false);          // Major version 2
  dv.setUint16(6, 4, false);          // Minor version 4
  dv.setInt32(8, 0, false);           // GMT offset 0
  dv.setUint32(12, 0, false);         // Accuracy 0
  dv.setUint32(16, 65535, false);     // Snapshot length
  dv.setUint32(20, 1, false);         // LinkType: LINKTYPE_ETHERNET (1)
  bufferList.push(globalHeader);

  // 2. Individual Packet Records
  const baseTimeSec = Math.floor(Date.now() / 1000) - 30;
  
  steps.forEach((step, idx) => {
    const rawFrame = buildRawFrameBytes(step);
    const packetHeader = new Uint8Array(16);
    const pdv = new DataView(packetHeader.buffer);
    
    const timeSec = baseTimeSec + Math.floor(idx * 0.005);
    const timeUsec = Math.floor((idx * 5000) % 1000000);

    pdv.setUint32(0, timeSec, false);
    pdv.setUint32(4, timeUsec, false);
    pdv.setUint32(8, rawFrame.length, false);  // Captured packet length
    pdv.setUint32(12, rawFrame.length, false); // Original length
    
    bufferList.push(packetHeader);
    bufferList.push(rawFrame);
  });

  // Calculate total length and assemble single Uint8Array
  const totalLength = bufferList.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of bufferList) {
    result.set(b, offset);
    offset += b.length;
  }

  return result;
}

/**
 * Downloads the binary PCAP file directly to the user's computer
 */
export function downloadTracePcap(trace: SimulationTrace, filename = 'netscope-traffic-capture.pcap') {
  const binary = generatePcapBinary(trace);
  const blob = new Blob([binary.buffer as ArrayBuffer], { type: 'application/vnd.tcpdump.pcap' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats a raw frame into a Wireshark-style Hex Dump with ASCII side column
 */
export function formatWiresharkHexDump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const offsetHex = i.toString(16).padStart(4, '0');
    const chunk = bytes.slice(i, i + 16);
    const hexPart: string[] = [];
    let asciiPart = '';

    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        hexPart.push(chunk[j].toString(16).padStart(2, '0'));
        const charCode = chunk[j];
        asciiPart += (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
      } else {
        hexPart.push('  ');
      }
    }

    const hexFormatted = hexPart.slice(0, 8).join(' ') + '  ' + hexPart.slice(8).join(' ');
    lines.push(`${offsetHex}   ${hexFormatted}   |${asciiPart}|`);
  }
  return lines.join('\n');
}
