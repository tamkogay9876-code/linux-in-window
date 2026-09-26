<script setup>
// Live preview: renders a compiled Nox program (terminal colors, prompt,
// animations) plus a Three.js WebGL scene when the package declares one.
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';

const props = defineProps({ nox: { type: Object, default: null }, theme: { type: Object, default: null } });
// nox.animations is a keyed map ({ name: anim }) produced by compileForBrowser
const animList = computed(() => Object.values(props.nox?.animations || {}));

const canvasEl = ref(null);
let three = null; // { renderer, scene, camera, raf }

const bg = () => props.nox?.terminal?.background || props.theme?.background || '#0d0d12';
const fg = () => props.nox?.terminal?.color || props.theme?.foreground || '#e0e0e0';
const cursorColor = () => props.nox?.terminal?.cursor?.color || props.theme?.cursorColor || fg();
const blink = () => props.nox?.terminal?.cursor?.blink !== false;

async function startScene() {
  stopScene();
  const sceneDef = props.nox?.scene || (props.nox?.scenes && props.nox.scenes[0]);
  if (!sceneDef || !canvasEl.value) return;
  try {
    const THREE = await import('three');
    const w = canvasEl.value.clientWidth || 480, h = canvasEl.value.clientHeight || 260;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl.value, alpha: true, antialias: true });
    renderer.setSize(w, h, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.z = 6;
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(3, 4, 5); scene.add(dl);

    const objs = [];
    for (const o of sceneDef.objects || []) {
      let mesh = null;
      const color = new THREE.Color(o.props?.color || fg());
      if (o.type === 'cube') mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshStandardMaterial({ color }));
      else if (o.type === 'sphere') mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshStandardMaterial({ color }));
      else if (o.type === 'torus') mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.28), new THREE.MeshStandardMaterial({ color }));
      if (!mesh) continue;
      const pos = o.args || [0, 0, -3];
      mesh.position.set(pos[0] || 0, pos[1] || 0, (pos[2] ?? -3));
      const rot = o.props?.rotation;
      if (Array.isArray(rot)) mesh.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
      scene.add(mesh); objs.push(mesh);
    }
    // particles fallback (matrix rain style)
    if (!objs.length) {
      const n = 400, g = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) arr[i] = (Math.random() - 0.5) * 12;
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(props.nox?.terminal?.color || '#00ff41'), size: 0.06 })));
    }
    let t0 = performance.now();
    const animate = () => {
      const dt = (performance.now() - t0) / 1000; t0 = performance.now();
      for (const m of objs) { m.rotation.y += dt * 0.8; m.rotation.x += dt * 0.15; }
      renderer.render(scene, camera);
      three.raf = requestAnimationFrame(animate);
    };
    three = { renderer, raf: 0 };
    animate();
  } catch { /* webgl unavailable — static preview still works */ }
}
function stopScene() {
  if (three) { cancelAnimationFrame(three.raf); three.renderer.dispose?.(); three = null; }
}
onMounted(startScene);
watch(() => props.nox, startScene);
onBeforeUnmount(stopScene);
</script>

<template>
  <div class="preview card">
    <div class="titlebar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="muted tiny">Linux in Window — live preview</span></div>
    <div class="screen" :style="{ background: bg(), color: fg() }">
      <canvas v-if="nox?.scene || nox?.scenes?.length" ref="canvasEl" class="webgl"></canvas>
      <pre class="mono body">╭─ {{ (nox?.prompt?.segments?.map(s => s.text).join(' ') || 'CYBERPUNK TERMINAL').toUpperCase() || 'TERMINAL PREVIEW' }} ─╮
│                                                              │
│  user@windows                                                │
│  &gt; linux status                                              │
│                                                              │
│  System ready                                                │
│  Packages loaded: {{ nox ? 'Nox runtime ✓' : 'JSON theme only' }}<span v-if="blink" class="cursor" :style="{ background: cursorColor() }">▮</span>
╰──────────────────────────────────────────────────────────────╯</pre>
      <div v-if="animList.length" class="anim-note muted tiny">animation: {{ animList.map(a => a.name + ' (' + a.property + ')').join(', ') }}</div>
    </div>
  </div>
</template>

<style scoped>
.preview { overflow: hidden; }
.titlebar { display: flex; gap: 6px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--panel-strong); }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.r { background: #ff5f57; } .y { background: #febc2e; } .g { background: #28c840; }
.screen { position: relative; min-height: 220px; padding: 14px; }
.webgl { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .8; }
.body { position: relative; margin: 0; font-size: 12.5px; line-height: 1.5; text-shadow: 0 0 6px currentColor; }
.cursor { animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.anim-note { position: relative; margin-top: 6px; }
.tiny { font-size: 11px; }
</style>
