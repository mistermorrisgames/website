(() => {
  "use strict";
  const KEY = "crt";
  let on = false;
  try { on = localStorage.getItem(KEY) === "on"; } catch {   }
  const forced = new URLSearchParams(location.search).get("crt");
  if (forced === "on") on = true;
  if (forced === "off") on = false;
  const TV = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="1.75" y="4.25" width="12.5" height="9.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 1.5 8 4l2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const screen = document.createElement("div");
  screen.className = "crt";
  screen.setAttribute("aria-hidden", "true");
  screen.innerHTML = '<div class="crt-roll"></div><div class="crt-glass"></div><div class="crt-flash"></div>';
  const popover = "showPopover" in screen;
  if (popover) screen.popover = "manual";
  function raise() {
    if (!popover || !on) return;
    if (screen.matches(":popover-open")) screen.hidePopover();
    screen.showPopover();
  }
  const button = document.createElement("button");
  button.type = "button";
  button.className = "motion-toggle crt-toggle";
  button.innerHTML = TV;
  function show(animate) {
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Turn off the CRT effect" : "Turn on the CRT effect");
    button.title = on ? "CRT effect: on" : "CRT effect: off";
    document.documentElement.classList.toggle("crt-on", on);
    if (on) raise();
    const animated = animate && !Motion.matches;
    if (!on && !animated && popover && screen.matches(":popover-open")) screen.hidePopover();
    if (animated) power(on);
  }
  function power(turningOn) {
    const flash = screen.querySelector(".crt-flash");
    if (turningOn) {
      flash.animate([
        { opacity: 1, transform: "scale(1, .004)" },
        { opacity: .9, transform: "scale(1, .004)", offset: .3 },
        { opacity: 0, transform: "scale(1, 1)" }
      ], { duration: 420, easing: "ease-out" });
    } else {
      if (popover && !screen.matches(":popover-open")) screen.showPopover();
      screen.classList.add("is-off");
      flash.animate([
        { opacity: .9, transform: "scale(1, .004)" },
        { opacity: 1, transform: "scale(.002, .004)", offset: .6 },
        { opacity: 0, transform: "scale(0, 0)" }
      ], { duration: 360, easing: "ease-in" }).finished.then(() => {
        screen.classList.remove("is-off");
        if (!on && popover && screen.matches(":popover-open")) screen.hidePopover();
      });
    }
  }
  button.addEventListener("click", () => {
    on = !on;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {   }
    show(true);
  });
  function place() {
    document.body.append(screen);
    const pause = document.querySelector(".motion-toggle");
    if (pause) pause.after(button); else document.body.prepend(button);
    show(false);
    new MutationObserver(raise).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
  }
  if (document.body) place(); else document.addEventListener("DOMContentLoaded", place);
})();
