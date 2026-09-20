/**
 * Helper para injeção dinâmica de metatags PWA e SEO para vitrines multi-tenant (/loja/:slug)
 */

export function injectStorePwaMetaTags(html: string, loja: any): string {
  const storeName = (loja?.name || "Nova Lanchonete").trim();
  const logoUrl = (loja?.logo && loja.logo.trim()) ? loja.logo.trim() : "/icon-512.png";
  const slug = (loja?.slug || "").trim();
  const manifestUrl = `/api/pwa/manifest.json?slug=${encodeURIComponent(slug)}`;
  const title = `${storeName} - Delivery`;
  const description = `Peça os melhores lanches em ${storeName}. Delivery rápido e prático.`;
  const themeColor = loja?.primaryColor || "#dc2626";

  let updated = html;

  // 1. <title>Nome da Nova Lanchonete - Delivery</title>
  if (/<title>.*?<\/title>/i.test(updated)) {
    updated = updated.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  } else {
    updated = updated.replace("</head>", `  <title>${escapeHtml(title)}</title>\n</head>`);
  }

  // 2. <meta name="apple-mobile-web-app-title" content="Nome da Nova Lanchonete">
  if (/<meta\s+[^>]*name=["']apple-mobile-web-app-title["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*name=["']apple-mobile-web-app-title["'][^>]*\/?>/i,
      `<meta name="apple-mobile-web-app-title" content="${escapeHtml(storeName)}" />`
    );
  } else {
    updated = updated.replace("</head>", `  <meta name="apple-mobile-web-app-title" content="${escapeHtml(storeName)}" />\n</head>`);
  }

  // 3. <meta name="description" content="Peça os melhores lanches em Nome da Nova Lanchonete. Delivery rápido e prático.">
  if (/<meta\s+[^>]*name=["']description["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*name=["']description["'][^>]*\/?>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );
  } else {
    updated = updated.replace("</head>", `  <meta name="description" content="${escapeHtml(description)}" />\n</head>`);
  }

  // 4. <link rel="apple-touch-icon" href="URL_DA_LOGO_DA_LOJA">
  if (/<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*\/?>/i,
      `<link rel="apple-touch-icon" href="${escapeHtml(logoUrl)}" />`
    );
  } else {
    updated = updated.replace("</head>", `  <link rel="apple-touch-icon" href="${escapeHtml(logoUrl)}" />\n</head>`);
  }

  // 5. <link rel="manifest" href="/api/pwa/manifest.json?slug=SLUG_DA_LOJA">
  if (/<link\s+[^>]*rel=["']manifest["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<link\s+[^>]*rel=["']manifest["'][^>]*\/?>/i,
      `<link rel="manifest" href="${manifestUrl}" />`
    );
  } else {
    updated = updated.replace("</head>", `  <link rel="manifest" href="${manifestUrl}" />\n</head>`);
  }

  // 6. Favicon & Open Graph / Twitter Tags para compartilhamento e visual consistente
  if (/<link\s+[^>]*rel=["']icon["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<link\s+[^>]*rel=["']icon["'][^>]*\/?>/i,
      `<link rel="icon" href="${escapeHtml(logoUrl)}" />`
    );
  }

  if (/<meta\s+[^>]*property=["']og:title["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*property=["']og:title["'][^>]*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(title)}" />`
    );
  }

  if (/<meta\s+[^>]*property=["']og:description["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*property=["']og:description["'][^>]*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(description)}" />`
    );
  }

  if (/<meta\s+[^>]*property=["']og:image["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*property=["']og:image["'][^>]*\/?>/i,
      `<meta property="og:image" content="${escapeHtml(logoUrl)}" />`
    );
  }

  if (/<meta\s+[^>]*name=["']twitter:title["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*name=["']twitter:title["'][^>]*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`
    );
  }

  if (/<meta\s+[^>]*name=["']twitter:description["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*name=["']twitter:description["'][^>]*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`
    );
  }

  if (/<meta\s+[^>]*name=["']twitter:image["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*name=["']twitter:image["'][^>]*\/?>/i,
      `<meta name="twitter:image" content="${escapeHtml(logoUrl)}" />`
    );
  }

  if (/<meta\s+[^>]*name=["']theme-color["'][^>]*\/?>/i.test(updated)) {
    updated = updated.replace(
      /<meta\s+[^>]*name=["']theme-color["'][^>]*\/?>/i,
      `<meta name="theme-color" content="${themeColor}" />`
    );
  }

  return updated;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
