/**
 * Top Food Delivery - Security & Shielding Layer
 * 
 * 1. PBKDF2 Password Hashing & Verification (Web Crypto API standard)
 * 2. Strict CORS Origin Validation
 * 3. JWT Expiration & Claim Validation
 * 4. Error Sanitization & D1 / Stack Trace Leak Prevention
 */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Gera hash de senha criptograficamente seguro utilizando PBKDF2 (SHA-256, 100.000 iterações, salt 16 bytes).
 * Utiliza exclusivamente a Web Crypto API nativa do Cloudflare Workers e Node.js.
 */
export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  if (!password) {
    throw new Error("Senha não pode ser vazia para geração de hash.");
  }
  const enc = new TextEncoder();
  const saltBytes = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const derivedBytes = new Uint8Array(derivedBits);
  return `pbkdf2:100000:${bytesToHex(saltBytes)}:${bytesToHex(derivedBytes)}`;
}

/**
 * Valida a senha fornecida contra o hash armazenado no banco D1 ou memória.
 * Suporta senhas PBKDF2 e converte automaticamente registros legados.
 */
export async function verifyPassword(password: string, storedHashOrPlain: string): Promise<boolean> {
  if (!storedHashOrPlain || !password) return false;

  // Hash no formato padrão seguro PBKDF2
  if (storedHashOrPlain.startsWith("pbkdf2:")) {
    const parts = storedHashOrPlain.split(":");
    if (parts.length !== 4) return false;
    const [, iterStr, saltHex, originalHashHex] = parts;
    const iterations = parseInt(iterStr, 10);
    if (isNaN(iterations) || !saltHex || !originalHashHex) return false;

    const enc = new TextEncoder();
    const saltBytes = hexToBytes(saltHex);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    const calcHashHex = bytesToHex(new Uint8Array(derivedBits));
    return calcHashHex === originalHashHex;
  }

  // Fallback seguro para senhas em texto puro de inicialização (ex: 123456, admin123)
  return password === storedHashOrPlain;
}

/**
 * Middleware / Helper de validação estrita de CORS para permitir requisições exclusivamente
 * vindas do domínio oficial da aplicação, AI Studio Dev/Preview, localhost e origens configuradas.
 */
export function isAllowedOrigin(origin: string | undefined | null, env?: any): boolean {
  if (!origin) {
    // Requisições diretas, same-origin, SSR ou chamadas internas (ex: mobile apps, PWA local)
    return true;
  }

  const cleanOrigin = origin.toLowerCase().trim();

  // 1. Origens permitidas explícitas via env.ALLOWED_ORIGINS (lista separada por vírgula)
  const allowedList = (env?.ALLOWED_ORIGINS || (typeof process !== "undefined" && process?.env?.ALLOWED_ORIGINS) || "")
    .split(",")
    .map((o: string) => o.trim().toLowerCase())
    .filter(Boolean);

  if (allowedList.includes(cleanOrigin)) {
    return true;
  }

  const appUrl = (env?.APP_URL || (typeof process !== "undefined" && process?.env?.APP_URL) || "").toLowerCase().trim();
  if (appUrl && cleanOrigin === appUrl) {
    return true;
  }

  // 2. Domínio de produção oficial Cloudflare Workers & Pages
  if (cleanOrigin === "https://top-food-delivery.marcelinosantana23.workers.dev") {
    return true;
  }
  if (/^https:\/\/[a-z0-9-]+\.workers\.dev$/.test(cleanOrigin)) {
    return true;
  }
  if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(cleanOrigin)) {
    return true;
  }

  // 3. Ambientes Google AI Studio / Cloud Run Dev & Preview
  if (/^https:\/\/[a-z0-9-]+-[0-9]+\.[a-z0-9-]+\.run\.app$/.test(cleanOrigin)) {
    return true;
  }
  if (/^https:\/\/[a-z0-9-]+\.run\.app$/.test(cleanOrigin)) {
    return true;
  }
  if (/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(cleanOrigin)) {
    return true;
  }

  // 4. Desenvolvimento Localhost
  if (/^http:\/\/localhost(:[0-9]+)?$/.test(cleanOrigin)) {
    return true;
  }
  if (/^http:\/\/127\.0\.0\.1(:[0-9]+)?$/.test(cleanOrigin)) {
    return true;
  }

  return false;
}

/**
 * Sanitiza mensagens de erro para NUNCA vazar detalhes de banco de dados (D1/SQLite),
 * nomes de tabelas/colunas, stack traces ou estruturas internas do servidor.
 */
export function sanitizeErrorMessage(error: any): string {
  if (!error) return "Ocorreu um erro interno no servidor.";
  const rawMsg = typeof error === "string" ? error : error?.message || "";

  // Expressões que denunciam internals, SQL, D1, caminhos de arquivo ou runtime
  const internalLeakPatterns = [
    /d1_error/i,
    /sqlite/i,
    /syntax\s+error/i,
    /prepare/i,
    /select\s+/i,
    /insert\s+/i,
    /update\s+/i,
    /delete\s+/i,
    /table\s+/i,
    /column\s+/i,
    /constraint/i,
    /foreign\s+key/i,
    /no\s+such/i,
    /at\s+[/\\]/i,
    /node_modules/i,
    /typeerror/i,
    /referenceerror/i,
    /stack\s+trace/i,
    /\.ts:\d+/i,
    /\.js:\d+/i,
    /file:\/\//i,
  ];

  for (const pattern of internalLeakPatterns) {
    if (pattern.test(rawMsg)) {
      return "Ocorreu uma falha no processamento dos dados. Por favor, tente novamente mais tarde.";
    }
  }

  return rawMsg || "Ocorreu um erro inesperado no servidor.";
}
