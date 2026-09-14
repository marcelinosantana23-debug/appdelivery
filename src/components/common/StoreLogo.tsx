import React from "react";

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

interface StoreLogoProps {
  logo?: string | null;
  name?: string | null;
  className?: string;
  fallbackEmoji?: string;
}

export function StoreLogo({
  logo,
  name,
  className = "h-full w-full object-cover",
  fallbackEmoji = "🏪",
}: StoreLogoProps) {
  if (!logo) {
    return <span className="select-none">{fallbackEmoji}</span>;
  }

  if (isImageString(logo)) {
    return (
      <img
        src={logo}
        alt={getSafeDisplayName(name, "Logomarca da loja")}
        className={className}
        loading="lazy"
      />
    );
  }

  // If someone has a string that isn't a known URL/data URL but is longer than 10 characters,
  // it is corrupted data (e.g. truncated or broken base64). Do NOT render it as text!
  if (logo.length > 10) {
    return <span className="select-none">{fallbackEmoji}</span>;
  }

  return <span className="select-none">{logo}</span>;
}
