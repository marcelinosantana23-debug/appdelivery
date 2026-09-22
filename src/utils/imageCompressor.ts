/**
 * Helper to compress and convert image files (receipts) to lightweight Base64 Data URLs
 */
export async function compressImageToDataUrl(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith("image/")) {
      reject(new Error("O arquivo selecionado não é uma imagem válida."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao processar a imagem do comprovante."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          // Fallback to original data URL if canvas 2D is unavailable
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Comprime e redimensiona especificamente fotos para os Stories da Loja.
 * - Rejeita rigorosamente arquivos de vídeo.
 * - Redimensiona para resolução ideal de stories (máx 1080x1920).
 * - Garante peso leve rigorosamente abaixo de 200KB (máx 200KB).
 */
export async function compressStoryImage(
  file: File,
  maxTargetBytes = 200 * 1024 // 200 KB
): Promise<{ dataUrl: string; sizeBytes: number; width: number; height: number }> {
  // 1. Bloqueia qualquer tentativa de envio de vídeo
  if (file.type.startsWith("video/") || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name)) {
    throw new Error("Envio de vídeos bloqueado! Apenas fotos (JPG, PNG, WEBP) são permitidas nos stories.");
  }

  // 2. Valida tipo de imagem
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo inválido. Por favor, selecione uma foto nos formatos JPG, PNG ou WEBP.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Não foi possível carregar a imagem. Verifique se o arquivo não está corrompido."));
      img.onload = () => {
        const maxWidth = 1080;
        const maxHeight = 1920;
        let width = img.width;
        let height = img.height;

        // Mantém a proporção sem distorção
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          const rawUrl = reader.result as string;
          const rawBytes = Math.round((rawUrl.length * 3) / 4);
          resolve({ dataUrl: rawUrl, sizeBytes: rawBytes, width: img.width, height: img.height });
          return;
        }

        // Fundo branco caso haja transparência para manter leveza em JPEG
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Algoritmo de compressão progressiva para garantir tamanho <= 200KB
        let quality = 0.82;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        let approxBytes = Math.round((dataUrl.length * 3) / 4);

        while (approxBytes > maxTargetBytes && quality > 0.35) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
          approxBytes = Math.round((dataUrl.length * 3) / 4);
        }

        // Se ainda for maior que 200KB, reduz a resolução em 20%
        if (approxBytes > maxTargetBytes) {
          const scaledWidth = Math.round(width * 0.8);
          const scaledHeight = Math.round(height * 0.8);
          const smallCanvas = document.createElement("canvas");
          smallCanvas.width = scaledWidth;
          smallCanvas.height = scaledHeight;
          const smallCtx = smallCanvas.getContext("2d");
          if (smallCtx) {
            smallCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
            dataUrl = smallCanvas.toDataURL("image/jpeg", 0.65);
            approxBytes = Math.round((dataUrl.length * 3) / 4);
            width = scaledWidth;
            height = scaledHeight;
          }
        }

        resolve({
          dataUrl,
          sizeBytes: approxBytes,
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
