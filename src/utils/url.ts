/**
 * Utility for generating public storefront URLs and admin URLs.
 * Official production URL requested: https://appdelivery.marcelinosantana23.workers.dev/loja/SLUG
 */

export const OFFICIAL_WORKERS_BASE = "https://appdelivery.marcelinosantana23.workers.dev";

export function getSafeSlugClean(slug?: string | null, fallback = "loja"): string {
  if (!slug) return fallback;
  const clean = slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || fallback;
}

/**
 * Returns the official Cloudflare Workers production URL for the tenant showcase.
 * e.g. https://appdelivery.marcelinosantana23.workers.dev/loja/marcelino
 */
export function getOfficialStoreUrl(slug?: string | null): string {
  const clean = getSafeSlugClean(slug, "loja");
  return `${OFFICIAL_WORKERS_BASE}/loja/${clean}`;
}

/**
 * Returns the store URL based on current browser origin if in preview/dev,
 * or official URL when in production.
 */
export function getPublicStoreUrl(slug?: string | null, forceOfficial = false): string {
  const clean = getSafeSlugClean(slug, "loja");
  if (forceOfficial) {
    return `${OFFICIAL_WORKERS_BASE}/loja/${clean}`;
  }
  if (typeof window !== "undefined" && window.location.hostname.includes("workers.dev")) {
    return `${window.location.origin}/loja/${clean}`;
  }
  // Default to official URL requested
  return `${OFFICIAL_WORKERS_BASE}/loja/${clean}`;
}

/**
 * Returns preview store URL based on window.location.origin
 */
export function getPreviewStoreUrl(slug?: string | null): string {
  const clean = getSafeSlugClean(slug, "loja");
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}/loja/${clean}`;
  }
  return getOfficialStoreUrl(clean);
}

export const getStoreUrl = getPublicStoreUrl;

/**
 * Copy text to clipboard with reliable fallback for older browsers or iframes
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to execCommand below
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn("Could not copy text to clipboard:", err);
    return false;
  }
}
