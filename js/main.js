/* Kestrel Air & Plumbing: interactions. Works on its own; js/motion.js adds animation on top
   and listens for the "kestrel:*" events dispatched here. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(`kestrel:${name}`, { detail }));

  /* ---------- header: condensed state on scroll ---------- */
  const header = $("[data-header]");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 24);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- services mega menu ---------- */
  $$(".has-mega").forEach((item) => {
    const btn = $("button", item);
    let closeTimer;
    const set = (open) => {
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    };
    btn.addEventListener("click", () => set(!item.classList.contains("is-open")));
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      item.addEventListener("mouseenter", () => { clearTimeout(closeTimer); set(true); });
      item.addEventListener("mouseleave", () => { closeTimer = setTimeout(() => set(false), 180); });
    }
    item.addEventListener("focusout", (e) => { if (!item.contains(e.relatedTarget)) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && item.classList.contains("is-open")) { set(false); btn.focus(); } });
    document.addEventListener("click", (e) => { if (!item.contains(e.target)) set(false); });
  });

  /* ---------- mobile menu ---------- */
  const toggle = $(".menu-toggle");
  const panel = $("#mobile-panel");
  if (toggle && panel) {
    const set = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      panel.hidden = !open;
      document.documentElement.style.overflow = open ? "hidden" : "";
      if (open) emit("menu", { panel });
    };
    toggle.addEventListener("click", () => set(panel.hidden));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { set(false); toggle.focus(); } });
    matchMedia("(min-width: 1101px)").addEventListener("change", (e) => { if (e.matches) set(false); });
  }

  /* ---------- hero: Heating / Cooling / Plumbing switch ---------- */
  const hero = $("[data-hero]");
  if (hero) {
    const tabs = $$("[data-mode-btn]", hero);
    const pill = $(".mode-pill", hero);
    const panelEl = $("#hero-panel", hero);
    const DIAL = {
      heating: { val: 70, pct: 70, label: "Heat restored", sub: "Set to 70°F · Furnace running" },
      cooling: { val: 72, pct: 58, label: "Cooling again", sub: "Set to 72°F · AC running" },
      plumbing: { val: 120, pct: 82, label: "Hot water back", sub: "Water heater at 120°F" },
    };
    const movePill = () => {
      const active = tabs.find((t) => t.getAttribute("aria-selected") === "true");
      if (!active || !pill) return;
      pill.style.setProperty("--pill-x", `${active.offsetLeft}px`);
      pill.style.setProperty("--pill-w", `${active.offsetWidth}px`);
    };
    const select = (mode, user) => {
      if (hero.dataset.mode === mode) return;
      const prev = hero.dataset.mode;
      hero.dataset.mode = mode;
      tabs.forEach((t) => {
        const on = t.dataset.modeBtn === mode;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        if (on) panelEl.setAttribute("aria-labelledby", t.id);
      });
      $$("[data-mode-copy]", hero).forEach((el) => { el.hidden = el.dataset.modeCopy !== mode; });
      $$("[data-mode-img]", hero).forEach((el) => el.classList.toggle("is-active", el.dataset.modeImg === mode));
      const d = DIAL[mode];
      const dial = $(".fc-thermo", hero);
      if (dial) {
        dial.style.setProperty("--dial", d.pct);
        $("[data-dial-label]", dial).textContent = d.label;
        $("[data-dial-sub]", dial).textContent = d.sub;
        if (reduceMotion || !window.__kestrelMotion) $("[data-dial]", dial).textContent = `${d.val}°`;
      }
      movePill();
      emit("mode", { mode, prev, dial: d, user });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => { stopAuto(); select(t.dataset.modeBtn, true); });
      t.addEventListener("keydown", (e) => {
        const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = tabs[(i + dir + tabs.length) % tabs.length];
        stopAuto();
        next.focus();
        select(next.dataset.modeBtn, true);
      });
    });
    movePill();
    addEventListener("resize", movePill);
    document.fonts && document.fonts.ready.then(movePill);

    // Gently cycle the modes until the visitor interacts with the hero.
    let auto = null;
    const order = tabs.map((t) => t.dataset.modeBtn);
    function stopAuto() { clearInterval(auto); auto = null; }
    if (!reduceMotion) {
      let visible = true;
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
      auto = setInterval(() => {
        if (!visible || document.hidden || hero.matches(":focus-within")) return;
        select(order[(order.indexOf(hero.dataset.mode) + 1) % order.length], false);
      }, 6500);
      hero.addEventListener("pointerdown", stopAuto, { once: true });
      hero.addEventListener("keydown", stopAuto, { once: true });
    }
  }

  /* ---------- ZIP code availability ---------- */
  const TOWNS = {
    43081: "Westerville", 43082: "Westerville", 43016: "Dublin", 43017: "Dublin", 43026: "Hilliard",
    43085: "Worthington", 43220: "Upper Arlington", 43221: "Upper Arlington", 43230: "Gahanna",
    43054: "New Albany", 43065: "Powell", 43123: "Grove City", 43068: "Reynoldsburg", 43015: "Delaware",
  };
  const fmt = (h) => `${((h + 11) % 12) + 1}:00${h < 12 ? " AM" : " PM"}`;
  const windowLabel = (h) => `${fmt(h).replace(/ (AM|PM)$/, (h < 12) === (h + 2 < 12) ? "" : " $1")} – ${fmt(h + 2)}`;
  function slotsFor(now = new Date()) {
    const starts = [8, 10, 12, 14, 16, 18];
    const today = starts.filter((h) => h >= now.getHours() + 1).slice(0, 2).map((h) => ({ day: "Today", key: `today-${h}`, h }));
    const tomorrow = starts.slice(0, 3 - Math.min(today.length, 2)).map((h) => ({ day: "Tomorrow", key: `tomorrow-${h}`, h }));
    return [...today, ...tomorrow].slice(0, 3);
  }
  $$("[data-zip]").forEach((form) => {
    const input = $("input", form);
    const out = $(".zip-result", form);
    input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 5); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const zip = input.value.trim();
      out.hidden = false;
      out.classList.remove("is-out");
      if (!/^\d{5}$/.test(zip)) {
        out.classList.add("is-out");
        out.innerHTML = `<p><svg aria-hidden="true"><use href="#i-pin"/></svg>Please enter a 5-digit ZIP code.</p>`;
        input.focus();
        emit("zip", { out });
        return;
      }
      const town = TOWNS[zip] || (zip.startsWith("432") ? "Columbus" : null);
      if (!town) {
        out.classList.add("is-out");
        out.innerHTML = `<p><svg aria-hidden="true"><use href="#i-pin"/></svg>${zip} is just outside our regular area. Call <a href="tel:+16145550142">(614) 555-0142</a> and we'll see what we can do.</p>`;
        emit("zip", { out });
        return;
      }
      const slots = slotsFor().map((s) =>
        `<li><a href="/book/?zip=${zip}&amp;slot=${s.key}"><span>${s.day}</span><strong>${windowLabel(s.h)}</strong></a></li>`).join("");
      out.innerHTML = `<p><svg aria-hidden="true"><use href="#i-check"/></svg><span>Great news, we serve <strong>${zip}</strong> (${town}). Next arrival windows:</span></p><ul class="slots">${slots}</ul>`;
      emit("zip", { out });
    });
  });

  /* ---------- services explorer (tabs) ---------- */
  $$("[data-explorer]").forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const show = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        $(`#${t.getAttribute("aria-controls")}`).hidden = !on;
      });
      if (focus) tab.focus({ preventScroll: true });
      // On narrow screens the tabs are one sideways-scrolling row: bring the chosen chip into view
      // horizontally only, so the row never drifts vertically and clips the chips.
      const list = tab.parentElement;
      list.scrollTop = 0;
      if (list.scrollWidth > list.clientWidth) {
        const delta = tab.getBoundingClientRect().left - list.getBoundingClientRect().left;
        list.scrollBy({ left: delta - (list.clientWidth - tab.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
      }
      emit("explorer", { panel: $(`#${tab.getAttribute("aria-controls")}`) });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => show(t));
      t.addEventListener("keydown", (e) => {
        const dir = ["ArrowDown", "ArrowRight"].includes(e.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(e.key) ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        show(tabs[(i + dir + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- Kestrel Club billing toggle ---------- */
  $$("[data-billing]").forEach((group) => {
    const section = group.closest("section");
    $$("button", group).forEach((btn) => btn.addEventListener("click", () => {
      const period = btn.dataset.period;
      $$("button", group).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      $$(".plan-price", section).forEach((price) => {
        const amt = $(".amt", price);
        const from = Number(amt.textContent);
        const to = Number(amt.dataset[period]);
        $(".per", price).textContent = $(".per", price).dataset[period];
        if (reduceMotion || !window.__kestrelMotion) amt.textContent = to;
        emit("price", { el: amt, from, to });
      });
    }));
  });

  /* ---------- financing calculator ---------- */
  $$("[data-calc]").forEach((calc) => {
    const range = $("[data-amount]", calc);
    const amountOut = $("[data-amount-out]", calc);
    const payOut = $("[data-pay]", calc);
    const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
    const update = () => {
      const amount = Number(range.value);
      const term = $('input[name="term"]:checked', calc);
      const n = Number(term.value);
      const r = Number(term.dataset.apr) / 1200;
      const pay = r ? (amount * r) / (1 - Math.pow(1 + r, -n)) : amount / n;
      range.style.setProperty("--pct", `${((amount - range.min) / (range.max - range.min)) * 100}%`);
      amountOut.textContent = money(amount);
      const prev = Number(payOut.dataset.value || pay);
      payOut.dataset.value = pay;
      if (reduceMotion || !window.__kestrelMotion) payOut.textContent = money(pay);
      emit("pay", { el: payOut, from: prev, to: pay });
    };
    range.addEventListener("input", update);
    $$('input[name="term"]', calc).forEach((r) => r.addEventListener("change", update));
    update();
  });

  /* ---------- review marquee: duplicate rows for a seamless loop ---------- */
  $$("[data-marquee]").forEach((m) => {
    if (reduceMotion) return;
    $$(".marquee-row", m).forEach((row) => {
      Array.from(row.children).forEach((li) => {
        const clone = li.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        row.append(clone);
      });
      row.style.setProperty("--dur", `${Math.round(row.scrollWidth / 55)}s`);
    });
    m.classList.add("is-running");
  });

  /* ---------- booking form (front-end demo only, nothing is sent) ---------- */
  const book = $("[data-book]");
  if (book) {
    const panels = $$(".book-panel", book);
    const steps = $$(".book-steps li", book);
    let current = 0;
    const params = new URLSearchParams(location.search);
    if (params.get("zip") && /^\d{5}$/.test(params.get("zip"))) $("#b-zip", book).value = params.get("zip");
    if (params.get("service")) {
      const pick = $(`input[name="service"][value="${CSS.escape(params.get("service"))}"]`, book);
      if (pick) pick.checked = true;
    }
    const slotSelect = $("#b-slot", book);
    slotsFor().concat([{ day: "Tomorrow", key: "tomorrow-14", h: 14 }, { day: "Tomorrow", key: "tomorrow-16", h: 16 }])
      .filter((s, i, a) => a.findIndex((x) => x.key === s.key) === i)
      .forEach((s) => slotSelect.add(new Option(`${s.day}, ${windowLabel(s.h)}`, s.key)));
    if (params.get("slot") && $(`option[value="${CSS.escape(params.get("slot"))}"]`, slotSelect)) slotSelect.value = params.get("slot");

    const go = (i) => {
      current = i;
      panels.forEach((p, n) => { p.hidden = n !== i; });
      steps.forEach((s, n) => {
        s.classList.toggle("is-done", n < i);
        s.classList.toggle("is-current", n === i);
        if (n === i) s.setAttribute("aria-current", "step"); else s.removeAttribute("aria-current");
      });
      const legend = $("legend", panels[i]);
      if (legend) { legend.tabIndex = -1; legend.focus({ preventScroll: true }); }
      book.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      emit("book", { panel: panels[i] });
    };
    const valid = (panel) => {
      const fields = $$("input, select, textarea", panel).filter((f) => f.required || f.pattern);
      for (const f of fields) {
        if (!f.checkValidity()) { f.reportValidity(); return false; }
      }
      return true;
    };
    $$("[data-next]", book).forEach((b) => b.addEventListener("click", () => { if (valid(panels[current])) go(current + 1); }));
    $$("[data-back]", book).forEach((b) => b.addEventListener("click", () => go(current - 1)));
    book.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!valid(panels[current])) return;
      const service = $('input[name="service"]:checked', book);
      $("[data-summary]", book).textContent =
        `${service ? service.dataset.label : "Service visit"} · ${slotSelect.options[slotSelect.selectedIndex].text}`;
      go(panels.length - 1);
    });
  }
})();
