import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Camera, Download, RotateCcw, X, Layers, Sun, Image as ImageIcon } from 'lucide-react';
import { CalculatedDimensions, CoverType, MockupStyle } from '../types';

interface ThreeMockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCanvas: HTMLCanvasElement | null;
  coverType: CoverType;
  dimensions: CalculatedDimensions;
}

export const ThreeMockupModal: React.FC<ThreeMockupModalProps> = ({
  isOpen,
  onClose,
  sourceCanvas,
  coverType,
  dimensions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mockupStyle, setMockupStyle] = useState<MockupStyle>('paperback_standing');
  const [backdrop, setBackdrop] = useState<'dark_slate' | 'studio_light' | 'warm_wood' | 'transparent'>('dark_slate');
  const [isRendering, setIsRendering] = useState(false);

  // References for Three.js scene
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const bookGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.1, y: -0.45 });

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 4.8);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    rendererRef.current = renderer;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 3. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 1.1);
    fillLight.position.set(-5, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe4b5, 1.4);
    rimLight.position.set(0, 5, -4);
    scene.add(rimLight);

    // 4. Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(10, 10);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.35;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 5. Build 3D Book Geometry and Textures
    build3DScene(scene, mockupStyle, backdrop);

    // 6. Animation / Render loop
    const render = () => {
      if (bookGroupRef.current) {
        bookGroupRef.current.rotation.x = THREE.MathUtils.lerp(bookGroupRef.current.rotation.x, rotationRef.current.x, 0.1);
        bookGroupRef.current.rotation.y = THREE.MathUtils.lerp(bookGroupRef.current.rotation.y, rotationRef.current.y, 0.1);
      }
      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(render);
    };
    render();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, [isOpen]);

  // Rebuild scene when style or backdrop changes
  useEffect(() => {
    if (!sceneRef.current || !isOpen) return;
    build3DScene(sceneRef.current, mockupStyle, backdrop);
  }, [mockupStyle, backdrop]);

  const build3DScene = (scene: THREE.Scene, style: MockupStyle, bg: string) => {
    // Remove old book groups
    if (bookGroupRef.current) {
      scene.remove(bookGroupRef.current);
      bookGroupRef.current = null;
    }

    // Set Scene Background
    if (bg === 'transparent') {
      scene.background = null;
    } else if (bg === 'studio_light') {
      scene.background = new THREE.Color('#E2E8F0');
    } else if (bg === 'warm_wood') {
      scene.background = new THREE.Color('#2A1810');
    } else {
      scene.background = new THREE.Color('#0A0D14');
    }

    const bookGroup = new THREE.Group();
    bookGroupRef.current = bookGroup;
    scene.add(bookGroup);

    // Create cover texture from 2D Canvas
    let coverTexture: THREE.CanvasTexture | null = null;
    let frontTexture: THREE.CanvasTexture | null = null;
    let backTexture: THREE.CanvasTexture | null = null;
    let spineTexture: THREE.CanvasTexture | null = null;

    if (sourceCanvas) {
      coverTexture = new THREE.CanvasTexture(sourceCanvas);
      coverTexture.colorSpace = THREE.SRGBColorSpace;
      coverTexture.anisotropy = 8;

      // Extract Front cover texture if full wrap
      if (coverType === 'paperback' || coverType === 'hardcover') {
        const frontC = document.createElement('canvas');
        frontC.width = dimensions.frontRegion.width;
        frontC.height = dimensions.frontRegion.height;
        const fctx = frontC.getContext('2d');
        if (fctx) {
          fctx.drawImage(
            sourceCanvas,
            dimensions.frontRegion.x,
            dimensions.frontRegion.y,
            dimensions.frontRegion.width,
            dimensions.frontRegion.height,
            0,
            0,
            frontC.width,
            frontC.height
          );
          frontTexture = new THREE.CanvasTexture(frontC);
          frontTexture.colorSpace = THREE.SRGBColorSpace;
        }

        // Spine texture
        const spineC = document.createElement('canvas');
        spineC.width = Math.max(30, dimensions.spineRegion.width);
        spineC.height = dimensions.spineRegion.height;
        const sctx = spineC.getContext('2d');
        if (sctx) {
          sctx.drawImage(
            sourceCanvas,
            dimensions.spineRegion.x,
            dimensions.spineRegion.y,
            dimensions.spineRegion.width,
            dimensions.spineRegion.height,
            0,
            0,
            spineC.width,
            spineC.height
          );
          spineTexture = new THREE.CanvasTexture(spineC);
          spineTexture.colorSpace = THREE.SRGBColorSpace;
        }

        // Back texture
        const backC = document.createElement('canvas');
        backC.width = dimensions.backRegion.width;
        backC.height = dimensions.backRegion.height;
        const bctx = backC.getContext('2d');
        if (bctx) {
          bctx.drawImage(
            sourceCanvas,
            dimensions.backRegion.x,
            dimensions.backRegion.y,
            dimensions.backRegion.width,
            dimensions.backRegion.height,
            0,
            0,
            backC.width,
            backC.height
          );
          backTexture = new THREE.CanvasTexture(backC);
          backTexture.colorSpace = THREE.SRGBColorSpace;
        }
      } else {
        frontTexture = coverTexture;
      }
    }

    // Procedural Page Paper Texture (creamy white with subtle paper edge lines)
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = 128;
    paperCanvas.height = 512;
    const pctx = paperCanvas.getContext('2d');
    if (pctx) {
      pctx.fillStyle = '#F5F2EB';
      pctx.fillRect(0, 0, 128, 512);
      pctx.fillStyle = '#E8E3D7';
      for (let i = 0; i < 512; i += 3) {
        if (Math.random() > 0.4) {
          pctx.fillRect(0, i, 128, 1);
        }
      }
    }
    const pagesTexture = new THREE.CanvasTexture(paperCanvas);
    pagesTexture.wrapS = THREE.RepeatWrapping;
    pagesTexture.wrapT = THREE.RepeatWrapping;

    const bookWidth = 1.8;
    const bookHeight = 2.7;
    const bookDepth = Math.max(0.18, Math.min(0.42, dimensions.spineWidthInches * 1.5 || 0.24));

    // Materials
    const defaultCoverMat = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.4,
      metalness: 0.1,
    });

    const frontCoverMat = frontTexture
      ? new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.35, metalness: 0.05 })
      : defaultCoverMat;

    const backCoverMat = backTexture
      ? new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.35, metalness: 0.05 })
      : defaultCoverMat;

    const spineCoverMat = spineTexture
      ? new THREE.MeshStandardMaterial({ map: spineTexture, roughness: 0.35, metalness: 0.05 })
      : defaultCoverMat;

    const pagesMat = new THREE.MeshStandardMaterial({
      map: pagesTexture,
      roughness: 0.8,
      metalness: 0.02,
    });

    // Box mesh with distinct face materials:
    // [right(+x: pages), left(-x: spine), top(+y: pages), bottom(-y: pages), front(+z: front cover), back(-z: back cover)]
    const bookMaterials = [
      pagesMat,        // right (+X): book page edges
      spineCoverMat,   // left (-X): spine
      pagesMat,        // top (+Y): top page edges
      pagesMat,        // bottom (-Y): bottom page edges
      frontCoverMat,   // front (+Z): front cover
      backCoverMat,    // back (-Z): back cover
    ];

    if (style === 'paperback_standing' || style === 'front_hero') {
      const geo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
      const bookMesh = new THREE.Mesh(geo, bookMaterials);
      bookMesh.castShadow = true;
      bookMesh.receiveShadow = true;
      bookMesh.position.y = 0;
      bookGroup.add(bookMesh);
      rotationRef.current = { x: 0.1, y: -0.45 };
    } else if (style === 'paperback_flat') {
      const geo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
      const bookMesh = new THREE.Mesh(geo, bookMaterials);
      bookMesh.castShadow = true;
      bookMesh.receiveShadow = true;
      bookMesh.rotation.x = -Math.PI / 2.3;
      bookMesh.rotation.z = 0.2;
      bookMesh.position.y = -0.5;
      bookGroup.add(bookMesh);
      rotationRef.current = { x: 0.0, y: 0.0 };
    } else if (style === 'hardcover_case') {
      // Hardcover features board overhangs and grooved hinges!
      const boardThickness = 0.04;
      const overhang = 0.06;
      
      // Interior page block
      const pagesGeo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
      const pagesMesh = new THREE.Mesh(pagesGeo, pagesMat);
      pagesMesh.castShadow = true;
      bookGroup.add(pagesMesh);

      // Front Hardcover Board
      const frontBoardGeo = new THREE.BoxGeometry(bookWidth + overhang, bookHeight + (overhang * 2), boardThickness);
      const frontBoardMesh = new THREE.Mesh(frontBoardGeo, [
        frontCoverMat, frontCoverMat, frontCoverMat, frontCoverMat, frontCoverMat, defaultCoverMat
      ]);
      frontBoardMesh.position.set(overhang / 2, 0, (bookDepth / 2) + (boardThickness / 2));
      frontBoardMesh.castShadow = true;
      bookGroup.add(frontBoardMesh);

      // Back Hardcover Board
      const backBoardGeo = new THREE.BoxGeometry(bookWidth + overhang, bookHeight + (overhang * 2), boardThickness);
      const backBoardMesh = new THREE.Mesh(backBoardGeo, [
        backCoverMat, backCoverMat, backCoverMat, backCoverMat, defaultCoverMat, backCoverMat
      ]);
      backBoardMesh.position.set(overhang / 2, 0, -(bookDepth / 2) - (boardThickness / 2));
      backBoardMesh.castShadow = true;
      bookGroup.add(backBoardMesh);

      // Spine Hardcover Strip
      const spineGeo = new THREE.BoxGeometry(boardThickness, bookHeight + (overhang * 2), bookDepth + (boardThickness * 2));
      const spineMesh = new THREE.Mesh(spineGeo, spineCoverMat);
      spineMesh.position.set(-(bookWidth / 2) - (boardThickness / 2), 0, 0);
      spineMesh.castShadow = true;
      bookGroup.add(spineMesh);

      rotationRef.current = { x: 0.12, y: -0.5 };
    } else if (style === 'front_back_duo') {
      // Two books displayed side-by-side: Front facing forward-left, Back facing forward-right
      const geo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
      
      const frontBook = new THREE.Mesh(geo, bookMaterials);
      frontBook.position.set(0.9, 0, 0.2);
      frontBook.rotation.y = -0.35;
      frontBook.castShadow = true;
      bookGroup.add(frontBook);

      const backBook = new THREE.Mesh(geo, bookMaterials);
      backBook.position.set(-0.9, 0, -0.2);
      backBook.rotation.y = Math.PI - 0.35;
      backBook.castShadow = true;
      bookGroup.add(backBook);

      rotationRef.current = { x: 0.05, y: 0.0 };
    } else if (style === 'stacked_trio') {
      // Stack of three books lying flat on table
      const geo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
      
      for (let i = 0; i < 3; i++) {
        const stackBook = new THREE.Mesh(geo, bookMaterials);
        stackBook.rotation.x = -Math.PI / 2.2;
        stackBook.rotation.z = (i - 1) * 0.08;
        stackBook.position.set(0, -0.8 + (i * bookDepth * 1.05), 0);
        stackBook.castShadow = true;
        bookGroup.add(stackBook);
      }
      rotationRef.current = { x: 0.0, y: 0.0 };
    }
  };

  // Interactive mouse drag to rotate
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMouseRef.current.x;
    const deltaY = e.clientY - prevMouseRef.current.y;
    rotationRef.current.y += deltaX * 0.008;
    rotationRef.current.x += deltaY * 0.008;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleExportMockup = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    setIsRendering(true);
    
    // Force clean render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png', 1.0);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `covercraft-3d-mockup-${mockupStyle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsRendering(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">3D Book Mockup Studio</h3>
              <p className="text-xs text-neutral-400">Photorealistic presentation renders for Amazon A+, social media, and marketing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative flex-1 w-full cursor-grab active:cursor-grabbing select-none"
        >
          {/* Subtle drag hint */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-md bg-neutral-950/60 border border-neutral-800 text-[11px] text-neutral-400 pointer-events-none">
            Click & drag to rotate view in 3D
          </div>
        </div>

        {/* Collapsible Bottom Control Dock */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          {/* Mockup Scenes */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider mr-2">Scene:</span>
            {[
              { id: 'paperback_standing', label: 'Standing' },
              { id: 'hardcover_case', label: 'Hardcover' },
              { id: 'paperback_flat', label: 'Lying Flat' },
              { id: 'front_back_duo', label: 'Duo Spread' },
              { id: 'stacked_trio', label: 'Stacked Trio' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setMockupStyle(s.id as MockupStyle)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mockupStyle === s.id
                    ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Environment Backdrop & Export */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
              {[
                { id: 'dark_slate', label: 'Dark Slate' },
                { id: 'studio_light', label: 'Studio Light' },
                { id: 'warm_wood', label: 'Mahogany' },
                { id: 'transparent', label: 'Transparent' },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBackdrop(b.id as any)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    backdrop === b.id ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                rotationRef.current = { x: 0.1, y: -0.45 };
              }}
              title="Reset Camera"
              className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportMockup}
              disabled={isRendering}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-lg shadow-amber-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Mockup PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
