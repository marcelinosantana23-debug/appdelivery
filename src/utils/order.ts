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
