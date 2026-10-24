export type CoverType = 'ebook' | 'paperback' | 'hardcover';

export type PaperType = 'cream' | 'white' | 'standard_color' | 'premium_color';

export type TrimSize = 
  | '5x8'
  | '5.25x8'
  | '5.5x8.5'
  | '6x9'
  | '7x10'
  | '8x10'
  | '8.5x11'
  | '8.5x8.5';

export interface BookDetails {
  title: string;
  subtitle: string;
  authorName: string;
  genre: string;
  blurb: string;
  authorBio: string;
  publisherName: string;
  isbn: string;
  tagline: string;
  price: string;
  edition: string;
}

export interface PrintSpecs {
  coverType: CoverType;
  trimSize: TrimSize;
  customTrimWidth?: number; // inches
  customTrimHeight?: number; // inches
  pageCount: number;
  paperType: PaperType;
  hasBleed: boolean;
  readingDirection: 'ltr' | 'rtl';
  coverFinish: 'matte' | 'glossy';
  provider: 'kdp' | 'ingram' | 'lulu';
}

export interface CalculatedDimensions {
  trimWidthInches: number;
  trimHeightInches: number;
  spineWidthInches: number;
  totalWidthInches: number;
  totalHeightInches: number;
  bleedInches: number;
  safeMarginInches: number;
  spineTextAllowed: boolean;
  
  // Pixel dimensions at 300 DPI
  canvasWidthPx: number;
  canvasHeightPx: number;
  frontWidthPx: number;
  backWidthPx: number;
  spineWidthPx: number;
  bleedPx: number;
  safeMarginPx: number;

  // Regions on canvas (pixels)
  backRegion: { x: number; y: number; width: number; height: number };
  spineRegion: { x: number; y: number; width: number; height: number };
  frontRegion: { x: number; y: number; width: number; height: number };
  barcodeArea: { x: number; y: number; width: number; height: number };
  spineTextBounds: { x: number; y: number; width: number; height: number };
}

export type TextEffectType = 'none' | 'shadow' | 'outline' | 'glow' | 'gold_foil' | 'silver_foil' | 'emboss';

export interface TextLayer {
  id: string;
  type: 'text';
  name: string;
  role: 'title' | 'subtitle' | 'author' | 'spine_title' | 'spine_author' | 'blurb' | 'tagline' | 'bio' | 'general';
  text: string;
  x: number; // percentage of canvas (0 to 100) or pixels
  y: number;
  width?: number;
  height?: number;
  fontFamily: string;
  fontSize: number; // relative to canvas scale (e.g. 48)
  originalFontSize?: number; // stored font size before auto-fit scaling
  fontWeight: number | string;
  fontStyle?: 'normal' | 'italic';
  letterSpacing: number; // px or tracking
  lineHeight: number; // e.g. 1.2
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  opacity: number;
  rotation: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  effect: TextEffectType;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  strokeColor?: string;
  strokeWidth?: number;
  locked: boolean;
  visible: boolean;
}

export interface ImageLayer {
  id: string;
  type: 'image';
  name: string;
  role: 'background' | 'artwork' | 'overlay' | 'author_photo' | 'barcode' | 'publisher_logo';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  hue: number; // 0 to 360
  blur: number; // 0 to 50
  sepia: number; // 0 to 100
  grayscale: number; // 0 to 100
  vignette: number; // 0 to 100
  warmth: number; // -100 to 100
  blendMode: 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
  colorOverlay?: string;
  colorOverlayOpacity?: number;
  crop?: { x: number; y: number; width: number; height: number };
  locked: boolean;
  visible: boolean;
  aspectRatioMode?: 'fit' | 'fill' | 'original' | 'crop';
}

export interface ShapeLayer {
  id: string;
  type: 'shape';
  name: string;
  role?: 'shape' | 'frame' | 'overlay' | 'barcode' | 'general' | string;
  shapeType: 'rectangle' | 'border_frame' | 'divider' | 'gradient_overlay' | 'barcode_box' | 'badge';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  borderRadius?: number;
  locked: boolean;
  visible: boolean;
}

export type CanvasLayer = TextLayer | ImageLayer | ShapeLayer;

export interface ProjectState {
  id: string;
  name: string;
  lastModified: number;
  coverType: CoverType;
  bookDetails: BookDetails;
  printSpecs: PrintSpecs;
  dimensions: CalculatedDimensions;
  backgroundColor: string;
  backgroundGradient?: string;
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  guidesVisible: boolean;
  bleedVisible: boolean;
  safeAreaVisible: boolean;
  barcodeVisible: boolean;
  viewMode: 'simple' | 'professional';
}

export interface CoverTemplate {
  id: string;
  name: string;
  genre: string;
  coverType: CoverType;
  description: string;
  thumbnail: string;
  authorNote: string;
  license: 'Free for Commercial Use' | 'Attribution Required' | 'Standard License';
  palette: string[];
  fonts: {
    title: string;
    subtitle: string;
    author: string;
    body: string;
  };
  state: Partial<ProjectState>;
}

export interface QualityIssue {
  id: string;
  type: 'ready' | 'warning' | 'error';
  category: 'dimensions' | 'safety' | 'contrast' | 'typography' | 'spine' | 'barcode' | 'blurb' | 'resolution';
  title: string;
  message: string;
  suggestedAction?: string;
  targetLayerId?: string;
}

export type MockupStyle = 
  | 'paperback_standing'
  | 'paperback_flat'
  | 'hardcover_case'
  | 'front_hero'
  | 'front_back_duo'
  | 'stacked_trio';
