import type { TourVariant } from "./tour.types";

// scoore stores tour-completion in a cookie (not localStorage) so the auto-tour
// re-shows for occasional visitors once the cookie expires. Other SwissNovo
// apps using the same tour standard still use localStorage — this file diverges
// from the suite default on purpose. See releaseNotes v0.5.4 for context.

const DEFAULT_COMPLETION_TTL_DAYS = 30;

function cookieKey(appId: string, tourVersion: string, variant: TourVariant) {
  return `app-tour__${appId}__${tourVersion}__${variant}__completed`;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(1, Math.floor(days * 24 * 60 * 60));
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  } catch {
    /* ignore — disabled / restricted */
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + escaped + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=; max-age=0; path=/`;
  } catch {
    /* ignore */
  }
}

export function getTourStorageKey(
  appId: string,
  tourVersion: string,
  variant: TourVariant,
) {
  return cookieKey(appId, tourVersion, variant);
}

export function hasCompletedTour(
  appId: string,
  tourVersion: string,
  variant: TourVariant,
) {
  return readCookie(cookieKey(appId, tourVersion, variant)) === "true";
}

export function markTourCompleted(
  appId: string,
  tourVersion: string,
  variant: TourVariant,
  ttlDays: number = DEFAULT_COMPLETION_TTL_DAYS,
) {
  setCookie(cookieKey(appId, tourVersion, variant), "true", ttlDays);
}

export function resetTour(
  appId: string,
  tourVersion: string,
  variant: TourVariant,
) {
  clearCookie(cookieKey(appId, tourVersion, variant));
}
