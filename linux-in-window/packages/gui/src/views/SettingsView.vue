<script setup>
// Settings — theme, safe mode, performance, doctor, backups/rollback, cache.
import { ref, onMounted } from 'vue';
import { useLiwStore } from '../stores/liw.js';

const store = useLiwStore();
const settings = ref({});
const doctor = ref(null);
const backups = ref([]);
const msg = ref('');
const busy = ref(false);

async function load() {
  try { settings.value = await store.settingsGet(); } catch { /* demo */ }
  try { backups.value = await store.api.backupList() || []; } catch { /* demo */ }
}
onMounted(load);

async function set(key, value) {
  await store.settingsSet(key, value);
  settings.value = { ...settings.value, [key]: value };
  if (key === 'theme') document.documentElement.dataset.theme = value;
}

async function runDoctor() {
  busy.value = true; msg.value = '';
  try { doctor.value = await store.call('doctor'); }
  catch (e) { msg.value = e.message; }
  finally { busy.value = false; }
}
async function rollback(b) {
  try { await store.call('rollback', { id: b.id || b }); msg.value = `✓ Restored ${b.id || b}`; load(); }
  catch (e) { msg.value = `✗ ${e.message}`; }
}
async function cleanCache() {
  try { const r = await store.call('cacheClean'); msg.value = `Cache cleaned (${r?.removed ?? 0} files).`; }
  catch (e) { msg.value = e.message; }
}
</script>

<template>
  <section class="settings">
    <h2>Settings</h2>
    <div v-if="msg" class="card msg">{{ msg }}</div>

    <div class="card group">
      <h3>Appearance</h3>
      <label class="row-line">Theme
        <select :value="settings.theme || 'dark'" @change="set('theme', $event.target.value)">
          <option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option>
        </select>
      </label>
    </div>

    <div class="card group">
      <h3>Safety</h3>
      <label class="row-line"><input type="checkbox" :checked="!!settings.safeMode" @change="set('safeMode', $event.target.checked)" /> Safe mode (disable scripts, 3D, animations, network packages)</label>
      <label class="row-line"><input type="checkbox" :checked="!!settings.autoUpdate" @change="set('autoUpdate', $event.target.checked)" /> Auto update (minor versions only)</label>
    </div>

    <div class="card group">
      <h3>Performance</h3>
      <label class="row-line">FPS limit
        <input type="number" min="10" max="240" :value="settings.fps || 60" @change="set('fps', Number($event.target.value))" />
      </label>
      <label class="row-line">3D quality
        <select :value="settings.quality || 'medium'" @change="set('quality', $event.target.value)">
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
      </label>
      <label class="row-line"><input type="checkbox" :checked="!!settings.reduceMotion" @change="set('reduceMotion', $event.target.checked)" /> Reduce motion</label>
    </div>

    <div class="card group">
      <h3>Diagnostics</h3>
      <button :disabled="busy" @click="runDoctor">{{ busy ? 'Checking…' : 'Run linux doctor' }}</button>
      <div v-if="doctor" class="doctor mono">
        <div v-for="c in doctor.checks" :key="c.name" :class="c.ok ? 'ok' : 'fail'">{{ c.ok ? '✓' : '✗' }} {{ c.name }} <span class="muted">{{ c.note || '' }}</span></div>
        <div v-for="w in doctor.warnings" :key="w" class="warn">! {{ w }}</div>
        <div v-for="e in doctor.errors" :key="e" class="fail">✗ {{ e }}</div>
      </div>
    </div>

    <div class="card group">
      <h3>Backups &amp; Rollback</h3>
      <div v-if="!backups.length" class="muted small">No backups yet — one is created automatically before every install.</div>
      <table v-else class="table">
        <tbody>
          <tr v-for="b in backups.slice(0, 8)" :key="b.id || b">
            <td class="mono">{{ b.id || b }}</td>
            <td class="muted small">{{ b.reason || '' }}</td>
            <td><button class="small" @click="rollback(b)">Rollback</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card group">
      <h3>Storage</h3>
      <div class="muted small mono">~/AppData/Local/linux</div>
      <button class="small" @click="cleanCache">Clean cache</button>
    </div>
  </section>
</template>

<style scoped>
h2 { margin: 6px 4px 12px; }
.settings { display: flex; flex-direction: column; gap: 12px; max-width: 720px; }
.group h3 { margin: 0 0 10px; font-size: 14px; }
.row-line { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--border); }
.row-line:last-child { border-bottom: none; }
.msg { padding: 10px 14px; color: var(--accent); }
.doctor { font-size: 12px; margin-top: 8px; display: flex; flex-direction: column; gap: 3px; }
.ok { color: #7bd88f; } .fail { color: #ff6b6b; } .warn { color: #ffb86c; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table td { padding: 6px 4px; }
.mono { font-family: var(--mono, monospace); }
.small { font-size: 12px; }
</style>
