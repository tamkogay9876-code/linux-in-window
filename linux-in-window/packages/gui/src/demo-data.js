// Embedded demo marketplace data for browser-only mode (no Electron).
// Kept in sync with packages/demo-registry.

export const DEMO_INDEX = [
  { id: 'minimal-terminal', name: 'Minimal Terminal', version: '1.0.0', category: 'themes', author: 'Linux in Window Community', description: 'Clean, distraction-free terminal theme. Pure JSON — no scripts, no animations.', downloads: 45210, rating: 4.6, sizeBytes: 2219, tags: ['minimal', 'clean', 'lightweight', 'no-scripts'], theme: { background: '#1E1E1E', foreground: '#D4D4D4', cursorColor: '#FFFFFF' } },
  { id: 'cyberpunk-terminal', name: 'Cyberpunk Terminal', version: '1.0.0', category: 'themes', author: 'Linux in Window Community', description: 'Cyberpunk inspired terminal customization — neon colors, powerline prompt and pulse animation via Nox.', downloads: 12543, rating: 4.8, sizeBytes: 3534, tags: ['cyberpunk', 'neon', 'terminal', 'gaming'], theme: { background: '#050509', foreground: '#00FFCC', cursorColor: '#FF00AA' } },
  { id: 'retro-dos', name: 'Retro DOS', version: '1.0.5', category: 'retro', author: 'OldShell Collective', description: 'Amber phosphor CRT look with scanlines. Python-driven startup banner.', downloads: 8890, rating: 4.4, sizeBytes: 2967, tags: ['retro', 'dos', 'cga', 'nostalgia'], theme: { background: '#000000', foreground: '#FFA500', cursorColor: '#FFA500' } },
  { id: 'matrix-terminal', name: 'Matrix Terminal', version: '1.1.0', category: 'backgrounds', author: 'NightCrew', description: 'Digital rain WebGL background powered by Nox scenes.', downloads: 20117, rating: 4.7, sizeBytes: 2754, tags: ['matrix', 'webgl', 'animation', 'hacker'], theme: { background: '#000000', foreground: '#00FF41', cursorColor: '#87FFAF' } },
  { id: 'minecraft-terminal', name: 'Minecraft Terminal', version: '1.2.0', category: '3d', author: 'Voxel Devs', description: 'Rotating voxel cube 3D background with grass-block palette (Nox + Three.js).', downloads: 33456, rating: 4.9, sizeBytes: 3377, tags: ['minecraft', '3d', 'voxel', 'gaming', 'threejs'], theme: { background: '#2B2B2B', foreground: '#FFFFFF', cursorColor: '#7BD34E' } },
  { id: 'cyberpunk-ultimate', name: 'Cyberpunk Ultimate (Mega Pack)', version: '1.0.0', category: 'developer', author: 'Linux in Window Community', description: 'Mega pack: cyberpunk theme + font + prompt + background + animation bundles.', downloads: 5120, rating: 4.5, sizeBytes: 1651, tags: ['cyberpunk', 'mega-pack', 'bundle'], dependencies: ['cyberpunk-terminal'] },
];

export const DEMO_NOX = {
  'cyberpunk-terminal': `terminal {
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
    from 0.7
    to 1.0
    duration 1200
    loop true
}
`,
  'matrix-terminal': `terminal {
    background "#000000"
    color "#00ff41"
    cursor {
        color "#87ffaf"
        blink true
    }
}

scene matrix_rain {
    background "#000000"
    effect rain {
        color "#00ff41"
        density 0.8
        speed 1.5
    }
}
`,
  'minecraft-terminal': `terminal {
    background "#2B2B2B"
    color "#ffffff"
    cursor {
        color "#7bd34e"
        blink true
    }
}

scene {
    background "#2B2B2B"
    cube {
        position 0 0 -5
        rotation 0 45 0
        color "#7bd34e"
        animate rotation.y {
            from 0
            to 360
            duration 4
            loop true
        }
    }
}
`,
};
