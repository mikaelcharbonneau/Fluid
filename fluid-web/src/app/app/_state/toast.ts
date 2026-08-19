"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.


// ---------------------------------------------------------------------
// Tiny toast for non-routing CTAs.
// ---------------------------------------------------------------------
export function makeToast(msg: any) {
  let host = document.getElementById('proto-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'proto-toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'proto-toast';
  el.textContent = msg;
  host.appendChild(el);
  // Force reflow → animate in
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 260);
  }, 2200);
}

