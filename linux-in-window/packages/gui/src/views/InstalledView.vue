<script setup>
// Installed packages — status, run/stop/enable/disable, logs, conflicts.
import { ref } from 'vue';
import { useLiwStore } from '../stores/liw.js';

const store = useLiwStore();
const busy = ref('');
const msg = ref('');

async function act(fn, id) {
  busy.value = id; msg.value = '';
  try { const r = await fn(id); if (r?.message) msg.value = r.message; }
  catch (e) { msg.value = `✗ ${id}: ${e.message}`; }
  finally { busy.value = ''; }
}
</script>

<template>
  <section>
    <h2>Installed <span class="muted">({{ store.installed.length }})</span></h2>
    <div v-if="msg" class="msg card">{{ msg }}</div>
    <div v-if="!store.installed.length" class="card empty muted">
      Nothing installed yet. Browse the marketplace and press INSTALL.
    </div>
    <table v-else class="card table">
      <thead>
        <tr><th>Name</th><th>Version</th><th>Status</th><th>Size</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="p in store.installed" :key="p.id">
          <td><router-link :to="`/package/${p.id}`" class="link">{{ p.name || p.id }}</router-link>
            <div class="muted small mono">{{ p.id }}</div></td>
          <td>{{ p.version }}</td>
          <td><span class="badge" :class="p.status">{{ p.status }}</span></td>
          <td class="muted">{{ p.size ? (p.size > 1048576 ? (p.size/1048576).toFixed(1)+' MB' : Math.round(p.size/1024)+' KB') : '—' }}</td>
          <td class="row actions">
            <button class="small" :disabled="busy===p.id" @click="act(store.run, p.id)">▶ Run</button>
            <button class="small" :disabled="busy===p.id" @click="act(store.stop, p.id)">■ Stop</button>
            <button class="small" :disabled="busy===p.id" @click="act(store.disable, p.id)">Disable</button>
            <button class="small" :disabled="busy===p.id" @click="act(store.enable, p.id)">Enable</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
h2 { margin: 6px 4px 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); }
.table tr:last-child td { border-bottom: none; }
.actions { gap: 6px; flex-wrap: nowrap; }
.link { color: var(--text); font-weight: 600; }
.mono { font-family: var(--mono, monospace); font-size: 11px; }
.small { font-size: 12px; }
.msg { padding: 10px 14px; margin-bottom: 10px; color: var(--accent); }
.empty { padding: 30px; text-align: center; }
</style>
