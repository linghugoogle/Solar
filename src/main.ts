import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import gsap from 'gsap';

// --- Scene Setup ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
// Initial camera position, pulled way back to see the whole system and feel the vastness
camera.position.set(0, 1500, 3000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Simplified tone mapping to avoid darkening the scene too much
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.toneMappingExposure = 1.0;

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';

const appDiv = document.querySelector<HTMLDivElement>('#app');
if (appDiv) {
  appDiv.innerHTML = '';
  appDiv.appendChild(renderer.domElement);
  appDiv.appendChild(labelRenderer.domElement);
}

// --- Controls ---
// Important: Attach OrbitControls to renderer.domElement since labelRenderer has pointerEvents = 'none'
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
// Increase maxDistance drastically to allow zooming out in the new vast scale
controls.maxDistance = 20000;
controls.minDistance = 1;

// --- Texture Loader ---
const textureLoader = new THREE.TextureLoader();

// --- Deep Space Background (Particle Starfield) ---
// Remove the flat static universe image texture map
scene.background = new THREE.Color(0x020205); // Very deep space blue/black

const starsGeometry = new THREE.BufferGeometry();
const starsCount = 5000;
const posArray = new Float32Array(starsCount * 3);
const colorsArray = new Float32Array(starsCount * 3);

for(let i = 0; i < starsCount * 3; i+=3) {
    // Generate points in a vast sphere, avoiding the immediate center
    const radius = 500 + Math.random() * 4500; // Between 500 and 5000 units away
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos((Math.random() * 2) - 1);

    posArray[i] = radius * Math.sin(phi) * Math.cos(theta);     // x
    posArray[i+1] = radius * Math.sin(phi) * Math.sin(theta);   // y
    posArray[i+2] = radius * Math.cos(phi);                     // z

    // Subtle star colors (white, slight blue, slight yellow)
    const starType = Math.random();
    let r=1, g=1, b=1;
    if (starType > 0.8) { r = 0.8; g = 0.9; b = 1.0; } // Bluish
    else if (starType < 0.2) { r = 1.0; g = 0.9; b = 0.8; } // Yellowish
    else { r = 0.9; g = 0.9; b = 0.9; } // White/Dim

    // Randomize brightness
    const brightness = 0.3 + Math.random() * 0.7;
    colorsArray[i] = r * brightness;
    colorsArray[i+1] = g * brightness;
    colorsArray[i+2] = b * brightness;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
starsGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

// Create a circular texture for stars programmatically so they aren't square
const canvas = document.createElement('canvas');
canvas.width = 16;
canvas.height = 16;
const context = canvas.getContext('2d')!;
const gradient = context.createRadialGradient(8, 8, 0, 8, 8, 8);
gradient.addColorStop(0, 'rgba(255,255,255,1)');
gradient.addColorStop(1, 'rgba(255,255,255,0)');
context.fillStyle = gradient;
context.fillRect(0, 0, 16, 16);
const starTexture = new THREE.CanvasTexture(canvas);

const starsMaterial = new THREE.PointsMaterial({
    size: 4,
    map: starTexture,
    transparent: true,
    vertexColors: true,
    depthWrite: false, // Prevents weird clipping with planets
    blending: THREE.AdditiveBlending
});

const starMesh = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starMesh);

// --- Lighting ---
// Low ambient light for realistic deep space feel
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // increased slightly for better visibility
scene.add(ambientLight);

// Point light representing the sun's illumination
const sunLight = new THREE.PointLight(0xffffff, 5, 5000, 0); // Intensity 5, long distance, 0 decay
scene.add(sunLight);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(30, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: textureLoader.load('/textures/sun.jpg'),
});
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

// Subtle sun glow
const glowGeometry = new THREE.SphereGeometry(32, 64, 64);
const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffaa00,
  transparent: true,
  opacity: 0.1,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
});
const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
scene.add(glowMesh);

// --- Planets Data ---
// To make the solar system feel truly vast like NASA Eyes, we use a logarithmic/compressed scale.
// If we used a strict 1:1 scale, the planets would be invisible sub-pixels.
// We make the distances huge, and the planets small, but large enough to see when zoomed in.
interface PlanetConfig {
  name: string;
  radius: number;
  distance: number;
  revolutionSpeed: number;
  rotationSpeed: number;
  texture: string;
  hasRing?: boolean;
  ringInner?: number;
  ringOuter?: number;
  ringTexture?: string;
  moons?: PlanetConfig[];
}

// Base scale factors
const R_EARTH = 1; // Earth radius = 1 unit
const D_EARTH = 300; // Earth distance = 300 units

const planetsData: PlanetConfig[] = [
  // Mercury: Real radius ~0.38x Earth, Distance ~0.39x Earth
  { name: 'Mercury', radius: R_EARTH * 0.38, distance: D_EARTH * 0.39, revolutionSpeed: 0.0004, rotationSpeed: 0.0005, texture: '/textures/mercury.jpg' },
  // Venus: Real radius ~0.95x Earth, Distance ~0.72x Earth
  { name: 'Venus', radius: R_EARTH * 0.95, distance: D_EARTH * 0.72, revolutionSpeed: 0.0003, rotationSpeed: 0.0002, texture: '/textures/venus.jpg' },
  // Earth: 1x, 1x
  { name: 'Earth', radius: R_EARTH, distance: D_EARTH, revolutionSpeed: 0.0002, rotationSpeed: 0.001, texture: '/textures/earth.jpg',
    moons: [
      { name: 'Moon', radius: R_EARTH * 0.27, distance: 5, revolutionSpeed: 0.005, rotationSpeed: 0.0005, texture: '/textures/moon.jpg' }
    ]
  },
  // Mars: Real radius ~0.53x Earth, Distance ~1.52x Earth
  { name: 'Mars', radius: R_EARTH * 0.53, distance: D_EARTH * 1.52, revolutionSpeed: 0.0001, rotationSpeed: 0.0009, texture: '/textures/mars.jpg' },
  // Jupiter: Real radius ~11.2x Earth. We cap it slightly so it doesn't dominate too much. Distance ~5.2x Earth
  { name: 'Jupiter', radius: R_EARTH * 8, distance: D_EARTH * 3.5, revolutionSpeed: 0.00004, rotationSpeed: 0.002, texture: '/textures/jupiter.jpg' },
  // Saturn: Real radius ~9.4x Earth. Distance ~9.5x Earth
  { name: 'Saturn', radius: R_EARTH * 7, distance: D_EARTH * 5.5, revolutionSpeed: 0.00003, rotationSpeed: 0.0018, texture: '/textures/saturn.jpg',
    hasRing: true, ringInner: R_EARTH * 9, ringOuter: R_EARTH * 15, ringTexture: '/textures/saturn_ring.png'
  },
  // Uranus: Real radius ~4x Earth. Distance ~19.2x Earth
  { name: 'Uranus', radius: R_EARTH * 4, distance: D_EARTH * 7.5, revolutionSpeed: 0.00002, rotationSpeed: 0.0015, texture: '/textures/uranus.jpg' },
  // Neptune: Real radius ~3.8x Earth. Distance ~30x Earth
  { name: 'Neptune', radius: R_EARTH * 3.8, distance: D_EARTH * 9.5, revolutionSpeed: 0.00001, rotationSpeed: 0.0016, texture: '/textures/neptune.jpg' }
];

const planets: { pivot: THREE.Group, mesh: THREE.Mesh, config: PlanetConfig, isMoon?: boolean, orbitLine?: THREE.Line, label?: CSS2DObject }[] = [];

// UI State
let showOrbits = false;
let showLabels = false;

// --- Create Celestial Bodies ---
function createBody(config: PlanetConfig, isMoon = false) {
  const pivot = new THREE.Group();

  const geometry = new THREE.SphereGeometry(config.radius, 64, 64);
  const material = new THREE.MeshStandardMaterial({
    map: textureLoader.load(config.texture),
    roughness: 0.6,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.x = config.distance;

  pivot.add(mesh);

  // Orbit Line
  const orbitGeometry = new THREE.BufferGeometry();
  const orbitPoints = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    // Keep Y at 0, draw circle on XZ plane
    orbitPoints.push(new THREE.Vector3(Math.cos(theta) * config.distance, 0, Math.sin(theta) * config.distance));
  }
  orbitGeometry.setFromPoints(orbitPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
  const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
  // Do not rotate the orbit line. The circle is already drawn on the XZ plane.
  orbitLine.visible = showOrbits;
  // Add orbit line directly to scene so it doesn't rotate with pivot
  if (!isMoon) {
    scene.add(orbitLine);
  }

  // Label
  const labelDiv = document.createElement('div');
  labelDiv.className = 'planet-label';
  labelDiv.textContent = config.name;
  labelDiv.style.visibility = showLabels ? 'visible' : 'hidden';
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, config.radius + 1, 0);
  mesh.add(label);

  // Add rings if present
  if (config.hasRing && config.ringTexture && config.ringInner && config.ringOuter) {
    const ringGeometry = new THREE.RingGeometry(config.ringInner, config.ringOuter, 64);

    // Using MeshStandardMaterial or MeshBasicMaterial. Basic works better with transparency
    const ringMaterial = new THREE.MeshBasicMaterial({
      map: textureLoader.load(config.ringTexture),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.05
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    // slightly tilt the ring for realism
    ring.rotation.y = 0.2;
    mesh.add(ring);
  }

  // Moons
  if (config.moons) {
    config.moons.forEach(moonConfig => {
      const moon = createBody(moonConfig, true);
      // For moons, orbit lines should be relative to the planet
      if (moon.orbitLine) {
        moon.orbitLine.rotation.x = 0; // Reset, parent mesh handles it
        mesh.add(moon.orbitLine);
      }
      mesh.add(moon.pivot);
    });
  }

  // Initial random angles
  pivot.rotation.y = Math.random() * Math.PI * 2;
  mesh.rotation.y = Math.random() * Math.PI * 2;

  // Axial tilt
  mesh.rotation.z = Math.random() * 0.4;

  planets.push({ pivot, mesh, config, isMoon, orbitLine, label });
  return { pivot, mesh, orbitLine };
}

planetsData.forEach(planetConfig => {
  const { pivot } = createBody(planetConfig);
  scene.add(pivot);
});

// --- Raycaster for 3D Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentTarget: THREE.Object3D | null = null;
let isAnimating = false; // True only during the GSAP fly-to animation
let isUserInteracting = false; // True when user is dragging the mouse
const cameraOffset = new THREE.Vector3();

window.addEventListener('click', (event) => {
  // Ignore clicks if user was just dragging
  if (isUserInteracting) return;
  // Normalize mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersectableMeshes = planets.map(p => p.mesh).concat(sunMesh);
  const intersects = raycaster.intersectObjects(intersectableMeshes);

  if (intersects.length > 0) {
    const target = intersects[0].object;
    focusOn(target);
  } else {
    // Clicked empty space: reset to sun
    focusOn(sunMesh);
  }
});

function focusOn(target: THREE.Object3D) {
  currentTarget = target;
  isAnimating = true;

  let targetRadius = 30; // default for sun
  const targetMesh = target as THREE.Mesh;
  if (targetMesh.geometry instanceof THREE.SphereGeometry) {
    targetRadius = targetMesh.geometry.parameters.radius;
  }

  const dist = targetRadius * 4;

  const targetWorldPos = new THREE.Vector3();
  target.getWorldPosition(targetWorldPos);

  // Smoothly move the controls target
  gsap.to(controls.target, {
    x: targetWorldPos.x,
    y: targetWorldPos.y,
    z: targetWorldPos.z,
    duration: 1.5,
    ease: "power2.inOut"
  });

  // Calculate the current relative direction from target to camera
  const currentDirection = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();

  // If the camera is right on top of the target (e.g. initial load), provide a default offset direction
  if (currentDirection.lengthSq() === 0) {
    currentDirection.set(1, 0.5, 1).normalize();
  }

  // Set the new camera offset based on the current user perspective but at the new distance
  cameraOffset.copy(currentDirection).multiplyScalar(dist);
  const targetCameraPos = targetWorldPos.clone().add(cameraOffset);

  gsap.to(camera.position, {
    x: targetCameraPos.x,
    y: targetCameraPos.y,
    z: targetCameraPos.z,
    duration: 1.5,
    ease: "power2.inOut",
    onComplete: () => {
      isAnimating = false;
    }
  });
}

// Interruption flags
controls.addEventListener('start', () => {
  isUserInteracting = true;
});

controls.addEventListener('end', () => {
  // Add a tiny delay so the click event doesn't trigger a focus right after dragging ends
  setTimeout(() => {
    isUserInteracting = false;
  }, 50);
});

// Update the offset when the user manually moves the camera
controls.addEventListener('change', () => {
  if (currentTarget && !isAnimating) {
    const targetWorldPos = new THREE.Vector3();
    currentTarget.getWorldPosition(targetWorldPos);

    // When user drags, they change the camera position relative to the target.
    // We record this new relative offset so we can maintain it as the planet moves.
    cameraOffset.subVectors(camera.position, controls.target);
  }
});

// --- Resize Handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// --- UI Interaction ---
document.getElementById('toggle-orbits')?.addEventListener('click', (e) => {
  showOrbits = !showOrbits;
  const btn = e.target as HTMLButtonElement;
  btn.classList.toggle('active', showOrbits);
  btn.textContent = showOrbits ? 'Hide Orbits' : 'Show Orbits';

  planets.forEach(p => {
    if (p.orbitLine) p.orbitLine.visible = showOrbits;
  });
});

document.getElementById('toggle-labels')?.addEventListener('click', (e) => {
  showLabels = !showLabels;
  const btn = e.target as HTMLButtonElement;
  btn.classList.toggle('active', showLabels);
  btn.textContent = showLabels ? 'Hide Labels' : 'Show Labels';

  planets.forEach(p => {
    if (p.label) {
      p.label.element.style.visibility = showLabels ? 'visible' : 'hidden';
    }
  });
});

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  // Revolutions and rotations
  planets.forEach(p => {
    p.mesh.rotation.y += p.config.rotationSpeed;
    p.pivot.rotation.y += p.config.revolutionSpeed;
  });

  sunMesh.rotation.y += 0.0002;

  // Track target continuously so camera stays centered on moving planet
  if (currentTarget) {
    const targetWorldPos = new THREE.Vector3();
    currentTarget.getWorldPosition(targetWorldPos);

    // Only strictly lock the target if we are not actively animating to it
    // and user hasn't interrupted
    if (!isAnimating && !isUserInteracting) {
      controls.target.copy(targetWorldPos);
      // Keep the camera at the user-defined offset from the moving target
      camera.position.copy(targetWorldPos).add(cameraOffset);
    }
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();
