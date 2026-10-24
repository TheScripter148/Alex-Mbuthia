import { CalculatedDimensions, CanvasLayer, CoverType, ProjectState, QualityIssue, TextLayer } from '../types';

export function runCoverQualityCheck(project: ProjectState): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { dimensions, coverType, layers, bookDetails, printSpecs } = project;

  // 1. Missing Required Book Details
  if (!bookDetails.title || bookDetails.title.trim().length === 0) {
    issues.push({
      id: 'missing-title',
      type: 'error',
      category: 'typography',
      title: 'Book Title is Missing',
      message: 'A book cover requires a clear title before publication.',
      suggestedAction: 'Enter a book title in Book Details',
    });
  }

  if (!bookDetails.authorName || bookDetails.authorName.trim().length === 0) {
    issues.push({
      id: 'missing-author',
      type: 'warning',
      category: 'typography',
      title: 'Author Name is Missing',
      message: 'Most commercial books require an author name or pen name on the cover.',
      suggestedAction: 'Enter author name in Book Details',
    });
  }

  // 2. Spine Text Checks for Paperback / Hardcover
  if (coverType === 'paperback' || coverType === 'hardcover') {
    const spineLayers = layers.filter((l) => 'role' in l && (l.role === 'spine_title' || l.role === 'spine_author'));
    
    if (printSpecs.pageCount < 79 && spineLayers.length > 0) {
      issues.push({
        id: 'spine-too-thin',
        type: 'error',
        category: 'spine',
        title: 'Spine Text Prohibited for Thin Books',
        message: `Amazon KDP requires books to have at least 79 pages for spine text (current: ${printSpecs.pageCount} pages). Thin spines cannot reliably fit text without binding clipping.`,
        suggestedAction: 'Remove spine text or increase page count',
      });
    }

    if (dimensions.spineWidthInches < 0.2 && spineLayers.length > 0) {
      issues.push({
        id: 'spine-narrow-warning',
        type: 'warning',
        category: 'spine',
        title: 'Very Narrow Spine Margin',
        message: `Spine width is ${dimensions.spineWidthInches}" (${(dimensions.spineWidthInches * 25.4).toFixed(1)} mm). Mechanical variance during print trimming may shift spine text.`,
        suggestedAction: 'Keep spine text font size under 14pt',
      });
    }
  }

  // 3. Bleed and Safety Margin Checks
  const bleedX = dimensions.bleedPx;
  const bleedY = dimensions.bleedPx;
  const safeMargin = dimensions.safeMarginPx;
  const canvasW = dimensions.canvasWidthPx;
  const canvasH = dimensions.canvasHeightPx;

  // Effective safe area
  const safeMinX = bleedX + safeMargin;
  const safeMaxX = canvasW - bleedX - safeMargin;
  const safeMinY = bleedY + safeMargin;
  const safeMaxY = canvasH - bleedY - safeMargin;

  // Inspect each text layer
  const textLayers = layers.filter((l): l is TextLayer => l.type === 'text' && l.visible);
  
  for (const layer of textLayers) {
    // Check if title or author is too small
    if (layer.role === 'title' && layer.fontSize < 24) {
      issues.push({
        id: `title-size-${layer.id}`,
        type: 'warning',
        category: 'typography',
        title: 'Title May Be Too Small for Thumbnails',
        message: `The title font size (${layer.fontSize}px) may lose readability at Amazon/e-commerce catalog thumbnail sizes.`,
        suggestedAction: 'Increase title font size',
        targetLayerId: layer.id,
      });
    }

    if (layer.role === 'blurb' && layer.fontSize < 10) {
      issues.push({
        id: `blurb-too-small-${layer.id}`,
        type: 'error',
        category: 'blurb',
        title: 'Back Cover Blurb Font Size Below 10px',
        message: 'Back cover blurb text below 8-10pt will be difficult to read in physical print.',
        suggestedAction: 'Increase blurb font size or shorten blurb copy',
        targetLayerId: layer.id,
      });
    }

    // Safety margin breach check
    if (layer.role !== 'spine_title' && layer.role !== 'spine_author') {
      const halfWidth = (layer.width || 200) / 2;
      const leftEdge = layer.textAlign === 'center' ? layer.x - halfWidth : layer.x;
      const rightEdge = layer.textAlign === 'center' ? layer.x + halfWidth : layer.x + (layer.width || 200);

      if (leftEdge < safeMinX || rightEdge > safeMaxX || layer.y < safeMinY || layer.y > safeMaxY) {
        issues.push({
          id: `margin-breach-${layer.id}`,
          type: 'warning',
          category: 'safety',
          title: `"${layer.name}" Extends Near Trim/Bleed Edge`,
          message: `Text is positioned close to the physical paper trim line. Keep text at least 0.25" (6.35 mm) inside trim edges to prevent accidental cutter trimming.`,
          suggestedAction: 'Move element inward away from edges',
          targetLayerId: layer.id,
        });
      }
    }
  }

  // 4. Barcode Reservation Area Conflict
  if (coverType === 'paperback' || coverType === 'hardcover') {
    const barcode = dimensions.barcodeArea;
    for (const layer of textLayers) {
      if (layer.role !== 'blurb' && layer.role !== 'bio') continue;
      // Check collision with barcode rectangle
      const layerBottom = layer.y + (layer.height || 100);
      const layerRight = layer.x + ((layer.width || 200) / 2);
      
      const overlapsX = layer.x < (barcode.x + barcode.width) && layerRight > barcode.x;
      const overlapsY = layer.y < (barcode.y + barcode.height) && layerBottom > barcode.y;

      if (overlapsX && overlapsY) {
        issues.push({
          id: `barcode-collision-${layer.id}`,
          type: 'error',
          category: 'barcode',
          title: `"${layer.name}" Overlaps Barcode Area`,
          message: 'Amazon KDP will stamp a machine-readable barcode in the designated area. Any text placed here will be covered or rejected by the printer.',
          suggestedAction: 'Reposition back cover text above the barcode',
          targetLayerId: layer.id,
        });
      }
    }
  }

  // 5. Font Diversity Check (Anti-Clutter)
  const fontFamilies = new Set(textLayers.map((l) => l.fontFamily));
  if (fontFamilies.size > 3) {
    issues.push({
      id: 'excessive-fonts',
      type: 'warning',
      category: 'typography',
      title: `${fontFamilies.size} Different Font Families Used`,
      message: 'Professional book covers typically stick to at most 2 complementary font families (e.g. 1 display serif/sans + 1 readable body) to maintain visual cohesion.',
      suggestedAction: 'Unify secondary text fonts',
    });
  }

  // 6. Positive Confirmation if No Errors
  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warningCount = issues.filter((i) => i.type === 'warning').length;

  if (errorCount === 0 && warningCount === 0) {
    issues.push({
      id: 'all-clear',
      type: 'ready',
      category: 'safety',
      title: 'Print Safety Checks Passed',
      message: `Canvas dimensions (${dimensions.totalWidthInches}" x ${dimensions.totalHeightInches}" at 300 DPI) adhere to print standards. Safe margins and bleed areas are respected.`,
    });
  } else if (errorCount === 0) {
    issues.push({
      id: 'ready-with-warnings',
      type: 'ready',
      category: 'safety',
      title: 'Ready with Recommendations',
      message: 'No fatal printing blockers detected. Review the warnings above to optimize reader conversion and aesthetic balance.',
    });
  }

  return issues;
}
