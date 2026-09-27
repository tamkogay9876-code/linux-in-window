import { virtualFS } from './virtualFs';
import { DISTROS, DISTRO_ASCII } from './distroConfig';
import { DistroTheme, TerminalOutputLine } from '../types';

export interface ShellContext {
  cwd: string;
  distro: DistroTheme;
  history: string[];
  installedPackages: Set<string>;
  env: Record<string, string>;
  openApp?: (appType: any, data?: any) => void;
  clearTerminal?: () => void;
  startTime: number;
}

export class ShellEngine {
  private startTime: number = Date.now();
  private installedPackages: Set<string> = new Set(['cmatrix', 'sl', 'cowsay', 'fortune', 'neofetch', 'figlet', 'tree', 'htop']);

  constructor() {}

  public getPrompt(cwd: string, user: string = 'user', host: string = 'linux-in-window'): string {
    const displayPath = cwd === '/home/user' ? '~' : cwd.startsWith('/home/user/') ? '~' + cwd.slice('/home/user'.length) : cwd;
    return `${user}@${host}:${displayPath}$`;
  }

  public tokenize(cmdLine: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < cmdLine.length; i++) {
      const char = cmdLine[i];
      if ((char === '"' || char === "'") && (!inQuotes || quoteChar === char)) {
        if (inQuotes) {
          inQuotes = false;
          quoteChar = '';
        } else {
          inQuotes = true;
          quoteChar = char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current.length > 0) {
      tokens.push(current);
    }
    return tokens;
  }

  public async execute(
    input: string,
    ctx: ShellContext
  ): Promise<{ lines: TerminalOutputLine[]; newCwd?: string }> {
    const trimmed = input.trim();
    if (!trimmed) {
      return { lines: [] };
    }

    // Add to history
    ctx.history.push(trimmed);

    // Handle Redirection: cmd > file or cmd >> file
    const appendMatch = trimmed.match(/^(.*?)\s*>>\s*([^>]+)$/);
    const writeMatch = !appendMatch ? trimmed.match(/^(.*?)\s*>\s*([^>]+)$/) : null;

    if (appendMatch || writeMatch) {
      const isAppend = Boolean(appendMatch);
      const commandPart = (appendMatch ? appendMatch[1] : writeMatch![1]).trim();
      const targetFile = (appendMatch ? appendMatch[2] : writeMatch![2]).trim();

      const result = await this.execute(commandPart, ctx);
      const outputText = result.lines.map(l => l.text).join('\n');
      const resolvedPath = virtualFS.resolvePath(ctx.cwd, targetFile);

      try {
        let newContent = outputText + '\n';
        if (isAppend && virtualFS.exists(resolvedPath)) {
          newContent = virtualFS.readFile(resolvedPath) + newContent;
        }
        virtualFS.writeFile(resolvedPath, newContent);
        return { lines: [] };
      } catch (err: any) {
        return {
          lines: [{ id: Math.random().toString(), type: 'error', text: `bash: ${err.message}` }],
        };
      }
    }

    // Handle Piping: cmd1 | cmd2
    if (trimmed.includes('|')) {
      const pipeSegments = trimmed.split('|').map(s => s.trim());
      let pipeInputText = '';

      for (let i = 0; i < pipeSegments.length; i++) {
        const seg = pipeSegments[i];
        const tokens = this.tokenize(seg);
        if (tokens.length === 0) continue;

        const cmd = tokens[0];
        const args = tokens.slice(1);

        if (i === 0) {
          const res = await this.executeSingleCommand(cmd, args, ctx, '');
          pipeInputText = res.lines.map(l => l.text).join('\n');
        } else {
          const res = await this.executeSingleCommand(cmd, args, ctx, pipeInputText);
          pipeInputText = res.lines.map(l => l.text).join('\n');
          if (i === pipeSegments.length - 1) {
            return res;
          }
        }
      }
    }

    // Single command execution
    const tokens = this.tokenize(trimmed);
    const cmd = tokens[0];
    const args = tokens.slice(1);

    return this.executeSingleCommand(cmd, args, ctx);
  }

  private async executeSingleCommand(
    cmd: string,
    args: string[],
    ctx: ShellContext,
    pipeInput?: string
  ): Promise<{ lines: TerminalOutputLine[]; newCwd?: string }> {
    const lines: TerminalOutputLine[] = [];
    const distroInfo = DISTROS[ctx.distro] || DISTROS.ubuntu;

    const makeLine = (text: string, type: TerminalOutputLine['type'] = 'output', rawHtml?: boolean): TerminalOutputLine => ({
      id: Math.random().toString(),
      type,
      text,
      rawHtml,
    });

    switch (cmd) {
      case 'clear':
      case 'cls': {
        if (ctx.clearTerminal) {
          ctx.clearTerminal();
        }
        return { lines: [] };
      }

      case 'help': {
        lines.push(makeLine('================ LINUX IN WINDOW - COMMAND REFERENCE ================', 'info'));
        lines.push(makeLine('📁 File & Directory Operations:'));
        lines.push(makeLine('   ls [-la] [dir]       List files & directories with color & details'));
        lines.push(makeLine('   cd [dir]             Change current directory (supports .., ~, -)'));
        lines.push(makeLine('   pwd                  Print current working directory'));
        lines.push(makeLine('   cat [file...]        Display file contents'));
        lines.push(makeLine('   mkdir [-p] [dir]     Create directories'));
        lines.push(makeLine('   touch [file]         Create empty file'));
        lines.push(makeLine('   rm [-rf] [path]      Remove file or directory'));
        lines.push(makeLine('   cp [src] [dest]      Copy file or directory'));
        lines.push(makeLine('   mv [src] [dest]      Move or rename file'));
        lines.push(makeLine('   tree [dir]           Display recursive directory tree structure'));
        lines.push(makeLine(''));
        lines.push(makeLine('🔍 Search & Text Filtering:'));
        lines.push(makeLine('   grep [pattern] [file] Search for matching lines (supports pipes)'));
        lines.push(makeLine('   find [path] [-name]  Search for files by name'));
        lines.push(makeLine('   head [-n N] [file]   Show first N lines'));
        lines.push(makeLine('   tail [-n N] [file]   Show last N lines'));
        lines.push(makeLine('   wc [-l|-w|-c] [file] Word, line, and byte count'));
        lines.push(makeLine(''));
        lines.push(makeLine('⚡ System & Process Monitoring:'));
        lines.push(makeLine('   neofetch / fastfetch Display distro badge, kernel, memory specs'));
        lines.push(makeLine('   htop / top           Open interactive system resource monitor'));
        lines.push(makeLine('   ps [aux]             List running simulated processes'));
        lines.push(makeLine('   kill [pid]           Terminate a process'));
        lines.push(makeLine('   free [-m|-h]         Show RAM and Swap usage'));
        lines.push(makeLine('   df [-h]              Show virtual disk usage statistics'));
        lines.push(makeLine('   uname [-a]           Display Linux kernel version & architecture'));
        lines.push(makeLine('   uptime               System running duration and load average'));
        lines.push(makeLine('   date / whoami / env  Show date, active username, environment vars'));
        lines.push(makeLine(''));
        lines.push(makeLine('📦 Package Management & Software:'));
        lines.push(makeLine('   apt update           Update package list index'));
        lines.push(makeLine('   apt install [pkg]    Install tools (cmatrix, sl, cowsay, etc.)'));
        lines.push(makeLine('   apt list             List available/installed packages'));
        lines.push(makeLine(''));
        lines.push(makeLine('🎮 Fun & Terminal Toys:'));
        lines.push(makeLine('   cmatrix              Stream green digital matrix rain'));
        lines.push(makeLine('   sl                   Classic steam locomotive driving across screen'));
        lines.push(makeLine('   cowsay "text"        ASCII talking cow banner'));
        lines.push(makeLine('   fortune              Generate random tech wisdom / quote'));
        lines.push(makeLine('   figlet "text"        Large ASCII art banners'));
        lines.push(makeLine(''));
        lines.push(makeLine('💻 Coding & Editors:'));
        lines.push(makeLine('   nano [file] / vim    Open full-screen terminal text editor'));
        lines.push(makeLine('   python / python3     Launch interactive Python 3 REPL or run script'));
        lines.push(makeLine('   sh / bash [file]     Execute a shell script'));
        lines.push(makeLine('   curl [url] / ping    Simulate HTTP requests & network ping latency'));
        lines.push(makeLine('======================================================================', 'info'));
        return { lines };
      }

      case 'pwd': {
        lines.push(makeLine(ctx.cwd));
        return { lines };
      }

      case 'cd': {
        const target = args[0] || '~';
        let resolved = virtualFS.resolvePath(ctx.cwd, target);
        if (target === '-') {
          resolved = ctx.env.OLDPWD || '/home/user';
        }

        if (!virtualFS.exists(resolved)) {
          lines.push(makeLine(`bash: cd: ${target}: No such file or directory`, 'error'));
          return { lines };
        }
        if (!virtualFS.isDir(resolved)) {
          lines.push(makeLine(`bash: cd: ${target}: Not a directory`, 'error'));
          return { lines };
        }

        ctx.env.OLDPWD = ctx.cwd;
        return { lines, newCwd: resolved };
      }

      case 'ls': {
        let showAll = false;
        let showLong = false;
        const pathsToCheck: string[] = [];

        for (const arg of args) {
          if (arg.startsWith('-')) {
            if (arg.includes('a')) showAll = true;
            if (arg.includes('l')) showLong = true;
          } else {
            pathsToCheck.push(arg);
          }
        }

        const targetDir = pathsToCheck[0] ? virtualFS.resolvePath(ctx.cwd, pathsToCheck[0]) : ctx.cwd;

        try {
          const nodes = virtualFS.listDir(targetDir);
          const filtered = showAll ? nodes : nodes.filter(n => !n.name.startsWith('.'));

          if (showLong) {
            lines.push(makeLine(`total ${filtered.length * 4}`));
            for (const node of filtered) {
              const dateStr = new Date(node.modified).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
              const sizeStr = node.size.toString().padStart(6, ' ');
              const perm = node.permissions || (node.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--');
              const nameDisplay = node.type === 'dir' ? `📁 \x1b[1;34m${node.name}/\x1b[0m` : node.isExecutable ? `⚡ \x1b[1;32m${node.name}\x1b[0m` : `📄 ${node.name}`;
              lines.push(makeLine(`${perm}  1 user user  ${sizeStr}  ${dateStr}  ${nameDisplay}`, 'output', true));
            }
          } else {
            // Grid columns format
            if (filtered.length === 0) {
              return { lines: [] };
            }
            const formattedNames = filtered.map(node => {
              if (node.type === 'dir') return `📁 ${node.name}/`;
              if (node.isExecutable) return `⚡ ${node.name}`;
              return `📄 ${node.name}`;
            });
            lines.push(makeLine(formattedNames.join('    ')));
          }
        } catch (e: any) {
          lines.push(makeLine(e.message, 'error'));
        }
        return { lines };
      }

      case 'cat': {
        let contentToRead = pipeInput || '';
        if (args.length > 0) {
          for (const file of args) {
            const resolved = virtualFS.resolvePath(ctx.cwd, file);
            try {
              const fileContent = virtualFS.readFile(resolved);
              contentToRead += (contentToRead ? '\n' : '') + fileContent;
            } catch (err: any) {
              lines.push(makeLine(err.message, 'error'));
              return { lines };
            }
          }
        }
        if (contentToRead) {
          contentToRead.split('\n').forEach(line => lines.push(makeLine(line)));
        }
        return { lines };
      }

      case 'echo': {
        let text = args.join(' ');
        // Environment variable expansion
        text = text.replace(/\$([A-Za-z0-9_]+)/g, (_, varName) => {
          if (varName === 'USER') return 'user';
          if (varName === 'HOME') return '/home/user';
          if (varName === 'PWD') return ctx.cwd;
          if (varName === 'SHELL') return '/bin/bash';
          return ctx.env[varName] || '';
        });
        lines.push(makeLine(text));
        return { lines };
      }

      case 'mkdir': {
        if (args.length === 0) {
          lines.push(makeLine('mkdir: missing operand', 'error'));
          return { lines };
        }
        for (const dir of args) {
          if (dir.startsWith('-')) continue;
          const resolved = virtualFS.resolvePath(ctx.cwd, dir);
          try {
            virtualFS.makeDir(resolved);
          } catch (err: any) {
            lines.push(makeLine(err.message, 'error'));
          }
        }
        return { lines };
      }

      case 'touch': {
        if (args.length === 0) {
          lines.push(makeLine('touch: missing file operand', 'error'));
          return { lines };
        }
        for (const file of args) {
          const resolved = virtualFS.resolvePath(ctx.cwd, file);
          if (!virtualFS.exists(resolved)) {
            virtualFS.writeFile(resolved, '');
          }
        }
        return { lines };
      }

      case 'rm': {
        let recursive = false;
        const targets: string[] = [];
        for (const arg of args) {
          if (arg === '-r' || arg === '-rf' || arg === '-f') {
            recursive = true;
          } else {
            targets.push(arg);
          }
        }

        if (targets.length === 0) {
          lines.push(makeLine('rm: missing operand', 'error'));
          return { lines };
        }

        for (const target of targets) {
          const resolved = virtualFS.resolvePath(ctx.cwd, target);
          try {
            virtualFS.remove(resolved, recursive);
          } catch (err: any) {
            lines.push(makeLine(err.message, 'error'));
          }
        }
        return { lines };
      }

      case 'cp': {
        if (args.length < 2) {
          lines.push(makeLine('cp: missing file operand', 'error'));
          return { lines };
        }
        try {
          virtualFS.copy(virtualFS.resolvePath(ctx.cwd, args[0]), virtualFS.resolvePath(ctx.cwd, args[1]));
        } catch (err: any) {
          lines.push(makeLine(err.message, 'error'));
        }
        return { lines };
      }

      case 'mv': {
        if (args.length < 2) {
          lines.push(makeLine('mv: missing destination file operand', 'error'));
          return { lines };
        }
        try {
          virtualFS.move(virtualFS.resolvePath(ctx.cwd, args[0]), virtualFS.resolvePath(ctx.cwd, args[1]));
        } catch (err: any) {
          lines.push(makeLine(err.message, 'error'));
        }
        return { lines };
      }

      case 'grep': {
        const pattern = args[0];
        if (!pattern) {
          lines.push(makeLine('Usage: grep [PATTERN] [FILE...]', 'error'));
          return { lines };
        }

        let searchSource = pipeInput;
        if (!searchSource && args.length > 1) {
          const resolved = virtualFS.resolvePath(ctx.cwd, args[1]);
          try {
            searchSource = virtualFS.readFile(resolved);
          } catch (err: any) {
            lines.push(makeLine(err.message, 'error'));
            return { lines };
          }
        }

        if (!searchSource) {
          return { lines };
        }

        const regex = new RegExp(pattern, 'i');
        const matchingLines = searchSource.split('\n').filter(l => regex.test(l));
        matchingLines.forEach(l => lines.push(makeLine(l)));
        return { lines };
      }

      case 'wc': {
        let countLines = false;
        let countWords = false;
        let countChars = false;
        let targetFile = '';

        for (const arg of args) {
          if (arg === '-l') countLines = true;
          else if (arg === '-w') countWords = true;
          else if (arg === '-c') countChars = true;
          else targetFile = arg;
        }

        if (!countLines && !countWords && !countChars) {
          countLines = true;
          countWords = true;
          countChars = true;
        }

        let content = pipeInput || '';
        if (!content && targetFile) {
          try {
            content = virtualFS.readFile(virtualFS.resolvePath(ctx.cwd, targetFile));
          } catch (err: any) {
            lines.push(makeLine(err.message, 'error'));
            return { lines };
          }
        }

        const lCount = content ? content.split('\n').length : 0;
        const wCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
        const cCount = content.length;

        const parts: string[] = [];
        if (countLines) parts.push(lCount.toString().padStart(4, ' '));
        if (countWords) parts.push(wCount.toString().padStart(4, ' '));
        if (countChars) parts.push(cCount.toString().padStart(6, ' '));
        if (targetFile) parts.push(targetFile);

        lines.push(makeLine(parts.join(' ')));
        return { lines };
      }

      case 'head': {
        let numLines = 10;
        let targetFile = '';
        if (args[0] === '-n' && args[1]) {
          numLines = parseInt(args[1], 10) || 10;
          targetFile = args[2] || '';
        } else {
          targetFile = args[0] || '';
        }

        let content = pipeInput || '';
        if (!content && targetFile) {
          try {
            content = virtualFS.readFile(virtualFS.resolvePath(ctx.cwd, targetFile));
          } catch (err: any) {
            lines.push(makeLine(err.message, 'error'));
            return { lines };
          }
        }

        content.split('\n').slice(0, numLines).forEach(l => lines.push(makeLine(l)));
        return { lines };
      }

      case 'tail': {
        let numLines = 10;
        let targetFile = '';
        if (args[0] === '-n' && args[1]) {
          numLines = parseInt(args[1], 10) || 10;
          targetFile = args[2] || '';
        } else {
          targetFile = args[0] || '';
        }

        let content = pipeInput || '';
        if (!content && targetFile) {
          try {
            content = virtualFS.readFile(virtualFS.resolvePath(ctx.cwd, targetFile));
          } catch (err: any) {
            lines.push(makeLine(err.message, 'error'));
            return { lines };
          }
        }

        const split = content.split('\n');
        split.slice(Math.max(0, split.length - numLines)).forEach(l => lines.push(makeLine(l)));
        return { lines };
      }

      case 'find': {
        const rootPath = args[0] && !args[0].startsWith('-') ? virtualFS.resolvePath(ctx.cwd, args[0]) : ctx.cwd;
        const nameIdx = args.indexOf('-name');
        const pattern = nameIdx !== -1 ? args[nameIdx + 1]?.replace(/[*"]/g, '') : null;

        const all = virtualFS.getAllFilesList();
        const matches = all.filter(n => {
          if (!n.path.startsWith(rootPath)) return false;
          if (pattern && !n.name.toLowerCase().includes(pattern.toLowerCase())) return false;
          return true;
        });

        matches.forEach(m => lines.push(makeLine(m.path)));
        return { lines };
      }

      case 'tree': {
        const target = args[0] ? virtualFS.resolvePath(ctx.cwd, args[0]) : ctx.cwd;
        lines.push(makeLine(`📁 ${target}`));

        const printTree = (dirPath: string, prefix: string = '') => {
          try {
            const nodes = virtualFS.listDir(dirPath);
            nodes.forEach((n, idx) => {
              const isLast = idx === nodes.length - 1;
              const branch = isLast ? '└── ' : '├── ';
              const icon = n.type === 'dir' ? '📁' : n.isExecutable ? '⚡' : '📄';
              lines.push(makeLine(`${prefix}${branch}${icon} ${n.name}`));
              if (n.type === 'dir') {
                printTree(n.path, prefix + (isLast ? '    ' : '│   '));
              }
            });
          } catch (e) {
            // ignore
          }
        };

        printTree(target);
        return { lines };
      }

      case 'neofetch':
      case 'fastfetch': {
        const ascii = DISTRO_ASCII[ctx.distro] || DISTRO_ASCII.ubuntu;
        const uptimeMin = Math.floor((Date.now() - ctx.startTime) / 60000);
        const infoBlock = [
          `\x1b[1;32muser\x1b[0m@\x1b[1;32mlinux-in-window\x1b[0m`,
          `---------------------------`,
          `\x1b[1;34mOS:\x1b[0m ${distroInfo.name} (${distroInfo.codename})`,
          `\x1b[1;34mHost:\x1b[0m AI Studio Web Virtual Container`,
          `\x1b[1;34mKernel:\x1b[0m ${distroInfo.kernel}`,
          `\x1b[1;34mUptime:\x1b[0m ${uptimeMin} mins`,
          `\x1b[1;34mPackages:\x1b[0m ${ctx.installedPackages.size + 1420} (dpkg)`,
          `\x1b[1;34mShell:\x1b[0m bash 5.2.21`,
          `\x1b[1;34mResolution:\x1b[0m ${window.innerWidth}x${window.innerHeight}`,
          `\x1b[1;34mDE:\x1b[0m Linux-in-Window Fluent Desktop`,
          `\x1b[1;34mTerminal:\x1b[0m xterm-256color`,
          `\x1b[1;34mCPU:\x1b[0m AMD Ryzen 9 7950X (16) @ 4.500GHz`,
          `\x1b[1;34mMemory:\x1b[0m 2748MiB / 8192MiB`,
          `\x1b[40m   \x1b[41m   \x1b[42m   \x1b[43m   \x1b[44m   \x1b[45m   \x1b[46m   \x1b[47m   \x1b[0m`,
        ];

        const maxLines = Math.max(ascii.length, infoBlock.length);
        for (let i = 0; i < maxLines; i++) {
          const left = (ascii[i] || '                  ').padEnd(20, ' ');
          const right = infoBlock[i] || '';
          lines.push(makeLine(`${left}  ${right}`, 'output', true));
        }
        return { lines };
      }

      case 'uname': {
        if (args.includes('-a')) {
          lines.push(makeLine(`Linux linux-in-window ${distroInfo.kernel} SMP PREEMPT_DYNAMIC #40-Ubuntu x86_64 GNU/Linux`));
        } else if (args.includes('-r')) {
          lines.push(makeLine(distroInfo.kernel.split(' ')[1] || '6.8.0-40-generic'));
        } else {
          lines.push(makeLine('Linux'));
        }
        return { lines };
      }

      case 'whoami': {
        lines.push(makeLine('user'));
        return { lines };
      }

      case 'hostname': {
        lines.push(makeLine('linux-in-window'));
        return { lines };
      }

      case 'date': {
        lines.push(makeLine(new Date().toString()));
        return { lines };
      }

      case 'uptime': {
        const uptimeSeconds = Math.floor((Date.now() - ctx.startTime) / 1000);
        const hours = Math.floor(uptimeSeconds / 3600);
        const mins = Math.floor((uptimeSeconds % 3600) / 60);
        lines.push(makeLine(` ${new Date().toLocaleTimeString()} up ${hours}h ${mins}m, 1 user, load average: 0.12, 0.08, 0.04`));
        return { lines };
      }

      case 'free': {
        lines.push(makeLine('               total        used        free      shared  buff/cache   available'));
        lines.push(makeLine('Mem:         8192000     2748000     4821240       35000      622760     5942100'));
        lines.push(makeLine('Swap:        2097152           0     2097152'));
        return { lines };
      }

      case 'df': {
        lines.push(makeLine('Filesystem     1K-blocks     Used Available Use% Mounted on'));
        lines.push(makeLine('udev             4096000        0   4096000   0% /dev'));
        lines.push(makeLine('tmpfs             819200     1450    817750   1% /run'));
        lines.push(makeLine('/dev/nvme0n1p2 250000000 34500000 205000000  15% /'));
        lines.push(makeLine('tmpfs            4096000        0   4096000   0% /dev/shm'));
        return { lines };
      }

      case 'ps': {
        lines.push(makeLine('  PID TTY          TIME CMD'));
        lines.push(makeLine('    1 ?        00:00:01 systemd'));
        lines.push(makeLine('  412 ?        00:00:00 dbus-daemon'));
        lines.push(makeLine('  890 ?        00:00:02 xorg-server'));
        lines.push(makeLine(' 1042 ?        00:00:04 window-manager'));
        lines.push(makeLine(' 1205 pts/0    00:00:00 bash'));
        lines.push(makeLine(' 1340 pts/0    00:00:00 ps'));
        return { lines };
      }

      case 'kill': {
        if (!args[0]) {
          lines.push(makeLine('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]', 'error'));
          return { lines };
        }
        lines.push(makeLine(`[+] Process PID ${args[0]} terminated.`));
        return { lines };
      }

      case 'curl': {
        const url = args.find(a => !a.startsWith('-')) || 'http://localhost';
        lines.push(makeLine(`Connecting to ${url}...`, 'info'));
        await new Promise(r => setTimeout(r, 600));
        lines.push(makeLine(`HTTP/1.1 200 OK`));
        lines.push(makeLine(`Server: nginx/1.24.0 (Ubuntu)`));
        lines.push(makeLine(`Content-Type: application/json; charset=utf-8`));
        lines.push(makeLine(``));
        lines.push(makeLine(JSON.stringify({
          status: 'online',
          message: 'Response received successfully from virtual container',
          service: 'linux-in-window-bridge',
          timestamp: Date.now(),
        }, null, 2)));
        return { lines };
      }

      case 'ping': {
        const host = args.find(a => !a.startsWith('-')) || 'google.com';
        lines.push(makeLine(`PING ${host} (142.250.190.46) 56(84) bytes of data.`));
        for (let i = 1; i <= 3; i++) {
          const latency = (12.4 + Math.random() * 8).toFixed(1);
          lines.push(makeLine(`64 bytes from ${host}: icmp_seq=${i} ttl=118 time=${latency} ms`));
        }
        lines.push(makeLine(`--- ${host} ping statistics ---`));
        lines.push(makeLine(`3 packets transmitted, 3 received, 0% packet loss, time 2003ms`));
        return { lines };
      }

      case 'cmatrix': {
        if (ctx.openApp) {
          ctx.openApp('cmatrix');
        }
        lines.push(makeLine('[+] Launching CMatrix digital rain...', 'success'));
        return { lines };
      }

      case 'sl': {
        lines.push(makeLine('                          (  ) (@@) ( )  )'));
        lines.push(makeLine('                     (@@@)'));
        lines.push(makeLine('                 (    )'));
        lines.push(makeLine('              (@@@@)'));
        lines.push(makeLine('          (   )'));
        lines.push(makeLine('        ====        ________                ___________'));
        lines.push(makeLine('    _D _|  |_______/        \\__I_I_____===__|_________|'));
        lines.push(makeLine('   |(_)---  |   H\\________/ |   |        =|___ ___|'));
        lines.push(makeLine('   /     |===========|   |_________________|_|___|_|'));
        lines.push(makeLine('  |      |====LINUX==|   |_________________________|'));
        lines.push(makeLine('  |______|___________|___|_________________________|'));
        lines.push(makeLine('     O--O-O        O-O-O    (O) (O)       (O) (O)'));
        lines.push(makeLine('========================================================'));
        lines.push(makeLine('Choo-choo! Steam locomotive arrived safely!'));
        return { lines };
      }

      case 'cowsay': {
        const text = args.join(' ') || 'Moo! Linux is awesome!';
        const borderLen = text.length + 2;
        const top = ' ' + '_'.repeat(borderLen);
        const bottom = ' ' + '-'.repeat(borderLen);
        lines.push(makeLine(top));
        lines.push(makeLine(`< ${text} >`));
        lines.push(makeLine(bottom));
        lines.push(makeLine('        \\   ^__^'));
        lines.push(makeLine('         \\  (oo)\\_______'));
        lines.push(makeLine('            (__)\\       )\\/\\'));
        lines.push(makeLine('                ||----w |'));
        lines.push(makeLine('                ||     ||'));
        return { lines };
      }

      case 'fortune': {
        const quotes = [
          '"There are only two hard things in Computer Science: cache invalidation and naming things." - Phil Karlton',
          '"Talk is cheap. Show me the code." - Linus Torvalds',
          '"Software is like sex: it\'s better when it\'s free." - Linus Torvalds',
          '"Programs must be written for people to read, and only incidentally for machines to execute." - Hal Abelson',
          '"Simplicity is prerequisite for reliability." - Edsger W. Dijkstra',
          '"Linux is not an operating system. Linux is a kernel. Everything else is userspace magnificence."',
          '"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." - Martin Fowler',
        ];
        lines.push(makeLine(quotes[Math.floor(Math.random() * quotes.length)], 'info'));
        return { lines };
      }

      case 'figlet': {
        const text = (args.join(' ') || 'LINUX').toUpperCase();
        lines.push(makeLine(` _     ___ _   _ _   ___  __`));
        lines.push(makeLine(`| |   |_ _| \\ | | | | \\ \\/ /`));
        lines.push(makeLine(`| |    | ||  \\| | | | |\\  / `));
        lines.push(makeLine(`| |___ | || |\\  | |_| |/  \\ `));
        lines.push(makeLine(`|_____|___|_| \\_|\\___//_/\\_\\`));
        lines.push(makeLine(`>> ${text}`));
        return { lines };
      }

      case 'apt':
      case 'apt-get': {
        const sub = args[0];
        if (sub === 'update') {
          lines.push(makeLine(`Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease`));
          lines.push(makeLine(`Hit:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease`));
          lines.push(makeLine(`Hit:3 http://security.ubuntu.com/ubuntu noble-security InRelease`));
          lines.push(makeLine(`Reading package lists... Done`));
          lines.push(makeLine(`Building dependency tree... Done`));
          lines.push(makeLine(`All packages are up to date.`, 'success'));
        } else if (sub === 'install') {
          const pkg = args[1];
          if (!pkg) {
            lines.push(makeLine('apt install: missing package name', 'error'));
            return { lines };
          }
          lines.push(makeLine(`Reading package lists... Done`));
          lines.push(makeLine(`Building dependency tree... Done`));
          lines.push(makeLine(`The following NEW packages will be installed:`));
          lines.push(makeLine(`  ${pkg}`));
          lines.push(makeLine(`0 upgraded, 1 newly installed, 0 to remove.`));
          lines.push(makeLine(`Unpacking ${pkg} (1.0-1ubuntu1) ...`));
          lines.push(makeLine(`Setting up ${pkg} ...`));
          ctx.installedPackages.add(pkg);
          lines.push(makeLine(`Successfully installed ${pkg}!`, 'success'));
        } else if (sub === 'list') {
          lines.push(makeLine(`Installed packages (${ctx.installedPackages.size}):`));
          Array.from(ctx.installedPackages).forEach(p => lines.push(makeLine(` - ${p}/noble [installed]`)));
        } else {
          lines.push(makeLine('Usage: apt [update | install <pkg> | list | search <term>]'));
        }
        return { lines };
      }

      case 'python':
      case 'python3': {
        if (args.length === 0) {
          if (ctx.openApp) {
            ctx.openApp('python');
          }
          lines.push(makeLine('Python 3.12.3 (main, Apr 10 2024, 05:33:47) [GCC 13.2.0] on linux'));
          lines.push(makeLine('Type "help", "copyright", "credits" or "license" for more information.'));
          lines.push(makeLine('[+] Launching Python 3 Interactive Workspace in dedicated window...', 'info'));
          return { lines };
        }

        const scriptPath = virtualFS.resolvePath(ctx.cwd, args[0]);
        try {
          const code = virtualFS.readFile(scriptPath);
          lines.push(makeLine(`[+] Executing Python script: ${args[0]}`, 'info'));
          const output = this.executeSimulatedPython(code);
          output.forEach(o => lines.push(makeLine(o)));
        } catch (e: any) {
          lines.push(makeLine(`python: can't open file '${args[0]}': ${e.message}`, 'error'));
        }
        return { lines };
      }

      case 'nano':
      case 'vim':
      case 'vi': {
        const file = args[0] || 'untitled.txt';
        const resolved = virtualFS.resolvePath(ctx.cwd, file);
        if (ctx.openApp) {
          ctx.openApp('text-editor', { filePath: resolved });
        }
        lines.push(makeLine(`[+] Opening ${file} in editor...`, 'success'));
        return { lines };
      }

      case 'htop':
      case 'top': {
        if (ctx.openApp) {
          ctx.openApp('sysmon');
        }
        lines.push(makeLine('[+] Launching System Resource Monitor...', 'success'));
        return { lines };
      }

      case 'sh':
      case 'bash': {
        if (args.length === 0) {
          lines.push(makeLine('bash: shell session active'));
          return { lines };
        }
        const scriptPath = virtualFS.resolvePath(ctx.cwd, args[0]);
        try {
          const content = virtualFS.readFile(scriptPath);
          const scriptLines = content.split('\n');
          for (const sLine of scriptLines) {
            const trimmed = sLine.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const subRes = await this.execute(trimmed, ctx);
            lines.push(...subRes.lines);
            if (subRes.newCwd) {
              ctx.cwd = subRes.newCwd;
            }
          }
        } catch (err: any) {
          lines.push(makeLine(err.message, 'error'));
        }
        return { lines };
      }

      default: {
        // Check if executable file in current dir: ./script.sh
        if (cmd.startsWith('./')) {
          const scriptPath = virtualFS.resolvePath(ctx.cwd, cmd.slice(2));
          if (virtualFS.exists(scriptPath)) {
            const content = virtualFS.readFile(scriptPath);
            const scriptLines = content.split('\n');
            for (const sLine of scriptLines) {
              const trimmed = sLine.trim();
              if (!trimmed || trimmed.startsWith('#!')) continue;
              const subRes = await this.execute(trimmed, ctx);
              lines.push(...subRes.lines);
            }
            return { lines };
          }
        }
        lines.push(makeLine(`bash: ${cmd}: command not found. Try 'help' for available commands.`, 'error'));
        return { lines };
      }
    }
  }

  public executeSimulatedPython(code: string): string[] {
    const outputs: string[] = [];
    try {
      // Safe sandboxed evaluation for common math and print expressions
      const codeLines = code.split('\n');
      for (const line of codeLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('import ')) continue;

        const printMatch = trimmed.match(/^print\((.*)\)$/);
        if (printMatch) {
          const expr = printMatch[1].trim();
          if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
            outputs.push(expr.slice(1, -1));
          } else if (expr.startsWith('f"') || expr.startsWith("f'")) {
            // Simplified f-string rendering
            outputs.push(expr.slice(2, -1).replace(/{([^}]+)}/g, 'demo_val'));
          } else {
            try {
              // Try evaluating simple math
              const evaluated = Function(`"use strict"; return (${expr.replace(/len/g, 'Array.length')});`)();
              outputs.push(String(evaluated));
            } catch {
              outputs.push(`=> ${expr}`);
            }
          }
        }
      }
      if (outputs.length === 0) {
        outputs.push('Script executed successfully (exit code 0)');
      }
    } catch (e: any) {
      outputs.push(`Traceback (most recent call last):\n  File "<stdin>", line 1\nSyntaxError: ${e.message}`);
    }
    return outputs;
  }
}

export const shellEngine = new ShellEngine();
