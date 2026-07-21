(function () {
  "use strict";
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* custom cursor — matches the other auth pages */
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
  var pw = document.getElementById("rs-pw");
  if (tog && pw) {
    tog.addEventListener("click", function () {
      var show = pw.type === "password";
      pw.type = show ? "text" : "password";
      tog.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  }

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

  /* ---- request-a-link form ---- */
  var reqForm = document.getElementById("reset-request-form");
  if (reqForm) {
    var reqBtn = reqForm.querySelector('button[type="submit"]');
    reqForm.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      var email = (document.getElementById("rr-email") || {}).value || "";
      if (!email) { showError("Enter your email."); return; }
      if (reqBtn) reqBtn.disabled = true;
      fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok) {
            var form = document.querySelector(".auth-form");
            if (form) {
              var note = document.createElement("p");
              note.className = "auth-sub";
              note.style.marginTop = "10px";
              note.textContent = "If an account exists for " + email + ", a reset link is on its way. Check your inbox (and spam).";
              reqForm.style.display = "none";
              reqForm.parentNode.insertBefore(note, reqForm);
            }
            return;
          }
          showError((res.d && res.d.error) || "Something went wrong. Try again.");
          if (reqBtn) reqBtn.disabled = false;
        })
        .catch(function () {
          showError("Network error. Check your connection and try again.");
          if (reqBtn) reqBtn.disabled = false;
        });
    });
  }

  /* ---- set-new-password form ---- */
  var setForm = document.getElementById("reset-set-form");
  if (setForm) {
    var setBtn = setForm.querySelector('button[type="submit"]');
    setForm.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      var password = (document.getElementById("rs-pw") || {}).value || "";
      if (password.length < 8) { showError("Password must be at least 8 characters."); return; }
      if (setBtn) setBtn.disabled = true;
      fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok) { window.location.assign("/app#home"); return; }
          showError((res.d && res.d.error) || "Something went wrong. Try again.");
          if (setBtn) setBtn.disabled = false;
        })
        .catch(function () {
          showError("Network error. Check your connection and try again.");
          if (setBtn) setBtn.disabled = false;
        });
    });
  }
})();
