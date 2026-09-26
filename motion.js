window.Motion = (() => {
  "use strict";
  const KEY = "motion";
  let on = true;
  try { if (localStorage.getItem(KEY) === "off") on = false; } catch {   }
  const forced = new URLSearchParams(location.search).get("motion");
  if (forced === "on") on = true;
  if (forced === "off") on = false;
  const listeners = new Set();
  const PAUSE = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const PLAY = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M5.5 3.5v9l7-4.5z" fill="currentColor"/></svg>';
  const button = document.createElement("button");
  button.type = "button";
  button.className = "motion-toggle";
  function show() {
    button.innerHTML = on ? PAUSE : PLAY;
    button.setAttribute("aria-label", on ? "Pause animations" : "Play animations");
    button.title = on ? "Pause animations" : "Play animations";
    document.documentElement.classList.toggle("motion-off", !on);
  }
  button.addEventListener("click", () => {
    on = !on;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {   }
    show();
    for (const fn of listeners) fn(on);
  });
  show();
  const place = () => document.body.prepend(button);
  if (document.body) place(); else document.addEventListener("DOMContentLoaded", place);
  return {
    get matches() { return !on; },
    get on() { return on; },
    onChange(fn) { listeners.add(fn); }
  };
})();
