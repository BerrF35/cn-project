// Main Application Shell for NetScope

import React from 'react';
import { useNetwork } from './context/NetworkContext';
import { Header } from './components/Header';
import { TopologyWorkspace } from './workspaces/TopologyWorkspace';
import { TrafficLabWorkspace } from './workspaces/TrafficLabWorkspace';
import { ConfigStudioWorkspace } from './workspaces/ConfigStudioWorkspace';
import { FaultLabWorkspace } from './workspaces/FaultLabWorkspace';
import { ValidationWorkspace } from './workspaces/ValidationWorkspace';
import { SubnetPlannerModal } from './components/SubnetPlannerModal';
import { PresentationModal } from './components/PresentationModal';
import { SwitchAnatomy } from './components/SwitchAnatomy';

export const App: React.FC = () => {
  const { 
    activeWorkspace, 
    showAnatomyModal, 
    setShowAnatomyModal, 
    state, 
    selectedDeviceId 
  } = useNetwork();

  const inspectedDev = state.devices.find(d => d.id === selectedDeviceId) || state.devices.find(d => d.type === 'l3_core') || state.devices[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 font-sans">
      {/* Global Header */}
      <Header />

      {/* Primary Workspace View */}
      <main className="flex-1 flex overflow-hidden">
        {activeWorkspace === 'topology' && <TopologyWorkspace />}
        {activeWorkspace === 'traffic' && <TrafficLabWorkspace />}
        {activeWorkspace === 'studio' && <ConfigStudioWorkspace />}
        {activeWorkspace === 'faults' && <FaultLabWorkspace />}
        {activeWorkspace === 'validation' && <ValidationWorkspace />}
      </main>

      {/* Global Overlays & Modals */}
      <SubnetPlannerModal />
      <PresentationModal />

      {/* Switch Silicon Anatomy Cutaway Modal */}
      {showAnatomyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <SwitchAnatomy 
            device={inspectedDev} 
            onClose={() => setShowAnatomyModal(false)} 
          />
        </div>
      )}
    </div>
  );
};
