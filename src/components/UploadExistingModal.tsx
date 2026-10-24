import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Check, AlertTriangle, X, ScanText } from 'lucide-react';
import { CanvasLayer, CoverType, ImageLayer, ProjectState } from '../types';

interface UploadExistingModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onApplyUploadedImage: (params: {
    imageUrl: string;
    width: number;
    height: number;
    mode: 'fit' | 'fill' | 'original';
    isFullWrap: boolean;
    reconstructedLayers?: CanvasLayer[];
  }) => void;
}

export const UploadExistingModal: React.FC<UploadExistingModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplyUploadedImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState<{ width: number; height: number; aspectRatio: number } | null>(null);
  const [fitMode, setFitMode] = useState<'fit' | 'fill' | 'original'>('fit');
  const [isFullWrapDetected, setIsFullWrapDetected] = useState<boolean>(false);

  // OCR state
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    detected: boolean;
    title: string | null;
    subtitle: string | null;
    author: string | null;
    tagline: string | null;
    dominantColors: string[];
  } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        const ar = img.width / img.height;
        setImgDims({ width: img.width, height: img.height, aspectRatio: ar });
        // If width > height * 1.25, likely a full wrap with back, spine, front!
        setIsFullWrapDetected(ar > 1.25);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleOcrScan = async () => {
    if (!previewUrl) return;
    setIsScanningOcr(true);
    setOcrError(null);

    try {
      const res = await fetch('/api/ai/ocr-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: previewUrl,
          mimeType: selectedFile?.type || 'image/jpeg',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'OCR assistance unavailable');
      }

      setOcrResult(json.data);
    } catch (err: any) {
      setOcrError(err.message || 'Failed to detect text on cover image');
    } finally {
      setIsScanningOcr(false);
    }
  };

  const handleConfirmImport = () => {
    if (!previewUrl || !imgDims) return;

    // Build reconstructed text layers if OCR found anything
    const reconstructedLayers: CanvasLayer[] = [];

    if (ocrResult && ocrResult.title) {
      reconstructedLayers.push({
        id: `ocr-title-${Date.now()}`,
        type: 'text',
        name: 'Reconstructed Title',
        role: 'title',
        text: ocrResult.title,
        x: project.dimensions.canvasWidthPx * (isFullWrapDetected ? 0.72 : 0.5),
        y: project.dimensions.canvasHeightPx * 0.25,
        width: project.dimensions.canvasWidthPx * 0.4,
        fontFamily: 'Playfair Display',
        fontSize: 48,
        fontWeight: 700,
        letterSpacing: 2,
        lineHeight: 1.15,
        color: ocrResult.dominantColors?.[0] || '#FFFFFF',
        textAlign: 'center',
        opacity: 1,
        rotation: 0,
        effect: 'shadow',
        shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        locked: false,
        visible: true,
      });
    }

    if (ocrResult && ocrResult.author) {
      reconstructedLayers.push({
        id: `ocr-author-${Date.now()}`,
        type: 'text',
        name: 'Reconstructed Author',
        role: 'author',
        text: ocrResult.author,
        x: project.dimensions.canvasWidthPx * (isFullWrapDetected ? 0.72 : 0.5),
        y: project.dimensions.canvasHeightPx * 0.85,
        width: project.dimensions.canvasWidthPx * 0.4,
        fontFamily: 'Montserrat',
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: 3,
        lineHeight: 1.2,
        color: '#FFFFFF',
        textAlign: 'center',
        opacity: 1,
        rotation: 0,
        effect: 'shadow',
        locked: false,
        visible: true,
      });
    }

    onApplyUploadedImage({
      imageUrl: previewUrl,
      width: imgDims.width,
      height: imgDims.height,
      mode: fitMode,
      isFullWrap: isFullWrapDetected,
      reconstructedLayers: reconstructedLayers.length > 0 ? reconstructedLayers : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">Upload & Edit Existing Book Cover</h3>
              <p className="text-xs text-neutral-400">Preserves true aspect ratio with OCR-assisted text layer reconstruction</p>
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
          {/* File picker */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />

          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-2xl bg-neutral-950/50 hover:bg-neutral-950 cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-800 text-neutral-300">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold text-neutral-200 block">Click to select cover file</span>
                <span className="text-xs text-neutral-400 block mt-1">Supports JPG, PNG, and WebP high-res artwork</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview and Metadata */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <img
                  src={previewUrl}
                  alt="Uploaded Cover Preview"
                  className="w-32 h-44 object-contain rounded-lg bg-neutral-900 border border-neutral-800"
                />
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate max-w-[200px]">{selectedFile?.name}</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-amber-400 hover:underline text-[11px]"
                    >
                      Change File
                    </button>
                  </div>
                  {imgDims && (
                    <div className="grid grid-cols-2 gap-2 text-neutral-400 font-mono text-[11px]">
                      <div>
                        Resolution: <span className="text-neutral-200">{imgDims.width} x {imgDims.height} px</span>
                      </div>
                      <div>
                        Ratio: <span className="text-neutral-200">{imgDims.aspectRatio.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Wrap auto-detection banner */}
                  {isFullWrapDetected && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                      <span className="font-semibold block">Full Paperback Wrap Detected!</span>
                      <p className="text-amber-200/80">
                        Image aspect ratio indicates it contains Back Cover, Spine, and Front Cover. We will map it across the full wrap without distortion.
                      </p>
                    </div>
                  )}

                  {/* Fit Options */}
                  <div className="pt-2">
                    <span className="text-[11px] text-neutral-400 block mb-1.5 font-medium">Placement Mode:</span>
                    <div className="flex items-center gap-2">
                      {[
                        { id: 'fit', label: 'Fit to Canvas (No Crop)' },
                        { id: 'fill', label: 'Fill Canvas (Bleed)' },
                        { id: 'original', label: 'Preserve Original' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setFitMode(m.id as any)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                            fitMode === m.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* OCR Text Extraction Section */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanText className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-semibold text-neutral-200 block">OCR Text Layer Reconstruction</span>
                      <span className="text-[10px] text-neutral-400">Detect flattened text and recreate as editable canvas objects</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOcrScan}
                    disabled={isScanningOcr}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isScanningOcr ? 'Scanning...' : 'Detect Cover Text'}</span>
                  </button>
                </div>

                {ocrError && <span className="text-[11px] text-red-400 block">{ocrError}</span>}

                {ocrResult && (
                  <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2 text-xs">
                    <span className="text-[11px] font-semibold text-emerald-400 block">Detected Elements:</span>
                    <div className="grid grid-cols-2 gap-2 text-neutral-300">
                      <div>
                        Title: <span className="text-white font-medium">{ocrResult.title || 'None detected'}</span>
                      </div>
                      <div>
                        Author: <span className="text-white font-medium">{ocrResult.author || 'None detected'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-400 block">
                      These detected texts will be imported as crisp editable typography layers over the artwork.
                    </span>
                  </div>
                )}
              </div>
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
            onClick={handleConfirmImport}
            disabled={!previewUrl}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Cover Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
