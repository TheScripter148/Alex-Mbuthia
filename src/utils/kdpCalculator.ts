import { CalculatedDimensions, CoverType, PaperType, PrintSpecs, TrimSize } from '../types';

export const TRIM_DIMENSIONS: Record<TrimSize, { width: number; height: number; label: string }> = {
  '5x8': { width: 5.0, height: 8.0, label: '5" x 8" (Pocket Fiction)' },
  '5.25x8': { width: 5.25, height: 8.0, label: '5.25" x 8" (Standard Digest)' },
  '5.5x8.5': { width: 5.5, height: 8.5, label: '5.5" x 8.5" (Trade Paperback)' },
  '6x9': { width: 6.0, height: 9.0, label: '6" x 9" (US Trade Standard - Most Popular)' },
  '7x10': { width: 7.0, height: 10.0, label: '7" x 10" (Textbook & Manual)' },
  '8x10': { width: 8.0, height: 10.0, label: '8" x 10" (Nonfiction / Children / Workbook)' },
  '8.5x11': { width: 8.5, height: 11.0, label: '8.5" x 11" (Letter / Large Manual / Workbook)' },
  '8.5x8.5': { width: 8.5, height: 8.5, label: '8.5" x 8.5" (Square Picture Book)' },
};

export const PAPER_SPECS: Record<PaperType, { thicknessPerPage: number; label: string; minPages: number; maxPages: number }> = {
  cream: {
    thicknessPerPage: 0.0025, // Page count / 400
    label: 'Black & White interior with Cream paper (50-60#)',
    minPages: 24,
    maxPages: 828,
  },
  white: {
    thicknessPerPage: 0.002252, // Page count / 444
    label: 'Black & White interior with White paper (50-60#)',
    minPages: 24,
    maxPages: 828,
  },
  standard_color: {
    thicknessPerPage: 0.002252,
    label: 'Standard Color interior with White paper (55#)',
    minPages: 72,
    maxPages: 600,
  },
  premium_color: {
    thicknessPerPage: 0.002347,
    label: 'Premium Color interior with White paper (70#)',
    minPages: 24,
    maxPages: 828,
  },
};

export const DPI = 300;

export function calculateCoverDimensions(specs: PrintSpecs): CalculatedDimensions {
  const trim = specs.customTrimWidth && specs.customTrimHeight
    ? { width: specs.customTrimWidth, height: specs.customTrimHeight }
    : TRIM_DIMENSIONS[specs.trimSize] || TRIM_DIMENSIONS['6x9'];

  const paper = PAPER_SPECS[specs.paperType] || PAPER_SPECS.cream;
  const pageCount = Math.max(24, Math.min(specs.pageCount || 100, paper.maxPages));
  
  if (specs.coverType === 'ebook') {
    // Ebook standard resolution: 1600 x 2560 (1:1.6 ratio)
    const ebookWidthPx = 1600;
    const ebookHeightPx = 2560;
    const widthInches = ebookWidthPx / DPI;
    const heightInches = ebookHeightPx / DPI;

    return {
      trimWidthInches: widthInches,
      trimHeightInches: heightInches,
      spineWidthInches: 0,
      totalWidthInches: widthInches,
      totalHeightInches: heightInches,
      bleedInches: 0,
      safeMarginInches: 0.25,
      spineTextAllowed: false,
      canvasWidthPx: ebookWidthPx,
      canvasHeightPx: ebookHeightPx,
      frontWidthPx: ebookWidthPx,
      backWidthPx: 0,
      spineWidthPx: 0,
      bleedPx: 0,
      safeMarginPx: Math.round(0.25 * DPI),
      backRegion: { x: 0, y: 0, width: 0, height: 0 },
      spineRegion: { x: 0, y: 0, width: 0, height: 0 },
      frontRegion: { x: 0, y: 0, width: ebookWidthPx, height: ebookHeightPx },
      barcodeArea: { x: 0, y: 0, width: 0, height: 0 },
      spineTextBounds: { x: 0, y: 0, width: 0, height: 0 },
    };
  }

  if (specs.coverType === 'paperback') {
    const bleedInches = specs.hasBleed ? 0.125 : 0;
    const safeMarginInches = 0.25;
    
    // Accurate KDP spine formula
    const spineWidthInches = Math.max(0.06, pageCount * paper.thicknessPerPage);
    const totalWidthInches = (bleedInches * 2) + trim.width + spineWidthInches + trim.width;
    const totalHeightInches = (bleedInches * 2) + trim.height;
    
    // KDP allows spine text only if page count >= 79 pages
    const spineTextAllowed = pageCount >= 79;

    const canvasWidthPx = Math.round(totalWidthInches * DPI);
    const canvasHeightPx = Math.round(totalHeightInches * DPI);
    const bleedPx = Math.round(bleedInches * DPI);
    const safeMarginPx = Math.round(safeMarginInches * DPI);
    const frontWidthPx = Math.round(trim.width * DPI);
    const backWidthPx = Math.round(trim.width * DPI);
    const spineWidthPx = Math.round(spineWidthInches * DPI);

    // Regions in pixels from left to right:
    // [ Bleed | Back Cover | Spine | Front Cover | Bleed ]
    const backX = bleedPx;
    const spineX = backX + backWidthPx;
    const frontX = spineX + spineWidthPx;

    // Barcode area: standard 2" x 1.2" (600 x 360 px) in lower right of Back Cover
    const barcodeWidthPx = Math.round(2.0 * DPI);
    const barcodeHeightPx = Math.round(1.2 * DPI);
    const barcodeX = spineX - barcodeWidthPx - safeMarginPx;
    const barcodeY = canvasHeightPx - bleedPx - safeMarginPx - barcodeHeightPx;

    const spineSafeMarginPx = Math.round(0.0625 * DPI); // 1/16" from spine folds
    const spineTextBounds = {
      x: spineX + spineSafeMarginPx,
      y: bleedPx + safeMarginPx,
      width: Math.max(0, spineWidthPx - (spineSafeMarginPx * 2)),
      height: Math.max(0, canvasHeightPx - ((bleedPx + safeMarginPx) * 2)),
    };

    return {
      trimWidthInches: trim.width,
      trimHeightInches: trim.height,
      spineWidthInches: Number(spineWidthInches.toFixed(4)),
      totalWidthInches: Number(totalWidthInches.toFixed(4)),
      totalHeightInches: Number(totalHeightInches.toFixed(4)),
      bleedInches,
      safeMarginInches,
      spineTextAllowed,
      canvasWidthPx,
      canvasHeightPx,
      frontWidthPx,
      backWidthPx,
      spineWidthPx,
      bleedPx,
      safeMarginPx,
      backRegion: { x: backX, y: bleedPx, width: backWidthPx, height: canvasHeightPx - (bleedPx * 2) },
      spineRegion: { x: spineX, y: bleedPx, width: spineWidthPx, height: canvasHeightPx - (bleedPx * 2) },
      frontRegion: { x: frontX, y: bleedPx, width: frontWidthPx, height: canvasHeightPx - (bleedPx * 2) },
      barcodeArea: { x: barcodeX, y: barcodeY, width: barcodeWidthPx, height: barcodeHeightPx },
      spineTextBounds,
    };
  }

  // Hardcover Case Laminate:
  // Case wrap turn-in around boards = 0.562" (14.3mm)
  // Hinge allowance = 0.394" (10mm) each side of spine
  // Board thickness & spine insert wrap addition = 0.060"
  const wrapTurnInInches = 0.562;
  const hingeInches = 0.394;
  const safeMarginInches = 0.25;
  const spineWidthInches = Math.max(0.25, (pageCount * paper.thicknessPerPage) + 0.060);
  
  const totalWidthInches = (wrapTurnInInches * 2) + (hingeInches * 2) + trim.width + spineWidthInches + trim.width;
  const totalHeightInches = (wrapTurnInInches * 2) + trim.height;
  const spineTextAllowed = pageCount >= 79;

  const canvasWidthPx = Math.round(totalWidthInches * DPI);
  const canvasHeightPx = Math.round(totalHeightInches * DPI);
  const wrapTurnInPx = Math.round(wrapTurnInInches * DPI);
  const hingePx = Math.round(hingeInches * DPI);
  const safeMarginPx = Math.round(safeMarginInches * DPI);
  const frontWidthPx = Math.round(trim.width * DPI);
  const backWidthPx = Math.round(trim.width * DPI);
  const spineWidthPx = Math.round(spineWidthInches * DPI);

  // Region layouts for Case Laminate:
  // [ Turn-in | Back Cover | Hinge | Spine | Hinge | Front Cover | Turn-in ]
  const backX = wrapTurnInPx;
  const spineX = backX + backWidthPx + hingePx;
  const frontX = spineX + spineWidthPx + hingePx;

  const barcodeWidthPx = Math.round(2.0 * DPI);
  const barcodeHeightPx = Math.round(1.2 * DPI);
  const barcodeX = (backX + backWidthPx) - barcodeWidthPx - safeMarginPx;
  const barcodeY = canvasHeightPx - wrapTurnInPx - safeMarginPx - barcodeHeightPx;

  const spineTextBounds = {
    x: spineX + Math.round(0.0625 * DPI),
    y: wrapTurnInPx + safeMarginPx,
    width: Math.max(0, spineWidthPx - Math.round(0.125 * DPI)),
    height: Math.max(0, canvasHeightPx - ((wrapTurnInPx + safeMarginPx) * 2)),
  };

  return {
    trimWidthInches: trim.width,
    trimHeightInches: trim.height,
    spineWidthInches: Number(spineWidthInches.toFixed(4)),
    totalWidthInches: Number(totalWidthInches.toFixed(4)),
    totalHeightInches: Number(totalHeightInches.toFixed(4)),
    bleedInches: wrapTurnInInches,
    safeMarginInches,
    spineTextAllowed,
    canvasWidthPx,
    canvasHeightPx,
    frontWidthPx,
    backWidthPx,
    spineWidthPx,
    bleedPx: wrapTurnInPx,
    safeMarginPx,
    backRegion: { x: backX, y: wrapTurnInPx, width: backWidthPx, height: canvasHeightPx - (wrapTurnInPx * 2) },
    spineRegion: { x: spineX, y: wrapTurnInPx, width: spineWidthPx, height: canvasHeightPx - (wrapTurnInPx * 2) },
    frontRegion: { x: frontX, y: wrapTurnInPx, width: frontWidthPx, height: canvasHeightPx - (wrapTurnInPx * 2) },
    barcodeArea: { x: barcodeX, y: barcodeY, width: barcodeWidthPx, height: barcodeHeightPx },
    spineTextBounds,
  };
}

export function inchesToMm(inches: number): number {
  return Number((inches * 25.4).toFixed(1));
}
