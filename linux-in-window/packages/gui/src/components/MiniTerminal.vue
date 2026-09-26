<script setup>
// Mini terminal embedded in the GUI — runs `linux ...` commands through IPC
// (liw:terminal-exec), which shells out to the real CLI implementation.
import { ref, nextTick } from 'vue';

const props = defineProps({ compact: { type: Boolean, default: false } });
const open = ref(false);
const lines = ref(['Linux in Window mini terminal', 'type: linux list | linux search <q> | linux doctor']);
const input = ref('');
const box = ref(null);

async function submit() {
  const cmd = input.value.trim();
  input.value = '';
  if (!cmd) return;
  lines.value.push('$ ' + cmd);
  try {
    const api = await import('../api.js');
    // eslint-disable-next-line no-undef
    const r = await window.liw?.terminalExec?.({ line: cmd }) || { output: '(mini terminal needs the desktop app)', exitCode: 0 };
    lines.value.push(r.output || '(no output)');
  } catch (e) {
    lines.value.push('✗ ' + e.message);
  }
  await nextTick();
  if (box.value) box.value.scrollTop = box.value.scrollHeight;
}
</script>

<template>
  <div class="mini">
    <button v-if="compact" class="small" @click="open = !open">⌨ Terminal</button>
    <div v-show="!compact || open" class="term card" :class="{ pop: compact }">
      <div ref="box" class="out mono">
        <div v-for="(l, i) in lines" :key="i" class="line">{{ l }}</div>
      </div>
      <div class="inputline">
        <span class="prompt">linux&gt;</span>
        <input v-model="input" @keyup.enter="submit" placeholder="linux list" spellcheck="false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mini { position: relative; }
.term { width: 420px; max-width: 60vw; background: rgba(0,0,0,.55); padding: 10px; }
.term.pop { position: absolute; right: 0; top: 120%; z-index: 30; box-shadow: 0 12px 40px rgba(0,0,0,.5); }
.out { max-height: 260px; overflow-y: auto; font-size: 12px; white-space: pre-wrap; }
.line { margin: 1px 0; }
.inputline { display: flex; gap: 6px; align-items: center; margin-top: 6px; border-top: 1px solid var(--border); padding-top: 6px; }
.prompt { color: var(--accent); font-family: var(--font-mono); }
.inputline input { flex: 1; border: none; background: transparent; color: var(--text); outline: none; font-family: var(--font-mono); }
</style>
