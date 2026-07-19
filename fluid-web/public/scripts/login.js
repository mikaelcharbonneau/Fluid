(function () {
  "use strict";
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* custom cursor — matches the marketing site */
  var dot = document.querySelector(".cursor-dot");
  var ring = document.querySelector(".cursor-ring");
  if (dot && ring && !coarse && !reduce) {
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
    });
    (function loop() {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();
    var hot = "a, button, input, [data-hot]";
    document.addEventListener("mouseover", function (e) { if (e.target.closest(hot)) ring.classList.add("is-hot"); });
    document.addEventListener("mouseout", function (e) { if (e.target.closest(hot)) ring.classList.remove("is-hot"); });
  }

  /* magnetic buttons */
  if (!coarse && !reduce) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      var strength = parseFloat(el.getAttribute("data-magnetic")) || 0.3;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * strength + "px," + (e.clientY - r.top - r.height / 2) * strength + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* password reveal */
  var tog = document.querySelector("[data-pw-toggle]");
  var pw = document.getElementById("li-pw");
  if (tog && pw) {
    tog.addEventListener("click", function () {
      var show = pw.type === "password";
      pw.type = show ? "text" : "password";
      tog.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  }

  /* ---- inline error + toast helpers (styled by auth.css) ---- */
  function showError(msg) {
    var el = document.getElementById("auth-error");
    if (!el) {
      el = document.createElement("p");
      el.id = "auth-error";
      el.className = "auth-error";
      var fields = document.querySelector(".auth-fields");
      if (fields) fields.parentNode.insertBefore(el, fields.nextSibling);
    }
    el.textContent = msg;
  }
  function clearError() {
    var el = document.getElementById("auth-error");
    if (el) el.textContent = "";
  }
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "auth-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 260);
    }, 2200);
  }

  /* ---- real login against Supabase via the auth route handler ---- */
  var form = document.querySelector(".auth-fields");
  var submitBtn = form && form.querySelector('button[type="submit"]');

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      var email = (document.getElementById("li-email") || {}).value || "";
      var password = (document.getElementById("li-pw") || {}).value || "";
      if (submitBtn) submitBtn.disabled = true;

      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok) { window.location.assign("/app#home"); return; }
          showError((res.d && res.d.error) || "Something went wrong. Try again.");
          if (submitBtn) submitBtn.disabled = false;
        })
        .catch(function () {
          showError("Network error. Check your connection and try again.");
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* Social sign-in is not wired up yet — keep the buttons, explain the state. */
  document.querySelectorAll(".oauth-btn").forEach(function (b) {
    b.addEventListener("click", function () { toast("Social sign-in is coming soon — use email for now."); });
  });
})();
