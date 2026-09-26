(() => {
  const OPTIONS = [["Purple", "purple"], ["Orange", "orange"], ["Avatar orange", "avatar"]];
  const KEY = "logo-colour";
  let saved = "purple";
  try { saved = localStorage.getItem(KEY) || saved; } catch {   }
  const panel = document.createElement("div");
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Logo colour (temporary)");
  panel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:50;display:flex;gap:6px;padding:8px;border-radius:10px;background:rgb(0 0 0 / .72);font:600 12px/1 system-ui,sans-serif";
  function use(colour) {
    document.documentElement.dataset.logo = colour;
    for (const b of panel.querySelectorAll("button")) {
      const on = b.dataset.colour === colour;
      b.setAttribute("aria-pressed", String(on));
      b.style.background = on ? "#fff" : "none";
      b.style.color = on ? "#000" : "#fff";
    }
    try { localStorage.setItem(KEY, colour); } catch {   }
    window.dispatchEvent(new Event("resize"));
  }
  for (const [label, colour] of OPTIONS) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.colour = colour;
    b.textContent = label;
    b.style.cssText = "padding:7px 10px;border:1px solid rgb(255 255 255 / .25);border-radius:6px;cursor:pointer;font:inherit";
    b.addEventListener("click", () => use(colour));
    panel.append(b);
  }
  document.body.append(panel);
  use(OPTIONS.some(([, c]) => c === saved) ? saved : "purple");
})();
