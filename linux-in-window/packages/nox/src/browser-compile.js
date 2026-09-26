// Compile nox AST into a browser-friendly "program" the preview engine can execute.
// Output shape:
// {
//   terminal: { background, color, cursor:{color,blink} },
//   scene:    { background, objects:[{type,args,props,animate}] },
//   animations:[{name,target,property,from,to,duration,loop}],
//   panels:   [{position,width,height,blur,radius}],
//   prompt:   {...}
// }

import { parseNox } from './parser.js';

const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

function valueOf(arg) { return arg ? arg.value : undefined; }

function collectProps(node) {
  const props = {};
  const blocks = {};
  for (const stmt of node.body || []) {
    if (stmt.kind === 'prop') {
      props[stmt.name] = stmt.args.length === 1 ? valueOf(stmt.args[0]) : stmt.args.map(valueOf);
    } else {
      (blocks[stmt.name] = blocks[stmt.name] || []).push(stmt);
    }
  }
  return { props, blocks };
}

export function compileForBrowser(source) {
  const ast = parseNox(source);
  const out = { terminal: {}, scene: null, scenes: [], animations: {}, panels: [], prompts: [] };

  for (const top of ast) {
    const { props, blocks } = collectProps(top);
    switch (top.name) {
      case 'terminal': {
        const t = {};
        if (COLOR_RE.test(props.background || '')) t.background = props.background;
        if (COLOR_RE.test(props.color || '')) t.color = props.color;
        if (blocks.cursor) {
          const c = collectProps(blocks.cursor[0]).props;
          t.cursor = {
            ...(COLOR_RE.test(c.color || '') ? { color: c.color } : {}),
            ...(typeof c.blink === 'boolean' ? { blink: c.blink } : {}),
            ...(c.shape ? { shape: String(c.shape) } : {}),
          };
        }
        Object.assign(out.terminal, t);
        break;
      }
      case 'scene': {
        const scene = { background: COLOR_RE.test(props.background || '') ? props.background : '#000000', objects: [] };
        for (const objName of ['cube', 'sphere', 'plane', 'particles', 'grid', 'stars', 'rain']) {
          for (const b of blocks[objName] || []) {
            const { props: op, blocks: ob } = collectProps(b);
            const obj = { type: objName, props: op };
            if (ob.animate) {
              obj.animate = ob.animate.map((a) => {
                const ap = collectProps(a).props;
                return {
                  target: a.args.map(valueOf).join(' '),
                  property: ap.property ?? a.args.map(valueOf).join('.'),
                  from: ap.from, to: ap.to,
                  duration: ap.duration ?? 1, loop: ap.loop !== false,
                };
              });
            }
            scene.objects.push(obj);
          }
        }
        out.scenes.push(scene);
        out.scene = scene;
        break;
      }
      case 'animation': {
        const anim = {
          name: typeof top.args[0]?.value === 'string' ? top.args[0].value : String(props.target || 'anim'),
          target: props.target,
          property: props.property,
          from: props.from, to: props.to,
          duration: props.duration ?? 1000,
          loop: props.loop !== false,
        };
        // keyed map (animations[name]) + array mirror for iteration convenience
        out.animations[anim.name] = anim;
        break;
      }
      case 'panel': {
        out.panels.push({
          position: props.position ?? 'center',
          width: props.width ?? 400, height: props.height ?? 200,
          blur: props.blur ?? 12, radius: props.radius ?? 12,
          background: COLOR_RE.test(props.background || '') ? props.background : undefined,
        });
        break;
      }
      case 'prompt': {
        out.prompts.push(props);
        break;
      }
      default:
        break; // unknown top-level blocks are ignored in browser compile
    }
  }
  return out;
}
