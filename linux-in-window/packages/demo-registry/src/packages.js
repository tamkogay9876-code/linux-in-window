// Source definitions of the five bundled demo packages.
// Each entry: id -> file map (relative path -> content).

const themeJson = (o) => JSON.stringify(o, null, 2) + '\n';

export const DEMO_PACKAGES = {};

// ---------------------------------------------------------------------------
// 1. minimal-terminal — pure JSON, no scripts, no nox (lightweight baseline)
// ---------------------------------------------------------------------------
DEMO_PACKAGES['minimal-terminal'] = {
  'package.json': themeJson({
    id: 'minimal-terminal',
    name: 'Minimal Terminal',
    version: '1.0.0',
    author: 'Linux in Window Community',
    description: 'A clean, distraction-free terminal look. Pure JSON, zero runtime.',
    type: 'theme',
    runtime: { python: false, nox: false, webgl: false },
    permissions: ['terminal', 'windows-terminal'],
    targets: ['windows-terminal', 'powershell', 'cmd'],
    dependencies: [],
    tags: ['minimal', 'clean', 'lightweight', 'no-scripts'],
    performance: { gpu: 'none', ram: 'none', fps: 0 },
    assets: { preview: 'preview.png', icon: 'assets/icon.png' },
  }),
  'config.json': themeJson({ debug: false }),
  'theme/theme.json': themeJson({
    scheme: {
      name: 'Minimal',
      foreground: '#D4D4D4',
      background: '#181818',
      cursorColor: '#D4D4D4',
      palette: { black: '#181818', red: '#C74E4E', green: '#4EC77E', yellow: '#C7B94E', blue: '#4E7EC7', purple: '#9A4EC7', cyan: '#4EC7C7', white: '#D4D4D4' },
    },
    profile: { name: 'Minimal', fontSize: 12, opacity: 1.0, padding: '8,8,8,8', cursorShape: 'bar' },
    font: { face: 'Cascadia Mono', size: 12 },
    background: { color: '#181818' },
    prompt: { style: 'minimal', format: '> ' },
  }),
  'README.md': '# Minimal Terminal\n\nPure JSON theme package — demonstrates the smallest possible Linux in Window package.\n',
};

// ---------------------------------------------------------------------------
// 2. cyberpunk-terminal — JSON + Nox (theme, prompt, animation)
// ---------------------------------------------------------------------------
DEMO_PACKAGES['cyberpunk-terminal'] = {
  'package.json': themeJson({
    id: 'cyberpunk-terminal',
    name: 'Cyberpunk Terminal',
    version: '1.0.0',
    author: 'Linux in Window Community',
    description: 'Cyberpunk inspired terminal customization: neon colors, glitch prompt, pulse animation.',
    type: 'theme',
    entry: 'main.py',
    runtime: { python: false, nox: true, webgl: false },
    permissions: ['terminal', 'filesystem:user', 'windows-terminal', 'nox'],
    targets: ['windows-terminal', 'powershell', 'cmd'],
    dependencies: [],
    tags: ['cyberpunk', 'neon', 'terminal', 'gaming'],
    performance: { gpu: 'low', ram: 'low', fps: 30 },
    assets: { preview: 'preview.png', icon: 'assets/icon.png' },
  }),
  'config.json': themeJson({ accent: '#00FFCC', secondary: '#FF00AA' }),
  'main.py': 'print("cyberpunk-terminal loaded")\n',
  'theme/theme.json': themeJson({
    scheme: {
      name: 'Cyberpunk',
      foreground: '#00FFCC',
      background: '#050509',
      cursorColor: '#FF00AA',
      palette: { black: '#050509', red: '#FF3366', green: '#00FFCC', yellow: '#FFE600', blue: '#0099FF', purple: '#FF00AA', cyan: '#00FFFF', white: '#E0F7FA' },
    },
    profile: { name: 'Cyberpunk', fontSize: 12, opacity: 0.95, acrylic: true, padding: '12,12,12,12', tabColor: '#FF00AA', cursorShape: 'vintage' },
    font: { face: 'CaskaydiaCove Nerd Font', size: 12 },
    background: { color: '#050509', image: 'assets/background.jpg', opacity: 0.35 },
    prompt: { style: 'powerline', left: ['user@windows', 'cwd', 'git'], separator: '' },
  }),
  'nox/main.nox': `// Cyberpunk Terminal — main nox customization
terminal {

    background "#050509"

    color "#00ffcc"

    cursor {
        color "#ff00aa"
        blink true
    }

}

prompt {

    style "powerline"

    segment user {
        color "#ff00aa"
        text "user@windows"
    }

    segment cwd {
        color "#00ffcc"
        prefix "~/"
    }

}

animation pulse {

    target "terminal"

    property opacity

    from 0.85

    to 1.0

    duration 1200

    loop true

}
`,
  'nox/ui.nox': `// Neon panel overlay
panel {

    position center

    width 600

    height 300

    blur 20

    radius 20

    border "#00ffff"

}
`,
  'nox/background.nox': `// Animated neon grid background (WebGL)
scene {

    background "#050509"

    grid {
        color "#ff00aa"
        spacing 40
        fade true
    }

    particles {
        count 80
        color "#00ffcc"
        speed 0.4
    }

}
`,
  'scripts/setup.ps1': '# Optional setup helper (only runs with python/ps permission consent)\nWrite-Host "cyberpunk-terminal ready"\n',
  'README.md': '# Cyberpunk Terminal\n\nJSON theme + Nox animation/prompt demo package.\n\n```bash\nlinux install cyberpunk-terminal\nlinux run cyberpunk-terminal\n```\n',
};

// ---------------------------------------------------------------------------
// 3. retro-dos — JSON + Python logic
// ---------------------------------------------------------------------------
DEMO_PACKAGES['retro-dos'] = {
  'package.json': themeJson({
    id: 'retro-dos',
    name: 'Retro DOS',
    version: '1.0.5',
    author: 'Linux in Window Community',
    description: 'Old-school DOS/CGA vibes with a Python status widget.',
    type: 'theme',
    entry: 'main.py',
    runtime: { python: true, nox: false, webgl: false },
    permissions: ['terminal', 'python', 'windows-terminal'],
    targets: ['windows-terminal', 'cmd'],
    dependencies: [],
    tags: ['retro', 'dos', 'cga', 'nostalgia'],
    performance: { gpu: 'none', ram: 'low', fps: 0 },
    assets: { preview: 'preview.png', icon: 'assets/icon.png' },
  }),
  'config.json': themeJson({ scanlines: true, phosphor: 'amber' }),
  'main.py': `# Retro DOS status widget — executed by the LIW python runtime (sandboxed).
import os, json, shutil

def status():
    total, used, free = shutil.disk_usage(os.path.expanduser("~"))
    print("C:\\\\> linux status")
    print(f"  drive C:   {free // (1024*1024)} MB free")
    print(f"  packages:  {len(os.listdir(os.environ.get('LIW_PKG_DIR', '.')))} files")
    print("System ready.")

if __name__ == "__main__":
    status()
`,
  'install.py': `# Runs at install time inside the sandbox (LIW_SANDBOX=1).
print("[retro-dos] installing... ok")
`,
  'uninstall.py': 'print("[retro-dos] goodbye, doctor")\n',
  'theme/theme.json': themeJson({
    scheme: {
      name: 'Retro DOS',
      foreground: '#FFA500',
      background: '#000000',
      cursorColor: '#FFA500',
      palette: { black: '#000000', red: '#AA0000', green: '#00AA00', yellow: '#FFA500', blue: '#0000AA', purple: '#AA00AA', cyan: '#00AAAA', white: '#AAAAAA' },
    },
    profile: { name: 'Retro DOS', fontSize: 14, opacity: 1.0, padding: '4,4,4,4', cursorShape: 'block' },
    font: { face: 'Perfect DOS VGA 437 Win', size: 14 },
    background: { color: '#000000' },
    prompt: { style: 'dos', format: '{drive}>{cwd}$ ' },
  }),
  'README.md': '# Retro DOS\n\nDemonstrates a Python-driven package (status widget via main.py).\n',
};

// ---------------------------------------------------------------------------
// 4. matrix-terminal — Nox + WebGL rain
// ---------------------------------------------------------------------------
DEMO_PACKAGES['matrix-terminal'] = {
  'package.json': themeJson({
    id: 'matrix-terminal',
    name: 'Matrix Terminal',
    version: '1.1.0',
    author: 'Linux in Window Community',
    description: 'Follow the white rabbit. Digital rain background rendered with WebGL.',
    type: 'background',
    runtime: { python: false, nox: true, webgl: true },
    permissions: ['terminal', 'windows-terminal', 'nox', 'gpu'],
    targets: ['windows-terminal'],
    dependencies: [],
    tags: ['matrix', 'webgl', 'animation', 'hacker'],
    performance: { gpu: 'medium', ram: 'low', fps: 60 },
    assets: { preview: 'preview.png', icon: 'assets/icon.png' },
  }),
  'config.json': themeJson({ density: 0.7, glyphs: "アイウエオカキクケコサシスセソ01" }),
  'theme/theme.json': themeJson({
    scheme: {
      name: 'Matrix',
      foreground: '#00FF41',
      background: '#000000',
      cursorColor: '#00FF41',
      palette: { black: '#000000', green: '#00FF41', cyan: '#87FFAF', white: '#DDFFDD' },
    },
    profile: { name: 'Matrix', fontSize: 12, opacity: 0.92, backgroundImageStretchMode: 'none', cursorShape: 'vintage' },
    font: { face: 'Cascadia Code', size: 12 },
    background: { color: '#000000' },
  }),
  'nox/main.nox': `terminal {

    background "#000000"

    color "#00ff41"

    cursor {
        color "#87ffaf"
        blink true
    }

}

animation glow {

    target "terminal"

    property brightness

    from 0.9

    to 1.05

    duration 900

    loop true

}
`,
  'nox/background.nox': `// WebGL digital rain
scene {

    background "#000000"

    rain {
        color "#00ff41"
        head "#ddffdd"
        speed 1.2
        density 0.7
        glyphs "01ｱｳｴｵｶｷｸｹｺ"
    }

}
`,
  'README.md': '# Matrix Terminal\n\nNox + WebGL background scene demo (`scene { rain { ... } }`).\n',
};

// ---------------------------------------------------------------------------
// 5. minecraft-terminal — Nox + Three.js-style 3D scene + assets + mega-pack deps
// ---------------------------------------------------------------------------
DEMO_PACKAGES['minecraft-terminal'] = {
  'package.json': themeJson({
    id: 'minecraft-terminal',
    name: 'Minecraft Terminal',
    version: '1.2.0',
    author: 'Linux in Window Community',
    description: 'Blocky voxel terminal: rotating 3D cube scene, pixel font, grass texture background.',
    type: '3d',
    runtime: { python: false, nox: true, webgl: true },
    permissions: ['terminal', 'windows-terminal', 'nox', 'gpu', 'audio'],
    targets: ['windows-terminal'],
    dependencies: ['minimal-terminal'],
    tags: ['minecraft', '3d', 'voxel', 'gaming', 'threejs'],
    performance: { gpu: 'high', ram: 'medium', fps: 60 },
    assets: { preview: 'preview.png', icon: 'assets/icon.png', background: 'assets/textures/grass.png' },
  }),
  'config.json': themeJson({ worldSeed: 20260925, fov: 70 }),
  'theme/theme.json': themeJson({
    scheme: {
      name: 'Minecraft',
      foreground: '#FFFFFF',
      background: '#2B2B2B',
      cursorColor: '#7BD34E',
      palette: { black: '#000000', red: '#B02E2E', green: '#7BD34E', yellow: '#FCE94F', blue: '#3C44A8', purple: '#8B57A8', cyan: '#4EA8A8', white: '#FFFFFF' },
    },
    profile: { name: 'Minecraft', fontSize: 13, opacity: 0.97, padding: '10,10,10,10', tabColor: '#7BD34E' },
    font: { face: 'Minecraftia', size: 13 },
    background: { color: '#2B2B2B', image: 'assets/textures/dirt.png', opacity: 0.25 },
    sounds: [
      { event: 'startup', file: 'assets/sounds/craft.ogg' },
      { event: 'bell', file: 'assets/sounds/note.ogg' },
    ],
  }),
  'nox/main.nox': `terminal {

    background "#2B2B2B"

    color "#ffffff"

    cursor {
        color "#7bd34e"
        blink true
    }

}

window {

    title "Minecraft Terminal"

}
`,
  'nox/background.nox': `// Rotating voxel cube (Three.js scene compiled from nox)
scene {

    background "#6BA4E8"

    cube {
        position 0 0 -5

        rotation 0 45 0

        color "#7bd34e"

        texture "assets/textures/grass.png"

        animate rotation.y {
            from 0
            to 360
            duration 4
            loop true
        }
    }

    cube {
        position 2 -1 -6
        rotation 0 20 0
        color "#8a5a2b"
        texture "assets/textures/dirt.png"
    }

}
`,
  'nox/ui.nox': `panel {

    position center

    width 640

    height 360

    blur 8

    radius 0

    border "#3f3f3f"

}

widget hotbar {

    slots 9

    selected 1

}
`,
  'README.md': '# Minecraft Terminal\n\nFull-stack demo: Nox 3D scene + textures + sounds + dependency on `minimal-terminal`.\n',
};

// Extra mega-pack example that composes several packages (mod combination §8)
DEMO_PACKAGES['cyberpunk-ultimate'] = {
  'package.json': themeJson({
    id: 'cyberpunk-ultimate',
    name: 'Cyberpunk Ultimate (Mega Pack)',
    version: '1.0.0',
    author: 'Linux in Window Community',
    description: 'Theme + prompt + background + animation combined into one mega pack.',
    type: 'mega-pack',
    runtime: { nox: true },
    permissions: ['terminal', 'windows-terminal', 'nox', 'gpu'],
    targets: ['windows-terminal'],
    dependencies: ['cyberpunk-terminal', 'minimal-terminal'],
    tags: ['cyberpunk', 'mega-pack', 'bundle'],
    assets: {},
  }),
  'README.md': '# Cyberpunk Ultimate\n\nMega pack: the package manager resolves and installs every dependency automatically.\n',
};

export const REGISTRY_META = {
  'minimal-terminal':     { downloads: 45210, rating: 4.6, category: 'themes' },
  'cyberpunk-terminal':   { downloads: 12543, rating: 4.8, category: 'themes' },
  'retro-dos':            { downloads: 8890,  rating: 4.4, category: 'retro' },
  'matrix-terminal':      { downloads: 20117, rating: 4.7, category: 'backgrounds' },
  'minecraft-terminal':   { downloads: 33456, rating: 4.9, category: '3d' },
  'cyberpunk-ultimate':   { downloads: 5120,  rating: 4.5, category: 'developer' },
};
