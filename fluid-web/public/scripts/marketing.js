/* ============================================================
   Fluid — Marketing Site interaction engine (wireframe v1)
   Vanilla JS. rAF scroll loop + IntersectionObservers.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  // window opacity helper: full in [a+f, b-f], fades at edges
  function winOpacity(p, a, b, f) {
    var i = clamp((p - a) / f, 0, 1);
    var o = clamp((b - p) / f, 0, 1);
    return Math.min(i, o);
  }

  /* -------------------------------------------------- cursor */
  var dot = document.querySelector(".cursor-dot");
  var ring = document.querySelector(".cursor-ring");
  if (dot && ring && !coarse && !reduce) {
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)"; });
    (function loop() { rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18); ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)"; requestAnimationFrame(loop); })();
    var hotSel = "a, button, input, [data-hot]";
    document.addEventListener("mouseover", function (e) { if (e.target.closest(hotSel)) ring.classList.add("is-hot"); });
    document.addEventListener("mouseout", function (e) { if (e.target.closest(hotSel)) ring.classList.remove("is-hot"); });
  }

  /* -------------------------------------------------- magnetic buttons */
  if (!coarse && !reduce) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      var strength = parseFloat(el.getAttribute("data-magnetic")) || 0.4;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * strength;
        var y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* -------------------------------------------------- nav + progress */
  var nav = document.querySelector(".nav");
  var bar = document.querySelector(".progress");
  var darkZones = [].slice.call(document.querySelectorAll("[data-dark]"));
  function navUpdate() {
    var y = scrollY;
    if (nav) nav.classList.toggle("is-stuck", y > 24);
    // dark detection: nav center line over a dark section?
    var navMid = 32, onDark = false;
    for (var i = 0; i < darkZones.length; i++) {
      var r = darkZones[i].getBoundingClientRect();
      if (r.top <= navMid && r.bottom >= navMid) { onDark = true; break; }
    }
    if (nav) nav.classList.toggle("on-dark", onDark);
  }
  function progUpdate() {
    var h = document.documentElement;
    var max = h.scrollHeight - innerHeight;
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? clamp(scrollY / max, 0, 1) : 0) + ")";
  }

  /* -------------------------------------------------- reveal observer */
  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("[data-reveal], .jstep, .board, .sec-head").forEach(function (el) { io.observe(el); });

  /* -------------------------------------------------- hero canvas — scroll-driven magnetic assembly */
  var heroSection = document.querySelector(".hero");
  var canvas = document.querySelector(".canvas");
  var frags = [].slice.call(document.querySelectorAll(".canvas .frag"));
  var pinnedMQ = window.matchMedia("(min-width: 941px) and (min-height: 701px)");
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  function updateHero() {
    if (!heroSection || reduce) return;
    var p;
    if (pinnedMQ.matches) {
      var rect = heroSection.getBoundingClientRect();
      var total = heroSection.offsetHeight - innerHeight;
      p = clamp(-rect.top / (total || 1), 0, 1);
    } else {
      // not pinned (narrow/short viewport): assemble across the first ~85% screen of scroll
      p = clamp(scrollY / (innerHeight * 0.85), 0, 1);
    }

    // the studio canvas materialises first (it is absent at the very top)
    var cm = smooth(clamp(p / 0.12, 0, 1));
    if (canvas) {
      canvas.style.opacity = cm.toFixed(3);
      canvas.style.transform = "scale(" + lerp(0.965, 1, cm).toFixed(4) + ")";
    }

    // each brand element is magnetically drawn into the canvas, one by one
    var aStart = 0.14, aEnd = 0.96, n = frags.length || 1;
    var span = (aEnd - aStart) / n, dur = span * 1.55;
    frags.forEach(function (f, i) {
      var t = clamp((p - (aStart + i * span)) / dur, 0, 1);
      var e = easeOutBack(t);
      var fx = parseFloat(f.dataset.fx) || 0, fy = parseFloat(f.dataset.fy) || 0;
      var fr = parseFloat(f.dataset.fr) || 0, fs = parseFloat(f.dataset.fs);
      if (isNaN(fs)) fs = 0.86;
      f.style.setProperty("--tx", (fx * (1 - e)).toFixed(2) + "px");
      f.style.setProperty("--ty", (fy * (1 - e)).toFixed(2) + "px");
      f.style.setProperty("--rot", (fr * (1 - e)).toFixed(2) + "deg");
      f.style.setProperty("--sc", lerp(fs, 1, e).toFixed(3));
      f.style.setProperty("--o", clamp(t * 1.8, 0, 1).toFixed(3));
    });
  }

  // cursor parallax layered on top of the scroll transform (via --cx/--cy)
  if (heroSection && frags.length && !coarse && !reduce) {
    heroSection.addEventListener("mousemove", function (e) {
      var r = heroSection.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      frags.forEach(function (f, idx) {
        var depth = (idx % 3 + 1) * 5;
        f.style.setProperty("--cx", (nx * depth).toFixed(2) + "px");
        f.style.setProperty("--cy", (ny * depth).toFixed(2) + "px");
      });
    });
    heroSection.addEventListener("mouseleave", function () {
      frags.forEach(function (f) { f.style.setProperty("--cx", "0px"); f.style.setProperty("--cy", "0px"); });
    });
  }

  /* -------------------------------------------------- BRAND-FLOW engine (scroll-driven, 6-chapter narrative) */
  var bfTrack = document.querySelector(".transform-track");
  var bfPin = document.querySelector(".transform .pin");
  var bfCanvas = document.querySelector(".transform .tf-canvas");
  var bfStep = {
    select: document.querySelector('.bf-step[data-step="select"]'),
    input: document.querySelector('.bf-step[data-step="input"]'),
    direction: document.querySelector('.bf-step[data-step="direction"]'),
    name: document.querySelector('.bf-step[data-step="name"]'),
    logo: document.querySelector('.bf-step[data-step="logo"]'),
    delivery: document.querySelector('.bf-step[data-step="delivery"]'),
    hero: document.querySelector('.bf-step[data-step="hero"]')
  };
  var bfCards = [].slice.call(document.querySelectorAll(".bf-services .svc"));
  var bfMain = document.querySelector(".svc-main");
  var bfOrb = document.querySelector(".bf-orb");
  var bfField = document.querySelector(".bf-field");
  var bfTyped = document.querySelector(".bf-typed");
  var bfNext = document.querySelector(".bf-next");
  var bfMoods = [].slice.call(document.querySelectorAll(".bf-moods .mood"));
  var bfMoodsTrack = document.querySelector(".bf-moods");
  var bfDir = document.querySelector(".bf-dir");
  var bfDirArrow = document.querySelector(".bf-dir-arrow");
  var bfDirLabel = document.querySelector(".bf-dir-label");
  var DIR_NAMES = ["Minimal", "Futuristic", "Playful", "Luxury", "Organic"];
  var bfNamesEl = document.querySelector(".bf-names");
  var bfNameTitle = document.querySelector('.bf-step[data-step="name"] .bf-steptitle');
  var bfLogoTitle = document.querySelector('.bf-step[data-step="logo"] .bf-steptitle');
  var bfNames = [].slice.call(document.querySelectorAll(".bf-names .bf-name"));
  var bfNameFinal = document.querySelector(".bf-name-final");
  var bfExploreEl = document.querySelector(".bf-logo-explore");
  var bfLx = [].slice.call(document.querySelectorAll(".bf-logo-explore .lx"));
  var bfLogoFinal = document.querySelector(".bf-logo-final");
  var bfKit = [].slice.call(document.querySelectorAll(".bf-kit .kc"));
  var bfHeroEls = [].slice.call(document.querySelectorAll(".bf-hero [data-h]"));
  var bfSegs = [].slice.call(document.querySelectorAll(".tf-progress .seg i"));
  var bfCaption = document.querySelector(".tf-caption");
  var bfCapEyebrow = document.querySelector(".tf-eyebrow");
  var bfCapTitle = document.querySelector(".tf-title");
  var bfCapDesc = document.querySelector(".tf-desc");
  var BF_CAPS = [
    ["01 · Choose a service", "Pick your scope.", "Start with complete branding, or just the piece you need — name, logo, graphics or guidelines."],
    ["02 · Your idea", "Describe the thing.", "One sentence about what you're building and who it's for. That's the whole brief — Fluid does the rest."],
    ["03 · Visual direction", "Set the mood.", "Pick a direction — minimal, futuristic, playful, luxury or organic. It steers every asset downstream."],
    ["04 · Name", "Name it.", "Generated name candidates, scored and rendered as wordmarks. The strongest one rises to the top."],
    ["05 · Logo", "Draw the mark.", "The chosen name becomes a logo mark with construction grid, clear-space and lockups."],
    ["06 · Brand system", "Lock the system.", "Logo, palette, type, app icon, wordmark and guidelines assemble into one exportable brand kit."]
  ];
  var bfCapCI = -1;
  var BF_TEXT = "A branding agency powered by AI agents";
  var CHOSEN_DIR = 4, CHOSEN_NAME = 5, DISMISS_NAME = [0, 2, 3];

  // ----- CH3 carousel offset (4 full cards + 1 peek; can advance one step) -----
  var DIR_VISIBLE = 4;
  var dirMaxStep = Math.max(0, bfMoods.length - DIR_VISIBLE);
  function dirStepPx() {
    var cs = getComputedStyle(bfDir);
    var cw = parseFloat(cs.getPropertyValue("--cw")) || 196;
    var cg = parseFloat(cs.getPropertyValue("--cg")) || 16;
    return cw + cg;
  }
  function applyDir(offset) {
    if (!bfMoodsTrack || !bfDir) return;
    offset = clamp(offset, 0, dirMaxStep);
    dirCurOffset = offset;
    bfMoodsTrack.style.setProperty("--dir-x", (-offset * dirStepPx()).toFixed(1) + "px");
    bfDir.classList.toggle("is-scrolled", offset > 0);
    bfDir.classList.toggle("at-end", offset >= dirMaxStep && dirMaxStep > 0);
    if (bfDirArrow) bfDirArrow.disabled = offset >= dirMaxStep;
  }
  var dirCurOffset = 0;
  if (bfDirArrow) bfDirArrow.addEventListener("click", function () { applyDir(dirCurOffset + 1); });

  // chapter ranges (global scroll progress)
  var CR = {
    select: [0.000, 0.115], input: [0.115, 0.235], direction: [0.235, 0.420],
    name: [0.420, 0.575], logo: [0.575, 0.760], delivery: [0.710, 0.905], hero: [0.905, 1.000]
  };

  function bfCenter(el, base) {
    var r = el.getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
  }
  function L(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function setOp(el, o) { if (el) el.style.opacity = clamp(o, 0, 1).toFixed(3); }
  function capLine(el, lp, d) {
    if (!el) return;
    var inT = smooth(clamp((lp - d) / 0.20, 0, 1));
    var outT = smooth(clamp((lp - 0.90) / 0.10, 0, 1));
    el.style.opacity = (inT * (1 - outT)).toFixed(3);
    el.style.transform = "translateY(" + ((1 - inT) * 18 - outT * 10).toFixed(1) + "px)";
  }
  function poly(t, pts) {
    if (!pts.length) return { x: 0, y: 0 };
    if (pts.length < 2) return pts[0];
    var seg = 1 / (pts.length - 1);
    var i = clamp(Math.floor(t / seg), 0, pts.length - 2);
    var lt = (t - i * seg) / seg;
    return { x: lerp(pts[i].x, pts[i + 1].x, lt), y: lerp(pts[i].y, pts[i + 1].y, lt) };
  }

  function updateTransform() {
    if (!bfTrack || !bfPin || !bfCanvas) return;
    var rect = bfTrack.getBoundingClientRect();
    var total = bfTrack.offsetHeight - innerHeight;
    var p = clamp(-rect.top / (total || 1), 0, 1);
    var base = bfCanvas.getBoundingClientRect();
    var f = 0.016, i;

    // ===== step visibility (overlapping crossfades) =====
    var vSel = winOpacity(p, -0.02, 0.115, f);
    var vIn = winOpacity(p, 0.115, 0.235, f);
    var vDir = winOpacity(p, 0.235, 0.420, f);
    var vName = winOpacity(p, 0.420, 0.575, f);
    var vLogo = winOpacity(p, 0.575, 0.760, f);
    var vDel = winOpacity(p, 0.710, 0.900, f);
    var vHero = smooth(L(p, 0.900, 0.932));
    setOp(bfStep.select, vSel); setOp(bfStep.input, vIn); setOp(bfStep.direction, vDir);
    setOp(bfStep.name, vName); setOp(bfStep.logo, vLogo); setOp(bfStep.delivery, vDel);
    setOp(bfStep.hero, vHero);

    // ===== CH1 · service cards =====
    if (vSel > 0.001) {
      var ls = L(p, CR.select[0], CR.select[1]);
      var focusMain = smooth(L(ls, 0.55, 0.80));
      bfCards.forEach(function (c, k) {
        var t = clamp((ls - k * 0.10) / 0.30, 0, 1);
        var e = easeOutBack(t);
        var o = clamp(t * 1.6, 0, 1);
        if (k > 0) o *= (1 - focusMain * 0.62);
        c.style.opacity = o.toFixed(3);
        c.style.setProperty("--rise", ((1 - e) * 26).toFixed(1) + "px");
        c.style.setProperty("--cs", lerp(0.95, 1, clamp(e, 0, 1)).toFixed(3));
      });
      if (bfMain) {
        bfMain.style.setProperty("--hot", smooth(L(ls, 0.5, 0.8)).toFixed(3));
        bfMain.classList.toggle("is-selected", ls > 0.8);
      }
    }

    // ===== CH2 · idea input =====
    if (vIn > 0.001) {
      var li = L(p, CR.input[0], CR.input[1]);
      var typeP = clamp(L(li, 0.15, 0.62), 0, 1);
      if (bfTyped) bfTyped.textContent = BF_TEXT.slice(0, Math.round(typeP * BF_TEXT.length));
      if (bfField) {
        bfField.classList.toggle("is-focus", li > 0.05 && li < 0.97);
        bfField.classList.toggle("is-typing", li > 0.08 && typeP < 1);
      }
      if (bfNext) {
        bfNext.style.setProperty("--hot", smooth(L(li, 0.72, 0.9)).toFixed(3));
        bfNext.classList.toggle("is-active", L(li, 0.9, 1.0) > 0.5);
      }
    }

    // ===== CH3 · visual direction =====
    if (vDir > 0.001) {
      var ld = L(p, CR.direction[0], CR.direction[1]);
      var reviewIdx = clamp(Math.floor(L(ld, 0.32, 0.6) * bfMoods.length), 0, bfMoods.length - 1);
      var settleD = smooth(L(ld, 0.6, 0.78));
      var expandD = smooth(L(ld, 0.78, 1.0));
      bfMoods.forEach(function (m, k) {
        var t = clamp((ld - k * 0.06) / 0.26, 0, 1);
        var e = easeOutBack(t);
        m.style.opacity = clamp(t * 1.6, 0, 1).toFixed(3);
        m.style.setProperty("--rise", ((1 - e) * 30).toFixed(1) + "px");
        var hot = settleD < 0.5 ? (k === reviewIdx) : (k === CHOSEN_DIR);
        m.classList.toggle("is-hot", hot && expandD < 0.4);
        if (expandD > 0.05) {
          m.classList.toggle("is-chosen", k === CHOSEN_DIR);
          m.classList.toggle("is-faded", k !== CHOSEN_DIR);
        } else {
          m.classList.remove("is-chosen"); m.classList.remove("is-faded");
        }
      });
      // slide carousel to follow the review, then settle on the chosen card
      var dirTarget = settleD < 0.5 ? clamp(reviewIdx - (DIR_VISIBLE - 1), 0, dirMaxStep)
                                    : clamp(CHOSEN_DIR - (DIR_VISIBLE - 1), 0, dirMaxStep);
      if (dirTarget !== dirCurOffset) applyDir(dirTarget);
      // label beneath the carousel
      if (bfDirLabel) {
        var labelIdx = settleD < 0.5 ? reviewIdx : CHOSEN_DIR;
        var valEl = bfDirLabel.querySelector(".val");
        if (valEl && valEl.textContent !== DIR_NAMES[labelIdx]) valEl.textContent = DIR_NAMES[labelIdx];
        bfDirLabel.classList.toggle("is-locked", settleD >= 0.5);
      }
    }

    // ===== CH4 · name creation =====
    if (vName > 0.001) {
      var ln = L(p, CR.name[0], CR.name[1]);
      var reviewN = clamp(Math.floor(L(ln, 0.4, 0.62) * bfNames.length), 0, bfNames.length - 1);
      var decideN = smooth(L(ln, 0.62, 0.8));
      var crownN = smooth(L(ln, 0.8, 1.0));
      bfNames.forEach(function (nm, k) {
        var t = clamp((ln - k * 0.06) / 0.22, 0, 1);
        nm.style.opacity = clamp(t * 1.6, 0, 1).toFixed(3);
        nm.style.setProperty("--rise", ((1 - easeOutBack(t)) * 18).toFixed(1) + "px");
        nm.classList.toggle("is-dismissed", DISMISS_NAME.indexOf(k) >= 0 && ln > 0.46 + k * 0.012);
        nm.classList.toggle("is-review", decideN < 0.35 && k === reviewN && DISMISS_NAME.indexOf(k) < 0);
        nm.classList.toggle("is-win", k === CHOSEN_NAME && decideN > 0.4);
      });
      if (bfNamesEl) bfNamesEl.style.opacity = (1 - crownN).toFixed(3);
      if (bfNameTitle) bfNameTitle.style.opacity = (1 - crownN).toFixed(3);
      if (bfNameFinal) {
        bfNameFinal.style.opacity = crownN.toFixed(3);
        bfNameFinal.style.transform = "scale(" + lerp(0.92, 1, crownN).toFixed(3) + ")";
      }
    }

    // ===== CH5 · logo creation =====
    if (vLogo > 0.001) {
      var lg = L(p, CR.logo[0], CR.logo[1]);
      var testIdx = clamp(Math.floor(L(lg, 0.32, 0.55) * bfLx.length), 0, bfLx.length - 1);
      var convergeG = smooth(L(lg, 0.52, 0.72));
      var revealG = 0;
      bfLx.forEach(function (tile, k) {
        var t = clamp((lg - k * 0.06) / 0.24, 0, 1);
        tile.style.opacity = (clamp(t * 1.6, 0, 1) * (1 - convergeG)).toFixed(3);
        tile.style.setProperty("--rise", ((1 - easeOutBack(t)) * 26).toFixed(1) + "px");
        tile.classList.toggle("is-test", convergeG < 0.3 && k === testIdx);
      });
      if (bfExploreEl) bfExploreEl.style.opacity = (1 - revealG).toFixed(3);
      if (bfLogoTitle) bfLogoTitle.style.opacity = (1 - revealG).toFixed(3);
      if (bfLogoFinal) {
        bfLogoFinal.style.opacity = revealG.toFixed(3);
        bfLogoFinal.classList.toggle("show", revealG > 0.05);
      }
    }

    // ===== CH6 · brand delivery =====
    if (vDel > 0.001) {
      var ldv = L(p, CR.delivery[0], CR.delivery[1]);
      bfKit.forEach(function (kc, k) {
        var t = clamp((ldv - k * 0.085) / 0.34, 0, 1);
        var e = smooth(t);
        kc.style.opacity = e.toFixed(3);
        kc.style.transform = "translateY(" + ((1 - e) * 34).toFixed(1) + "px) scale(" + lerp(0.92, 1, e).toFixed(3) + ")";
      });
    }

    // ===== FINAL · hero =====
    if (vHero > 0.001) {
      var lh = L(p, CR.hero[0], CR.hero[1]);
      bfHeroEls.forEach(function (h, k) {
        var t = clamp((lh - k * 0.10) / 0.40, 0, 1);
        var e = smooth(t);
        h.style.opacity = e.toFixed(3);
        h.style.transform = "translateY(" + ((1 - e) * 28).toFixed(1) + "px)";
      });
    }

    // ===== orb ownership (one chapter at a time) =====
    var orb = { x: base.width * 0.5, y: base.height * 0.5, s: 1, o: 0, pulse: 0 };
    if (p < CR.select[1]) {
      // ch1 -> main card + select
      var s1 = L(p, CR.select[0], CR.select[1]);
      var travel1 = smooth(L(s1, 0.5, 0.8));
      var selPulse = smooth(L(s1, 0.8, 0.95));
      var mainC = bfMain ? bfCenter(bfMain, base) : { x: base.width * 0.34, y: base.height * 0.5 };
      orb.x = lerp(base.width * 0.86, mainC.x, travel1);
      orb.y = lerp(base.height * 1.04, mainC.y, travel1);
      orb.o = smooth(L(s1, 0.42, 0.5)) * (1 - smooth(L(s1, 0.93, 1)));
      orb.s = 1 - Math.sin(selPulse * Math.PI) * 0.22;
      orb.pulse = selPulse;
    } else if (p < CR.input[1]) {
      // ch2 -> Next button + activate
      var s2 = L(p, CR.input[0], CR.input[1]);
      if (s2 > 0.64) {
        var travel2 = smooth(L(s2, 0.72, 0.9));
        var clickPulse = smooth(L(s2, 0.9, 1.0));
        var fieldC = bfField ? bfCenter(bfField, base) : { x: base.width * 0.5, y: base.height * 0.42 };
        var nextC = bfNext ? bfCenter(bfNext, base) : { x: base.width * 0.7, y: base.height * 0.66 };
        orb.x = lerp(fieldC.x, nextC.x, travel2);
        orb.y = lerp(fieldC.y, nextC.y, travel2);
        orb.o = smooth(L(s2, 0.64, 0.72));
        orb.s = 1 - Math.sin(clickPulse * Math.PI) * 0.22;
        orb.pulse = clickPulse;
      }
    } else if (p < CR.direction[1] && bfMoods.length) {
      // ch3 -> review moodboards + select
      var d = L(p, CR.direction[0], CR.direction[1]);
      var ptsD = bfMoods.map(function (m) { return bfCenter(m, base); });
      var settleD2 = smooth(L(d, 0.6, 0.74));
      var pos = settleD2 <= 0 ? poly(L(d, 0.3, 0.62), ptsD)
        : (function () { var cc = bfCenter(bfMoods[CHOSEN_DIR], base); var rp = poly(1, ptsD); return { x: lerp(rp.x, cc.x, settleD2), y: lerp(rp.y, cc.y, settleD2) }; })();
      orb.x = pos.x; orb.y = pos.y;
      orb.o = smooth(L(d, 0.2, 0.3)) * (1 - smooth(L(d, 0.8, 0.9)));
      var clkD = smooth(L(d, 0.66, 0.78));
      orb.s = 1 - Math.sin(clkD * Math.PI) * 0.2;
      orb.pulse = clkD;
    } else if (p < CR.name[1] && bfNames.length) {
      // ch4 -> scan names + select winner
      var n = L(p, CR.name[0], CR.name[1]);
      var ptsN = bfNames.map(function (nm) { return bfCenter(nm, base); });
      var settleN = smooth(L(n, 0.6, 0.74));
      var posN = settleN <= 0 ? poly(L(n, 0.38, 0.62), ptsN)
        : (function () { var cc = bfCenter(bfNames[CHOSEN_NAME], base); var rp = poly(1, ptsN); return { x: lerp(rp.x, cc.x, settleN), y: lerp(rp.y, cc.y, settleN) }; })();
      orb.x = posN.x; orb.y = posN.y;
      orb.o = smooth(L(n, 0.3, 0.4)) * (1 - smooth(L(n, 0.76, 0.85)));
      var clkN = smooth(L(n, 0.64, 0.78));
      orb.s = 1 - Math.sin(clkN * Math.PI) * 0.2;
      orb.pulse = clkN;
    } else if (p < CR.logo[1] && bfLx.length) {
      // ch5 -> review logo explorations
      var g = L(p, CR.logo[0], CR.logo[1]);
      var ptsG = bfLx.map(function (t) { return bfCenter(t, base); });
      var posG = poly(L(g, 0.3, 0.55), ptsG);
      orb.x = posG.x; orb.y = posG.y;
      orb.o = smooth(L(g, 0.2, 0.3)) * (1 - smooth(L(g, 0.55, 0.64)));
      orb.pulse = 0;
    }
    if (bfOrb) {
      bfOrb.style.opacity = Math.sin(clamp(orb.pulse, 0, 1) * Math.PI).toFixed(3);
      bfOrb.style.transform = "translate(" + orb.x.toFixed(1) + "px," + orb.y.toFixed(1) + "px) translate(-50%,-50%) scale(" + orb.s.toFixed(3) + ")";
      bfOrb.classList.toggle("is-armed", orb.pulse > 0.02);
      bfOrb.style.setProperty("--pscale", lerp(0.55, 2.5, orb.pulse).toFixed(3));
      bfOrb.style.setProperty("--po", Math.sin(clamp(orb.pulse, 0, 1) * Math.PI).toFixed(3));
    }

    // ===== progress + label =====
    var bounds = [0, 0.115, 0.235, 0.420, 0.575, 0.710, 1.001];
    for (i = 0; i < 6; i++) {
      if (bfSegs[i]) bfSegs[i].style.transform = "scaleX(" + L(p, bounds[i], bounds[i + 1]).toFixed(3) + ")";
    }
    var ci = 0;
    for (i = 0; i < 6; i++) { if (p >= bounds[i]) ci = i; }
    // caption: swap copy at chapter boundary (while lines are hidden), animate lines in sync with the visual
    if (bfCaption) {
      if (ci !== bfCapCI) {
        bfCapCI = ci;
        var cap = BF_CAPS[ci];
        if (bfCapEyebrow) bfCapEyebrow.textContent = cap[0];
        if (bfCapTitle) bfCapTitle.textContent = cap[1];
        if (bfCapDesc) bfCapDesc.textContent = cap[2];
      }
      var lp = L(p, bounds[ci], bounds[ci + 1]);
      capLine(bfCapEyebrow, lp, 0.00);
      capLine(bfCapTitle, lp, 0.05);
      capLine(bfCapDesc, lp, 0.10);
    }
  }

  /* -------------------------------------------------- journey line */
  var jSteps = document.querySelector(".journey-steps");
  var jLine = document.querySelector(".journey-line i");
  function updateJourney() {
    if (!jSteps || !jLine) return;
    var r = jSteps.getBoundingClientRect();
    var start = innerHeight * 0.7, end = innerHeight * 0.3;
    var p = clamp((start - r.top) / (r.height - (end - 0) + (start - end)), 0, 1);
    // simpler progress: based on how much of section has passed mid-viewport
    var passed = clamp((innerHeight * 0.55 - r.top) / r.height, 0, 1);
    jLine.style.transform = "scaleY(" + passed + ")";
  }

  /* -------------------------------------------------- final ribbon */
  var ribbonPath = document.querySelector(".final .ribbon-bg path");
  if (ribbonPath) {
    var len = ribbonPath.getTotalLength();
    ribbonPath.style.strokeDasharray = len;
    ribbonPath.style.strokeDashoffset = len;
    var fio = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !reduce) {
        ribbonPath.style.transition = "stroke-dashoffset 2.4s cubic-bezier(0.22,0.61,0.36,1)";
        ribbonPath.style.strokeDashoffset = "0";
        fio.disconnect();
      } else if (e[0].isIntersecting) { ribbonPath.style.strokeDashoffset = "0"; fio.disconnect(); }
    }, { threshold: 0.3 });
    fio.observe(document.querySelector(".final"));
  }

  /* -------------------------------------------------- (hero canvas is scroll-driven, see updateHero) */

  /* -------------------------------------------------- main rAF loop */
  var ticking = false;
  function frame() {
    navUpdate(); progUpdate(); updateHero(); updateTransform(); updateJourney();
    ticking = false;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  /* -------------------------------------------------- page load reveal */
  function init() {
    document.body.classList.add("loaded");
    frame();
    // hero entrance
    document.querySelectorAll(".hero [data-reveal]").forEach(function (el, i) { el.style.setProperty("--d", (i * 90) + "ms"); el.classList.add("in"); });
  }
  if (document.readyState === "complete") init();
  else addEventListener("load", init);
  // fire frame a touch after fonts settle
  setTimeout(frame, 400);
})();
