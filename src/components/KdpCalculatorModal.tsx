import React, { useState } from 'react';
import { Calculator, Check, AlertTriangle, ArrowRight, ShieldCheck, HelpCircle, X } from 'lucide-react';
import { CoverType, PaperType, PrintSpecs, TrimSize } from '../types';
import { calculateCoverDimensions, DPI, inchesToMm, PAPER_SPECS, TRIM_DIMENSIONS } from '../utils/kdpCalculator';

interface KdpCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpecs: PrintSpecs;
  onApplySpecs: (newSpecs: PrintSpecs) => void;
}

export const KdpCalculatorModal: React.FC<KdpCalculatorModalProps> = ({
  isOpen,
  onClose,
  currentSpecs,
  onApplySpecs,
}) => {
  const [specs, setSpecs] = useState<PrintSpecs>({ ...currentSpecs });
  const [customWidth, setCustomWidth] = useState<number>(specs.customTrimWidth || 6.0);
  const [customHeight, setCustomHeight] = useState<number>(specs.customTrimHeight || 9.0);
  const [isCustomTrim, setIsCustomTrim] = useState<boolean>(false);

  const calculated = calculateCoverDimensions({
    ...specs,
    customTrimWidth: isCustomTrim ? customWidth : undefined,
    customTrimHeight: isCustomTrim ? customHeight : undefined,
  });

  if (!isOpen) return null;

  const handleApply = () => {
    onApplySpecs({
      ...specs,
      customTrimWidth: isCustomTrim ? customWidth : undefined,
      customTrimHeight: isCustomTrim ? customHeight : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">Professional Print & KDP Cover Calculator</h3>
              <p className="text-xs text-neutral-400">Amazon KDP & IngramSpark exact spine, wrap, turn-in, and bleed engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
          {/* Controls Column */}
          <div className="md:col-span-5 space-y-4">
            {/* Cover Type */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Binding Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['ebook', 'paperback', 'hardcover'] as CoverType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSpecs((prev) => ({ ...prev, coverType: t }))}
                    className={`px-3 py-2 text-xs font-medium rounded-lg capitalize border transition-all ${
                      specs.coverType === t
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-semibold shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Trim Size */}
            {specs.coverType !== 'ebook' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-300">Trim Size</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomTrim(!isCustomTrim)}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    {isCustomTrim ? 'Standard Trims' : 'Custom Size'}
                  </button>
                </div>
                {!isCustomTrim ? (
                  <select
                    value={specs.trimSize}
                    onChange={(e) => setSpecs((prev) => ({ ...prev, trimSize: e.target.value as TrimSize }))}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    {Object.entries(TRIM_DIMENSIONS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-1">Width (in)</span>
                      <input
                        type="number"
                        step="0.125"
                        min="4"
                        max="12"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(parseFloat(e.target.value) || 6.0)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-1">Height (in)</span>
                      <input
                        type="number"
                        step="0.125"
                        min="5"
                        max="14"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(parseFloat(e.target.value) || 9.0)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-200"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Page Count */}
            {specs.coverType !== 'ebook' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-300">Page Count (Interior)</label>
                  <span className="text-xs font-mono font-semibold text-amber-400">{specs.pageCount} pages</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="828"
                  value={specs.pageCount}
                  onChange={(e) => setSpecs((prev) => ({ ...prev, pageCount: parseInt(e.target.value, 10) }))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                  <span>24 min</span>
                  <span>79 spine min</span>
                  <span>828 max</span>
                </div>
              </div>
            )}

            {/* Paper Type */}
            {specs.coverType !== 'ebook' && (
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Paper & Interior Color</label>
                <div className="space-y-1.5">
                  {Object.entries(PAPER_SPECS).map(([k, p]) => (
                    <label
                      key={k}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                        specs.paperType === k
                          ? 'bg-neutral-800 border-amber-500 text-white'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paperType"
                          value={k}
                          checked={specs.paperType === k}
                          onChange={() => setSpecs((prev) => ({ ...prev, paperType: k as PaperType }))}
                          className="accent-amber-500"
                        />
                        <span>{p.label}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">{(p.thicknessPerPage).toFixed(6)}" / pg</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Bleed Toggle */}
            {specs.coverType !== 'ebook' && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div>
                  <span className="text-xs font-medium text-neutral-200 block">Industry Bleed Allowance</span>
                  <span className="text-[10px] text-neutral-400">
                    {specs.coverType === 'hardcover' ? '0.562" wrap turn-in around boards' : 'Standard 0.125" (3.175 mm)'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={specs.hasBleed}
                  onChange={(e) => setSpecs((prev) => ({ ...prev, hasBleed: e.target.checked }))}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </div>
            )}
          </div>

          {/* Diagram and Calculations Column */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            {/* Visual Cover Blueprint Diagram */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col items-center">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
                Calculated Cover Geometry Blueprint
              </span>

              {/* Graphical Blueprint Box */}
              <div className="relative w-full max-w-md h-44 rounded-lg bg-neutral-900 border-2 border-red-500/60 flex items-stretch overflow-hidden shadow-inner">
                {/* Bleed line hint */}
                <div className="absolute inset-0 border border-dashed border-red-500/40 pointer-events-none" />

                {specs.coverType === 'ebook' ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-neutral-800/40 border border-blue-500/40 m-2 rounded">
                    <span className="text-xs font-semibold text-neutral-200">Front Ebook Cover</span>
                    <span className="text-[10px] text-neutral-400 font-mono mt-1">1600 x 2560 px (1:1.6)</span>
                  </div>
                ) : (
                  <>
                    {/* Back Cover */}
                    <div className="flex-1 flex flex-col justify-between p-2 bg-neutral-800/40 border-r border-neutral-700/60">
                      <span className="text-[10px] font-medium text-neutral-400">Back Cover</span>
                      <div className="self-end w-10 h-6 border border-neutral-600 bg-white/90 rounded-sm flex items-center justify-center text-[7px] font-mono text-black">
                        BARCODE
                      </div>
                    </div>

                    {/* Spine */}
                    <div className="w-12 bg-neutral-700/60 border-r border-neutral-700/60 flex flex-col items-center justify-center p-1 relative">
                      <span className="text-[8px] font-semibold text-amber-400 rotate-90 whitespace-nowrap">
                        {calculated.spineTextAllowed ? 'SPINE TEXT' : 'NO TEXT'}
                      </span>
                    </div>

                    {/* Front Cover */}
                    <div className="flex-1 flex flex-col justify-center items-center p-2 bg-neutral-800/40">
                      <span className="text-[10px] font-semibold text-neutral-200">Front Cover</span>
                      <span className="text-[8px] text-neutral-400 font-mono mt-0.5">
                        {calculated.trimWidthInches}" x {calculated.trimHeightInches}"
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[10px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60" /> Red: Outer Bleed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-neutral-700" /> Gray: Trim Boundary
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/40" /> Blue: 0.25" Safe Area
                </span>
              </div>
            </div>

            {/* Metric Readouts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Total Width</span>
                <span className="text-sm font-semibold font-mono text-white">{calculated.totalWidthInches}"</span>
                <span className="text-[10px] text-neutral-500 block font-mono">
                  {inchesToMm(calculated.totalWidthInches)} mm
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Total Height</span>
                <span className="text-sm font-semibold font-mono text-white">{calculated.totalHeightInches}"</span>
                <span className="text-[10px] text-neutral-500 block font-mono">
                  {inchesToMm(calculated.totalHeightInches)} mm
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Spine Width</span>
                <span className="text-sm font-semibold font-mono text-amber-400">{calculated.spineWidthInches}"</span>
                <span className="text-[10px] text-neutral-500 block font-mono">
                  {inchesToMm(calculated.spineWidthInches)} mm
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Canvas at 300 DPI</span>
                <span className="text-xs font-semibold font-mono text-white">
                  {calculated.canvasWidthPx} x {calculated.canvasHeightPx}
                </span>
                <span className="text-[10px] text-neutral-500 block font-mono">pixels</span>
              </div>
            </div>

            {/* Official KDP Disclaimer & Spine rule warning */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
              <div className="flex items-center gap-2 font-medium text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Production Disclaimer</span>
              </div>
              <p>
                Calculations strictly follow Amazon KDP and print-on-demand formulas. Before commercial publishing, verify
                dimensions against your printer’s official template proof. Spine text is{' '}
                {calculated.spineTextAllowed ? 'permitted (≥ 79 pages)' : 'NOT permitted (< 79 pages)'}.
              </p>
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-lg shadow-amber-500/20 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Apply Dimensions to Studio Canvas</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
