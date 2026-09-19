export function isImageString(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/img/")
  );
}

export function getSafeDisplayName(name?: string | null, fallback = "Lanchonete"): string {
  if (!name || typeof name !== "string") return fallback;
  const trimmed = name.trim();
  if (isImageString(trimmed) || (trimmed.length > 80 && !trimmed.includes(" "))) {
    return fallback;
  }
  return trimmed;
}

export function getSafeSlug(slug?: string | null, fallback = "loja"): string {
  if (!slug || typeof slug !== "string") return fallback;
  const trimmed = slug.trim();
  if (isImageString(trimmed) || trimmed.length > 60) {
    return fallback;
  }
  return trimmed;
}
