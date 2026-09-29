(() => {
  const img = document.getElementById("studio-name");
  const KEY = "logo-choice";
  let pick = { layout: "long", text: "white" };
  try { Object.assign(pick, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {   }
  const panel = document.createElement("div");
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Logo (temporary)");
  panel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:50;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px;border-radius:10px;background:rgb(0 0 0 / .72);font:600 12px/1 system-ui,sans-serif;color:#fff;max-width:calc(100vw - 24px)";
  const groups = [["layout", "Logo:", [["Long", "long"], ["Condensed", "stacked"]]], ["text", "Text:", [["White", "white"], ["Black", "black"]]]];
  function use() {
    const file = `images/wordmark${pick.layout === "stacked" ? "-stacked" : ""}${pick.text === "white" ? "-white" : ""}.svg`;
    img.src = file;
    img.classList.toggle("is-stacked", pick.layout === "stacked");
    [img.width, img.height] = pick.layout === "stacked" ? [164, 83] : [485, 26];
    for (const b of panel.querySelectorAll("button")) {
      const on = pick[b.dataset.k] === b.dataset.v;
      b.setAttribute("aria-pressed", String(on));
      b.style.background = on ? "#fff" : "none";
      b.style.color = on ? "#000" : "#fff";
    }
    try { localStorage.setItem(KEY, JSON.stringify(pick)); } catch {   }
    window.dispatchEvent(new Event("resize"));
  }
  for (const [k, label, options] of groups) {
    panel.append(Object.assign(document.createElement("span"), { textContent: label, style: "padding:0 4px;opacity:.7" }));
    for (const [text, v] of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.k = k;
      b.dataset.v = v;
      b.textContent = text;
      b.style.cssText = "padding:7px 10px;border:1px solid rgb(255 255 255 / .25);border-radius:6px;cursor:pointer;font:inherit";
      b.addEventListener("click", () => { pick[k] = v; use(); });
      panel.append(b);
    }
  }
  document.body.append(panel);
  use();
})();
