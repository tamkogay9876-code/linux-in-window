<script setup>
import { computed } from 'vue';
import { useLiwStore } from '../stores/liw.js';
import PackageCard from '../components/PackageCard.vue';

const props = defineProps({ cat: { type: String, default: '' } });
const store = useLiwStore();

const list = computed(() => {
  let items = store.filteredMarketplace;
  if (props.cat) items = items.filter((p) => (p.category || '').toLowerCase() === props.cat.toLowerCase() || (p.tags || []).includes(props.cat.toLowerCase()));
  return items;
});
</script>

<template>
  <section>
    <h2>{{ cat ? cat.toUpperCase() : 'Discover' }} <span class="muted">({{ list.length }})</span></h2>
    <div v-if="!list.length" class="card empty muted">No packages match. Try another search or category.</div>
    <div class="grid">
      <PackageCard v-for="p in list" :key="p.id" :pkg="p" />
    </div>
  </section>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.empty { padding: 30px; text-align: center; margin-top: 10px; }
h2 { margin: 6px 4px 12px; }
</style>
