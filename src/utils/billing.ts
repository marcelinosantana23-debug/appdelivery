/**
 * Utilitários de faturamento e mensalidade para o Top Food.
 * Gerencia ciclo de faturamento recorrente, contagem de dias restantes e mensagens dinâmicas.
 */

export interface SubscriptionInfo {
  status: "demo" | "active" | "overdue" | "cancelled";
  billingDay?: number;
  daysRemaining?: number;
  dueDate?: Date;
  dueDateFormatted?: string;
  isDueSoon: boolean; // <= 5 dias
  isOverdue: boolean; // < 0 dias
  isDueToday: boolean; // 0 dias
  statusText: string;
  lastPaymentAt?: number;
  monthlyFee: number;
}

export interface TenantBillingInput {
  subscriptionStatus?: string;
  billingDay?: number | string | null;
  lastPaymentAt?: number | string | null;
  monthlyFee?: number | string | null;
  status?: string;
}

export function getSubscriptionInfo(
  tenant: TenantBillingInput | null | undefined
): SubscriptionInfo {
  const defaultFee = 49.9;
  if (!tenant) {
    return {
      status: "demo",
      isDueSoon: false,
      isOverdue: false,
      isDueToday: false,
      statusText: "Modo Demonstração / Aguardando Ativação",
      monthlyFee: defaultFee,
    };
  }

  const rawStatus = (tenant.subscriptionStatus || "").toLowerCase();
  const rawBillingDay =
    tenant.billingDay !== undefined && tenant.billingDay !== null
      ? Number(tenant.billingDay)
      : undefined;

  const lastPaymentAt =
    tenant.lastPaymentAt !== undefined && tenant.lastPaymentAt !== null
      ? Number(tenant.lastPaymentAt)
      : undefined;

  const monthlyFee =
    tenant.monthlyFee !== undefined && tenant.monthlyFee !== null && !isNaN(Number(tenant.monthlyFee))
      ? Number(tenant.monthlyFee)
      : defaultFee;

  // Se status for explicitamente 'demo' ou se não possui billingDay configurado
  if (rawStatus === "demo" || !rawBillingDay || rawBillingDay < 1 || rawBillingDay > 31) {
    return {
      status: "demo",
      billingDay: rawBillingDay,
      isDueSoon: false,
      isOverdue: false,
      isDueToday: false,
      statusText: "Modo Demonstração / Aguardando Ativação",
      lastPaymentAt,
      monthlyFee,
    };
  }

  const billingDay = Math.min(Math.max(1, rawBillingDay), 31);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Quantidade de dias no mês atual
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const clampedDayThisMonth = Math.min(billingDay, daysInCurrentMonth);

  // Vencimento no mês atual (fim do dia 23:59:59)
  const thisMonthDueDate = new Date(
    currentYear,
    currentMonth,
    clampedDayThisMonth,
    23,
    59,
    59,
    999
  );

  // Verifica se houve pagamento registrado no ciclo deste mês (a partir do dia 1 do mês atual)
  const isPaidThisMonth = lastPaymentAt
    ? lastPaymentAt >= new Date(currentYear, currentMonth, 1).getTime()
    : false;

  let targetDueDate: Date;

  if (now.getTime() <= thisMonthDueDate.getTime()) {
    // Vencimento deste mês ainda vai acontecer
    targetDueDate = thisMonthDueDate;
  } else {
    // A data deste mês já passou
    if (isPaidThisMonth) {
      // Já foi pago! O próximo vencimento é no próximo mês
      const nextMonth = currentMonth + 1;
      const daysInNextMonth = new Date(currentYear, nextMonth + 1, 0).getDate();
      const clampedNextDay = Math.min(billingDay, daysInNextMonth);
      targetDueDate = new Date(currentYear, nextMonth, clampedNextDay, 23, 59, 59, 999);
    } else {
      // Não foi confirmado pagamento após o vencimento -> faturamento VENCIDO
      targetDueDate = thisMonthDueDate;
    }
  }

  // Diferença em dias completos entre a data limite e hoje
  const startOfToday = new Date(currentYear, currentMonth, currentDay).getTime();
  const startOfDueDate = new Date(
    targetDueDate.getFullYear(),
    targetDueDate.getMonth(),
    targetDueDate.getDate()
  ).getTime();

  const diffDays = Math.round((startOfDueDate - startOfToday) / (1000 * 60 * 60 * 24));

  const isDueToday = diffDays === 0;
  const isOverdue = diffDays < 0;
  const isDueSoon = diffDays <= 5 && diffDays >= 0;

  const currentStatus: "active" | "overdue" = isOverdue ? "overdue" : "active";

  let statusText = "";
  if (isOverdue) {
    const overdueDays = Math.abs(diffDays);
    statusText = `Sua mensalidade venceu dia ${billingDay} • Vencida há ${overdueDays} dia${
      overdueDays > 1 ? "s" : ""
    }`;
  } else if (isDueToday) {
    statusText = `Sua mensalidade vence todo dia ${billingDay} • Vence HOJE!`;
  } else {
    statusText = `Sua mensalidade vence todo dia ${billingDay} • Faltam ${diffDays} dia${
      diffDays > 1 ? "s" : ""
    }`;
  }

  const dueDateFormatted = `${String(targetDueDate.getDate()).padStart(2, "0")}/${String(
    targetDueDate.getMonth() + 1
  ).padStart(2, "0")}/${targetDueDate.getFullYear()}`;

  return {
    status: currentStatus,
    billingDay,
    daysRemaining: diffDays,
    dueDate: targetDueDate,
    dueDateFormatted,
    isDueSoon,
    isOverdue,
    isDueToday,
    statusText,
    lastPaymentAt,
    monthlyFee,
  };
}

/**
 * Gera mensagem formatada para envio de comprovante via WhatsApp
 */
export function generateProofWhatsAppUrl({
  whatsappNumber,
  adminWhatsapp,
  storeName,
  tenantName,
  tenantSlug,
  billingDay,
  monthlyFee = 49.9,
  pixKey,
  adminPixKey,
}: {
  whatsappNumber?: string;
  adminWhatsapp?: string;
  storeName?: string;
  tenantName?: string;
  tenantSlug?: string;
  billingDay?: number;
  monthlyFee?: number;
  pixKey?: string;
  adminPixKey?: string;
}): string {
  const targetPhone = (adminWhatsapp || whatsappNumber || "5511999999999").replace(/\D/g, "");
  const targetName = storeName || tenantName || tenantSlug || "Minha Loja";
  const targetPix = adminPixKey || pixKey;
  const formattedFee = (monthlyFee || 49.9).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const msg =
    `Olá! Estou enviando o comprovante de pagamento da mensalidade do Top Food:\n\n` +
    `🏪 *Loja:* ${targetName}\n` +
    (billingDay ? `📅 *Vencimento:* Todo dia ${billingDay}\n` : "") +
    `💰 *Valor da Mensalidade:* ${formattedFee}\n` +
    (targetPix ? `🔑 *Chave PIX:* ${targetPix}\n\n` : "\n") +
    `Favor confirmar a ativação do próximo ciclo. Segue o comprovante em anexo:`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
}
