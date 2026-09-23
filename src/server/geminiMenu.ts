import { GoogleGenAI } from "@google/genai";

export interface ExtractedMenuData {
  nome_loja: string;
  descricao: string;
  telefone: string;
  primary_color?: string;
  has_logo: boolean;
  logo_bounding_box?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  logo_svg?: string;
  logo_url?: string;
  categorias: Array<{
    nome: string;
    produtos: Array<{
      nome: string;
      descricao: string;
      preco: number;
      image: string;
      opcionais?: Array<{
        nome: string;
        preco: number;
      }>;
    }>;
  }>;
}

export interface MenuFileInput {
  data: string;
  mimeType?: string;
  fileName?: string;
}

/**
 * Traduz e refina o nome e categoria de um prato para uma descrição apetitosa em inglês gastronômico,
 * gerando imagens realistas através da API Pollinations AI.
 */
export function translateDishToEnglish(name: string, category: string = "", description: string = ""): string {
  const t = `${name} ${category} ${description}`.toLowerCase();

  if (t.includes("bacon") && (t.includes("burg") || t.includes("lanche"))) {
    return "gourmet bacon cheeseburger with crispy smoked bacon and melted cheddar cheese";
  }
  if (t.includes("smash")) {
    return "crispy double smash burger with melted american cheese and special sauce";
  }
  if (t.includes("burg") || t.includes("hamburg") || t.includes("artesanal") || t.includes("cheeseburg")) {
    return "artisan gourmet cheeseburger on brioche bun with lettuce tomato and melted cheese";
  }
  if (t.includes("hot dog") || t.includes("cachorro quente") || t.includes("dogão") || t.includes("dogao")) {
    return "gourmet loaded hot dog with mustard ketchup melted cheese and potato sticks";
  }
  if (t.includes("batata") && (t.includes("cheddar") || t.includes("bacon"))) {
    return "loaded crispy french fries topped with melted cheddar cheese sauce and crispy bacon bits";
  }
  if (t.includes("batata") || t.includes("fritas") || t.includes("french fries")) {
    return "crispy golden french fries in a basket with dip sauce";
  }
  if (t.includes("anel de cebola") || t.includes("aneis de cebola") || t.includes("onion ring")) {
    return "crispy deep-fried golden onion rings with dipping sauce";
  }
  if (t.includes("pizza") && (t.includes("calabresa") || t.includes("pepperoni"))) {
    return "hot baked pepperoni calabresa pizza with melted mozzarella cheese";
  }
  if (t.includes("pizza") && (t.includes("frango") || t.includes("catupiry"))) {
    return "brazilian chicken with catupiry cream cheese pizza freshly baked";
  }
  if (t.includes("pizza") && (t.includes("quatro queijos") || t.includes("4 queijos"))) {
    return "four cheese italian gourmet pizza with mozzarella gorgonzola parmesan";
  }
  if (t.includes("pizza") && (t.includes("chocolate") || t.includes("doce") || t.includes("banana") || t.includes("nutella"))) {
    return "sweet dessert pizza topped with melted chocolate and strawberries";
  }
  if (t.includes("pizza") || t.includes("calzone")) {
    return "delicious freshly baked artisan italian pizza with melted mozzarella and fresh basil";
  }
  if (t.includes("pastel") || t.includes("pasteis") || t.includes("pastéis")) {
    return "crispy golden deep-fried brazilian pastel pastry filled and flaky";
  }
  if (t.includes("coxinha") || t.includes("kibe") || t.includes("salgado") || t.includes("empada")) {
    return "brazilian party snacks coxinha golden fried chicken croquette";
  }
  if (t.includes("acai") || t.includes("açaí")) {
    return "fresh brazilian acai bowl topped with sliced bananas strawberries granola and condensed milk";
  }
  if (t.includes("milk shake") || t.includes("milkshake") || t.includes("shake")) {
    return "thick creamy gourmet milkshake in a glass with whipped cream and drizzle";
  }
  if (t.includes("sorvete") || t.includes("ice cream") || t.includes("gelato")) {
    return "delicious scoops of gourmet ice cream in a bowl with toppings";
  }
  if (t.includes("suco") || t.includes("vitamina") || t.includes("smoothie")) {
    return "fresh natural cold fruit juice in a clear tall glass with ice and fruit garnish";
  }
  if (t.includes("frango a passarinho") || t.includes("frango frito") || t.includes("crispy chicken")) {
    return "crispy fried garlic chicken bites served with lemon wedges";
  }
  if (t.includes("calabresa") && (t.includes("porcao") || t.includes("porção") || t.includes("petisco"))) {
    return "sautéed sliced brazilian smoked sausage calabresa with caramelized onions";
  }
  if (t.includes("picanha") || t.includes("churrasco") || t.includes("carne") || t.includes("espeto") || t.includes("bife")) {
    return "tender juicy grilled steak slices bbq with coarse salt";
  }
  if (t.includes("massa") || t.includes("macarrao") || t.includes("macarrão") || t.includes("lasanha") || t.includes("espaguete")) {
    return "delicious homemade pasta dish with rich tomato sauce and parmesan cheese";
  }
  if (t.includes("salada") || t.includes("salad")) {
    return "fresh healthy garden salad with crisp greens cherry tomatoes and olive oil dressing";
  }
  if (t.includes("pudim") || t.includes("brownie") || t.includes("torta") || t.includes("bolo") || t.includes("sobremesa") || t.includes("doce")) {
    return "decadent gourmet restaurant dessert plate sweet and beautifully plated";
  }

  const cleanName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();
  return `${cleanName || "delicious gourmet"} appetizing restaurant dish`;
}

/**
 * URLs de imagem padrão (fallback) de acordo com o tipo de produto
 */
export const PRODUCT_FALLBACK_IMAGES = {
  ACAI: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80",
  BURGER: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
  HOT_DOG: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=800&q=80",
  PASTEL_BATATA: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80",
  BEBIDAS: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80",
};

/**
 * Atribui automaticamente uma URL de imagem profissional e realista ao produto:
 * - Açaí: tigela de açaí autêntica com frutas/granola
 * - Hambúrgueres/Lanches: hambúrguer artesanal apetitoso
 * - Hot Dogs: cachorro quente gourmet prensado ou tradicional
 * - Pastéis/Batatas: porção dourada crocante de batata ou pastel
 * - Bebidas: latas/copos de refrigerante e bebidas
 */
export function generateProductImageUrl(name: string, category: string = "", description: string = ""): string {
  const text = `${name} ${category} ${description}`.toLowerCase();

  // 1. Açaí / Cremes / Tigelas
  if (text.includes("acai") || text.includes("açaí") || text.includes("cupuaçu") || text.includes("cupuacu") || text.includes("pitaya")) {
    return PRODUCT_FALLBACK_IMAGES.ACAI;
  }

  // 2. Hot Dogs / Cachorro Quente
  if (text.includes("hot dog") || text.includes("hotdog") || text.includes("cachorro quente") || text.includes("dogão") || text.includes("dogao") || text.includes("salsicha")) {
    return PRODUCT_FALLBACK_IMAGES.HOT_DOG;
  }

  // 3. Pastéis e Batatas Fritas / Porções
  if (
    text.includes("pastel") ||
    text.includes("pasteis") ||
    text.includes("pastéis") ||
    text.includes("batata") ||
    text.includes("fritas") ||
    text.includes("french fries") ||
    text.includes("nuggets") ||
    text.includes("mandioca") ||
    text.includes("polenta")
  ) {
    return PRODUCT_FALLBACK_IMAGES.PASTEL_BATATA;
  }

  // 4. Bebidas
  if (
    text.includes("coca") ||
    text.includes("refrigerante") ||
    text.includes("guarana") ||
    text.includes("guaraná") ||
    text.includes("fanta") ||
    text.includes("sprite") ||
    text.includes("suco") ||
    text.includes("bebida") ||
    text.includes("cerveja") ||
    text.includes("chopp") ||
    text.includes("agua") ||
    text.includes("água") ||
    text.includes("energetico") ||
    text.includes("energético") ||
    text.includes("schweppes") ||
    text.includes("lata") ||
    text.includes("2l") ||
    text.includes("600ml")
  ) {
    return PRODUCT_FALLBACK_IMAGES.BEBIDAS;
  }

  // 5. Hambúrgueres e Lanches
  if (
    text.includes("burg") ||
    text.includes("hamburg") ||
    text.includes("lanche") ||
    text.includes("sanduiche") ||
    text.includes("sanduíche") ||
    text.includes("x-") ||
    text.includes("bacon") ||
    text.includes("artesanal") ||
    text.includes("smash") ||
    text.includes("cheddar")
  ) {
    return PRODUCT_FALLBACK_IMAGES.BURGER;
  }

  // Padrão gastronômico geral
  return PRODUCT_FALLBACK_IMAGES.BURGER;
}

/**
 * Instancia o cliente GoogleGenAI utilizando a chave apiKey fornecida via contexto c.env.GEMINI_API_KEY
 * sem referenciar process.env, tornando-o totalmente compatível com Cloudflare Workers.
 */
export function getGeminiClient(explicitApiKey?: string): GoogleGenAI | null {
  const apiKey =
    explicitApiKey ||
    (typeof process !== "undefined" && process?.env?.GEMINI_API_KEY
      ? process.env.GEMINI_API_KEY
      : undefined);
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Cria um SVG moderno padrão de alta resolução caso a IA não retorne SVG
 */
export function generateDefaultFoodLogoSvg(storeName: string, primaryColor = "#E63946"): string {
  const safeName = storeName.replace(/[<>&"]/g, "").trim() || "Top Food";
  const initials = safeName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Background Badge -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <!-- Inner Ring -->
  <circle cx="256" cy="256" r="220" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="4" stroke-dasharray="12 12"/>
  <!-- Food Icon Graphic (Burger & Star) -->
  <g filter="url(#shadow)">
    <!-- Top Bun -->
    <path d="M156 220 C156 150, 356 150, 356 220 Z" fill="#F59E0B"/>
    <ellipse cx="210" cy="185" rx="5" ry="3" fill="#FEF3C7"/>
    <ellipse cx="256" cy="175" rx="5" ry="3" fill="#FEF3C7"/>
    <ellipse cx="302" cy="185" rx="5" ry="3" fill="#FEF3C7"/>
    <!-- Cheese -->
    <polygon points="150,230 362,230 340,250 256,260 170,250" fill="#FBBF24"/>
    <!-- Patty -->
    <rect x="146" y="246" width="220" height="24" rx="12" fill="#78350F"/>
    <!-- Lettuce -->
    <path d="M140 270 Q170 282 200 270 Q230 282 260 270 Q290 282 320 270 Q350 282 372 270 L368 280 Q340 292 315 280 Q285 292 256 280 Q225 292 195 280 Q165 292 144 280 Z" fill="#10B981"/>
    <!-- Bottom Bun -->
    <path d="M156 288 C156 318, 356 318, 356 288 Z" fill="#D97706"/>
  </g>
  <!-- Store Initials or Name Badge -->
  <rect x="106" y="340" width="300" height="74" rx="37" fill="#ffffff" fill-opacity="0.95" filter="url(#shadow)"/>
  <text x="256" y="388" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="#0F172A" text-anchor="middle" letter-spacing="1.5">${initials || "FOOD"}</text>
</svg>`;
}

/**
 * Converte string SVG pura em data URL seguro
 */
export function svgToDataUrl(svgString: string): string {
  if (!svgString) return "";
  const cleaned = svgString
    .replace(/```xml/g, "")
    .replace(/```svg/g, "")
    .replace(/```/g, "")
    .trim();
  const encoded = encodeURIComponent(cleaned)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml;utf8,${encoded}`;
}

/**
 * Envia o cardápio (uma ou múltiplas imagens/PDF em base64) para a API multimodal do Gemini
 */
export async function analyzeMenuWithGemini(
  input: string | MenuFileInput[] | MenuFileInput,
  apiKeyOrMime?: string,
  explicitApiKeyOrPrompt?: string,
  promptExtra?: string
): Promise<ExtractedMenuData> {
  let files: MenuFileInput[] = [];
  let apiKey: string | undefined;
  let customPrompt: string | undefined;

  if (Array.isArray(input)) {
    files = input;
    apiKey = apiKeyOrMime;
    customPrompt = explicitApiKeyOrPrompt;
  } else if (typeof input === "object" && input !== null && "data" in input) {
    files = [input as MenuFileInput];
    apiKey = apiKeyOrMime;
    customPrompt = explicitApiKeyOrPrompt;
  } else if (typeof input === "string") {
    files = [
      {
        data: input,
        mimeType: apiKeyOrMime || "image/jpeg",
      },
    ];
    apiKey = explicitApiKeyOrPrompt;
    customPrompt = promptExtra;
  }

  if (files.length === 0) {
    throw new Error("Nenhum arquivo ou imagem do cardápio foi fornecido para análise.");
  }

  const ai = getGeminiClient(apiKey);
  if (!ai) {
    throw new Error(
      "A chave GEMINI_API_KEY não foi configurada no servidor. Por favor, configure a variável GEMINI_API_KEY no painel de configurações para habilitar o processamento por IA."
    );
  }

  // Prepara as partes multimodais (todas as fotos / páginas enviadas)
  const fileParts = files.map((f) => {
    const cleanBase64 = (f.data || "").replace(/^data:[^;]+;base64,/, "");
    return {
      inlineData: {
        mimeType: f.mimeType || "image/jpeg",
        data: cleanBase64,
      },
    };
  });

  const isMultiple = files.length > 1;
  let prompt = `Você é um especialista em cardápios de restaurantes e gastronomia, e também um designer gráfico de identidade visual de marcas de food delivery.
${
  isMultiple
    ? `Você está recebendo ${files.length} imagens/páginas pertencentes ao MESMO cardápio comercial. Analise detalhadamente todas as páginas em conjunto para extrair o cardápio completo, unificando categorias, combinando seções e evitando itens duplicados.`
    : `Analise detalhadamente a imagem ou documento PDF deste cardápio comercial e extraia todos os dados de forma estruturada.`
}

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem texto adicional fora do JSON) com a seguinte estrutura:
{
  "nome_loja": "Nome do restaurante/lanchonete indicado com destaque no cardápio",
  "descricao": "Resumo breve e atraente do estabelecimento (ex: 'Lanches artesanais, porções crocantes e bebidas geladas')",
  "telefone": "WhatsApp ou telefone de pedidos encontrado no cardápio (apenas números com DDD, ex: 11999998888)",
  "primary_color": "Cor de destaque predominante do cardápio em hexadecimal (ex: #E63946, #D97706, #16A34A)",
  "has_logo": true ou false (se há um logotipo ou símbolo de marca claramente identificável na imagem),
  "logo_bounding_box": { "ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000 } (coordenadas normalizadas de 0 a 1000 onde o logotipo está localizado, caso has_logo seja true),
  "logo_svg": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 512 512\\" width=\\"512\\" height=\\"512\\">...</svg>",
  "categorias": [
    {
      "nome": "Nome da categoria (ex: Lanches Tradicionais, Hambúrgueres Artesanais, Porções, Pizzas, Bebidas)",
      "produtos": [
        {
          "nome": "Nome do item do cardápio",
          "descricao": "Descrição dos ingredientes encontrados ou breve descrição",
          "preco": 24.50,
          "image": "URL de foto profissional e realista do produto (OBRIGATÓRIO)",
          "opcionais": [
            { "nome": "Adicional (ex: Bacon Extra)", "preco": 4.00 }
          ]
        }
      ]
    }
  ]
}

### REGRA MANDATÓRIA: ATRIBUIÇÃO AUTOMÁTICA DE FOTOS ('image' É OBRIGATÓRIO EM CADA ITEM):
Para CADA produto extraído, você DEVE preencher OBRIGATORIAMENTE o campo 'image' com uma URL direta, realista e de alta resolução seguindo RIGOROSAMENTE estas categorias:

1. AÇAÍ, CREMES E TIGELAS:
   - URL OBRIGATÓRIA: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80"
   - NUNCA use fotos de waffle, sorvete no palito ou doces genéricos para açaí.

2. HAMBÚRGUERES, SMASH E LANCHES (X-Tudo, Artesanais, Burgers):
   - URL OBRIGATÓRIA: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80"
   - Use para qualquer hambúrguer ou sanduíche artesanal.

3. HOT DOGS E CACHORROS-QUENTES:
   - URL OBRIGATÓRIA: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=800&q=80"

4. PASTÉIS, BATATAS FRITAS, PORÇÕES E PETISCOS:
   - URL OBRIGATÓRIA: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80"

5. BEBIDAS (Refrigerantes, Sucos, Cervejas, Água e Energéticos):
   - URL OBRIGATÓRIA: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80"

ATENÇÃO CRÍTICA PARA CARDÁPIOS GRANDES (EX: 35+ PRODUTOS COM ADICIONAIS):
- Você NÃO PODE resumir, omitir ou cortar produtos. Extraia TODOS os itens de ponta a ponta sem interromper.
- Em cada produto que possuir opções de adicionais (ex: bacon extra, queijo, calda de chocolate, leite ninho, etc.), liste TODOS no array 'opcionais' com seus respectivos nomes e valores em reais.
- Nenhum produto pode ficar sem imagem, nome ou preço.

Instruções fundamentais para o logo_svg:
1. Gere OBRIGATORIAMENTE um SVG COMPLETO, moderno, vetorial, estilo flat design de aplicativo de comida/delivery, com viewBox="0 0 512 512".
2. Deve conter um fundo elegante quadrado com cantos arredondados (rx="112") usando a cor primária ou gradiente rico.
3. Deve conter um ícone ilustrado de comida em destaque de altíssima qualidade (hambúrguer estilizado, fatia de pizza apetitosa, hot dog, espeto, etc.), adequado aos produtos do cardápio, e/ou as iniciais estilizadas da loja.
4. O SVG será utilizado diretamente como ícone de aplicativo PWA (192x192 e 512x512) para os clientes instalarem na tela inicial do celular.

Instruções para categorias e produtos:
- Extraia o maior número possível de produtos visíveis com seus respectivos preços reais em reais (float).
- Preços devem ser números puros (ex: 29.9, não "R$ 29,90").
- Se houver adicionais listados, adicione-os no array opcionais.
- Caso itens estejam distribuídos em diferentes imagens/páginas do cardápio, organize-os de maneira lógica na categoria correta.
`;

  if (customPrompt && customPrompt.trim()) {
    prompt += `\n\n### INSTRUÇÕES ADICIONAIS ESPECIAIS DO USUÁRIO:\n${customPrompt.trim()}\n(Siga rigorosamente as instruções acima com prioridade máxima ao extrair itens, filtrar páginas ou ajustar preços/categorias).\n`;
  }

  // Lista de modelos modernos do Gemini (em ordem de prioridade)
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
  ];

  let lastError: any = null;
  let response: any = null;
  let usedModel = "";

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];
    try {
      console.log(`[Gemini] Tentando processar cardápio com o modelo: ${currentModel}...`);
      response = await ai.models.generateContent({
        model: currentModel,
        contents: [
          {
            role: "user",
            parts: [
              ...fileParts,
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.1,
        },
      });

      if (response && response.text) {
        usedModel = currentModel;
        console.log(`[Gemini] Cardápio processado com sucesso pelo modelo: ${usedModel}`);
        break;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = (err?.message || "").toLowerCase();
      const status = err?.status || err?.statusCode || err?.code || 0;
      const isRetryable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 400 ||
        status === 410 ||
        errMsg.includes("503") ||
        errMsg.includes("429") ||
        errMsg.includes("404") ||
        errMsg.includes("400") ||
        errMsg.includes("not found") ||
        errMsg.includes("no longer available") ||
        errMsg.includes("deprecated") ||
        errMsg.includes("high demand") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("resource_exhausted") ||
        errMsg.includes("overloaded") ||
        errMsg.includes("quota");

      console.warn(
        `[Gemini] Falha ao tentar modelo ${currentModel} (status: ${status}, retentável: ${isRetryable}):`,
        err.message
      );

      if (i < candidateModels.length - 1) {
        console.log(
          `[Gemini] Ativando fallback automático para o próximo modelo: ${candidateModels[i + 1]}...`
        );
        // Passa imediatamente se for 404/400 (modelo inexistente ou descontinuado), ou aguarda 400ms se for 503/429
        const isImmediate =
          status === 404 ||
          status === 400 ||
          status === 410 ||
          errMsg.includes("404") ||
          errMsg.includes("not found") ||
          errMsg.includes("no longer available") ||
          errMsg.includes("deprecated");
        if (!isImmediate) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    }
  }

  if (!response || !response.text) {
    const errorStr = (lastError?.message || "").toLowerCase();
    if (
      lastError?.status === 503 ||
      lastError?.status === 429 ||
      errorStr.includes("503") ||
      errorStr.includes("429") ||
      errorStr.includes("high demand") ||
      errorStr.includes("unavailable") ||
      errorStr.includes("resource_exhausted") ||
      errorStr.includes("overloaded")
    ) {
      throw new Error(
        "Os servidores do Gemini estão com alta demanda temporária. Por favor, aguarde alguns segundos e clique em Gerar novamente."
      );
    }
    throw new Error(
      lastError?.message || "Não foi possível obter resposta dos servidores do Gemini."
    );
  }

  try {

    const responseText = response.text || "";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Se vier envolvido em blocos ```json ... ```
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("A IA não retornou um formato JSON válido.");
      }
    }

    const storeName =
      parsed.nome_loja?.trim() ||
      parsed.store_name?.trim() ||
      parsed.nome?.trim() ||
      parsed.name?.trim() ||
      "Nova Lanchonete";
    const primaryColor =
      parsed.primary_color || parsed.primaryColor || parsed.cor_primaria || "#E63946";

    // Garante que logo_svg existe
    let finalSvg = parsed.logo_svg || parsed.logoSvg || parsed.svg;
    if (!finalSvg || typeof finalSvg !== "string" || !finalSvg.includes("<svg")) {
      finalSvg = generateDefaultFoodLogoSvg(storeName, primaryColor);
    }

    const logoUrl = svgToDataUrl(finalSvg);

    // Normalização completa de categorias e produtos
    let rawCategorias =
      parsed.categorias || parsed.categories || parsed.cardapio || parsed.menu || [];

    if (!Array.isArray(rawCategorias) && typeof rawCategorias === "object") {
      rawCategorias = Object.entries(rawCategorias).map(([k, v]) => ({
        nome: k,
        produtos: Array.isArray(v) ? v : [],
      }));
    }

    // Se a IA retornou produtos diretamente soltos na raiz (ex: parsed.produtos ou parsed.products ou parsed.items)
    const rawProdutosSoltos =
      parsed.produtos || parsed.products || parsed.items || parsed.itens;
    if (
      (!Array.isArray(rawCategorias) || rawCategorias.length === 0) &&
      Array.isArray(rawProdutosSoltos) &&
      rawProdutosSoltos.length > 0
    ) {
      const grouped: Record<string, any[]> = {};
      rawProdutosSoltos.forEach((item: any) => {
        const cat = item.categoria || item.category || "Cardápio Geral";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });
      rawCategorias = Object.entries(grouped).map(([k, v]) => ({
        nome: k,
        produtos: v,
      }));
    }

    const finalCategorias = (Array.isArray(rawCategorias) ? rawCategorias : []).map(
      (cat: any) => {
        const catName = (
          cat.nome ||
          cat.name ||
          cat.categoria ||
          cat.category ||
          "Geral"
        ).trim();
        const rawProds =
          cat.produtos || cat.products || cat.itens || cat.items || [];
        const prodsList = (Array.isArray(rawProds) ? rawProds : []).map((p: any) => {
          const prodName = (p.nome || p.name || p.item || "Item").trim();
          const prodDesc = (p.descricao || p.description || "").trim();
          const prodPrice = Number(p.preco ?? p.price ?? p.valor ?? 0);
          const rawOpts = p.opcionais || p.options || p.adicionais || [];
          const optsList = (Array.isArray(rawOpts) ? rawOpts : []).map((opt: any) => ({
            nome: (opt.nome || opt.name || opt.item || "Adicional").trim(),
            preco: Number(opt.preco ?? opt.price ?? opt.valor ?? 0),
          }));
          const rawImg = (p.image || p.imagem || p.foto || p.img || "").trim();
          const prodImg = rawImg.startsWith("http") ? rawImg : generateProductImageUrl(prodName, catName, prodDesc);
          return {
            nome: prodName,
            descricao: prodDesc,
            preco: isNaN(prodPrice) ? 0 : prodPrice,
            image: prodImg,
            opcionais: optsList,
          };
        });
        return {
          nome: catName,
          produtos: prodsList,
        };
      }
    ).filter((c) => c.produtos.length > 0 || c.nome);

    return {
      nome_loja: storeName,
      descricao:
        parsed.descricao ||
        parsed.description ||
        `Cardápio Online de ${storeName}`,
      telefone:
        parsed.telefone?.replace(/\D/g, "") ||
        parsed.phone?.replace(/\D/g, "") ||
        parsed.whatsapp?.replace(/\D/g, "") ||
        "11999999999",
      primary_color: primaryColor,
      has_logo: Boolean(parsed.has_logo || parsed.hasLogo),
      logo_bounding_box: parsed.logo_bounding_box || parsed.logoBoundingBox,
      logo_svg: finalSvg,
      logo_url: logoUrl,
      categorias: finalCategorias,
    };
  } catch (error: any) {
    console.error("Erro ao analisar cardápio com Gemini:", error);
    throw new Error(
      error.message || "Falha ao processar o cardápio com a inteligência artificial."
    );
  }
}
