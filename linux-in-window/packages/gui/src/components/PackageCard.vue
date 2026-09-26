<script setup>
import { computed } from 'vue';
import { useLiwStore } from '../stores/liw.js';

const props = defineProps({ pkg: { type: Object, required: true } });
const store = useLiwStore();
const status = computed(() => store.statusOf(props.pkg.id));
const fav = computed(() => store.favorites.includes(props.pkg.id));
</script>

<template>
  <div class="card pkg">
    <RouterLink :to="`/package/${pkg.id}`" class="swatch"
      :style="{ background: pkg.theme?.background || '#101018', color: pkg.theme?.foreground || '#ddd' }">
      <span class="mono prompt">user@win $ ▮</span>
    </RouterLink>
    <div class="body">
      <RouterLink :to="`/package/${pkg.id}`" class="title">{{ pkg.name }}</RouterLink>
      <div class="desc muted">{{ (pkg.description || '').slice(0, 70) }}{{ (pkg.description || '').length > 70 ? '…' : '' }}</div>
      <div class="row">
        <span v-if="status" class="badge" :class="status">{{ status }}</span>
        <span v-else class="badge installed">{{ pkg.version }}</span>
        <span class="badge">⬇ {{ (pkg.downloads || 0).toLocaleString() }}</span>
        <span class="badge">★ {{ pkg.rating }}</span>
        <button class="small fav" @click="store.toggleFavorite(pkg.id)" :title="fav ? 'unfavorite' : 'favorite'">{{ fav ? '♥' : '♡' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pkg { display: flex; flex-direction: column; overflow: hidden; transition: transform .12s ease, border-color .12s; }
.pkg:hover { transform: translateY(-2px); border-color: var(--accent); }
.swatch { height: 84px; display: flex; align-items: center; padding: 0 14px; border-bottom: 1px solid var(--border); }
.prompt { font-size: 13px; text-shadow: 0 0 8px currentColor; }
.body { padding: 10px 14px 12px; display: flex; flex-direction: column; gap: 5px; }
.title { color: var(--text); font-weight: 600; }
.desc { font-size: 12px; min-height: 30px; }
.row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.fav { margin-left: auto; border: none; background: none; font-size: 15px; color: var(--accent-2); }
</style>
