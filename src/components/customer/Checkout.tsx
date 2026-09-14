import { useState } from "react";
import { ArrowLeft, Bike, Store, QrCode, CreditCard, Wallet, MessageCircle } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatPrice, generateOrderId, getWhatsAppUrl } from "@/utils/order";
import type { OrderType, PaymentMethod, Order } from "@/types";

interface CheckoutProps {
  onClose: () => void;
  onOrderPlaced: (order: Order) => void;
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
      await addOrder(order);
      const url = getWhatsAppUrl(order, config);
      if (url) {
        window.open(url, "_blank");
      }
      clearCart();
      onOrderPlaced(order);
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
        <h1 className="text-lg font-bold text-gray-800">Finalizar pedido</h1>
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

        {/* Customer info */}
        <Section title="Seus dados">
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
              onChange={(v) => setCustomerPhone(v)}
              error={errors.customerPhone}
              placeholder="(11) 99999-9999"
            />
          </div>
        </Section>

        {/* Delivery address */}
        {orderType === "delivery" && (
          <Section title="Endereço de entrega">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Rua"
                    value={address.street}
                    onChange={(v) => setAddress({ ...address, street: v })}
                    error={errors.street}
                    placeholder="Av. Paulista"
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
                placeholder="Bela Vista"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Complemento"
                  value={address.complement}
                  onChange={(v) => setAddress({ ...address, complement: v })}
                  placeholder="Apto 45"
                />
                <Input
                  label="Ponto de referência"
                  value={address.reference}
                  onChange={(v) => setAddress({ ...address, reference: v })}
                  placeholder="Próx. ao mercado"
                />
              </div>
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
              subtitle="Crédito ou débito"
              selected={paymentMethod === "card"}
              onClick={() => setPaymentMethod("card")}
            />
            <PaymentOption
              icon={<Wallet className="h-5 w-5" />}
              title="Dinheiro"
              subtitle="Informe o troco"
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
          {isSubmitting ? "Enviando pedido..." : "Finalizar pedido via WhatsApp"}
        </button>

        <div className="h-4" />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-gray-700">{title}</h2>
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
        selected ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
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
        selected ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
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
          error ? "border-red-300" : "border-gray-200"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
