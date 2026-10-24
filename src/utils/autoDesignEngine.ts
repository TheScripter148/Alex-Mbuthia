import { CalculatedDimensions, CanvasLayer, CoverType, ImageLayer, ProjectState, ShapeLayer, TextLayer } from '../types';
import { GENRE_PRESETS } from '../constants/genres';

export type LayoutVariationStyle = 'cinematic' | 'bold_bestseller' | 'classical_frame' | 'minimal_modern';

export interface LayoutVariation {
  id: string;
  name: string;
  style: LayoutVariationStyle;
  description: string;
  previewColor: string;
  layers: CanvasLayer[];
  backgroundColor: string;
  backgroundGradient: string;
}

// Helper to calculate responsive font size based on title length and canvas width
export function calculateTitleFontSize(title: string, canvasWidth: number, coverType: CoverType, isFullWidth = false): number {
  const effectiveWidth = coverType === 'ebook' ? canvasWidth : (canvasWidth * 0.42);
  const charCount = title.length;
  const wordCount = title.split(/\s+/).length;

  let baseRatio = 0.085; // ~8.5% of canvas width
  if (charCount > 35) {
    baseRatio = 0.045;
  } else if (charCount > 22 || wordCount >= 5) {
    baseRatio = 0.055;
  } else if (charCount > 14) {
    baseRatio = 0.068;
  } else if (charCount < 8) {
    baseRatio = 0.095;
  }

  const rawSize = Math.round(effectiveWidth * baseRatio);
  return Math.max(28, Math.min(rawSize, 120));
}

export function generateAutomatedCover(
  params: {
    title: string;
    subtitle?: string;
    authorName: string;
    genre: string;
    blurb?: string;
    coverType: CoverType;
    dimensions: CalculatedDimensions;
    style?: LayoutVariationStyle;
    uploadedImageUrl?: string;
    customPalette?: { primary: string; accent: string; bg: string };
  }
): { layers: CanvasLayer[]; backgroundColor: string; backgroundGradient: string } {
  const {
    title = 'UNTITLED MASTERPIECE',
    subtitle = '',
    authorName = 'AUTHOR NAME',
    genre = 'fantasy',
    blurb = '',
    coverType,
    dimensions,
    style = 'cinematic',
    uploadedImageUrl,
    customPalette,
  } = params;

  const preset = GENRE_PRESETS[genre] || GENRE_PRESETS.fantasy;
  const primaryColor = customPalette?.primary || preset.primaryColor;
  const accentColor = customPalette?.accent || preset.accentColor;
  const bgColor = customPalette?.bg || preset.backgroundColor;
  const bgGradient = preset.backgroundGradient;

  // Determine front cover coordinate space
  const isWrap = coverType === 'paperback' || coverType === 'hardcover';
  const frontX = isWrap ? dimensions.frontRegion.x : 0;
  const frontY = isWrap ? dimensions.frontRegion.y : 0;
  const frontW = isWrap ? dimensions.frontRegion.width : dimensions.canvasWidthPx;
  const frontH = isWrap ? dimensions.frontRegion.height : dimensions.canvasHeightPx;
  const frontCenterX = frontX + (frontW / 2);

  const titleSize = calculateTitleFontSize(title, frontW, coverType);
  const subtitleSize = Math.max(16, Math.min(Math.round(titleSize * 0.38), 32));
  const authorSize = Math.max(18, Math.min(Math.round(titleSize * 0.45), 36));

  const layers: CanvasLayer[] = [];

  // 1. Background image or illustration if provided
  if (uploadedImageUrl) {
    layers.push({
      id: 'layer-bg-art',
      type: 'image',
      name: 'Cover Artwork',
      role: 'artwork',
      src: uploadedImageUrl,
      x: isWrap ? frontX : 0,
      y: isWrap ? frontY : 0,
      width: isWrap ? frontW : dimensions.canvasWidthPx,
      height: isWrap ? frontH : dimensions.canvasHeightPx,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 0.95,
      brightness: 0,
      contrast: 5,
      saturation: 10,
      hue: 0,
      blur: 0,
      sepia: 0,
      grayscale: 0,
      vignette: 15,
      warmth: 0,
      blendMode: 'source-over',
      locked: true,
      visible: true,
    });
  }

  // 2. Decorative Vignette / Gradient Overlay to ensure text legibility
  layers.push({
    id: 'layer-vignette',
    type: 'shape',
    name: 'Lighting Scrim',
    shapeType: 'gradient_overlay',
    x: isWrap ? frontX : 0,
    y: isWrap ? frontY : 0,
    width: isWrap ? frontW : dimensions.canvasWidthPx,
    height: isWrap ? frontH : dimensions.canvasHeightPx,
    fill: 'rgba(0, 0, 0, 0.28)',
    stroke: 'transparent',
    strokeWidth: 0,
    opacity: 0.7,
    rotation: 0,
    locked: true,
    visible: true,
  });

  // Apply layout variations
  if (style === 'bold_bestseller') {
    // Large prominent title at top 25%, subtitle directly under, author at bottom
    const titleY = frontY + (frontH * 0.18);
    const subtitleY = titleY + (titleSize * 1.6);
    const authorY = frontY + (frontH * 0.88);

    layers.push({
      id: 'layer-title',
      type: 'text',
      name: 'Book Title',
      role: 'title',
      text: title,
      x: frontCenterX,
      y: titleY,
      width: frontW * 0.88,
      fontFamily: preset.titleFont,
      fontSize: Math.round(titleSize * 1.15),
      fontWeight: 800,
      letterSpacing: 2,
      lineHeight: 1.1,
      color: primaryColor,
      textAlign: 'center',
      opacity: 1,
      rotation: 0,
      textTransform: preset.titleCase,
      effect: preset.recommendedEffect,
      shadowColor: 'rgba(0,0,0,0.85)',
      shadowBlur: 16,
      shadowOffsetX: 2,
      shadowOffsetY: 4,
      locked: false,
      visible: true,
    });

    if (subtitle) {
      layers.push({
        id: 'layer-subtitle',
        type: 'text',
        name: 'Subtitle',
        role: 'subtitle',
        text: subtitle,
        x: frontCenterX,
        y: subtitleY,
        width: frontW * 0.82,
        fontFamily: preset.subtitleFont,
        fontSize: subtitleSize,
        fontWeight: 500,
        letterSpacing: 3,
        lineHeight: 1.3,
        color: accentColor,
        textAlign: 'center',
        opacity: 0.95,
        rotation: 0,
        textTransform: 'uppercase',
        effect: 'none',
        locked: false,
        visible: true,
      });
    }

    layers.push({
      id: 'layer-author',
      type: 'text',
      name: 'Author Name',
      role: 'author',
      text: authorName,
      x: frontCenterX,
      y: authorY,
      width: frontW * 0.85,
      fontFamily: preset.authorFont,
      fontSize: Math.round(authorSize * 1.1),
      fontWeight: 700,
      letterSpacing: 4,
      lineHeight: 1.2,
      color: '#FFFFFF',
      textAlign: 'center',
      opacity: 1,
      rotation: 0,
      textTransform: 'uppercase',
      effect: 'shadow',
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 8,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
      locked: false,
      visible: true,
    });
  } else if (style === 'classical_frame') {
    // Classical editorial layout with delicate frame border, author at top or bottom, balanced title center
    const titleY = frontY + (frontH * 0.42);
    const subtitleY = titleY + (titleSize * 1.5);
    const authorY = frontY + (frontH * 0.82);

    // Decorative frame
    layers.push({
      id: 'layer-frame',
      type: 'shape',
      name: 'Decorative Frame',
      shapeType: 'border_frame',
      x: frontX + (frontW * 0.07),
      y: frontY + (frontH * 0.05),
      width: frontW * 0.86,
      height: frontH * 0.90,
      fill: 'transparent',
      stroke: accentColor,
      strokeWidth: 2,
      opacity: 0.6,
      rotation: 0,
      locked: false,
      visible: true,
    });

    layers.push({
      id: 'layer-title',
      type: 'text',
      name: 'Book Title',
      role: 'title',
      text: title,
      x: frontCenterX,
      y: titleY,
      width: frontW * 0.82,
      fontFamily: preset.titleFont,
      fontSize: titleSize,
      fontWeight: 700,
      letterSpacing: 3,
      lineHeight: 1.2,
      color: primaryColor,
      textAlign: 'center',
      opacity: 1,
      rotation: 0,
      textTransform: preset.titleCase,
      effect: preset.recommendedEffect,
      shadowColor: 'rgba(0,0,0,0.7)',
      shadowBlur: 12,
      shadowOffsetX: 1,
      shadowOffsetY: 3,
      locked: false,
      visible: true,
    });

    if (subtitle) {
      layers.push({
        id: 'layer-subtitle',
        type: 'text',
        name: 'Subtitle',
        role: 'subtitle',
        text: subtitle,
        x: frontCenterX,
        y: subtitleY,
        width: frontW * 0.78,
        fontFamily: preset.subtitleFont,
        fontSize: subtitleSize,
        fontWeight: 400,
        fontStyle: 'italic',
        letterSpacing: 2,
        lineHeight: 1.3,
        color: accentColor,
        textAlign: 'center',
        opacity: 0.9,
        rotation: 0,
        effect: 'none',
        locked: false,
        visible: true,
      });
    }

    layers.push({
      id: 'layer-author',
      type: 'text',
      name: 'Author Name',
      role: 'author',
      text: authorName,
      x: frontCenterX,
      y: authorY,
      width: frontW * 0.8,
      fontFamily: preset.authorFont,
      fontSize: authorSize,
      fontWeight: 600,
      letterSpacing: 4,
      lineHeight: 1.2,
      color: primaryColor,
      textAlign: 'center',
      opacity: 1,
      rotation: 0,
      textTransform: 'uppercase',
      effect: 'none',
      locked: false,
      visible: true,
    });
  } else if (style === 'minimal_modern') {
    // Modern asymmetric or clean left-aligned typography
    const titleY = frontY + (frontH * 0.28);
    const subtitleY = titleY + (titleSize * 1.5);
    const authorY = frontY + (frontH * 0.84);

    layers.push({
      id: 'layer-title',
      type: 'text',
      name: 'Book Title',
      role: 'title',
      text: title,
      x: frontX + (frontW * 0.12),
      y: titleY,
      width: frontW * 0.76,
      fontFamily: preset.titleFont,
      fontSize: titleSize,
      fontWeight: 700,
      letterSpacing: 1,
      lineHeight: 1.15,
      color: primaryColor,
      textAlign: 'left',
      opacity: 1,
      rotation: 0,
      textTransform: preset.titleCase,
      effect: 'none',
      locked: false,
      visible: true,
    });

    if (subtitle) {
      layers.push({
        id: 'layer-subtitle',
        type: 'text',
        name: 'Subtitle',
        role: 'subtitle',
        text: subtitle,
        x: frontX + (frontW * 0.12),
        y: subtitleY,
        width: frontW * 0.76,
        fontFamily: preset.subtitleFont,
        fontSize: subtitleSize,
        fontWeight: 500,
        letterSpacing: 1.5,
        lineHeight: 1.3,
        color: accentColor,
        textAlign: 'left',
        opacity: 0.9,
        rotation: 0,
        effect: 'none',
        locked: false,
        visible: true,
      });
    }

    layers.push({
      id: 'layer-author',
      type: 'text',
      name: 'Author Name',
      role: 'author',
      text: authorName,
      x: frontX + (frontW * 0.12),
      y: authorY,
      width: frontW * 0.76,
      fontFamily: preset.authorFont,
      fontSize: authorSize,
      fontWeight: 600,
      letterSpacing: 2,
      lineHeight: 1.2,
      color: '#FFFFFF',
      textAlign: 'left',
      opacity: 1,
      rotation: 0,
      textTransform: 'uppercase',
      effect: 'none',
      locked: false,
      visible: true,
    });
  } else {
    // Default 'cinematic' layout: Title in upper 30%, ample centerpiece room for illustration, author at bottom
    const titleY = frontY + (frontH * 0.22);
    const subtitleY = titleY + (titleSize * 1.4);
    const authorY = frontY + (frontH * 0.86);

    layers.push({
      id: 'layer-title',
      type: 'text',
      name: 'Book Title',
      role: 'title',
      text: title,
      x: frontCenterX,
      y: titleY,
      width: frontW * 0.84,
      fontFamily: preset.titleFont,
      fontSize: titleSize,
      fontWeight: 700,
      letterSpacing: 2,
      lineHeight: 1.15,
      color: primaryColor,
      textAlign: 'center',
      opacity: 1,
      rotation: 0,
      textTransform: preset.titleCase,
      effect: preset.recommendedEffect,
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 14,
      shadowOffsetX: 2,
      shadowOffsetY: 3,
      locked: false,
      visible: true,
    });

    if (subtitle) {
      layers.push({
        id: 'layer-subtitle',
        type: 'text',
        name: 'Subtitle',
        role: 'subtitle',
        text: subtitle,
        x: frontCenterX,
        y: subtitleY,
        width: frontW * 0.8,
        fontFamily: preset.subtitleFont,
        fontSize: subtitleSize,
        fontWeight: 500,
        letterSpacing: 2,
        lineHeight: 1.3,
        color: accentColor,
        textAlign: 'center',
        opacity: 0.95,
        rotation: 0,
        effect: 'none',
        locked: false,
        visible: true,
      });
    }

    layers.push({
      id: 'layer-author',
      type: 'text',
      name: 'Author Name',
      role: 'author',
      text: authorName,
      x: frontCenterX,
      y: authorY,
      width: frontW * 0.84,
      fontFamily: preset.authorFont,
      fontSize: authorSize,
      fontWeight: 600,
      letterSpacing: 4,
      lineHeight: 1.2,
      color: '#FFFFFF',
      textAlign: 'center',
      opacity: 1,
      rotation: 0,
      textTransform: 'uppercase',
      effect: 'shadow',
      shadowColor: 'rgba(0,0,0,0.85)',
      shadowBlur: 8,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
      locked: false,
      visible: true,
    });
  }

  // If Paperback or Hardcover Wrap: Add Spine and Back Cover elements!
  if (isWrap) {
    const backX = dimensions.backRegion.x;
    const backY = dimensions.backRegion.y;
    const backW = dimensions.backRegion.width;
    const backH = dimensions.backRegion.height;
    const backCenterX = backX + (backW / 2);

    const spineX = dimensions.spineRegion.x;
    const spineY = dimensions.spineRegion.y;
    const spineW = dimensions.spineRegion.width;
    const spineH = dimensions.spineRegion.height;
    const spineCenterX = spineX + (spineW / 2);

    // Spine Title & Spine Author if spine is wide enough (KDP rule: >= 79 pages)
    if (dimensions.spineTextAllowed && spineW >= 40) {
      const spineFontSize = Math.max(12, Math.min(Math.round(spineW * 0.38), 24));
      
      layers.push({
        id: 'layer-spine-title',
        type: 'text',
        name: 'Spine Title',
        role: 'spine_title',
        text: title,
        x: spineCenterX,
        y: spineY + (spineH * 0.45),
        width: spineH * 0.65,
        fontFamily: preset.titleFont,
        fontSize: spineFontSize,
        fontWeight: 600,
        letterSpacing: 2,
        lineHeight: 1,
        color: primaryColor,
        textAlign: 'center',
        opacity: 0.95,
        rotation: 90, // vertical spine orientation
        textTransform: 'uppercase',
        effect: 'none',
        locked: false,
        visible: true,
      });

      layers.push({
        id: 'layer-spine-author',
        type: 'text',
        name: 'Spine Author',
        role: 'spine_author',
        text: authorName,
        x: spineCenterX,
        y: spineY + (spineH * 0.85),
        width: spineH * 0.22,
        fontFamily: preset.authorFont,
        fontSize: Math.max(10, Math.round(spineFontSize * 0.85)),
        fontWeight: 500,
        letterSpacing: 1.5,
        lineHeight: 1,
        color: '#FFFFFF',
        textAlign: 'center',
        opacity: 0.85,
        rotation: 90,
        textTransform: 'uppercase',
        effect: 'none',
        locked: false,
        visible: true,
      });
    }

    // Back Cover: Blurb container
    const effectiveBlurb = blurb || preset.sampleBlurb;
    const blurbBoxW = backW * 0.82;
    const blurbBoxH = backH * 0.55;
    const blurbBoxX = backCenterX;
    const blurbBoxY = backY + (backH * 0.15);

    // Headline hook
    layers.push({
      id: 'layer-back-hook',
      type: 'text',
      name: 'Back Cover Hook',
      role: 'tagline',
      text: preset.sampleHook,
      x: blurbBoxX,
      y: blurbBoxY,
      width: blurbBoxW,
      fontFamily: preset.titleFont,
      fontSize: Math.round(subtitleSize * 1.1),
      fontWeight: 700,
      letterSpacing: 1,
      lineHeight: 1.25,
      color: accentColor,
      textAlign: 'center',
      opacity: 1,
      rotation: 0,
      effect: 'none',
      locked: false,
      visible: true,
    });

    // Main blurb body text
    layers.push({
      id: 'layer-back-blurb',
      type: 'text',
      name: 'Back Cover Blurb',
      role: 'blurb',
      text: effectiveBlurb,
      x: blurbBoxX,
      y: blurbBoxY + 54,
      width: blurbBoxW,
      fontFamily: preset.bodyFont,
      fontSize: Math.max(12, Math.min(Math.round(frontW * 0.024), 16)),
      fontWeight: 400,
      letterSpacing: 0.5,
      lineHeight: 1.55,
      color: '#E2E8F0',
      textAlign: 'left',
      opacity: 0.95,
      rotation: 0,
      effect: 'none',
      locked: false,
      visible: true,
    });

    // Barcode reservation placeholder box
    layers.push({
      id: 'layer-barcode-box',
      type: 'shape',
      name: 'Barcode Reservation Area',
      shapeType: 'barcode_box',
      x: dimensions.barcodeArea.x,
      y: dimensions.barcodeArea.y,
      width: dimensions.barcodeArea.width,
      height: dimensions.barcodeArea.height,
      fill: '#FFFFFF',
      stroke: '#CBD5E1',
      strokeWidth: 1,
      opacity: 0.95,
      rotation: 0,
      locked: true,
      visible: true,
    });
  }

  return { layers, backgroundColor: bgColor, backgroundGradient: bgGradient };
}

export function generateAllLayoutVariations(params: {
  title: string;
  subtitle?: string;
  authorName: string;
  genre: string;
  blurb?: string;
  coverType: CoverType;
  dimensions: CalculatedDimensions;
  uploadedImageUrl?: string;
}): LayoutVariation[] {
  const styles: Array<{ key: LayoutVariationStyle; name: string; desc: string; color: string }> = [
    { key: 'cinematic', name: 'Cinematic Centerpiece', desc: 'Dramatic depth, balanced typography and generous illustration focus', color: '#3B82F6' },
    { key: 'bold_bestseller', name: 'Bestseller Impact', desc: 'Prominent high-impact title block dominating the top third', color: '#EF4444' },
    { key: 'classical_frame', name: 'Literary Filigree', desc: 'Refined serif typography with delicate framing borders', color: '#D97706' },
    { key: 'minimal_modern', name: 'Minimalist Modern', desc: 'Sleek asymmetric alignment with negative space and modern restraint', color: '#10B981' },
  ];

  return styles.map((item) => {
    const res = generateAutomatedCover({
      ...params,
      style: item.key,
    });
    return {
      id: `variation-${item.key}`,
      name: item.name,
      style: item.key,
      description: item.desc,
      previewColor: item.color,
      layers: res.layers,
      backgroundColor: res.backgroundColor,
      backgroundGradient: res.backgroundGradient,
    };
  });
}
