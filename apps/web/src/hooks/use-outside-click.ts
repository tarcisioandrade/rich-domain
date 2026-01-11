import { useEffect, RefObject } from "react";

type OutsideClickHandler = (event: MouseEvent | TouchEvent) => void;

export function useOutsideClick<T extends HTMLElement | null>(
  ref: RefObject<T>,
  handler: OutsideClickHandler,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !ref.current) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      if (
        (event.target as HTMLElement).closest("[data-ignore-outside-click]")
      ) {
        return;
      }

      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;

      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, enabled]);
}
