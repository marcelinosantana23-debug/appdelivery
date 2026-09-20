import React from "react";

/**
 * URLs de fotos de alta resolução e apetitosas do Unsplash (fotografia profissional de gastronomia)
 * utilizadas como reserva garantida caso a geração externa ou conexão de terceiros oscile.
 */
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  lanches: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  burgers: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  pizzas: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
  pasteis: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80",
  porcoes: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
  bebidas: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
  sobremesas: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80",
  acai: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80",
  default: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
};

/**
 * Retorna uma foto gastronômica profissional baseada na categoria ou nome do item.
 */
export function getCategoryFallbackImage(category: string = "", name: string = ""): string {
  const combined = `${category} ${name}`.toLowerCase();
  if (combined.includes("hamburg") || combined.includes("burg") || combined.includes("cheeseburg") || combined.includes("artesanal") || combined.includes("sanduich") || combined.includes("lanche")) {
    return CATEGORY_FALLBACK_IMAGES.lanches;
  }
  if (combined.includes("pizza") || combined.includes("calzone") || combined.includes("esfiha")) {
    return CATEGORY_FALLBACK_IMAGES.pizzas;
  }
  if (combined.includes("pastel") || combined.includes("salgado") || combined.includes("coxinha") || combined.includes("kibe") || combined.includes("empada")) {
    return CATEGORY_FALLBACK_IMAGES.pasteis;
  }
  if (combined.includes("batata") || combined.includes("frita") || combined.includes("porcao") || combined.includes("porção") || combined.includes("mandioca") || combined.includes("petisco") || combined.includes("calabresa") || combined.includes("frango")) {
    return CATEGORY_FALLBACK_IMAGES.porcoes;
  }
  if (combined.includes("coca") || combined.includes("refrigerante") || combined.includes("suco") || combined.includes("cerveja") || combined.includes("bebida") || combined.includes("agua") || combined.includes("água") || combined.includes("drink")) {
    return CATEGORY_FALLBACK_IMAGES.bebidas;
  }
  if (combined.includes("acai") || combined.includes("açaí") || combined.includes("sorvete") || combined.includes("sobremesa") || combined.includes("doce") || combined.includes("pudim") || combined.includes("brownie")) {
    return CATEGORY_FALLBACK_IMAGES.sobremesas;
  }
  return CATEGORY_FALLBACK_IMAGES[category.toLowerCase()] || CATEGORY_FALLBACK_IMAGES.default;
}

/**
 * Normaliza e formata de forma resiliente qualquer URL ou string Base64 de imagem retornada por IA,
 * upload do usuário ou banco de dados:
 * 1. Base64: garante o prefixo data:image/jpeg;base64, caso falte.
 * 2. Pollinations AI: corrige URLs antigas/quebradas (ex: /p/...&width= -> image.pollinations.ai/prompt/...?width=).
 * 3. URLs relativas de storage/KV: garante caminho acessível.
 */
export function normalizeProductImage(src?: string | null, category?: string, name?: string): string {
  if (!src || typeof src !== "string") {
    return getCategoryFallbackImage(category, name);
  }

  let clean = src.trim();
  if (!clean) {
    return getCategoryFallbackImage(category, name);
  }

  // 0. Substituição preventiva de URLs legadas de terceiros que foram descontinuadas
  if (clean.includes("1576107232684-1279f3908594")) {
    return "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80";
  }
  if (clean.includes("1548839140-29a749e1bc4e")) {
    return "https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=600&q=80";
  }
  if (clean.includes("photos-1346157")) {
    return "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80";
  }
  if (clean.includes("photos/2910081")) {
    return "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80";
  }
  if (clean.includes("photos/3622442")) {
    return "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80";
  }
  if (clean.includes("photos/3821247")) {
    return "https://images.unsplash.com/photo-1607920591413-4ec007e70023?auto=format&fit=crop&w=600&q=80";
  }

  // 1. Correção de Base64 sem prefixo data:
  if (clean.startsWith("/9j/") || clean.startsWith("iVBOR") || clean.startsWith("R0lGOD") || clean.startsWith("UklGR")) {
    const mime = clean.startsWith("iVBOR")
      ? "image/png"
      : clean.startsWith("R0lGOD")
      ? "image/gif"
      : clean.startsWith("UklGR")
      ? "image/webp"
      : "image/jpeg";
    return `data:${mime};base64,${clean}`;
  }

  // Se já for data URI válido
  if (clean.startsWith("data:image/")) {
    return clean;
  }

  // Se for Base64 puro longo sem protocolo
  if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("/") && clean.length > 200) {
    return `data:image/jpeg;base64,${clean}`;
  }

  // 2. Correção de URLs do Pollinations AI
  // Substitui domínio antigo / rota quebrada `pollinations.ai/p/...` pelo endpoint oficial `image.pollinations.ai/prompt/...`
  if (clean.includes("pollinations.ai/p/")) {
    clean = clean
      .replace("https://pollinations.ai/p/", "https://image.pollinations.ai/prompt/")
      .replace("http://pollinations.ai/p/", "https://image.pollinations.ai/prompt/");
    // Corrige falta de '?' antes dos parâmetros
    if (clean.includes("&width=") && !clean.includes("?width=")) {
      clean = clean.replace("&width=", "?width=");
    }
  } else if (clean.includes("image.pollinations.ai/prompt/") && clean.includes("&width=") && !clean.includes("?width=")) {
    clean = clean.replace("&width=", "?width=");
  }

  // 3. Garante protocolo em links de CDN que iniciam com //
  if (clean.startsWith("//")) {
    clean = `https:${clean}`;
  }

  return clean;
}

/**
 * Placeholder vetorial SVG garantido (não depende de requisição de rede externa)
 */
export const INLINE_FOOD_SVG_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" fill="none">
  <rect width="600" height="600" fill="#F8FAFC"/>
  <circle cx="300" cy="300" r="140" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="8"/>
  <circle cx="300" cy="300" r="100" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="4"/>
  <path d="M260 280C260 260 340 260 340 280C340 300 260 300 260 280Z" fill="#F59E0B"/>
  <path d="M250 310H350V322C350 334 340 344 328 344H272C260 344 250 334 250 322V310Z" fill="#E11D48"/>
  <text x="300" y="490" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="#64748B">Top Food</text>
</svg>
`.trim())}`;

/**
 * Trata falha no carregamento de imagens (onError), com transição multi-nível garantida:
 * 1. Nível 1: Foto culinária específica da categoria (Unsplash 200 verificado)
 * 2. Nível 2: Foto gastronômica padrão geral
 * 3. Nível 3: SVG inline vetorial garantido (nunca falha, mesmo sem internet)
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  category?: string,
  name?: string
) {
  const target = e.currentTarget;
  const currentSrc = target.src || "";
  const attempt = parseInt(target.dataset.fallbackAttempt || "0", 10);

  if (attempt === 0) {
    target.dataset.fallbackAttempt = "1";
    console.warn(`[Top Food Image] Falha ao carregar imagem para '${name || "produto"}': ${currentSrc}. Aplicando foto da categoria.`);
    const fallback = getCategoryFallbackImage(category, name);
    if (target.src !== fallback) {
      target.src = fallback;
    } else {
      target.src = CATEGORY_FALLBACK_IMAGES.default;
    }
  } else if (attempt === 1) {
    target.dataset.fallbackAttempt = "2";
    console.warn(`[Top Food Image] Falha no fallback 1 para '${name || "produto"}'. Aplicando fallback geral.`);
    target.src = CATEGORY_FALLBACK_IMAGES.default;
  } else if (attempt === 2) {
    target.dataset.fallbackAttempt = "3";
    // Último recurso: SVG inline em data URI, que nunca gera erro de rede
    target.src = INLINE_FOOD_SVG_FALLBACK;
  }
}
