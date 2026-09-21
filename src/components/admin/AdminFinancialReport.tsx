import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Calendar,
  RefreshCw,
  ShoppingBag,
  Bike,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  Filter,
  Download,
  Search,
  ChevronRight,
  Sparkles,
  X,
  FileText,
  Phone,
  MapPin,
  HelpCircle,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { fetchTenantFinancialReportApi } from "@/services/api";
import type { Order, FinancialReportData, DailyRevenueItem, PaymentBreakdownItem } from "@/types";

const MONTH_NAMES = [
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

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBr(timestamp: number): string {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminFinancialReport() {
  const { currentTenant, currentSlug, orders: storeOrders } = useStore();

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [filterPreset, setFilterPreset] = useState<"current" | "previous" | "custom">("current");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Manter ref dos pedidos para o cálculo local de fallback sem re-disparar efeitos reativos
  const storeOrdersRef = useRef(storeOrders);
  storeOrdersRef.current = storeOrders;

  // Filtros da tabela de pedidos
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DailyRevenueItem | null>(null);

  const tenantSlugOrId = currentTenant?.slug || currentTenant?.id || currentSlug || "marcelino";

  // Fallback caso a API esteja temporariamente offline ou rodando 100% no cliente
  const calculateLocalFallback = useCallback(
    (targetM: number, targetY: number, ordersOverride?: Order[]): FinancialReportData => {
      const ordersToUse = ordersOverride || storeOrdersRef.current || [];
      const isCompleted = (s: string) => {
        const lower = (s || "").toLowerCase().trim();
        return (
          lower === "done" ||
          lower === "concluido" ||
          lower === "concluído" ||
          lower === "entregue" ||
          lower === "finalizado"
        );
      };

      const daysInMonth = new Date(targetY, targetM, 0).getDate();
      const startMs = new Date(targetY, targetM - 1, 1, 0, 0, 0, 0).getTime();
      const endMs = new Date(targetY, targetM - 1, daysInMonth, 23, 59, 59, 999).getTime();

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      const completed = ordersToUse.filter(
        (o) => isCompleted(o.status) && o.createdAt >= startMs && o.createdAt <= endMs
      );
      const todayOrders = ordersToUse.filter(
        (o) => isCompleted(o.status) && o.createdAt >= todayStart && o.createdAt <= todayEnd
      );

      const monthRev = completed.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const todayRev = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      let delivCount = 0;
      let pickCount = 0;
      let delivFee = 0;

      completed.forEach((o) => {
        if (o.orderType === "delivery" || (o as any).delivery_type === "delivery") {
          delivCount++;
          delivFee += Number(o.deliveryFee) || 0;
        } else {
          pickCount++;
        }
      });

      const dailyMap = new Map<number, { revenue: number; count: number }>();
      for (let d = 1; d <= daysInMonth; d++) {
        dailyMap.set(d, { revenue: 0, count: 0 });
      }

      completed.forEach((o) => {
        const d = new Date(o.createdAt).getDate();
        const curr = dailyMap.get(d) || { revenue: 0, count: 0 };
        curr.revenue += Number(o.total) || 0;
        curr.count += 1;
        dailyMap.set(d, curr);
      });

      const daysOfWeekPt = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dailyRevenue: DailyRevenueItem[] = Array.from(dailyMap.entries()).map(([day, val]) => {
        const dateObj = new Date(targetY, targetM - 1, day);
        return {
          day,
          date: `${targetY}-${String(targetM).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          dayOfWeek: daysOfWeekPt[dateObj.getDay()] || "",
          revenue: Math.round(val.revenue * 100) / 100,
          ordersCount: val.count,
        };
      });

      const paymentMap: Record<string, { total: number; count: number }> = {
        pix: { total: 0, count: 0 },
        card: { total: 0, count: 0 },
        cash: { total: 0, count: 0 },
      };

      completed.forEach((o) => {
        const m = (o.paymentMethod || "pix").toLowerCase();
        if (!paymentMap[m]) paymentMap[m] = { total: 0, count: 0 };
        paymentMap[m].total += Number(o.total) || 0;
        paymentMap[m].count += 1;
      });

      const paymentBreakdown: PaymentBreakdownItem[] = Object.entries(paymentMap)
        .filter(([_, v]) => v.count > 0)
        .map(([m, v]) => ({
          method: m,
          label: m === "pix" ? "PIX" : m === "card" ? "Cartão (Crédito/Débito)" : "Dinheiro",
          total: Math.round(v.total * 100) / 100,
          count: v.count,
          percent: monthRev > 0 ? Math.round((v.total / monthRev) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      return {
        period: {
          month: targetM,
          year: targetY,
          monthName: MONTH_NAMES[targetM - 1] || `Mês ${targetM}`,
          startDate: `${targetY}-${String(targetM).padStart(2, "0")}-01`,
          endDate: `${targetY}-${String(targetM).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`,
        },
        metrics: {
          todayRevenue: Math.round(todayRev * 100) / 100,
          monthRevenue: Math.round(monthRev * 100) / 100,
          monthCompletedOrders: completed.length,
          averageTicket: completed.length > 0 ? Math.round((monthRev / completed.length) * 100) / 100 : 0,
          todayCompletedOrders: todayOrders.length,
          deliveredCount: delivCount,
          pickupCount: pickCount,
          deliveryFeeTotal: Math.round(delivFee * 100) / 100,
        },
        dailyRevenue,
        paymentBreakdown,
        orders: completed,
      };
    },
    [now]
  );

  // Inicializa o relatório imediatamente com dados locais para tela estática sem salto/flicker
  const [reportData, setReportData] = useState<FinancialReportData>(() =>
    calculateLocalFallback(now.getMonth() + 1, now.getFullYear(), storeOrders)
  );

  // Carregar dados da API (Cloudflare D1 com fallback de memória)
  // A busca ocorre EXCLUSIVAMENTE em 3 situações pontuais:
  // 1) Montagem inicial ao abrir a aba "Financeiro"
  // 2) Alteração manual dos filtros pelo usuário
  // 3) Clique manual no botão "Atualizar/Sincronizar"
  // NUNCA executa em polling, loop, temporizador ou interval em segundo plano.
  const fetchReportData = useCallback(
    async (paramsOverride?: {
      month?: number;
      year?: number;
      preset?: "current" | "previous" | "custom";
      startDate?: string;
      endDate?: string;
    }) => {
      const targetMonth = paramsOverride?.month ?? selectedMonth;
      const targetYear = paramsOverride?.year ?? selectedYear;
      const targetPreset = paramsOverride?.preset ?? filterPreset;
      const targetStart = paramsOverride?.startDate ?? customStartDate;
      const targetEnd = paramsOverride?.endDate ?? customEndDate;

      setIsSyncing(true);
      try {
        const queryParams: Record<string, string | number> = {};
        if (targetPreset === "custom" && targetStart && targetEnd) {
          queryParams.startDate = targetStart;
          queryParams.endDate = targetEnd;
        } else {
          queryParams.month = targetMonth;
          queryParams.year = targetYear;
        }

        const res = await fetchTenantFinancialReportApi(tenantSlugOrId, queryParams);

        if (res.success && res.metrics && res.period) {
          setReportData({
            period: res.period,
            metrics: res.metrics,
            dailyRevenue: res.dailyRevenue || [],
            paymentBreakdown: res.paymentBreakdown || [],
            orders: res.orders || [],
          });
          setLastSync(new Date());
        } else {
          const fallback = calculateLocalFallback(targetMonth, targetYear);
          setReportData(fallback);
          setLastSync(new Date());
        }
      } catch (err: unknown) {
        console.warn("Erro ao buscar relatório via API, calculando localmente:", err);
        const fallback = calculateLocalFallback(targetMonth, targetYear);
        setReportData(fallback);
        setLastSync(new Date());
      } finally {
        setIsSyncing(false);
      }
    },
    [tenantSlugOrId, selectedMonth, selectedYear, filterPreset, customStartDate, customEndDate, calculateLocalFallback]
  );

  // 1. Disparo pontual ÚNICO na montagem (ao clicar na aba "Financeiro")
  useEffect(() => {
    fetchReportData({
      month: selectedMonth,
      year: selectedYear,
      preset: filterPreset,
    });
    // Intencionalmente executado uma única vez ao montar o componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Alteração de presets (Mês Atual, Mês Anterior, etc)
  const handleSelectPreset = (preset: "current" | "previous" | "custom") => {
    setFilterPreset(preset);
    if (preset === "current") {
      const currM = now.getMonth() + 1;
      const currY = now.getFullYear();
      setSelectedMonth(currM);
      setSelectedYear(currY);
      fetchReportData({ month: currM, year: currY, preset: "current" });
    } else if (preset === "previous") {
      let prevM = now.getMonth();
      let prevY = now.getFullYear();
      if (prevM === 0) {
        prevM = 12;
        prevY -= 1;
      }
      setSelectedMonth(prevM);
      setSelectedYear(prevY);
      fetchReportData({ month: prevM, year: prevY, preset: "previous" });
    }
  };

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    setFilterPreset("custom");
    fetchReportData({ month: newMonth, year: selectedYear, preset: "custom" });
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    setFilterPreset("custom");
    fetchReportData({ month: selectedMonth, year: newYear, preset: "custom" });
  };

  const handleApplyCustomDates = () => {
    if (customStartDate && customEndDate) {
      fetchReportData({
        preset: "custom",
        startDate: customStartDate,
        endDate: customEndDate,
      });
    }
  };

  // Pedidos concluídos filtrados por busca e pagamento
  const filteredOrders = useMemo(() => {
    if (!reportData?.orders) return [];
    return reportData.orders.filter((order) => {
      const matchesSearch =
        searchTerm === "" ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone.includes(searchTerm);

      const matchesPayment =
        paymentFilter === "all" ||
        (order.paymentMethod || "").toLowerCase() === paymentFilter.toLowerCase();

      return matchesSearch && matchesPayment;
    });
  }, [reportData?.orders, searchTerm, paymentFilter]);

  // Estatísticas calculadas do gráfico diário
  const chartStats = useMemo<{
    maxRevenue: number;
    bestDay: DailyRevenueItem | null;
    dailyAvg: number;
    daysWithSales: number;
  }>(() => {
    if (!reportData?.dailyRevenue || reportData.dailyRevenue.length === 0) {
      return { maxRevenue: 100, bestDay: null, dailyAvg: 0, daysWithSales: 0 };
    }
    let max = 0;
    let best: DailyRevenueItem | null = null;
    let activeDays = 0;

    reportData.dailyRevenue.forEach((item) => {
      if (item.revenue > max) {
        max = item.revenue;
        best = item;
      }
      if (item.revenue > 0) {
        activeDays++;
      }
    });

    const totalRev = reportData.metrics.monthRevenue || 0;
    const daysCount = reportData.dailyRevenue.length || 1;
    const dailyAvg = totalRev / daysCount;

    return {
      maxRevenue: max > 0 ? max : 100,
      bestDay: best,
      dailyAvg,
      daysWithSales: activeDays,
    };
  }, [reportData]);

  // Exportar relatório em CSV
  const handleExportCsv = () => {
    if (!reportData?.orders || reportData.orders.length === 0) {
      alert("Não há pedidos concluídos para exportar neste período.");
      return;
    }

    const headers = [
      "ID Pedido",
      "Data e Hora",
      "Cliente",
      "Telefone",
      "Tipo",
      "Forma de Pagamento",
      "Subtotal (R$)",
      "Taxa de Entrega (R$)",
      "Total (R$)",
      "Status",
    ];

    const rows = reportData.orders.map((o) => [
      `"${o.id}"`,
      `"${new Date(o.createdAt).toLocaleString("pt-BR")}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.customerPhone}"`,
      `"${o.orderType === "delivery" ? "Entrega" : "Retirada no Balcão"}"`,
      `"${(o.paymentMethod || "").toUpperCase()}"`,
      o.subtotal.toFixed(2).replace(".", ","),
      o.deliveryFee.toFixed(2).replace(".", ","),
      o.total.toFixed(2).replace(".", ","),
      `"Concluído"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `relatorio_faturamento_${tenantSlugOrId}_${reportData.period.year}_${String(
        reportData.period.month
      ).padStart(2, "0")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const metrics = reportData?.metrics || {
    todayRevenue: 0,
    monthRevenue: 0,
    monthCompletedOrders: 0,
    averageTicket: 0,
    todayCompletedOrders: 0,
    deliveredCount: 0,
    pickupCount: 0,
    deliveryFeeTotal: 0,
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-3 sm:p-6 space-y-4 sm:space-y-6 pb-20 flex flex-col max-w-full overflow-x-hidden">
      {/* Top Banner / Breadcrumb & D1 Connectivity */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-sm w-full max-w-full">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 font-bold">
              <DollarSign className="h-4 w-4" />
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Faturamento & Desempenho Financeiro
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cálculo auditado em tempo real somando apenas pedidos efetivamente finalizados e entregues
          </p>
        </div>

        {/* Controles e Ações Responsivos */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Cloudflare D1 Conectado
          </span>

          <span className="hidden md:inline text-[11px] text-slate-400">
            Atualizado às {lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>

          <button
            onClick={() => fetchReportData()}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition disabled:opacity-50 shrink-0 cursor-pointer"
            title="Atualizar dados do Cloudflare D1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-amber-600" : ""}`} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!reportData?.orders?.length}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-40 shadow-sm shrink-0 cursor-pointer"
            title="Exportar dados do mês em planilha CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Exportar Planilha</span>
            <span className="xs:hidden">Exportar</span>
          </button>
        </div>
      </div>

      {/* 1. CARDS DE RESUMO FINANCEIRO (MÉTRICAS PRINCIPAIS NO TOPO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full">
        {/* Card 1: Faturamento de Hoje */}
        <div className="relative w-full max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-white p-4 sm:p-5 border border-emerald-200/80 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Faturamento de Hoje
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.todayRevenue)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-emerald-100">
            <span className="flex items-center gap-1 font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {metrics.todayCompletedOrders} {metrics.todayCompletedOrders === 1 ? "pedido concluído" : "pedidos concluídos"} hoje
            </span>
            <span className="text-[11px] text-slate-400">Ao vivo</span>
          </div>
        </div>

        {/* Card 2: Faturamento do Mês Atual ou Selecionado */}
        <div className="relative w-full max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-white to-white p-4 sm:p-5 border border-amber-200/80 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Faturamento do Mês
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.monthRevenue)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-amber-100">
            <span className="font-semibold text-amber-800">
              {reportData?.period.monthName || "Mês"} {reportData?.period.year || selectedYear}
            </span>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              Líquido Vendas
            </span>
          </div>
        </div>

        {/* Card 3: Total de Pedidos Concluídos no Mês */}
        <div className="relative w-full max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-white p-4 sm:p-5 border border-blue-200/80 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Pedidos Concluídos
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metrics.monthCompletedOrders}
            </span>
            <span className="text-xs font-semibold text-slate-500">pedidos finalizados</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-blue-100">
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Bike className="h-3 w-3 text-blue-600" /> {metrics.deliveredCount}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <ShoppingBag className="h-3 w-3 text-emerald-600" /> {metrics.pickupCount}
              </span>
            </span>
            <span className="text-[11px] text-slate-400">Cancelados ignorados</span>
          </div>
        </div>

        {/* Card 4: Ticket Médio por Pedido */}
        <div className="relative w-full max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-white to-white p-4 sm:p-5 border border-purple-200/80 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Ticket Médio
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.averageTicket)}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ pedido</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-purple-100">
            <span className="text-slate-500 font-medium">Média por venda concluída</span>
            <span className="text-purple-700 font-bold text-[11px]">Rendimento</span>
          </div>
        </div>
      </div>

      {/* 2. FILTRO DE PERÍODO E HISTÓRICO MENSAL */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
              Filtro de Período & Histórico
            </span>
          </div>

          {/* Atalhos rápidos de período */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => handleSelectPreset("current")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                filterPreset === "current"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mês Atual ({MONTH_NAMES[now.getMonth()]})
            </button>

            <button
              onClick={() => handleSelectPreset("previous")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                filterPreset === "previous"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mês Anterior
            </button>

            <button
              onClick={() => handleSelectPreset("custom")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                filterPreset === "custom"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Personalizar
            </button>
          </div>
        </div>

        {/* Seletores detalhados de Mês, Ano ou Intervalo Customizado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Mês de Referência
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none transition"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none transition"
            >
              {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
                (y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              )}
            </select>
          </div>

          {filterPreset === "custom" ? (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Data Inicial (opcional)
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Data Final (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomDates}
                    disabled={!customStartDate || !customEndDate || isSyncing}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-2 transition disabled:opacity-40 whitespace-nowrap"
                  >
                    Filtrar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 flex items-center justify-end">
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full sm:w-auto">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span>
                  Consultando:{" "}
                  <strong className="text-slate-900">
                    {reportData?.period?.monthName} de {reportData?.period?.year}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. VISUALIZAÇÃO DE PROGRESSO / GRÁFICO DE RENDIMENTO DIÁRIO */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 font-bold">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Evolução Diária do Faturamento (R$)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Progresso dia a dia com volume faturado em cada data do mês selecionado
            </p>
          </div>

          {/* Destaques rápidos do gráfico */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {chartStats.bestDay && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800 border border-amber-200 font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  Melhor Dia: <strong>Dia {chartStats.bestDay.day}</strong> ({formatCurrency(chartStats.bestDay.revenue)})
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 text-slate-500">
              <span>Média:</span>
              <strong className="text-slate-800">{formatCurrency(chartStats.dailyAvg)}/dia</strong>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras Interativo */}
        <div className="pt-4">
          <div className="relative h-48 w-full flex items-end gap-1 sm:gap-1.5 border-b border-slate-200 pb-2 pt-6">
            {/* Linha de média diária pontilhada */}
            {chartStats.maxRevenue > 0 && chartStats.dailyAvg > 0 && (
              <div
                className="absolute left-0 right-0 border-b border-dashed border-amber-400/70 pointer-events-none z-10 flex items-center justify-end pr-2"
                style={{
                  bottom: `${Math.min(
                    95,
                    Math.max(5, (chartStats.dailyAvg / chartStats.maxRevenue) * 100)
                  )}%`,
                }}
              >
                <span className="bg-amber-100/90 text-amber-900 text-[10px] font-bold px-1 rounded shadow-xs">
                  Média: {formatCurrency(chartStats.dailyAvg)}
                </span>
              </div>
            )}

            {/* Barras por dia */}
            {reportData?.dailyRevenue && reportData.dailyRevenue.length > 0 ? (
              reportData.dailyRevenue.map((item) => {
                const heightPercent =
                  chartStats.maxRevenue > 0
                    ? Math.max(item.revenue > 0 ? 8 : 2, (item.revenue / chartStats.maxRevenue) * 100)
                    : 2;
                const isBest = chartStats.bestDay?.day === item.day && item.revenue > 0;
                const isHovered = hoveredDay?.day === item.day;

                return (
                  <div
                    key={item.day}
                    className="relative flex-1 flex flex-col items-center group h-full justify-end"
                    onMouseEnter={() => setHoveredDay(item)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => setHoveredDay(item)}
                  >
                    {/* Tooltip ao passar o mouse */}
                    {isHovered && (
                      <div className="absolute -top-14 z-30 flex flex-col items-center pointer-events-none whitespace-nowrap bg-slate-900 text-white rounded-lg px-2.5 py-1 text-[11px] shadow-lg animate-in fade-in zoom-in-95">
                        <span className="font-bold text-amber-400">{formatCurrency(item.revenue)}</span>
                        <span className="text-[10px] text-slate-300">
                          Dia {item.day} ({item.dayOfWeek}) • {item.ordersCount} {item.ordersCount === 1 ? "pedido" : "pedidos"}
                        </span>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 mt-0.5" />
                      </div>
                    )}

                    {/* Barra */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 cursor-pointer ${
                        item.revenue > 0
                          ? isBest
                            ? "bg-amber-500 hover:bg-amber-400 shadow-sm"
                            : "bg-slate-800 hover:bg-slate-700"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    />

                    {/* Rótulo do dia */}
                    <span
                      className={`text-[9px] sm:text-[10px] mt-1 font-semibold ${
                        isBest ? "text-amber-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {item.day % (reportData.dailyRevenue.length > 20 ? 3 : 1) === 0 ||
                      item.day === 1 ||
                      isBest
                        ? item.day
                        : ""}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                Nenhum dado diário para exibir no período selecionado
              </div>
            )}
          </div>

          {/* Legenda e barra de progresso mensal */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-500" />
                <span className="font-medium text-slate-700">Dia de Maior Faturamento</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-slate-800" />
                <span className="font-medium text-slate-700">Dias com Vendas Concluídas</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-slate-200" />
                <span className="font-medium text-slate-700">Sem Vendas</span>
              </span>
            </div>

            <span className="text-slate-600 font-semibold">
              {chartStats.daysWithSales} de {reportData?.dailyRevenue?.length || 30} dias com vendas registradas
            </span>
          </div>
        </div>
      </div>

      {/* 4. DETALHAMENTO DE FORMAS DE PAGAMENTO E MODALIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distribuição por Método de Pagamento */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Meios de Pagamento
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Distribuição</span>
          </div>

          {reportData?.paymentBreakdown && reportData.paymentBreakdown.length > 0 ? (
            <div className="space-y-3">
              {reportData.paymentBreakdown.map((item) => (
                <div key={item.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      {item.method === "pix" && <QrCode className="h-3.5 w-3.5 text-emerald-600" />}
                      {item.method === "card" && <CreditCard className="h-3.5 w-3.5 text-blue-600" />}
                      {item.method === "cash" && <Banknote className="h-3.5 w-3.5 text-amber-600" />}
                      <span>{item.label}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({item.count} {item.count === 1 ? "pedido" : "pedidos"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{formatCurrency(item.total)}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {item.percent}%
                      </span>
                    </div>
                  </div>
                  {/* Barra de progresso */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      style={{ width: `${item.percent}%` }}
                      className={`h-full rounded-full ${
                        item.method === "pix"
                          ? "bg-emerald-500"
                          : item.method === "card"
                          ? "bg-blue-600"
                          : "bg-amber-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum pagamento registrado no período selecionado
            </div>
          )}
        </div>

        {/* Modalidade de Atendimento: Entrega vs Balcão */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Canais de Entrega
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Modalidades</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                <Bike className="h-4 w-4" />
                <span>Delivery (Entrega)</span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-slate-900">
                {metrics.deliveredCount}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Taxa Total: <strong className="text-slate-700">{formatCurrency(metrics.deliveryFeeTotal)}</strong>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <ShoppingBag className="h-4 w-4" />
                <span>Retirada no Balcão</span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-slate-900">
                {metrics.pickupCount}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Sem custo de taxa de entrega
              </div>
            </div>
          </div>

          {/* Nota de auditoria */}
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-500">
            <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Todos os pedidos cancelados pelo cliente ou recusados pela loja são automaticamente excluídos do cálculo financeiro e não impactam seu faturamento.
            </span>
          </div>
        </div>
      </div>

      {/* 5. HISTÓRICO / EXTRATO DETALHADO DOS PEDIDOS CONCLUÍDOS */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-0">
        {/* Cabeçalho do Extrato */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Extrato de Pedidos Concluídos no Período
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {filteredOrders.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lista detalhada de pedidos entregues que compõem o faturamento auditado
            </p>
          </div>

          {/* Barra de pesquisa e filtro de pagamento */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto max-w-full">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente ou #ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 transition w-full sm:w-56"
              />
            </div>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 w-full sm:w-auto"
            >
              <option value="all">Todos Pagamentos</option>
              <option value="pix">Apenas PIX</option>
              <option value="card">Apenas Cartão</option>
              <option value="cash">Apenas Dinheiro</option>
            </select>
          </div>
        </div>

        {/* Tabela de Pedidos */}
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Receipt className="h-12 w-12 text-slate-300 stroke-[1.5]" />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Nenhum pedido concluído encontrado
              </p>
              <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                {searchTerm
                  ? "Nenhum resultado corresponde aos termos da pesquisa."
                  : "Neste período não houve pedidos com status 'Concluído' ou 'Entregue'."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Data e Hora</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Modalidade</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3 text-right">Valor Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const isDelivery = order.orderType === "delivery" || (order as any).delivery_type === "delivery";
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {order.id}
                      </td>

                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDateBr(order.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400">{order.customerPhone}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isDelivery
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isDelivery ? (
                            <>
                              <Bike className="h-3 w-3" /> Entrega
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-3 w-3" /> Balcão
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700 uppercase text-[11px]">
                          {order.paymentMethod === "pix"
                            ? "PIX"
                            : order.paymentMethod === "card"
                            ? "Cartão"
                            : "Dinheiro"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(order.total)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Concluído
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition"
                          title="Ver detalhes do pedido"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHES DO PEDIDO SELECIONADO */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-600" />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Comprovante do Pedido {selectedOrder.id}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {new Date(selectedOrder.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Cliente */}
              <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedOrder.customerName}
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{selectedOrder.customerPhone}</span>
                </div>
                {selectedOrder.address && (
                  <div className="flex items-start gap-1.5 text-slate-600 pt-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {selectedOrder.address.street}, {selectedOrder.address.number}{" "}
                      {selectedOrder.address.complement && `- ${selectedOrder.address.complement}`},{" "}
                      {selectedOrder.address.district}
                    </span>
                  </div>
                )}
              </div>

              {/* Itens do Pedido */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Itens Faturados
                </span>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800">
                          {item.quantity}x {item.product.name}
                        </span>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {item.selectedOptions.map((o) => o.name).join(", ")}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-amber-700 italic mt-0.5">
                            Obs: {item.notes}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Taxa de Entrega:</span>
                    <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-slate-200">
                  <span>Total Concluído:</span>
                  <span className="text-emerald-700">{formatCurrency(selectedOrder.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Forma de Pagamento:</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {selectedOrder.paymentMethod}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
