// Packet Flight Animation Overlay for NetScope Topology
// Animates a dynamic 3D-angled paper airplane / packet drone traveling across the exact network link path

import React, { useEffect, useState, useRef } from 'react';
import { SimulationTrace } from '../types/network';

export interface FlightPathNode {
  x: number;
  y: number;
  deviceId: string;
  name: string;
  vlanId?: number;
  isTrunk?: boolean;
  action?: string;
  rationale?: string;
  dropped?: boolean;
  dropReason?: string;
}

export interface PacketFlight {
  id: string;
  sourceDeviceId: string;
  destinationDeviceId: string;
  protocol: string;
  trace: SimulationTrace;
  nodes: FlightPathNode[];
  isTwoWay?: boolean;
}

interface PacketFlightOverlayProps {
  flight: PacketFlight | null;
  onFlightComplete: (success: boolean, summary: string) => void;
}

export const PacketFlightOverlay: React.FC<PacketFlightOverlayProps> = ({
  flight,
  onFlightComplete
}) => {
  const [animState, setAnimState] = useState<{
    x: number;
    y: number;
    angle: number;
    badgeText: string;
    badgeColor: string;
    isReturn: boolean;
    isFinished: boolean;
    dropped: boolean;
    pulseNode: { x: number; y: number } | null;
  } | null>(null);

  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!flight || flight.nodes.length < 2) {
      setAnimState(null);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const forwardNodes = flight.nodes;
    const isSuccess = flight.trace.success;
    const isTwoWay = flight.isTwoWay !== false && isSuccess && flight.protocol === 'ICMP_PING';

    // If dropped, find the hop where it stopped
    const dropIndex = forwardNodes.findIndex(n => n.dropped);
    const validForwardNodes = dropIndex >= 0 ? forwardNodes.slice(0, dropIndex + 1) : forwardNodes;

    const returnNodes = isTwoWay ? [...validForwardNodes].reverse() : [];
    const totalLegs = isTwoWay ? 2 : 1;
    const hopDuration = 650; // ms per hop
    const forwardDuration = (validForwardNodes.length - 1) * hopDuration;
    const returnDuration = isTwoWay ? (returnNodes.length - 1) * hopDuration : 0;
    const totalDuration = forwardDuration + (isTwoWay ? 400 + returnDuration : 0);

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - (startTimeRef.current || now);
      
      // Determine if forward or return leg
      let currentNodes = validForwardNodes;
      let isReturn = false;
      let legElapsed = elapsed;
      let legDuration = forwardDuration;

      if (isTwoWay && elapsed > forwardDuration + 400) {
        // Return flight (Echo Reply)
        isReturn = true;
        currentNodes = returnNodes;
        legElapsed = elapsed - (forwardDuration + 400);
        legDuration = returnDuration;
      }

      const totalSegments = currentNodes.length - 1;
      const progress = Math.min(1, Math.max(0, legElapsed / Math.max(legDuration, 1)));
      const rawIndex = progress * totalSegments;
      const segIndex = Math.min(totalSegments - 1, Math.floor(rawIndex));
      const segProgress = rawIndex - segIndex;

      // Smooth step easing
      const u = segProgress * segProgress * (3 - 2 * segProgress);

      const p0 = currentNodes[segIndex];
      const p1 = currentNodes[segIndex + 1] || p0;

      const curX = p0.x + (p1.x - p0.x) * u;
      const curY = p0.y + (p1.y - p0.y) * u;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Telemetry badge logic
      let badge = 'Native Frame';
      let badgeColor = '#38bdf8';

      if (isReturn) {
        badge = 'ICMP Echo Reply [ACK]';
        badgeColor = '#10b981';
      } else if (p0.dropped || (progress >= 1 && !isSuccess)) {
        badge = `BLOCKED: ${p1.dropReason || 'ACL Policy Denied'}`;
        badgeColor = '#ef4444';
      } else if (p0.isTrunk || p1.isTrunk) {
        badge = `802.1Q Tagged (VID: ${p0.vlanId || 20})`;
        badgeColor = '#a855f7';
      } else if (p1.deviceId.includes('core')) {
        badge = 'Core L3 SVI: Decrement TTL, Rewrite MAC';
        badgeColor = '#f59e0b';
      } else {
        badge = `Untagged Access (VLAN ${p0.vlanId || 20})`;
        badgeColor = '#38bdf8';
      }

      setAnimState({
        x: curX,
        y: curY,
        angle,
        badgeText: badge,
        badgeColor,
        isReturn,
        isFinished: elapsed >= totalDuration,
        dropped: !isSuccess && elapsed >= forwardDuration,
        pulseNode: segProgress > 0.85 ? { x: p1.x, y: p1.y } : null
      });

      if (elapsed < totalDuration) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        // Complete
        onFlightComplete(isSuccess, flight.trace.summary);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [flight, onFlightComplete]);

  if (!animState || !flight) return null;

  return (
    <g id="packet-flight-layer" className="pointer-events-none select-none z-30">
      {/* Pulse ring when passing over or arriving at a node */}
      {animState.pulseNode && (
        <circle
          cx={animState.pulseNode.x}
          cy={animState.pulseNode.y}
          r="24"
          fill="none"
          stroke={animState.dropped ? '#ef4444' : '#10b981'}
          strokeWidth="2"
          opacity="0.8"
        >
          <animate attributeName="r" values="18;34" dur="0.4s" fill="freeze" />
          <animate attributeName="opacity" values="0.9;0" dur="0.4s" fill="freeze" />
        </circle>
      )}

      {/* Trailing Particle Jet / Contrail */}
      <g transform={`translate(${animState.x}, ${animState.y}) rotate(${animState.angle})`}>
        <line
          x1="-35"
          y1="0"
          x2="-4"
          y2="0"
          stroke={animState.dropped ? '#ef4444' : animState.isReturn ? '#10b981' : '#38bdf8'}
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.8"
          strokeDasharray="4 2"
        />
        <line
          x1="-22"
          y1="0"
          x2="-2"
          y2="0"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Paper Plane Silhouette (Crafted Origami Vector) */}
        <g transform="scale(1.15)">
          {/* Main Top Body */}
          <path
            d="M 14,0 L -12,-9 L -5,0 L -12,9 Z"
            fill={animState.dropped ? '#dc2626' : animState.isReturn ? '#059669' : '#0284c7'}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Center Fold Crease */}
          <path
            d="M 14,0 L -5,0"
            stroke="#ffffff"
            strokeWidth="1.4"
            opacity="0.9"
          />
          {/* Bottom Wing Shade */}
          <path
            d="M -5,0 L -12,9 L 2,0 Z"
            fill="rgba(0,0,0,0.25)"
          />
          {/* Nose Photon Beacon */}
          <circle cx="14" cy="0" r="1.8" fill="#ffffff" />
        </g>
      </g>

      {/* Floating Wire Telemetry Badge above the paper airplane */}
      <g transform={`translate(${animState.x}, ${animState.y - 24})`}>
        {/* Drop shadow */}
        <rect
          x="-95"
          y="-13"
          width="190"
          height="22"
          rx="6"
          fill="#030712"
          opacity="0.95"
          stroke={animState.badgeColor}
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="2"
          fill="#f8fafc"
          fontSize="9.5"
          fontWeight="bold"
          textAnchor="middle"
          className="font-mono tracking-tight"
        >
          {animState.badgeText}
        </text>
      </g>
    </g>
  );
};
