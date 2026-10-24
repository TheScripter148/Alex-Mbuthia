import React, { useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, RefreshCw, AlertTriangle, Check, BookOpen, User, Building, QrCode } from 'lucide-react';
import { CanvasLayer, ProjectState, TextLayer } from '../types';

interface BlurbEditorPanelProps {
  project: ProjectState;
  onUpdateLayer: (layerId: string, updates: Partial<CanvasLayer>) => void;
  onUpdateBookDetails: (details: Partial<ProjectState['bookDetails']>) => void;
}

export const BlurbEditorPanel: React.FC<BlurbEditorPanelProps> = ({
  project,
  onUpdateLayer,
  onUpdateBookDetails,
}) => {
  const { layers, bookDetails, dimensions, coverType } = project;
  const isWrap = coverType === 'paperback' || coverType === 'hardcover';

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Find back cover blurb layer
  const blurbLayer = layers.find((l): l is TextLayer => l.type === 'text' && l.role === 'blurb');
  const hookLayer = layers.find((l): l is TextLayer => l.type === 'text' && l.role === 'tagline');
  const barcodeLayer = layers.find((l) => l.name.includes('Barcode'));

  // Calculate text fit heuristics
  const blurbLength = (bookDetails.blurb || '').length;
  const currentFontSize = blurbLayer?.fontSize || 14;
  const estimatedLines = Math.ceil(blurbLength / 55);
  const estimatedHeight = estimatedLines * (currentFontSize * 1.5);
  const availableHeight = dimensions.backRegion.height * 0.55;
  const isOverflowing = estimatedHeight > availableHeight;
  const isTooSmall = currentFontSize < 10;

  const handleBlurbTextChange = (text: string) => {
    onUpdateBookDetails({ blurb: text });
    if (blurbLayer) {
      onUpdateLayer(blurbLayer.id, { text });
    }
  };

  const handleHookTextChange = (text: string) => {
    onUpdateBookDetails({ tagline: text });
    if (hookLayer) {
      onUpdateLayer(hookLayer.id, { text });
    }
  };

  const handleAutoFit = () => {
    if (!blurbLayer) return;
    // Optimize font size so blurb fits in back cover area comfortably
    let optimalSize = 14;
    if (blurbLength > 900) optimalSize = 11;
    else if (blurbLength > 650) optimalSize = 12;
    else if (blurbLength > 400) optimalSize = 13;
    else if (blurbLength < 200) optimalSize = 16;

    onUpdateLayer(blurbLayer.id, {
      fontSize: optimalSize,
      lineHeight: 1.55,
      textAlign: 'left',
    });
  };

  const handleAiRefineBlurb = async () => {
    setIsAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/blurb-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refine_blurb',
          genre: bookDetails.genre,
          title: bookDetails.title,
          subtitle: bookDetails.subtitle,
          blurb: bookDetails.blurb,
          authorName: bookDetails.authorName,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'AI blurb assistance service is not available');
      }

      if (json.data) {
        if (json.data.blurb) handleBlurbTextChange(json.data.blurb);
        if (json.data.hook) handleHookTextChange(json.data.hook);
        if (json.data.authorBio) onUpdateBookDetails({ authorBio: json.data.authorBio });
      }
    } catch (err: any) {
      setAiError(err.message || 'AI blurb enhancement failed');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isWrap) {
    return (
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
        <BookOpen className="w-8 h-8 text-neutral-500 mx-auto" />
        <h4 className="text-xs font-semibold text-neutral-300">Front Cover Active (Ebook)</h4>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          The back cover blurb editor is active for Paperback and Hardcover wraps. Switch to Paperback or Hardcover in the
          calculator or guided setup to design the back cover and spine!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Live Fit Status */}
      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-200">Back Cover Copy & Fit</span>
          <button
            type="button"
            onClick={handleAutoFit}
            className="text-[10px] font-medium text-amber-400 hover:text-amber-300 underline"
          >
            Auto-Fit Font
          </button>
        </div>

        {/* Live Fit Warning/Status */}
        {isOverflowing ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>Blurb copy exceeds back cover safe box! Reduce font size or shorten text.</span>
          </div>
        ) : isTooSmall ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Font size ({currentFontSize}px) is below 10pt. May be hard to read in physical print.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Blurb fits within back cover margins ({blurbLength} characters, {estimatedLines} lines).</span>
          </div>
        )}
      </div>

      {/* Hook Headline */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-300 mb-1">Catchy Opening Hook</label>
        <input
          type="text"
          value={bookDetails.tagline || ''}
          onChange={(e) => handleHookTextChange(e.target.value)}
          placeholder="e.g. Trust no one. The next heartbeat could be your last."
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Main Blurb Text */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-neutral-300">Main Back Cover Blurb</label>
          <button
            type="button"
            onClick={handleAiRefineBlurb}
            disabled={isAiLoading}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            <span>{isAiLoading ? 'Refining...' : 'AI Polish Hook'}</span>
          </button>
        </div>
        <textarea
          rows={5}
          value={bookDetails.blurb || ''}
          onChange={(e) => handleBlurbTextChange(e.target.value)}
          placeholder="Enter the compelling 2-3 paragraph blurb that hooks the reader..."
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 leading-relaxed"
        />
        {aiError && <span className="text-[10px] text-red-400 block mt-1">{aiError}</span>}
      </div>

      {/* Typography Controls for Blurb */}
      {blurbLayer && (
        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <span className="text-xs font-semibold text-neutral-200 block">Blurb Typography</span>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-neutral-400 block mb-1">Font Size</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={blurbLayer.fontSize}
                  onChange={(e) => onUpdateLayer(blurbLayer.id, { fontSize: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500"
                />
                <span className="font-mono text-neutral-300 text-[11px] w-6 text-right">{blurbLayer.fontSize}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-neutral-400 block mb-1">Line Spacing</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="1.2"
                  max="2.0"
                  step="0.05"
                  value={blurbLayer.lineHeight}
                  onChange={(e) => onUpdateLayer(blurbLayer.id, { lineHeight: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
                <span className="font-mono text-neutral-300 text-[11px] w-6 text-right">
                  {blurbLayer.lineHeight.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Alignment */}
          <div>
            <span className="text-[10px] text-neutral-400 block mb-1">Text Alignment</span>
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
              {[
                { id: 'left', icon: AlignLeft },
                { id: 'center', icon: AlignCenter },
                { id: 'right', icon: AlignRight },
                { id: 'justify', icon: AlignJustify },
              ].map((al) => {
                const Icon = al.icon;
                return (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() => onUpdateLayer(blurbLayer.id, { textAlign: al.id as any })}
                    className={`flex-1 p-1.5 rounded flex items-center justify-center transition-colors ${
                      blurbLayer.textAlign === al.id ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Author Bio Section */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-300 mb-1">Author Bio (Optional)</label>
        <textarea
          rows={2}
          value={bookDetails.authorBio || ''}
          onChange={(e) => onUpdateBookDetails({ authorBio: e.target.value })}
          placeholder="Short 2-sentence bio for the back cover..."
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Barcode Reservation Area Toggle */}
      {barcodeLayer && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-xs font-semibold text-neutral-200 block">KDP Barcode Area</span>
              <span className="text-[10px] text-neutral-400">2" x 1.2" (600x360 px) reserved print box</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateLayer(barcodeLayer.id, { visible: !barcodeLayer.visible })}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              barcodeLayer.visible ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            {barcodeLayer.visible ? 'Visible' : 'Hidden'}
          </button>
        </div>
      )}
    </div>
  );
};
