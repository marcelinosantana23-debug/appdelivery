import { isImageString, getSafeDisplayName } from "@/utils/storeFormat";

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
        decoding="async"
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
