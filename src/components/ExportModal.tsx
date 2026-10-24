import React, { useState } from 'react';
import { Download, FileText, Image as ImageIcon, Code, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { CalculatedDimensions, ProjectState } from '../types';
import { exportCoverImage, exportCoverToPdf, exportProjectFile } from '../utils/pdfExport';
import { runCoverQualityCheck } from '../utils/qualityChecker';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  canvas: HTMLCanvasElement | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  canvas,
}) => {
  const [format, setFormat] = useState<'pdf' | 'jpg' | 'png' | 'json'>('pdf');
  const [includeCropMarks, setIncludeCropMarks] = useState<boolean>(true);
  const [includeBleed, setIncludeBleed] = useState<boolean>(true);
  const [jpegQuality, setJpegQuality] = useState<number>(0.96);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const { dimensions, coverType, bookDetails } = project;
  const issues = runCoverQualityCheck(project);
  const hasErrors = issues.some((i) => i.type === 'error');

  const sanitizeFilename = (name: string) => {
    return (name || 'alexforge-book-cover')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');
  };

  const handleExport = async () => {
    if (!canvas) return;
    setIsExporting(true);
    const filename = sanitizeFilename(bookDetails.title);

    try {
      if (format === 'pdf') {
        await exportCoverToPdf(canvas, dimensions, {
          format: 'pdf',
          includeBleed,
          includeCropMarks,
          includeBarcodeArea: true,
          jpegQuality,
          targetDpi: 300,
        }, filename);
      } else if (format === 'jpg' || format === 'png') {
        exportCoverImage(canvas, format, jpegQuality, filename);
      } else if (format === 'json') {
        exportProjectFile(project, filename);
      }

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">Export Production Cover</h3>
              <p className="text-xs text-neutral-400">Commercial 300 DPI print-ready PDF, high-res images, and project backups</p>
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
        <div className="p-6 space-y-5">
          {/* Quality Warning if Errors Detected */}
          {hasErrors && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-xs text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>
                Pre-flight inspector detected unresolved issues. You may still export, but printers may flag margin or spine violations.
              </span>
            </div>
          )}

          {/* Format Selection Cards */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">Select Export Format</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'pdf', title: 'Print PDF', sub: '300 DPI Vector/Raster', icon: FileText },
                { id: 'jpg', title: 'High-Res JPG', sub: 'Publishing / Web', icon: ImageIcon },
                { id: 'png', title: 'Crisp PNG', sub: 'Lossless Artwork', icon: ImageIcon },
                { id: 'json', title: 'Project File', sub: '.afcover Backup', icon: Code },
              ].map((f) => {
                const Icon = f.icon;
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id as any)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-md'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                    <span className={`text-xs font-semibold block ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                      {f.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">{f.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format-Specific Options */}
          {format === 'pdf' && (
            <div className="space-y-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-xs font-semibold text-neutral-200 block">Print PDF Configuration</span>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCropMarks}
                    onChange={(e) => setIncludeCropMarks(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Include Printer Crop Marks</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBleed}
                    onChange={(e) => setIncludeBleed(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Include Bleed Boundaries</span>
                </label>
              </div>

              <div className="pt-2 text-[11px] text-neutral-400 flex items-center justify-between border-t border-neutral-800/80">
                <span>Output Document Size:</span>
                <span className="font-mono text-neutral-200 font-semibold">
                  {dimensions.totalWidthInches}" x {dimensions.totalHeightInches}" ({dimensions.canvasWidthPx} x {dimensions.canvasHeightPx} px)
                </span>
              </div>
            </div>
          )}

          {(format === 'jpg' || format === 'pdf') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span>Compression Quality</span>
                <span className="font-mono text-amber-400">{Math.round(jpegQuality * 100)}% (Maximum Fidelity)</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.0"
                step="0.02"
                value={jpegQuality}
                onChange={(e) => setJpegQuality(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          )}

          {exportSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Export generated and download initiated successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating Document...' : `Download ${format.toUpperCase()}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
