import { useEffect, useRef } from "react";

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "keydown",
  "scroll",
];

/**
 * When `minutes > 0`, calls `onLock()` after continuous inactivity.
 * Clearing `minutes` disables the timer.
 */
export function useIdleAutoLogout(options: {
  minutes: number | null | undefined;
  onLock: () => void | Promise<void>;
}): void {
  const { minutes, onLock } = options;
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  useEffect(() => {
    const m =
      typeof minutes === "number" && Number.isFinite(minutes)
        ? minutes
        : 0;
    if (m <= 0) return;

    const ms = m * 60 * 1000;
    let finished = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const fire = () => {
      if (finished) return;
      finished = true;
      clearIdle();
      void onLockRef.current();
    };

    const clearIdle = () => {
      if (idleTimer != null) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const reset = () => {
      clearIdle();
      idleTimer = setTimeout(fire, ms);
    };

    reset();

    const onEvt = () => reset();
    for (const ev of IDLE_EVENTS) {
      window.addEventListener(ev, onEvt, { passive: true });
    }

    const onVis = () => {
      if (document.visibilityState === "visible") reset();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      finished = true;
      clearIdle();
      for (const ev of IDLE_EVENTS) {
        window.removeEventListener(ev, onEvt);
      }
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [minutes]);
}
