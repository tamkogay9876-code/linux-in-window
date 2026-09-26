<script setup>
// Package detail page — preview, metadata, permission dialog, install progress.
import { ref, computed, watch, onMounted } from 'vue';
import { useLiwStore } from '../stores/liw.js';
import TerminalPreview from '../components/TerminalPreview.vue';

const props = defineProps({ id: { type: String, required: true } });
const store = useLiwStore();

const detail = ref(null);       // { manifest, registry, theme, nox, previewPng }
const loading = ref(true);
const installing = ref(false);
const actionMsg = ref('');
const showPerms = ref(false);

const RISKY = ['network', 'elevated', 'system', 'registry'];

const meta = computed(() => detail.value?.registry || store.byId[props.id] || null);
const status = computed(() => store.statusOf(props.id));
const permissions = computed(() => {
  const p = detail.value?.manifest?.permissions || meta.value?.permissions || [];
  return Array.isArray(p) ? p : Object.entries(p).filter(([, v]) => v).map(([k]) => k);
});
const riskyPerms = computed(() => permissions.value.filter((p) => RISKY.some((r) => String(p).toLowerCase().includes(r))));
const includes = computed(() => {
  const d = detail.value || {};
  const list = [];
  if (d.theme || d.nox?.terminal) list.push('Theme');
  if (d.nox?.prompt) list.push('Prompt');
  if (d.manifest?.nox || d.nox) list.push('Nox runtime');
  if (d.nox?.scene || d.nox?.scenes) list.push('3D / WebGL');
  if (d.nox?.animations && Object.keys(d.nox.animations).length) list.push('Animation');
  if ((d.manifest?.dependencies || []).length) list.push(`Dependencies (${d.manifest.dependencies.length})`);
  return list;
});
const sizeLabel = computed(() => {
  const b = meta.value?.sizeBytes || 0;
  return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
});

async function load() {
  loading.value = true;
  try { detail.value = await store.previewPackage(props.id); }
  catch (e) { actionMsg.value = e.message; }
  finally { loading.value = false; }
}
onMounted(load);
watch(() => props.id, load);

async function doInstall() {
  if (riskyPerms.value.length && !showPerms.value) { showPerms.value = true; return; }
  showPerms.value = false;
  installing.value = true;
  actionMsg.value = '';
  try {
    await store.install(props.id);
    actionMsg.value = `✓ Installed ${meta.value?.name || props.id}`;
  } catch (e) {
    actionMsg.value = `✗ ${e.message}`;
  } finally {
    installing.value = false;
  }
}
async function doRun() {
  actionMsg.value = '';
  try { const r = await store.run(props.id); actionMsg.value = r?.message || '✓ Launched Windows Terminal'; }
  catch (e) { actionMsg.value = `✗ ${e.message}`; }
}
async function doUninstall() {
  try { await store.uninstall(props.id); actionMsg.value = 'Removed.'; }
  catch (e) { actionMsg.value = `✗ ${e.message}`; }
}
</script>

<template>
  <section v-if="loading" class="card empty muted">Loading package…</section>
  <section v-else class="detail">
    <div class="head card">
      <div class="icon" :style="{ background: detail?.theme?.background || '#101018', color: detail?.theme?.foreground || '#ccc' }">▮</div>
      <div class="head-text">
        <h1>{{ meta?.name || id }}</h1>
        <div class="muted">{{ meta?.description || '' }}</div>
        <div class="row tags">
          <span class="badge">{{ id }}</span>
          <span class="badge">v{{ meta?.version || '?' }}</span>
          <span class="badge">{{ sizeLabel }}</span>
          <span class="badge">⬇ {{ (meta?.downloads || 0).toLocaleString() }}</span>
          <span class="badge">★ {{ meta?.rating ?? '—' }}</span>
          <span v-if="status" class="badge" :class="status">{{ status }}</span>
        </div>
        <div class="muted small">Author: {{ meta?.author || 'Unknown' }} · Compatibility: Windows 10+ / Windows 11+</div>
      </div>
      <div class="actions">
        <button v-if="!status" class="primary" :disabled="installing" @click="doInstall">
          {{ installing ? 'Installing…' : 'INSTALL' }}
        </button>
        <template v-else>
          <button class="primary" @click="doRun">▶ RUN</button>
          <button @click="doUninstall">Uninstall</button>
        </template>
        <button class="fav-btn" @click="store.toggleFavorite(id)">
          {{ store.favorites.includes(id) ? '♥ Favorite' : '♡ Favorite' }}
        </button>
      </div>
    </div>

    <div class="install-progress card" v-if="installing && store.progress">
      <div class="step">{{ store.progress.step }} — {{ store.progress.message }}</div>
      <div class="bar"><div class="fill" :style="{ width: (store.progress.percent || 0) + '%' }"></div></div>
    </div>
    <div class="msg" v-if="actionMsg">{{ actionMsg }}</div>

    <div class="cols">
      <div class="preview-col">
        <h3>Live Preview</h3>
        <TerminalPreview :nox="detail?.nox" :theme="detail?.theme" />
        <div v-if="!detail?.nox" class="muted small">This package has no Nox program — preview shows the static theme only.</div>
      </div>
      <div class="info-col">
        <h3>Includes</h3>
        <ul class="includes">
          <li v-for="i in includes" :key="i">✓ {{ i }}</li>
          <li v-if="!includes.length" class="muted">Basic JSON configuration</li>
        </ul>
        <h3>Permissions requested</h3>
        <ul class="perms">
          <li v-for="p in permissions" :key="p" :class="{ warn: riskyPerms.includes(p) }">
            {{ riskyPerms.includes(p) ? '⚠' : '✓' }} {{ p }}
          </li>
          <li v-if="!permissions.length" class="muted">None beyond reading its own files</li>
        </ul>
        <h3 v-if="meta?.tags?.length">Tags</h3>
        <div class="row tags" v-if="meta?.tags?.length">
          <span v-for="t in meta.tags" :key="t" class="badge">#{{ t }}</span>
        </div>
      </div>
    </div>

    <!-- Permission confirmation dialog -->
    <div v-if="showPerms" class="modal-backdrop" @click.self="showPerms = false">
      <div class="modal card">
        <h3>This package requests elevated access</h3>
        <ul>
          <li v-for="p in permissions" :key="p">
            <span :class="riskyPerms.includes(p) ? 'warn' : ''">{{ riskyPerms.includes(p) ? '⚠' : '✓' }}</span> {{ p }}
          </li>
        </ul>
        <p class="muted small">Linux in Window never grants Administrator rights silently. Scripts run sandboxed and a backup is created before any change.</p>
        <div class="row">
          <button @click="showPerms = false">Cancel</button>
          <button class="primary" @click="doInstall">Install anyway</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; gap: 16px; padding: 18px; align-items: flex-start; }
.icon { width: 64px; height: 64px; border-radius: 12px; display: grid; place-items: center; font-size: 28px; border: 1px solid var(--border); }
.head-text { flex: 1; }
.head-text h1 { margin: 0 0 4px; font-size: 22px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tags { margin: 8px 0; }
.actions { display: flex; flex-direction: column; gap: 8px; min-width: 150px; }
.small { font-size: 12px; }
.install-progress .bar { height: 8px; border-radius: 4px; background: var(--bg-2); overflow: hidden; margin-top: 6px; }
.install-progress .fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); transition: width .2s; }
.msg { color: var(--accent); font-size: 13px; }
.cols { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
@media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
.includes, .perms { list-style: none; padding: 0; margin: 0 0 10px; font-size: 13px; }
.perms .warn, li.warn { color: #ffb86c; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: grid; place-items: center; z-index: 50; }
.modal { max-width: 420px; padding: 20px; }
.empty { padding: 40px; text-align: center; }
</style>
