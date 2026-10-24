import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { ProjectState, QualityIssue } from '../types';
import { runCoverQualityCheck } from '../utils/qualityChecker';

interface QualityCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onSelectLayer: (layerId: string) => void;
}

export const QualityCheckerModal: React.FC<QualityCheckerModalProps> = ({
  isOpen,
  onClose,
  project,
  onSelectLayer,
}) => {
  if (!isOpen) return null;

  const issues = runCoverQualityCheck(project);

  const errors = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');
  const readyItems = issues.filter((i) => i.type === 'ready');

  const overallStatus =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ready';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                overallStatus === 'ready'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : overallStatus === 'warning'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">Cover Quality & Pre-Flight Inspector</h3>
              <p className="text-xs text-neutral-400">Automated print-safety, margin, barcode, and typography analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Banner */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {overallStatus === 'ready' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : overallStatus === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <span className="text-sm font-semibold text-white">
                {overallStatus === 'ready'
                  ? 'Ready for Publication Export'
                  : overallStatus === 'warning'
                  ? `${warnings.length} Advisory Warnings Detected`
                  : `${errors.length} Critical Issues Must Be Resolved`}
              </span>
              <p className="text-xs text-neutral-400">
                {overallStatus === 'ready'
                  ? 'Margins, bleed specifications, spine allowances, and text areas pass inspection.'
                  : 'Resolve critical errors below to avoid rejection by Amazon KDP or print-on-demand services.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300">{errors.length} Errors</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">{warnings.length} Warnings</span>
          </div>
        </div>

        {/* Issues List */}
        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {/* Critical Errors */}
          {errors.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider block">
                Critical Blockers (Must Fix)
              </span>
              {errors.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-red-200 block">{item.title}</span>
                    <p className="text-xs text-neutral-300 leading-relaxed">{item.message}</p>
                    {item.suggestedAction && (
                      <span className="text-[11px] text-red-400/90 font-medium block">
                        Action: {item.suggestedAction}
                      </span>
                    )}
                  </div>
                  {item.targetLayerId && (
                    <button
                      onClick={() => {
                        onSelectLayer(item.targetLayerId!);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-red-200 bg-red-500/20 hover:bg-red-500/30 rounded-md transition-colors shrink-0 flex items-center gap-1"
                    >
                      <span>Fix</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                Advisory Warnings (Recommended)
              </span>
              {warnings.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-amber-200 block">{item.title}</span>
                    <p className="text-xs text-neutral-300 leading-relaxed">{item.message}</p>
                    {item.suggestedAction && (
                      <span className="text-[11px] text-amber-400/90 font-medium block">
                        Action: {item.suggestedAction}
                      </span>
                    )}
                  </div>
                  {item.targetLayerId && (
                    <button
                      onClick={() => {
                        onSelectLayer(item.targetLayerId!);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 rounded-md transition-colors shrink-0 flex items-center gap-1"
                    >
                      <span>Locate</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ready Confirmations */}
          {readyItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1"
            >
              <span className="text-xs font-semibold text-emerald-200 block">{item.title}</span>
              <p className="text-xs text-neutral-300 leading-relaxed">{item.message}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <span className="text-[11px] text-neutral-500">
            Automated check performs heuristic validation. Always test with proof copies before volume printing.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
