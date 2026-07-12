"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps the timeline fresh across devices without full real-time sync.
// When the app returns to the foreground — a tab switch, coming back from the
// background, or (crucially on iOS Safari) a restore from the back/forward
// cache — we re-fetch the server-rendered page so changes made on another
// device (e.g. a deleted entry) show up without needing a manual reload.
export default function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    function onPageShow(e: PageTransitionEvent) {
      // persisted === true means the page was restored from bfcache (iOS).
      if (e.persisted) router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  return null;
}
