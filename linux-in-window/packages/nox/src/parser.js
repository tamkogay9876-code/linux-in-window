// Nox language parser.
// A tiny, safe DSL for terminal customization (terminal / scene / animation / panel / prompt).
//
// Grammar:
//   program   := block*
//   block     := IDENT arg* '{' stmt* '}'
//   stmt      := IDENT arg* '{' stmt* '}' | IDENT arg+
//   arg       := STRING | NUMBER | BOOL | BAREWORD
//   comment   := "//" to end of line
//
// Example:
//   terminal {
//       background "#050505"
//       color "#00ffcc"
//       cursor { color "#ff00aa" blink true }
//   }
//   scene {
//       cube {
//           position 0 0 -5
//           animate rotation.y { from 0 to 360 duration 4 loop true }
//       }
//   }
//   animation pulse { target "terminal" property opacity from 0.7 to 1.0 duration 1200 loop true }

export class NoxSyntaxError extends Error {
  constructor(message, line, col) {
    super(`${message} (line ${line}, col ${col})`);
    this.line = line;
    this.col = col;
  }
}

const KEYWORDS = new Set(['true', 'false']);

export function tokenize(src) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const adv = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === '\n') { line++; col = 1; } else col++;
      i++;
    }
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') { adv(); continue; }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') adv();
      continue;
    }
    if (ch === '{' || ch === '}') { tokens.push({ type: ch, line, col }); adv(); continue; }
    if (ch === '"') {
      const start = { line, col };
      adv();
      let str = '';
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') { str += src[i + 1] ?? ''; adv(2); }
        else { str += src[i]; adv(); }
      }
      if (src[i] !== '"') throw new NoxSyntaxError('unterminated string', start.line, start.col);
      adv();
      tokens.push({ type: 'string', value: str, ...start });
      continue;
    }
    const start = { line, col };
    let raw = '';
    while (i < src.length && !' \t\r\n{}"'.includes(src[i])) { raw += src[i]; adv(); }
    if (!raw) throw new NoxSyntaxError(`unexpected character "${ch}"`, start.line, start.col);
    if (/^-?\d+(\.\d+)?$/.test(raw)) tokens.push({ type: 'number', value: parseFloat(raw), ...start });
    else if (KEYWORDS.has(raw)) tokens.push({ type: 'bool', value: raw === 'true', ...start });
    else if (/^[A-Za-z_][A-Za-z0-9_.\-]*$/.test(raw)) tokens.push({ type: 'ident', value: raw, ...start });
    else throw new NoxSyntaxError(`invalid token "${raw}"`, start.line, start.col);
  }
  tokens.push({ type: 'eof', line, col });
  return tokens;
}

/**
 * Parse nox source into an AST node list.
 * Disambiguation rule: a bareword `ident` is a *value* when it is followed by
 * another value token or by `{` (e.g. `position center`, `animate rotation.y {`).
 * Otherwise it starts a new statement.
 */
export function parseNox(src) {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = (o = 0) => tokens[Math.min(pos + o, tokens.length - 1)];
  const next = () => tokens[pos++];

  const literal = (t) => t.type === 'string' || t.type === 'number' || t.type === 'bool';
  const identLike = (t) => t.type === 'ident';
  const valueStart = (t) => literal(t) || identLike(t);

  function collectValues() {
    const args = [];
    while (literal(peek())) {
      const t = next();
      args.push({ kind: t.type, value: t.value });
    }
    return args;
  }

  /** Look ahead past literals to find the token that terminates this statement. */
  function terminatorType() {
    let k = pos;
    while (tokens[k].type === 'string' || tokens[k].type === 'number' || tokens[k].type === 'bool') k++;
    return tokens[k].type;
  }

  function parseBody() {
    const body = [];
    for (;;) {
      const t = peek();
      if (t.type === 'eof') throw new NoxSyntaxError('unexpected end of file, expected "}"', t.line, t.col);
      if (t.type === '}') { next(); return body; }
      if (t.type !== 'ident') throw new NoxSyntaxError(`expected identifier, got "${t.type}"`, t.line, t.col);
      next();
      const name = t.value;
      const args = collectValues();
      // A dotted bareword (`rotation.y`) is always an argument, never a statement name.
      if (peek().type === 'ident' && peek().value.includes('.')) {
        args.push({ kind: 'ref', value: next().value });
      }
      const term = terminatorType();
      if (term === '{') {
        const extra = collectValues();
        args.push(...extra);
        next(); // consume '{'
        body.push({ kind: 'block', name, args, body: parseBody(), line: t.line });
      } else {
        if (args.length === 0) throw new NoxSyntaxError(`property "${name}" needs at least one value`, t.line, t.col);
        body.push({ kind: 'prop', name, args, line: t.line });
      }
    }
  }

  const root = [];
  while (peek().type !== 'eof') {
    const t = peek();
    if (t.type !== 'ident') throw new NoxSyntaxError(`expected block name, got "${t.type}"`, t.line, t.col);
    next();
    let args = collectValues();
    // top-level blocks may take a bareword name: `animation pulse { ... }`
    if (peek().type === 'ident' && tokens[pos + 1] && tokens[pos + 1].type === '{') {
      args = args.concat([{ kind: 'ref', value: next().value }]);
    }
    if (peek().type !== '{') throw new NoxSyntaxError(`expected "{" after "${t.value}"`, peek().line, peek().col);
    next();
    root.push({ kind: 'block', name: t.value, args, body: parseBody(), line: t.line });
  }
  return root;
}

function argValue(a) { return a.value; }

/** Convert a parsed tree into a plain JSON object (for previews / theme merging). */
export function noxToJson(nodes) {
  const out = {};
  for (const n of nodes) {
    const val = nodeToValue(n);
    if (out[n.name] === undefined) out[n.name] = val;
    else if (Array.isArray(out[n.name])) out[n.name].push(val);
    else out[n.name] = [out[n.name], val];
  }
  return out;
}

function nodeToValue(n) {
  const args = n.args.map(argValue);
  if (n.kind === 'prop') return args.length === 1 ? args[0] : args;
  const obj = {};
  if (args.length) obj.$args = args;
  for (const child of n.body) {
    const cv = nodeToValue(child);
    if (obj[child.name] === undefined) obj[child.name] = cv;
    else if (Array.isArray(obj[child.name])) obj[child.name].push(cv);
    else obj[child.name] = [obj[child.name], cv];
  }
  return obj;
}

export function validateNox(src) {
  try {
    const ast = parseNox(src);
    return { ok: true, ast, errors: [] };
  } catch (e) {
    return { ok: false, ast: null, errors: [e.message] };
  }
}
