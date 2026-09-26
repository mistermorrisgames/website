window.Cartridge = (() => {
  "use strict";
  const reduceMotion = window.Motion;
  const drop = document.querySelector(".cart-drop");
  const cart = document.getElementById("case-cart");
  if (!drop || !cart) return { fill() {} };
  const span = (cls, text = "") => Object.assign(document.createElement("span"), { className: cls, textContent: text });
  function fill(g) {
    drop.classList.remove("is-flipped");
    const code = "MMG-" + (g.title.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "GAME");
    const back = span("cart-back");
    back.setAttribute("aria-hidden", "true");
    back.append(span("cart-back-logo"), span("cart-back-code", code));
    cart.append(back);
    drop.removeAttribute("aria-hidden");
    drop.setAttribute("role", "button");
    drop.setAttribute("tabindex", "0");
    drop.setAttribute("aria-label", `Flip the ${g.title} cartridge over`);
    drop.setAttribute("aria-pressed", "false");
  }
  const LIFT = -4;
  let turning = false;
  async function flip() {
    if (turning) return;
    const swap = () => {
      const flipped = drop.classList.toggle("is-flipped");
      drop.setAttribute("aria-pressed", String(flipped));
    };
    if (reduceMotion.matches) { swap(); return; }
    turning = true;
    const y = drop.matches(":hover") ? LIFT : 0;
    const at = (deg) => ({ transform: `translateY(${y}px) perspective(420px) rotateY(${deg}deg)` });
    const shadow = (from, to) => Array.from({ length: 7 }, (_, i) => {
      const deg = from + (to - from) * (i / 6);
      return { "--shadow-sx": Math.max(0.06, Math.cos(deg * Math.PI / 180)) };
    });
    const turn = (from, to, duration, easing) => Promise.all([
      cart.animate([at(from), at(to)], { duration, easing, fill: "forwards" }).finished,
      drop.animate(shadow(from, to), { duration, easing, fill: "forwards" }).finished
    ]);
    await turn(0, 90, 150, "ease-in");
    swap();
    await turn(-90, 0, 190, "ease-out");
    const end = drop.matches(":hover") ? LIFT : 0;
    if (end !== y) {
      await cart.animate([{ transform: `translateY(${y}px)` }, { transform: `translateY(${end}px)` }],
        { duration: 200, easing: "ease", fill: "forwards" }).finished;
    }
    [...cart.getAnimations(), ...drop.getAnimations()].forEach((a) => a.cancel());
    turning = false;
  }
  drop.addEventListener("pointerdown", (e) => e.stopPropagation());
  drop.addEventListener("click", (e) => { e.stopPropagation(); flip(); });
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
  });
  return { fill };
})();
