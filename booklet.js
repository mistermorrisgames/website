window.Booklet = (() => {
  "use strict";
  const PAGE_RATIO = 16 / 9 / 2;
  const FLIP_MS = 620;
  const FLY_MS = 380;
  const narrowScreen = window.matchMedia("(max-width: 700px)");
  const reduceMotion = window.Motion;
  const el = (tag, cls, attrs = {}) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const reader = el("div", "reader", { role: "dialog", "aria-modal": "true", "aria-label": "Instruction booklet" });
  reader.hidden = true;
  const backdrop = el("div", "reader-backdrop");
  const closeBtn = el("button", "reader-close", { type: "button", "aria-label": "Close the booklet" });
  closeBtn.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const bookWrap = el("div", "book-wrap");
  const book = el("div", "book");
  const prevBtn = el("button", "reader-turn reader-prev", { type: "button", "aria-label": "Previous page" });
  const nextBtn = el("button", "reader-turn reader-next", { type: "button", "aria-label": "Next page" });
  prevBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  nextBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const count = el("p", "reader-count", { "aria-live": "polite" });
  const dots = el("div", "reader-dots", { "aria-hidden": "true" });
  const zoom = el("button", "reader-zoom", { type: "button", "aria-label": "Close the enlarged screenshot" });
  zoom.hidden = true;
  const zoomImg = el("img", "", { alt: "" });
  zoom.append(zoomImg);
  bookWrap.append(book);
  reader.append(backdrop, bookWrap, prevBtn, nextBtn, count, dots, closeBtn, zoom);
  document.body.append(reader);
  let game = null, shots = [], from = null, view = 0, busy = false;
  let pending = null;
  let P = 0;
  const lastView = () => shots.length;
  function size() {
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const room = narrowScreen.matches ? 16 : 160;
    const H = Math.round(Math.min(vh * 0.78, (vw - room) / (2 * PAGE_RATIO)));
    P = Math.round(H * PAGE_RATIO);
    reader.style.setProperty("--page-w", `${P}px`);
    reader.style.setProperty("--page-h", `${H}px`);
  }
  function face(v, side) {
    const node = el("div", "face-content");
    if (v === 0) {
      if (side === "right") {
        node.classList.add("is-cover");
        const art = game.manual || game.cover;
        if (art) node.style.backgroundImage = `url("${art}")`;
        else node.style.background = "var(--game-color)";
      } else node.classList.add("is-blank");
      return node;
    }
    const half = el("div", `shot-half is-${side}`);
    half.style.backgroundImage = `url("${shots[v - 1]}")`;
    half.dataset.shot = v - 1;
    node.append(half);
    return node;
  }
  function render() {
    book.replaceChildren(pageSlot("left", face(view, "left")), pageSlot("right", face(view, "right")));
    bookWrap.style.transform = view === 0 ? `translateX(${-P / 2}px)` : "none";
    book.classList.toggle("is-closed", view === 0);
    prevBtn.disabled = view === 0;
    prevBtn.setAttribute("aria-label", view <= 1 ? "Close the booklet" : "Previous page");
    nextBtn.setAttribute("aria-label", view === lastView() ? "Close the booklet" : "Next page");
    count.textContent = view === 0 ? "" : `${view} / ${shots.length}`;
    dots.replaceChildren(...shots.map((_, i) => el("span", i + 1 === view ? "is-current" : "")));
  }
  function pageSlot(where, content) {
    const s = el("div", `page page-${where}`);
    s.append(content);
    return s;
  }
  function request(action) {
    if (busy) { pending = action; return; }
    action(false);
  }
  function done() {
    busy = false;
    const next = pending;
    pending = null;
    if (next && !reader.hidden) next(true);
  }
  const forward = (queued) => {
    if (view < lastView()) flip(view + 1).then(done);
    else if (!queued) close();
  };
  const backward = (queued) => {
    if (view > 1) flip(view - 1).then(done);
    else if (!queued) close();
  };
  function flip(to) {
    if (reduceMotion.matches) { view = to; render(); return Promise.resolve(); }
    busy = true;
    const dir = to > view ? 1 : -1;
    const leaf = el("div", "leaf");
    const front = el("div", "leaf-face leaf-front"), back = el("div", "leaf-face leaf-back");
    let keyframes;
    if (dir > 0) {
      book.querySelector(".page-right").replaceChildren(face(to, "right"));
      front.append(face(view, "right")); back.append(face(to, "left"));
      leaf.classList.add("on-right");
      keyframes = [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }];
    } else {
      book.querySelector(".page-left").replaceChildren(face(to, "left"));
      front.append(face(view, "left")); back.append(face(to, "right"));
      leaf.classList.add("on-left");
      keyframes = [{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }];
    }
    const shift = (v) => (v === 0 ? -P / 2 : 0);
    if (shift(view) !== shift(to)) {
      bookWrap.animate([{ transform: `translateX(${shift(view)}px)` }, { transform: `translateX(${shift(to)}px)` }],
        { duration: FLIP_MS, easing: "cubic-bezier(.45, .05, .25, 1)", fill: "forwards" });
    }
    const shade = el("div", "leaf-shade");
    leaf.append(front, back, shade);
    book.append(leaf);
    const anim = leaf.animate(keyframes, { duration: FLIP_MS, easing: "cubic-bezier(.45, .05, .25, 1)", fill: "forwards" });
    shade.animate([{ opacity: 0 }, { opacity: 0.35 }, { opacity: 0 }], { duration: FLIP_MS });
    return anim.finished.then(() => {
      view = to;
      bookWrap.getAnimations().forEach((x) => x.cancel());
      render();
      preload(view + 1);
    });
  }
  function preload(v) {
    if (shots[v - 1]) { const im = new Image(); im.src = shots[v - 1]; }
  }
  let zs = 1, zx = 0, zy = 0;
  const touches = new Map();
  let pinch = null, moved = false, tapped = false;
  const showZoom = (smooth) => {
    zoomImg.style.transition = smooth ? "transform 200ms ease" : "none";
    zoomImg.style.transform = `translate(${zx}px, ${zy}px) scale(${zs})`;
  };
  function clampPan() {
    const r = zoomImg.getBoundingClientRect();
    const w = r.width / zs, hgt = r.height / zs;
    const mx = Math.max(0, (w * zs - w) / 2), my = Math.max(0, (hgt * zs - hgt) / 2);
    zx = Math.max(-mx, Math.min(mx, zx));
    zy = Math.max(-my, Math.min(my, zy));
  }
  function openZoom(i) {
    zoomImg.src = shots[i];
    zoomImg.alt = `Screenshot ${i + 1} of ${game.title}`;
    zs = 1; zx = 0; zy = 0; showZoom(false);
    zoom.hidden = false;
    if (!reduceMotion.matches) zoom.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    zoom.focus();
  }
  function closeZoom() {
    zoom.hidden = true;
    touches.clear(); pinch = null;
    (narrowScreen.matches ? closeBtn : nextBtn).focus({ preventScroll: true });
  }
  const spread = () => {
    const [a, b] = [...touches.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  zoom.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    try { zoom.setPointerCapture(e.pointerId); } catch {   }
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    if (touches.size === 1) moved = false;
    if (touches.size === 2) {
      const s = spread();
      pinch = { d: s.d, x: s.x, y: s.y, zs, zx, zy };
      moved = true;
    }
  });
  zoom.addEventListener("pointermove", (e) => {
    const t = touches.get(e.pointerId);
    if (!t) return;
    const lastX = t.x, lastY = t.y;
    t.x = e.clientX; t.y = e.clientY;
    if (Math.hypot(t.x - t.x0, t.y - t.y0) > 8) moved = true;
    if (touches.size >= 2 && pinch) {
      const s = spread();
      const r = zoom.getBoundingClientRect();
      const cx = pinch.x - (r.left + r.width / 2), cy = pinch.y - (r.top + r.height / 2);
      zs = Math.max(1, Math.min(4, pinch.zs * s.d / pinch.d));
      const k = zs / pinch.zs;
      zx = cx - (cx - pinch.zx) * k + (s.x - pinch.x);
      zy = cy - (cy - pinch.zy) * k + (s.y - pinch.y);
    } else if (touches.size === 1 && zs > 1) {
      zx += t.x - lastX; zy += t.y - lastY;
    } else return;
    clampPan();
    showZoom(false);
  });
  const lift = (e) => {
    if (!touches.delete(e.pointerId)) return;
    if (touches.size < 2) pinch = null;
    if (touches.size) return;
    if (zs < 1.02) { zs = 1; zx = 0; zy = 0; showZoom(true); }
    if (moved || e.type === "pointercancel") return;
    tapped = true;
    if (zs > 1) { zs = 1; zx = 0; zy = 0; showZoom(true); } else closeZoom();
  };
  zoom.addEventListener("pointerup", lift);
  zoom.addEventListener("pointercancel", lift);
  zoom.addEventListener("click", () => {
    if (tapped) { tapped = false; return; }
    closeZoom();
  });
  let dragged = false;
  book.addEventListener("click", (e) => {
    if (dragged || busy) return;
    if (view === 0) { request(forward); return; }
    const t = e.target.closest("[data-shot]");
    if (t) openZoom(Number(t.dataset.shot));
  });
  let start = null;
  reader.addEventListener("pointerdown", (e) => {
    if (!zoom.hidden || e.target.closest("button:not(.reader-zoom)")) return;
    start = { x: e.clientX, y: e.clientY }; dragged = false;
  });
  reader.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      dragged = true;
      setTimeout(() => { dragged = false; }, 0);
      request(dx < 0 ? forward : backward);
    }
  });
  reader.addEventListener("pointercancel", () => { start = null; });
  prevBtn.addEventListener("click", () => request(backward));
  nextBtn.addEventListener("click", () => request(forward));
  closeBtn.addEventListener("click", () => request(close));
  backdrop.addEventListener("click", () => { if (!dragged) request(close); });
  reader.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      if (!zoom.hidden) closeZoom(); else request(close);
      return;
    }
    if (!zoom.hidden) { if (e.key === "Tab") e.preventDefault(); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); request(forward); }
    if (e.key === "ArrowLeft") { e.preventDefault(); request(backward); }
    if (e.key === "Tab") {
      const f = [closeBtn, prevBtn, nextBtn].filter((b) => !b.disabled);
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  window.addEventListener("resize", () => {
    if (reader.hidden || busy) return;
    size(); render();
  });
  function flyFrom(target) {
    if (!from || reduceMotion.matches) return null;
    const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width || !b.width) return null;
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${a.width / b.width}, ${a.height / b.height})`;
  }
  function open(g, fromEl) {
    if (!g || !(g.screenshots || []).length || !reader.hidden) return false;
    game = g; shots = g.screenshots.slice(); from = fromEl; view = 0; pending = null;
    reader.style.setProperty("--game-color", getComputedStyle(fromEl || document.body).getPropertyValue("--game-color") || "#888");
    reader.hidden = false;
    document.getElementById("stage")?.setAttribute("inert", "");
    size();
    render();
    const startPose = flyFrom(book.querySelector(".page-right"));
    if (startPose) {
      busy = true;
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FLY_MS });
      book.animate([{ transform: startPose }, { transform: "none" }], { duration: FLY_MS, easing: "cubic-bezier(.2, .8, .2, 1)" })
        .finished.then(() => flip(1)).then(done);
    } else {
      flip(1).then(done);
    }
    preload(1); preload(2);
    (narrowScreen.matches ? closeBtn : nextBtn).focus({ preventScroll: true });
    return true;
  }
  function close() {
    if (reader.hidden) return;
    busy = true;
    pending = null;
    zoom.hidden = true;
    const finish = () => {
      reader.hidden = true;
      book.getAnimations().forEach((x) => x.cancel());
      backdrop.getAnimations().forEach((x) => x.cancel());
      book.style.transformOrigin = "";
      busy = false;
      document.getElementById("stage")?.removeAttribute("inert");
      if (from) from.focus({ preventScroll: true });
    };
    book.style.transformOrigin = "50% 50%";
    const endPose = flyFrom(book);
    if (!endPose) { finish(); return; }
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, fill: "forwards" });
    book.animate([{ transform: "none", opacity: 1 }, { transform: endPose, opacity: 0 }], { duration: 360, easing: "cubic-bezier(.4, 0, .6, 1)", fill: "forwards" })
      .finished.then(finish);
  }
  return { open, close, isOpen: () => !reader.hidden, available: () => true };
})();
