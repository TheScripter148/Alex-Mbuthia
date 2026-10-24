import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Check,
  Maximize2,
  ExternalLink,
  Filter,
  ShieldCheck,
  ArrowRight,
  Download,
  Loader2,
} from 'lucide-react';
import { CanvasLayer, CalculatedDimensions, CoverType, ImageLayer, ProjectState } from '../types';
import { CURATED_STOCK_IMAGES, STOCK_CATEGORIES, StockImageItem } from '../constants/stockImages';

interface StockSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onApplyNewLayers: (layers: CanvasLayer[], bg?: string, grad?: string) => void;
  onAddLayer: (layer: CanvasLayer) => void;
  onNotify: (msg: string) => void;
}

export const StockSearchModal: React.FC<StockSearchModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplyNewLayers,
  onAddLayer,
  onNotify,
}) => {
  const { dimensions, coverType, layers } = project;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOrientation, setSelectedOrientation] = useState<'all' | 'portrait' | 'landscape'>('all');
  const [apiResults, setApiResults] = useState<StockImageItem[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [activePreviewImage, setActivePreviewImage] = useState<StockImageItem | null>(null);

  // Import Target Options for Backgrounds
  const [bgTargetScope, setBgTargetScope] = useState<'front' | 'full_wrap'>('front');

  // Trigger search on debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setApiResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            setApiResults(data.results);
          }
        }
      } catch (err) {
        console.warn('Live stock search failed, using curated library:', err);
      } finally {
        setIsSearchingApi(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Combined & Filtered Stock Imagery
  const displayedImages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // Filter curated library
    const filteredCurated = CURATED_STOCK_IMAGES.filter((img) => {
      // Category filter
      if (selectedCategory !== 'all' && img.genre !== selectedCategory) {
        return false;
      }
      // Orientation filter
      if (selectedOrientation !== 'all' && img.orientation !== selectedOrientation) {
        return false;
      }
      // Query filter
      if (q) {
        const matchesTitle = img.title.toLowerCase().includes(q);
        const matchesTags = img.tags.some((t) => t.toLowerCase().includes(q));
        const matchesAuthor = img.author.toLowerCase().includes(q);
        return matchesTitle || matchesTags || matchesAuthor;
      }
      return true;
    });

    // Merge API results if search active
    if (q && apiResults.length > 0) {
      const existingIds = new Set(filteredCurated.map((i) => i.id));
      const newApi = apiResults.filter((i) => !existingIds.has(i.id));
      return [...filteredCurated, ...newApi];
    }

    return filteredCurated;
  }, [searchQuery, selectedCategory, selectedOrientation, apiResults]);

  if (!isOpen) return null;

  // Import Action 1: Set as Cover Background Artwork
  const handleImportAsBackground = (image: StockImageItem) => {
    const isWrap = coverType === 'paperback' || coverType === 'hardcover';
    const isFullWrapTarget = isWrap && bgTargetScope === 'full_wrap';

    const bgX = isFullWrapTarget ? 0 : isWrap ? dimensions.frontRegion.x : 0;
    const bgY = isFullWrapTarget ? 0 : isWrap ? dimensions.frontRegion.y : 0;
    const bgW = isFullWrapTarget
      ? dimensions.canvasWidthPx
      : isWrap
      ? dimensions.frontRegion.width
      : dimensions.canvasWidthPx;
    const bgH = isFullWrapTarget
      ? dimensions.canvasHeightPx
      : isWrap
      ? dimensions.frontRegion.height
      : dimensions.canvasHeightPx;

    const newBgLayer: ImageLayer = {
      id: `layer-bg-stock-${Date.now()}`,
      type: 'image',
      name: `Stock BG: ${image.title}`,
      role: 'artwork',
      src: image.url,
      x: bgX,
      y: bgY,
      width: bgW,
      height: bgH,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 0.95,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      sepia: 0,
      grayscale: 0,
      vignette: 15,
      warmth: 0,
      blendMode: 'source-over',
      locked: true,
      visible: true,
      aspectRatioMode: 'fill',
    };

    // Remove existing artwork layer or prepend
    const nonBgLayers = layers.filter(
      (l) => !(l.type === 'image' && (l.role === 'background' || l.role === 'artwork'))
    );

    // Keep text layers strictly on top, lighting scrim right above background
    onApplyNewLayers([newBgLayer, ...nonBgLayers]);
    onNotify(`Imported "${image.title}" as cover background artwork!`);
    onClose();
  };

  // Import Action 2: Add as Foreground / Overlay Layer
  const handleImportAsForeground = (image: StockImageItem) => {
    const isWrap = coverType === 'paperback' || coverType === 'hardcover';
    const frontCenterX = isWrap
      ? dimensions.frontRegion.x + dimensions.frontRegion.width / 2
      : dimensions.canvasWidthPx / 2;
    const frontCenterY = isWrap
      ? dimensions.frontRegion.y + dimensions.frontRegion.height / 2
      : dimensions.canvasHeightPx / 2;

    const targetWidth = Math.round(
      (isWrap ? dimensions.frontRegion.width : dimensions.canvasWidthPx) * 0.55
    );
    const targetHeight = Math.round(targetWidth * 1.25);

    const newForegroundLayer: ImageLayer = {
      id: `layer-fg-stock-${Date.now()}`,
      type: 'image',
      name: `Art: ${image.title}`,
      role: 'overlay',
      src: image.url,
      x: frontCenterX - targetWidth / 2,
      y: frontCenterY - targetHeight / 2,
      width: targetWidth,
      height: targetHeight,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 0.92,
      brightness: 0,
      contrast: 5,
      saturation: 0,
      hue: 0,
      blur: 0,
      sepia: 0,
      grayscale: 0,
      vignette: 0,
      warmth: 0,
      blendMode: 'source-over',
      locked: false,
      visible: true,
      aspectRatioMode: 'fit',
    };

    onAddLayer(newForegroundLayer);
    onNotify(`Added "${image.title}" as movable foreground artwork!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-neutral-100">
                  Royalty-Free Stock Artwork Explorer
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Commercial Use Licensed
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Search high-resolution photography and illustrations to import directly as background or foreground artwork.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/40 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input Bar */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords: dark castle, nebula, rainy noir, romantic sunset, gothic manor, smoke, leather..."
                className="w-full pl-10 pr-9 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Orientation Filter */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Filter className="w-3 h-3 text-neutral-500" />
                Format:
              </span>
              {(['all', 'portrait', 'landscape'] as const).map((orient) => (
                <button
                  key={orient}
                  type="button"
                  onClick={() => setSelectedOrientation(orient)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                    selectedOrientation === orient
                      ? 'bg-amber-500 text-neutral-950 font-semibold'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  {orient === 'portrait' ? 'Cover Portrait' : orient === 'landscape' ? 'Wrap Landscape' : 'All'}
                </button>
              ))}
            </div>

            {/* Wrap Scope (if wrap cover) */}
            {(coverType === 'paperback' || coverType === 'hardcover') && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-800 shrink-0">
                <span className="text-[10px] text-neutral-400">BG Fit:</span>
                <button
                  type="button"
                  onClick={() => setBgTargetScope('front')}
                  className={`px-2 py-0.5 text-[10px] rounded ${
                    bgTargetScope === 'front'
                      ? 'bg-neutral-800 text-amber-300 font-semibold border border-amber-500/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Front Only
                </button>
                <button
                  type="button"
                  onClick={() => setBgTargetScope('full_wrap')}
                  className={`px-2 py-0.5 text-[10px] rounded ${
                    bgTargetScope === 'full_wrap'
                      ? 'bg-neutral-800 text-amber-300 font-semibold border border-amber-500/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Full Wrap
                </button>
              </div>
            )}
          </div>

          {/* Genre Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {STOCK_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body / Image Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearchingApi && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-amber-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching royalty-free open repository...</span>
            </div>
          )}

          {displayedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
              <Search className="w-10 h-10 text-neutral-600" />
              <div>
                <h4 className="text-sm font-semibold text-neutral-300">No matching stock imagery found</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Try searching for a broader term like &quot;castle&quot;, &quot;forest&quot;, &quot;city&quot;, &quot;space&quot;, or select &quot;All Artwork&quot; above.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedOrientation('all');
                }}
                className="px-3 py-1.5 text-xs text-amber-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {displayedImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative flex flex-col rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 transition-all shadow-sm hover:shadow-xl hover:shadow-black/50"
                >
                  {/* Image Display */}
                  <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden cursor-pointer" onClick={() => setActivePreviewImage(img)}>
                    <img
                      src={img.thumbUrl}
                      alt={img.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Quick Source Pill */}
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] font-mono text-neutral-300 border border-white/10">
                      {img.source}
                    </span>

                    {/* Quick Preview Eye */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePreviewImage(img);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-neutral-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
                      title="Inspect full image"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>

                    {/* Hover Overlay with Action Buttons */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportAsBackground(img);
                        }}
                        className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Set as Background</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportAsForeground(img);
                        }}
                        className="w-full py-1.5 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-[10px] flex items-center justify-center gap-1 border border-neutral-700 transition-colors"
                      >
                        <Layers className="w-3 h-3 text-amber-400" />
                        <span>Add as Foreground</span>
                      </button>
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  <div className="p-2.5 space-y-1 bg-neutral-950">
                    <span className="font-semibold text-xs text-white truncate block" title={img.title}>
                      {img.title}
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="truncate">{img.author}</span>
                      <span className="uppercase text-[9px] font-mono shrink-0 ml-1 text-emerald-400">
                        Free
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 bg-neutral-950/80 text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>Showing {displayedImages.length} royalty-free stock assets</span>
            <span>·</span>
            <span className="text-neutral-500">Commercial print license granted</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox / Full Resolution Inspection Modal */}
      {activePreviewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-950">
              <span className="font-semibold text-sm text-white">{activePreviewImage.title}</span>
              <button
                type="button"
                onClick={() => setActivePreviewImage(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-black flex items-center justify-center p-4">
              <img
                src={activePreviewImage.url}
                alt={activePreviewImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-neutral-400 space-y-0.5">
                <div>
                  Photographer: <strong className="text-neutral-200">{activePreviewImage.author}</strong> ({activePreviewImage.source})
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{activePreviewImage.license}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    handleImportAsForeground(activePreviewImage);
                    setActivePreviewImage(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-700"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add as Foreground</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleImportAsBackground(activePreviewImage);
                    setActivePreviewImage(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Set as Cover Background</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
