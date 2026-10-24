import React from 'react';
import { Download, ShieldCheck, Camera, Calculator, FolderOpen, Undo2, Redo2 } from 'lucide-react';
import { ProjectState } from '../types';

interface HeaderProps {
  project: ProjectState;
  onOpenCalculator: () => void;
  onOpenMockup: () => void;
  onOpenQualityChecker: () => void;
  onOpenExportModal: () => void;
  onOpenProjectManager: () => void;
  onToggleViewMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onOpenCalculator,
  onOpenMockup,
  onOpenQualityChecker,
  onOpenExportModal,
  onOpenProjectManager,
  onToggleViewMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3 border-b border-neutral-800 bg-neutral-950 shrink-0 z-30 select-none">
      {/* Zone 1: Single text element Brand Zone wordmark */}
      <div className="flex items-center gap-4 shrink-0">
        <a
          href="/"
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="font-serif italic text-amber-400">AlexForge</span>
          <span className="font-sans font-extrabold uppercase tracking-widest text-xs bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
            CoverCraft
          </span>
        </a>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 pl-2 border-l border-neutral-800">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-30"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-30"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 2: 4-5 concise single-line nav actions */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
        <button
          onClick={onOpenCalculator}
          className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>KDP Calculator</span>
        </button>
        <button
          onClick={onOpenMockup}
          className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>3D Mockups</span>
        </button>
        <button
          onClick={onOpenQualityChecker}
          className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Quality Inspector</span>
        </button>
        <button
          onClick={onOpenProjectManager}
          className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Projects</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action + Simple/Pro Mode Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleViewMode}
          className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition-colors whitespace-nowrap shrink-0"
        >
          {project.viewMode === 'simple' ? 'Simple Mode' : 'Pro Mode (Layers)'}
        </button>

        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-md shadow-amber-500/20 transition-all whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Cover</span>
        </button>
      </div>
    </header>
  );
};
