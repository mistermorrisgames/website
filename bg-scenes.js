(() => {
  "use strict";
  const canvas = document.createElement("canvas");
  canvas.className = "bg-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const near = document.createElement("canvas");
  near.className = "fg-canvas";
  near.setAttribute("aria-hidden", "true");
  document.body.append(near);
  const nctx = near.getContext("2d");
  const stage = document.getElementById("stage");
  const motion = window.Motion;
  let w = 0, h = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    near.width = canvas.width; near.height = canvas.height;
    nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const between = (a, b) => a + rand() * (b - a);
  seed = 221597993;
  const motes = Array.from({ length: 45 }, () => ({
    x: rand(), y: rand(), r: between(0.5, 1.9), sx: between(0.05, 0.13), sy: between(0.04, 0.1),
    px: between(0, 6.3), py: between(0, 6.3), fall: between(0.002, 0.008), tw: between(0, 6.3)
  }));
  const NOTCH = ["1,2,2", "2,2,2", "2,2,1", "1,1,2", "2,1,1"];
  const LOGO = {
    notch: NOTCH, colour: [255, 255, 255], glow: [255, 200, 140], opacity: 1,
    notchColour: "rgba(8, 8, 8, .9)", reach: 0.8, light: [-0.35, 0.62, -0.4]
  };
  const faceCache = new Map();
  function cubeFacesFor(notch) {
    const key = notch.join(" ");
    if (faceCache.has(key)) return faceCache.get(key);
    const blocks = new Set();
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++)
      if (!notch.includes(`${x},${y},${z}`)) blocks.add(`${x},${y},${z}`);
    const faces = [];
    for (const k of blocks) {
      const [x, y, z] = k.split(",").map(Number);
      for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const next = `${x + n[0]},${y + n[1]},${z + n[2]}`;
        if (blocks.has(next)) continue;
        const axis = n.findIndex((v) => v !== 0), side = n[axis] > 0 ? 1 : 0;
        const [u, v] = [0, 1, 2].filter((i) => i !== axis);
        const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => {
          const p = [x, y, z]; p[axis] += side; p[u] += a; p[v] += b;
          return [p[0] - 1.5, p[1] - 1.5, p[2] - 1.5];
        });
        faces.push({ corners, n, inside: notch.includes(next) });
      }
    }
    faceCache.set(key, faces);
    return faces;
  }
  const cubeLayer = document.createElement("canvas");
  const cl = cubeLayer.getContext("2d");
  const pointer = { x: 0, y: 0, px: null, py: null };
  const noMouse = window.matchMedia("(hover: none)");
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = (e.clientX / w) * 2 - 1;
    pointer.y = (e.clientY / h) * 2 - 1;
    pointer.px = e.clientX; pointer.py = e.clientY;
  }, { passive: true });
  const facing = { x: 0, y: 0, t: null };
  const header = document.querySelector(".studio-name");
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const lerp3 = (a, b, s) => a.map((v, i) => v + (b[i] - v) * s);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
  const turn = (v, k, a) => {
    const c = Math.cos(a), s = Math.sin(a), d = dot(k, v), x = cross(k, v);
    return v.map((vi, i) => vi * c + x[i] * s + k[i] * d * (1 - c));
  };
  const easeInOut = (s) => (s < 0.5 ? 2 * s * s : 1 - (-2 * s + 2) ** 2 / 2);
  const easeIn = (s) => s * s;
  const CENTRE = [1.5, 1.5, 1.5];
  const spot = (x, y, z) => [2.5 - x, z + 0.5, 2.5 - y];
  function roll(from, to, start, dur, side) {
    const d = sub(to, from);
    const pivot = add(add(from, d.map((v) => v / 2)), d[1] ? side.map((v) => v / 2) : [0, -0.5, 0]);
    const v0 = sub(from, pivot), v1 = sub(to, pivot);
    const axis = norm(cross(v0, v1));
    return { start, dur, at(s) { const a = (Math.PI / 2) * easeInOut(s); return { c: add(pivot, turn(v0, axis, a)), spin: [axis, a] }; } };
  }
  const CROUCH = 0.14, SQUASH = 0.14;
  const squashed = (c, b) => ({ c: [c[0], c[1] - (1 - b) / 2, c[2]], scale: [1 + (1 - b) * 0.6, b, 1 + (1 - b) * 0.6] });
  const stretched = (c, b) => ({ c, scale: [1 / Math.sqrt(b), b, 1 / Math.sqrt(b)] });
  function jump(from, to, height, start, flight) {
    const dir = sub(to, from), axis = norm(cross([0, 1, 0], dir[0] || dir[2] ? dir : [1, 0, 0]));
    return { start, touchdown: start + CROUCH + flight, dur: CROUCH + flight + SQUASH, at(s) {
      let u = s * this.dur;
      if (u < CROUCH) {
        return { ...squashed(from, 1 - 0.3 * Math.sin(Math.PI * u / CROUCH)), spin: null };
      }
      u -= CROUCH;
      if (u < flight) {
        const f = u / flight, c = lerp3(from, to, f);
        c[1] += height * 4 * f * (1 - f);
        return { ...stretched(c, 1 + 0.12 * Math.sin(Math.PI * f)), spin: [axis, Math.PI * easeInOut(f)] };
      }
      u -= flight;
      return { ...squashed(to, 1 - 0.26 * Math.sin(Math.PI * Math.min(1, u / SQUASH))), spin: [axis, Math.PI] };
    } };
  }
  const LANDING = spot(0, 0, 0);
  const ROUTES = [
    { path: [spot(0, 1, 0), spot(0, 2, 0), spot(0, 2, 1), spot(0, 2, 2), spot(1, 2, 2), spot(2, 2, 2)],
      side: [0, 0, -1], jumpTo: spot(0, 0, 1), height: 0.9, delay: 0, wait: 0.06, flight: 0.44 },
    { path: [spot(1, 0, 0), spot(2, 0, 0), spot(2, 0, 1), spot(2, 0, 2), spot(2, 1, 2), spot(2, 2, 2)],
      side: [-1, 0, 0], jumpTo: spot(1, 1, 2), height: 1.8, delay: 0, wait: 0.06, flight: 0.44 }
  ];
  function buildIntro() {
    const DROP = 0.45, SPLIT = 0.66, STEP = 0.2;
    const tracks = [], trail = [{ at: LANDING, t: DROP }];
    for (const route of ROUTES) {
      const track = [];
      let at = LANDING, t = SPLIT + route.delay;
      for (const to of route.path) {
        track.push(roll(at, to, t, STEP, route.side));
        at = to; t += STEP;
        trail.push({ at, t });
      }
      const hop = jump(at, route.jumpTo, route.height, t + route.wait, route.flight);
      track.push(hop);
      trail.push({ at: route.jumpTo, t: hop.touchdown });
      tracks.push(track);
    }
    const LANDED = Math.max(...trail.map((c) => c.t));
    return { DROP, SPLIT, tracks, trail, REVEAL: LANDED + 0.04, END: LANDED + 1 };
  }
  const INTRO = buildIntro();
  let introStart = null;
  let introSeen = false;
  const introReveal = (t) => Math.max(0, Math.min(1, (t - INTRO.REVEAL) / 0.3));
  const introKick = (t) => {
    const u = t - (INTRO.REVEAL - 0.04);
    return u < 0 || t >= INTRO.END ? 0 : Math.exp(-u * 5.5) * Math.sin(u * 17);
  };
  function introCubes(t) {
    if (t < 0 || t >= INTRO.END) return [];
    if (t < INTRO.SPLIT) {
      let y;
      if (t < INTRO.DROP) y = 7 - (7 - LANDING[1]) * easeIn(t / INTRO.DROP);
      else y = LANDING[1] + 0.18 * Math.sin(Math.PI * Math.min(1, (t - INTRO.DROP) / 0.12));
      return [{ c: [LANDING[0], y, LANDING[2]], spin: null }];
    }
    return INTRO.tracks.map((track) => {
      let pose = null;
      for (const step of track) {
        if (t < step.start) { pose = pose || step.at(0); break; }
        pose = step.at(Math.min(1, (t - step.start) / step.dur));
      }
      return pose;
    });
  }
  const introTrail = (t) => INTRO.trail
    .filter((c) => t >= c.t)
    .map((c) => ({ at: c.at, a: Math.min(1, (t - c.t) / 0.15) * (1 - introReveal(t)) }));
  function cubeFacesAt({ c, spin, scale }) {
    const turned = (v) => (spin ? turn(v, spin[0], spin[1]) : v);
    const orient = (v) => { const r = turned(v); return scale ? r.map((x, i) => x * scale[i]) : r; };
    const out = [];
    for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const axis = n.findIndex((v) => v !== 0);
      const [u, v] = [0, 1, 2].filter((i) => i !== axis);
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
        const p = [0, 0, 0]; p[axis] = n[axis] * 0.5; p[u] = a * 0.5; p[v] = b * 0.5;
        return sub(add(c, orient(p)), CENTRE);
      });
      out.push({ corners, n: turned(n) });
    }
    return out;
  }
  function drawCube(t, look) {
    if (!introSeen) {
      introSeen = true;
      if (!motion.matches) { introStart = t; document.documentElement.classList.add("intro-wait"); }
    }
    const box = header.getBoundingClientRect();
    let cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const size = box.height / 5;
    const glowSize = box.height * 1.4, glowAlpha = 0.1;
    const intro = introStart !== null && t - introStart < INTRO.END;
    if (intro && t - introStart < 0.1) { facing.x = 0; facing.y = 0; }
    const target = intro || noMouse.matches || pointer.px === null ? { x: 0, y: 0 }
      : { x: clamp1((pointer.px - cx) / (w * 0.4)), y: clamp1((pointer.py - cy) / (h * 0.5)) };
    const dt = facing.t === null ? 0 : Math.min(t - facing.t, 0.1);
    facing.t = t;
    const ease = 1 - Math.exp(-dt * 3.5);
    facing.x += (target.x - facing.x) * ease;
    facing.y += (target.y - facing.y) * ease;
    let ay = 2.356 - facing.x * 0.75 * look.reach;
    let ax = -0.6155 - facing.y * 0.5 * look.reach;
    if (introStart !== null) {
      const kick = introKick(t - introStart);
      ax -= kick * 0.22;
      cy += kick * size * 0.12;
    }
    const [sy, cyw] = [Math.sin(ay), Math.cos(ay)], [sx, cxr] = [Math.sin(ax), Math.cos(ax)];
    const rot = ([x, y, z]) => {
      const x1 = x * cyw + z * sy, z1 = -x * sy + z * cyw;
      return [x1, y * cxr - z1 * sx, y * sx + z1 * cxr];
    };
    const project = ([x, y]) => [cx + x * size, cy - y * size];
    const [gr, gg, gb] = look.glow;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
    glow.addColorStop(0, `rgba(${gr}, ${gg}, ${gb}, ${glowAlpha})`);
    glow.addColorStop(1, `rgba(${gr}, ${gg}, ${gb}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    const light = look.light, ll = Math.hypot(...light);
    const shade = (corners, n0, extra) => {
      const n = rot(n0);
      if (n[2] > -0.001) return null;
      const pts = corners.map(rot);
      const depth = pts.reduce((a, p) => a + p[2], 0) / 4;
      const lit = Math.max(0, (n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / ll);
      return { pts: pts.map(project), depth, lit, ...extra };
    };
    const it = introStart !== null ? t - introStart : null;
    if (it !== null && it >= INTRO.END) introStart = null;
    if (it === null || it >= INTRO.END - 0.4) document.documentElement.classList.remove("intro-wait");
    const playing = it !== null && it < INTRO.END;
    const reveal = playing ? introReveal(it) : 1;
    const [r, g, b] = look.colour;
    const paint = (faces, alpha) => {
      faces.sort((a, b) => (b.cube ?? 0) - (a.cube ?? 0) || b.depth - a.depth);
      if (cubeLayer.width !== canvas.width || cubeLayer.height !== canvas.height) {
        cubeLayer.width = canvas.width; cubeLayer.height = canvas.height;
      }
      cl.setTransform(dpr, 0, 0, dpr, 0, 0);
      cl.clearRect(0, 0, w, h);
      cl.lineJoin = "round";
      if (look.notchColour) {
        cl.beginPath();
        for (const f of faces) {
          if (!f.inside) continue;
          const area = f.pts.reduce((a, p, i) => { const q = f.pts[(i + 1) % 4]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
          const pts = area < 0 ? [...f.pts].reverse() : f.pts;
          pts.forEach((p, i) => (i ? cl.lineTo(p[0], p[1]) : cl.moveTo(p[0], p[1])));
          cl.closePath();
        }
        cl.fillStyle = look.notchColour;
        cl.fill("nonzero");
      }
      for (const f of faces) {
        if (f.inside && look.notchColour) continue;
        cl.beginPath();
        f.pts.forEach((p, i) => (i ? cl.lineTo(p[0], p[1]) : cl.moveTo(p[0], p[1])));
        cl.closePath();
        const k = 0.18 + 0.82 * f.lit ** 1.3;
        const col = `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
        cl.fillStyle = col; cl.strokeStyle = col; cl.lineWidth = 1;
        cl.fill(); cl.stroke();
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(cubeLayer, 0, 0, w, h);
      ctx.globalAlpha = 1;
    };
    if (playing) {
      ctx.lineWidth = 1;
      ctx.lineJoin = "round";
      for (const { at, a } of introTrail(it)) {
        if (a <= 0) continue;
        const o = sub(at, CENTRE), q = (dx, dy, dz) => project(rot([o[0] + dx / 2, o[1] + dy / 2, o[2] + dz / 2]));
        ctx.beginPath();
        for (const [u, v] of [[0, 1], [1, 2], [2, 0]]) {
          for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
            const from = [0, 0, 0], to = [0, 0, 0];
            from[u] = -1; to[u] = 1; from[v] = to[v] = s1;
            const w3 = 3 - u - v; from[w3] = to[w3] = s2;
            const p0 = q(...from), p1 = q(...to);
            ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
          }
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.32 * a})`;
        ctx.stroke();
      }
    }
    if (reveal > 0) {
      const faces = [];
      for (const f of cubeFacesFor(look.notch)) {
        const face = shade(f.corners, f.n, { inside: f.inside });
        if (face) faces.push(face);
      }
      paint(faces, look.opacity * reveal);
    }
    if (playing && reveal < 1) {
      const faces = [];
      for (const cube of introCubes(it)) {
        const cubeDepth = rot(sub(cube.c, CENTRE))[2];
        for (const f of cubeFacesAt(cube)) {
          const face = shade(f.corners, f.n, { cube: cubeDepth });
          if (face) faces.push(face);
        }
      }
      paint(faces, look.opacity * (1 - reveal));
    }
    ctx.globalCompositeOperation = "lighter";
    for (const p of motes) {
      const x = ((p.x + 0.03 * Math.sin(t * p.sx + p.px)) % 1 + 1) % 1 * w;
      const y = ((p.y - p.fall * t + 0.03 * Math.sin(t * p.sy + p.py)) % 1 + 1) % 1 * h;
      const a = 0.18 + 0.2 * Math.sin(t * 1.1 + p.tw);
      ctx.fillStyle = `rgba(${gr}, ${Math.min(255, gg + 30)}, ${Math.min(255, gb + 40)}, ${a})`;
      ctx.beginPath(); ctx.arc(x, y, p.r * 0.9, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  seed = 1743339919;
  const nearMotes = Array.from({ length: 9 }, () => ({
    x: rand(), y: rand(), r: between(1.2, 3), depth: between(0.5, 1),
    sx: between(0.05, 0.12), sy: between(0.04, 0.1), px: between(0, 6.3), py: between(0, 6.3),
    rise: between(0.005, 0.012), tw: between(0, 6.3)
  }));
  function drawNear(t, look) {
    const [gr, gg, gb] = look.glow;
    const col = `${gr}, ${Math.min(255, gg + 30)}, ${Math.min(255, gb + 40)}`;
    nctx.globalCompositeOperation = "lighter";
    for (const p of nearMotes) {
      const x = ((p.x + 0.04 * Math.sin(t * p.sx + p.px)) % 1 + 1) % 1 * w - pointer.x * 16 * p.depth;
      const y = ((p.y - p.rise * t + 0.04 * Math.sin(t * p.sy + p.py)) % 1 + 1) % 1 * h - pointer.y * 10 * p.depth;
      const a = 0.14 + 0.1 * Math.sin(t * 0.8 + p.tw);
      const r = p.r * 3;
      const g = nctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col}, ${a})`);
      g.addColorStop(0.35, `rgba(${col}, ${a * 0.6})`);
      g.addColorStop(1, `rgba(${col}, 0)`);
      nctx.fillStyle = g;
      nctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    nctx.globalCompositeOperation = "source-over";
  }
  function frame(t) {
    if (!canvas.width || !canvas.height) return;
    ctx.clearRect(0, 0, w, h);
    nctx.clearRect(0, 0, w, h);
    drawCube(t, LOGO);
    drawNear(t, LOGO);
  }
  let raf = 0, clock = 0, last = null;
  function loop(now) {
    raf = 0;
    if (stage && !stage.hidden) { last = null; return; }
    clock += last === null ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;
    frame(clock);
    if (!motion.matches) schedule();
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(loop); };
  window.addEventListener("resize", () => { resize(); frame(clock); });
  header.addEventListener("click", () => {
    if (motion.matches) return;
    introStart = clock;
    schedule();
  });
  window.Motion.onChange(() => {
    last = null;
    if (motion.matches) document.documentElement.classList.remove("intro-wait");
    frame(clock); schedule();
  });
  if (stage) new MutationObserver(schedule).observe(stage, { attributes: true, attributeFilter: ["hidden"] });
  resize(); frame(clock); schedule();
})();
