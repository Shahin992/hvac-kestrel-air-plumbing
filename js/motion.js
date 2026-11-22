/* Kestrel Air & Plumbing: animation layer built on Motion (the vanilla-JS edition of Framer Motion).
   Smooth and confident: 0.45-0.8s, long ease-out, no bounce. Initial states are only applied here,
   so with reduced motion or no JS every element is already visible and static. */
import { animate, scroll, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@14.3.0/+esm";

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const EASE = [0.16, 1, 0.3, 1];
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

function start() {
  if (reduceMotion) { root.classList.remove("m-pending"); return; }
  window.__kestrelMotion = true;
  try {
    splitTitles();
    intro();
    reveals();
    counters();
    timeline();
    parallax();
    mapDraw();
    magnetic();
    floatCards();
    events();
  } finally {
    root.classList.remove("m-pending");
  }
}

/* ---------- headings split into words that rise behind a mask (text stays in the DOM) ---------- */
function splitTitles() {
  $$(".hero-title, .mast-title").forEach((h) => wrapWords(h));
}
function wrapWords(node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === 3) {
      const frag = document.createDocumentFragment();
      child.textContent.split(/( +)/).forEach((part) => {
        if (!part) return;
        if (/^ +$/.test(part)) { frag.append(" "); return; }
        const outer = document.createElement("span");
        outer.className = "w";
        const inner = document.createElement("span");
        inner.textContent = part;
        outer.append(inner);
        frag.append(outer);
      });
      child.replaceWith(frag);
    } else if (child.nodeType === 1) {
      wrapWords(child);
    }
  });
}
const words = (el) => (el ? $$(".w > span", el) : []);

/* ---------- first paint ---------- */
function intro() {
  const hero = $(".hero");
  const mast = $(".mast");
  if (hero) {
    animate(words($(".hero-title", hero)), { y: ["105%", "0%"] }, { duration: 0.9, delay: stagger(0.035, { startDelay: 0.15 }), ease: EASE });
    animate($$("[data-rise], .hero-panel", hero), { opacity: [0, 1], y: [18, 0] }, { duration: 0.8, delay: stagger(0.08, { startDelay: 0.1 }), ease: EASE });
    animate($(".hero-frame", hero), { opacity: [0, 1], clipPath: ["inset(8% 8% 8% 8% round 28px)", "inset(0% 0% 0% 0% round 28px)"] }, { duration: 1.2, delay: 0.15, ease: EASE });
    animate($$(".float-card", hero), { opacity: [0, 1], y: [24, 0], scale: [0.94, 1] }, { duration: 0.8, delay: stagger(0.14, { startDelay: 0.7 }), ease: EASE });
    animate($(".fc-progress span", hero), { width: ["8%", "64%"] }, { duration: 1.6, delay: 1.1, ease: EASE });
  }
  if (mast) {
    animate(words($(".mast-title", mast)), { y: ["105%", "0%"] }, { duration: 0.85, delay: stagger(0.03, { startDelay: 0.1 }), ease: EASE });
    animate($$("[data-rise]", mast), { opacity: [0, 1], y: [16, 0] }, { duration: 0.75, delay: stagger(0.07, { startDelay: 0.05 }), ease: EASE });
    const img = $(".mast-media img", mast);
    if (img) animate(img, { scale: [1.12, 1.04], opacity: [0, 1] }, { duration: 1.6, ease: EASE });
  }
}

/* ---------- blocks that rise into place as they scroll into view ---------- */
const BLOCKS = [
  ".section-head > *", ".trust-row li", ".intro-photo", ".intro-badge", ".intro-copy > p", ".stats > div",
  ".explorer-list", ".explorer-panels", ".seal", ".promise-list li", ".steps li", ".billing", ".plan", ".feature-list li",
  ".financing-copy > .lede", ".calc", ".rating-card", ".area-copy > *", ".map-card", ".person", ".post-card",
  ".faq-side > *", ".faq-list details", ".closing-inner > div", ".card", ".price-row", ".town-card", ".split > *",
  ".in-short", ".cta-strip", ".compare", ".prose > *", ".toc", ".aside-cta", ".book-card", ".side-card",
  ".rating-summary", ".review-grid .review-card", ".fine-print", ".zip-card", ".price-note",
].join(",");

function reveals() {
  const fold = innerHeight * 0.92;
  const groups = new Map();
  $$(BLOCKS).forEach((el) => {
    if (el.closest(".hero, .mast, .mega, .mobile-panel")) return;
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    groups.set(parent, i + 1);
    const delay = Math.min(i, 6) * 0.07;
    if (el.getBoundingClientRect().top < fold) {
      animate(el, { opacity: [0, 1], y: [22, 0] }, { duration: 0.8, delay: 0.25 + delay, ease: EASE });
      return;
    }
    el.style.opacity = "0";
    el.style.transform = "translateY(28px)";
    inView(el, () => {
      animate(el, { opacity: 1, y: [28, 0] }, { duration: 0.8, delay, ease: EASE });
    }, { amount: 0.12 });
  });
}

/* ---------- numbers ---------- */
function formatNum(el, v) {
  const d = Number(el.dataset.decimals || 0);
  const s = d ? v.toFixed(d) : Math.round(v).toString();
  return el.dataset.format === "comma" ? Number(s).toLocaleString("en-US") : s;
}
function counters() {
  $$("[data-count]").forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = formatNum(el, 0);
    inView(el, () => {
      animate(0, to, { duration: 1.8, ease: EASE, onUpdate: (v) => { el.textContent = formatNum(el, v); } });
    }, { amount: 0.6 });
  });
}
function tween(el, from, to, fmt, duration = 0.6) {
  if (el._tween) el._tween.stop();
  el._tween = animate(from, to, { duration, ease: EASE, onUpdate: (v) => { el.textContent = fmt(v); } });
}

/* ---------- process line draws with scroll ---------- */
function timeline() {
  $$("[data-timeline]").forEach((t) => {
    const line = $(".timeline-line", t);
    scroll((p) => line.style.setProperty("--progress", Math.min(1, Math.max(0, p)).toFixed(3)), { target: t, offset: ["start 80%", "end 55%"] });
  });
}

/* ---------- photo parallax on mastheads and the closing band ---------- */
function parallax() {
  $$(".closing").forEach((sec) => {
    const img = $(".closing-media img", sec);
    if (img) scroll(animate(img, { y: ["-6%", "6%"], scale: [1.14, 1.14] }, { ease: "linear" }), { target: sec, offset: ["start end", "end start"] });
  });
  $$(".mast").forEach((sec) => {
    const media = $(".mast-media", sec);
    if (media) scroll(animate(media, { y: ["0%", "12%"] }, { ease: "linear" }), { target: sec, offset: ["start start", "end start"] });
  });
}

/* ---------- service-area map: roads draw in, towns pop up ---------- */
function mapDraw() {
  $$(".map").forEach((map) => {
    const lines = $$(".map-river, .map-road:not(.map-road--minor)", map);
    const towns = $$(".town", map);
    lines.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    towns.forEach((t) => { t.style.opacity = "0"; });
    inView(map, () => {
      lines.forEach((p, i) => animate(p, { strokeDashoffset: 0 }, { duration: 1.6, delay: i * 0.15, ease: EASE }));
      animate(towns, { opacity: [0, 1], y: [8, 0] }, { duration: 0.6, delay: stagger(0.06, { startDelay: 0.5 }), ease: EASE });
    }, { amount: 0.35 });
  });
}

/* ---------- soft magnetic pull on primary buttons ---------- */
function magnetic() {
  if (!fine) return;
  $$("[data-magnetic]").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.18;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
      animate(btn, { x, y }, { duration: 0.4, ease: EASE });
    });
    btn.addEventListener("pointerleave", () => animate(btn, { x: 0, y: 0 }, { duration: 0.7, ease: EASE }));
  });
}

/* ---------- hero cards drift gently ---------- */
function floatCards() {
  $$(".hero .float-card").forEach((card, i) => {
    setTimeout(() => {
      animate(card, { y: [0, i % 2 ? 7 : -7] }, { duration: 3.2 + i * 0.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" });
    }, 1700 + i * 200);
  });
}

/* ---------- react to the interactions in main.js ---------- */
function events() {
  document.addEventListener("kestrel:mode", (e) => {
    const { mode, dial } = e.detail;
    const hero = $(".hero");
    const copy = $(`[data-mode-copy="${mode}"]`, hero);
    animate($$(".hero-lede, .hero-chips li", copy), { opacity: [0, 1], y: [10, 0] }, { duration: 0.55, delay: stagger(0.04), ease: EASE });
    const val = $("[data-dial]", hero);
    if (val) tween(val, parseInt(val.textContent, 10) || 0, dial.val, (v) => `${Math.round(v)}°`, 0.9);
    animate($$(".fc-thermo, .fc-tech", hero), { scale: [0.96, 1] }, { duration: 0.6, ease: EASE });
  });
  document.addEventListener("kestrel:explorer", (e) => {
    const panel = e.detail.panel;
    animate($(".xp-media img", panel), { scale: [1.08, 1], opacity: [0.4, 1] }, { duration: 0.9, ease: EASE });
    animate($$(".xp-body > *", panel), { opacity: [0, 1], y: [14, 0] }, { duration: 0.6, delay: stagger(0.05), ease: EASE });
  });
  document.addEventListener("kestrel:price", (e) => {
    const { el, from, to } = e.detail;
    tween(el, from, to, (v) => Math.round(v).toString(), 0.7);
    animate(el, { y: [-6, 0] }, { duration: 0.5, ease: EASE });
  });
  document.addEventListener("kestrel:pay", (e) => {
    const { el, from, to } = e.detail;
    tween(el, from, to, (v) => `$${Math.round(v).toLocaleString("en-US")}`, 0.45);
  });
  document.addEventListener("kestrel:zip", (e) => {
    animate($$("p, .slots li", e.detail.out), { opacity: [0, 1], y: [8, 0] }, { duration: 0.5, delay: stagger(0.06), ease: EASE });
  });
  document.addEventListener("kestrel:menu", (e) => {
    animate($$(".mp-nav > *, .mp-cta > *", e.detail.panel), { opacity: [0, 1], x: [-14, 0] }, { duration: 0.5, delay: stagger(0.035), ease: EASE });
  });
  document.addEventListener("kestrel:book", (e) => {
    animate(e.detail.panel, { opacity: [0, 1], x: [18, 0] }, { duration: 0.55, ease: EASE });
  });
}

start();
