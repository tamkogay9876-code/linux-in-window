// Nox runtime: executes a parsed .nox program against a capability-based sandbox.
// Only whitelisted APIs are exposed; unknown blocks/props are rejected so a mod can
// never reach fs/network/registry through this channel.

import { parseNox } from './parser.js';

export class NoxRuntimeError extends Error {}

export const ALLOWED_TOP_BLOCKS = new Set([
  'terminal', 'scene', 'animation', 'panel', 'prompt', 'cursor', 'window', 'widget',
]);

const DEFAULT_LIMITS = { maxNodes: 5000, maxDepth: 12 };

/**
 * Create a sandboxed runtime bound to an API surface.
 * @param {object} api e.g. { terminal:{background,color,cursor}, scene:{...}, log:(msg)=>{} }
 */
export function createNoxRuntime(api, limits = DEFAULT_LIMITS) {
  let nodeCount = 0;

  function run(source) {
    const ast = parseNox(source);
    if (ast.length === 0) throw new NoxRuntimeError('empty nox program');
    for (const top of ast) {
      if (!ALLOWED_TOP_BLOCKS.has(top.name)) {
        throw new NoxRuntimeError(`block "${top.name}" is not allowed in the sandbox`);
      }
      applyBlock(top, api[top.name], 1);
    }
    return true;
  }

  function checkBudget() {
    if (++nodeCount > limits.maxNodes) {
      throw new NoxRuntimeError(`nox program exceeds ${limits.maxNodes} nodes (possible runaway script)`);
    }
  }

  function applyBlock(node, target, depth) {
    checkBudget();
    if (!target) throw new NoxRuntimeError(`API "${node.name}" is not available in this sandbox`);
    if (depth > limits.maxDepth) throw new NoxRuntimeError('nox program exceeds maximum nesting depth');
    for (const stmt of node.body) {
      checkBudget();
      if (stmt.kind === 'prop') {
        const fn = target[stmt.name];
        if (typeof fn !== 'function') {
          throw new NoxRuntimeError(`"${stmt.name}" is not a valid property of "${node.name}"`);
        }
        fn(...stmt.args.map((a) => a.value));
      } else {
        const sub = target[stmt.name];
        if (!sub || typeof sub !== 'object') {
          throw new NoxRuntimeError(`"${stmt.name}" is not a valid block of "${node.name}"`);
        }
        applyBlock(stmt, sub, depth + 1);
      }
    }
  }

  return { run };
}

/**
 * Build a recording API surface — useful for tests and for compiling nox -> JSON theme.
 */
export function recordingApi() {
  const record = { calls: [] };
  const makeProxy = (pathStr) =>
    new Proxy({}, {
      get(_, prop) {
        if (prop === Symbol.toPrimitive || prop === 'toJSON') return () => pathStr;
        return (...args) => {
          record.calls.push({ path: `${pathStr}.${String(prop)}`, args });
          return undefined;
        };
      },
      has() { return true; },
    });
  const api = {};
  for (const block of ALLOWED_TOP_BLOCKS) api[block] = makeProxy(block);
  return { api, record };
}

/** Compile nox source into a declarative JSON structure with validation. */
export function compileNox(source) {
  const { api, record } = recordingApi();
  const rt = createNoxRuntime(api);
  rt.run(source);
  // also produce tree form
  const ast = parseNox(source);
  return { calls: record.calls, ast };
}
