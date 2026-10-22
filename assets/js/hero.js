// Home hero: the Earth seen from orbit, then a catchment cut open to show the water cycle.
// Without WebGL the module stops here and the hero keeps its sky gradient, name and links.
import * as THREE from '../vendor/three-0.160.0.module.min.js';

const hero = document.getElementById('hero');
const canvas = hero.querySelector('.hero-canvas');
const flash = hero.querySelector('.hero-flash');
const labelsEl = hero.querySelector('.hero-labels');
const base = hero.dataset.assets;
const topbar = document.querySelector('.topbar');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

// Fading a whole group: every material remembers its own opacity.
function fadable(material, base = 1) { material.transparent = true; material.userData.base = base; material.opacity = base; return material; }
function setFade(group, f) {
  group.visible = f > 0.002;
  group.traverse(o => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (m.uniforms && m.uniforms.uFade) m.uniforms.uFade.value = f;
      else if (m.userData.base !== undefined) m.opacity = m.userData.base * f;
    }
  });
}

const NOISE = `
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }`;

function softDot(size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const DOT = softDot();

/* ---------- Scene 1: Earth seen from orbit ---------- */
const globeScene = new THREE.Scene();
const globeCam = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
globeScene.add(new THREE.HemisphereLight(0xffffff, 0x5d8fc4, 1.6));
const sunG = new THREE.DirectionalLight(0xffffff, 2.2); sunG.position.set(-3, 2, 4); globeScene.add(sunG);

const globe = new THREE.Group(); globeScene.add(globe);
const tilt = new THREE.Group(); tilt.rotation.z = THREE.MathUtils.degToRad(-23.4); globe.add(tilt);
const spin = new THREE.Group(); tilt.add(spin);
const earthTex = await new THREE.TextureLoader().loadAsync(base + (innerWidth < 760 ? 'earth_2k.webp' : 'earth.webp'));
earthTex.colorSpace = THREE.SRGBColorSpace; earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), fadable(new THREE.MeshLambertMaterial({ map: earthTex })));
spin.add(earth);

const cloudMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uTime: { value: 0 }, uFade: { value: 1 }, uSun: { value: new THREE.Vector3(-3, 2, 4).normalize() } },
  vertexShader: `varying vec3 vP; varying vec3 vN; void main() { vP = position; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `${NOISE}
  uniform float uTime; uniform float uFade; uniform vec3 uSun; varying vec3 vP; varying vec3 vN;
  void main() {
    float lat = asin(clamp(vP.y, -1.0, 1.0)) * 57.2958;
    float bands = 0.16 * exp(-pow(lat / 9.0, 2.0)) + 0.12 * exp(-pow((abs(lat) - 52.0) / 11.0, 2.0));
    float n = fbm(vP * 3.2 + vec3(uTime * 0.015, 0.0, uTime * 0.01)) + bands;
    float a = smoothstep(0.58, 0.82, n) * 0.85;
    float light = 0.65 + 0.35 * max(dot(normalize(vN), uSun), 0.0);
    gl_FragColor = vec4(vec3(light), a * uFade);
  }`
});
spin.add(new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 72), cloudMat));

const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.055, 64, 48), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  uniforms: { uFade: { value: 1 } },
  vertexShader: `varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uFade; varying vec3 vN; void main() { float i = pow(clamp(0.62 + dot(vN, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 4.0); gl_FragColor = vec4(vec3(1.0), i * 0.5 * uFade); }`
}));
globe.add(atmo);

// Satellites on circular orbits; each looks straight down and leaves its ground track on the turning Earth.
const trailMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uFade: { value: 1 } },
  vertexShader: `attribute float a; varying float vA; void main() { vA = a; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uFade; varying float vA; void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, vA * uFade); }`
});
function satellite() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.036, 0.036), fadable(new THREE.MeshLambertMaterial({ color: 0xf4f6f8 })));
  const panelMat = fadable(new THREE.MeshLambertMaterial({ color: 0x1d3f72, emissive: 0x0a1f3d }));
  const panel = new THREE.BoxGeometry(0.12, 0.004, 0.042);
  const p1 = new THREE.Mesh(panel, panelMat); p1.position.x = 0.09;
  const p2 = new THREE.Mesh(panel, panelMat); p2.position.x = -0.09;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.004, 0.02, 16), fadable(new THREE.MeshLambertMaterial({ color: 0xffffff })));
  dish.position.y = -0.028;
  g.add(body, p1, p2, dish);
  return g;
}
const sats = [
  { r: 1.24, inc: 65, raan: 20, period: 6, phase: 0.2 },
  { r: 1.34, inc: 98, raan: 140, period: 8, phase: 0.6 },
  { r: 1.45, inc: 30, raan: 260, period: 10, phase: 0.0 }
].map(o => {
  const pivot = new THREE.Group(); pivot.rotation.y = THREE.MathUtils.degToRad(o.raan);
  const plane = new THREE.Group(); plane.rotation.x = THREE.MathUtils.degToRad(o.inc); pivot.add(plane); globe.add(pivot);
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 180 }, (_, i) => new THREE.Vector3(Math.cos(i / 180 * Math.PI * 2) * o.r, 0, Math.sin(i / 180 * Math.PI * 2) * o.r))),
    fadable(new THREE.LineBasicMaterial({ color: 0xffffff }), 0.32));
  plane.add(ring);
  const sat = satellite(); plane.add(sat);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.075, o.r - 1, 32, 1, true),
    fadable(new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 0.16));
  globe.add(beam);
  const foot = new THREE.Sprite(fadable(new THREE.SpriteMaterial({ map: DOT, depthWrite: false }), 0.95)); foot.scale.setScalar(0.09); globe.add(foot);
  const N = 220, pos = new Float32Array(N * 3), alpha = new Float32Array(N);
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('a', new THREE.BufferAttribute(alpha, 1));
  const trail = new THREE.Line(tg, trailMat()); trail.frustumCulled = false; spin.add(trail);
  return { ...o, sat, beam, foot, trail, pts: [] };
});

const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
function updateSats(t) {
  for (const s of sats) {
    const th = (t / s.period + s.phase) * Math.PI * 2;
    s.sat.position.set(Math.cos(th) * s.r, 0, Math.sin(th) * s.r);
    s.sat.lookAt(0, 0, 0);
    const w = s.sat.getWorldPosition(new THREE.Vector3());
    const local = globe.worldToLocal(w.clone());
    const dir = local.clone().normalize();
    s.beam.position.copy(dir.clone().multiplyScalar((s.r + 1) / 2));
    s.beam.quaternion.setFromUnitVectors(up, dir);
    s.foot.position.copy(dir.clone().multiplyScalar(1.004));
    const g = spin.worldToLocal(dir.clone().multiplyScalar(1.004).applyMatrix4(globe.matrixWorld));
    s.pts.unshift(g); if (s.pts.length > 220) s.pts.pop();
    const P = s.trail.geometry.attributes.position, A = s.trail.geometry.attributes.a;
    for (let i = 0; i < 220; i++) {
      const p = s.pts[Math.min(i, s.pts.length - 1)];
      P.setXYZ(i, p.x, p.y, p.z); A.setX(i, i < s.pts.length ? 0.85 * (1 - i / 220) : 0);
    }
    P.needsUpdate = true; A.needsUpdate = true;
  }
}

/* ---------- Scene 2: a catchment cut open ---------- */
const secScene = new THREE.Scene();
const secCam = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
secScene.add(new THREE.HemisphereLight(0xffffff, 0x8aa9c8, 1.7));
const sunS = new THREE.DirectionalLight(0xfffaf0, 2.4); sunS.position.set(4, 6, 5); secScene.add(sunS);
const section = new THREE.Group(); secScene.add(section);

function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise2(x, y) {
  const i = Math.floor(x), j = Math.floor(y), f = x - i, g = y - j, u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
  return lerp(lerp(hash2(i, j), hash2(i + 1, j), u), lerp(hash2(i, j + 1), hash2(i + 1, j + 1), u), v);
}
const fbm2 = (x, y) => 0.5 * noise2(x, y) + 0.25 * noise2(x * 2.1, y * 2.1) + 0.125 * noise2(x * 4.3, y * 4.3) + 0.0625 * noise2(x * 8.7, y * 8.7);
const X0 = -4, X1 = 4, Z0 = -1.5, Z1 = 1.5, COAST = 2.25, BASE = -1.3;
const riverZ = x => 0.45 * Math.sin(x * 0.85 + 0.4) - 0.1;
function mount(x) { return 1.85 * Math.exp(-(((x + 2.9) / 1.15) ** 2)) + 1.1 * Math.exp(-(((x + 1.25) / 0.8) ** 2)) + 0.6 * Math.exp(-(((x + 3.95) / 0.55) ** 2)); }
function height(x, z) {
  const m = mount(x);
  let y = 0.1 + m * (0.88 + 0.12 * Math.sin(z * 1.9 + x)) + (fbm2(x * 1.4 + 3, z * 1.4 + 7) - 0.47) * (0.12 + 0.55 * Math.min(1, m));
  const c = smooth(COAST - 0.35, COAST + 0.45, x);
  y = y * (1 - c) - 0.75 * c;
  if (x < COAST + 0.1) y -= (0.08 + 0.3 * Math.min(1, m)) * Math.exp(-(((z - riverZ(x)) / (0.16 + 0.1 * Math.min(1, m))) ** 2)) * (1 - c);
  return y;
}
const waterTable = x => Math.min(height(x, Z1) - 0.12, lerp(0.05, height(x, Z1) - 0.45, Math.min(1, mount(x) / 1.2)));

function terrainColor(y, x) {
  const snow = new THREE.Color(0xffffff), rock = new THREE.Color(0xc6d4e1), veg = new THREE.Color(0xa7c3a3), sand = new THREE.Color(0xe9e0c8), floor = new THREE.Color(0x8db2d4);
  if (y < -0.05) return floor;
  if (x > COAST - 0.45 && y < 0.14) return sand;
  const c = veg.clone().lerp(rock, smooth(0.45, 0.95, y));
  return c.lerp(snow, smooth(1.62, 1.85, y));
}
{
  const NX = 220, NZ = 84, geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, NX, NZ);
  geo.rotateX(-Math.PI / 2);
  const P = geo.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), y = height(x, z);
    P.setY(i, y);
    const c = terrainColor(y, x); col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  section.add(new THREE.Mesh(geo, fadable(new THREE.MeshLambertMaterial({ vertexColors: true }))));
}

// Cut faces: soil, the unsaturated zone, groundwater below the water table (flowing towards the sea) and bedrock.
const faceMat = () => new THREE.ShaderMaterial({
  transparent: true,
  uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
  vertexShader: `attribute float top; attribute float wt; attribute float rock; varying float vTop; varying float vWt; varying float vRock; varying vec2 vXY;
    void main() { vTop = top; vWt = wt; vRock = rock; vXY = vec2(position.x + position.z, position.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform float uFade; varying float vTop; varying float vWt; varying float vRock; varying vec2 vXY;
    void main() {
      float y = vXY.y, d = vTop - y;
      vec3 soil = vec3(0.79, 0.71, 0.58), vadose = vec3(0.89, 0.85, 0.77), sat = vec3(0.62, 0.77, 0.89), rock = vec3(0.7, 0.76, 0.83);
      vec3 c = mix(soil, vadose, smoothstep(0.08, 0.16, d));
      float below = smoothstep(vWt + 0.01, vWt - 0.01, y);
      c = mix(c, sat, below);
      float inRock = smoothstep(vRock + 0.02, vRock - 0.02, y);
      c = mix(c, mix(rock, vec3(0.6, 0.73, 0.86), below * 0.5), inRock);
      float strata = 0.035 * sin(y * 40.0 + sin(vXY.x * 2.0) * 2.0);
      c += strata * (1.0 - below) * (1.0 - inRock);
      float tableLine = 1.0 - smoothstep(0.0, 0.008, abs(y - vWt));
      c = mix(c, vec3(0.11, 0.38, 0.66), tableLine * 0.9);
      float flow = 0.0;
      for (int i = 0; i < 3; i++) {
        float depth = 0.14 + 0.2 * float(i);
        float line = 1.0 - smoothstep(0.004, 0.011, abs((vWt - y) - depth));
        float dash = step(0.55, fract(vXY.x * 2.2 - uTime * (0.8 - 0.15 * float(i)) + float(i) * 0.37));
        flow = max(flow, line * dash);
      }
      c = mix(c, vec3(1.0), flow * below * 0.8);
      gl_FragColor = vec4(c, uFade);
    }`
});
const faceMats = [];
function face(points) {
  const n = points.length, pos = [], top = [], wt = [], rk = [], idx = [];
  points.forEach(([x, z, yTop, w, r]) => { pos.push(x, yTop, z, x, BASE, z); top.push(yTop, yTop); wt.push(w, w); rk.push(r, r); });
  for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('top', new THREE.Float32BufferAttribute(top, 1));
  g.setAttribute('wt', new THREE.Float32BufferAttribute(wt, 1));
  g.setAttribute('rock', new THREE.Float32BufferAttribute(rk, 1));
  g.setIndex(idx);
  const m = faceMat(); faceMats.push(m);
  const mesh = new THREE.Mesh(g, m); m.side = THREE.DoubleSide; section.add(mesh);
}
const rockTop = (x, h) => lerp(-0.95, h - 0.32, Math.min(1, mount(x) / 1.1));
face(Array.from({ length: 241 }, (_, i) => { const x = X0 + (X1 - X0) * i / 240; const h = height(x, Z1); return [x, Z1, h, x > COAST + 0.3 ? h - 0.02 : waterTable(x), rockTop(x, h)]; }));
face(Array.from({ length: 91 }, (_, i) => { const z = Z1 - (Z1 - Z0) * i / 90; const h = height(X0, z); return [X0, z, h, h - 0.55, rockTop(X0, h)]; }));

// The sea: a surface with small waves and a cut face showing depth.
const seaMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
  vertexShader: `uniform float uTime; varying vec3 vW; void main() { vec3 p = position; p.y += 0.018 * sin(p.x * 6.0 + uTime * 1.6) + 0.012 * sin(p.z * 9.0 - uTime * 1.2); vW = (modelMatrix * vec4(p, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform float uFade; varying vec3 vW;
    void main() {
      float glint = smoothstep(0.92, 1.0, sin(vW.x * 22.0 + uTime * 2.0) * sin(vW.z * 17.0 - uTime * 1.3));
      vec3 c = mix(vec3(0.18, 0.52, 0.81), vec3(0.42, 0.72, 0.92), 0.35 + 0.2 * sin(vW.x * 3.0 + uTime * 0.5));
      gl_FragColor = vec4(mix(c, vec3(1.0), glint * 0.7), 0.96 * uFade);
    }`
});
{
  const g = new THREE.PlaneGeometry(X1 - COAST + 0.35, Z1 - Z0, 60, 30); g.rotateX(-Math.PI / 2); g.translate((X1 + COAST - 0.35) / 2, 0.0, 0);
  section.add(new THREE.Mesh(g, seaMat));
  const pts = [], idx = [];
  const xs = Array.from({ length: 60 }, (_, i) => COAST - 0.35 + (X1 - COAST + 0.35) * i / 59);
  xs.forEach(x => { const f = Math.min(0, height(x, Z1)); pts.push(x, 0, Z1 + 0.002, x, f, Z1 + 0.002); });
  for (let i = 0; i < xs.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); wg.setIndex(idx);
  section.add(new THREE.Mesh(wg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uFade: { value: 1 } },
    vertexShader: `varying float vY; void main() { vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uFade; varying float vY; void main() { vec3 c = mix(vec3(0.33, 0.64, 0.88), vec3(0.08, 0.3, 0.58), smoothstep(0.0, -0.8, vY)); gl_FragColor = vec4(c, 0.88 * uFade); }`
  })));
}

// River: a ribbon in the valley floor with water running down it.
const riverMat = new THREE.ShaderMaterial({
  transparent: true, uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform float uFade; varying vec2 vUv;
    void main() {
      float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
      float flow = smoothstep(0.7, 1.0, fract(vUv.x * 26.0 - uTime * 2.2 + sin(vUv.y * 6.3) * 0.08));
      vec3 c = mix(vec3(0.16, 0.5, 0.82), vec3(1.0), flow * 0.65);
      gl_FragColor = vec4(c, (0.55 + 0.45 * edge) * uFade);
    }`
});
{
  const n = 160, pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const x = lerp(-3.2, COAST + 0.35, i / n), z = riverZ(x), w = 0.035 + 0.09 * i / n;
    const dx = 0.01, dz = (riverZ(x + dx) - z) / dx, nx = -dz / Math.hypot(1, dz), nz = 1 / Math.hypot(1, dz);
    for (const s of [-1, 1]) {
      const px = x + s * w * nx, pz = z + s * w * nz;
      pos.push(px, Math.max(height(px, pz), height(x, z)) + 0.012, pz); uv.push(i / n, s < 0 ? 0 : 1);
    }
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  section.add(new THREE.Mesh(g, riverMat));
}

// Forest on the lower slopes and the plain.
{
  const trees = [];
  for (let k = 0; k < 4000 && trees.length < 420; k++) {
    const x = rnd(-3.4, COAST - 0.5), z = rnd(Z0 + 0.1, Z1 - 0.1), y = height(x, z);
    if (y < 0.12 || y > 0.85 || Math.abs(z - riverZ(x)) < 0.22) continue;
    trees.push([x, y, z]);
  }
  const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.032, 0.11, 7), fadable(new THREE.MeshLambertMaterial({ color: 0x7ea47c })), trees.length);
  const m = new THREE.Matrix4();
  trees.forEach(([x, y, z], i) => { const s = rnd(0.7, 1.25); m.compose(new THREE.Vector3(x, y + 0.05 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m); });
  section.add(im);
}

// Clouds over the mountains, built from soft puffs.
const clouds = new THREE.Group(); section.add(clouds);
[[-2.8, 2.45, -0.2, 1.1], [-1.3, 2.6, 0.3, 0.9], [-3.6, 2.3, 0.5, 0.7], [0.3, 2.7, -0.4, 0.55]].forEach(([cx, cy, cz, s]) => {
  for (let i = 0; i < 26 * s; i++) {
    const shade = rnd(0, 1) < 0.35 ? 0xdbe6f1 : 0xffffff;
    const sp = new THREE.Sprite(fadable(new THREE.SpriteMaterial({ map: DOT, color: shade, depthWrite: false }), 0.9));
    const dx = rnd(-0.9, 0.9) * s, dy = rnd(-0.18, 0.28) * s;
    sp.position.set(cx + dx, cy + dy - (shade !== 0xffffff ? 0.12 : 0), cz + rnd(-0.6, 0.6) * s);
    sp.scale.setScalar(rnd(0.7, 1.25) * s);
    sp.userData.drift = rnd(0, 6.28);
    clouds.add(sp);
  }
});

// Rain falling from the cloud bases onto the mountains.
const RAIN = 520, rainPos = new Float32Array(RAIN * 6), drops = [];
for (let i = 0; i < RAIN; i++) drops.push({ x: rnd(-4, 0.4), z: rnd(-1.3, 1.3), y: rnd(0, 2.3), v: rnd(4.2, 5.4) });
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, fadable(new THREE.LineBasicMaterial({ color: 0xffffff }), 0.6)); rain.frustumCulled = false; section.add(rain);

// Vapour rising from the sea (evaporation) and from the forest (transpiration).
function particles(n, size, opacity) {
  const p = new Float32Array(n * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, fadable(new THREE.PointsMaterial({ map: DOT, size, depthWrite: false, color: 0xffffff }), opacity));
  pts.frustumCulled = false; section.add(pts); return pts;
}
const evap = particles(300, 0.09, 0.85), trans = particles(140, 0.06, 0.75), infil = particles(60, 0.05, 0.95);
infil.material.color.set(0x1c62a8);
const evapP = Array.from({ length: 300 }, () => ({ x: rnd(COAST + 0.2, X1), z: rnd(Z0, Z1), y: rnd(0, 2.6), s: rnd(0, 6) }));
const transP = Array.from({ length: 140 }, () => { const x = rnd(-1.0, COAST - 0.6), z = rnd(Z0, Z1); return { x, z, y0: height(x, z), y: rnd(0, 1), s: rnd(0, 6) }; });
const infilP = Array.from({ length: 60 }, () => ({ x: rnd(-0.6, COAST - 0.5), k: Math.random() }));


function updateSection(t, dt) {
  for (const m of [...faceMats, seaMat, riverMat]) m.uniforms.uTime.value = t;
  clouds.children.forEach(c => { c.position.x += Math.sin(t * 0.8 + c.userData.drift) * 0.002; });
  for (let i = 0; i < RAIN; i++) {
    const d = drops[i]; d.y -= d.v * dt; d.x -= 0.25 * dt;
    const g = height(d.x, d.z);
    if (d.y < g || d.x < X0) { d.x = rnd(-4, 0.4); d.z = rnd(-1.3, 1.3); d.y = rnd(2.05, 2.3); }
    rainPos.set([d.x, d.y, d.z, d.x + 0.02, d.y + 0.13, d.z], i * 6);
  }
  rainGeo.attributes.position.needsUpdate = true;
  const ep = evap.geometry.attributes.position;
  evapP.forEach((p, i) => {
    p.y += 0.95 * dt; p.x -= (0.6 + 0.55 * p.y / 2.6) * dt; p.z += Math.sin(t + p.s) * 0.002;
    if (p.y > 2.4 || p.x < -1.5) { p.x = rnd(COAST + 0.2, X1); p.z = rnd(Z0, Z1); p.y = 0.02; }
    ep.setXYZ(i, p.x, p.y, p.z);
  });
  ep.needsUpdate = true;
  const tp = trans.geometry.attributes.position;
  transP.forEach((p, i) => {
    p.y += 0.6 * dt;
    if (p.y > 1.4) { p.x = rnd(-1.0, COAST - 0.6); p.z = rnd(Z0, Z1); p.y0 = height(p.x, p.z); p.y = 0; }
    tp.setXYZ(i, p.x + Math.sin(t * 0.8 + p.s) * 0.04, p.y0 + 0.08 + p.y, p.z);
  });
  tp.needsUpdate = true;
  const ip = infil.geometry.attributes.position;
  infilP.forEach((p, i) => {
    p.k += 0.5 * dt; if (p.k > 1) { p.k = 0; p.x = rnd(-0.6, COAST - 0.5); }
    const top = height(p.x, Z1), w = waterTable(p.x);
    ip.setXYZ(i, p.x, lerp(top - 0.02, w, p.k), Z1 + 0.01);
  });
  ip.needsUpdate = true;
}

/* ---------- Labels on the section ---------- */
const LABELS = [
  ['Evaporation', [3.1, 1.35, 0.6]],
  ['Condensation', [-1.6, 2.95, 0.2]],
  ['Precipitation', [-2.2, 1.95, 1.2]],
  ['Snowpack', [-2.9, 2.05, -0.6]],
  ['Transpiration', [0.4, 1.05, 0.9]],
  ['Surface runoff', [1.3, 0.35, riverZ(1.3)]],
  ['Infiltration', [0.3, 0.05, Z1]],
  ['Groundwater flow', [1.0, -0.62, Z1]],
  ['Ocean', [3.3, -0.35, Z1]]
].map(([text, p], i) => {
  const el = document.createElement('div'); el.className = 'hero-label'; el.textContent = text; labelsEl.append(el);
  return { el, p: new THREE.Vector3(...p) };
});
function updateLabels(tSec, fade) {
  const w = hero.clientWidth, h = hero.clientHeight;
  for (const L of LABELS) {
    const v = L.p.clone().applyMatrix4(section.matrixWorld).project(secCam);
    const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h, lw = L.el.offsetWidth;
    const flip = x + lw > w - 10;
    L.el.classList.toggle('is-flipped', flip);
    L.el.style.transform = `translate(${flip ? x - lw + 4 : x - 4}px, ${y - 9}px)`;
    L.el.style.opacity = String(fade);
  }
}

/* ---------- Timeline ---------- */
const TARGET = { lon: 102, lat: 33 };
// One loop is 10 s: 3 s of the turning Earth, a 1.2 s dive, 4.6 s inside the catchment, 1.2 s back out.
// The Earth keeps one turn per 15 s throughout, so it never jumps between loops.
const GLOBE = 3, ZOOM = 1.2, SECTION = 4.6, BACK = 1.2, LOOP = GLOBE + ZOOM + SECTION + BACK, TURN = 15;
let W = 1, H = 1, globeDist = 6, secDist = 12, area = { w: 1, h: 1 };
function resize() {
  W = hero.clientWidth; H = hero.clientHeight;
  renderer.setSize(W, H, false);
  const top = topbar ? topbar.offsetHeight : 62, narrow = W / H < 0.85;
  // The animation lives on the right; on phones it sits above the name.
  area = narrow ? { x: 0, y: top + 10, w: W, h: H * 0.6 - top } : { x: W * 0.4, y: top, w: W * 0.58, h: H - top - 20 };
  const cx = area.x + area.w / 2, cy = area.y + area.h / 2;
  for (const c of [globeCam, secCam]) { c.aspect = W / H; c.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H); c.updateProjectionMatrix(); }
  const tanG = Math.tan(THREE.MathUtils.degToRad(16)), tanS = Math.tan(THREE.MathUtils.degToRad(15));
  const orbit = 1.45 * 1.06;
  globeDist = Math.max(orbit / (tanG * area.h / H), orbit / (tanG * area.w / H));
  secDist = Math.max((narrow ? 4.7 : 4.35) / (tanS * area.w / H), 2.3 / (tanS * area.h / H));
}
function secCamera(t, k) {
  const R = secDist * lerp(1.35, 1, k);
  const a = 0.3 * Math.sin(t * 0.12) - 0.2;
  secCam.position.set(Math.sin(a) * R, R * 0.36, Math.cos(a) * R);
  secCam.lookAt(0.1, 0.45, 0);
}

let pointer = [0, 0];
hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); pointer = [(e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5]; });
addEventListener('resize', resize);
resize();

const baseSpin = -(Math.PI / 2 + THREE.MathUtils.degToRad(TARGET.lon));
const latTilt = THREE.MathUtils.degToRad(TARGET.lat);
let visible = true, running = false, t0 = performance.now(), last = t0;
new IntersectionObserver(e => {
  visible = e[0].isIntersecting;
  if (visible && !running && !reduce) { running = true; requestAnimationFrame(frame); }
}).observe(hero);

function frame(now) {
  running = false;
  const t = reduce ? 4 : (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
  const u = t % LOOP;
  let gFade = 1, sFade = 0, zoom = 0, back = 0, flashA = 0, secT = 0;
  spin.rotation.y = baseSpin + 2 * Math.PI * ((u < GLOBE + ZOOM ? u : u - LOOP) - GLOBE) / TURN;
  if (u < GLOBE) gFade = 1;
  else if (u < GLOBE + ZOOM) {
    zoom = smooth(0, 1, (u - GLOBE) / ZOOM);
    gFade = 1 - smooth(0.55, 0.8, zoom); sFade = smooth(0.62, 1, zoom); flashA = Math.sin(Math.PI * smooth(0.45, 0.85, zoom)) * 0.85;
  } else if (u < GLOBE + ZOOM + SECTION) { gFade = 0; sFade = 1; secT = u - GLOBE - ZOOM; }
  else { back = smooth(0, 1, (u - GLOBE - ZOOM - SECTION) / BACK); sFade = 1 - smooth(0, 0.45, back); gFade = smooth(0.3, 0.8, back); secT = SECTION + back * BACK; }
  globe.rotation.x = latTilt * 0.6 + pointer[1] * 0.08;
  globe.rotation.y = pointer[0] * 0.12;

  // Camera: from orbit down to the target, and back out again.
  const d = zoom > 0 ? lerp(globeDist, 1.18, Math.pow(zoom, 1.6)) : back > 0 ? lerp(2.4, globeDist, back) : globeDist;
  globeCam.position.set(0, 0, d);
  globeCam.lookAt(0, 0, 0);
  globeScene.updateMatrixWorld();
  updateSats(t);
  cloudMat.uniforms.uTime.value = t;
  setFade(globe, gFade);

  const k = sFade < 1 && zoom > 0 ? sFade : 1;
  secCamera(t, k);
  secCam.updateMatrixWorld();
  section.rotation.y = 0;
  updateSection(t, dt);
  setFade(section, sFade);
  updateLabels(secT, sFade);

  flash.style.opacity = String(flashA);
  renderer.clear();
  if (gFade > 0.002) renderer.render(globeScene, globeCam);
  if (sFade > 0.002) { renderer.clearDepth(); renderer.render(secScene, secCam); }
  if (!reduce && visible) { running = true; requestAnimationFrame(frame); }
}
running = true;
requestAnimationFrame(frame);
