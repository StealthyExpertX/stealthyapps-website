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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
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
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  camera.position.set(0, 0.08, 8.6);

  const group = new THREE.Group();
  group.position.set(0.78, -0.02, 0);
  group.rotation.set(-0.045, -0.11, 0.012);
  scene.add(group);

  scene.add(new THREE.HemisphereLight(0xf4fffa, 0x071916, 1.15));

  const key = new THREE.DirectionalLight(0xffffff, 1.62);
  key.position.set(3.8, 4.8, 5.4);
  scene.add(key);

  const softRim = new THREE.PointLight(0x76fff0, 0.78, 9);
  softRim.position.set(-2.5, 1.2, 2.8);
  scene.add(softRim);

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
        roughness: options.roughness ?? 0.72,
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

  function extrudedPanel(width, height, radius, depth, material, edgeOpacity = 0.08) {
    const geometry = trackGeometry(
      new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
        depth,
        bevelEnabled: true,
        bevelSize: Math.min(radius * 0.25, 0.035),
        bevelThickness: Math.min(depth * 0.38, 0.025),
        bevelSegments: 4,
        curveSegments: 18,
      }),
    );
    geometry.center();

    const mesh = new THREE.Mesh(geometry, material);
    if (edgeOpacity > 0) {
      const edge = new THREE.LineSegments(
        trackGeometry(new THREE.EdgesGeometry(geometry, 18)),
        trackMaterial(
          new THREE.LineBasicMaterial({
            color: 0xbefbf1,
            transparent: true,
            opacity: edgeOpacity,
          }),
        ),
      );
      mesh.add(edge);
    }
    return mesh;
  }

  function flatPanel(width, height, radius, material, edgeOpacity = 0) {
    const geometry = trackGeometry(
      new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 18),
    );
    const mesh = new THREE.Mesh(geometry, material);
    if (edgeOpacity > 0) {
      mesh.add(
        new THREE.LineSegments(
          trackGeometry(new THREE.EdgesGeometry(geometry, 18)),
          trackMaterial(
            new THREE.LineBasicMaterial({
              color: 0x86d8cf,
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
  function themedMaterial(lightColor, darkColor, options = {}) {
    const material = standardMaterial(lightColor, options);
    themeMaterials.push({ material, lightColor, darkColor, lightOpacity: options.opacity, darkOpacity: options.darkOpacity });
    return material;
  }

  const glassStage = new THREE.Group();
  group.add(glassStage);

  const studioPlateMaterial = themedMaterial(0xf5fffb, 0x12342f, {
    opacity: 0.5,
    darkOpacity: 0.45,
    roughness: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const formShellMaterial = themedMaterial(0xffffff, 0xe7fff8, {
    opacity: 0.84,
    darkOpacity: 0.78,
    roughness: 0.66,
    depthWrite: false,
  });
  const formFaceMaterial = themedMaterial(0xf8fffc, 0xf6fffb, {
    opacity: 0.9,
    darkOpacity: 0.86,
    roughness: 0.82,
    depthWrite: false,
  });
  const headerMaterial = themedMaterial(0x0c2a25, 0x0a221f, {
    opacity: 0.9,
    darkOpacity: 0.92,
    roughness: 0.5,
    depthWrite: false,
  });
  const fieldMaterial = themedMaterial(0xe8fbf5, 0xe4f8f2, {
    opacity: 0.94,
    darkOpacity: 0.9,
    roughness: 0.86,
    depthWrite: false,
  });
  const actionMaterial = themedMaterial(0x0f766e, 0x129586, {
    opacity: 0.96,
    darkOpacity: 0.94,
    roughness: 0.58,
    depthWrite: false,
  });
  const mutedMaterial = themedMaterial(0xeef4ef, 0x173630, {
    opacity: 0.58,
    darkOpacity: 0.44,
    roughness: 0.88,
    depthWrite: false,
  });
  const pathMaterial = lightMaterial(0x68fff0, 0.3);
  const warmGlintMaterial = lightMaterial(0xf0bd58, 0.13);
  const shadowMaterial = lightMaterial(0x06231f, 0.07);

  const studioPlate = extrudedPanel(5.66, 3.08, 0.38, 0.1, studioPlateMaterial, 0.08);
  studioPlate.position.set(0.08, 0.02, -0.76);
  studioPlate.rotation.set(0.012, -0.02, 0.006);
  glassStage.add(studioPlate);

  const contactShadow = new THREE.Mesh(
    trackGeometry(new THREE.CircleGeometry(1, 72)),
    shadowMaterial,
  );
  contactShadow.scale.set(3.05, 0.54, 1);
  contactShadow.position.set(0.46, -1.47, -0.5);
  glassStage.add(contactShadow);

  const formDepthStack = new THREE.Group();
  formDepthStack.position.set(-0.22, 0.14, -0.2);
  formDepthStack.rotation.set(0.018, -0.04, 0.01);
  group.add(formDepthStack);

  const formShell = extrudedPanel(3.54, 2.5, 0.18, 0.16, formShellMaterial, 0.1);
  formShell.position.set(0, 0, -0.08);
  formDepthStack.add(formShell);

  const formFace = flatPanel(3.25, 2.16, 0.13, formFaceMaterial, 0.04);
  formFace.position.set(0, -0.05, 0.03);
  formDepthStack.add(formFace);

  const headerBar = flatPanel(3.25, 0.34, 0.12, headerMaterial, 0);
  headerBar.position.set(0, 0.86, 0.07);
  formDepthStack.add(headerBar);

  const fieldRows = [];
  const fillRows = [];
  const rowData = [
    { y: 0.46, fill: 1.62 },
    { y: 0.1, fill: 1.42 },
    { y: -0.26, fill: 1.75 },
    { y: -0.62, fill: 1.08 },
  ];
  rowData.forEach((row, index) => {
    const base = flatPanel(2.52, 0.2, 0.045, fieldMaterial, 0.045);
    base.position.set(-0.08, row.y, 0.095 + index * 0.002);
    formDepthStack.add(base);
    fieldRows.push(base);

    const fill = flatPanel(row.fill, 0.075, 0.032, lightMaterial(0x37d8c5, 0.35), 0);
    fill.position.set(-1.34 + row.fill / 2, row.y, 0.13 + index * 0.002);
    formDepthStack.add(fill);
    fillRows.push(fill);
  });

  const safeSkipRail = flatPanel(2.52, 0.22, 0.045, mutedMaterial, 0.035);
  safeSkipRail.position.set(-0.08, -0.98, 0.095);
  formDepthStack.add(safeSkipRail);

  const profileDock = new THREE.Group();
  profileDock.position.set(1.54, 0.04, 0.12);
  profileDock.rotation.set(0.012, -0.06, -0.012);
  group.add(profileDock);

  const profileCard = extrudedPanel(1.32, 1.34, 0.14, 0.12, formShellMaterial, 0.08);
  profileDock.add(profileCard);

  const logoTile = flatPanel(0.23, 0.23, 0.055, actionMaterial, 0.04);
  logoTile.position.set(-0.43, 0.44, 0.1);
  profileDock.add(logoTile);

  const profileTitle = flatPanel(0.55, 0.07, 0.025, fieldMaterial, 0);
  profileTitle.position.set(0.08, 0.45, 0.105);
  profileDock.add(profileTitle);

  const profileField = flatPanel(1.02, 0.28, 0.055, fieldMaterial, 0.035);
  profileField.position.set(0, 0.12, 0.105);
  profileDock.add(profileField);

  const profileButton = flatPanel(1.02, 0.26, 0.055, actionMaterial, 0);
  profileButton.position.set(0, -0.31, 0.115);
  profileDock.add(profileButton);

  const undoHint = flatPanel(0.84, 0.2, 0.05, mutedMaterial, 0);
  undoHint.position.set(0, -0.69, 0.105);
  profileDock.add(undoHint);

  const warmGlint = flatPanel(0.72, 0.08, 0.035, warmGlintMaterial, 0);
  warmGlint.position.set(1.15, -1.0, 0.08);
  warmGlint.rotation.z = -0.13;
  group.add(warmGlint);

  const guidedFillCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.16, 0.17, 0.08),
    new THREE.Vector3(0.78, 0.34, 0.18),
    new THREE.Vector3(0.26, 0.42, 0.2),
    new THREE.Vector3(-0.88, 0.42, 0.18),
  ]);

  const guidedFillPath = new THREE.Mesh(
    trackGeometry(new THREE.TubeGeometry(guidedFillCurve, 54, 0.009, 8, false)),
    pathMaterial,
  );
  group.add(guidedFillPath);

  const fillCursor = flatPanel(0.16, 0.055, 0.02, lightMaterial(0xc7fff8, 0.72), 0);
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
    shadowMaterial.opacity = isDarkMode ? 0.085 : 0.06;
    pathMaterial.opacity = isDarkMode ? 0.34 : 0.27;
    warmGlintMaterial.opacity = isDarkMode ? 0.16 : 0.115;
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
    pointerX += (targetX - pointerX) * 0.04;
    pointerY += (targetY - pointerY) * 0.04;

    group.scale.setScalar(isNarrow ? 0.76 : 1);
    group.position.x = isNarrow ? 0.24 : 0.78;
    group.position.y = -0.02 + Math.sin(floatTime * 0.18) * 0.008;
    group.rotation.y = (isNarrow ? -0.035 : -0.11) + pointerX * 0.035;
    group.rotation.x = -0.045 - pointerY * 0.026;

    studioPlate.rotation.z = 0.006 + Math.sin(floatTime * 0.12) * 0.003;
    contactShadow.material.opacity = (isDarkMode ? 0.08 : 0.055) + Math.sin(floatTime * 0.2) * 0.006;
    formDepthStack.position.y = 0.14 + Math.sin(floatTime * 0.16) * 0.008;
    profileDock.position.y = 0.04 + Math.cos(floatTime * 0.14) * 0.01;
    warmGlint.material.opacity = (isDarkMode ? 0.14 : 0.095) + Math.sin(floatTime * 0.3) * 0.018;
    guidedFillPath.material.opacity = (isDarkMode ? 0.31 : 0.24) + Math.sin(floatTime * 0.28) * 0.018;

    fillRows.forEach((fill, index) => {
      fill.material.opacity = 0.27 + Math.sin(floatTime * 0.38 + index * 0.65) * 0.025;
    });
    safeSkipRail.material.opacity = isDarkMode ? 0.38 : 0.48;

    const progress = reduceMotion ? 0.72 : (seconds * 0.105) % 1;
    guidedFillCurve.getPoint(progress, cursorPoint);
    fillCursor.position.copy(cursorPoint);
    fillCursor.rotation.z = -0.04 + Math.sin(floatTime * 0.5) * 0.018;
    fillCursor.material.opacity = reduceMotion ? 0.62 : 0.62 + Math.sin(floatTime * 0.72) * 0.08;

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
