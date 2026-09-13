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
    lines.push(`PIX - Chave: ${config.pixKey}`);
  } else if (order.paymentMethod === "card") {
    lines.push("Cartão na entrega");
  } else if (order.paymentMethod === "cash") {
    lines.push("Dinheiro");
    if (order.changeFor) {
      lines.push(`Troco para: ${formatPrice(parseFloat(order.changeFor), config)}`);
    }
  }

  return encodeURIComponent(lines.join("\n"));
}

export function getWhatsAppUrl(order: Order, config: StoreConfig): string {
  return `https://wa.me/${config.whatsapp}?text=${buildWhatsAppMessage(order, config)}`;
}
