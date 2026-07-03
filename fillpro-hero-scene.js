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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.12, 9.4);

  const group = new THREE.Group();
  group.position.set(0.92, -0.02, 0);
  group.rotation.set(-0.06, -0.24, 0.02);
  scene.add(group);

  scene.add(new THREE.HemisphereLight(0xe9fff9, 0x061c19, 1.5));

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3.2, 4.4, 5.2);
  scene.add(key);

  const rim = new THREE.PointLight(0x4af4df, 2.1, 11);
  rim.position.set(-2.7, 1.7, 2.6);
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

  function transparentMaterial(color, opacity, roughness = 0.76) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.08,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  function panel(width, height, radius, material, edgeOpacity = 0.1) {
    const geometry = new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 18);
    const mesh = new THREE.Mesh(geometry, material);
    if (edgeOpacity > 0) {
      mesh.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry),
          new THREE.LineBasicMaterial({
            color: 0xbaf7ec,
            transparent: true,
            opacity: edgeOpacity,
          }),
        ),
      );
    }
    return mesh;
  }

  const glass = transparentMaterial(0xf9fffc, 0.18, 0.82);
  const tealGlass = transparentMaterial(0x62f5e5, 0.12, 0.84);
  const tealAccent = new THREE.MeshBasicMaterial({
    color: 0x5eeadd,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const goldAccent = new THREE.MeshBasicMaterial({
    color: 0xf2c14e,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  const heroCardStack = new THREE.Group();
  group.add(heroCardStack);

  const ambientCards = [];
  [
    { x: 0.08, y: 0.18, z: -0.72, scale: 1.06, rot: -0.04, opacity: 0.13 },
    { x: 0.46, y: 0.02, z: -1.02, scale: 0.9, rot: 0.055, opacity: 0.09 },
    { x: -0.34, y: 0.48, z: -1.22, scale: 0.72, rot: -0.095, opacity: 0.07 },
  ].forEach((card) => {
    const mesh = panel(4.8, 3.4, 0.26, tealGlass.clone(), 0.08);
    mesh.material.opacity = card.opacity;
    mesh.position.set(card.x, card.y, card.z);
    mesh.rotation.z = card.rot;
    mesh.scale.setScalar(card.scale);
    mesh.userData = { baseY: card.y, baseRot: card.rot };
    heroCardStack.add(mesh);
    ambientCards.push(mesh);
  });

  const mainFormCard = panel(4.6, 3.16, 0.24, glass, 0.11);
  mainFormCard.position.set(-0.06, 0.04, -0.46);
  mainFormCard.rotation.z = 0.012;
  heroCardStack.add(mainFormCard);

  const profileDock = panel(1.24, 1.82, 0.22, tealGlass.clone(), 0.08);
  profileDock.position.set(2.18, 0.1, -0.38);
  profileDock.rotation.set(0.02, -0.08, -0.02);
  profileDock.material.opacity = 0.1;
  group.add(profileDock);

  const uploadBadge = panel(1.16, 0.34, 0.12, glass.clone(), 0.08);
  uploadBadge.position.set(-0.58, -1.34, -0.22);
  uploadBadge.material.opacity = 0.14;
  group.add(uploadBadge);

  const reviewBadge = panel(1.34, 0.44, 0.13, glass.clone(), 0.08);
  reviewBadge.position.set(1.06, -1.24, -0.16);
  reviewBadge.rotation.z = -0.03;
  reviewBadge.material.opacity = 0.13;
  group.add(reviewBadge);

  const confidenceRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.98, 0.012, 8, 112),
    new THREE.MeshBasicMaterial({
      color: 0x5eeadd,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  confidenceRing.position.set(0.42, -0.1, -0.6);
  confidenceRing.rotation.set(0.16, 0.1, -0.24);
  group.add(confidenceRing);

  const goldArc = new THREE.Mesh(
    new THREE.TorusGeometry(1.16, 0.014, 8, 84, Math.PI * 0.46),
    goldAccent,
  );
  goldArc.position.set(1.6, -1.18, -0.28);
  goldArc.rotation.set(0.2, 0.06, -0.62);
  group.add(goldArc);

  const flowCurves = [
    [new THREE.Vector3(1.84, 0.52, -0.18), new THREE.Vector3(0.64, 0.92, 0.02), new THREE.Vector3(-0.34, 0.56, -0.02)],
    [new THREE.Vector3(1.82, 0.12, -0.18), new THREE.Vector3(0.55, 0.18, 0.03), new THREE.Vector3(-0.38, 0.08, -0.01)],
    [new THREE.Vector3(1.72, -0.42, -0.18), new THREE.Vector3(0.36, -0.82, 0.02), new THREE.Vector3(-0.58, -1.3, -0.02)],
  ].map((points) => new THREE.CatmullRomCurve3(points));

  const flowLines = flowCurves.map((curve, index) => {
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 42, 0.01, 8, false),
      index === 2 ? goldAccent.clone() : tealAccent.clone(),
    );
    mesh.material.opacity = index === 2 ? 0.16 : 0.18;
    group.add(mesh);
    return mesh;
  });

  const pulseGeometry = new THREE.SphereGeometry(0.052, 14, 14);
  const glowGeometry = new THREE.SphereGeometry(0.105, 14, 14);
  const flowPulses = flowCurves.map((curve, index) => {
    const pulse = new THREE.Group();
    const color = index === 2 ? 0xf2c14e : 0x9ffcf0;
    const core = new THREE.Mesh(
      pulseGeometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    );
    const glow = new THREE.Mesh(
      glowGeometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    );
    pulse.add(glow, core);
    pulse.userData = {
      curve,
      offset: index * 0.3,
      speed: 0.13 + index * 0.02,
      core,
      glow,
    };
    group.add(pulse);
    return pulse;
  });

  function seededRandom(seed) {
    const value = Math.sin(seed * 9301 + 49297) * 233280;
    return value - Math.floor(value);
  }

  const particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
  const particleMaterial = new THREE.MeshBasicMaterial({
    color: 0x20d6c2,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const quietParticles = new THREE.InstancedMesh(particleGeometry, particleMaterial, 36);
  const particleMatrix = new THREE.Matrix4();
  const particleOffsets = [];
  for (let index = 0; index < 36; index += 1) {
    particleOffsets.push({
      x: -2.65 + seededRandom(index + 1) * 5.15,
      y: -1.52 + seededRandom(index + 21) * 3.02,
      z: -1.12 + seededRandom(index + 41) * 0.54,
      phase: seededRandom(index + 61) * Math.PI * 2,
      speed: 0.12 + seededRandom(index + 81) * 0.18,
    });
  }
  group.add(quietParticles);

  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let isVisible = true;
  let sizeNeedsUpdate = true;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 1);
    const height = Math.max(Math.floor(rect.height), 1);
    const drawingWidth = Math.floor(width * renderer.getPixelRatio());
    const drawingHeight = Math.floor(height * renderer.getPixelRatio());
    if (canvas.width === drawingWidth && canvas.height === drawingHeight) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render(time) {
    if (sizeNeedsUpdate) {
      sizeNeedsUpdate = false;
      resize();
    }

    const seconds = time * 0.001;
    pointerX += (targetX - pointerX) * 0.035;
    pointerY += (targetY - pointerY) * 0.035;

    group.rotation.y = -0.24 + pointerX * 0.08 + Math.sin(seconds * 0.24) * 0.012;
    group.rotation.x = -0.06 - pointerY * 0.055 + Math.cos(seconds * 0.2) * 0.01;
    group.position.y = -0.02 + Math.sin(seconds * 0.38) * 0.018;
    heroCardStack.rotation.z = Math.sin(seconds * 0.18) * 0.006;
    profileDock.position.y = 0.1 + Math.cos(seconds * 0.42) * 0.014;
    uploadBadge.position.y = -1.34 + Math.sin(seconds * 0.48) * 0.012;
    reviewBadge.position.y = -1.24 + Math.cos(seconds * 0.44) * 0.012;
    confidenceRing.rotation.z = seconds * 0.09;
    confidenceRing.material.opacity = 0.13 + Math.sin(seconds * 0.58) * 0.025;
    goldArc.rotation.z = -0.62 + Math.sin(seconds * 0.34) * 0.025;

    ambientCards.forEach((card, index) => {
      card.position.y = card.userData.baseY + Math.sin(seconds * 0.24 + index) * 0.016;
      card.rotation.z = card.userData.baseRot + Math.cos(seconds * 0.21 + index) * 0.008;
    });

    flowLines.forEach((line, index) => {
      line.material.opacity = (index === 2 ? 0.14 : 0.16) + Math.sin(seconds * 0.64 + index) * 0.025;
    });

    flowPulses.forEach((pulse, index) => {
      const progress = (seconds * pulse.userData.speed + pulse.userData.offset) % 1;
      pulse.position.copy(pulse.userData.curve.getPoint(progress));
      pulse.userData.core.material.opacity = 0.5 + Math.sin(seconds * 1.25 + index) * 0.14;
      pulse.userData.glow.material.opacity = 0.08 + Math.sin(seconds * 1.25 + index) * 0.03;
      pulse.scale.setScalar(0.9 + Math.sin(seconds * 1.4 + index) * 0.1);
    });

    for (let index = 0; index < particleOffsets.length; index += 1) {
      const point = particleOffsets[index];
      const drift = seconds * point.speed + point.phase;
      particleMatrix.makeTranslation(
        point.x + Math.sin(drift) * 0.045,
        point.y + Math.cos(drift * 0.88) * 0.04,
        point.z + Math.sin(drift * 0.7) * 0.03,
      );
      quietParticles.setMatrixAt(index, particleMatrix);
    }
    quietParticles.instanceMatrix.needsUpdate = true;

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
