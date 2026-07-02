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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.15, 9);

  const group = new THREE.Group();
  group.position.set(0.78, -0.08, 0);
  group.rotation.set(-0.08, -0.32, 0.04);
  scene.add(group);

  const ambient = new THREE.HemisphereLight(0xdffff7, 0x08231f, 1.8);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.4, 4.2, 5.2);
  scene.add(key);

  const rim = new THREE.PointLight(0x20d6c2, 3.6, 12);
  rim.position.set(-2.6, 1.8, 2.8);
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

  function roundedPanel(width, height, radius, material) {
    const geometry = new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 20);
    const mesh = new THREE.Mesh(geometry, material);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0x9de7d7,
        transparent: true,
        opacity: 0.24,
      }),
    );
    mesh.add(edge);
    return mesh;
  }

  const materialPanel = new THREE.MeshStandardMaterial({
    color: 0xf7fffb,
    roughness: 0.82,
    metalness: 0.08,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
  });
  const materialFilled = new THREE.MeshStandardMaterial({
    color: 0x20d6c2,
    roughness: 0.58,
    metalness: 0.18,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const materialInk = new THREE.MeshStandardMaterial({
    color: 0x10231f,
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const materialGold = new THREE.MeshStandardMaterial({
    color: 0xf2c14e,
    roughness: 0.42,
    metalness: 0.28,
  });
  const materialGlow = new THREE.MeshBasicMaterial({
    color: 0x5eeadd,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
  });

  const mainPanel = roundedPanel(4.5, 3.2, 0.18, materialPanel);
  mainPanel.position.set(0.18, 0.1, -0.18);
  group.add(mainPanel);

  const profilePanel = roundedPanel(1.55, 1.95, 0.18, materialInk);
  profilePanel.position.set(2.18, 0.08, 0.18);
  group.add(profilePanel);

  const rowGeometry = new THREE.BoxGeometry(2.9, 0.12, 0.028);
  const shortGeometry = new THREE.BoxGeometry(1.42, 0.1, 0.026);
  const rows = [];
  for (let index = 0; index < 7; index += 1) {
    const row = new THREE.Mesh(rowGeometry, index < 4 ? materialFilled : materialPanel);
    row.position.set(-0.58, 1.08 - index * 0.37, 0.08 + index * 0.018);
    row.scale.x = index === 2 ? 0.76 : index === 5 ? 0.64 : 1;
    group.add(row);
    rows.push(row);

    const label = new THREE.Mesh(shortGeometry, materialInk);
    label.position.set(-1.42, row.position.y + 0.15, row.position.z + 0.012);
    label.scale.x = index % 2 ? 0.66 : 0.48;
    group.add(label);
  }

  const profileBars = [];
  for (let index = 0; index < 4; index += 1) {
    const bar = new THREE.Mesh(shortGeometry, index === 0 ? materialGold : materialFilled);
    bar.position.set(2.18, 0.74 - index * 0.34, 0.34);
    bar.scale.x = index === 0 ? 0.62 : 0.82 - index * 0.08;
    profilePanel.add(bar);
    profileBars.push(bar);
  }

  const checkPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.58, -1.17, 0.34),
    new THREE.Vector3(1.92, -1.46, 0.38),
    new THREE.Vector3(2.68, -0.72, 0.4),
  ]);
  const check = new THREE.Mesh(
    new THREE.TubeGeometry(checkPath, 16, 0.035, 8, false),
    new THREE.MeshStandardMaterial({
      color: 0xf8fffc,
      roughness: 0.36,
      metalness: 0.18,
    }),
  );
  group.add(check);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.66, 0.012, 8, 72),
    materialGlow,
  );
  halo.position.set(2.2, -1.12, 0.22);
  halo.rotation.set(0.16, 0.12, -0.18);
  group.add(halo);

  function seededRandom(seed) {
    const value = Math.sin(seed * 9301 + 49297) * 233280;
    return value - Math.floor(value);
  }

  const particleGeometry = new THREE.SphereGeometry(0.026, 8, 8);
  const particleMaterial = new THREE.MeshBasicMaterial({
    color: 0x20d6c2,
    transparent: true,
    opacity: 0.54,
  });
  const particles = new THREE.InstancedMesh(particleGeometry, particleMaterial, 84);
  const particleMatrix = new THREE.Matrix4();
  const particleOffsets = [];
  for (let index = 0; index < 84; index += 1) {
    particleOffsets.push({
      x: -2.9 + seededRandom(index + 1) * 5.9,
      y: -1.72 + seededRandom(index + 21) * 3.55,
      z: -0.88 + seededRandom(index + 41) * 0.78,
      phase: seededRandom(index + 61) * Math.PI * 2,
      speed: 0.18 + seededRandom(index + 81) * 0.32,
    });
  }
  group.add(particles);

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
    pointerX += (targetX - pointerX) * 0.045;
    pointerY += (targetY - pointerY) * 0.045;

    group.rotation.y = -0.32 + pointerX * 0.15 + Math.sin(seconds * 0.32) * 0.025;
    group.rotation.x = -0.08 - pointerY * 0.09 + Math.cos(seconds * 0.28) * 0.016;
    group.position.y = -0.08 + Math.sin(seconds * 0.55) * 0.035;
    halo.rotation.z = seconds * 0.22;
    check.scale.setScalar(1 + Math.sin(seconds * 1.2) * 0.018);

    rows.forEach((row, index) => {
      row.position.z = 0.08 + index * 0.018 + Math.sin(seconds * 1.1 + index) * 0.012;
    });

    profileBars.forEach((bar, index) => {
      bar.scale.x = (index === 0 ? 0.62 : 0.82 - index * 0.08) + Math.sin(seconds * 0.95 + index) * 0.025;
    });

    for (let index = 0; index < particleOffsets.length; index += 1) {
      const point = particleOffsets[index];
      const drift = seconds * point.speed + point.phase;
      particleMatrix.makeTranslation(
        point.x + Math.sin(drift) * 0.08,
        point.y + Math.cos(drift * 0.9) * 0.06,
        point.z + Math.sin(drift * 0.7) * 0.04,
      );
      particles.setMatrixAt(index, particleMatrix);
    }
    particles.instanceMatrix.needsUpdate = true;

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
