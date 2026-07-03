import * as THREE from './vendor/three.module.min.js';

(function () {
  const root = document.documentElement;
  const canvas = document.querySelector('.hero-3d-canvas');
  const hero = canvas && canvas.closest('.launch-hero');

  if (!root || !canvas || !hero) return;

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
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
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0.04, 8.7);

  const group = new THREE.Group();
  group.position.set(0.92, -0.02, 0);
  group.rotation.set(-0.035, -0.13, 0.012);
  scene.add(group);

  scene.add(new THREE.HemisphereLight(0xeafff8, 0x061a17, 1.12));

  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(3.4, 4.4, 5.8);
  scene.add(key);

  const rim = new THREE.PointLight(0x63f4e7, 1.0, 10);
  rim.position.set(-2.6, 1.2, 2.6);
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

  function makeGlassMaterial(color, opacity, roughness = 0.78) {
    return trackMaterial(
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.03,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
  }

  function makeLightMaterial(color, opacity) {
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

  function panel(width, height, radius, material, edgeOpacity = 0.08) {
    const geometry = trackGeometry(
      new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 18),
    );
    const mesh = new THREE.Mesh(geometry, material);

    if (edgeOpacity > 0) {
      mesh.add(
        new THREE.LineSegments(
          trackGeometry(new THREE.EdgesGeometry(geometry)),
          trackMaterial(
            new THREE.LineBasicMaterial({
              color: 0xbff9ef,
              transparent: true,
              opacity: edgeOpacity,
            }),
          ),
        ),
      );
    }

    return mesh;
  }

  const glassStage = new THREE.Group();
  group.add(glassStage);

  const stageMaterial = makeGlassMaterial(0xf7fffb, 0.115, 0.86);
  const depthMaterial = makeGlassMaterial(0x0f302c, 0.08, 0.82);
  const mistMaterial = makeGlassMaterial(0x68f5e7, 0.085, 0.88);
  const pathMaterial = makeLightMaterial(0x74fff0, 0.24);
  const haloMaterial = makeLightMaterial(0x5eeadd, 0.095);
  const goldMaterial = makeLightMaterial(0xf3c75d, 0.11);

  const mainStage = panel(5.7, 3.08, 0.34, stageMaterial, 0.085);
  mainStage.position.set(0.08, 0.02, -0.78);
  glassStage.add(mainStage);

  const depthShelf = panel(5.12, 2.52, 0.3, depthMaterial, 0);
  depthShelf.position.set(0.3, -0.2, -1.05);
  depthShelf.rotation.z = 0.018;
  glassStage.add(depthShelf);

  const softWash = panel(4.3, 2.0, 0.32, mistMaterial, 0);
  softWash.position.set(0.88, 0.34, -1.22);
  softWash.rotation.z = -0.025;
  glassStage.add(softWash);

  const brandHalo = new THREE.Mesh(
    trackGeometry(new THREE.TorusGeometry(1.92, 0.01, 8, 128)),
    haloMaterial,
  );
  brandHalo.position.set(0.72, -0.04, -0.62);
  brandHalo.rotation.set(0.1, 0.08, -0.22);
  group.add(brandHalo);

  const anchorGlow = new THREE.Mesh(
    trackGeometry(new THREE.TorusGeometry(0.72, 0.009, 8, 92, Math.PI * 0.52)),
    goldMaterial,
  );
  anchorGlow.position.set(1.58, -0.92, -0.56);
  anchorGlow.rotation.set(0.12, 0.04, -0.72);
  group.add(anchorGlow);

  const singleFillCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.9, 0.58, -0.16),
    new THREE.Vector3(1.18, 0.76, 0.02),
    new THREE.Vector3(0.18, 0.42, 0.05),
    new THREE.Vector3(-0.82, 0.06, -0.04),
  ]);

  const singleFillPath = new THREE.Mesh(
    trackGeometry(new THREE.TubeGeometry(singleFillCurve, 62, 0.011, 8, false)),
    pathMaterial,
  );
  group.add(singleFillPath);

  const pulse = new THREE.Group();
  const pulseCore = new THREE.Mesh(
    trackGeometry(new THREE.SphereGeometry(0.05, 16, 16)),
    makeLightMaterial(0xb8fff7, 0.68),
  );
  const pulseGlow = new THREE.Mesh(
    trackGeometry(new THREE.SphereGeometry(0.18, 16, 16)),
    makeLightMaterial(0x70fff0, 0.105),
  );
  pulse.add(pulseGlow, pulseCore);
  group.add(pulse);

  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let isVisible = true;
  let sizeNeedsUpdate = true;
  let isNarrow = false;

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
    }

    const seconds = time * 0.001;
    pointerX += (targetX - pointerX) * 0.035;
    pointerY += (targetY - pointerY) * 0.035;

    group.scale.setScalar(isNarrow ? 0.74 : 1);
    group.position.x = isNarrow ? 0.34 : 0.92;
    group.position.y = (isNarrow ? -0.02 : -0.02) + Math.sin(seconds * 0.18) * 0.008;
    group.rotation.y = (isNarrow ? -0.045 : -0.13) + pointerX * 0.04;
    group.rotation.x = -0.035 - pointerY * 0.028;

    glassStage.rotation.z = Math.sin(seconds * 0.14) * 0.003;
    mainStage.material.opacity = 0.105 + Math.sin(seconds * 0.26) * 0.008;
    softWash.material.opacity = 0.078 + Math.cos(seconds * 0.24) * 0.007;
    brandHalo.rotation.z = -0.22 + seconds * 0.026;
    brandHalo.material.opacity = 0.078 + Math.sin(seconds * 0.28) * 0.012;
    anchorGlow.rotation.z = -0.72 + Math.sin(seconds * 0.22) * 0.012;
    singleFillPath.material.opacity = 0.19 + Math.sin(seconds * 0.32) * 0.022;

    const progress = (seconds * 0.115) % 1;
    pulse.position.copy(singleFillCurve.getPoint(progress));
    pulse.scale.setScalar(0.94 + Math.sin(seconds * 0.86) * 0.07);
    pulseCore.material.opacity = 0.56 + Math.sin(seconds * 0.8) * 0.08;
    pulseGlow.material.opacity = 0.082 + Math.sin(seconds * 0.8) * 0.018;

    renderer.render(scene, camera);
  }

  function start() {
    if (reduceMotion) {
      render(0);
      return;
    }

    renderer.setAnimationLoop((time) => {
      if (isVisible) render(time);
    });
  }

  window.addEventListener(
    'pointermove',
    (event) => {
      const rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    },
    { passive: true },
  );

  window.addEventListener(
    'resize',
    () => {
      sizeNeedsUpdate = true;
      if (reduceMotion) requestAnimationFrame(() => render(0));
    },
    { passive: true },
  );

  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null);
    trackedGeometries.forEach((geometry) => geometry.dispose());
    trackedMaterials.forEach((material) => material.dispose());
    renderer.dispose();
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      sizeNeedsUpdate = true;
      if (reduceMotion) requestAnimationFrame(() => render(0));
    });
    observer.observe(canvas);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0] ? entries[0].isIntersecting : true;
      },
      { threshold: 0.02 },
    );
    observer.observe(hero);
  }

  requestAnimationFrame((time) => {
    render(time);
    root.classList.add('hero-3d-ready');
    start();
  });
})();
