import { FSNode } from '../types';

const VFS_STORAGE_KEY = 'linux_in_window_vfs_v1';

const INITIAL_NODES: Record<string, FSNode> = {
  '/': {
    name: '',
    path: '/',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 30,
    permissions: 'drwxr-xr-x',
  },
  '/bin': {
    name: 'bin',
    path: '/bin',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 20,
    permissions: 'drwxr-xr-x',
  },
  '/etc': {
    name: 'etc',
    path: '/etc',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 15,
    permissions: 'drwxr-xr-x',
  },
  '/home': {
    name: 'home',
    path: '/home',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 10,
    permissions: 'drwxr-xr-x',
  },
  '/home/user': {
    name: 'user',
    path: '/home/user',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 5,
    permissions: 'drwxr-xr-x',
  },
  '/home/user/Desktop': {
    name: 'Desktop',
    path: '/home/user/Desktop',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000,
    permissions: 'drwxr-xr-x',
  },
  '/home/user/Documents': {
    name: 'Documents',
    path: '/home/user/Documents',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 2,
    permissions: 'drwxr-xr-x',
  },
  '/home/user/Downloads': {
    name: 'Downloads',
    path: '/home/user/Downloads',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 3,
    permissions: 'drwxr-xr-x',
  },
  '/home/user/Projects': {
    name: 'Projects',
    path: '/home/user/Projects',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000,
    permissions: 'drwxr-xr-x',
  },
  '/var': {
    name: 'var',
    path: '/var',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 10,
    permissions: 'drwxr-xr-x',
  },
  '/var/log': {
    name: 'log',
    path: '/var/log',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 5,
    permissions: 'drwxr-xr-x',
  },
  '/proc': {
    name: 'proc',
    path: '/proc',
    type: 'dir',
    size: 0,
    modified: Date.now(),
    permissions: 'dr-xr-xr-x',
  },
  '/tmp': {
    name: 'tmp',
    path: '/tmp',
    type: 'dir',
    size: 4096,
    modified: Date.now(),
    permissions: 'drwxrwxrwt',
  },
  '/usr': {
    name: 'usr',
    path: '/usr',
    type: 'dir',
    size: 4096,
    modified: Date.now() - 86400000 * 25,
    permissions: 'drwxr-xr-x',
  },

  // Files in /etc
  '/etc/os-release': {
    name: 'os-release',
    path: '/etc/os-release',
    type: 'file',
    size: 320,
    modified: Date.now() - 86400000 * 10,
    permissions: '-rw-r--r--',
    content: `NAME="Ubuntu"
VERSION="24.04 LTS (Noble Numbat)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 24.04 LTS"
VERSION_ID="24.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
UBUNTU_CODENAME=noble`,
  },
  '/etc/hostname': {
    name: 'hostname',
    path: '/etc/hostname',
    type: 'file',
    size: 16,
    modified: Date.now() - 86400000 * 10,
    permissions: '-rw-r--r--',
    content: 'linux-in-window\n',
  },
  '/etc/hosts': {
    name: 'hosts',
    path: '/etc/hosts',
    type: 'file',
    size: 158,
    modified: Date.now() - 86400000 * 10,
    permissions: '-rw-r--r--',
    content: `127.0.0.1\tlocalhost\n127.0.1.1\tlinux-in-window\n\n# The following lines are desirable for IPv6 capable hosts\n::1     ip6-localhost ip6-loopback\nfe00::0 ip6-localnet\n`,
  },
  '/etc/motd': {
    name: 'motd',
    path: '/etc/motd',
    type: 'file',
    size: 420,
    modified: Date.now() - 86400000 * 5,
    permissions: '-rw-r--r--',
    content: ` * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

Welcome to Linux in Window 24.04 LTS!
Type 'help' for available commands or 'neofetch' to view system specs.
`,
  },

  // Files in /home/user
  '/home/user/welcome.txt': {
    name: 'welcome.txt',
    path: '/home/user/welcome.txt',
    type: 'file',
    size: 612,
    modified: Date.now() - 3600000 * 2,
    permissions: '-rw-r--r--',
    content: `========================================================
   WELCOME TO LINUX IN WINDOW - BROWSER WORKSPACE
========================================================

You have full access to an authentic simulated Linux environment
running inside a windowed desktop environment.

Top commands to try right now:
  • neofetch         - Display stylish system info and distro logo
  • cmatrix          - Matrix falling green digital rain
  • htop             - Interactive process viewer and resource meters
  • sl               - Watch the classic steam locomotive choo-choo!
  • cowsay "Hello!"  - Have the terminal cow speak
  • nano notes.txt   - Open the full-screen terminal text editor
  • python3 calc.py  - Run Python scripts or launch the Python REPL
  • apt install ...  - Install more CLI packages
  • help             - View all available shell commands and tools

Enjoy your Linux workspace!
`,
  },
  '/home/user/.bashrc': {
    name: '.bashrc',
    path: '/home/user/.bashrc',
    type: 'file',
    size: 240,
    modified: Date.now() - 86400000 * 5,
    permissions: '-rw-r--r--',
    content: `# ~/.bashrc: executed by bash(1) for non-login shells.
export PS1="\\[\\033[01;32m\\]user@linux-in-window\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ "
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias cls='clear'
`,
  },
  '/home/user/demo.sh': {
    name: 'demo.sh',
    path: '/home/user/demo.sh',
    type: 'file',
    size: 290,
    modified: Date.now() - 86400000,
    permissions: '-rwxr-xr-x',
    isExecutable: true,
    content: `#!/bin/bash
echo "==> Running Linux System Quick Check..."
echo "Host: $(cat /etc/hostname)"
echo "OS: Ubuntu 24.04 LTS"
echo "Active user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Memory free: 5.4 GB / 8.0 GB"
echo "All systems operational!"
`,
  },
  '/home/user/calculator.py': {
    name: 'calculator.py',
    path: '/home/user/calculator.py',
    type: 'file',
    size: 450,
    modified: Date.now() - 86400000,
    permissions: '-rw-r--r--',
    content: `# Simple Python math demo
import math

print("=== Python 3.12 Math Demo ===")
numbers = [12, 45, 78, 23, 89, 5]
print(f"Numbers: {numbers}")
print(f"Sum: {sum(numbers)}")
print(f"Average: {sum(numbers) / len(numbers):.2f}")
print(f"Maximum: {max(numbers)}")
print(f"Square root of 144: {math.sqrt(144)}")
print(f"Factorial of 5: {math.factorial(5)}")
print("Finished!")
`,
  },
  '/home/user/Documents/cheatsheet.md': {
    name: 'cheatsheet.md',
    path: '/home/user/Documents/cheatsheet.md',
    type: 'file',
    size: 780,
    modified: Date.now() - 86400000 * 3,
    permissions: '-rw-r--r--',
    content: `# Linux CLI Quick Cheatsheet

## Navigation & Files
- \`pwd\` : print working directory
- \`ls -la\` : list all files in long format
- \`cd <dir>\` : change directory
- \`mkdir -p <dir>\` : create folder
- \`touch <file>\` : create empty file
- \`rm -rf <target>\` : remove file or folder
- \`cp <src> <dest>\` : copy file
- \`mv <src> <dest>\` : move/rename file

## Text & Inspection
- \`cat <file>\` : view entire file
- \`head -n 5 <file>\` : top 5 lines
- \`tail -n 5 <file>\` : bottom 5 lines
- \`grep "text" <file>\` : filter lines matching pattern
- \`wc -l <file>\` : count lines

## System Info & Fun
- \`neofetch\` : system specs with ASCII art
- \`htop\` : interactive process viewer
- \`free -m\` : memory stats
- \`df -h\` : disk storage
- \`cmatrix\` : matrix code stream
- \`cowsay "text"\` : ascii cow speaker
`,
  },
  '/home/user/Projects/hello.py': {
    name: 'hello.py',
    path: '/home/user/Projects/hello.py',
    type: 'file',
    size: 210,
    modified: Date.now() - 86400000 * 2,
    permissions: '-rw-r--r--',
    content: `def greet(name):
    return f"Hello, {name}! Welcome to Linux in Window."

for dev in ["Developer", "Linux Hacker", "Sysadmin"]:
    print(greet(dev))
`,
  },
  '/home/user/Projects/server.js': {
    name: 'server.js',
    path: '/home/user/Projects/server.js',
    type: 'file',
    size: 340,
    modified: Date.now() - 86400000 * 2,
    permissions: '-rw-r--r--',
    content: `// Simulated Node.js microservice
const http = require('http');
const PORT = 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
});

console.log(\`Server listening on http://127.0.0.1:\${PORT}\`);
`,
  },
  '/proc/cpuinfo': {
    name: 'cpuinfo',
    path: '/proc/cpuinfo',
    type: 'file',
    size: 512,
    modified: Date.now(),
    permissions: '-r--r--r--',
    content: `processor\t: 0\nmodel name\t: AMD Ryzen 9 7950X 16-Core Processor\ncpu MHz\t\t: 4500.000\ncache size\t: 1024 KB\ncpu cores\t: 16\nflags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov\n`,
  },
  '/proc/meminfo': {
    name: 'meminfo',
    path: '/proc/meminfo',
    type: 'file',
    size: 420,
    modified: Date.now(),
    permissions: '-r--r--r--',
    content: `MemTotal:        8192000 kB\nMemFree:         4821240 kB\nMemAvailable:    5942100 kB\nBuffers:          210450 kB\nCached:          1840200 kB\nSwapTotal:       2097152 kB\nSwapFree:        2097152 kB\n`,
  },
  '/var/log/syslog': {
    name: 'syslog',
    path: '/var/log/syslog',
    type: 'file',
    size: 680,
    modified: Date.now() - 3600000,
    permissions: '-rw-r-----',
    content: `Sep 26 21:00:01 linux-in-window systemd[1]: Started Daily apt upgrade and clean activities.
Sep 26 21:15:22 linux-in-window kernel: [    0.000000] Linux version 6.8.0-40-generic (buildd@lcy02-amd64-071)
Sep 26 21:15:22 linux-in-window kernel: [    1.240501] systemd[1]: Reached target Graphical Interface.
Sep 26 21:15:23 linux-in-window systemd[1]: Startup finished in 1.482s.
`,
  },
};

// Virtual File System class
class VirtualFS {
  private nodes: Record<string, FSNode>;

  constructor() {
    this.nodes = this.loadFromStorage();
  }

  private loadFromStorage(): Record<string, FSNode> {
    try {
      const saved = localStorage.getItem(VFS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load VFS from localStorage:', e);
    }
    return { ...INITIAL_NODES };
  }

  public saveToStorage(): void {
    try {
      localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(this.nodes));
    } catch (e) {
      console.warn('Failed to persist VFS to localStorage:', e);
    }
  }

  public reset(): void {
    this.nodes = { ...INITIAL_NODES };
    this.saveToStorage();
  }

  public normalizePath(path: string): string {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    const parts = path.split('/').filter(Boolean);
    const resolvedParts: string[] = [];

    for (const part of parts) {
      if (part === '.') {
        continue;
      } else if (part === '..') {
        resolvedParts.pop();
      } else {
        resolvedParts.push(part);
      }
    }

    return '/' + resolvedParts.join('/');
  }

  public resolvePath(cwd: string, targetPath: string): string {
    if (!targetPath || targetPath === '~') {
      return '/home/user';
    }
    if (targetPath.startsWith('~/')) {
      return this.normalizePath('/home/user/' + targetPath.slice(2));
    }
    if (targetPath.startsWith('/')) {
      return this.normalizePath(targetPath);
    }
    return this.normalizePath(`${cwd}/${targetPath}`);
  }

  public exists(path: string): boolean {
    const normalized = this.normalizePath(path);
    return Boolean(this.nodes[normalized]);
  }

  public getNode(path: string): FSNode | null {
    const normalized = this.normalizePath(path);
    return this.nodes[normalized] || null;
  }

  public isDir(path: string): boolean {
    const node = this.getNode(path);
    return node?.type === 'dir';
  }

  public listDir(path: string): FSNode[] {
    const normalized = this.normalizePath(path);
    if (!this.exists(normalized)) {
      throw new Error(`ls: cannot access '${path}': No such file or directory`);
    }
    if (!this.isDir(normalized)) {
      throw new Error(`ls: cannot access '${path}': Not a directory`);
    }

    const results: FSNode[] = [];
    const prefix = normalized === '/' ? '/' : normalized + '/';

    for (const key of Object.keys(this.nodes)) {
      if (key === normalized) continue;
      if (key.startsWith(prefix)) {
        const relative = key.slice(prefix.length);
        if (!relative.includes('/')) {
          results.push(this.nodes[key]);
        }
      }
    }

    return results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  public readFile(path: string): string {
    const normalized = this.normalizePath(path);
    const node = this.getNode(normalized);
    if (!node) {
      throw new Error(`cat: ${path}: No such file or directory`);
    }
    if (node.type === 'dir') {
      throw new Error(`cat: ${path}: Is a directory`);
    }
    return node.content ?? '';
  }

  public writeFile(path: string, content: string): FSNode {
    const normalized = this.normalizePath(path);
    const parentPath = this.getParentPath(normalized);

    if (!this.exists(parentPath)) {
      throw new Error(`No such directory: ${parentPath}`);
    }

    const parts = normalized.split('/').filter(Boolean);
    const name = parts[parts.length - 1];

    const existing = this.nodes[normalized];
    const node: FSNode = {
      name,
      path: normalized,
      type: 'file',
      content,
      size: new Blob([content]).size,
      modified: Date.now(),
      permissions: existing ? existing.permissions : '-rw-r--r--',
      isExecutable: existing?.isExecutable || name.endsWith('.sh'),
    };

    this.nodes[normalized] = node;
    this.saveToStorage();
    return node;
  }

  public makeDir(path: string): FSNode {
    const normalized = this.normalizePath(path);
    if (this.exists(normalized)) {
      throw new Error(`mkdir: cannot create directory '${path}': File exists`);
    }

    const parentPath = this.getParentPath(normalized);
    if (!this.exists(parentPath)) {
      throw new Error(`mkdir: cannot create directory '${path}': No such file or directory`);
    }

    const parts = normalized.split('/').filter(Boolean);
    const name = parts[parts.length - 1];

    const node: FSNode = {
      name,
      path: normalized,
      type: 'dir',
      size: 4096,
      modified: Date.now(),
      permissions: 'drwxr-xr-x',
    };

    this.nodes[normalized] = node;
    this.saveToStorage();
    return node;
  }

  public remove(path: string, recursive: boolean = false): void {
    const normalized = this.normalizePath(path);
    if (normalized === '/' || normalized === '/home/user') {
      throw new Error(`rm: cannot remove protected directory: ${path}`);
    }

    const node = this.getNode(normalized);
    if (!node) {
      throw new Error(`rm: cannot remove '${path}': No such file or directory`);
    }

    if (node.type === 'dir' && !recursive) {
      throw new Error(`rm: cannot remove '${path}': Is a directory`);
    }

    // Delete node and all children if dir
    const prefix = normalized === '/' ? '/' : normalized + '/';
    for (const key of Object.keys(this.nodes)) {
      if (key === normalized || key.startsWith(prefix)) {
        delete this.nodes[key];
      }
    }

    this.saveToStorage();
  }

  public copy(srcPath: string, destPath: string): void {
    const srcNorm = this.normalizePath(srcPath);
    let destNorm = this.normalizePath(destPath);

    const srcNode = this.getNode(srcNorm);
    if (!srcNode) {
      throw new Error(`cp: cannot stat '${srcPath}': No such file or directory`);
    }

    if (this.isDir(destNorm)) {
      destNorm = this.normalizePath(`${destNorm}/${srcNode.name}`);
    }

    if (srcNode.type === 'file') {
      this.writeFile(destNorm, srcNode.content || '');
    } else {
      this.makeDir(destNorm);
      const prefix = srcNorm + '/';
      for (const [key, val] of Object.entries(this.nodes)) {
        if (key.startsWith(prefix)) {
          const subPath = key.slice(prefix.length);
          const newPath = this.normalizePath(`${destNorm}/${subPath}`);
          if (val.type === 'dir') {
            this.makeDir(newPath);
          } else {
            this.writeFile(newPath, val.content || '');
          }
        }
      }
    }
  }

  public move(srcPath: string, destPath: string): void {
    this.copy(srcPath, destPath);
    this.remove(srcPath, true);
  }

  public getParentPath(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return '/';
    const parts = normalized.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  }

  public getAllFilesList(): FSNode[] {
    return Object.values(this.nodes);
  }
}

export const virtualFS = new VirtualFS();
