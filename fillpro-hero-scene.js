import * as THREE from './vendor/three.module.min.js';

(function () {
  const root = document.documentElement;
  const canvas = document.querySelector('.hero-3d-canvas');
  const hero = canvas && canvas.closest('.launch-hero');

  if (!root || !canvas || !hero) return;

  const motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {}, removeEventListener() {} };
  let reduceMotion = motionQuery.matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    root.classList.add('hero-3d-failed');
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.18));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const trackedGeometries = [];
  const trackedMaterials = [];
  const themeMaterials = [];

  function trackGeometry(geometry) {
    trackedGeometries.push(geometry);
    return geometry;
  }

  function trackMaterial(material) {
    trackedMaterials.push(material);
    return material;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  camera.position.set(0, 0.1, 8.4);

  const group = new THREE.Group();
  group.position.set(0.26, -0.03, 0);
  group.rotation.set(-0.035, -0.05, 0.006);
  scene.add(group);

  scene.add(new THREE.HemisphereLight(0xf8fffb, 0x071916, 0.86));

  const key = new THREE.DirectionalLight(0xffffff, 1.12);
  key.position.set(3.4, 4.6, 5.4);
  scene.add(key);

  const rim = new THREE.PointLight(0x72fff1, 0.22, 7);
  rim.position.set(-2.6, 1.1, 2.7);
  scene.add(rim);

  function roundedRectShape(width, height, radius) {
    const x = -width / 2;
    const y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
  }

  function standardMaterial(color, options = {}) {
    return trackMaterial(
      new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.78,
        metalness: options.metalness ?? 0.02,
        transparent: options.opacity !== undefined,
        opacity: options.opacity ?? 1,
        depthWrite: options.depthWrite ?? true,
        side: options.side ?? THREE.FrontSide,
      }),
    );
  }

  function lightMaterial(color, opacity) {
    return trackMaterial(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
  }

  function themedMaterial(lightColor, darkColor, options = {}) {
    const material = standardMaterial(lightColor, options);
    themeMaterials.push({
      material,
      lightColor,
      darkColor,
      lightOpacity: options.opacity,
      darkOpacity: options.darkOpacity,
    });
    return material;
  }

  function themedLineMaterial(lightColor, darkColor, options = {}) {
    const material = trackMaterial(
      new THREE.LineBasicMaterial({
        color: lightColor,
        transparent: true,
        opacity: options.opacity ?? 0.12,
        depthWrite: false,
      }),
    );
    themeMaterials.push({
      material,
      lightColor,
      darkColor,
      lightOpacity: options.opacity,
      darkOpacity: options.darkOpacity,
    });
    return material;
  }

  function extrudedPanel(width, height, radius, depth, material, edgeOpacity = 0.04) {
    const geometry = trackGeometry(
      new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
        depth,
        bevelEnabled: true,
        bevelSize: Math.min(radius * 0.2, 0.025),
        bevelThickness: Math.min(depth * 0.34, 0.02),
        bevelSegments: 3,
        curveSegments: 14,
      }),
    );
    geometry.center();

    const mesh = new THREE.Mesh(geometry, material);
    if (edgeOpacity > 0) {
      mesh.add(
        new THREE.LineSegments(
          trackGeometry(new THREE.EdgesGeometry(geometry, 18)),
          themedLineMaterial(0x8adfd4, 0x9de7d7, {
            opacity: edgeOpacity,
            darkOpacity: edgeOpacity * 1.35,
          }),
        ),
      );
    }
    return mesh;
  }

  function flatPanel(width, height, radius, material, edgeOpacity = 0) {
    const geometry = trackGeometry(new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 14));
    const mesh = new THREE.Mesh(geometry, material);
    if (edgeOpacity > 0) {
      mesh.add(
        new THREE.LineSegments(
          trackGeometry(new THREE.EdgesGeometry(geometry, 18)),
          themedLineMaterial(0x7edbd0, 0x9de7d7, {
            opacity: edgeOpacity,
            darkOpacity: edgeOpacity * 1.4,
          }),
        ),
      );
    }
    return mesh;
  }

  const studioMaterial = themedMaterial(0xf6fffb, 0x12352f, {
    opacity: 0.22,
    darkOpacity: 0.34,
    roughness: 0.84,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fieldMaterial = themedMaterial(0xebfaf6, 0xdef8f0, {
    opacity: 0.62,
    darkOpacity: 0.56,
    roughness: 0.88,
    depthWrite: false,
  });
  const actionMaterial = themedMaterial(0x0f766e, 0x15a090, {
    opacity: 0.68,
    darkOpacity: 0.64,
    roughness: 0.58,
    depthWrite: false,
  });
  const mutedMaterial = themedMaterial(0xf1f5ef, 0x173b35, {
    opacity: 0.34,
    darkOpacity: 0.3,
    roughness: 0.9,
    depthWrite: false,
  });
  const pathMaterial = lightMaterial(0x68fff0, 0.18);
  const cursorMaterial = lightMaterial(0xc7fff8, 0.58);
  const warmGlintMaterial = lightMaterial(0xf0bd58, 0.058);
  const shadowMaterial = lightMaterial(0x061d1a, 0.048);

  const glassStage = new THREE.Group();
  group.add(glassStage);

  const studioPlate = extrudedPanel(5.3, 2.86, 0.34, 0.055, studioMaterial, 0.026);
  studioPlate.position.set(0.28, 0, -0.72);
  studioPlate.rotation.set(0.006, -0.012, 0.004);
  glassStage.add(studioPlate);

  const studioShadow = new THREE.Mesh(trackGeometry(new THREE.CircleGeometry(1, 72)), shadowMaterial);
  studioShadow.scale.set(2.35, 0.34, 1);
  studioShadow.position.set(0.36, -1.06, -0.46);
  glassStage.add(studioShadow);

  const formDepthStack = new THREE.Group();
  formDepthStack.position.set(-0.34, 0.02, -0.12);
  formDepthStack.rotation.set(0.012, -0.036, 0.004);
  group.add(formDepthStack);

  const fieldChips = [];

  function createFieldChip(width, y, offset, active) {
    const chip = new THREE.Group();
    chip.position.set(offset, y, 0.05);

    const base = flatPanel(width, 0.17, 0.044, active ? fieldMaterial : mutedMaterial, active ? 0.018 : 0.012);
    chip.add(base);

    if (active) {
      const fill = flatPanel(width * 0.52, 0.052, 0.022, lightMaterial(0x31ddc8, 0.18), 0);
      fill.position.set(-width * 0.18, 0, 0.031);
      chip.add(fill);
      fieldChips.push(fill);
    }

    formDepthStack.add(chip);
    return chip;
  }

  createFieldChip(1.62, 0.36, -0.16, true);
  createFieldChip(1.86, 0.1, -0.02, true);
  createFieldChip(1.44, -0.16, -0.22, true);

  const safeSkipRail = createFieldChip(1.74, -0.45, -0.08, false);
  const safeSkipAccent = flatPanel(0.17, 0.052, 0.022, warmGlintMaterial, 0);
  safeSkipAccent.position.set(-0.68, 0, 0.034);
  safeSkipRail.add(safeSkipAccent);

  const guidedFillCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.92, -0.22, 0.11),
    new THREE.Vector3(0.5, -0.02, 0.18),
    new THREE.Vector3(0.08, 0.16, 0.19),
    new THREE.Vector3(-0.8, 0.36, 0.15),
  ]);

  const guidedFillPath = new THREE.Mesh(
    trackGeometry(new THREE.TubeGeometry(guidedFillCurve, 44, 0.008, 8, false)),
    pathMaterial,
  );
  group.add(guidedFillPath);

  const fillCursor = flatPanel(0.14, 0.052, 0.018, cursorMaterial, 0);
  group.add(fillCursor);

  const warmGlint = flatPanel(0.64, 0.058, 0.026, warmGlintMaterial, 0);
  warmGlint.position.set(0.86, -0.76, 0.08);
  warmGlint.rotation.z = -0.13;
  group.add(warmGlint);

  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let isVisible = true;
  let sizeNeedsUpdate = true;
  let isNarrow = false;
  let isDarkMode = false;
  const cursorPoint = new THREE.Vector3();

  function currentThemeIsDark() {
    const theme = root.dataset.theme;
    const resolved = root.dataset.resolvedTheme;
    if (resolved) return resolved === 'dark';
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme() {
    isDarkMode = currentThemeIsDark();
    themeMaterials.forEach(({ material, lightColor, darkColor, lightOpacity, darkOpacity }) => {
      material.color.set(isDarkMode ? darkColor : lightColor);
      if (lightOpacity !== undefined) {
        material.opacity = isDarkMode && darkOpacity !== undefined ? darkOpacity : lightOpacity;
      }
    });
    shadowMaterial.opacity = isDarkMode ? 0.056 : 0.04;
    pathMaterial.opacity = isDarkMode ? 0.17 : 0.12;
    warmGlintMaterial.opacity = isDarkMode ? 0.075 : 0.05;
    cursorMaterial.opacity = isDarkMode ? 0.62 : 0.52;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 1);
    const height = Math.max(Math.floor(rect.height), 1);
    const drawingWidth = Math.floor(width * renderer.getPixelRatio());
    const drawingHeight = Math.floor(height * renderer.getPixelRatio());

    if (canvas.width !== drawingWidth || canvas.height !== drawingHeight) {
      renderer.setSize(width, height, false);
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    isNarrow = width < 560;
  }

  function render(time) {
    if (sizeNeedsUpdate) {
      sizeNeedsUpdate = false;
      resize();
      applyTheme();
    }

    const seconds = time * 0.001;
    const floatTime = reduceMotion ? 0 : seconds;
    pointerX += (targetX - pointerX) * 0.035;
    pointerY += (targetY - pointerY) * 0.035;

    group.scale.setScalar(isNarrow ? 0.52 : 0.72);
    group.position.x = isNarrow ? 0.12 : 0.4;
    group.position.y = -0.035 + Math.sin(floatTime * 0.12) * 0.004;
    group.rotation.y = (isNarrow ? -0.02 : -0.052) + pointerX * 0.012;
    group.rotation.x = -0.035 - pointerY * 0.009;

    studioPlate.rotation.z = 0.004 + Math.sin(floatTime * 0.08) * 0.0015;
    studioShadow.material.opacity = (isDarkMode ? 0.052 : 0.038) + Math.sin(floatTime * 0.16) * 0.002;
    formDepthStack.position.y = 0.02 + Math.sin(floatTime * 0.13) * 0.003;
    warmGlint.material.opacity = (isDarkMode ? 0.07 : 0.048) + Math.sin(floatTime * 0.22) * 0.005;
    guidedFillPath.material.opacity = (isDarkMode ? 0.16 : 0.115) + Math.sin(floatTime * 0.2) * 0.006;

    fieldChips.forEach((fill, index) => {
      fill.material.opacity = (isDarkMode ? 0.18 : 0.15) + Math.sin(floatTime * 0.26 + index * 0.52) * 0.008;
    });
    safeSkipRail.children[0].material.opacity = isDarkMode ? 0.28 : 0.32;

    const progress = reduceMotion ? 0.74 : (seconds * 0.064) % 1;
    guidedFillCurve.getPoint(progress, cursorPoint);
    fillCursor.position.copy(cursorPoint);
    fillCursor.rotation.z = -0.04 + Math.sin(floatTime * 0.34) * 0.008;
    fillCursor.material.opacity = reduceMotion ? 0.52 : 0.52 + Math.sin(floatTime * 0.46) * 0.035;

    renderer.render(scene, camera);
  }

  function requestReducedFrame() {
    if (reduceMotion) requestAnimationFrame(() => render(0));
  }

  function start() {
    renderer.setAnimationLoop((time) => {
      if (isVisible && !reduceMotion) render(time);
    });
    if (reduceMotion) render(0);
  }

  window.addEventListener(
    'pointermove',
    (event) => {
      const rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      requestReducedFrame();
    },
    { passive: true },
  );

  window.addEventListener(
    'resize',
    () => {
      sizeNeedsUpdate = true;
      requestReducedFrame();
    },
    { passive: true },
  );

  const cleanupCallbacks = [];

  if (motionQuery.addEventListener) {
    const onMotionChange = () => {
      reduceMotion = motionQuery.matches;
      if (reduceMotion) {
        renderer.setAnimationLoop(null);
        render(0);
      } else {
        start();
      }
    };
    motionQuery.addEventListener('change', onMotionChange);
    cleanupCallbacks.push(() => motionQuery.removeEventListener('change', onMotionChange));
  }

  if ('MutationObserver' in window) {
    const observer = new MutationObserver(() => {
      applyTheme();
      requestReducedFrame();
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-resolved-theme'] });
    cleanupCallbacks.push(() => observer.disconnect());
  }

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      sizeNeedsUpdate = true;
      requestReducedFrame();
    });
    observer.observe(canvas);
    cleanupCallbacks.push(() => observer.disconnect());
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0] ? entries[0].isIntersecting : true;
      },
      { threshold: 0.02 },
    );
    observer.observe(hero);
    cleanupCallbacks.push(() => observer.disconnect());
  }

  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null);
    cleanupCallbacks.forEach((callback) => callback());
    trackedGeometries.forEach((geometry) => geometry.dispose());
    trackedMaterials.forEach((material) => material.dispose());
    renderer.dispose();
  });

  requestAnimationFrame((time) => {
    applyTheme();
    render(time);
    root.classList.add('hero-3d-ready');
    start();
  });
})();
