import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CanvasLayer, CoverType, PrintSpecs, ProjectState } from './types';
import { calculateCoverDimensions } from './utils/kdpCalculator';
import { generateAutomatedCover } from './utils/autoDesignEngine';
import { Header } from './components/Header';
import { StartScreen } from './components/StartScreen';
import { CanvasEditor } from './components/CanvasEditor';
import { LeftSidebar, SidebarTab } from './components/LeftSidebar';
import { LayersPanel } from './components/LayersPanel';
import { KdpCalculatorModal } from './components/KdpCalculatorModal';
import { ThreeMockupModal } from './components/ThreeMockupModal';
import { QualityCheckerModal } from './components/QualityCheckerModal';
import { ExportModal } from './components/ExportModal';
import { UploadExistingModal } from './components/UploadExistingModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { StockSearchModal } from './components/StockSearchModal';
import { Sparkles } from 'lucide-react';

const INITIAL_PRINT_SPECS: PrintSpecs = {
  coverType: 'paperback',
  trimSize: '6x9',
  pageCount: 280,
  paperType: 'cream',
  hasBleed: true,
  readingDirection: 'ltr',
  coverFinish: 'matte',
  provider: 'kdp',
};

export default function App() {
  const initialDimensions = calculateCoverDimensions(INITIAL_PRINT_SPECS);
  const initialCover = generateAutomatedCover({
    title: 'THE OBSIDIAN THRONE',
    subtitle: 'Chronicles of the Shattered Realms',
    authorName: 'ALEXANDER FORGE',
    genre: 'fantasy',
    coverType: 'paperback',
    dimensions: initialDimensions,
  });

  const [project, setProject] = useState<ProjectState>(() => {
    // Check if there is an autosaved session
    try {
      const saved = localStorage.getItem('alexforge_covercraft_autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.layers && parsed.dimensions) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read autosave:', e);
    }

    return {
      id: `project-${Date.now()}`,
      name: 'The Obsidian Throne',
      lastModified: Date.now(),
      coverType: 'paperback',
      bookDetails: {
        title: 'THE OBSIDIAN THRONE',
        subtitle: 'Chronicles of the Shattered Realms',
        authorName: 'ALEXANDER FORGE',
        genre: 'fantasy',
        blurb:
          'When the celestial barrier falls, a lone scholar discovers that the legends carved in dragonbone are not myths, but warnings. Armed only with forbidden runic sorcery, she must unite fractious realms before the eclipsed court reclaims the throne.',
        authorBio: 'Alexander Forge is an international bestselling epic fantasy author and master worldbuilder.',
        publisherName: 'Alex FORGE Studio',
        isbn: '978-1-23456-789-0',
        tagline: 'An ancient seal shattered. A forgotten heir awakened.',
        price: '$16.99 USD',
        edition: 'First Edition',
      },
      printSpecs: INITIAL_PRINT_SPECS,
      dimensions: initialDimensions,
      backgroundColor: initialCover.backgroundColor,
      backgroundGradient: initialCover.backgroundGradient,
      layers: initialCover.layers,
      selectedLayerId: 'layer-title',
      guidesVisible: true,
      bleedVisible: true,
      safeAreaVisible: true,
      barcodeVisible: true,
      viewMode: 'professional',
    };
  });

  // Undo/Redo History
  const [history, setHistory] = useState<ProjectState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // App Screen / Modal States
  const [showStartScreen, setShowStartScreen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isMockupOpen, setIsMockupOpen] = useState<boolean>(false);
  const [isQualityCheckerOpen, setIsQualityCheckerOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);
  const [isStockSearchOpen, setIsStockSearchOpen] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('details');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  // Push state to undo stack
  const pushHistory = useCallback((newState: ProjectState) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newState].slice(-25); // keep last 25 states
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Periodic Local Autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('alexforge_covercraft_autosave', JSON.stringify(project));
      } catch (err) {
        console.warn('Autosave quota exceeded:', err);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [project]);

  // Undo / Redo handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProject(targetState);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProject(targetState);
    }
  };

  // Layer Update Handler
  const handleUpdateLayer = (layerId: string, updates: Partial<CanvasLayer>) => {
    setProject((prev) => {
      const updatedLayers = prev.layers.map((l) => (l.id === layerId ? ({ ...l, ...updates } as CanvasLayer) : l));
      const next = { ...prev, layers: updatedLayers, lastModified: Date.now() };
      return next;
    });
  };

  // Add Layer Handler
  const handleAddLayer = (layer: CanvasLayer) => {
    setProject((prev) => {
      const nextLayers = [...prev.layers, layer];
      const next = { ...prev, layers: nextLayers, selectedLayerId: layer.id, lastModified: Date.now() };
      pushHistory(next);
      return next;
    });
  };

  // Reorder Layers
  const handleReorderLayers = (fromIndex: number, toIndex: number) => {
    setProject((prev) => {
      const updated = [...prev.layers];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { ...prev, layers: updated, lastModified: Date.now() };
    });
  };

  // Delete Layer
  const handleDeleteLayer = (layerId: string) => {
    setProject((prev) => {
      const updated = prev.layers.filter((l) => l.id !== layerId);
      return {
        ...prev,
        layers: updated,
        selectedLayerId: prev.selectedLayerId === layerId ? null : prev.selectedLayerId,
        lastModified: Date.now(),
      };
    });
  };

  // Duplicate Layer
  const handleDuplicateLayer = (layerId: string) => {
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;

    const copy = {
      ...layer,
      id: `${layer.type}-${Date.now()}`,
      name: `${layer.name} (Copy)`,
      x: layer.x + 20,
      y: layer.y + 20,
    };

    setProject((prev) => ({
      ...prev,
      layers: [...prev.layers, copy],
      selectedLayerId: copy.id,
      lastModified: Date.now(),
    }));
  };

  // Update Book Details
  const handleUpdateBookDetails = (updates: Partial<ProjectState['bookDetails']>) => {
    setProject((prev) => ({
      ...prev,
      bookDetails: { ...prev.bookDetails, ...updates },
      lastModified: Date.now(),
    }));
  };

  // Apply new layer set from Auto Design or Template
  const handleApplyNewLayers = (newLayers: CanvasLayer[], bg?: string, grad?: string) => {
    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      layers: newLayers,
      backgroundColor: bg || prev.backgroundColor,
      backgroundGradient: grad || prev.backgroundGradient,
      selectedLayerId: newLayers.find((l) => 'role' in l && l.role === 'title')?.id || null,
      lastModified: Date.now(),
    }));
  };

  // Apply new Print Specs from Calculator
  const handleApplyPrintSpecs = (newSpecs: PrintSpecs) => {
    pushHistory(project);
    const newDims = calculateCoverDimensions(newSpecs);
    
    // Regenerate automated layout fitting the new dimensions
    const res = generateAutomatedCover({
      title: project.bookDetails.title,
      subtitle: project.bookDetails.subtitle,
      authorName: project.bookDetails.authorName,
      genre: project.bookDetails.genre,
      blurb: project.bookDetails.blurb,
      coverType: newSpecs.coverType,
      dimensions: newDims,
    });

    setProject((prev) => ({
      ...prev,
      coverType: newSpecs.coverType,
      printSpecs: newSpecs,
      dimensions: newDims,
      layers: res.layers,
      backgroundColor: res.backgroundColor,
      backgroundGradient: res.backgroundGradient,
      lastModified: Date.now(),
    }));
  };

  // Handle Uploaded Image Apply
  const handleApplyUploadedImage = (params: {
    imageUrl: string;
    width: number;
    height: number;
    mode: 'fit' | 'fill' | 'original';
    isFullWrap: boolean;
    reconstructedLayers?: CanvasLayer[];
  }) => {
    pushHistory(project);
    const { imageUrl, mode, isFullWrap, reconstructedLayers } = params;

    // Background or Artwork layer
    const artLayer: CanvasLayer = {
      id: `imported-art-${Date.now()}`,
      type: 'image',
      name: isFullWrap ? 'Imported Wrap Cover' : 'Imported Front Artwork',
      role: isFullWrap ? 'background' : 'artwork',
      src: imageUrl,
      x: 0,
      y: 0,
      width: project.dimensions.canvasWidthPx,
      height: project.dimensions.canvasHeightPx,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      sepia: 0,
      grayscale: 0,
      vignette: 0,
      warmth: 0,
      blendMode: 'source-over',
      locked: true,
      visible: true,
      aspectRatioMode: mode,
    };

    // If reconstructed layers from OCR were detected, include them!
    const updatedLayers = reconstructedLayers && reconstructedLayers.length > 0
      ? [artLayer, ...reconstructedLayers]
      : [artLayer, ...project.layers.filter((l) => !('role' in l) || (l.role !== 'artwork' && l.role !== 'background'))];

    setProject((prev) => ({
      ...prev,
      layers: updatedLayers,
      lastModified: Date.now(),
    }));
  };

  // Start Screen choices handler
  const handleStartFromScreen = (
    type: CoverType,
    details: { title: string; authorName: string; genre: string }
  ) => {
    const newSpecs: PrintSpecs = {
      ...project.printSpecs,
      coverType: type,
    };
    const newDims = calculateCoverDimensions(newSpecs);
    const res = generateAutomatedCover({
      title: details.title,
      authorName: details.authorName,
      genre: details.genre,
      coverType: type,
      dimensions: newDims,
    });

    setProject((prev) => ({
      ...prev,
      coverType: type,
      printSpecs: newSpecs,
      dimensions: newDims,
      bookDetails: {
        ...prev.bookDetails,
        title: details.title,
        authorName: details.authorName,
        genre: details.genre,
      },
      layers: res.layers,
      backgroundColor: res.backgroundColor,
      backgroundGradient: res.backgroundGradient,
      lastModified: Date.now(),
    }));
    setShowStartScreen(false);
  };

  if (showStartScreen) {
    return (
      <StartScreen
        onStartNew={handleStartFromScreen}
        onOpenUpload={() => {
          setShowStartScreen(false);
          setIsUploadModalOpen(true);
        }}
        onSelectTemplateMode={() => {
          setShowStartScreen(false);
          setActiveSidebarTab('templates');
        }}
        onStartAutoDesignWizard={() => {
          setShowStartScreen(false);
          setActiveSidebarTab('auto_design');
        }}
        onSkipToEditor={() => setShowStartScreen(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Header */}
      <Header
        project={project}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenMockup={() => setIsMockupOpen(true)}
        onOpenQualityChecker={() => setIsQualityCheckerOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onOpenStockSearch={() => setIsStockSearchOpen(true)}
        onToggleViewMode={() =>
          setProject((prev) => ({
            ...prev,
            viewMode: prev.viewMode === 'simple' ? 'professional' : 'simple',
          }))
        }
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* Main Studio Workspace */}
      <div className="flex flex-1 w-full h-[calc(100vh-53px)] overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          project={project}
          activeTab={activeSidebarTab}
          setActiveTab={setActiveSidebarTab}
          onUpdateBookDetails={handleUpdateBookDetails}
          onUpdateLayer={handleUpdateLayer}
          onApplyNewLayers={handleApplyNewLayers}
          onAddLayer={handleAddLayer}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenStockSearch={() => setIsStockSearchOpen(true)}
        />

        {/* Center Live Canvas Viewport */}
        <CanvasEditor
          dimensions={project.dimensions}
          coverType={project.coverType}
          backgroundColor={project.backgroundColor}
          backgroundGradient={project.backgroundGradient}
          layers={project.layers}
          selectedLayerId={project.selectedLayerId}
          guidesVisible={project.guidesVisible}
          bleedVisible={project.bleedVisible}
          safeAreaVisible={project.safeAreaVisible}
          barcodeVisible={project.barcodeVisible}
          onSelectLayer={(id) => setProject((prev) => ({ ...prev, selectedLayerId: id }))}
          onUpdateLayer={handleUpdateLayer}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          canvasRefCallback={(c) => {
            canvasElementRef.current = c;
          }}
        />

        {/* Optional Right Layers Panel in Professional Mode */}
        {project.viewMode === 'professional' && (
          <LayersPanel
            layers={project.layers}
            selectedLayerId={project.selectedLayerId}
            onSelectLayer={(id) => setProject((prev) => ({ ...prev, selectedLayerId: id }))}
            onUpdateLayer={handleUpdateLayer}
            onDeleteLayer={handleDeleteLayer}
            onReorderLayers={handleReorderLayers}
          />
        )}
      </div>

      {/* Modals */}
      <KdpCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        currentSpecs={project.printSpecs}
        onApplySpecs={handleApplyPrintSpecs}
      />

      <ThreeMockupModal
        isOpen={isMockupOpen}
        onClose={() => setIsMockupOpen(false)}
        sourceCanvas={canvasElementRef.current}
        coverType={project.coverType}
        dimensions={project.dimensions}
      />

      <QualityCheckerModal
        isOpen={isQualityCheckerOpen}
        onClose={() => setIsQualityCheckerOpen(false)}
        project={project}
        onSelectLayer={(id) => {
          setProject((prev) => ({ ...prev, selectedLayerId: id }));
          setActiveSidebarTab('typography');
        }}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        canvas={canvasElementRef.current}
      />

      <UploadExistingModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        project={project}
        onApplyUploadedImage={handleApplyUploadedImage}
      />

      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        currentProject={project}
        onLoadProject={(loaded) => setProject(loaded)}
        onSaveCurrentProject={() => {
          // Trigger visual notice if needed
        }}
      />

      {/* Stock Artwork Explorer Modal */}
      <StockSearchModal
        isOpen={isStockSearchOpen}
        onClose={() => setIsStockSearchOpen(false)}
        project={project}
        onApplyNewLayers={handleApplyNewLayers}
        onAddLayer={handleAddLayer}
        onNotify={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
