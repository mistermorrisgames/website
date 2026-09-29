(() => {
  "use strict";
  for (const year of document.querySelectorAll("#copyright-year, .about-year")) year.textContent = String(new Date().getFullYear());
  const dialog = document.getElementById("about");
  const link = document.getElementById("about-link");
  const body = document.getElementById("about-body");
  if (!dialog || !link || !body) return;
  const site = window.SITE || {};
  const reduceMotion = window.Motion || { matches: false };
  const wear = window.Wear;
  if (wear) {
    const seed = wear.hash("About");
    dialog.querySelector(".about-cover").style.setProperty("--torn-edge", wear.tornEdge(seed, { ...wear.COVER_WEAR, binding: true }, true));
    dialog.querySelectorAll(".about-page").forEach((page, i) =>
      page.style.setProperty("--torn-edge", wear.tornEdge(seed + 1 + i, { ...wear.PAGE_WEAR, binding: true }, true)));
  }
  const ICONS = {
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/>',
    x: '<path fill="currentColor" transform="translate(2.4 2.6) scale(.8)" d="M23.95 4.57a10 10 0 0 1-2.82.77 4.96 4.96 0 0 0 2.16-2.72c-.95.56-2 .96-3.13 1.18a4.92 4.92 0 0 0-8.38 4.49A13.94 13.94 0 0 1 1.64 3.16a4.82 4.82 0 0 0-.67 2.48c0 1.71.87 3.21 2.19 4.1a4.9 4.9 0 0 1-2.23-.62v.06a4.92 4.92 0 0 0 3.95 4.83 5 5 0 0 1-2.21.08 4.94 4.94 0 0 0 4.6 3.42A9.87 9.87 0 0 1 0 19.54a14 14 0 0 0 7.56 2.21c9.05 0 14-7.5 14-13.98l-.01-.64A9.94 9.94 0 0 0 24 4.59z"/>',
    tiktok: '<path fill="currentColor" d="M13 3h3c.3 2.2 1.8 3.8 4 4v3.1c-1.5 0-2.8-.4-4-1.2v6.6a5.5 5.5 0 1 1-5.5-5.5c.2 0 .3 0 .5.1v3.2a2.4 2.4 0 1 0 2 2.3z"/>',
    facebook: '<path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.7v3h2.6V21z"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="currentColor"/><path d="M10 9v6l5.2-3z" fill="var(--about-cover, #f2e8d5)"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  function socialIcon(url) {
    const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
    const key = /instagram/.test(host) ? "instagram" : /twitter|(^|\.)x\.com/.test(host) ? "x"
      : /tiktok/.test(host) ? "tiktok" : /facebook/.test(host) ? "facebook"
      : /youtube|youtu\.be/.test(host) ? "youtube" : "link";
    return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${ICONS[key]}</svg>`;
  }
  const heading = document.getElementById("about-heading");
  if (site.aboutHeading) heading.textContent = site.aboutHeading; else heading.remove();
  for (const para of String(site.about || "").split(/\n\s*\n/)) {
    if (!para.trim()) continue;
    const p = document.createElement("p");
    p.textContent = para.trim();
    body.append(p);
  }
  const links = (site.aboutLinks || []).filter((l) => l && l.url && l.label);
  if (links.length) {
    const ul = document.createElement("ul");
    ul.className = "about-links";
    for (const l of links) {
      const a = Object.assign(document.createElement("a"), { href: l.url, className: "social-link", title: l.label });
      a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("aria-label", l.label);
      a.innerHTML = socialIcon(l.url);
      const li = document.createElement("li");
      li.append(a);
      ul.append(li);
    }
    body.append(ul);
  }
  let closing = false;
  function open() {
    if (dialog.open) return;
    closing = false;
    dialog.classList.remove("is-closing");
    dialog.showModal();
    if (!reduceMotion.matches) {
      dialog.animate([{ opacity: 0, transform: "translateY(18px) scale(.97)" }, { opacity: 1, transform: "none" }],
        { duration: 420, easing: "cubic-bezier(.34, 1.56, .64, 1)" });
    }
  }
  async function close() {
    if (!dialog.open || closing) return;
    closing = true;
    dialog.classList.add("is-closing");
    if (!reduceMotion.matches) {
      await dialog.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(10px) scale(.98)" }],
        { duration: 180, easing: "ease-in", fill: "forwards" }).finished;
    }
    dialog.close();
    dialog.getAnimations().forEach((a) => a.cancel());
    closing = false;
  }
  link.addEventListener("click", open);
  document.getElementById("about-close").addEventListener("click", close);
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
})();
