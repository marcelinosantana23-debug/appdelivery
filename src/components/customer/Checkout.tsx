import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatPrice, generateOrderId, getWhatsAppUrl } from "@/utils/order";
import {
  saveActiveOrder,
  saveCustomerProfile,
  getCustomerProfile,
  clearCustomerProfile,
} from "@/utils/orderStorage";
import type { OrderType, PaymentMethod, Order } from "@/types";

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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState({
    street: "",
    number: "",
    district: "",
    complement: "",
    reference: "",
  });
  const [changeFor, setChangeFor] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [showAddressFields, setShowAddressFields] = useState(true);

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
      // Se todos os dados de entrega estão preenchidos, podemos compactar o formulário
      if (saved.name && saved.phone && saved.street && saved.number && saved.district) {
        setShowAddressFields(false);
      }
    }
  }, []);

  if (cart.length === 0) {
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

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Informe seu nome";
    if (!customerPhone.trim()) e.customerPhone = "Informe seu telefone";
    if (orderType === "delivery") {
      if (!address.street.trim()) e.street = "Informe a rua";
      if (!address.number.trim()) e.number = "Informe o número";
      if (!address.district.trim()) e.district = "Informe o bairro";
    }
    if (paymentMethod === "cash" && changeFor) {
      const val = parseFloat(changeFor);
      if (isNaN(val) || val < total) e.changeFor = `O troco deve ser maior que ${formatPrice(total, config)}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!isStoreOpen || !isStoreActive) return;

    setIsSubmitting(true);

    // 1. Salva imediatamente no localStorage os dados do cliente (Checkout Rápido para próximos pedidos)
    saveCustomerProfile({
      name: customerName,
      phone: customerPhone,
      street: address.street,
      number: address.number,
      district: address.district,
      complement: address.complement,
      reference: address.reference,
    });

    const order: Order = {
      id: generateOrderId(),
      items: cart,
      orderType,
      paymentMethod,
      address: orderType === "delivery" ? address : undefined,
      changeFor: paymentMethod === "cash" ? changeFor : undefined,
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
      const placedOrder = await addOrder(order);
      const finalOrder = placedOrder || order;

      // 2. Salva o ID do pedido no localStorage do navegador para rastreamento
      saveActiveOrder(finalOrder.id, config.slug, {
        storeName: config.name,
        total: finalOrder.total,
        status: finalOrder.status,
        orderType: finalOrder.orderType,
      });

      const url = getWhatsAppUrl(finalOrder, config);
      if (url) {
        window.open(url, "_blank");
      }
      clearCart();
      onOrderPlaced(finalOrder);
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur-md">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
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
                className="text-[11px] text-emerald-800 hover:text-emerald-950 underline shrink-0 font-medium pt-0.5"
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
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
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
          <Section
            title="Seus dados"
            badge={hasSavedProfile ? "Auto-preenchido" : undefined}
          >
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
          <Section
            title="Endereço de entrega"
            badge={hasSavedProfile ? "Salvo no histórico" : undefined}
          >
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
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Ocultar campos e usar dados salvos
                  </button>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Payment */}
        <Section title="Forma de pagamento">
          <div className="space-y-2">
            <PaymentOption
              icon={<QrCode className="h-5 w-5" />}
              title="PIX"
              subtitle={`Chave: ${config.pixKey}`}
              selected={paymentMethod === "pix"}
              onClick={() => setPaymentMethod("pix")}
            />
            <PaymentOption
              icon={<CreditCard className="h-5 w-5" />}
              title="Cartão na entrega"
              subtitle="Crédito ou débito na maquininha"
              selected={paymentMethod === "card"}
              onClick={() => setPaymentMethod("card")}
            />
            <PaymentOption
              icon={<Wallet className="h-5 w-5" />}
              title="Dinheiro"
              subtitle="Pagar em dinheiro na entrega"
              selected={paymentMethod === "cash"}
              onClick={() => setPaymentMethod("cash")}
            />
            {paymentMethod === "cash" && (
              <div className="mt-2 rounded-xl bg-gray-50 p-3 animate-fade-in">
                <Input
                  label="Troco para quanto?"
                  value={changeFor}
                  onChange={(v) => setChangeFor(v)}
                  error={errors.changeFor}
                  placeholder="Ex: 50.00"
                  type="number"
                />
              </div>
            )}
          </div>
        </Section>

        {/* Summary */}
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

        <button
          onClick={handleSubmit}
          disabled={!isStoreOpen || !isStoreActive || isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-4 font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageCircle className="h-5 w-5" />
          {isSubmitting ? "Gravando pedido..." : "Confirmar e Enviar via WhatsApp"}
        </button>

        <div className="text-center text-[11px] text-gray-400">
          🔒 Seus dados ficam salvos em seu dispositivo para compras futuras instantâneas.
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
      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all ${
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
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className={selected ? "text-primary" : "text-gray-400"}>{icon}</div>
      <div className="text-left">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
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
