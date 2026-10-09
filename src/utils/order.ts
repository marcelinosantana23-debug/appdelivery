import type { Order } from "@/types";
import type { StoreConfig } from "@/config/store";

export function formatPrice(value: number, config: StoreConfig): string {
  return `${config.currency} ${value.toFixed(2).replace(".", ",")}`;
}

/**
 * Formatação inteligente de tempo relativo para histórico de pedidos:
 * - Menos de 1 hora: "agora mesmo" ou "há X min"
 * - Menos de 24 horas: "há 1 hora", "há X horas"
 * - De 1 a 6 dias: "há 1 dia", "há X dias"
 * - De 1 a 4 semanas (7 a 29 dias): "há 1 semana", "há X semanas"
 * - Acima de 1 mês (30+ dias): "há 1 mês", "há X meses"
 */
export function formatRelativeOrderTime(timestamp: number | string | undefined, nowMs: number = Date.now()): string {
  if (!timestamp) return "agora";
  const createdMs = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
  if (isNaN(createdMs)) return "agora";

  const diffMs = Math.max(0, nowMs - createdMs);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "agora mesmo";
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "há 1 min" : `há ${diffMinutes} min`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? "há 1 hora" : `há ${diffHours} horas`;
  }
  if (diffDays <= 6) {
    return diffDays === 1 ? "há 1 dia" : `há ${diffDays} dias`;
  }
  if (diffDays < 30) {
    const weeks = Math.max(1, Math.min(4, Math.floor(diffDays / 7)));
    return weeks === 1 ? "há 1 semana" : `há ${weeks} semanas`;
  }
  const months = Math.max(1, Math.floor(diffDays / 30));
  if (months < 12) {
    return months === 1 ? "há 1 mês" : `há ${months} meses`;
  }
  const years = Math.floor(months / 12);
  return years === 1 ? "há 1 ano" : `há ${years} anos`;
}

/**
 * Formata a data e hora exata do pedido para auditoria (ex: "09/10 às 14:30")
 */
export function formatOrderExactDateTime(timestamp: number | string | undefined): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} às ${timePart}`;
}

export interface OrderTimeGroup {
  id: string;
  title: string;
  subtitle: string;
  badgeColor: string;
  orders: Order[];
}

/**
 * Ordena os pedidos do mais recente para o mais antigo e agrupa em blocos temporais claros
 * (Pedidos de Hoje, Ontem, Esta Semana, Semana Passada, Este Mês, Meses Anteriores)
 */
export function groupOrdersByTemporalBlock(orders: Order[], nowMs: number = Date.now()): OrderTimeGroup[] {
  const sorted = [...orders].sort((a, b) => {
    const timeA = typeof a.createdAt === "number" ? a.createdAt : new Date(a.createdAt || 0).getTime();
    const timeB = typeof b.createdAt === "number" ? b.createdAt : new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfLast7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const startOfLast14Days = startOfToday - 13 * 24 * 60 * 60 * 1000;
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();

  const buckets: Record<string, OrderTimeGroup> = {
    today: {
      id: "today",
      title: "Pedidos de Hoje",
      subtitle: "Recebidos nas últimas horas de hoje",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      orders: [],
    },
    yesterday: {
      id: "yesterday",
      title: "Ontem",
      subtitle: "Pedidos realizados ontem",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      orders: [],
    },
    this_week: {
      id: "this_week",
      title: "Últimos 7 Dias",
      subtitle: "Pedidos desta semana (2 a 6 dias atrás)",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      orders: [],
    },
    last_week: {
      id: "last_week",
      title: "Semana Passada",
      subtitle: "Pedidos de 1 a 2 semanas atrás",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      orders: [],
    },
    this_month: {
      id: "this_month",
      title: "Mais Antigos Deste Mês",
      subtitle: "Pedidos realizados há algumas semanas",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      orders: [],
    },
  };

  const previousMonthsMap = new Map<string, OrderTimeGroup>();
  const monthNamesPt = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  for (const order of sorted) {
    const createdMs = typeof order.createdAt === "number" ? order.createdAt : new Date(order.createdAt || 0).getTime();

    if (createdMs >= startOfToday) {
      buckets.today.orders.push(order);
    } else if (createdMs >= startOfYesterday) {
      buckets.yesterday.orders.push(order);
    } else if (createdMs >= startOfLast7Days) {
      buckets.this_week.orders.push(order);
    } else if (createdMs >= startOfLast14Days) {
      buckets.last_week.orders.push(order);
    } else if (createdMs >= startOfCurrentMonth) {
      buckets.this_month.orders.push(order);
    } else {
      const d = new Date(createdMs);
      const mIdx = isNaN(d.getMonth()) ? 0 : d.getMonth();
      const yr = isNaN(d.getFullYear()) ? now.getFullYear() : d.getFullYear();
      const key = `month_${yr}_${String(mIdx + 1).padStart(2, "0")}`;
      if (!previousMonthsMap.has(key)) {
        previousMonthsMap.set(key, {
          id: key,
          title: `${monthNamesPt[mIdx]} de ${yr}`,
          subtitle: "Histórico de meses anteriores",
          badgeColor: "bg-slate-200 text-slate-700 border-slate-300",
          orders: [],
        });
      }
      previousMonthsMap.get(key)!.orders.push(order);
    }
  }

  const result: OrderTimeGroup[] = [];
  if (buckets.today.orders.length > 0) result.push(buckets.today);
  if (buckets.yesterday.orders.length > 0) result.push(buckets.yesterday);
  if (buckets.this_week.orders.length > 0) result.push(buckets.this_week);
  if (buckets.last_week.orders.length > 0) result.push(buckets.last_week);
  if (buckets.this_month.orders.length > 0) result.push(buckets.this_month);

  for (const group of previousMonthsMap.values()) {
    if (group.orders.length > 0) {
      result.push(group);
    }
  }

  return result;
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
