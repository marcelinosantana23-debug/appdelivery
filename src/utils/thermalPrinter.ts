import type { Order } from "@/types";
import type { StoreConfig } from "@/config/store";
import { formatPrice, formatOrderExactDateTime } from "@/utils/order";

export type ThermalPaperWidth = "58mm" | "80mm";

/**
 * Remove acentos e caracteres especiais para compatibilidade com impressoras térmicas
 * ESC/POS genéricas (evita caracteres corrompidos em impressoras chinesas/sem tabela de página configurada).
 */
export function removeDiacritics(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/º/g, "o")
    .replace(/ª/g, "a")
    .replace(/§/g, "S")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ");
}

/**
 * Formata linha com texto à esquerda e texto à direita justificados
 */
export function formatJustifiedLine(left: string, right: string, width: number): string {
  const cleanLeft = removeDiacritics(left);
  const cleanRight = removeDiacritics(right);
  const totalLength = cleanLeft.length + cleanRight.length;

  if (totalLength >= width) {
    // Se estourar a largura, corta a esquerda para caber a direita
    const maxLeft = Math.max(0, width - cleanRight.length - 1);
    return `${cleanLeft.substring(0, maxLeft)} ${cleanRight}`;
  }

  const spaces = " ".repeat(width - totalLength);
  return `${cleanLeft}${spaces}${cleanRight}`;
}

/**
 * Centraliza uma linha de texto
 */
export function formatCenteredLine(text: string, width: number): string {
  const clean = removeDiacritics(text).trim();
  if (clean.length >= width) return clean.substring(0, width);
  const leftPadding = Math.floor((width - clean.length) / 2);
  const rightPadding = width - clean.length - leftPadding;
  return `${" ".repeat(leftPadding)}${clean}${" ".repeat(rightPadding)}`;
}

/**
 * Gera representação em texto puro monoespaçado do cupom térmico
 */
export function generatePlainTextReceipt(
  order: Order,
  config: StoreConfig,
  widthType: ThermalPaperWidth = "58mm",
  orderTag: "VIA LOJA/COZINHA" | "VIA CLIENTE" | "COMPROVANTE" = "COMPROVANTE"
): string {
  const cols = widthType === "58mm" ? 32 : 48;
  const divider = "-".repeat(cols);
  const doubleDivider = "=".repeat(cols);

  const lines: string[] = [];

  // Cabeçalho
  lines.push(doubleDivider);
  lines.push(formatCenteredLine(config.name.toUpperCase(), cols));
  if (config.tagline) {
    lines.push(formatCenteredLine(config.tagline, cols));
  }
  if (config.address) {
    lines.push(formatCenteredLine(config.address, cols));
  }
  if (config.whatsapp) {
    lines.push(formatCenteredLine(`WhatsApp: ${config.whatsapp}`, cols));
  }
  lines.push(doubleDivider);

  // Identificação do Pedido
  lines.push(formatCenteredLine(`PEDIDO ${order.id}`, cols));
  lines.push(formatCenteredLine(`[ ${orderTag} ]`, cols));
  const exactTime = formatOrderExactDateTime(order.createdAt, order as any) || new Date().toLocaleString("pt-BR");
  lines.push(formatJustifiedLine("Data/Hora:", exactTime, cols));

  const isDineIn = order.orderType === "dine_in" || (order as any).delivery_type === "dine_in";
  const isPickup = order.orderType === "pickup" || (order as any).delivery_type === "pickup";
  const tableNum = order.tableNumber || (order as any).table_number || (order as any).table || "";

  const tipoStr = isDineIn
    ? `CONSUMIR AQUI - MESA ${tableNum || "S/N"}`
    : isPickup
    ? "RETIRADA NO BALCAO"
    : "ENTREGA A DOMICILIO";
  lines.push(formatJustifiedLine("Tipo:", tipoStr, cols));
  lines.push(divider);

  // Dados do Cliente
  lines.push("DADOS DO CLIENTE:");
  lines.push(`Nome: ${removeDiacritics(order.customerName || "Cliente")}`);
  lines.push(`Tel/Whats: ${order.customerPhone || "Nao informado"}`);

  if (isDineIn) {
    lines.push(doubleDivider);
    lines.push(formatCenteredLine(`*** CONSUMIR AQUI - MESA ${tableNum || "S/N"} ***`, cols));
    lines.push(formatCenteredLine("ATENDIMENTO: SERVIR NA MESA", cols));
    lines.push(doubleDivider);
  } else if (!isPickup && order.address) {
    lines.push("ENDERECO DE ENTREGA:");
    lines.push(`${removeDiacritics(order.address.street || "")}, No ${order.address.number || "S/N"}`);
    if (order.address.district) {
      lines.push(`Bairro: ${removeDiacritics(order.address.district)}`);
    }
    if (order.address.complement) {
      lines.push(`Compl: ${removeDiacritics(order.address.complement)}`);
    }
    if (order.address.reference) {
      lines.push(`Ref: ${removeDiacritics(order.address.reference)}`);
    }
    if (order.location_url || order.locationUrl) {
      lines.push("[x] Coordenadas GPS anexadas");
    }
  } else if (isPickup) {
    lines.push("* CLIENTE RETIRA NO LOCAL / BALCAO *");
  }
  lines.push(divider);

  // Itens do Pedido
  lines.push(formatJustifiedLine("ITEM / QTD", "VALOR", cols));
  lines.push(divider);

  const items = order.items || [];
  let calculatedSubtotal = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const prodName = item.product?.name || (item as any).name || "Produto";
    const unitPrice = Number(item.product?.price ?? (item as any).price ?? 0);
    const itemSubtotal = unitPrice * qty;
    calculatedSubtotal += itemSubtotal;

    // Linha do produto principal
    const itemHeader = `${qty}x ${prodName}`;
    const priceStr = formatPrice(itemSubtotal, config);
    lines.push(formatJustifiedLine(itemHeader, priceStr, cols));

    // Adicionais e opcionais escolhidos
    if (Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
      for (const opt of item.selectedOptions) {
        const optName = typeof opt === "string" ? opt : opt.name;
        const optPrice = typeof opt === "object" && opt.price ? Number(opt.price) * qty : 0;
        if (optPrice > 0) {
          calculatedSubtotal += optPrice;
          lines.push(formatJustifiedLine(`  + ${optName}`, formatPrice(optPrice, config), cols));
        } else {
          lines.push(`  + ${removeDiacritics(optName)}`);
        }
      }
    }

    // Observações do item
    if (item.notes && item.notes.trim()) {
      lines.push(`  Obs: ${removeDiacritics(item.notes.trim())}`);
    }
  }

  lines.push(divider);

  // Resumo Financeiro
  const isDelivery = !isPickup && !isDineIn;
  const subtotal = Number(order.subtotal) || calculatedSubtotal;
  const deliveryFee = isDelivery ? Number(order.deliveryFee ?? config.deliveryFee ?? 0) : 0;
  const total = Number(order.total) || (subtotal + deliveryFee);

  lines.push(formatJustifiedLine("Subtotal dos Itens:", formatPrice(subtotal, config), cols));
  if (isDelivery) {
    lines.push(formatJustifiedLine("Taxa de Entrega:", formatPrice(deliveryFee, config), cols));
  }
  lines.push(formatJustifiedLine("TOTAL DO PEDIDO:", formatPrice(total, config), cols));
  lines.push(divider);

  // Forma de Pagamento
  lines.push("FORMA DE PAGAMENTO:");
  if (order.paymentMethod === "pix") {
    lines.push("PAGAMENTO VIA PIX");
    if (order.pixReceiptUrl || order.pix_receipt_url) {
      lines.push("[x] Comprovante anexado no sistema");
    }
  } else if (order.paymentMethod === "card") {
    const cardKind =
      order.cardType === "credit"
        ? "Cartao de Credito"
        : order.cardType === "debit"
        ? "Cartao de Debito"
        : "Cartao Maquininha";
    lines.push(`${cardKind} na Entrega`);
  } else if (order.paymentMethod === "cash") {
    lines.push("Dinheiro na Entrega");
    if (order.changeFor) {
      const changeNum = parseFloat(String(order.changeFor).replace(",", "."));
      const changeValue = !isNaN(changeNum) ? changeNum - total : 0;
      lines.push(`Troco para: R$ ${order.changeFor}`);
      if (changeValue > 0) {
        lines.push(formatJustifiedLine("Valor do Troco a Levar:", formatPrice(changeValue, config), cols));
      }
    } else {
      lines.push("Sem necessidade de troco");
    }
  } else {
    lines.push(removeDiacritics(order.paymentMethod || "A combinar"));
  }

  lines.push(doubleDivider);
  lines.push(formatCenteredLine("Agradecemos a preferencia!", cols));
  lines.push(formatCenteredLine("Top Food Delivery", cols));
  lines.push(doubleDivider);

  return lines.join("\n");
}

/**
 * Constrói os comandos binários ESC/POS para envio direto à impressora térmica via Bluetooth / USB
 */
export function generateEscPosBuffer(
  order: Order,
  config: StoreConfig,
  widthType: ThermalPaperWidth = "58mm",
  orderTag: "VIA LOJA/COZINHA" | "VIA CLIENTE" | "COMPROVANTE" = "COMPROVANTE"
): Uint8Array {
  const cols = widthType === "58mm" ? 32 : 48;
  const buffer: number[] = [];

  // Comandos ESC/POS padrão
  const ESC = 0x1b;
  const GS = 0x1d;

  // 1. Inicializar impressora (ESC @)
  buffer.push(ESC, 0x40);

  // 2. Tabela de caracteres padrão ASCII/USA (ESC t 0)
  buffer.push(ESC, 0x74, 0x00);

  // Helper para adicionar texto ASCII
  const appendText = (text: string) => {
    const clean = removeDiacritics(text);
    for (let i = 0; i < clean.length; i++) {
      buffer.push(clean.charCodeAt(i));
    }
  };

  const appendLine = (text: string = "") => {
    appendText(text);
    buffer.push(0x0a); // LF
  };

  const setAlign = (align: "left" | "center" | "right") => {
    const val = align === "left" ? 0x00 : align === "center" ? 0x01 : 0x02;
    buffer.push(ESC, 0x61, val);
  };

  const setBold = (bold: boolean) => {
    buffer.push(ESC, 0x45, bold ? 0x01 : 0x00);
  };

  const setTextSize = (doubleWidth: boolean, doubleHeight: boolean) => {
    let n = 0;
    if (doubleWidth) n |= 0x20;
    if (doubleHeight) n |= 0x01;
    buffer.push(GS, 0x21, n);
  };

  const divider = "-".repeat(cols);
  const doubleDivider = "=".repeat(cols);

  // Cabeçalho Centralizado
  setAlign("center");
  setBold(true);
  setTextSize(true, true);
  appendLine(config.name.toUpperCase());
  setTextSize(false, false);
  setBold(false);

  if (config.tagline) {
    appendLine(config.tagline);
  }
  if (config.address) {
    appendLine(config.address);
  }
  if (config.whatsapp) {
    appendLine(`Whats: ${config.whatsapp}`);
  }
  appendLine(doubleDivider);

  // Pedido e Tag
  setBold(true);
  setTextSize(true, true);
  appendLine(`PEDIDO ${order.id}`);
  setTextSize(false, false);
  appendLine(`[ ${orderTag} ]`);
  setBold(false);

  setAlign("left");
  const exactTime = formatOrderExactDateTime(order.createdAt, order as any) || new Date().toLocaleString("pt-BR");
  appendLine(formatJustifiedLine("Data/Hora:", exactTime, cols));

  const isDineIn = order.orderType === "dine_in" || (order as any).delivery_type === "dine_in";
  const isPickup = order.orderType === "pickup" || (order as any).delivery_type === "pickup";
  const isDelivery = !isPickup && !isDineIn;
  const tableNum = order.tableNumber || (order as any).table_number || (order as any).table || "";

  setBold(true);
  const tipoStr = isDineIn
    ? `CONSUMIR AQUI - MESA ${tableNum || "S/N"}`
    : isPickup
    ? "RETIRADA NO BALCAO"
    : "ENTREGA A DOMICILIO";
  appendLine(formatJustifiedLine("Tipo:", tipoStr, cols));
  setBold(false);
  appendLine(divider);

  // Dados do Cliente
  setBold(true);
  appendLine("DADOS DO CLIENTE:");
  setBold(false);
  appendLine(`Nome: ${removeDiacritics(order.customerName || "Cliente")}`);
  appendLine(`Tel/Whats: ${order.customerPhone || "Nao informado"}`);

  if (isDineIn) {
    appendLine(doubleDivider);
    setBold(true);
    setTextSize(false, true);
    appendLine(formatCenteredLine(`*** CONSUMIR AQUI - MESA ${tableNum || "S/N"} ***`, cols));
    setTextSize(false, false);
    appendLine(formatCenteredLine("ATENDIMENTO: SERVIR NA MESA", cols));
    setBold(false);
    appendLine(doubleDivider);
  } else if (!isPickup && order.address) {
    setBold(true);
    appendLine("ENDERECO DE ENTREGA:");
    setBold(false);
    appendLine(`${removeDiacritics(order.address.street || "")}, No ${order.address.number || "S/N"}`);
    if (order.address.district) {
      appendLine(`Bairro: ${removeDiacritics(order.address.district)}`);
    }
    if (order.address.complement) {
      appendLine(`Compl: ${removeDiacritics(order.address.complement)}`);
    }
    if (order.address.reference) {
      setBold(true);
      appendLine(`Ref: ${removeDiacritics(order.address.reference)}`);
      setBold(false);
    }
    if (order.location_url || order.locationUrl) {
      appendLine("[x] Localizacao GPS anexada");
    }
  } else if (isPickup) {
    setBold(true);
    appendLine(">> CLIENTE RETIRA NO LOCAL / BALCAO <<");
    setBold(false);
  }
  appendLine(divider);

  // Itens
  setBold(true);
  appendLine(formatJustifiedLine("ITEM / QTD", "VALOR", cols));
  setBold(false);
  appendLine(divider);

  let calculatedSubtotal = 0;
  for (const item of order.items || []) {
    const qty = Number(item.quantity) || 1;
    const prodName = item.product?.name || (item as any).name || "Produto";
    const unitPrice = Number(item.product?.price ?? (item as any).price ?? 0);
    const itemSubtotal = unitPrice * qty;
    calculatedSubtotal += itemSubtotal;

    setBold(true);
    appendLine(formatJustifiedLine(`${qty}x ${prodName}`, formatPrice(itemSubtotal, config), cols));
    setBold(false);

    if (Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
      for (const opt of item.selectedOptions) {
        const optName = typeof opt === "string" ? opt : opt.name;
        const optPrice = typeof opt === "object" && opt.price ? Number(opt.price) * qty : 0;
        if (optPrice > 0) {
          calculatedSubtotal += optPrice;
          appendLine(formatJustifiedLine(`  + ${optName}`, formatPrice(optPrice, config), cols));
        } else {
          appendLine(`  + ${removeDiacritics(optName)}`);
        }
      }
    }

    if (item.notes && item.notes.trim()) {
      appendLine(`  Obs: ${removeDiacritics(item.notes.trim())}`);
    }
  }
  appendLine(divider);

  // Financeiro
  const subtotal = Number(order.subtotal) || calculatedSubtotal;
  const deliveryFee = isDelivery ? Number(order.deliveryFee ?? config.deliveryFee ?? 0) : 0;
  const total = Number(order.total) || (subtotal + deliveryFee);

  appendLine(formatJustifiedLine("Subtotal dos Itens:", formatPrice(subtotal, config), cols));
  if (isDelivery) {
    appendLine(formatJustifiedLine("Taxa de Entrega:", formatPrice(deliveryFee, config), cols));
  }

  setBold(true);
  setTextSize(false, true);
  appendLine(formatJustifiedLine("TOTAL DO PEDIDO:", formatPrice(total, config), cols));
  setTextSize(false, false);
  setBold(false);
  appendLine(divider);

  // Pagamento
  setBold(true);
  appendLine("PAGAMENTO:");
  if (order.paymentMethod === "pix") {
    appendLine("PIX (PAGAMENTO INSTANTANEO)");
  } else if (order.paymentMethod === "card") {
    const cardKind =
      order.cardType === "credit"
        ? "Cartao de Credito"
        : order.cardType === "debit"
        ? "Cartao de Debito"
        : "Cartao Maquininha";
    appendLine(`${cardKind} na Entrega`);
  } else if (order.paymentMethod === "cash") {
    appendLine("Dinheiro na Entrega");
    if (order.changeFor) {
      appendLine(`Troco para: R$ ${order.changeFor}`);
    }
  } else {
    appendLine(removeDiacritics(order.paymentMethod || "A combinar"));
  }
  setBold(false);

  appendLine(doubleDivider);
  setAlign("center");
  appendLine("Agradecemos a preferencia!");
  appendLine("Top Food Delivery");
  appendLine(doubleDivider);

  // Alimentar papel e corte (GS V 0)
  appendLine("\n\n\n\n");
  buffer.push(GS, 0x56, 0x00);

  return new Uint8Array(buffer);
}

/**
 * Imprime via iframe isolado no navegador nativo com formatação perfeita para bobina térmica 58mm / 80mm
 */
export function printReceiptViaBrowser(
  receiptHtml: string,
  widthType: ThermalPaperWidth = "58mm"
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const widthMm = widthType === "58mm" ? "58mm" : "80mm";
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Impressao de Pedido</title>
  <style>
    @page {
      size: ${widthMm} auto;
      margin: 0;
    }
    @media print {
      body {
        margin: 0;
        padding: 4mm;
        width: ${widthMm};
        box-sizing: border-box;
      }
    }
    body {
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: ${widthType === "58mm" ? "11px" : "13px"};
      line-height: 1.25;
      color: #000;
      background: #fff;
      margin: 0 auto;
      width: ${widthMm};
      box-sizing: border-box;
      padding: 4mm;
      text-transform: uppercase;
      word-wrap: break-word;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .text-lg { font-size: 1.25em; }
    .text-xl { font-size: 1.45em; }
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 8px 0;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3px;
    }
    .item-desc {
      padding-left: 8px;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  ${receiptHtml}
</body>
</html>
      `;

      doc.open();
      doc.write(fullHtml);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch {
              // ignore
            }
            resolve(true);
          }, 1000);
        } catch (e) {
          console.warn("Browser print error:", e);
          document.body.removeChild(iframe);
          resolve(false);
        }
      }, 350);
    } catch (e) {
      console.warn("Print error:", e);
      resolve(false);
    }
  });
}

/**
 * Conexão e impressão direta via Web Bluetooth API (ESC/POS)
 */
export async function printViaWebBluetooth(
  order: Order,
  config: StoreConfig,
  widthType: ThermalPaperWidth = "58mm",
  orderTag: "VIA LOJA/COZINHA" | "VIA CLIENTE" | "COMPROVANTE" = "COMPROVANTE"
): Promise<{ success: boolean; error?: string }> {
  if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
    return {
      success: false,
      error:
        "Seu navegador não possui suporte direto à Web Bluetooth API. Use o botão 'Imprimir (Nativo / USB)' para imprimir usando a impressora pareada no sistema.",
    };
  }

  try {
    const bluetooth = (navigator as any).bluetooth;

    // Serviços comuns de impressoras térmicas bluetooth chinesas/POS (POS-58, MTP-II, Goojprt, etc.)
    const device = await bluetooth.requestDevice({
      filters: [
        { services: ["000018f0-0000-1000-8000-00805f9b34fb"] },
        { services: ["e7810a71-73ae-499d-8c15-faa9aef0c3f2"] },
        { services: ["49535343-fe7d-4ae5-8fa9-9fafd205e455"] },
        { services: ["0000ff00-0000-1000-8000-00805f9b34fb"] },
        { services: ["0000ffe0-0000-1000-8000-00805f9b34fb"] },
      ],
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
        "0000ff00-0000-1000-8000-00805f9b34fb",
        "0000ffe0-0000-1000-8000-00805f9b34fb",
      ],
      acceptAllDevices: true,
    });

    if (!device) {
      return { success: false, error: "Nenhuma impressora Bluetooth foi selecionada." };
    }

    const server = await device.gatt.connect();

    // Tenta encontrar um dos serviços primários conhecidos
    let characteristic: any = null;
    const knownServices = [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      "0000ff00-0000-1000-8000-00805f9b34fb",
      "0000ffe0-0000-1000-8000-00805f9b34fb",
    ];

    for (const sUuid of knownServices) {
      try {
        const service = await server.getPrimaryService(sUuid);
        if (service) {
          const chars = await service.getCharacteristics();
          for (const ch of chars) {
            if (ch.properties.write || ch.properties.writeWithoutResponse) {
              characteristic = ch;
              break;
            }
          }
          if (characteristic) break;
        }
      } catch {
        // tenta o próximo serviço
      }
    }

    if (!characteristic) {
      server.disconnect();
      return {
        success: false,
        error: "Não foi possível encontrar o canal de escrita na impressora Bluetooth selecionada.",
      };
    }

    const data = generateEscPosBuffer(order, config, widthType, orderTag);

    // Envio seguro em blocos menores (100 bytes) para evitar estouro de buffer BLE MTU
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValue(chunk);
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    setTimeout(() => {
      try {
        server.disconnect();
      } catch {
        // ignore
      }
    }, 1500);

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro de comunicação com a impressora Bluetooth.",
    };
  }
}
