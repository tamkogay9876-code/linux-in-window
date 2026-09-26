<script setup>
import { onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLiwStore } from './stores/liw.js';
import PackageCard from './components/PackageCard.vue';
import MiniTerminal from './components/MiniTerminal.vue';

const store = useLiwStore();
const route = useRoute();
const router = useRouter();
onMounted(() => { store.init(); store.settingsGet().catch(() => {}); });

const featured = computed(() =>
  [...store.marketplace].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 3));
const recommended = computed(() =>
  [...store.marketplace].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6));

const categories = [
  ['themes', 'Themes'], ['prompts', 'Prompts'], ['fonts', 'Fonts'], ['backgrounds', 'Backgrounds'],
  ['3d', '3D'], ['animations', 'Animations'], ['retro', 'Retro'], ['gaming', 'Gaming'],
  ['developer', 'Developer'], ['minimal', 'Minimal'], ['ai', 'AI'], ['icons', 'Icons'],
];
</script>

<template>
  <div class="shell">
    <aside class="sidebar card">
      <div class="brand">
        <span class="logo">🐧</span>
        <div><b>Linux in Window</b><div class="muted tiny">customize your terminal</div></div>
      </div>
      <nav>
        <router-link to="/" class="nav-item">🏠 Home</router-link>
        <router-link to="/discover" class="nav-item">🧭 Discover</router-link>
        <div class="sep muted">Categories</div>
        <router-link v-for="[id, label] in categories" :key="id" :to="`/category/${id}`" class="nav-item">{{ label }}</router-link>
        <div class="sep muted">Library</div>
        <router-link to="/installed" class="nav-item">📦 Installed <span v-if="store.installed.length" class="count">{{ store.installed.length }}</span></router-link>
        <router-link to="/updates" class="nav-item">⬆️ Updates <span v-if="store.updates.length" class="count hot">{{ store.updates.length }}</span></router-link>
        <div class="sep muted">System</div>
        <router-link to="/settings" class="nav-item">⚙️ Settings</router-link>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar card">
        <input type="search" placeholder="Search the marketplace…  (cyberpunk, matrix, minimal, 3d)"
               :value="store.searchQuery" @input="store.searchQuery = $event.target.value; router.push('/discover')" />
        <span v-if="store.demoMode" class="badge" title="Running without Electron — demo data">DEMO MODE</span>
        <MiniTerminal compact />
      </header>

      <div v-if="store.error" class="errbar">✗ {{ store.error }}</div>
      <div v-if="store.progress" class="progbar card">
        <b>{{ store.progress.step || 'working' }}</b>
        <div class="progress"><div :style="{ width: (store.progress.percent || 0) + '%' }"></div></div>
        <span class="muted">{{ store.progress.message }} {{ store.progress.percent ?? 0 }}%</span>
      </div>

      <section v-if="route.path === '/'">
        <h2>Featured</h2>
        <div class="featured">
          <RouterLink v-for="p in featured" :key="p.id" :to="`/package/${p.id}`" class="hero card">
            <div class="hero-swatch" :style="{ background: p.theme?.background || '#111', color: p.theme?.foreground || '#eee', borderColor: p.theme?.cursorColor || '#555' }">
              <pre class="mono tiny">user@windows ~
$ linux run {{ p.id }}
✓ ready_</pre>
            </div>
            <div class="hero-body">
              <h3>{{ p.name }}</h3>
              <p class="muted">{{ p.description }}</p>
              <span class="badge installed">{{ p.version }}</span>
              <span class="badge">⬇ {{ (p.downloads || 0).toLocaleString() }}</span>
              <span class="badge">★ {{ p.rating }}</span>
            </div>
          </RouterLink>
        </div>
        <h2>Recommended</h2>
        <div class="grid">
          <PackageCard v-for="p in recommended" :key="p.id" :pkg="p" />
        </div>
      </section>

      <RouterView v-else />
    </main>
  </div>
</template>

<style scoped>
.shell { display: grid; grid-template-columns: 230px 1fr; height: 100vh; gap: 12px; padding: 12px; }
.sidebar { padding: 14px 10px; overflow-y: auto; }
.brand { display: flex; gap: 10px; align-items: center; padding: 4px 8px 14px; }
.logo { font-size: 26px; }
.tiny { font-size: 11px; }
nav { display: flex; flex-direction: column; gap: 2px; }
.nav-item { padding: 7px 10px; border-radius: 7px; color: var(--text); display: flex; justify-content: space-between; }
.nav-item:hover { background: var(--panel-strong); }
.nav-item.router-link-exact-active { background: linear-gradient(90deg, rgba(0,255,204,.14), transparent); color: var(--accent); }
.sep { margin: 12px 8px 2px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
.count { background: var(--panel-strong); border-radius: 10px; padding: 0 8px; font-size: 11px; }
.count.hot { color: var(--warn); }
.main { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 2px; }
.topbar { display: flex; gap: 10px; align-items: center; padding: 10px 14px; position: sticky; top: 0; z-index: 5; }
.topbar input { flex: 1; }
.errbar { color: var(--err); border: 1px solid var(--err); border-radius: 8px; padding: 8px 12px; }
.progbar { display: flex; align-items: center; gap: 12px; padding: 8px 14px; }
.progbar .progress { flex: 1; }
h2 { margin: 18px 4px 10px; font-weight: 600; }
.featured { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.hero { display: flex; flex-direction: column; overflow: hidden; color: var(--text); }
.hero-swatch { padding: 18px; border-bottom: 2px solid; }
.hero-swatch pre { margin: 0; }
.hero-body { padding: 12px 16px; }
.hero-body h3 { margin: 0 0 4px; }
.hero-body p { margin: 0 0 8px; font-size: 13px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
</style>
