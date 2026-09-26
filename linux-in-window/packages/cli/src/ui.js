// Small terminal UI helpers: colors, tables, progress bars.
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const color = {
  reset: c(0), bold: c(1), dim: c(2),
  red: c(31), green: c(32), yellow: c(33), blue: c(34), magenta: c(35), cyan: c(36), white: c(37),
};

export const STATUS_COLORS = {
  installed: color.green,
  running: color.cyan,
  stopped: color.white,
  disabled: color.yellow,
  broken: color.red,
  outdated: color.magenta,
  blocked: color.red,
};

export function statusText(status) {
  const fn = STATUS_COLORS[status] || color.white;
  return fn(String(status).padEnd(10));
}

export function table(rows, headers) {
  const cols = headers.length;
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length))
  );
  const line = (cells) =>
    cells.map((cell, i) => {
      const raw = String(cell ?? '');
      const plainLen = raw.replace(/\x1b\[[0-9;]*m/g, '').length;
      return raw + ' '.repeat(Math.max(0, widths[i] - plainLen));
    }).join('  ').trimEnd();
  const out = [color.bold(line(headers)), color.dim('-'.repeat(widths.reduce((a, b) => a + b + 2, -2)))];
  for (const r of rows) out.push(line(r));
  return out.join('\n');
}

/** Render a single progress bar line: stage ████░░ 82% */
export function progressBar(stage, pct, message = '', width = 28) {
  const filled = Math.round((pct / 100) * width);
  const bar = color.cyan('█'.repeat(filled)) + color.dim('░'.repeat(width - filled));
  const line = `${stage.padEnd(16)} ${bar} ${String(Math.round(pct)).padStart(3)}%`;
  return message ? `${line}  ${color.dim(message)}` : line;
}

export function ok(msg)   { console.log(`${color.green('✓')} ${msg}`); }
export function warn(msg) { console.log(`${color.yellow('!')} ${msg}`); }
export function err(msg)  { console.log(`${color.red('✗')} ${msg}`); }
export function info(msg) { console.log(msg); }
