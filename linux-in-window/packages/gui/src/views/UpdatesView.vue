<script setup>
// Available updates — per-package update and "Update all".
import { ref } from 'vue';
import { useLiwStore } from '../stores/liw.js';

const store = useLiwStore();
const busy = ref(false);
const msg = ref('');

async function updateAll() {
  busy.value = true; msg.value = '';
  try {
    const r = await store.upgradeAll();
    msg.value = `✓ Updated ${(r || []).length} package(s).`;
  } catch (e) { msg.value = `✗ ${e.message}`; }
  finally { busy.value = false; }
}
</script>

<template>
  <section>
    <h2>Updates <span class="muted">({{ store.updates.length }})</span></h2>
    <div v-if="msg" class="card msg">{{ msg }}</div>
    <div v-if="!store.updates.length" class="card empty muted">
      Everything is up to date. {{ store.demoMode ? '(demo mode reports no updates)' : '' }}
    </div>
    <template v-else>
      <table class="card table">
        <thead><tr><th>Package</th><th>Installed</th><th>Available</th></tr></thead>
        <tbody>
          <tr v-for="u in store.updates" :key="u.id">
            <td><router-link class="link" :to="`/package/${u.id}`">{{ u.name || u.id }}</router-link></td>
            <td>{{ u.current }}</td>
            <td><span class="badge hot">{{ u.latest }}</span></td>
          </tr>
        </tbody>
      </table>
      <div class="row" style="margin-top:12px">
        <button class="primary" :disabled="busy" @click="updateAll">
          {{ busy ? 'Updating…' : `Update all (${store.updates.length})` }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
h2 { margin: 6px 4px 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); }
.link { color: var(--text); font-weight: 600; }
.msg { padding: 10px 14px; margin-bottom: 10px; color: var(--accent); }
.empty { padding: 30px; text-align: center; }
.row { display: flex; gap: 8px; }
</style>
