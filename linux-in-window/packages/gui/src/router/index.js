import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/discover', name: 'discover', component: () => import('../views/DiscoverView.vue') },
  { path: '/category/:cat', name: 'category', component: () => import('../views/DiscoverView.vue'), props: true },
  { path: '/package/:id', name: 'package', component: () => import('../views/PackageView.vue'), props: true },
  { path: '/installed', name: 'installed', component: () => import('../views/InstalledView.vue') },
  { path: '/updates', name: 'updates', component: () => import('../views/UpdatesView.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
];

export default createRouter({ history: createWebHashHistory(), routes });
