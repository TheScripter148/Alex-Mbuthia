import React, { useState } from 'react';
import {
  Book,
  Wand2,
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  Sliders,
  AlignLeft,
  Sparkles,
  Layers,
  RotateCcw,
  Check,
  Palette,
  FileText,
  Upload,
  Maximize2,
  Shrink,
  Contrast,
} from 'lucide-react';
import { CalculatedDimensions, CanvasLayer, CoverTemplate, CoverType, ImageLayer, ProjectState, TextEffectType, TextLayer } from '../types';
import { GENRE_PRESETS } from '../constants/genres';
import { COVER_TEMPLATES } from '../constants/templates';
import { CURATED_FONT_PAIRINGS, FontPairing } from '../constants/fontPairings';
import { generateAllLayoutVariations, generateAutomatedCover, LayoutVariation, LayoutVariationStyle } from '../utils/autoDesignEngine';
import { calculateFitFontSize, getFrontCoverTextBounds } from '../utils/textMeasurement';
import { BlurbEditorPanel } from './BlurbEditorPanel';
import { TypographyEffectsPanel } from './TypographyEffectsPanel';

export type SidebarTab = 'details' | 'auto_design' | 'templates' | 'typography' | 'images' | 'blurb';

interface LeftSidebarProps {
  project: ProjectState;
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  onUpdateBookDetails: (details: Partial<ProjectState['bookDetails']>) => void;
  onUpdateLayer: (layerId: string, updates: Partial<CanvasLayer>) => void;
  onApplyNewLayers: (layers: CanvasLayer[], bg?: string, grad?: string) => void;
  onOpenUploadModal: () => void;
  onOpenCalculator: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  project,
  activeTab,
  setActiveTab,
  onUpdateBookDetails,
  onUpdateLayer,
  onApplyNewLayers,
  onOpenUploadModal,
  onOpenCalculator,
}) => {
  const { bookDetails, dimensions, coverType, layers, selectedLayerId } = project;
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const selectedTextLayer = selectedLayer?.type === 'text' ? (selectedLayer as TextLayer) : null;
  const selectedImageLayer = selectedLayer?.type === 'image' ? (selectedLayer as ImageLayer) : null;

  // Auto design variations
  const [layoutVariations, setLayoutVariations] = useState<LayoutVariation[]>([]);
  const [isGeneratingDesigns, setIsGeneratingDesigns] = useState(false);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');

  // AI prompt input for background generation
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiImageError, setAiImageError] = useState<string | null>(null);

  // Typography Sub-tabs: Curated Pairings | Typography Effects | Layer Inspector
  const [typographySubTab, setTypographySubTab] = useState<'pairings' | 'effects' | 'single'>('pairings');
  const [effectsTargetLayerId, setEffectsTargetLayerId] = useState<string | null>(null);
  const [appliedPairingId, setAppliedPairingId] = useState<string | null>('pairing-fantasy-mythic');
  const [pairingNotice, setPairingNotice] = useState<string | null>(null);

  const handleApplyFontPairing = (pairing: FontPairing) => {
    const updatedLayers = layers.map((layer) => {
      if (layer.type !== 'text') return layer;
      const textL = layer as TextLayer;
      let newFont = textL.fontFamily;
      let newTransform = textL.textTransform;
      let newEffect = textL.effect;

      if (textL.role === 'title' || textL.role === 'spine_title') {
        newFont = pairing.headingFont;
        newTransform = pairing.recommendedCase;
        if (pairing.recommendedEffect) newEffect = pairing.recommendedEffect;
      } else if (textL.role === 'subtitle' || textL.role === 'tagline') {
        newFont = pairing.subheadingFont;
      } else if (textL.role === 'author' || textL.role === 'spine_author') {
        newFont = pairing.authorFont;
      } else if (textL.role === 'blurb' || textL.role === 'bio') {
        newFont = pairing.bodyFont;
      }

      return {
        ...textL,
        fontFamily: newFont,
        textTransform: newTransform,
        effect: newEffect,
      };
    });

    setAppliedPairingId(pairing.id);
    onApplyNewLayers(updatedLayers);
    setPairingNotice(`Harmonized all text layers with "${pairing.name}"!`);
    setTimeout(() => setPairingNotice(null), 3000);
  };

  // Find title and subtitle layers
  const titleLayer = layers.find((l): l is TextLayer => l.type === 'text' && l.role === 'title');
  const subtitleLayer = layers.find((l): l is TextLayer => l.type === 'text' && l.role === 'subtitle');

  // Resolve target layer for typography effects (defaults to title)
  const effectsTargetLayer =
    (effectsTargetLayerId ? layers.find((l): l is TextLayer => l.id === effectsTargetLayerId && l.type === 'text') : null) ||
    selectedTextLayer ||
    titleLayer ||
    (layers.find((l): l is TextLayer => l.type === 'text'));

  const isTitleScaled = Boolean(titleLayer?.originalFontSize && titleLayer.originalFontSize !== titleLayer.fontSize);
  const isSubtitleScaled = Boolean(subtitleLayer?.originalFontSize && subtitleLayer.originalFontSize !== subtitleLayer.fontSize);
  const areAnyLayersScaled = isTitleScaled || isSubtitleScaled;

  const handleScaleToFitAll = () => {
    const updatedLayers = layers.map((layer) => {
      if (layer.type !== 'text') return layer;
      const textL = layer as TextLayer;

      if (textL.role === 'title') {
        const bounds = getFrontCoverTextBounds(dimensions, coverType, 'title');
        const fitSize = calculateFitFontSize(
          textL.text,
          textL.fontFamily,
          textL.fontWeight,
          bounds.maxWidth,
          bounds.maxHeight,
          textL.fontSize,
          20,
          140
        );
        return {
          ...textL,
          originalFontSize: textL.originalFontSize || textL.fontSize,
          fontSize: fitSize,
        };
      }

      if (textL.role === 'subtitle') {
        const bounds = getFrontCoverTextBounds(dimensions, coverType, 'subtitle');
        const fitSize = calculateFitFontSize(
          textL.text,
          textL.fontFamily,
          textL.fontWeight,
          bounds.maxWidth,
          bounds.maxHeight,
          textL.fontSize,
          14,
          48
        );
        return {
          ...textL,
          originalFontSize: textL.originalFontSize || textL.fontSize,
          fontSize: fitSize,
        };
      }

      return textL;
    });

    onApplyNewLayers(updatedLayers);
    setPairingNotice('Scaled title and subtitle layers to fit cover boundaries safely!');
    setTimeout(() => setPairingNotice(null), 3000);
  };

  const handleResetScaleToFitAll = () => {
    const updatedLayers = layers.map((layer) => {
      if (layer.type !== 'text') return layer;
      const textL = layer as TextLayer;

      if ((textL.role === 'title' || textL.role === 'subtitle') && textL.originalFontSize) {
        const restored = textL.originalFontSize;
        const { originalFontSize, ...rest } = textL;
        return {
          ...rest,
          fontSize: restored,
        };
      }

      return textL;
    });

    onApplyNewLayers(updatedLayers);
    setPairingNotice('Reset title and subtitle to their original font sizes.');
    setTimeout(() => setPairingNotice(null), 3000);
  };

  const handleScaleToFitSingleLayer = (layer: TextLayer) => {
    const role = layer.role === 'subtitle' ? 'subtitle' : 'title';
    const bounds = getFrontCoverTextBounds(dimensions, coverType, role);
    const fitSize = calculateFitFontSize(
      layer.text,
      layer.fontFamily,
      layer.fontWeight,
      bounds.maxWidth,
      bounds.maxHeight,
      layer.fontSize,
      role === 'subtitle' ? 14 : 20,
      role === 'subtitle' ? 48 : 140
    );

    onUpdateLayer(layer.id, {
      originalFontSize: layer.originalFontSize || layer.fontSize,
      fontSize: fitSize,
    });
    setPairingNotice(`Fitted "${layer.name}" to cover width (${layer.fontSize}px → ${fitSize}px)!`);
    setTimeout(() => setPairingNotice(null), 3000);
  };

  const handleResetSingleLayer = (layer: TextLayer) => {
    if (!layer.originalFontSize) return;
    const restored = layer.originalFontSize;
    onUpdateLayer(layer.id, {
      fontSize: restored,
      originalFontSize: undefined,
    });
    setPairingNotice(`Reset "${layer.name}" to original ${restored}px size.`);
    setTimeout(() => setPairingNotice(null), 3000);
  };

  const handleGenerateVariations = () => {
    setIsGeneratingDesigns(true);
    setTimeout(() => {
      const vars = generateAllLayoutVariations({
        title: bookDetails.title,
        subtitle: bookDetails.subtitle,
        authorName: bookDetails.authorName,
        genre: bookDetails.genre,
        blurb: bookDetails.blurb,
        coverType,
        dimensions,
      });
      setLayoutVariations(vars);
      setIsGeneratingDesigns(false);
    }, 150);
  };

  const handleApplyVariation = (v: LayoutVariation) => {
    onApplyNewLayers(v.layers, v.backgroundColor, v.backgroundGradient);
  };

  const handleApplyTemplate = (tpl: CoverTemplate) => {
    const res = generateAutomatedCover({
      title: bookDetails.title || 'UNTITLED NOVEL',
      subtitle: bookDetails.subtitle,
      authorName: bookDetails.authorName || 'AUTHOR NAME',
      genre: tpl.genre,
      blurb: bookDetails.blurb,
      coverType,
      dimensions,
    });
    onUpdateBookDetails({ genre: tpl.genre });
    onApplyNewLayers(res.layers, tpl.state.backgroundColor || res.backgroundColor, tpl.state.backgroundGradient || res.backgroundGradient);
  };

  const handleAiGenerateBackground = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAiImage(true);
    setAiImageError(null);

    try {
      const res = await fetch('/api/ai/generate-cover-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          genre: bookDetails.genre,
          aspectRatio: coverType === 'ebook' ? '3:4' : '16:9',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate image via AI backend');
      }

      if (json.imageUrl) {
        // Insert as background artwork layer
        const newLayer: ImageLayer = {
          id: `ai-artwork-${Date.now()}`,
          type: 'image',
          name: 'AI Generated Background',
          role: 'background',
          src: json.imageUrl,
          x: 0,
          y: 0,
          width: dimensions.canvasWidthPx,
          height: dimensions.canvasHeightPx,
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
          vignette: 10,
          warmth: 0,
          blendMode: 'source-over',
          locked: true,
          visible: true,
        };

        // Place below text layers
        const updatedLayers = [newLayer, ...layers.filter((l) => l.name !== 'Cover Artwork')];
        onApplyNewLayers(updatedLayers);
      }
    } catch (err: any) {
      setAiImageError(err.message || 'AI Generation error');
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Font options list
  const FONT_OPTIONS = [
    { name: 'Playfair Display', category: 'Serif (Editorial / Bestseller)' },
    { name: 'Cinzel', category: 'Serif (Fantasy / Ancient)' },
    { name: 'Cinzel Decorative', category: 'Decorative (Mythic)' },
    { name: 'Cormorant Garamond', category: 'Serif (Poetic / Literary)' },
    { name: 'EB Garamond', category: 'Serif (Classical / Faith)' },
    { name: 'Montserrat', category: 'Sans (Bold Commercial)' },
    { name: 'Oswald', category: 'Sans (Tall Condensed / Thriller)' },
    { name: 'Anton', category: 'Sans (Heavy Impact / Suspense)' },
    { name: 'Plus Jakarta Sans', category: 'Sans (Modernist / Clean)' },
    { name: 'Righteous', category: 'Display (Sci-Fi / Modern)' },
    { name: 'Great Vibes', category: 'Script (Romantic Calligraphy)' },
  ];

  return (
    <div className="flex h-full bg-neutral-900 border-r border-neutral-800 text-xs w-80 sm:w-96 select-none shrink-0">
      {/* Icon Navigation Rail */}
      <div className="flex flex-col items-center py-3 px-1.5 border-r border-neutral-800 bg-neutral-950 w-14 shrink-0 space-y-2">
        {[
          { id: 'details', label: 'Details', icon: Book },
          { id: 'auto_design', label: 'Auto', icon: Wand2 },
          { id: 'templates', label: 'Templates', icon: LayoutTemplate },
          { id: 'typography', label: 'Type', icon: Type },
          { id: 'images', label: 'Images', icon: ImageIcon },
          { id: 'blurb', label: 'Blurb', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as SidebarTab)}
              title={item.label}
              className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: BOOK DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-semibold text-neutral-200 text-xs">Book Metadata & Architecture</span>
                <span className="text-[10px] text-neutral-400 uppercase font-mono">{coverType}</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">Book Title *</label>
                <input
                  type="text"
                  value={bookDetails.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    onUpdateBookDetails({ title });
                    const titleLayer = layers.find((l) => 'role' in l && l.role === 'title');
                    if (titleLayer) onUpdateLayer(titleLayer.id, { text: title });
                    const spineLayer = layers.find((l) => 'role' in l && l.role === 'spine_title');
                    if (spineLayer) onUpdateLayer(spineLayer.id, { text: title });
                  }}
                  placeholder="e.g. The Crown of Ash"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">Subtitle (Optional)</label>
                <input
                  type="text"
                  value={bookDetails.subtitle}
                  onChange={(e) => {
                    const subtitle = e.target.value;
                    onUpdateBookDetails({ subtitle });
                    const subLayer = layers.find((l) => 'role' in l && l.role === 'subtitle');
                    if (subLayer) onUpdateLayer(subLayer.id, { text: subtitle });
                  }}
                  placeholder="e.g. Book One of the Dragonfire Chronicles"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">Author Name *</label>
                <input
                  type="text"
                  value={bookDetails.authorName}
                  onChange={(e) => {
                    const authorName = e.target.value;
                    onUpdateBookDetails({ authorName });
                    const authorLayer = layers.find((l) => 'role' in l && l.role === 'author');
                    if (authorLayer) onUpdateLayer(authorLayer.id, { text: authorName });
                    const spineAuthor = layers.find((l) => 'role' in l && l.role === 'spine_author');
                    if (spineAuthor) onUpdateLayer(spineAuthor.id, { text: authorName });
                  }}
                  placeholder="e.g. Katherine Vance"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">Genre Preset</label>
                <select
                  value={bookDetails.genre}
                  onChange={(e) => {
                    const genre = e.target.value;
                    onUpdateBookDetails({ genre });
                    const res = generateAutomatedCover({
                      title: bookDetails.title,
                      subtitle: bookDetails.subtitle,
                      authorName: bookDetails.authorName,
                      genre,
                      blurb: bookDetails.blurb,
                      coverType,
                      dimensions,
                    });
                    onApplyNewLayers(res.layers, res.backgroundColor, res.backgroundGradient);
                  }}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                >
                  {Object.entries(GENRE_PRESETS).map(([k, g]) => (
                    <option key={k} value={k}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-500 block mt-1">
                  Selecting a genre automatically synchronizes font pairings, color mood, and title effects.
                </span>
              </div>

              {/* Print Specs Trigger */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenCalculator}
                  className="w-full py-2.5 px-3 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 text-neutral-300 text-xs flex items-center justify-between transition-colors"
                >
                  <span className="font-medium">KDP Print Specs & Dimensions</span>
                  <span className="text-amber-400 font-mono text-[11px]">Configure →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATIC DESIGN ENGINE */}
          {activeTab === 'auto_design' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-neutral-950 to-neutral-950 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-neutral-200 text-xs">Automated Design Studio</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Our rules engine intelligently calculates font sizing, contrast, safe margins, and visual balance for "
                  {bookDetails.title || 'your book'}".
                </p>
                <button
                  type="button"
                  onClick={handleGenerateVariations}
                  disabled={isGeneratingDesigns}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingDesigns ? 'Generating Layouts...' : 'Generate 4 Design Variations'}</span>
                </button>
              </div>

              {/* Variations Grid */}
              {layoutVariations.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block">
                    Select a Layout Direction:
                  </span>
                  {layoutVariations.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleApplyVariation(v)}
                      className="group p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-xs">{v.name}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: v.previewColor }}
                        />
                      </div>
                      <p className="text-[11px] text-neutral-400">{v.description}</p>
                      <span className="text-[10px] text-amber-400 group-hover:underline block pt-1">
                        Apply this design →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEMPLATES LIBRARY */}
          {activeTab === 'templates' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-semibold text-neutral-200 text-xs">Curated Book Covers</span>
                <span className="text-[10px] text-neutral-400">{COVER_TEMPLATES.length} Templates</span>
              </div>

              {/* Template Cards */}
              <div className="space-y-2.5">
                {COVER_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl)}
                    className="group p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 cursor-pointer transition-all flex items-center gap-3"
                  >
                    <div
                      className="w-14 h-20 rounded-lg shrink-0 border border-neutral-700 shadow-sm flex items-center justify-center p-1 text-[8px] font-serif text-white text-center leading-tight overflow-hidden"
                      style={{ background: tpl.thumbnail }}
                    >
                      {tpl.name}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-xs truncate">{tpl.name}</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {tpl.genre}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 line-clamp-2">{tpl.description}</p>
                      <span className="text-[10px] text-amber-400 group-hover:underline block">
                        Use this template →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCED TYPOGRAPHY & FONT PAIRINGS */}
          {activeTab === 'typography' && (
            <div className="space-y-4">
              {/* Segmented Mode Switcher */}
              <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTypographySubTab('pairings')}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                    typographySubTab === 'pairings'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Curated Heading & Body Font Pairings"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pairings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypographySubTab('effects')}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                    typographySubTab === 'effects'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Title Shadows, Outline Strokes, and Character Tracking"
                >
                  <Contrast className="w-3.5 h-3.5 text-amber-400" />
                  <span>Effects</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypographySubTab('single')}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                    typographySubTab === 'single'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Single Layer Inspector"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Inspector</span>
                </button>
              </div>

              {/* Scale to Fit Auto-Sizing Engine Card */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-semibold text-neutral-200 text-xs block">Scale to Fit Engine</span>
                      <span className="text-[10px] text-neutral-400">
                        Fits Title and Subtitle precisely inside cover safe bounds
                      </span>
                    </div>
                  </div>
                  {areAnyLayersScaled && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-semibold">
                      SCALED
                    </span>
                  )}
                </div>

                {/* Status Readout */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Title Size:</span>
                    <span className="font-mono text-neutral-200 font-medium">
                      {titleLayer ? `${titleLayer.fontSize}px` : 'No Title'}
                      {isTitleScaled && (
                        <span className="text-amber-400 text-[10px] ml-1">
                          (was {titleLayer?.originalFontSize}px)
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Subtitle Size:</span>
                    <span className="font-mono text-neutral-200 font-medium">
                      {subtitleLayer ? `${subtitleLayer.fontSize}px` : 'No Subtitle'}
                      {isSubtitleScaled && (
                        <span className="text-amber-400 text-[10px] ml-1">
                          (was {subtitleLayer?.originalFontSize}px)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Actions: Auto Scale vs Reset Toggle */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleScaleToFitAll}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Scale to Fit</span>
                  </button>
                  {areAnyLayersScaled && (
                    <button
                      type="button"
                      onClick={handleResetScaleToFitAll}
                      title="Reset font sizes to original"
                      className="py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Toast Notice */}
              {pairingNotice && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 transition-all">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{pairingNotice}</span>
                </div>
              )}

              {/* SUB-VIEW 1: CURATED FONT PAIRINGS ENGINE */}
              {typographySubTab === 'pairings' && (
                <div className="space-y-3.5">
                  <div className="pb-2 border-b border-neutral-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-200 text-xs">Curated Font Pairings</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {CURATED_FONT_PAIRINGS.length} Combos
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Harmonize Title, Subtitle, Author, and Blurb typography across all cover surfaces in one click.
                    </p>
                  </div>

                  {/* Pairings List */}
                  <div className="space-y-3">
                    {CURATED_FONT_PAIRINGS.map((pairing) => {
                      const isApplied = appliedPairingId === pairing.id;

                      return (
                        <div
                          key={pairing.id}
                          className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                            isApplied
                              ? 'bg-neutral-950 border-amber-500/80 shadow-md ring-1 ring-amber-500/20'
                              : 'bg-neutral-950/80 border-neutral-800/90 hover:border-neutral-700'
                          }`}
                        >
                          {/* Header & Genre Tag */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white text-xs">{pairing.name}</span>
                                {isApplied && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-400 block">{pairing.genreTag}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyFontPairing(pairing)}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center gap-1 ${
                                isApplied
                                  ? 'bg-amber-500 text-neutral-950'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                              }`}
                            >
                              {isApplied ? <Check className="w-3 h-3" /> : null}
                              <span>{isApplied ? 'Applied' : 'Apply'}</span>
                            </button>
                          </div>

                          <p className="text-[11px] text-neutral-400 leading-relaxed">{pairing.description}</p>

                          {/* Live Typographic Specimen Box */}
                          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1.5">
                            {/* Heading Specimen */}
                            <div
                              style={{ fontFamily: pairing.headingFont }}
                              className="text-sm font-bold text-white tracking-wide truncate"
                            >
                              {pairing.headingSample}
                            </div>
                            {/* Subtitle / Author Specimen */}
                            <div
                              style={{ fontFamily: pairing.authorFont }}
                              className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider truncate"
                            >
                              Author · {pairing.authorFont}
                            </div>
                            {/* Body Specimen */}
                            <div
                              style={{ fontFamily: pairing.bodyFont }}
                              className="text-[11px] text-neutral-300 leading-snug line-clamp-2"
                            >
                              {pairing.bodySample}
                            </div>
                          </div>

                          {/* Font Family Breakdown Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] text-neutral-400">
                            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                              <span className="text-neutral-500 mr-1">Title:</span>
                              <span className="text-neutral-200 font-medium">{pairing.headingFont}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                              <span className="text-neutral-500 mr-1">Body:</span>
                              <span className="text-neutral-200 font-medium">{pairing.bodyFont}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                              <span className="text-neutral-500 mr-1">Author:</span>
                              <span className="text-neutral-200 font-medium">{pairing.authorFont}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: TYPOGRAPHY EFFECTS & VISIBILITY ENHANCER */}
              {typographySubTab === 'effects' && effectsTargetLayer && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25">
                    <div className="flex items-center gap-2 mb-1">
                      <Contrast className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-semibold text-neutral-100">Typography Effects & Contrast</h4>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Calibrate text shadow, outline/stroke width, and character tracking to ensure your book title cuts through complex cover art, photographs, and lighting.
                    </p>
                  </div>

                  <TypographyEffectsPanel
                    layer={effectsTargetLayer}
                    allLayers={layers}
                    onUpdateLayer={onUpdateLayer}
                    onApplyNewLayers={onApplyNewLayers}
                    onNotify={(msg) => {
                      setPairingNotice(msg);
                      setTimeout(() => setPairingNotice(null), 3000);
                    }}
                    showLayerSelector={true}
                    onSelectLayerId={(id) => setEffectsTargetLayerId(id)}
                  />
                </div>
              )}

              {/* SUB-VIEW 3: INDIVIDUAL LAYER INSPECTOR */}
              {typographySubTab === 'single' && (
                <div>
                  {selectedTextLayer ? (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                        <span className="font-semibold text-neutral-200 text-xs">Edit: {selectedTextLayer.name}</span>
                        <span className="text-[10px] text-amber-400 uppercase font-mono">{selectedTextLayer.role}</span>
                      </div>

                      {/* Text string edit */}
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-300 mb-1">Content</label>
                        <input
                          type="text"
                          value={selectedTextLayer.text}
                          onChange={(e) => onUpdateLayer(selectedTextLayer.id, { text: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-medium"
                        />
                      </div>

                      {/* Font Family */}
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-300 mb-1">Font Family</label>
                        <select
                          value={selectedTextLayer.fontFamily}
                          onChange={(e) => onUpdateLayer(selectedTextLayer.id, { fontFamily: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                        >
                          {FONT_OPTIONS.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.name} — {f.category}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Size and Scale to Fit Controls */}
                      <div className="space-y-2 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-neutral-300">Font Size</span>
                            {selectedTextLayer.originalFontSize && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono font-medium">
                                auto-scaled
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {selectedTextLayer.originalFontSize && (
                              <button
                                type="button"
                                onClick={() => handleResetSingleLayer(selectedTextLayer)}
                                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-[10px] font-medium flex items-center gap-1 border border-neutral-700 transition-colors cursor-pointer"
                                title={`Reset to original font size (${selectedTextLayer.originalFontSize}px)`}
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Reset ({selectedTextLayer.originalFontSize}px)</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleScaleToFitSingleLayer(selectedTextLayer)}
                              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-medium flex items-center gap-1 border border-amber-500/30 transition-colors cursor-pointer"
                              title="Auto-scale font size to fit safely inside book cover bounding box"
                            >
                              <Maximize2 className="w-2.5 h-2.5" />
                              <span>Scale to Fit</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="range"
                            min="14"
                            max="140"
                            value={selectedTextLayer.fontSize}
                            onChange={(e) =>
                              onUpdateLayer(selectedTextLayer.id, { fontSize: parseInt(e.target.value, 10) })
                            }
                            className="w-full accent-amber-500"
                          />
                          <span className="font-mono text-neutral-200 text-xs w-8 text-right font-semibold">
                            {selectedTextLayer.fontSize}px
                          </span>
                        </div>
                      </div>

                      {/* Letter Spacing */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-neutral-400">Letter Spacing</span>
                          <span className="font-mono text-neutral-300 text-[11px]">
                            {selectedTextLayer.letterSpacing}px
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min="0"
                            max="12"
                            value={selectedTextLayer.letterSpacing}
                            onChange={(e) =>
                              onUpdateLayer(selectedTextLayer.id, { letterSpacing: parseInt(e.target.value, 10) })
                            }
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>

                      {/* Text Effects */}
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-300 mb-1.5">
                          Text Effect / Material
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'none', label: 'None' },
                            { id: 'gold_foil', label: 'Gold Foil' },
                            { id: 'silver_foil', label: 'Silver Foil' },
                            { id: 'shadow', label: 'Drop Shadow' },
                            { id: 'outline', label: 'Outline' },
                            { id: 'glow', label: 'Cyber Glow' },
                          ].map((ef) => (
                            <button
                              key={ef.id}
                              type="button"
                              onClick={() => onUpdateLayer(selectedTextLayer.id, { effect: ef.id as TextEffectType })}
                              className={`px-2 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                                selectedTextLayer.effect === ef.id
                                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {ef.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Picker */}
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-300 mb-1">Text Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedTextLayer.color || '#FFFFFF'}
                            onChange={(e) => onUpdateLayer(selectedTextLayer.id, { color: e.target.value })}
                            className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={selectedTextLayer.color}
                            onChange={(e) => onUpdateLayer(selectedTextLayer.id, { color: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-neutral-200"
                          />
                        </div>
                      </div>

                      {/* Typography Effects Section: Text Shadow, Outline Width, Character Spacing */}
                      <div className="pt-3 border-t border-neutral-800 space-y-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Contrast className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-neutral-200">Typography Effects & Contrast</span>
                        </div>
                        <TypographyEffectsPanel
                          layer={selectedTextLayer}
                          allLayers={layers}
                          onUpdateLayer={onUpdateLayer}
                          onApplyNewLayers={onApplyNewLayers}
                          onNotify={(msg) => {
                            setPairingNotice(msg);
                            setTimeout(() => setPairingNotice(null), 3000);
                          }}
                          showLayerSelector={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
                      <Type className="w-8 h-8 text-neutral-600 mx-auto" />
                      <div>
                        <span className="text-xs font-semibold text-neutral-300 block">Select Text to Edit</span>
                        <p className="text-[11px] text-neutral-500 mt-1">
                          Click on any text on the cover to customize its size, effects, color, and spacing, or switch to
                          Curated Pairings above to harmonize all text layers at once.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: IMAGES & FILTERS */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-semibold text-neutral-200 text-xs">Artwork & Filter Adjustments</span>
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Image</span>
                </button>
              </div>

              {/* AI Image Generation Prompt */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center gap-2 text-neutral-200 font-semibold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Generate Background via Gemini</span>
                </div>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. A lone wanderer standing on a clifftop under two moons..."
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                />
                {aiImageError && <span className="text-[10px] text-red-400 block">{aiImageError}</span>}
                <button
                  type="button"
                  onClick={handleAiGenerateBackground}
                  disabled={isGeneratingAiImage || !aiPrompt.trim()}
                  className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isGeneratingAiImage ? 'Generating Artwork...' : 'Generate Cover Art'}</span>
                </button>
              </div>

              {/* Image Filter Sliders */}
              {selectedImageLayer ? (
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200 text-xs">Filter: {selectedImageLayer.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLayer(selectedImageLayer.id, {
                          brightness: 0,
                          contrast: 0,
                          saturation: 0,
                          hue: 0,
                          blur: 0,
                          vignette: 0,
                        })
                      }
                      title="Reset Adjustments"
                      className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Brightness</span>
                      <span className="font-mono text-neutral-300">{selectedImageLayer.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={selectedImageLayer.brightness || 0}
                      onChange={(e) =>
                        onUpdateLayer(selectedImageLayer.id, { brightness: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Contrast</span>
                      <span className="font-mono text-neutral-300">{selectedImageLayer.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={selectedImageLayer.contrast || 0}
                      onChange={(e) =>
                        onUpdateLayer(selectedImageLayer.id, { contrast: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Saturation</span>
                      <span className="font-mono text-neutral-300">{selectedImageLayer.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={selectedImageLayer.saturation || 0}
                      onChange={(e) =>
                        onUpdateLayer(selectedImageLayer.id, { saturation: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>

                  {/* Vignette */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Atmospheric Vignette</span>
                      <span className="font-mono text-neutral-300">{selectedImageLayer.vignette || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedImageLayer.vignette || 0}
                      onChange={(e) =>
                        onUpdateLayer(selectedImageLayer.id, { vignette: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-neutral-600 mx-auto" />
                  <span className="text-xs font-semibold text-neutral-300 block">Select Image Layer</span>
                  <p className="text-[11px] text-neutral-500">
                    Click on an image or background on the canvas to adjust brightness, contrast, and filters.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: BACK COVER BLURB */}
          {activeTab === 'blurb' && (
            <BlurbEditorPanel
              project={project}
              onUpdateLayer={onUpdateLayer}
              onUpdateBookDetails={onUpdateBookDetails}
            />
          )}
        </div>
      </div>
    </div>
  );
};
