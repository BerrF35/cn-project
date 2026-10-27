// Global Network Simulation State Context

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NetworkState, NetworkDevice, NetworkLink, SimulationTrace, InterVlanSecurityRule } from '../types/network';
import { INITIAL_NETWORK_STATE } from '../engine/initialData';
import { simulateTraffic, SimulationParams } from '../engine/simulator';
import { FAULT_SCENARIOS } from '../engine/faults';
import { runValidationSuite } from '../engine/validation';

export type WorkspaceTab = 'topology' | 'traffic' | 'security' | 'performance' | 'studio' | 'faults' | 'validation';

interface NetworkContextType {
  state: NetworkState;
  activeWorkspace: WorkspaceTab;
  setActiveWorkspace: (tab: WorkspaceTab) => void;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  selectedLinkId: string | null;
  setSelectedLinkId: (id: string | null) => void;
  activeVlanFilter: number | null;
  setActiveVlanFilter: (vlanId: number | null) => void;
  showAnatomyModal: boolean;
  setShowAnatomyModal: (show: boolean) => void;
  showSubnetPlanner: boolean;
  setShowSubnetPlanner: (show: boolean) => void;
  showPresentationMode: boolean;
  setShowPresentationMode: (show: boolean) => void;
  showAttackModal: boolean;
  setShowAttackModal: (show: boolean) => void;
  showPacketTracerModal: boolean;
  setShowPacketTracerModal: (show: boolean) => void;
  toggleInterVlanRule: (ruleId: string) => void;
  updateInterVlanRule: (rule: InterVlanSecurityRule) => void;
  resetInterVlanRules: () => void;
  updateDevice: (device: NetworkDevice) => void;
  updateLink: (link: NetworkLink) => void;
  runSimulation: (params: SimulationParams) => SimulationTrace;
  injectFault: (faultId: string) => void;
  repairFault: (faultId: string) => void;
  runAllValidationTests: () => void;
  resetToInitial: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NetworkState>(() => {
    // Run initial validation suite so test results are immediately available!
    const initialTests = runValidationSuite(INITIAL_NETWORK_STATE);
    return {
      ...INITIAL_NETWORK_STATE,
      validationResults: initialTests
    };
  });

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceTab>('topology');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>('dev-core-01');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [activeVlanFilter, setActiveVlanFilter] = useState<number | null>(null);
  const [showAnatomyModal, setShowAnatomyModal] = useState<boolean>(false);
  const [showSubnetPlanner, setShowSubnetPlanner] = useState<boolean>(false);
  const [showPresentationMode, setShowPresentationMode] = useState<boolean>(false);
  const [showAttackModal, setShowAttackModal] = useState<boolean>(false);
  const [showPacketTracerModal, setShowPacketTracerModal] = useState<boolean>(false);

  const toggleInterVlanRule = (ruleId: string) => {
    setState(prev => ({
      ...prev,
      interVlanRules: prev.interVlanRules.map(r => 
        r.id === ruleId ? { ...r, action: r.action === 'PERMIT' ? 'DENY' : 'PERMIT' } : r
      )
    }));
  };

  const updateInterVlanRule = (updated: InterVlanSecurityRule) => {
    setState(prev => ({
      ...prev,
      interVlanRules: prev.interVlanRules.map(r => r.id === updated.id ? updated : r)
    }));
  };

  const resetInterVlanRules = () => {
    setState(prev => ({
      ...prev,
      interVlanRules: INITIAL_NETWORK_STATE.interVlanRules
    }));
  };

  const updateDevice = (updated: NetworkDevice) => {
    setState(prev => ({
      ...prev,
      devices: prev.devices.map(d => (d.id === updated.id ? updated : d))
    }));
  };

  const updateLink = (updated: NetworkLink) => {
    setState(prev => ({
      ...prev,
      links: prev.links.map(l => (l.id === updated.id ? updated : l))
    }));
  };

  const runSimulation = (params: SimulationParams): SimulationTrace => {
    const { updatedState, trace } = simulateTraffic(state, params);
    setState(updatedState);
    return trace;
  };

  const injectFault = (faultId: string) => {
    const fault = FAULT_SCENARIOS.find(f => f.id === faultId);
    if (fault) {
      const newState = fault.inject(state);
      // Re-run validation tests against newly broken state!
      const updatedTests = runValidationSuite(newState);
      setState({
        ...newState,
        validationResults: updatedTests
      });
    }
  };

  const repairFault = (faultId: string) => {
    const fault = FAULT_SCENARIOS.find(f => f.id === faultId);
    if (fault) {
      const newState = fault.repair(state);
      // Re-run validation tests against newly repaired state!
      const updatedTests = runValidationSuite(newState);
      setState({
        ...newState,
        validationResults: updatedTests
      });
    }
  };

  const runAllValidationTests = () => {
    const results = runValidationSuite(state);
    setState(prev => ({
      ...prev,
      validationResults: results
    }));
  };

  const resetToInitial = () => {
    const initialTests = runValidationSuite(INITIAL_NETWORK_STATE);
    setState({
      ...INITIAL_NETWORK_STATE,
      validationResults: initialTests
    });
  };

  return (
    <NetworkContext.Provider
      value={{
        state,
        activeWorkspace,
        setActiveWorkspace,
        selectedDeviceId,
        setSelectedDeviceId,
        selectedLinkId,
        setSelectedLinkId,
        activeVlanFilter,
        setActiveVlanFilter,
        showAnatomyModal,
        setShowAnatomyModal,
        showSubnetPlanner,
        setShowSubnetPlanner,
        showPresentationMode,
        setShowPresentationMode,
        showAttackModal,
        setShowAttackModal,
        showPacketTracerModal,
        setShowPacketTracerModal,
        toggleInterVlanRule,
        updateInterVlanRule,
        resetInterVlanRules,
        updateDevice,
        updateLink,
        runSimulation,
        injectFault,
        repairFault,
        runAllValidationTests,
        resetToInitial
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return ctx;
}
