"use client";

import { useEffect, useState } from "react";

export default function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setPct(max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[120] h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-crimson-deep to-crimson shadow-[0_0_10px_var(--tw-shadow-color)] shadow-crimson/60 transition-[width] duration-75"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
