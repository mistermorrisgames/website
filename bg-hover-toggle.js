(() => {
  const OPTIONS = [["Smoke", "smoke"], ["Grid", "grid"], ["Both", "both"], ["Neither", "neither"]];
  const KEY = "hover-bg";
  let saved = "both";
  try { saved = localStorage.getItem(KEY) || saved; } catch {   }
  const panel = document.createElement("div");
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Background on hover (temporary)");
  panel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:50;display:flex;align-items:center;gap:6px;padding:8px;border-radius:10px;background:rgb(0 0 0 / .72);font:600 12px/1 system-ui,sans-serif;color:#fff";
  panel.append(Object.assign(document.createElement("span"), { textContent: "On hover:", style: "padding:0 4px;opacity:.7" }));
  function use(v) {
    document.documentElement.dataset.hoverBg = v;
    for (const b of panel.querySelectorAll("button")) {
      const on = b.dataset.v === v;
      b.setAttribute("aria-pressed", String(on));
      b.style.background = on ? "#fff" : "none";
      b.style.color = on ? "#000" : "#fff";
    }
    try { localStorage.setItem(KEY, v); } catch {   }
  }
  for (const [label, v] of OPTIONS) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.v = v;
    b.textContent = label;
    b.style.cssText = "padding:7px 10px;border:1px solid rgb(255 255 255 / .25);border-radius:6px;cursor:pointer;font:inherit";
    b.addEventListener("click", () => use(v));
    panel.append(b);
  }
  document.body.append(panel);
  use(OPTIONS.some(([, v]) => v === saved) ? saved : "both");
})();
