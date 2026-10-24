import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  RotateCcw,
  Check,
  Palette,
  Eye,
  Type,
  Maximize2,
  Layers,
  Copy,
} from 'lucide-react';
import { CanvasLayer, TextEffectType, TextLayer } from '../types';

export interface VisibilityPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeWidth: number;
  strokeColor: string;
  letterSpacing: number;
}

export const VISIBILITY_PRESETS: VisibilityPreset[] = [
  {
    id: 'noir-shadow',
    name: 'Noir Drop Shadow',
    badge: 'HIGH CONTRAST',
    description: 'Deep, crisp directional shadow for bright or photographic artwork',
    shadowColor: '#000000',
    shadowBlur: 14,
    shadowOffsetX: 3,
    shadowOffsetY: 4,
    strokeWidth: 0,
    strokeColor: '#000000',
    letterSpacing: 2,
  },
  {
    id: 'keyline-outline',
    name: 'Keyline Outline',
    badge: 'POPULAR',
    description: 'Crisp dark contour stroke around letters with ambient drop shadow',
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowBlur: 8,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    strokeWidth: 3.5,
    strokeColor: '#000000',
    letterSpacing: 3,
  },
  {
    id: 'ambient-halo',
    name: 'Ambient Halo Glow',
    badge: 'BUSY COVERS',
    description: '360° diffused shadow backdrop to decouple title from intricate illustrations',
    shadowColor: '#000000',
    shadowBlur: 26,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    strokeWidth: 0,
    strokeColor: '#000000',
    letterSpacing: 4,
  },
  {
    id: 'cinematic-tracking',
    name: 'Cinematic Epic',
    badge: 'BLOCKBUSTER',
    description: 'Generous character tracking combined with multi-pixel atmospheric shadow',
    shadowColor: '#000000',
    shadowBlur: 16,
    shadowOffsetX: 2,
    shadowOffsetY: 4,
    strokeWidth: 1.5,
    strokeColor: 'rgba(0,0,0,0.9)',
    letterSpacing: 8,
  },
  {
    id: 'gilded-rim',
    name: 'Gilded Gold Rim',
    badge: 'PREMIUM',
    description: 'Refined metallic gold hairline stroke with dark grounded shadow',
    shadowColor: '#000000',
    shadowBlur: 12,
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    strokeWidth: 2,
    strokeColor: '#D4AF37',
    letterSpacing: 3.5,
  },
  {
    id: 'pure-flat',
    name: 'Minimalist Clean',
    badge: 'RESET',
    description: 'Clears all shadows and strokes for clean editorial book jackets',
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    strokeWidth: 0,
    strokeColor: '#000000',
    letterSpacing: 0,
  },
];

const SHADOW_COLOR_SWATCHES = [
  { label: 'Pitch Black', value: '#000000' },
  { label: '85% Smoke', value: 'rgba(0,0,0,0.85)' },
  { label: 'Dark Slate', value: '#0f172a' },
  { label: 'Deep Crimson', value: '#450a0a' },
  { label: 'Pure White (Glow)', value: '#ffffff' },
  { label: 'Warm Amber', value: '#fbbf24' },
];

const STROKE_COLOR_SWATCHES = [
  { label: 'Solid Black', value: '#000000' },
  { label: 'Pure White', value: '#ffffff' },
  { label: 'Gold Metallic', value: '#D4AF37' },
  { label: 'Silver Trim', value: '#C0C0C0' },
  { label: 'Slate Charcoal', value: '#1e293b' },
  { label: 'Burgundy Rim', value: '#881337' },
];

const TRACKING_PRESETS = [
  { label: 'Normal', value: 0 },
  { label: 'Snug (+1.5px)', value: 1.5 },
  { label: 'Wide (+4px)', value: 4 },
  { label: 'Cinematic (+8px)', value: 8 },
  { label: 'Epic (+14px)', value: 14 },
];

interface TypographyEffectsPanelProps {
  layer: TextLayer;
  allLayers: CanvasLayer[];
  onUpdateLayer: (layerId: string, updates: Partial<CanvasLayer>) => void;
  onApplyNewLayers: (layers: CanvasLayer[], bg?: string, grad?: string) => void;
  onNotify?: (msg: string) => void;
  /** When true, renders in standalone mode with full target layer selector tabs */
  showLayerSelector?: boolean;
  onSelectLayerId?: (layerId: string) => void;
}

export const TypographyEffectsPanel: React.FC<TypographyEffectsPanelProps> = ({
  layer,
  allLayers,
  onUpdateLayer,
  onApplyNewLayers,
  onNotify,
  showLayerSelector = false,
  onSelectLayerId,
}) => {
  const [specimenBg, setSpecimenBg] = useState<'dark' | 'art' | 'light'>('dark');

  // Extract text layers for layer switcher
  const textLayers = allLayers.filter((l): l is TextLayer => l.type === 'text');

  // Shadow parameters with fallbacks
  const shadowBlur = layer.shadowBlur ?? 0;
  const shadowOffsetX = layer.shadowOffsetX ?? 0;
  const shadowOffsetY = layer.shadowOffsetY ?? 0;
  const shadowColor = layer.shadowColor || '#000000';
  const hasShadowActive = shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0 || layer.effect === 'shadow';

  // Stroke parameters with fallbacks
  const strokeWidth = layer.strokeWidth ?? 0;
  const strokeColor = layer.strokeColor || '#000000';
  const hasStrokeActive = strokeWidth > 0 || layer.effect === 'outline';

  // Character spacing (letterSpacing)
  const letterSpacing = layer.letterSpacing ?? 0;

  // Quick Preset Application
  const handleApplyPreset = (preset: VisibilityPreset) => {
    onUpdateLayer(layer.id, {
      shadowColor: preset.shadowColor,
      shadowBlur: preset.shadowBlur,
      shadowOffsetX: preset.shadowOffsetX,
      shadowOffsetY: preset.shadowOffsetY,
      strokeWidth: preset.strokeWidth,
      strokeColor: preset.strokeColor,
      letterSpacing: preset.letterSpacing,
      effect: preset.shadowBlur > 0 ? 'shadow' : preset.strokeWidth > 0 ? 'outline' : 'none',
    });
    onNotify?.(`Applied "${preset.name}" preset to ${layer.name}!`);
  };

  // Toggle Shadow On/Off
  const handleToggleShadow = (enable: boolean) => {
    if (enable) {
      onUpdateLayer(layer.id, {
        shadowBlur: shadowBlur > 0 ? shadowBlur : 14,
        shadowOffsetX: shadowOffsetX !== 0 ? shadowOffsetX : 2,
        shadowOffsetY: shadowOffsetY !== 0 ? shadowOffsetY : 4,
        shadowColor: shadowColor || '#000000',
        effect: 'shadow',
      });
      onNotify?.(`Enabled text shadow on ${layer.name}`);
    } else {
      onUpdateLayer(layer.id, {
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        effect: hasStrokeActive ? 'outline' : 'none',
      });
      onNotify?.(`Disabled text shadow on ${layer.name}`);
    }
  };

  // Toggle Stroke On/Off
  const handleToggleStroke = (enable: boolean) => {
    if (enable) {
      onUpdateLayer(layer.id, {
        strokeWidth: strokeWidth > 0 ? strokeWidth : 3,
        strokeColor: strokeColor || '#000000',
        effect: 'outline',
      });
      onNotify?.(`Enabled outline stroke on ${layer.name}`);
    } else {
      onUpdateLayer(layer.id, {
        strokeWidth: 0,
        effect: hasShadowActive ? 'shadow' : 'none',
      });
      onNotify?.(`Disabled outline stroke on ${layer.name}`);
    }
  };

  // Bulk Apply: Harmonize effects to all Title, Subtitle, and Spine Title layers
  const handleApplyToAllTitleLayers = () => {
    const updated = allLayers.map((l) => {
      if (l.type !== 'text') return l;
      const textL = l as TextLayer;
      if (textL.role === 'title' || textL.role === 'spine_title' || textL.role === 'subtitle') {
        return {
          ...textL,
          shadowColor,
          shadowBlur,
          shadowOffsetX,
          shadowOffsetY,
          strokeWidth,
          strokeColor,
          letterSpacing: textL.role === 'title' ? letterSpacing : Math.max(0, letterSpacing * 0.7),
          effect: shadowBlur > 0 ? 'shadow' : strokeWidth > 0 ? 'outline' : textL.effect,
        };
      }
      return textL;
    });

    onApplyNewLayers(updated);
    onNotify?.('Synchronized visibility effects across Title, Spine Title, and Subtitle!');
  };

  // Helper for live preview CSS
  const previewShadowCss = shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0
    ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`
    : 'none';

  const previewStrokeCss = strokeWidth > 0
    ? `${Math.max(1, strokeWidth * 0.75)}px ${strokeColor}`
    : 'none';

  return (
    <div className="space-y-4">
      {/* Target Layer Selector (Optional header switch) */}
      {showLayerSelector && (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-neutral-300">Target Text Layer</label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
            {textLayers
              .filter((l) => ['title', 'subtitle', 'author', 'spine_title'].includes(l.role))
              .map((l) => {
                const isSelected = l.id === layer.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onSelectLayerId?.(l.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium text-left truncate transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                    }`}
                  >
                    <span className="truncate">{l.name}</span>
                    <span className="text-[9px] uppercase font-mono text-neutral-500 shrink-0 ml-1">
                      {l.role === 'spine_title' ? 'Spine' : l.role}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Live Contrast & Visibility Specimen Box */}
      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-neutral-200">Visibility Preview</span>
          </div>

          {/* Background Simulation Toggle */}
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-neutral-500 mr-0.5">Test on:</span>
            <button
              type="button"
              onClick={() => setSpecimenBg('dark')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                specimenBg === 'dark' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setSpecimenBg('art')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                specimenBg === 'art' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Artwork
            </button>
            <button
              type="button"
              onClick={() => setSpecimenBg('light')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                specimenBg === 'light' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Light
            </button>
          </div>
        </div>

        {/* Live Typography Specimen Box */}
        <div
          className={`h-24 rounded-lg border border-neutral-800 flex items-center justify-center p-3 text-center overflow-hidden transition-all ${
            specimenBg === 'dark'
              ? 'bg-[#0a0a0c]'
              : specimenBg === 'art'
              ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-amber-950/70'
              : 'bg-neutral-200'
          }`}
        >
          <span
            style={{
              fontFamily: layer.fontFamily,
              color: layer.color || '#FFFFFF',
              letterSpacing: `${letterSpacing}px`,
              textShadow: previewShadowCss,
              WebkitTextStroke: previewStrokeCss,
              textTransform: layer.textTransform || 'none',
              fontWeight: layer.fontWeight || 700,
            }}
            className="text-lg font-bold leading-tight select-none truncate max-w-full drop-shadow-sm transition-all"
          >
            {layer.text || 'BOOK TITLE'}
          </span>
        </div>

        {/* Readability Status Indicators */}
        <div className="flex items-center justify-between text-[10px] pt-0.5 text-neutral-400">
          <div className="flex items-center gap-2">
            <span>
              Shadow:{' '}
              <strong className={hasShadowActive ? 'text-amber-400' : 'text-neutral-500'}>
                {hasShadowActive ? `${shadowBlur}px blur` : 'Off'}
              </strong>
            </span>
            <span>·</span>
            <span>
              Outline:{' '}
              <strong className={hasStrokeActive ? 'text-amber-400' : 'text-neutral-500'}>
                {hasStrokeActive ? `${strokeWidth}px` : 'Off'}
              </strong>
            </span>
            <span>·</span>
            <span>
              Tracking:{' '}
              <strong className={letterSpacing > 0 ? 'text-amber-400' : 'text-neutral-500'}>
                +{letterSpacing}px
              </strong>
            </span>
          </div>

          {(hasShadowActive || hasStrokeActive || letterSpacing > 0) && (
            <button
              type="button"
              onClick={() => handleApplyPreset(VISIBILITY_PRESETS[VISIBILITY_PRESETS.length - 1])}
              className="text-neutral-500 hover:text-neutral-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Curated Visibility Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-neutral-200">Curated Visibility Presets</span>
          </div>
          <span className="text-[10px] text-neutral-500">1-Click Enhance</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {VISIBILITY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 hover:bg-neutral-900/60 transition-all text-left group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-semibold text-xs text-white group-hover:text-amber-300 transition-colors">
                    {preset.name}
                  </span>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 shrink-0">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between text-[9px] text-neutral-500 border-t border-neutral-800/60 mt-2">
                <span>
                  {preset.strokeWidth > 0 ? `Stroke ${preset.strokeWidth}px` : 'No Stroke'}
                </span>
                <span className="text-amber-400/80 group-hover:text-amber-300 font-medium">Apply →</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 1. TEXT SHADOW CONTROLS */}
      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-neutral-200">Text Shadow</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-neutral-300">
            <input
              type="checkbox"
              checked={hasShadowActive}
              onChange={(e) => handleToggleShadow(e.target.checked)}
              className="w-3.5 h-3.5 accent-amber-500 rounded"
            />
            <span className="text-neutral-400 font-medium">Enable</span>
          </label>
        </div>

        {/* Shadow Color Picker & Swatches */}
        <div>
          <span className="text-[10px] text-neutral-400 block mb-1.5">Shadow Color & Opacity</span>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="color"
              value={shadowColor.startsWith('#') ? shadowColor : '#000000'}
              onChange={(e) => onUpdateLayer(layer.id, { shadowColor: e.target.value })}
              className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
              title="Custom Shadow Color"
            />
            <input
              type="text"
              value={shadowColor}
              onChange={(e) => onUpdateLayer(layer.id, { shadowColor: e.target.value })}
              placeholder="#000000 or rgba(0,0,0,0.85)"
              className="flex-1 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs font-mono text-neutral-200"
            />
          </div>

          <div className="grid grid-cols-3 gap-1">
            {SHADOW_COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.value}
                type="button"
                onClick={() => onUpdateLayer(layer.id, { shadowColor: sw.value })}
                className={`px-1.5 py-1 rounded text-[10px] truncate border transition-colors ${
                  shadowColor === sw.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                }`}
                title={sw.value}
              >
                {sw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shadow Blur Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-neutral-400">Blur Radius</span>
            <span className="font-mono text-neutral-300 text-[11px]">{shadowBlur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            value={shadowBlur}
            onChange={(e) => onUpdateLayer(layer.id, { shadowBlur: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 mt-0.5">
            <span>Sharp (0px)</span>
            <span>Medium (14px)</span>
            <span>Diffuse Halo (40px)</span>
          </div>
        </div>

        {/* Shadow Offsets X and Y */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-neutral-400">Offset X</span>
              <span className="font-mono text-neutral-300 text-[10px]">{shadowOffsetX}px</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={shadowOffsetX}
              onChange={(e) => onUpdateLayer(layer.id, { shadowOffsetX: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-neutral-400">Offset Y</span>
              <span className="font-mono text-neutral-300 text-[10px]">{shadowOffsetY}px</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={shadowOffsetY}
              onChange={(e) => onUpdateLayer(layer.id, { shadowOffsetY: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. STROKE / OUTLINE WIDTH CONTROLS */}
      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-neutral-200">Stroke / Outline Width</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-neutral-300">
            <input
              type="checkbox"
              checked={hasStrokeActive}
              onChange={(e) => handleToggleStroke(e.target.checked)}
              className="w-3.5 h-3.5 accent-amber-500 rounded"
            />
            <span className="text-neutral-400 font-medium">Enable</span>
          </label>
        </div>

        {/* Stroke Width Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-neutral-400">Outline Width</span>
            <span className="font-mono text-neutral-200 text-xs font-semibold">{strokeWidth}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="16"
            step="0.5"
            value={strokeWidth}
            onChange={(e) => onUpdateLayer(layer.id, { strokeWidth: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 mt-0.5">
            <span>None (0)</span>
            <span>Hairline (1px)</span>
            <span>Keyline (3-5px)</span>
            <span>Bold (12px+)</span>
          </div>
        </div>

        {/* Stroke Color */}
        <div>
          <span className="text-[10px] text-neutral-400 block mb-1.5">Outline Color</span>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="color"
              value={strokeColor.startsWith('#') ? strokeColor : '#000000'}
              onChange={(e) => onUpdateLayer(layer.id, { strokeColor: e.target.value })}
              className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
              title="Outline Stroke Color"
            />
            <input
              type="text"
              value={strokeColor}
              onChange={(e) => onUpdateLayer(layer.id, { strokeColor: e.target.value })}
              placeholder="#000000"
              className="flex-1 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs font-mono text-neutral-200"
            />
          </div>

          <div className="grid grid-cols-3 gap-1">
            {STROKE_COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.value}
                type="button"
                onClick={() => onUpdateLayer(layer.id, { strokeColor: sw.value })}
                className={`px-1.5 py-1 rounded text-[10px] truncate border transition-colors ${
                  strokeColor === sw.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                }`}
                title={sw.value}
              >
                {sw.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. CHARACTER SPACING (LETTER SPACING / TRACKING) */}
      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-neutral-200">Character Spacing (Tracking)</span>
          </div>
          <span className="font-mono text-neutral-200 text-xs font-semibold">+{letterSpacing}px</span>
        </div>

        {/* Tracking Slider */}
        <div>
          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={letterSpacing}
            onChange={(e) => onUpdateLayer(layer.id, { letterSpacing: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Quick Tracking Presets */}
        <div className="grid grid-cols-5 gap-1 pt-0.5">
          {TRACKING_PRESETS.map((tp) => (
            <button
              key={tp.label}
              type="button"
              onClick={() => onUpdateLayer(layer.id, { letterSpacing: tp.value })}
              className={`py-1 text-[10px] rounded border transition-colors text-center ${
                letterSpacing === tp.value
                  ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-semibold'
                  : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
              }`}
            >
              {tp.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-neutral-500 leading-relaxed pt-1 border-t border-neutral-900">
          Pro Tip: Cinematic letter tracking (+4px to +8px) dramatically increases title readability from across the room and on Amazon book thumbnails.
        </p>
      </div>

      {/* 4. BULK SYNC ACTION */}
      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-300">Synchronize Title Legibility</span>
          <Copy className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <p className="text-[10px] text-neutral-400 leading-relaxed">
          Instantly apply this shadow, outline stroke, and tracking styling across your Book Title, Spine Title, and Subtitle for a completely harmonized jacket.
        </p>
        <button
          type="button"
          onClick={handleApplyToAllTitleLayers}
          className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs border border-neutral-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Apply Effects to All Front & Spine Titles</span>
        </button>
      </div>
    </div>
  );
};
