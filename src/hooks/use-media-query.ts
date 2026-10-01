import { useMemo, useSyncExternalStore } from "react";

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}

/** Live `matchMedia` result; `false` during server render. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    useMemo(() => subscribeMedia(query), [query]),
    () => window.matchMedia(query).matches,
    () => false,
  );
}
