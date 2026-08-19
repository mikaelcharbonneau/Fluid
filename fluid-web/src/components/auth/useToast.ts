"use client";

import { useCallback, useRef, useState } from "react";

// Port of the toast() helper in public/scripts/{login,signup,reset-password}.js:
// a transient message appended to the DOM, shown for 2.2s then faded out over
// 260ms before removal. Styled by the existing `.auth-toast`/`.show` CSS.
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (removeTimer.current) clearTimeout(removeTimer.current);

    setMessage(msg);
    setVisible(false);
    requestAnimationFrame(() => setVisible(true));

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      removeTimer.current = setTimeout(() => setMessage(null), 260);
    }, 2200);
  }, []);

  return { message, visible, toast };
}
