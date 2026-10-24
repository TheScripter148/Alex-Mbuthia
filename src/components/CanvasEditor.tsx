import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move, RotateCw, Copy, Trash2, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { CalculatedDimensions, CanvasLayer, CoverType, ImageLayer, ShapeLayer, TextLayer } from '../types';

interface CanvasEditorProps {
  dimensions: CalculatedDimensions;
  coverType: CoverType;
  backgroundColor: string;
  backgroundGradient?: string;
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  guidesVisible: boolean;
  bleedVisible: boolean;
  safeAreaVisible: boolean;
  barcodeVisible: boolean;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<CanvasLayer>) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  canvasRefCallback: (canvas: HTMLCanvasElement | null) => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  dimensions,
  coverType,
  backgroundColor,
  backgroundGradient,
  layers,
  selectedLayerId,
  guidesVisible,
  bleedVisible,
  safeAreaVisible,
  barcodeVisible,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  canvasRefCallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(0.35);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeSnapLines, setActiveSnapLines] = useState<Array<{ type: 'x' | 'y'; pos: number }>>([]);

  // Image cache
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Notify parent of canvas element for exports
  useEffect(() => {
    if (canvasRef.current) {
      canvasRefCallback(canvasRef.current);
    }
  }, [canvasRef.current]);

  // Auto-fit zoom on mount or dimension change
  useEffect(() => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 40;
    const containerH = containerRef.current.clientHeight - 40;
    const scaleX = containerW / dimensions.canvasWidthPx;
    const scaleY = containerH / dimensions.canvasHeightPx;
    const initialZoom = Math.max(0.15, Math.min(scaleX, scaleY, 0.65));
    setZoom(initialZoom);
  }, [dimensions.canvasWidthPx, dimensions.canvasHeightPx]);

  // Preload images into cache
  useEffect(() => {
    layers.forEach((layer) => {
      if (layer.type === 'image' && layer.src && !imageCacheRef.current.has(layer.src)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageCacheRef.current.set(layer.src, img);
          drawCanvas();
        };
        img.src = layer.src;
      }
    });
  }, [layers]);

  // Main Drawing Function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = dimensions.canvasWidthPx;
    const height = dimensions.canvasHeightPx;

    // 1. Draw Background Color / Gradient
    if (backgroundGradient && backgroundGradient.includes('gradient')) {
      // Create radial or linear gradient approximation
      if (backgroundGradient.includes('radial')) {
        const radGrad = ctx.createRadialGradient(width * 0.5, height * 0.35, 20, width * 0.5, height * 0.5, width * 0.8);
        radGrad.addColorStop(0, '#22304d');
        radGrad.addColorStop(1, backgroundColor || '#0A0E1A');
        ctx.fillStyle = radGrad;
      } else {
        const linGrad = ctx.createLinearGradient(0, 0, 0, height);
        linGrad.addColorStop(0, '#1a1a24');
        linGrad.addColorStop(0.5, backgroundColor || '#0A0E1A');
        linGrad.addColorStop(1, '#05070c');
        ctx.fillStyle = linGrad;
      }
    } else {
      ctx.fillStyle = backgroundColor || '#0B0F19';
    }
    ctx.fillRect(0, 0, width, height);

    // 2. Render Layers from bottom to top
    layers.forEach((layer) => {
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;

      if (layer.type === 'image') {
        renderImageLayer(ctx, layer);
      } else if (layer.type === 'shape') {
        renderShapeLayer(ctx, layer);
      } else if (layer.type === 'text') {
        renderTextLayer(ctx, layer);
      }

      ctx.restore();
    });

    // 3. Render Bleed, Trim & Safe Margin Guides if enabled
    if (guidesVisible) {
      renderPrintGuides(ctx);
    }

    // 4. Render Active Snap Lines
    if (activeSnapLines.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      activeSnapLines.forEach((line) => {
        ctx.beginPath();
        if (line.type === 'x') {
          ctx.moveTo(line.pos, 0);
          ctx.lineTo(line.pos, height);
        } else {
          ctx.moveTo(0, line.pos);
          ctx.lineTo(width, line.pos);
        }
        ctx.stroke();
      });
      ctx.restore();
    }

    // 5. Render Selection Box for Selected Element
    if (selectedLayerId) {
      const selected = layers.find((l) => l.id === selectedLayerId);
      if (selected && selected.visible) {
        renderSelectionHandles(ctx, selected);
      }
    }
  }, [
    dimensions,
    layers,
    selectedLayerId,
    backgroundColor,
    backgroundGradient,
    guidesVisible,
    bleedVisible,
    safeAreaVisible,
    barcodeVisible,
    activeSnapLines,
  ]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Layer Renderers
  const renderImageLayer = (ctx: CanvasRenderingContext2D, layer: ImageLayer) => {
    const cachedImg = imageCacheRef.current.get(layer.src);
    if (!cachedImg || !cachedImg.complete) return;

    ctx.save();
    ctx.translate(layer.x + (layer.width / 2), layer.y + (layer.height / 2));
    if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(layer.scaleX || 1, layer.scaleY || 1);

    // CSS Filters applied to canvas
    const filters: string[] = [];
    if (layer.brightness) filters.push(`brightness(${100 + layer.brightness}%)`);
    if (layer.contrast) filters.push(`contrast(${100 + layer.contrast}%)`);
    if (layer.saturation) filters.push(`saturate(${100 + layer.saturation}%)`);
    if (layer.hue) filters.push(`hue-rotate(${layer.hue}deg)`);
    if (layer.blur) filters.push(`blur(${layer.blur}px)`);
    if (layer.sepia) filters.push(`sepia(${layer.sepia}%)`);
    if (layer.grayscale) filters.push(`grayscale(${layer.grayscale}%)`);
    if (filters.length > 0) ctx.filter = filters.join(' ');

    ctx.drawImage(cachedImg, -layer.width / 2, -layer.height / 2, layer.width, layer.height);

    // Vignette effect over image
    if (layer.vignette && layer.vignette > 0) {
      const rad = ctx.createRadialGradient(0, 0, layer.width * 0.25, 0, 0, layer.width * 0.65);
      rad.addColorStop(0, 'rgba(0,0,0,0)');
      rad.addColorStop(1, `rgba(0,0,0,${layer.vignette / 100})`);
      ctx.fillStyle = rad;
      ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
    }

    ctx.restore();
  };

  const renderShapeLayer = (ctx: CanvasRenderingContext2D, layer: ShapeLayer) => {
    ctx.save();
    ctx.translate(layer.x, layer.y);
    if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);

    if (layer.shapeType === 'border_frame') {
      ctx.strokeStyle = layer.stroke || '#D4AF37';
      ctx.lineWidth = layer.strokeWidth || 2;
      ctx.strokeRect(0, 0, layer.width, layer.height);

      // Inner subtle hairline
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, layer.width - 16, layer.height - 16);
    } else if (layer.shapeType === 'barcode_box') {
      if (barcodeVisible) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, layer.width, layer.height);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, layer.width, layer.height);

        // Barcode lines pattern placeholder
        ctx.fillStyle = '#0F172A';
        for (let i = 24; i < layer.width - 24; i += 6) {
          const w = (i % 12 === 0) ? 3 : 1.5;
          ctx.fillRect(i, 20, w, layer.height - 50);
        }
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('978-1-23456-789-0', layer.width / 2, layer.height - 14);
      }
    } else if (layer.shapeType === 'gradient_overlay') {
      const grad = ctx.createLinearGradient(0, 0, 0, layer.height);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, layer.width, layer.height);
    } else {
      ctx.fillStyle = layer.fill || 'transparent';
      ctx.fillRect(0, 0, layer.width, layer.height);
      if (layer.strokeWidth > 0) {
        ctx.strokeStyle = layer.stroke;
        ctx.lineWidth = layer.strokeWidth;
        ctx.strokeRect(0, 0, layer.width, layer.height);
      }
    }

    ctx.restore();
  };

  const renderTextLayer = (ctx: CanvasRenderingContext2D, layer: TextLayer) => {
    ctx.save();
    ctx.translate(layer.x, layer.y);
    if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);

    const fontStyle = layer.fontStyle || 'normal';
    const fontWeight = layer.fontWeight || 600;
    const fontFamily = layer.fontFamily || 'Playfair Display';
    const fontSize = layer.fontSize || 36;
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", serif, sans-serif`;
    ctx.textAlign = (layer.textAlign === 'justify' ? 'left' : layer.textAlign) || 'center';
    ctx.textBaseline = 'middle';

    // Text transforms
    let displayText = layer.text;
    if (layer.textTransform === 'uppercase') displayText = displayText.toUpperCase();
    else if (layer.textTransform === 'lowercase') displayText = displayText.toLowerCase();

    // Letter Spacing (Character Spacing)
    if (layer.letterSpacing !== undefined && 'letterSpacing' in ctx) {
      (ctx as any).letterSpacing = `${layer.letterSpacing}px`;
    }

    // Shadow & Effects Configuration
    const hasExplicitShadow =
      (layer.shadowBlur !== undefined && layer.shadowBlur > 0) ||
      (layer.shadowOffsetX !== undefined && layer.shadowOffsetX !== 0) ||
      (layer.shadowOffsetY !== undefined && layer.shadowOffsetY !== 0) ||
      layer.effect === 'shadow' ||
      layer.effect === 'glow';

    if (layer.effect === 'gold_foil') {
      const goldGrad = ctx.createLinearGradient(-150, -fontSize, 150, fontSize);
      goldGrad.addColorStop(0, '#BF953F');
      goldGrad.addColorStop(0.25, '#FCF6BA');
      goldGrad.addColorStop(0.5, '#B38728');
      goldGrad.addColorStop(0.75, '#FBF5B7');
      goldGrad.addColorStop(1, '#AA771C');
      ctx.fillStyle = goldGrad;
      ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = layer.shadowBlur !== undefined ? layer.shadowBlur : 10;
      ctx.shadowOffsetX = layer.shadowOffsetX !== undefined ? layer.shadowOffsetX : 2;
      ctx.shadowOffsetY = layer.shadowOffsetY !== undefined ? layer.shadowOffsetY : 3;
    } else if (layer.effect === 'silver_foil') {
      const silverGrad = ctx.createLinearGradient(-150, -fontSize, 150, fontSize);
      silverGrad.addColorStop(0, '#E0E0E0');
      silverGrad.addColorStop(0.4, '#FFFFFF');
      silverGrad.addColorStop(0.7, '#A0A0A0');
      silverGrad.addColorStop(1, '#D0D0D0');
      ctx.fillStyle = silverGrad;
      ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = layer.shadowBlur !== undefined ? layer.shadowBlur : 8;
      ctx.shadowOffsetX = layer.shadowOffsetX !== undefined ? layer.shadowOffsetX : 2;
      ctx.shadowOffsetY = layer.shadowOffsetY !== undefined ? layer.shadowOffsetY : 3;
    } else if (layer.effect === 'glow') {
      ctx.fillStyle = layer.color;
      ctx.shadowColor = layer.shadowColor || layer.color;
      ctx.shadowBlur = layer.shadowBlur !== undefined ? layer.shadowBlur : 18;
      ctx.shadowOffsetX = layer.shadowOffsetX !== undefined ? layer.shadowOffsetX : 0;
      ctx.shadowOffsetY = layer.shadowOffsetY !== undefined ? layer.shadowOffsetY : 0;
    } else {
      ctx.fillStyle = layer.color;
      if (hasExplicitShadow) {
        ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = layer.shadowBlur !== undefined ? layer.shadowBlur : 12;
        ctx.shadowOffsetX = layer.shadowOffsetX !== undefined ? layer.shadowOffsetX : 2;
        ctx.shadowOffsetY = layer.shadowOffsetY !== undefined ? layer.shadowOffsetY : 3;
      }
    }

    // Stroke / Outline Configuration
    const hasStroke =
      (layer.strokeWidth !== undefined && layer.strokeWidth > 0) ||
      layer.effect === 'outline';
    if (hasStroke) {
      ctx.strokeStyle = layer.strokeColor || '#000000';
      ctx.lineWidth = layer.strokeWidth !== undefined ? layer.strokeWidth : 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }

    // Word wrapping for long text (e.g. blurb)
    const maxWidth = layer.width || 600;
    const words = displayText.split(' ');
    let line = '';
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    const lineHeightPx = fontSize * (layer.lineHeight || 1.25);
    const totalBlockHeight = lines.length * lineHeightPx;
    const startY = -(totalBlockHeight / 2) + (lineHeightPx / 2);

    lines.forEach((l, idx) => {
      const yPos = startY + (idx * lineHeightPx);
      if (hasStroke) {
        ctx.strokeText(l, 0, yPos);
      }
      ctx.fillText(l, 0, yPos);
    });

    ctx.restore();
  };

  const renderPrintGuides = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    const width = dimensions.canvasWidthPx;
    const height = dimensions.canvasHeightPx;
    const bleed = dimensions.bleedPx;
    const safe = dimensions.safeMarginPx;

    // Red Bleed Line (Outer perimeter)
    if (bleedVisible && bleed > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(bleed, bleed, width - (bleed * 2), height - (bleed * 2));
    }

    // Blue Safe Margin Lines
    if (safeAreaVisible) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      // If Wrap: Draw separate safe boxes for Back, Spine, and Front
      if (coverType === 'paperback' || coverType === 'hardcover') {
        // Back Safe
        ctx.strokeRect(
          dimensions.backRegion.x + safe,
          dimensions.backRegion.y + safe,
          dimensions.backRegion.width - (safe * 2),
          dimensions.backRegion.height - (safe * 2)
        );

        // Front Safe
        ctx.strokeRect(
          dimensions.frontRegion.x + safe,
          dimensions.frontRegion.y + safe,
          dimensions.frontRegion.width - (safe * 2),
          dimensions.frontRegion.height - (safe * 2)
        );

        // Spine Boundary Lines (Gray solid lines)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(dimensions.spineRegion.x, 0);
        ctx.lineTo(dimensions.spineRegion.x, height);
        ctx.moveTo(dimensions.spineRegion.x + dimensions.spineRegion.width, 0);
        ctx.lineTo(dimensions.spineRegion.x + dimensions.spineRegion.width, height);
        ctx.stroke();
      } else {
        // Ebook single safe box
        ctx.strokeRect(safe, safe, width - (safe * 2), height - (safe * 2));
      }
    }

    ctx.restore();
  };

  const renderSelectionHandles = (ctx: CanvasRenderingContext2D, layer: CanvasLayer) => {
    ctx.save();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    const w = layer.width || 300;
    const h = layer.height || (layer.type === 'text' ? (layer.fontSize * 1.5) : 100);
    const isCenterAligned = layer.type === 'text' && layer.textAlign === 'center';
    const boxX = isCenterAligned ? layer.x - (w / 2) : layer.x;
    const boxY = layer.y - (h / 2);

    ctx.strokeRect(boxX - 6, boxY - 6, w + 12, h + 12);

    // Corner handle pills
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    const handleSize = 8;
    const corners = [
      { x: boxX - 6, y: boxY - 6 },
      { x: boxX + w + 6, y: boxY - 6 },
      { x: boxX - 6, y: boxY + h + 6 },
      { x: boxX + w + 6, y: boxY + h + 6 },
    ];
    corners.forEach((c) => {
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    });

    ctx.restore();
  };

  // Mouse / Pointer Interaction handlers for Dragging & Snapping
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) / zoom;
    const canvasY = (e.clientY - rect.top) / zoom;

    // Hit test from top layer to bottom
    let hitLayer: CanvasLayer | null = null;
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (!l.visible || l.locked) continue;

      const w = l.width || 300;
      const h = l.height || (l.type === 'text' ? l.fontSize * 1.5 : 100);
      const isCenter = l.type === 'text' && l.textAlign === 'center';
      const minX = isCenter ? l.x - (w / 2) : l.x;
      const maxX = isCenter ? l.x + (w / 2) : l.x + w;
      const minY = l.y - (h / 2);
      const maxY = l.y + (h / 2);

      if (canvasX >= minX && canvasX <= maxX && canvasY >= minY && canvasY <= maxY) {
        hitLayer = l;
        break;
      }
    }

    if (hitLayer) {
      onSelectLayer(hitLayer.id);
      setIsDragging(true);
      setDragStart({ x: canvasX, y: canvasY });
      setElementStartPos({ x: hitLayer.x, y: hitLayer.y });
    } else {
      onSelectLayer(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedLayerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) / zoom;
    const canvasY = (e.clientY - rect.top) / zoom;

    const deltaX = canvasX - dragStart.x;
    const deltaY = canvasY - dragStart.y;

    let targetX = elementStartPos.x + deltaX;
    let targetY = elementStartPos.y + deltaY;

    // Smart Snapping Guides
    const snapThreshold = 14;
    const snapLines: Array<{ type: 'x' | 'y'; pos: number }> = [];

    // Snap to Front Cover Center
    const frontCenterX = dimensions.frontRegion.x + (dimensions.frontRegion.width / 2);
    if (Math.abs(targetX - frontCenterX) < snapThreshold) {
      targetX = frontCenterX;
      snapLines.push({ type: 'x', pos: frontCenterX });
    }

    // Snap to Spine Center
    if (coverType !== 'ebook') {
      const spineCenterX = dimensions.spineRegion.x + (dimensions.spineRegion.width / 2);
      if (Math.abs(targetX - spineCenterX) < snapThreshold) {
        targetX = spineCenterX;
        snapLines.push({ type: 'x', pos: spineCenterX });
      }

      const backCenterX = dimensions.backRegion.x + (dimensions.backRegion.width / 2);
      if (Math.abs(targetX - backCenterX) < snapThreshold) {
        targetX = backCenterX;
        snapLines.push({ type: 'x', pos: backCenterX });
      }
    }

    // Snap to Vertical Canvas Center
    const centerY = dimensions.canvasHeightPx / 2;
    if (Math.abs(targetY - centerY) < snapThreshold) {
      targetY = centerY;
      snapLines.push({ type: 'y', pos: centerY });
    }

    setActiveSnapLines(snapLines);
    onUpdateLayer(selectedLayerId, { x: Math.round(targetX), y: Math.round(targetY) });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setActiveSnapLines([]);
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full bg-neutral-950 flex flex-col items-center justify-center overflow-hidden p-6 select-none"
    >
      {/* Floating Canvas Top Toolbar (Zoom & Quick Transform) */}
      <div className="absolute top-4 z-20 flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl px-3 py-1.5 shadow-xl">
        <button
          onClick={() => setZoom((z) => Math.max(0.1, z - 0.05))}
          title="Zoom Out"
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-neutral-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(1.5, z + 0.05))}
          title="Zoom In"
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-neutral-800 mx-1" />

        {/* Selected Layer Quick Controls */}
        {selectedLayer && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-amber-400 truncate max-w-[120px] px-1">
              {selectedLayer.name}
            </span>
            <button
              onClick={() => onDuplicateLayer(selectedLayer.id)}
              title="Duplicate Layer"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateLayer(selectedLayer.id, { locked: !selectedLayer.locked })}
              title={selectedLayer.locked ? 'Unlock' : 'Lock'}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              {selectedLayer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onDeleteLayer(selectedLayer.id)}
              title="Delete Layer"
              className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-neutral-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive HTML5 Canvas */}
      <div
        className="flex items-center justify-center shadow-2xl transition-transform duration-75"
        style={{
          width: dimensions.canvasWidthPx * zoom,
          height: dimensions.canvasHeightPx * zoom,
        }}
      >
        <canvas
          ref={canvasRef}
          width={dimensions.canvasWidthPx}
          height={dimensions.canvasHeightPx}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full cursor-crosshair rounded-sm shadow-2xl"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Bottom status badge */}
      <div className="absolute bottom-4 left-6 z-10 flex items-center gap-3 text-[11px] text-neutral-400 bg-neutral-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-neutral-800 font-mono">
        <span>
          {dimensions.totalWidthInches}" x {dimensions.totalHeightInches}"
        </span>
        <span>·</span>
        <span>
          {dimensions.canvasWidthPx} x {dimensions.canvasHeightPx} px @ 300 DPI
        </span>
        {coverType !== 'ebook' && (
          <>
            <span>·</span>
            <span>Spine: {dimensions.spineWidthInches}"</span>
          </>
        )}
      </div>
    </div>
  );
};
