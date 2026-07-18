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

  /* funnel → into the app after logging in */
  var APP = "/app#home";
  var go = function () { var f=(APP.split("#")[1]||""); try{window.parent.postMessage({__fluidNav:"/app"+(f?"/"+f:"")},"*");}catch(e){} };
  var form = document.querySelector(".auth-fields");
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); go(); });
  document.querySelectorAll(".oauth-btn").forEach(function (b) { b.addEventListener("click", go); });
})();
