// Returns an inline snippet that loads a public script via a native <script>
// tag once the DOM is ready — independent of Next's client runtime.
//
// Next's afterInteractive scripts don't fire until hydration completes, and a
// single failed Next chunk (observed in Safari) stalls hydration, which left
// page scripts (marketing.js, login.js, …) unrun. Injecting the script
// ourselves runs it regardless.
export function bootstrapScript(src: string): string {
  const s = JSON.stringify(src);
  return `(function(){function l(){var s=document.createElement('script');s.src=${s};document.body.appendChild(s);}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',l);}else{l();}})();`;
}
