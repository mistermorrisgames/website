(() => {
  "use strict";
  const GAMES = window.GAMES || [];
  const SITE = window.SITE || {};
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  const $ = (sel) => document.querySelector(sel);
  const room = $("#room");
  const shelfRow = $("#shelf-row");
  const stage = $("#stage");
  const backdrop = $("#backdrop");
  const dialog = $("#dialog");
  const closeBtn = $("#close-btn");
  const anchor = $(".case-anchor");
  const caseEl = $("#case");
  const spineHinge = $("#spine-hinge");
  const lid = $("#lid");
  const caseShadow = $("#case-shadow");
  const pager = $("#pager");
  const pagerDots = [...document.querySelectorAll(".pager-dot")];
  const reduceMotion = window.Motion;
  const CASE_RATIO = 170 / 105;
  const DEPTH_RATIO = 11 / 170;
  const PLATFORM_NAMES = {
    steam: "Steam", switch: "Switch", xbox: "Xbox", playstation: "PlayStation",
    web: "Web", itch: "itch.io", mobile: "Mobile"
  };
  const PLATFORM_ICONS = {
    steam: "steam.svg", switch: "nintendoswitch.svg", xbox: "xbox.svg", playstation: "playstation.svg",
    web: "web.svg", itch: "itchdotio.svg", mobile: "mobile.svg"
  };
  const platformName = (p) => PLATFORM_NAMES[p] || p;
  function platformIcon(p) {
    const file = PLATFORM_ICONS[p];
    if (!file) return h("span", { class: "platform-tag" }, platformName(p).toUpperCase());
    return h("span", { class: "platform-icon", "data-platform": p, style: `--icon: url("images/platforms/${file}")` });
  }
  function linkPlatform(link) {
    if (link.platform) return link.platform;
    const text = `${link.url || ""} ${link.label || ""}`.toLowerCase();
    if (text.includes("steam")) return "steam";
    if (/eshop|nintendo|switch/.test(text)) return "switch";
    if (/xbox|microsoft/.test(text)) return "xbox";
    if (/playstation|psn/.test(text)) return "playstation";
    if (text.includes("itch")) return "itch";
    return "web";
  }
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) {
      if (child != null && child !== false) node.append(child);
    }
    return node;
  }
  function inkFor(hex) {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!match) return "#fdf6ea";
    const n = parseInt(match[1], 16);
    const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.6 ? "#1b1410" : "#fdf6ea";
  }
  function paint(node, game) {
    const caseColor = SITE.caseColor || "#e60012";
    node.style.setProperty("--case-color", caseColor);
    node.style.setProperty("--case-ink", SITE.caseInk || inkFor(caseColor));
    node.style.setProperty("--game-color", game.color || "#888888");
    node.style.setProperty("--game-ink", game.textColor || inkFor(game.color));
  }
  const paragraphs = (text) =>
    String(text || "").split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((t) => h("p", {}, t));
  let logoMarkup = null;
  function inlineLogo(text) {
    const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
    const box = svg.getAttribute("viewBox");
    const shapes = [...svg.querySelectorAll("path, polygon, rect, circle, ellipse")]
      .filter((el) => el.closest("mask") && el.getAttribute("fill") && el.getAttribute("fill") !== "none");
    if (!box || !shapes.length) return null;
    const light = (c) => {
      const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
      if (!m) return 1;
      const n = parseInt(m[1], 16);
      return +((((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255)) / 765).toFixed(3);
    };
    const parts = shapes.map((el) => {
      const copy = el.cloneNode(true);
      copy.setAttribute("fill", "currentColor");
      copy.setAttribute("fill-opacity", String(light(el.getAttribute("fill"))));
      copy.removeAttribute("stroke");
      copy.removeAttribute("stroke-width");
      return new XMLSerializer().serializeToString(copy).replace(/ xmlns="[^"]*"/g, "");
    });
    return `<svg viewBox="${box}" aria-hidden="true">${parts.join("")}</svg>`;
  }
  const useInlineLogo = (el) => { el.innerHTML = logoMarkup; el.classList.add("is-inline"); };
  if (SITE.logo) {
    fetch(SITE.logo).then((r) => r.text()).then((text) => {
      logoMarkup = inlineLogo(text);
      if (logoMarkup) document.querySelectorAll(".studio-logo--image").forEach(useInlineLogo);
    }).catch(() => {});
  }
  function studioLogo() {
    if (!SITE.logo) return h("span", { class: "studio-logo studio-logo--text" }, SITE.logoText || "");
    const logo = h("span", { class: "studio-logo studio-logo--image" });
    logo.style.setProperty("--logo", `url("${SITE.logo}")`);
    if (SITE.logoColor) logo.style.color = SITE.logoColor;
    if (logoMarkup) useInlineLogo(logo);
    return logo;
  }
  function spineArt(game) {
    const art = game.spine || game.cover;
    const insert = h("span", { class: "spine-insert" },
      h("span", { class: "spine-title" }, game.title),
      h("span", { class: "spine-platforms" }, (game.platforms || []).map(platformIcon))
    );
    if (art) insert.style.setProperty("--spine-art", `url("${art}")`);
    else if (game.wip) insert.classList.add("is-wip");
    return h("span", { class: "spine-art", "aria-hidden": "true" },
      h("span", { class: "spine-top" }, h("span", { class: SITE.logo ? "spine-logo spine-logo--image" : "spine-logo" }, studioLogo())),
      insert
    );
  }
  function coverArt(game, alt, kind = "cover") {
    const src = game[kind] || game.cover;
    if (src) return h("img", { class: "cover-img", src, alt, draggable: "false", decoding: "async" });
    return h("div", { class: `cover-placeholder${game.wip ? " is-wip" : ""}`, role: alt ? "img" : null, "aria-label": alt || null },
      h("span", { class: "cover-placeholder-title" }, game.title),
      game.wip && kind === "cover" && h("span", { class: "cover-placeholder-note" }, "Work in progress")
    );
  }
  function hash(str) {
    let n = 2166136261;
    for (const c of str) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return n >>> 0;
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const COVER_WEAR = { margin: 4, worn: 0.2, amp: 2.7, freq: 0.09, tears: [0, 1], tearHalf: [2.9, 2.2], tearDepth: [3.2, 3.7], rubChance: 0.5, rubSize: [2.6, 3] };
  const PAGE_WEAR = { margin: 4, worn: 0.2, amp: 1.55, freq: 0.14, tears: [0, 1], tearHalf: [1.7, 2.1], tearDepth: [1.3, 2.1], rubChance: 0.35, rubSize: [1.7, 2.6] };
  function tornEdge(seed, wear) {
    const rand = rng(seed);
    const between = ([min, range]) => min + rand() * range;
    const W = 300, H = 400, M = wear.margin, STEP = 1.5, RAMP = 10;
    const smooth = (t) => t * t * (3 - 2 * t);
    const corners = [[-10, M], [W - M, M], [W - M, H - M], [-10, H - M]];
    const inward = [[0, 1], [-1, 0], [0, -1], [1, 0]];
    const edges = [0, 1, 2, 3].map((i) => {
      const [x1, y1] = corners[i];
      const [x2, y2] = corners[(i + 1) % 4];
      const len = Math.hypot(x2 - x1, y2 - y1);
      return { x1, y1, len, ux: (x2 - x1) / len, uy: (y2 - y1) / len, nx: inward[i][0], ny: inward[i][1] };
    });
    const noiseFor = (len) => {
      const octaves = [1, 2.3, 5.1].map((mult) => {
        const f = wear.freq * mult;
        const values = Array.from({ length: Math.ceil(len * f) + 2 }, () => rand());
        return (s) => {
          const x = s * f, i = Math.floor(x), t = smooth(x - i);
          return values[i] + (values[i + 1] - values[i]) * t;
        };
      });
      return (s) => octaves[0](s) * 0.55 + octaves[1](s) * 0.3 + octaves[2](s) * 0.15;
    };
    const rubbed = corners.map((_, i) => ((i === 1 || i === 2) && rand() < wear.rubChance ? between(wear.rubSize) : 0));
    const [minTears, maxTears] = wear.tears;
    const tearCount = minTears + Math.floor(rand() * (maxTears - minTears + 1));
    const tears = [0, 1, 2].sort(() => rand() - 0.5).slice(0, tearCount).map((edge) => ({
      edge, at: (0.15 + rand() * 0.7) * edges[edge].len, half: between(wear.tearHalf), depth: between(wear.tearDepth)
    }));
    const zones = tears.map((t) => [t.edge, t.at - t.half - 12, t.at + t.half + 12]);
    if (rubbed[1]) zones.push([0, edges[0].len - 22, edges[0].len + RAMP], [1, -RAMP, 22]);
    if (rubbed[2]) zones.push([1, edges[1].len - 22, edges[1].len + RAMP], [2, -RAMP, 22]);
    const openLength = edges[0].len + edges[1].len + edges[2].len;
    let covered = zones.reduce((sum, [, a, b]) => sum + (b - a), 0);
    while (covered < wear.worn * openLength) {
      const edge = Math.floor(rand() * 3), size = 30 + rand() * 45;
      const from = rand() * (edges[edge].len - size);
      zones.push([edge, from, from + size]);
      covered += size;
    }
    const wornAt = (edge, s) => zones.reduce((w, [i, a, b]) => {
      if (i !== edge) return w;
      const inside = Math.min(s - a, b - s) / RAMP + 0.5;
      return Math.max(w, smooth(Math.min(1, Math.max(0, inside))));
    }, 0);
    const pts = [];
    edges.forEach((e, i) => {
      const noise = noiseFor(e.len);
      const start = rubbed[i], end = e.len - rubbed[(i + 1) % 4];
      for (let s = start; ; s = Math.min(s + STEP, end)) {
        let bite = i < 3 ? wornAt(i, s) * wear.amp * noise(s) : 0;
        for (const t of tears) {
          if (t.edge === i && Math.abs(s - t.at) < t.half) bite += t.depth * (1 - Math.abs(s - t.at) / t.half);
        }
        pts.push([e.x1 + e.ux * s + e.nx * bite, e.y1 + e.uy * s + e.ny * bite]);
        if (s >= end) break;
      }
    });
    const d = "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
      `<path fill="#fff" d="${d}"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  function scuffs(seed, { w = 300, h = 486, count = 12, len = [6, 30], width = [0.5, 1], opacity = [0.08, 0.2], smudges = 0, color = "#fff" } = {}) {
    const rand = rng(seed);
    const between = ([min, max]) => min + rand() * (max - min);
    const grain = rand() * Math.PI;
    let marks = "";
    for (let i = 0; i < smudges; i++) {
      marks += `<ellipse cx="${(rand() * w).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" rx="${(w * between([0.06, 0.14])).toFixed(1)}" ry="${(w * between([0.04, 0.1])).toFixed(1)}" fill="${color}" fill-opacity="${between([0.03, 0.06]).toFixed(3)}" filter="url(#b)"/>`;
    }
    for (let i = 0; i < count; i++) {
      const x = rand() * w, y = rand() * h, a = grain + (rand() - 0.5) * 1.1, l = between(len);
      const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
      const bend = (rand() - 0.5) * l * 0.25;
      const cx = (x + x2) / 2 - Math.sin(a) * bend, cy = (y + y2) / 2 + Math.cos(a) * bend;
      marks += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" stroke-opacity="${between(opacity).toFixed(3)}" stroke-width="${between(width).toFixed(2)}" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/>`;
    }
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
      `<filter id="b"><feGaussianBlur stdDeviation="${(w * 0.03).toFixed(1)}"/></filter>${marks}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  const spineScuffs = (game) =>
    scuffs(hash(game.title) + 14, { w: 33, h: 402, count: 5, len: [5, 22], opacity: [0.1, 0.22] });
  const preloaded = new Set();
  function preloadArt(game) {
    for (const src of [game.cover, game.manual, game.cart]) {
      if (!src || preloaded.has(src)) continue;
      preloaded.add(src);
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    }
  }
  window.addEventListener("load", () => {
    const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    later(() => GAMES.forEach(preloadArt));
  });
  if (SITE.name) {
    $("#studio-name").alt = SITE.name;
    document.title = SITE.name;
  }
  const spines = GAMES.map((game, i) => {
    const btn = h("button", {
      type: "button",
      class: "spine",
      "aria-label": `${game.title}. Open case`,
      "aria-haspopup": "dialog"
    }, spineArt(game));
    paint(btn, game);
    btn.style.setProperty("--scuff-spine", spineScuffs(game));
    btn.addEventListener("click", () => openCase(i));
    for (const type of ["pointerenter", "focus", "touchstart"]) {
      btn.addEventListener(type, () => preloadArt(game), { passive: true });
    }
    shelfRow.append(h("li", { class: "shelf-slot" }, btn));
    return btn;
  });
  const stacked = window.matchMedia("(min-width: 701px)");
  const shelfScale = () => (stacked.matches ? 1.25 * 1.2 : 1.25);
  const shelf = $(".shelf");
  function fitShelf() {
    shelf.style.setProperty("--shelf-scale", "1");
    shelf.style.setProperty("--shelf-extra", "0px");
    const cs = getComputedStyle(room);
    const roomH = room.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const roomW = room.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const other = $(".masthead").offsetHeight + parseFloat(cs.rowGap || cs.gap || 0);
    const lift = 8;
    const r = shelf.getBoundingClientRect();
    const scale = Math.max(0.5, Math.min(shelfScale(), (roomH - other - lift) / r.height, roomW / shelfRow.offsetWidth));
    shelf.style.setProperty("--shelf-scale", scale.toFixed(3));
    shelf.style.setProperty("--shelf-extra", `${Math.round((scale - 1) * r.height)}px`);
  }
  fitShelf();
  window.addEventListener("resize", fitShelf);
  if (document.fonts) document.fonts.ready.then(fitShelf);
  const arrowIcon = () => {
    const span = h("span", { class: "press-arrow", "aria-hidden": "true" });
    span.innerHTML = '<svg viewBox="0 0 10 10" width="8" height="8"><path d="M2.5 7.5l5-5M3.5 2.5h4v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return span;
  };
  function fillCase(game) {
    paint(stage, game);
    const wearSeed = hash(game.title);
    stage.style.setProperty("--scuff-front", scuffs(wearSeed + 11, { count: 16, opacity: [0.07, 0.2], smudges: 3 }));
    stage.style.setProperty("--scuff-left", scuffs(wearSeed + 12, { count: 10, opacity: [0.08, 0.18], smudges: 2, color: "#5a4634" }));
    stage.style.setProperty("--scuff-right", scuffs(wearSeed + 13, { count: 10, opacity: [0.08, 0.18], smudges: 2, color: "#5a4634" }));
    stage.style.setProperty("--scuff-cart", scuffs(wearSeed + 15, { w: 100, h: 115, count: 8, len: [4, 18], opacity: [0.1, 0.26] }));
    stage.style.setProperty("--scuff-cart-back", scuffs(wearSeed + 18, { w: 100, h: 115, count: 8, len: [4, 18], opacity: [0.1, 0.26] }));
    const lw = rng(wearSeed + 17);
    const corner = ["100% 0%", "100% 100%", "0% 100%"][Math.floor(lw() * 3)];
    const edge = ["0deg", "90deg", "180deg", "270deg"][Math.floor(lw() * 4)];
    stage.style.setProperty("--label-rub", `radial-gradient(circle at ${corner}, rgb(242 232 213 / ${(0.18 + lw() * 0.2).toFixed(2)}), transparent ${Math.round(14 + lw() * 16)}%)`);
    stage.style.setProperty("--label-edge", `linear-gradient(${edge}, rgb(242 232 213 / ${(0.08 + lw() * 0.14).toFixed(2)}), transparent ${Math.round(6 + lw() * 10)}%)`);
    stage.style.setProperty("--scuff-spine", spineScuffs(game));
    stage.style.setProperty("--scuff-booklet", scuffs(wearSeed + 16, { w: 300, h: 400, count: 9, len: [8, 34], width: [0.4, 0.8], opacity: [0.1, 0.22] }));
    $("#case-spine").replaceChildren(spineArt(game));
    $("#case-front").replaceChildren(
      h("div", { class: "insert" },
        h("div", { class: "insert-art" }, coverArt(game, ""))),
      h("div", { class: "cover-sheen", id: "cover-sheen" })
    );
    const seed = hash(game.title);
    const layer = (cls, layerSeed, wear, ...children) => {
      const node = h("div", { class: cls }, ...children);
      node.style.setProperty("--torn-edge", tornEdge(layerSeed, wear));
      return node;
    };
    const manualWrap = $("#manual-wrap");
    manualWrap.replaceChildren(
      layer("manual-page", seed + 1, PAGE_WEAR),
      layer("manual", seed, COVER_WEAR, h("div", { class: "manual-art" }, coverArt(game, `${game.title} cover art`, "manual")))
    );
    const hasBooklet = !!(game.screenshots && game.screenshots.length && window.Booklet && window.Booklet.available());
    manualWrap.classList.toggle("is-openable", hasBooklet);
    if (hasBooklet) {
      manualWrap.setAttribute("role", "button");
      manualWrap.setAttribute("tabindex", "0");
      manualWrap.setAttribute("aria-label", `Open the instruction booklet for ${game.title}`);
    } else {
      for (const a of ["role", "tabindex", "aria-label"]) manualWrap.removeAttribute(a);
    }
    $("#case-cart").replaceChildren(
      h("div", { class: "cart-label" }, coverArt(game, "", "cart")),
      h("div", { class: "cart-contacts", "aria-hidden": "true" },
        Array.from({ length: 5 }, () => h("span", { class: "cart-slot" })))
    );
    if (window.Cartridge) window.Cartridge.fill(game);
    const meta = [game.released, game.genre].filter(Boolean).join(" · ");
    const links = (game.links || []).filter((l) => l && l.label);
    const card = $("#info-card");
    card.replaceChildren(
      h("h2", { class: "info-title", id: "case-title" }, game.title),
      meta && h("p", { class: "info-meta" }, meta),
      h("div", { id: "case-desc" }, paragraphs(game.description)),
      game.commentary && h("section", { class: "info-notes" },
        h("h3", { class: "info-heading" }, "Developer's notes"),
        paragraphs(game.commentary)),
    );
    card.scrollTop = 0;
    const platforms = game.platforms || [];
    const linkFor = (p) => links.find((l) => linkPlatform(l) === p);
    for (const l of links) {
      if (!platforms.includes(linkPlatform(l))) {
        console.warn(`"${game.title}": the link "${l.label}" doesn't match any of its platforms, so it isn't shown.`);
      }
    }
    const linksEl = $("#info-links");
    linksEl.hidden = !platforms.length && !game.presskit && !game.trailer;
    const extra = (url, text, label) => url && h("a", {
      class: "press-link", href: url, target: "_blank", rel: "noopener", "aria-label": `${label} (opens in a new tab)`
    }, text, arrowIcon());
    const press = extra(game.presskit, "Press kit", `Press kit for ${game.title}`);
    const trailer = extra(game.trailer, "YouTube", `Watch the ${game.title} trailer on YouTube`);
    linksEl.replaceChildren(h("div", { class: "info-links-body" },
      h("h3", { class: "info-heading", id: "info-links-title" }, game.wip ? "Coming to" : "Available on"),
      (press || trailer) && h("div", { class: "info-extra" }, press, trailer),
      h("ul", {},
        platforms.map((p) => {
          const l = linkFor(p);
          if (!l) {
            return h("li", {}, h("span", { class: "store-link", role: "img", "aria-label": platformName(p), title: platformName(p) }, platformIcon(p)));
          }
          const external = l.url && l.url !== "#";
          return h("li", {},
            h("a", {
              class: "store-link",
              href: l.url || "#",
              target: external ? "_blank" : null,
              rel: external ? "noopener" : null,
              "aria-label": l.label,
              title: l.label
            }, platformIcon(p)));
        }))
    ));
  }
  let dims = { w: 0, h: 0, d: 0, narrow: false };
  const narrowScreen = window.matchMedia("(max-width: 700px)");
  let pan = 0.5;
  function measure() {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const ref = spines[0];
    const spineW = ref ? Math.min(ref.offsetWidth, ref.offsetHeight) : 33;
    const spineH = ref ? Math.max(ref.offsetWidth, ref.offsetHeight) : 402;
    const narrow = narrowScreen.matches;
    const short = !narrow && vh < 520;
    let w, hgt;
    if (narrow) {
      w = 2 * Math.round(Math.max(70, Math.min((vw - 32) / 2, (vh - 130) / (2 * CASE_RATIO))));
      hgt = Math.round(w * CASE_RATIO);
    } else if (short) {
      hgt = Math.round(Math.max(200, vh - 90));
      w = 2 * Math.round(Math.max(70, Math.min(hgt / 2, (vw - 48 - hgt * DEPTH_RATIO) / 4)));
    } else {
      const spreadPerW = 2 + CASE_RATIO * DEPTH_RATIO;
      w = 2 * Math.round(Math.max(70, Math.min(200, (vw - 48) / (2 * spreadPerW), (vh - 150) / (2 * CASE_RATIO))));
      hgt = Math.round(w * CASE_RATIO);
    }
    const d = hgt * DEPTH_RATIO;
    dims = { w, h: hgt, d, narrow };
    stage.classList.toggle("is-narrow", narrow);
    stage.classList.toggle("is-short", short);
    stage.style.setProperty("--w", `${w}px`);
    stage.style.setProperty("--h", `${hgt}px`);
    stage.style.setProperty("--d", `${d}px`);
    stage.style.setProperty("--k", String(hgt / spineH));
    stage.style.setProperty("--kx", String(d / spineW));
    stage.style.setProperty("--spine-w", `${spineW}px`);
    stage.style.setProperty("--spine-h", `${spineH}px`);
  }
  const pose = (x, y, z, { sx = 1, sy = 1, sz = 1, ry = 0, rz = 0 } = {}) =>
    `translate3d(${x}px, ${y}px, ${z}px) scale3d(${sx}, ${sy}, ${sz}) rotateZ(${rz}deg) rotateY(${ry}deg)`;
  const hinge = (deg) => `rotateY(${deg}deg)`;
  const frontPose = () => pose(0, 0, 0);
  const openPose = (p = pan) => pose((1 - p) * (dims.w + dims.d), 0, dims.d / 2);
  function setPan(p) {
    pan = p;
    stage.style.setProperty("--pan-x", `${((0.5 - p) * (dims.w + dims.d)).toFixed(1)}px`);
    for (const dot of pagerDots) dot.setAttribute("aria-current", String(Math.round(p) === Number(dot.dataset.panel)));
  }
  function shelfPose(btn) {
    const r = btn.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const x = r.left + r.width / 2 - a.left, y = r.top + r.height / 2 - (a.top + a.height / 2);
    if (r.width > r.height) {
      const s = r.width / dims.h;
      return pose(x, y, 0, { sx: s, sy: r.height / dims.d, sz: s, ry: 90, rz: -90 });
    }
    const s = r.height / dims.h;
    return pose(x, y, 0, { sx: r.width / dims.d, sy: s, sz: s, ry: 90 });
  }
  function setHinges(deg) {
    spineHinge.style.transform = hinge(deg);
    lid.style.transform = hinge(deg);
  }
  const swingHinges = (from, to, duration, easing) => Promise.all([
    play(spineHinge, [{ transform: hinge(from) }, { transform: hinge(to) }], duration, easing),
    play(lid, [{ transform: hinge(from) }, { transform: hinge(to) }], duration, easing)
  ]);
  function play(el, keyframes, duration, easing = "linear") {
    const anim = el.animate(keyframes, { duration, easing, fill: "forwards" });
    return anim.finished.then(() => {
      try { anim.commitStyles(); } catch {   }
      anim.cancel();
    });
  }
  function thump(base, deg, duration = 900) {
    const frames = [];
    for (let i = 0; i <= 24; i++) {
      const u = (i / 24) * (duration / 1000);
      frames.push({ transform: `${base} rotateX(${(deg * Math.exp(-u * 5.5) * Math.sin(u * 17)).toFixed(3)}deg)` });
    }
    return frames;
  }
  let landing = null;
  const fade = (el, from, to, duration) =>
    play(el, [{ opacity: from }, { opacity: to }], duration, "ease-out");
  let state = "closed";
  let current = -1;
  let closeRequested = false;
  async function openCase(index) {
    if (state !== "closed") return;
    state = "opening";
    current = index;
    closeRequested = false;
    const btn = spines[index];
    fillCase(GAMES[index]);
    const cover = $("#case-front img");
    if (cover && !cover.complete) {
      await Promise.race([cover.decode().catch(() => {}), new Promise((r) => setTimeout(r, 250))]);
    }
    stage.hidden = false;
    measure();
    setPan(dims.narrow ? 0 : 0.5);
    const start = shelfPose(btn);
    caseEl.style.transform = start;
    setHinges(90);
    stage.classList.add("is-shut");
    btn.classList.add("is-out");
    room.inert = true;
    closeBtn.focus({ preventScroll: true });
    if (reduceMotion.matches) {
      caseEl.style.transform = openPose();
      setHinges(0);
      stage.classList.remove("is-shut");
      await Promise.all([fade(backdrop, 0, 1, 200), fade(closeBtn, 0, 1, 200), fade(pager, 0, 1, 200), fade(caseShadow, 0, 1, 200)]);
    } else {
      fade(backdrop, 0, 1, 420);
      fade(closeBtn, 0, 1, 300);
      fade(pager, 0, 1, 300);
      const SWING_MS = 620;
      $("#cover-sheen").animate(
        [{ transform: "translateX(-70%)" }, { transform: "translateX(70%)" }],
        { duration: SWING_MS, easing: "cubic-bezier(.3, .1, .2, 1)", fill: "both" }
      );
      await play(caseEl, [{ transform: start }, { transform: frontPose() }], SWING_MS, "cubic-bezier(.3, .1, .2, 1)");
      const OPEN_EASE = "cubic-bezier(.4, .05, .2, 1)";
      fade(caseShadow, 0, 1, 700);
      stage.classList.remove("is-shut");
      setTimeout(() => {
        landing = caseEl.animate(thump("", 2), { duration: 900, composite: "add" });
        landing.finished.then(() => { landing = null; }, () => {});
      }, 390);
      await Promise.all([
        play(caseEl, [{ transform: frontPose() }, { transform: openPose() }], 600, OPEN_EASE),
        swingHinges(90, 0, 600, OPEN_EASE)
      ]);
    }
    state = "open";
    if (closeRequested) closeCase();
  }
  async function closeCase() {
    if (state === "opening") { closeRequested = true; return; }
    if (state !== "open") return;
    state = "closing";
    const btn = spines[current];
    const end = shelfPose(btn);
    if (landing) landing.cancel();
    if (reduceMotion.matches) {
      await Promise.all([fade(backdrop, 1, 0, 200), fade(closeBtn, 1, 0, 150), fade(pager, 1, 0, 150), fade(caseShadow, 1, 0, 150)]);
    } else {
      fade(closeBtn, 1, 0, 200);
      fade(pager, 1, 0, 200);
      fade(caseShadow, 1, 0, 260);
      const CLOSE_EASE = "cubic-bezier(.45, 0, .25, 1)";
      await Promise.all([
        play(caseEl, [{ transform: openPose() }, { transform: frontPose() }], 480, CLOSE_EASE),
        swingHinges(0, 90, 480, CLOSE_EASE)
      ]);
      stage.classList.add("is-shut");
      fade(backdrop, 1, 0, 560);
      await play(caseEl, [{ transform: frontPose() }, { transform: end }], 560, "cubic-bezier(.45, 0, .2, 1)");
    }
    btn.classList.remove("is-out");
    stage.hidden = true;
    room.inert = false;
    btn.focus({ preventScroll: true });
    state = "closed";
  }
  closeBtn.addEventListener("click", closeCase);
  const manualWrap = $("#manual-wrap");
  const openBooklet = () => {
    if (state === "open" && manualWrap.classList.contains("is-openable") && window.Booklet.available()) window.Booklet.open(GAMES[current], manualWrap);
  };
  manualWrap.addEventListener("click", openBooklet);
  manualWrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBooklet(); }
  });
  backdrop.addEventListener("click", closeCase);
  document.addEventListener("keydown", (e) => {
    if (window.Booklet && window.Booklet.isOpen()) return;
    if (e.key === "Escape" && (state === "open" || state === "opening")) {
      e.preventDefault();
      closeCase();
    }
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusables = [...dialog.querySelectorAll('button, a[href], [tabindex="0"]')]
      .filter((el) => el.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.addEventListener("resize", () => {
    if (state !== "open") return;
    measure();
    setPan(dims.narrow ? Math.round(Math.min(1, Math.max(0, pan))) : 0.5);
    caseEl.style.transform = openPose();
    setHinges(0);
  });
  function slideTo(target) {
    if (!dims.narrow || state !== "open") return;
    const from = caseEl.style.transform;
    setPan(target);
    if (reduceMotion.matches) caseEl.style.transform = openPose();
    else play(caseEl, [{ transform: from }, { transform: openPose() }], 380, "cubic-bezier(.2, .8, .2, 1)");
  }
  for (const dot of pagerDots) dot.addEventListener("click", () => slideTo(Number(dot.dataset.panel)));
  dialog.addEventListener("keydown", (e) => {
    if (!dims.narrow || state !== "open") return;
    if (e.key === "ArrowRight") { e.preventDefault(); slideTo(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); slideTo(0); }
  });
  let drag = null;
  let justDragged = false;
  let glide = 0;
  const scroller = $("#info-card");
  caseEl.addEventListener("pointerdown", (e) => {
    if (state !== "open" || !e.isPrimary || e.button > 0) return;
    cancelAnimationFrame(glide);
    const touch = e.pointerType !== "mouse";
    drag = {
      id: e.pointerId, x: e.clientX, y: e.clientY, pan, mode: null,
      canSwipe: dims.narrow,
      canScroll: touch && scroller.contains(e.target),
      top: scroller.scrollTop, lastY: e.clientY, lastT: e.timeStamp, v: 0
    };
  });
  caseEl.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.mode) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      drag.mode = Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
      if ((drag.mode === "swipe" && !drag.canSwipe) || (drag.mode === "scroll" && !drag.canScroll)) { drag = null; return; }
      try { caseEl.setPointerCapture(e.pointerId); } catch {   }
      if (drag.mode === "swipe") stage.classList.add("is-dragging");
    }
    if (drag.mode === "scroll") {
      scroller.scrollTop = drag.top - dy;
      const dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.v = 0.8 * ((drag.lastY - e.clientY) / dt) + 0.2 * drag.v;
      drag.lastY = e.clientY;
      drag.lastT = e.timeStamp;
      return;
    }
    let p = drag.pan - dx / (dims.w + dims.d);
    if (p < 0) p *= 0.3;
    if (p > 1) p = 1 + (p - 1) * 0.3;
    setPan(p);
    caseEl.style.transform = openPose();
    drag.dx = dx;
  });
  function coast(v) {
    let last = performance.now();
    const step = (now) => {
      const dt = now - last;
      last = now;
      scroller.scrollTop += v * dt;
      v *= Math.pow(0.995, dt);
      if (Math.abs(v) > 0.02) glide = requestAnimationFrame(step);
    };
    glide = requestAnimationFrame(step);
  }
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { mode, dx = 0, pan: startPan, v, lastT } = drag;
    drag = null;
    stage.classList.remove("is-dragging");
    if (!mode) return;
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);
    if (mode === "scroll") {
      if (e.type === "pointerup" && e.timeStamp - lastT < 100) coast(v);
      return;
    }
    const target = Math.abs(dx) > 40 ? (dx < 0 ? 1 : 0) : Math.round(Math.min(1, Math.max(0, startPan)));
    slideTo(target);
  };
  caseEl.addEventListener("pointerup", endDrag);
  stage.addEventListener("touchmove", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  caseEl.addEventListener("pointercancel", endDrag);
  caseEl.addEventListener("click", (e) => { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
})();
