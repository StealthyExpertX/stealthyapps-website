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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const trackedGeometries = [];
  const trackedMaterials = [];

  function trackGeometry(geometry) {
    trackedGeometries.push(geometry);
    return geometry;
  }

  function trackMaterial(material) {
    trackedMaterials.push(material);
    return material;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
  camera.position.set(0, 0.04, 9.4);

  const group = new THREE.Group();
  group.position.set(0.22, -0.04, 0);
  group.rotation.set(-0.035, -0.06, 0.008);
  scene.add(group);

  scene.add(new THREE.HemisphereLight(0xf8fffb, 0x071916, 0.96));

  const key = new THREE.DirectionalLight(0xffffff, 1.18);
  key.position.set(3.2, 4.4, 5.8);
  scene.add(key);

  const rim = new THREE.PointLight(0x72fff1, 0.26, 7);
  rim.position.set(-2.4, 1.0, 2.5);
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
        roughness: options.roughness ?? 0.76,
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

  function extrudedPanel(width, height, radius, depth, material, edgeOpacity = 0.05) {
    const geometry = trackGeometry(
      new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
        depth,
        bevelEnabled: true,
        bevelSize: Math.min(radius * 0.2, 0.028),
        bevelThickness: Math.min(depth * 0.34, 0.022),
        bevelSegments: 3,
        curveSegments: 16,
      }),
    );
    geometry.center();

    const mesh = new THREE.Mesh(geometry, material);
    if (edgeOpacity > 0) {
      mesh.add(
        new THREE.LineSegments(
          trackGeometry(new THREE.EdgesGeometry(geometry, 18)),
          trackMaterial(
            new THREE.LineBasicMaterial({
              color: 0xbdfbf2,
              transparent: true,
              opacity: edgeOpacity,
            }),
          ),
        ),
      );
    }
    return mesh;
  }

  function flatPanel(width, height, radius, material, edgeOpacity = 0) {
    const geometry = trackGeometry(new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 16));
    const mesh = new THREE.Mesh(geometry, material);
    if (edgeOpacity > 0) {
      mesh.add(
        new THREE.LineSegments(
          trackGeometry(new THREE.EdgesGeometry(geometry, 18)),
          trackMaterial(
            new THREE.LineBasicMaterial({
              color: 0x8adfd4,
              transparent: true,
              opacity: edgeOpacity,
            }),
          ),
        ),
      );
    }
    return mesh;
  }

  const themeMaterials = [];

  const studioPlateMaterial = themedMaterial(0xf6fffb, 0x143a34, {
    opacity: 0.24,
    darkOpacity: 0.3,
    roughness: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const windowShellMaterial = themedMaterial(0xffffff, 0xeafff8, {
    opacity: 0.52,
    darkOpacity: 0.46,
    roughness: 0.72,
    depthWrite: false,
  });
  const screenMaterial = themedMaterial(0xf7fffb, 0xf3fffa, {
    opacity: 0.58,
    darkOpacity: 0.5,
    roughness: 0.86,
    depthWrite: false,
  });
  const chromeMaterial = themedMaterial(0x0f2925, 0x0a211e, {
    opacity: 0.58,
    darkOpacity: 0.7,
    roughness: 0.52,
    depthWrite: false,
  });
  const fieldMaterial = themedMaterial(0xe8f8f3, 0xdff8f0, {
    opacity: 0.62,
    darkOpacity: 0.56,
    roughness: 0.88,
    depthWrite: false,
  });
  const fillMaterial = lightMaterial(0x33d9c5, 0.18);
  const actionMaterial = themedMaterial(0x0f766e, 0x139888, {
    opacity: 0.62,
    darkOpacity: 0.6,
    roughness: 0.6,
    depthWrite: false,
  });
  const mutedMaterial = themedMaterial(0xf0f4ef, 0x173b35, {
    opacity: 0.32,
    darkOpacity: 0.28,
    roughness: 0.9,
    depthWrite: false,
  });
  const pathMaterial = lightMaterial(0x68fff0, 0.16);
  const warmGlintMaterial = lightMaterial(0xf0bd58, 0.055);
  const shadowMaterial = lightMaterial(0x061d1a, 0.042);

  const glassStage = new THREE.Group();
  group.add(glassStage);

  const studioPlate = extrudedPanel(4.8, 2.48, 0.34, 0.06, studioPlateMaterial, 0.028);
  studioPlate.position.set(0.28, 0, -0.7);
  studioPlate.rotation.set(0.008, -0.014, 0.004);
  glassStage.add(studioPlate);

  const contactShadow = new THREE.Mesh(trackGeometry(new THREE.CircleGeometry(1, 72)), shadowMaterial);
  contactShadow.scale.set(2.15, 0.36, 1);
  contactShadow.position.set(0.34, -1.1, -0.5);
  glassStage.add(contactShadow);

  const formDepthStack = new THREE.Group();
  formDepthStack.position.set(-0.1, 0.08, -0.18);
  formDepthStack.rotation.set(0.012, -0.026, 0.005);
  group.add(formDepthStack);

  const productWindow = extrudedPanel(2.94, 1.86, 0.15, 0.095, windowShellMaterial, 0.045);
  productWindow.position.set(0, 0, -0.06);
  formDepthStack.add(productWindow);

  const productFace = flatPanel(2.66, 1.56, 0.1, screenMaterial, 0.018);
  productFace.position.set(0, -0.02, 0.032);
  formDepthStack.add(productFace);

  const chromeBar = flatPanel(2.66, 0.18, 0.08, chromeMaterial, 0);
  chromeBar.position.set(0, 0.61, 0.066);
  formDepthStack.add(chromeBar);

  const dotGeometry = trackGeometry(new THREE.CircleGeometry(0.036, 18));
  const dotMaterial = themedMaterial(0xb7c7c1, 0x90aaa1, {
    opacity: 0.68,
    darkOpacity: 0.54,
    roughness: 0.7,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  [-1.12, -1.0, -0.88].forEach((x) => {
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(x, 0.61, 0.086);
    formDepthStack.add(dot);
  });

  const fillRows = [];
  [
    { y: 0.3, fill: 1.02 },
    { y: 0.03, fill: 1.18 },
    { y: -0.24, fill: 0.96 },
  ].forEach((row, index) => {
    const base = flatPanel(1.92, 0.15, 0.036, fieldMaterial, 0.018);
    base.position.set(-0.12, row.y, 0.095 + index * 0.002);
    formDepthStack.add(base);

    const fill = flatPanel(row.fill, 0.052, 0.022, fillMaterial, 0);
    fill.position.set(-1.02 + row.fill / 2, row.y, 0.126 + index * 0.002);
    formDepthStack.add(fill);
    fillRows.push(fill);
  });

  const safeSkipRail = flatPanel(1.92, 0.16, 0.036, mutedMaterial, 0.016);
  safeSkipRail.position.set(-0.12, -0.53, 0.095);
  formDepthStack.add(safeSkipRail);

  const profileDock = new THREE.Group();
  profileDock.position.set(1.04, -0.03, 0.12);
  profileDock.rotation.set(0.01, -0.04, -0.012);
  profileDock.scale.setScalar(0.82);
  group.add(profileDock);

  const profileCard = extrudedPanel(1.08, 0.9, 0.13, 0.09, windowShellMaterial, 0.055);
  profileDock.add(profileCard);

  const logoTile = flatPanel(0.2, 0.2, 0.048, actionMaterial, 0.025);
  logoTile.position.set(-0.33, 0.24, 0.085);
  profileDock.add(logoTile);

  const profileLine = flatPanel(0.54, 0.07, 0.024, fieldMaterial, 0);
  profileLine.position.set(0.12, 0.25, 0.09);
  profileDock.add(profileLine);

  const profileField = flatPanel(0.82, 0.2, 0.05, fieldMaterial, 0.022);
  profileField.position.set(0, -0.02, 0.092);
  profileDock.add(profileField);

  const profileButton = flatPanel(0.82, 0.2, 0.05, actionMaterial, 0);
  profileButton.position.set(0, -0.31, 0.098);
  profileDock.add(profileButton);

  const warmGlint = flatPanel(0.66, 0.06, 0.026, warmGlintMaterial, 0);
  warmGlint.position.set(0.88, -0.74, 0.08);
  warmGlint.rotation.z = -0.13;
  group.add(warmGlint);

  const guidedFillCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.82, -0.18, 0.08),
    new THREE.Vector3(0.42, 0.0, 0.15),
    new THREE.Vector3(0.04, 0.16, 0.18),
    new THREE.Vector3(-0.68, 0.3, 0.16),
  ]);

  const guidedFillPath = new THREE.Mesh(
    trackGeometry(new THREE.TubeGeometry(guidedFillCurve, 44, 0.007, 8, false)),
    pathMaterial,
  );
  group.add(guidedFillPath);

  const fillCursor = flatPanel(0.13, 0.048, 0.018, lightMaterial(0xc7fff8, 0.58), 0);
  group.add(fillCursor);

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
    shadowMaterial.opacity = isDarkMode ? 0.052 : 0.036;
    pathMaterial.opacity = isDarkMode ? 0.16 : 0.11;
    warmGlintMaterial.opacity = isDarkMode ? 0.07 : 0.045;
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

    group.scale.setScalar(isNarrow ? 0.5 : 0.68);
    group.position.x = isNarrow ? 0.12 : 0.22;
    group.position.y = -0.04 + Math.sin(floatTime * 0.14) * 0.006;
    group.rotation.y = (isNarrow ? -0.018 : -0.06) + pointerX * 0.014;
    group.rotation.x = -0.035 - pointerY * 0.012;

    studioPlate.rotation.z = 0.005 + Math.sin(floatTime * 0.1) * 0.002;
    contactShadow.material.opacity = (isDarkMode ? 0.048 : 0.035) + Math.sin(floatTime * 0.18) * 0.003;
    formDepthStack.position.y = 0.08 + Math.sin(floatTime * 0.13) * 0.004;
    profileDock.position.y = -0.03 + Math.cos(floatTime * 0.12) * 0.005;
    warmGlint.material.opacity = (isDarkMode ? 0.065 : 0.045) + Math.sin(floatTime * 0.24) * 0.007;
    guidedFillPath.material.opacity = (isDarkMode ? 0.15 : 0.11) + Math.sin(floatTime * 0.22) * 0.008;

    fillRows.forEach((fill, index) => {
      fill.material.opacity = (isDarkMode ? 0.18 : 0.15) + Math.sin(floatTime * 0.3 + index * 0.55) * 0.012;
    });
    safeSkipRail.material.opacity = isDarkMode ? 0.24 : 0.28;

    const progress = reduceMotion ? 0.72 : (seconds * 0.075) % 1;
    guidedFillCurve.getPoint(progress, cursorPoint);
    fillCursor.position.copy(cursorPoint);
    fillCursor.rotation.z = -0.04 + Math.sin(floatTime * 0.42) * 0.012;
    fillCursor.material.opacity = reduceMotion ? 0.5 : 0.5 + Math.sin(floatTime * 0.54) * 0.045;

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
