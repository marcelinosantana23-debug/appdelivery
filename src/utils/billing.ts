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
  dueDateShort?: string;
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
  paidUntil?: number | string | null;
  nextDueDate?: number | string | null;
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

  const nextDueDateTimestamp =
    tenant.nextDueDate !== undefined && tenant.nextDueDate !== null
      ? Number(tenant.nextDueDate)
      : tenant.paidUntil !== undefined && tenant.paidUntil !== null
      ? Number(tenant.paidUntil)
      : undefined;

  const monthlyFee =
    tenant.monthlyFee !== undefined && tenant.monthlyFee !== null && !isNaN(Number(tenant.monthlyFee))
      ? Number(tenant.monthlyFee)
      : defaultFee;

  // Se status for explicitamente 'demo' ou 'cancelled', ou se não possui billingDay configurado
  if (rawStatus === "demo" || rawStatus === "cancelled" || !rawBillingDay || rawBillingDay < 1 || rawBillingDay > 31) {
    const isCancelled = rawStatus === "cancelled";
    return {
      status: isCancelled ? "cancelled" : "demo",
      billingDay: undefined,
      isDueSoon: false,
      isOverdue: false,
      isDueToday: false,
      statusText: isCancelled
        ? "Assinatura Cancelada / Modo Demonstração"
        : "Modo Demonstração / Aguardando Ativação",
      lastPaymentAt,
      monthlyFee,
    };
  }

  const billingDay = Math.min(Math.max(1, rawBillingDay), 31);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let targetDueDate: Date;

  if (nextDueDateTimestamp && !isNaN(nextDueDateTimestamp)) {
    targetDueDate = new Date(nextDueDateTimestamp);
  } else {
    // Cálculo seguro caso nextDueDate ainda não esteja persistido explicitamente:
    // 1. Data de vencimento no mês atual
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const clampedDayThisMonth = Math.min(billingDay, daysInCurrentMonth);
    const thisMonthDueDate = new Date(
      currentYear,
      currentMonth,
      clampedDayThisMonth,
      23,
      59,
      59,
      999
    );

    // 2. Data de vencimento no próximo mês
    const nextMonthObj = new Date(currentYear, currentMonth + 1, 1);
    const nextYear = nextMonthObj.getFullYear();
    const nextMonth = nextMonthObj.getMonth();
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const clampedNextDay = Math.min(billingDay, daysInNextMonth);
    const nextMonthDueDate = new Date(
      nextYear,
      nextMonth,
      clampedNextDay,
      23,
      59,
      59,
      999
    );

    // Se houve pagamento/ativação recente (no mês atual ou dentro dos últimos 30 dias):
    // o vencimento deve ser no mês seguinte!
    const isPaidRecently = lastPaymentAt
      ? (now.getTime() - lastPaymentAt) < 31 * 24 * 60 * 60 * 1000 &&
        lastPaymentAt >= new Date(currentYear, currentMonth, 1).getTime()
      : false;

    if (isPaidRecently) {
      targetDueDate = nextMonthDueDate;
    } else if (now.getTime() <= thisMonthDueDate.getTime()) {
      targetDueDate = thisMonthDueDate;
    } else {
      // Vencido no ciclo atual
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

  const dayStr = String(targetDueDate.getDate()).padStart(2, "0");
  const monthStr = String(targetDueDate.getMonth() + 1).padStart(2, "0");
  const yearStr = targetDueDate.getFullYear();

  const dueDateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
  const dueDateShort = `${dayStr}/${monthStr}`;

  let statusText = "";
  if (isOverdue) {
    const overdueDays = Math.abs(diffDays);
    statusText = `Sua mensalidade venceu dia ${billingDay} • Vencida há ${overdueDays} dia${
      overdueDays > 1 ? "s" : ""
    }`;
  } else if (isDueToday) {
    statusText = `Sua mensalidade vence todo dia ${billingDay} • Vence HOJE!`;
  } else {
    statusText = `Sua mensalidade vence em ${dueDateShort} • Faltam ${diffDays} dia${
      diffDays > 1 ? "s" : ""
    }`;
  }

  return {
    status: currentStatus,
    billingDay,
    daysRemaining: diffDays,
    dueDate: targetDueDate,
    dueDateFormatted,
    dueDateShort,
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
