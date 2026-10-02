import type { Order } from "@/types";
import type { StoreConfig } from "@/config/store";

export function formatPrice(value: number, config: StoreConfig): string {
  return `${config.currency} ${value.toFixed(2).replace(".", ",")}`;
}

export function generateOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `#${num}`;
}

export function buildWhatsAppMessage(order: Order, config: StoreConfig): string {
  const lines: string[] = [];
  lines.push(`*NOVO PEDIDO - ${config.name}*`);
  lines.push(`Pedido: ${order.id}`);
  lines.push(`Cliente: ${order.customerName}`);
  lines.push(`Telefone: ${order.customerPhone}`);
  lines.push(`Data: ${new Date(order.createdAt).toLocaleString("pt-BR")}`);
  lines.push("");
  lines.push("*ITENS DO PEDIDO:*");
  order.items.forEach((item) => {
    lines.push(`• ${item.quantity}x ${item.product.name} - ${formatPrice(item.product.price * item.quantity, config)}`);
    if (item.selectedOptions.length > 0) {
      item.selectedOptions.forEach((opt) => {
        if (opt.price > 0) {
          lines.push(`  ➕ ${opt.name} (${formatPrice(opt.price, config)})`);
        } else {
          lines.push(`  ${opt.name}`);
        }
      });
    }
    if (item.notes) {
      lines.push(`  📝 ${item.notes}`);
    }
  });
  lines.push("");
  lines.push(`Subtotal: ${formatPrice(order.subtotal, config)}`);
  if (order.orderType === "delivery") {
    lines.push(`Taxa de entrega: ${formatPrice(order.deliveryFee, config)}`);
  }
  lines.push(`*TOTAL: ${formatPrice(order.total, config)}*`);
  lines.push("");
  lines.push(order.orderType === "delivery" ? "*ENTREGA*" : "*RETIRADA NO BALCÃO*");
  if (order.orderType === "delivery" && order.address) {
    lines.push(`Rua: ${order.address.street}, ${order.address.number}`);
    lines.push(`Bairro: ${order.address.district}`);
    if (order.address.complement) lines.push(`Complemento: ${order.address.complement}`);
    if (order.address.reference) lines.push(`Referência: ${order.address.reference}`);
    const locUrl = order.location_url || order.locationUrl;
    if (locUrl) {
      lines.push(`📍 *Rota do GPS:* ${locUrl}`);
    }
  }
  lines.push("");
  lines.push("*PAGAMENTO:*");
  if (order.paymentMethod === "pix") {
    lines.push(`PIX - Comprovante anexado no sistema`);
    if (config.pixKey) {
      lines.push(`Chave PIX: ${config.pixKey}`);
    }
  } else if (order.paymentMethod === "card") {
    const cardDetail = order.cardType === "credit" ? "Crédito" : order.cardType === "debit" ? "Débito" : "Débito/Crédito";
    lines.push(`Cartão na entrega (${cardDetail})`);
  } else if (order.paymentMethod === "cash") {
    lines.push("Dinheiro");
    if (order.changeFor) {
      lines.push(`Troco para: ${formatPrice(parseFloat(order.changeFor), config)}`);
    }
  }

  return encodeURIComponent(lines.join("\n"));
}

export function buildMotoboyWhatsAppMessage(order: Order, config: StoreConfig): string {
  const lines: string[] = [];
  lines.push(`🛵 *ENTREGA DE PEDIDO - ${config.name}*`);
  lines.push(`*Pedido:* ${order.id}`);
  lines.push(`*Cliente:* ${order.customerName}`);
  lines.push(`*Telefone:* ${order.customerPhone}`);
  lines.push("");
  lines.push("*ENDEREÇO DE ENTREGA:*");
  if (order.address) {
    lines.push(`Rua: ${order.address.street}, Nº ${order.address.number}`);
    lines.push(`Bairro: ${order.address.district}`);
    if (order.address.complement) lines.push(`Complemento: ${order.address.complement}`);
    if (order.address.reference) lines.push(`Ponto de Referência: ${order.address.reference}`);
  }
  const locUrl = order.location_url || order.locationUrl;
  if (locUrl) {
    lines.push(`📍 *Rota do GPS:* ${locUrl}`);
  } else if (order.address) {
    const mapsQuery = encodeURIComponent(`${order.address.street}, ${order.address.number}, ${order.address.district}`);
    lines.push(`📍 *Rota no Google Maps:* https://www.google.com/maps/search/?api=1&query=${mapsQuery}`);
  }
  lines.push("");
  lines.push("*PAGAMENTO / COBRANÇA:*");
  if (order.paymentMethod === "pix") {
    lines.push("✓ *PAGO VIA PIX* (Não cobrar nada do cliente)");
  } else if (order.paymentMethod === "card") {
    const cardDetail = order.cardType === "credit" ? "Crédito" : order.cardType === "debit" ? "Débito" : "Cartão";
    lines.push(`💳 *LEVAR MÁQUINA DE CARTÃO* (${cardDetail})`);
    lines.push(`*Cobrar do Cliente:* ${formatPrice(order.total, config)}`);
  } else if (order.paymentMethod === "cash") {
    if (order.changeFor) {
      const trocoCalculado = parseFloat(order.changeFor) - order.total;
      lines.push(`💵 *DINHEIRO* - Paga com R$ ${order.changeFor}`);
      lines.push(`*Levar de Troco:* ${formatPrice(Math.max(0, trocoCalculado), config)}`);
      lines.push(`*Cobrar do Cliente:* ${formatPrice(order.total, config)}`);
    } else {
      lines.push(`💵 *DINHEIRO* - Sem troco (valor exato)`);
      lines.push(`*Cobrar do Cliente:* ${formatPrice(order.total, config)}`);
    }
  }
  lines.push("");
  lines.push(`*VALOR TOTAL DO PEDIDO:* ${formatPrice(order.total, config)}`);
  lines.push("");
  lines.push("*ITENS A ENTREGAR:*");
  order.items.forEach((item) => {
    lines.push(`• ${item.quantity}x ${item.product.name}`);
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      lines.push(`  + ${item.selectedOptions.map((o) => o.name).join(", ")}`);
    }
    if (item.notes) {
      lines.push(`  Obs: ${item.notes}`);
    }
  });

  return encodeURIComponent(lines.join("\n"));
}

export function getMotoboyWhatsAppUrl(order: Order, config: StoreConfig, motoboyPhone?: string): string {
  const text = buildMotoboyWhatsAppMessage(order, config);
  const targetPhone = (motoboyPhone || config.motoboyPhone || "").trim();
  if (targetPhone) {
    const cleanPhone = targetPhone.replace(/\D/g, "");
    if (cleanPhone) {
      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      return `https://wa.me/${formattedPhone}?text=${text}`;
    }
  }
  return `https://api.whatsapp.com/send?text=${text}`;
}

export function getWhatsAppUrl(order: Order, config: StoreConfig): string {
  const cleanPhone = (config.whatsapp || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${formattedPhone}?text=${buildWhatsAppMessage(order, config)}`;
}

export function getMerchantSupportWhatsAppUrl(order: Order, config: StoreConfig): string {
  const cleanPhone = (config.whatsapp || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const text = encodeURIComponent(
    `Olá, acabei de fazer o pedido ${order.id} no valor de ${formatPrice(order.total, config)} pelo Top Food e gostaria de tirar uma dúvida!`
  );
  return `https://wa.me/${formattedPhone}?text=${text}`;
}
