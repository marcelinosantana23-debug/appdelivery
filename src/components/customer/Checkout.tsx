import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Bike,
  Store,
  QrCode,
  CreditCard,
  Wallet,
  MessageCircle,
  Zap,
  CheckCircle2,
  Edit3,
  MapPin,
  Phone,
  User,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  ShoppingBag,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { GlobalReloadButton } from "@/components/common/GlobalReloadButton";
import { formatPrice, generateOrderId, getMerchantSupportWhatsAppUrl } from "@/utils/order";
import { broadcastNewOrder } from "@/utils/ordersChannel";
import {
  saveActiveOrder,
  saveCustomerProfile,
  getCustomerProfile,
  clearCustomerProfile,
} from "@/utils/orderStorage";
import { compressImageToDataUrl, formatFileSize } from "@/utils/imageCompressor";
import type { OrderType, PaymentMethod, CardType, Order } from "@/types";

interface CheckoutProps {
  onClose: () => void;
  onOrderPlaced: (order: Order) => void;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function Checkout({ onClose, onOrderPlaced }: CheckoutProps) {
  const { cart, cartSubtotal, clearCart, addOrder, isStoreOpen, isStoreActive, config } = useStore();

  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cardType, setCardType] = useState<CardType>("credit");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState({
    street: "",
    number: "",
    district: "",
    complement: "",
    reference: "",
  });
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [showAddressFields, setShowAddressFields] = useState(true);

  // PIX state
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [pixReceipt, setPixReceipt] = useState<{
    file?: File;
    dataUrl: string;
    name: string;
    size: string;
  } | null>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success Screen State
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  // Carrega automaticamente os dados do cliente persistidos no localStorage (Checkout Rápido)
  useEffect(() => {
    const saved = getCustomerProfile();
    if (saved && (saved.name || saved.phone)) {
      if (saved.name) setCustomerName(saved.name);
      if (saved.phone) setCustomerPhone(formatPhone(saved.phone));
      if (saved.street || saved.number || saved.district) {
        setAddress({
          street: saved.street || "",
          number: saved.number || "",
          district: saved.district || "",
          complement: saved.complement || "",
          reference: saved.reference || "",
        });
      }
      setHasSavedProfile(true);
      if (saved.name && saved.phone && saved.street && saved.number && saved.district) {
        setShowAddressFields(false);
      }
    }
  }, []);

  if (cart.length === 0 && !submittedOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500">Carrinho vazio</p>
          <button onClick={onClose} className="mt-4 text-primary font-bold">
            Voltar ao cardápio
          </button>
        </div>
      </div>
    );
  }

  const deliveryFee = orderType === "delivery" ? config.deliveryFee : 0;
  const total = cartSubtotal + deliveryFee;

  const handlePhoneChange = (v: string) => {
    setCustomerPhone(formatPhone(v));
  };

  const handleResetSavedProfile = () => {
    clearCustomerProfile();
    setHasSavedProfile(false);
    setShowAddressFields(true);
    setCustomerName("");
    setCustomerPhone("");
    setAddress({
      street: "",
      number: "",
      district: "",
      complement: "",
      reference: "",
    });
  };

  const handleCopyPixKey = () => {
    if (!config.pixKey) return;
    navigator.clipboard.writeText(config.pixKey).then(() => {
      setCopiedPixKey(true);
      setTimeout(() => setCopiedPixKey(false), 2500);
    });
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setReceiptError("Selecione um arquivo de imagem (JPG, PNG ou WEBP).");
      return;
    }

    setReceiptError(null);
    setIsProcessingReceipt(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setPixReceipt({
        file,
        dataUrl,
        name: file.name,
        size: formatFileSize(file.size),
      });
    } catch (err: any) {
      setReceiptError(err.message || "Erro ao carregar a imagem do comprovante.");
    } finally {
      setIsProcessingReceipt(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveReceipt = () => {
    setPixReceipt(null);
    setReceiptError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Informe seu nome";
    if (!customerPhone.trim()) e.customerPhone = "Informe seu telefone";
    if (orderType === "delivery") {
      if (!address.street.trim()) e.street = "Informe a rua";
      if (!address.number.trim()) e.number = "Informe o número";
      if (!address.district.trim()) e.district = "Informe o bairro";
    }
    if (paymentMethod === "cash" && needsChange && changeFor) {
      const val = parseFloat(changeFor);
      if (isNaN(val) || val < total) {
        e.changeFor = `O troco deve ser maior ou igual a ${formatPrice(total, config)}`;
      }
    }
    if (paymentMethod === "pix" && !pixReceipt) {
      e.pixReceipt = "É obrigatório anexar o comprovante do PIX para finalizar o pedido.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!isStoreOpen || !isStoreActive) return;

    setIsSubmitting(true);

    // Salva imediatamente no localStorage os dados do cliente (Checkout Rápido para próximos pedidos)
    saveCustomerProfile({
      name: customerName,
      phone: customerPhone,
      street: address.street,
      number: address.number,
      district: address.district,
      complement: address.complement,
      reference: address.reference,
    });

    const paymentDetails =
      paymentMethod === "pix"
        ? "PIX (Comprovante Anexado)"
        : paymentMethod === "card"
        ? `Cartão na Entrega (${cardType === "credit" ? "Crédito" : "Débito"})`
        : needsChange && changeFor
        ? `Dinheiro (Troco para R$ ${changeFor})`
        : "Dinheiro (Sem troco)";

    const order: Order = {
      id: generateOrderId(),
      items: cart,
      orderType,
      paymentMethod,
      cardType: paymentMethod === "card" ? cardType : undefined,
      paymentDetails,
      pixReceiptUrl: paymentMethod === "pix" ? pixReceipt?.dataUrl : undefined,
      pix_receipt_url: paymentMethod === "pix" ? pixReceipt?.dataUrl : undefined,
      address: orderType === "delivery" ? address : undefined,
      changeFor: paymentMethod === "cash" && needsChange ? changeFor : undefined,
      subtotal: cartSubtotal,
      deliveryFee,
      total,
      status: "received",
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      createdAt: Date.now(),
      statusHistory: [{ status: "received", timestamp: Date.now() }],
    };

    try {
      // 1. Enviar pedido diretamente via API para o sistema da cozinha sem abrir obrigatoriamente o WhatsApp
      const placedOrder = await addOrder(order);
      const finalOrder = placedOrder || order;

      // 2. Dispara notificação imediata para o painel do lojista (BroadcastChannel)
      broadcastNewOrder(finalOrder);

      // 3. Salva o ID do pedido no localStorage do navegador para rastreamento
      saveActiveOrder(finalOrder.id, config.slug, {
        storeName: config.name,
        total: finalOrder.total,
        status: finalOrder.status,
        orderType: finalOrder.orderType,
      });

      // Limpa o carrinho e exibe a Tela de Sucesso
      clearCart();
      setSubmittedOrder(finalOrder);
    } catch (err: any) {
      console.error("Erro ao enviar pedido:", err);
      // Fallback local seguro
      setSubmittedOrder(order);
      clearCart();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // TELA DE SUCESSO: PEDIDO RECEBIDO
  // ==========================================
  if (submittedOrder) {
    const merchantWhatsAppUrl = getMerchantSupportWhatsAppUrl(submittedOrder, config);

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
          {/* Header da Tela de Sucesso */}
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-6 pt-8 pb-7 text-center text-white relative">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-inner mb-3.5 ring-8 ring-white/10">
              <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={2.4} />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-xs font-black tracking-wider uppercase backdrop-blur-md mb-2">
              ✓ Enviado para a Cozinha
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Pedido Recebido!</h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
              Seu pedido já entrou no sistema de produção de <strong>{config.name}</strong> e logo começará a ser preparado.
            </p>
          </div>

          {/* Conteúdo do Pedido */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {/* Card com Identificação */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Número do Pedido
                  </span>
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    {submittedOrder.id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Valor Total
                  </span>
                  <span className="text-xl font-black text-emerald-600">
                    {formatPrice(submittedOrder.total, config)}
                  </span>
                </div>
              </div>

              {/* Informações detalhadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                    {submittedOrder.paymentMethod === "pix" ? (
                      <QrCode className="h-4 w-4" />
                    ) : submittedOrder.paymentMethod === "card" ? (
                      <CreditCard className="h-4 w-4" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Pagamento</span>
                    <span className="font-bold text-slate-800">
                      {submittedOrder.paymentMethod === "pix" && "PIX (Comprovante Anexado ✓)"}
                      {submittedOrder.paymentMethod === "card" &&
                        `Cartão (${submittedOrder.cardType === "credit" ? "Crédito" : "Débito"})`}
                      {submittedOrder.paymentMethod === "cash" &&
                        `Dinheiro ${submittedOrder.changeFor ? `(Troco p/ R$ ${submittedOrder.changeFor})` : "(Sem troco)"}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    {submittedOrder.orderType === "delivery" ? (
                      <Bike className="h-4 w-4" />
                    ) : (
                      <Store className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Modalidade</span>
                    <span className="font-bold text-slate-800">
                      {submittedOrder.orderType === "delivery" ? "Entrega no Endereço" : "Retirada no Balcão"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Endereço de entrega caso seja delivery */}
              {submittedOrder.orderType === "delivery" && submittedOrder.address && (
                <div className="rounded-xl bg-white border border-slate-200 p-2.5 text-xs text-slate-700 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">
                      {submittedOrder.address.street}, Nº {submittedOrder.address.number} — {submittedOrder.address.district}
                    </p>
                    {submittedOrder.address.reference && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block font-medium">
                        Ref: {submittedOrder.address.reference}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Itens do Pedido */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                Resumo dos Itens ({submittedOrder?.items?.length || 0})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                {(submittedOrder?.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-800">
                      <strong className="text-slate-900">{item?.quantity || 1}x</strong> {item?.product?.name || (item as any)?.name || "Item"}
                    </span>
                    <span className="font-bold text-slate-700">
                      {formatPrice(
                        (item?.quantity || 1) *
                          ((item?.product?.price ?? (item as any)?.price ?? 0) + (item?.selectedOptions || []).reduce((s, o) => s + (o?.price || 0), 0)),
                        config
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações da Tela de Sucesso */}
            <div className="space-y-2.5 pt-2">
              <button
                id="btn-track-order-success"
                onClick={() => onOrderPlaced(submittedOrder)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
              >
                <Clock className="h-4 w-4" />
                <span>Acompanhar Pedido em Tempo Real</span>
              </button>

              {/* Botão Secundário Opcional no rodapé: Falar com o Lojista no WhatsApp */}
              <a
                id="btn-whatsapp-merchant-optional"
                href={merchantWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/80 py-3 text-xs sm:text-sm font-bold text-emerald-800 transition active:scale-95"
                title="Abrir WhatsApp para falar com a loja"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>Falar com o Lojista no WhatsApp (Opcional)</span>
              </a>

              <button
                id="btn-back-menu-success"
                onClick={onClose}
                className="flex w-full items-center justify-center py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Voltar ao Cardápio
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // FORMULÁRIO PRINCIPAL DE CHECKOUT
  // ==========================================
  const isPixSelected = paymentMethod === "pix";
  const isPixReady = !isPixSelected || !!pixReceipt;
  const canSubmit = isStoreOpen && isStoreActive && !isSubmitting && isPixReady;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur-md">
        <button
          id="btn-checkout-back"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Finalizar pedido</h1>
          {hasSavedProfile && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <Zap className="h-3 w-3 fill-emerald-500 text-emerald-500" />
              Checkout Rápido ativo
            </span>
          )}
        </div>
        <GlobalReloadButton variant="light" />
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-5">
        {!isStoreActive ? (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">
            Esta lanchonete está temporariamente desativada pela plataforma. Não é possível finalizar pedidos.
          </div>
        ) : !isStoreOpen ? (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            A lanchonete está fechada no momento. Não é possível finalizar pedidos.
          </div>
        ) : null}

        {/* Banner de Checkout Rápido quando dados estão salvos */}
        {hasSavedProfile && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                  <Zap className="h-4 w-4 fill-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                    Checkout Rápido Ativado
                    <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Auto-preenchido
                    </span>
                  </h2>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Seus dados de entrega já foram carregados automaticamente. Basta selecionar a forma de pagamento e confirmar!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetSavedProfile}
                className="text-[11px] text-emerald-800 hover:text-emerald-950 underline shrink-0 font-medium pt-0.5 cursor-pointer"
                title="Limpar dados salvos do dispositivo"
              >
                Limpar dados
              </button>
            </div>
          </div>
        )}

        {/* Order type */}
        <Section title="Como deseja receber?">
          <div className="grid grid-cols-2 gap-3">
            <TypeCard
              icon={<Bike className="h-6 w-6" />}
              title="Entrega"
              subtitle={formatPrice(config.deliveryFee, config)}
              selected={orderType === "delivery"}
              onClick={() => setOrderType("delivery")}
            />
            <TypeCard
              icon={<Store className="h-6 w-6" />}
              title="Retirar no balcão"
              subtitle="Grátis"
              selected={orderType === "pickup"}
              onClick={() => setOrderType("pickup")}
            />
          </div>
        </Section>

        {/* Card Resumo dos Dados Salvos (Modo Checkout Rápido Compacto) */}
        {hasSavedProfile && !showAddressFields && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Dados do Cliente e Entrega
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressFields(true)}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Alterar dados
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-800">{customerName}</span>
                <span className="text-gray-300">•</span>
                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>{customerPhone}</span>
              </div>

              {orderType === "delivery" && (
                <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                  <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">
                      {address.street}, {address.number} — {address.district}
                    </p>
                    {(address.complement || address.reference) && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {address.complement && <span>Compl: {address.complement}</span>}
                        {address.complement && address.reference && <span> • </span>}
                        {address.reference && (
                          <span className="font-medium text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                            Ref: {address.reference}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer info fields (Visíveis se novo usuário ou clicou em Alterar dados) */}
        {(showAddressFields || !hasSavedProfile) && (
          <Section title="Seus dados" badge={hasSavedProfile ? "Auto-preenchido" : undefined}>
            <div className="space-y-3">
              <Input
                label="Nome completo"
                value={customerName}
                onChange={(v) => setCustomerName(v)}
                error={errors.customerName}
                placeholder="João da Silva"
              />
              <Input
                label="Telefone / WhatsApp"
                value={customerPhone}
                onChange={handlePhoneChange}
                error={errors.customerPhone}
                placeholder="(11) 99999-9999"
              />
            </div>
          </Section>
        )}

        {/* Delivery address fields */}
        {orderType === "delivery" && (showAddressFields || !hasSavedProfile) && (
          <Section title="Endereço de entrega" badge={hasSavedProfile ? "Salvo no histórico" : undefined}>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Rua"
                    value={address.street}
                    onChange={(v) => setAddress({ ...address, street: v })}
                    error={errors.street}
                    placeholder="Ex: Av. Paulista ou Rua das Flores"
                  />
                </div>
                <Input
                  label="Número"
                  value={address.number}
                  onChange={(v) => setAddress({ ...address, number: v })}
                  error={errors.number}
                  placeholder="123"
                />
              </div>
              <Input
                label="Bairro"
                value={address.district}
                onChange={(v) => setAddress({ ...address, district: v })}
                error={errors.district}
                placeholder="Ex: Centro ou Bela Vista"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Complemento (opcional)"
                  value={address.complement}
                  onChange={(v) => setAddress({ ...address, complement: v })}
                  placeholder="Apto 45, Bloco B"
                />
                <Input
                  label="Ponto de referência (recomendado)"
                  value={address.reference}
                  onChange={(v) => setAddress({ ...address, reference: v })}
                  placeholder="Próx. à padaria / portaria"
                />
              </div>
              {hasSavedProfile && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddressFields(false)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    Ocultar campos e usar dados salvos
                  </button>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ==========================================
            SELEÇÃO DE FORMAS DE PAGAMENTO
            - PIX (com Chave, Copiar e Upload Obrigatório)
            - Cartão na Entrega (com Débito/Crédito)
            - Dinheiro (com Troco)
            ========================================== */}
        <Section title="Forma de pagamento">
          <div className="space-y-2.5">
            {/* OPÇÃO PIX */}
            <PaymentOption
              icon={<QrCode className="h-5 w-5" />}
              title="PIX"
              subtitle="Pague com a chave e anexe o comprovante"
              selected={paymentMethod === "pix"}
              onClick={() => {
                setPaymentMethod("pix");
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.changeFor;
                  return copy;
                });
              }}
            />

            {/* DETALHES DO PIX: CHAVE + COPIAR + UPLOAD DO COMPROVANTE */}
            {paymentMethod === "pix" && (
              <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/60 p-4 space-y-4 animate-fade-in shadow-xs">
                {/* Chave PIX do Estabelecimento */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <QrCode className="h-4 w-4 text-emerald-700" />
                      Chave PIX do Estabelecimento
                    </span>
                    <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                      {config.pixKeyType ? `Chave ${config.pixKeyType.toUpperCase()}` : "PIX Oficial"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-emerald-200 p-2.5 shadow-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">Chave para transferência</span>
                      <p className="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate select-all">
                        {config.pixKey || "Chave não configurada"}
                      </p>
                    </div>
                    <button
                      type="button"
                      id="btn-copy-pix-key"
                      onClick={handleCopyPixKey}
                      disabled={!config.pixKey}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
                        copiedPixKey
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-700 text-white hover:bg-emerald-800"
                      }`}
                    >
                      {copiedPixKey ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Chave PIX</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Instrução rápida */}
                <div className="rounded-xl bg-white/80 border border-emerald-200/80 p-2.5 text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold">
                    1. Copie a chave e faça o pagamento de <strong>{formatPrice(total, config)}</strong> no app do seu banco.
                  </p>
                  <p className="font-semibold">
                    2. Tire um print ou salve o comprovante e anexe abaixo para liberar seu pedido:
                  </p>
                </div>

                {/* CAMPO OBRIGATÓRIO: ANEXAR COMPROVANTE DO PIX */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-900 flex items-center gap-1">
                      <span>Anexar Comprovante do PIX</span>
                      <span className="text-red-500 font-bold">* (Obrigatório)</span>
                    </label>
                    {pixReceipt && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Comprovante Anexado
                      </span>
                    )}
                  </div>

                  {/* Input de arquivo invisível (suporta galeria e câmera do celular) */}
                  <input
                    ref={fileInputRef}
                    id="input-pix-receipt-file"
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />

                  {/* Estado: Sem comprovante anexado */}
                  {!pixReceipt ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer bg-white hover:bg-emerald-50/50 ${
                        errors.pixReceipt
                          ? "border-red-400 bg-red-50/30"
                          : "border-emerald-300 hover:border-emerald-500"
                      }`}
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-2">
                        {isProcessingReceipt ? (
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {isProcessingReceipt ? "Processando imagem..." : "Toque para selecionar da galeria ou tirar foto"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Formatos suportados: JPG, PNG, WEBP (fotos e prints do comprovante)
                      </p>
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs pointer-events-none"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>Selecionar Arquivo</span>
                      </button>
                    </div>
                  ) : (
                    /* Estado: Comprovante anexado com miniatura e ações */
                    <div className="rounded-2xl border border-emerald-300 bg-white p-3 shadow-xs space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
                          <img
                            src={pixReceipt.dataUrl}
                            alt="Comprovante do PIX"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Comprovante validado</span>
                          </div>
                          <p className="text-xs font-medium text-slate-700 truncate mt-0.5">
                            {pixReceipt.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Tamanho: {pixReceipt.size}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Trocar imagem do comprovante"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Trocar</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveReceipt}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 cursor-pointer"
                            title="Remover comprovante"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {receiptError && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {receiptError}
                    </p>
                  )}

                  {errors.pixReceipt && !pixReceipt && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-red-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {errors.pixReceipt}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* OPÇÃO CARTÃO NA ENTREGA */}
            <PaymentOption
              icon={<CreditCard className="h-5 w-5" />}
              title="Cartão na Entrega"
              subtitle="Pague na maquininha levada pelo entregador"
              selected={paymentMethod === "card"}
              onClick={() => {
                setPaymentMethod("card");
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.changeFor;
                  delete copy.pixReceipt;
                  return copy;
                });
              }}
            />

            {/* SUB-OPÇÕES CARTÃO: DÉBITO OU CRÉDITO */}
            {paymentMethod === "card" && (
              <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-3.5 space-y-2.5 animate-fade-in">
                <span className="text-xs font-bold text-slate-800 block">
                  Selecione a modalidade do cartão para a maquininha:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardType("credit")}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 px-3 text-xs font-bold transition cursor-pointer ${
                      cardType === "credit"
                        ? "border-primary bg-primary text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Cartão de Crédito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardType("debit")}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 px-3 text-xs font-bold transition cursor-pointer ${
                      cardType === "debit"
                        ? "border-primary bg-primary text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Cartão de Débito</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  💡 Aceitamos as principais bandeiras: Visa, Mastercard, Elo e Hipercard.
                </p>
              </div>
            )}

            {/* OPÇÃO DINHEIRO */}
            <PaymentOption
              icon={<Wallet className="h-5 w-5" />}
              title="Dinheiro"
              subtitle="Pague em dinheiro ao receber o pedido"
              selected={paymentMethod === "cash"}
              onClick={() => {
                setPaymentMethod("cash");
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.pixReceipt;
                  return copy;
                });
              }}
            />

            {/* SUB-OPÇÃO DINHEIRO: CAMPO PARA TROCO */}
            {paymentMethod === "cash" && (
              <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 space-y-3 animate-fade-in">
                <span className="text-xs font-bold text-slate-800 block">
                  Opções de Pagamento em Dinheiro:
                </span>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="cashChangeOption"
                      checked={!needsChange}
                      onChange={() => {
                        setNeedsChange(false);
                        setChangeFor("");
                      }}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Não preciso de troco (valor exato)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="cashChangeOption"
                      checked={needsChange}
                      onChange={() => setNeedsChange(true)}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Preciso de troco</span>
                  </label>
                </div>

                {needsChange && (
                  <div className="mt-2 space-y-1.5 pt-1">
                    <Input
                      label="Troco para quanto?"
                      value={changeFor}
                      onChange={(v) => setChangeFor(v)}
                      error={errors.changeFor}
                      placeholder={`Ex: ${(Math.ceil(total / 10) * 10 + 10).toFixed(2)}`}
                      type="number"
                    />
                    <p className="text-[11px] text-slate-500">
                      Total do pedido: <strong>{formatPrice(total, config)}</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Resumo do pedido */}
        <Section title="Resumo do pedido">
          <div className="space-y-2 rounded-xl bg-gray-50 p-4">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.product.name}
                </span>
                <span className="font-medium text-gray-700">
                  {formatPrice(
                    item.quantity *
                      (item.product.price +
                        item.selectedOptions.reduce((s, o) => s + o.price, 0)),
                    config
                  )}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatPrice(cartSubtotal, config)}</span>
              </div>
              {orderType === "delivery" && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Taxa de entrega</span>
                  <span>{formatPrice(config.deliveryFee, config)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between font-bold text-gray-800">
                <span>Total</span>
                <span>{formatPrice(total, config)}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ==========================================
            BOTÃO PRINCIPAL: FINALIZAR PEDIDO
            - Envia dados via API para o sistema da cozinha
            - NÃO abre obrigatoriamente o WhatsApp
            - Só ativa se o comprovante estiver anexado (quando PIX)
            ========================================== */}
        <div className="space-y-2 pt-1">
          <button
            id="btn-submit-order"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-black text-white shadow-lg transition active:scale-[0.98] cursor-pointer ${
              canSubmit
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                : "bg-slate-400 cursor-not-allowed opacity-60 shadow-none"
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Enviando para a cozinha...</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-5 w-5" />
                <span>Finalizar Pedido</span>
              </>
            )}
          </button>

          {/* Aviso se PIX estiver sem comprovante */}
          {paymentMethod === "pix" && !pixReceipt && (
            <p className="text-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl py-2 px-3">
              ⚠️ Anexe o comprovante do PIX acima para liberar o botão &quot;Finalizar Pedido&quot;.
            </p>
          )}

          <div className="text-center text-[11px] text-gray-400">
            🔒 O pedido é enviado diretamente para a cozinha. Seus dados ficam salvos para compras futuras.
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">{title}</h2>
        {badge && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function TypeCard({
  icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all cursor-pointer ${
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className={selected ? "text-primary" : "text-gray-400"}>{icon}</div>
      <span className="text-sm font-bold text-gray-800">{title}</span>
      <span className="text-xs text-gray-400">{subtitle}</span>
    </button>
  );
}

function PaymentOption({
  icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all cursor-pointer ${
        selected ? "border-emerald-600 bg-emerald-50/40 shadow-xs" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className={selected ? "text-emerald-600" : "text-gray-400"}>{icon}</div>
      <div className="text-left flex-1">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
          selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"
        }`}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border-2 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary ${
          error ? "border-red-300 bg-red-50/50" : "border-gray-200 bg-white"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
