import { CalculatedDimensions, CoverType, TextLayer } from '../types';

/**
 * Calculates the optimal font size using binary search and Canvas 2D measureText
 * to ensure the text stays completely within the target bounding box.
 */
export function calculateFitFontSize(
  text: string,
  fontFamily: string,
  fontWeight: number | string,
  maxWidth: number,
  maxHeight: number,
  fallbackSize = 48,
  minFontSize = 18,
  maxFontSize = 130
): number {
  if (!text || text.trim().length === 0) return fallbackSize;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return fallbackSize;

  let low = minFontSize;
  let high = maxFontSize;
  let optimalSize = minFontSize;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    ctx.font = `${fontWeight || 600} ${mid}px "${fontFamily}", serif, sans-serif`;

    const words = text.split(/\s+/);
    let currentLine = '';
    const lines: string[] = [];
    let maxLineWidth = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
      maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
    }

    const totalBlockHeight = lines.length * (mid * 1.25);
    const fitsWidth = maxLineWidth <= maxWidth;
    const fitsHeight = totalBlockHeight <= maxHeight;

    if (fitsWidth && fitsHeight) {
      optimalSize = mid;
      low = mid + 1; // Try slightly larger size
    } else {
      high = mid - 1; // Too large, decrease font size
    }
  }

  return optimalSize;
}

/**
 * Calculates target bounding box for Title or Subtitle on the front cover.
 */
export function getFrontCoverTextBounds(dimensions: CalculatedDimensions, coverType: CoverType, role: 'title' | 'subtitle') {
  const isWrap = coverType === 'paperback' || coverType === 'hardcover';
  const frontW = isWrap ? dimensions.frontRegion.width : dimensions.canvasWidthPx;
  const frontH = isWrap ? dimensions.frontRegion.height : dimensions.canvasHeightPx;
  const safeMargin = dimensions.safeMarginPx;

  // Maximum allowed text width: Front cover width minus 2x safe margins with a 5% breathing buffer
  const maxWidth = Math.max(200, frontW - (safeMargin * 2) - (frontW * 0.05));

  // Height budget: Title gets up to ~32% of front cover height, Subtitle gets ~16%
  const maxHeight = role === 'title' ? frontH * 0.32 : frontH * 0.16;

  return { maxWidth, maxHeight };
}
