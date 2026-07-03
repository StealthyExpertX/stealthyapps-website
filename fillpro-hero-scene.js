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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
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

  function cloneMaterial(material) {
    return trackMaterial(material.clone());
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 100);
  camera.position.set(0, 0.05, 9.2);

  const group = new THREE.Group();
  group.position.set(0.88, -0.02, 0);
  group.rotation.set(-0.05, -0.18, 0.018);
  scene.add(group);

  scene.add(new THREE.HemisphereLight(0xeafff8, 0x061a17, 1.2));

  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3.4, 4.2, 5.6);
  scene.add(key);

  const rim = new THREE.PointLight(0x57f1e1, 1.4, 10);
  rim.position.set(-2.8, 1.4, 2.8);
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

  function transparentMaterial(color, opacity, roughness = 0.8) {
    return trackMaterial(
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.05,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
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

  const stageGlass = transparentMaterial(0xf7fffb, 0.13, 0.84);
  const tealMist = transparentMaterial(0x68f5e7, 0.1, 0.86);
  const inkGlass = transparentMaterial(0x0f302c, 0.11, 0.76);
  const tealLine = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x72fff0,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  );
  const goldLine = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xf3c75d,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );

  const glassStage = new THREE.Group();
  group.add(glassStage);

  const rearHalo = panel(5.7, 3.15, 0.3, tealMist, 0.06);
  rearHalo.position.set(0.16, 0.18, -1.08);
  rearHalo.rotation.z = -0.035;
  glassStage.add(rearHalo);

  const mainPlane = panel(5.25, 2.82, 0.28, stageGlass, 0.1);
  mainPlane.position.set(0, 0, -0.55);
  glassStage.add(mainPlane);

  const shadowPlane = panel(4.8, 2.48, 0.24, inkGlass, 0);
  shadowPlane.position.set(0.18, -0.18, -0.85);
  shadowPlane.rotation.z = 0.04;
  glassStage.add(shadowPlane);

  const fieldRails = [];
  [-0.62, -0.22, 0.18, 0.58].forEach((y, index) => {
    const rail = panel(2.95 - index * 0.14, 0.1, 0.05, cloneMaterial(tealMist), 0);
    rail.material.opacity = 0.08 + index * 0.012;
    rail.position.set(-0.54, y, -0.4 + index * 0.012);
    glassStage.add(rail);
    fieldRails.push(rail);
  });

  const profileSignal = panel(1.36, 0.62, 0.18, cloneMaterial(stageGlass), 0.12);
  profileSignal.position.set(1.72, 0.62, -0.32);
  profileSignal.rotation.set(0.02, -0.08, -0.025);
  profileSignal.material.opacity = 0.16;
  group.add(profileSignal);

  const signalCore = panel(0.86, 0.18, 0.08, cloneMaterial(tealMist), 0);
  signalCore.position.set(1.7, 0.64, -0.24);
  signalCore.material.opacity = 0.22;
  group.add(signalCore);

  const reviewHalo = new THREE.Mesh(
    trackGeometry(new THREE.TorusGeometry(1.55, 0.012, 8, 112)),
    trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0x5eeadd,
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
      }),
    ),
  );
  reviewHalo.position.set(0.42, -0.16, -0.68);
  reviewHalo.rotation.set(0.14, 0.08, -0.18);
  group.add(reviewHalo);

  const singleFillCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.52, 0.53, -0.16),
    new THREE.Vector3(0.88, 0.72, 0.02),
    new THREE.Vector3(0.08, 0.38, 0.04),
    new THREE.Vector3(-0.72, 0.1, -0.03),
  ]);

  const singleFillPath = new THREE.Mesh(
    trackGeometry(new THREE.TubeGeometry(singleFillCurve, 54, 0.009, 8, false)),
    tealLine,
  );
  group.add(singleFillPath);

  const pulse = new THREE.Group();
  const pulseCore = new THREE.Mesh(
    trackGeometry(new THREE.SphereGeometry(0.045, 14, 14)),
    trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xa7fff4,
        transparent: true,
        opacity: 0.64,
        depthWrite: false,
      }),
    ),
  );
  const pulseGlow = new THREE.Mesh(
    trackGeometry(new THREE.SphereGeometry(0.13, 14, 14)),
    trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0x70fff0,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    ),
  );
  pulse.add(pulseGlow, pulseCore);
  group.add(pulse);

  const goldAccent = new THREE.Mesh(
    trackGeometry(new THREE.TorusGeometry(0.92, 0.012, 8, 86, Math.PI * 0.42)),
    goldLine,
  );
  goldAccent.position.set(1.05, -0.92, -0.44);
  goldAccent.rotation.set(0.18, 0.06, -0.68);
  group.add(goldAccent);

  function seededRandom(seed) {
    const value = Math.sin(seed * 9301 + 49297) * 233280;
    return value - Math.floor(value);
  }

  const nodeGeometry = trackGeometry(new THREE.SphereGeometry(0.018, 8, 8));
  const nodeMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x20d6c2,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  const ambientNodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, 14);
  const nodeMatrix = new THREE.Matrix4();
  const nodeOffsets = [];
  for (let index = 0; index < 14; index += 1) {
    nodeOffsets.push({
      x: -2.35 + seededRandom(index + 1) * 4.65,
      y: -1.22 + seededRandom(index + 21) * 2.52,
      z: -1.05 + seededRandom(index + 41) * 0.46,
      phase: seededRandom(index + 61) * Math.PI * 2,
      speed: 0.08 + seededRandom(index + 81) * 0.11,
    });
  }
  group.add(ambientNodes);

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
    pointerX += (targetX - pointerX) * 0.03;
    pointerY += (targetY - pointerY) * 0.03;

    const baseY = isNarrow ? -0.08 : -0.02;
    group.scale.setScalar(isNarrow ? 0.82 : 1);
    group.position.x = isNarrow ? 0.42 : 0.88;
    group.position.y = baseY + Math.sin(seconds * 0.24) * 0.01;
    group.rotation.y = (isNarrow ? -0.08 : -0.18) + pointerX * 0.045;
    group.rotation.x = -0.05 - pointerY * 0.035;

    glassStage.rotation.z = -0.002 + Math.sin(seconds * 0.16) * 0.004;
    rearHalo.position.y = 0.18 + Math.sin(seconds * 0.2) * 0.012;
    profileSignal.position.y = 0.62 + Math.cos(seconds * 0.3) * 0.01;
    signalCore.position.y = 0.64 + Math.cos(seconds * 0.3) * 0.01;
    reviewHalo.rotation.z = -0.18 + seconds * 0.035;
    reviewHalo.material.opacity = 0.085 + Math.sin(seconds * 0.34) * 0.018;
    goldAccent.rotation.z = -0.68 + Math.sin(seconds * 0.28) * 0.014;

    fieldRails.forEach((rail, index) => {
      rail.material.opacity = 0.075 + index * 0.012 + Math.sin(seconds * 0.42 + index) * 0.008;
    });

    singleFillPath.material.opacity = 0.13 + Math.sin(seconds * 0.36) * 0.022;

    const progress = (seconds * 0.1) % 1;
    pulse.position.copy(singleFillCurve.getPoint(progress));
    pulseCore.material.opacity = 0.5 + Math.sin(seconds * 0.9) * 0.1;
    pulseGlow.material.opacity = 0.06 + Math.sin(seconds * 0.9) * 0.02;
    pulse.scale.setScalar(0.94 + Math.sin(seconds * 0.94) * 0.08);

    for (let index = 0; index < nodeOffsets.length; index += 1) {
      const point = nodeOffsets[index];
      const drift = seconds * point.speed + point.phase;
      nodeMatrix.makeTranslation(
        point.x + Math.sin(drift) * 0.026,
        point.y + Math.cos(drift * 0.88) * 0.024,
        point.z,
      );
      ambientNodes.setMatrixAt(index, nodeMatrix);
    }
    ambientNodes.instanceMatrix.needsUpdate = true;

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
