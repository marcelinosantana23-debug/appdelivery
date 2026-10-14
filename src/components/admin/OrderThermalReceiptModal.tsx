import React, { useState } from "react";
import {
  X,
  Printer,
  Bluetooth,
  Copy,
  Check,
  FileText,
  Sliders,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Order } from "@/types";
import { useStore } from "@/context/StoreContext";
import {
  formatPrice,
  formatOrderExactDateTime,
  formatTableDisplay,
} from "@/utils/order";
import {
  generatePlainTextReceipt,
  printReceiptViaBrowser,
  printViaWebBluetooth,
  type ThermalPaperWidth,
} from "@/utils/thermalPrinter";

interface OrderThermalReceiptModalProps {
  order: Order;
  onClose: () => void;
}

export function OrderThermalReceiptModal({ order, onClose }: OrderThermalReceiptModalProps) {
  const { config, showToast } = useStore();
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>("58mm");
  const [copies, setCopies] = useState<"1" | "2">("1");
  const [isPrintingNative, setIsPrintingNative] = useState(false);
  const [isPrintingBluetooth, setIsPrintingBluetooth] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const isDineIn = order.orderType === "dine_in" || (order as any).delivery_type === "dine_in";
  const isPickup = order.orderType === "pickup" || (order as any).delivery_type === "pickup";
  const isDelivery = !isPickup && !isDineIn;
  const tableNum = order.tableNumber || (order as any).table_number || (order as any).table || "";
  const exactTime = formatOrderExactDateTime(order.createdAt, order as any) || new Date().toLocaleString("pt-BR");

  // Itens e Totais
  const items = order.items || [];
  const calculatedSubtotal = items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.product?.price ?? (item as any).price ?? 0);
    const optionsTotal = (item.selectedOptions || []).reduce((oAcc, opt) => {
      const optPrice = typeof opt === "object" && opt.price ? Number(opt.price) * qty : 0;
      return oAcc + optPrice;
    }, 0);
    return acc + price * qty + optionsTotal;
  }, 0);

  const subtotal = Number(order.subtotal) || calculatedSubtotal;
  const deliveryFee = isDelivery ? Number(order.deliveryFee ?? config.deliveryFee ?? 0) : 0;
  const total = Number(order.total) || (subtotal + deliveryFee);

  // Gera o HTML do cupom térmico para visualização e impressão nativa
  const renderSingleReceiptHtml = (tag: string) => {
    return `
      <div style="font-family: 'Courier New', Courier, monospace; color: #000; text-transform: uppercase;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="font-size: 1.35em; font-weight: 900; letter-spacing: 0.5px;">${config.name.toUpperCase()}</div>
          ${config.tagline ? `<div style="font-size: 0.9em; margin-top: 2px;">${config.tagline}</div>` : ""}
          ${config.address ? `<div style="font-size: 0.85em; margin-top: 2px;">${config.address}</div>` : ""}
          ${config.whatsapp ? `<div style="font-size: 0.85em; margin-top: 1px;">WHATSAPP: ${config.whatsapp}</div>` : ""}
        </div>

        <div style="text-align: center; margin: 6px 0;">
          <div style="font-size: 1.4em; font-weight: 900; letter-spacing: 1px;">PEDIDO ${order.id}</div>
          <div style="font-size: 0.85em; font-weight: bold; margin-top: 2px;">[ ${tag} ]</div>
          <div style="font-size: 0.85em; margin-top: 2px;">${exactTime}</div>
          <div style="font-size: 0.95em; font-weight: 900; margin-top: 3px; border: 2px solid #000; padding: 3px 6px; display: inline-block;">
            ${isDineIn ? `CONSUMIR AQUI - ${formatTableDisplay(tableNum).toUpperCase()}` : isPickup ? "RETIRADA NO BALCAO" : "ENTREGA A DOMICILIO"}
          </div>
        </div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="font-size: 0.9em; margin-bottom: 6px;">
          <div style="font-weight: 900; margin-bottom: 2px;">CLIENTE:</div>
          <div><strong>NOME:</strong> ${order.customerName || "Cliente"}</div>
          <div><strong>TEL/WHATS:</strong> ${order.customerPhone || "Nao informado"}</div>
          
          ${
            isDineIn
              ? `
            <div style="margin-top: 6px; padding: 6px; border: 2px dashed #000; text-align: center; background-color: #f8fafc;">
              <div style="font-weight: 900; font-size: 1.15em;">*** CONSUMIR AQUI ***</div>
              <div style="font-weight: 900; font-size: 1.3em; margin-top: 2px;">${formatTableDisplay(tableNum).toUpperCase()}</div>
              <div style="font-size: 0.85em; margin-top: 2px;">ATENDIMENTO: SERVIR NA MESA</div>
            </div>
          `
              : !isPickup && order.address
              ? `
            <div style="margin-top: 4px; font-weight: 900;">ENDERECO DE ENTREGA:</div>
            <div>${order.address.street}, No ${order.address.number || "S/N"}</div>
            ${order.address.district ? `<div>BAIRRO: ${order.address.district}</div>` : ""}
            ${order.address.complement ? `<div>COMPL: ${order.address.complement}</div>` : ""}
            ${order.address.reference ? `<div style="font-weight: bold;">REF: ${order.address.reference}</div>` : ""}
            ${order.location_url || order.locationUrl ? `<div>[X] LOCALIZACAO GPS ANEXADA</div>` : ""}
          `
              : isPickup
              ? `<div style="margin-top: 4px; font-weight: bold;">>> O CLIENTE RETIRA NO LOCAL <<</div>`
              : ""
          }
        </div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="font-size: 0.9em;">
          <div style="display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 4px;">
            <span>ITENS DO PEDIDO</span>
            <span>VALOR</span>
          </div>
          ${items
            .map((item) => {
              const qty = Number(item.quantity) || 1;
              const prodName = item.product?.name || (item as any).name || "Produto";
              const unitPrice = Number(item.product?.price ?? (item as any).price ?? 0);
              const itemTotal = unitPrice * qty;
              return `
              <div style="margin-bottom: 4px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                  <span>${qty}x ${prodName}</span>
                  <span>${formatPrice(itemTotal, config)}</span>
                </div>
                ${
                  Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0
                    ? item.selectedOptions
                        .map((opt) => {
                          const oName = typeof opt === "string" ? opt : opt.name;
                          const oPrice = typeof opt === "object" && opt.price ? Number(opt.price) * qty : 0;
                          return `
                        <div style="padding-left: 10px; font-size: 0.85em; display: flex; justify-content: space-between;">
                          <span>+ ${oName}</span>
                          ${oPrice > 0 ? `<span>${formatPrice(oPrice, config)}</span>` : ""}
                        </div>
                      `;
                        })
                        .join("")
                    : ""
                }
                ${
                  item.notes && item.notes.trim()
                    ? `<div style="padding-left: 10px; font-size: 0.85em; font-style: italic;">OBS: ${item.notes.trim()}</div>`
                    : ""
                }
              </div>
            `;
            })
            .join("")}
        </div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="font-size: 0.95em;">
          <div style="display: flex; justify-content: space-between;">
            <span>SUBTOTAL:</span>
            <span>${formatPrice(subtotal, config)}</span>
          </div>
          ${
            !isPickup
              ? `
            <div style="display: flex; justify-content: space-between;">
              <span>TAXA ENTREGA:</span>
              <span>${formatPrice(deliveryFee, config)}</span>
            </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; font-size: 1.25em; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;">
            <span>TOTAL:</span>
            <span>${formatPrice(total, config)}</span>
          </div>
        </div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="font-size: 0.9em; margin-bottom: 6px;">
          <div style="font-weight: 900;">PAGAMENTO:</div>
          <div>
            ${
              order.paymentMethod === "pix"
                ? `PAGAMENTO VIA PIX ${order.pixReceiptUrl || order.pix_receipt_url ? "(COMPROVANTE ANEXADO)" : ""}`
                : order.paymentMethod === "card"
                ? `CARTAO NA ENTREGA (${order.cardType === "credit" ? "CREDITO" : "DEBITO"})`
                : order.paymentMethod === "cash"
                ? `DINHEIRO NA ENTREGA ${order.changeFor ? `<br>TROCO PARA: R$ ${order.changeFor}` : "(SEM TROCO)"}`
                : order.paymentMethod
            }
          </div>
        </div>

        <div style="text-align: center; border-top: 2px solid #000; padding-top: 6px; margin-top: 8px; font-size: 0.85em;">
          <div>AGRADECEMOS A PREFERENCIA!</div>
          <div style="font-size: 0.8em; margin-top: 2px;">TOP FOOD DELIVERY</div>
        </div>
      </div>
    `;
  };

  const fullPrintHtml =
    copies === "2"
      ? `
      ${renderSingleReceiptHtml("1a VIA - COZINHA / MOTOBOY")}
      <div style="page-break-after: always; border-bottom: 3px dashed #000; margin: 25px 0;"></div>
      ${renderSingleReceiptHtml("2a VIA - CLIENTE")}
    `
      : renderSingleReceiptHtml("VIA UNICA");

  // Ação 1: Impressão Nativa (USB, Bluetooth pareado ou Impressora do Sistema)
  const handlePrintNative = async () => {
    setIsPrintingNative(true);
    setStatusMessage(null);
    try {
      const ok = await printReceiptViaBrowser(fullPrintHtml, paperWidth);
      if (ok) {
        showToast("Comprovante enviado para a fila de impressão!", "success");
      }
    } catch (e: any) {
      setStatusMessage({ text: e.message || "Erro ao disparar impressão nativa.", type: "error" });
    } finally {
      setIsPrintingNative(false);
    }
  };

  // Ação 2: Impressão direta via Web Bluetooth API (ESC/POS)
  const handlePrintBluetooth = async () => {
    setIsPrintingBluetooth(true);
    setStatusMessage(null);
    try {
      if (copies === "2") {
        const res1 = await printViaWebBluetooth(order, config, paperWidth, "VIA LOJA/COZINHA");
        if (!res1.success) {
          setStatusMessage({ text: res1.error || "Falha na comunicação Bluetooth.", type: "error" });
          return;
        }
        await new Promise((r) => setTimeout(r, 800));
        await printViaWebBluetooth(order, config, paperWidth, "VIA CLIENTE");
      } else {
        const res = await printViaWebBluetooth(order, config, paperWidth, "COMPROVANTE");
        if (!res.success) {
          setStatusMessage({ text: res.error || "Falha na comunicação Bluetooth.", type: "error" });
          return;
        }
      }
      showToast("Comprovante impresso com sucesso na impressora Bluetooth!", "success");
      setStatusMessage({ text: "Impresso com sucesso via Bluetooth ESC/POS!", type: "success" });
    } catch (e: any) {
      setStatusMessage({ text: e.message || "Erro na conexão Bluetooth.", type: "error" });
    } finally {
      setIsPrintingBluetooth(false);
    }
  };

  // Ação 3: Copiar texto formatado
  const handleCopyText = async () => {
    const text = generatePlainTextReceipt(order, config, paperWidth, copies === "2" ? "VIA LOJA/COZINHA" : "COMPROVANTE");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      showToast("Texto do cupom copiado para a área de transferência!", "success");
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      showToast("Não foi possível copiar o texto automaticamente.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden my-auto">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 text-white shadow-md">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Imprimir Comprovante</span>
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-extrabold text-amber-400 border border-amber-500/30">
                  {order.id}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Bobina térmica 58mm / 80mm • Bluetooth ESC/POS & USB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Barra de Opções de Impressão */}
        <div className="border-b border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Largura da Bobina */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Sliders className="h-3 w-3 text-amber-400" />
                <span>Largura da Bobina:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaperWidth("58mm")}
                  className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                    paperWidth === "58mm"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  58mm (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth("80mm")}
                  className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                    paperWidth === "80mm"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  80mm (Larga)
                </button>
              </div>
            </div>

            {/* Número de Vias */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3 text-amber-400" />
                <span>Número de Vias:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCopies("1")}
                  className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                    copies === "1"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  1 Via Única
                </button>
                <button
                  type="button"
                  onClick={() => setCopies("2")}
                  className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                    copies === "2"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  2 Vias (Cozinha+Cliente)
                </button>
              </div>
            </div>
          </div>

          {/* Feedback de status */}
          {statusMessage && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                statusMessage.type === "success"
                  ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-200"
                  : statusMessage.type === "error"
                  ? "bg-red-950/80 border border-red-500/40 text-red-200"
                  : "bg-blue-950/80 border border-blue-500/40 text-blue-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* PRÉ-VISUALIZAÇÃO DO CUPOM TÉRMICO */}
        <div className="max-h-[50vh] overflow-y-auto p-4 bg-slate-950/40">
          <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between">
            <span>Pré-visualização do Papel Térmico:</span>
            <span className="text-[10px] text-slate-500 uppercase">
              {paperWidth} • {copies === "2" ? "2 Vias" : "Via Única"}
            </span>
          </div>

          <div
            className={`mx-auto bg-white text-black p-4 rounded-xl shadow-inner border border-gray-300 font-mono text-xs uppercase leading-tight transition-all ${
              paperWidth === "58mm" ? "max-w-[290px]" : "max-w-[380px]"
            }`}
            style={{
              backgroundImage: "radial-gradient(#f0f0f0 10%, transparent 11%)",
              backgroundSize: "8px 8px",
            }}
          >
            {/* Linha serrilhada do topo */}
            <div className="border-b border-dashed border-gray-400 pb-2 mb-2 text-center">
              <p className="font-black text-sm tracking-wide">{config.name}</p>
              {config.tagline && <p className="text-[10px] text-gray-700">{config.tagline}</p>}
              {config.address && <p className="text-[10px] text-gray-700">{config.address}</p>}
              {config.whatsapp && <p className="text-[10px] text-gray-700 font-bold">Tel: {config.whatsapp}</p>}
            </div>

            {/* Número do Pedido e Identificação */}
            <div className="text-center py-1 border-b border-gray-300 mb-2">
              <p className="text-base font-black tracking-widest">PEDIDO {order.id}</p>
              <p className="text-[10px] font-bold text-gray-600">
                [ {copies === "2" ? "1ª VIA - COZINHA / 2ª VIA - CLIENTE" : "COMPROVANTE"} ]
              </p>
              <p className="text-[10px] text-gray-600">{exactTime}</p>
              <div className="mt-1 inline-block border-2 border-black px-2 py-0.5 text-[10px] font-black">
                {isPickup ? "RETIRADA NO BALCÃO" : "ENTREGA A DOMICÍLIO"}
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="text-[11px] border-b border-dashed border-gray-400 pb-2 mb-2 space-y-0.5">
              <p className="font-black text-[11px] text-gray-900">CLIENTE:</p>
              <p>
                <span className="font-bold">NOME:</span> {order.customerName}
              </p>
              <p>
                <span className="font-bold">TEL:</span> {order.customerPhone}
              </p>

              {!isPickup && order.address ? (
                <div className="mt-1 pt-1 border-t border-dotted border-gray-300">
                  <p className="font-bold">ENDEREÇO DE ENTREGA:</p>
                  <p>
                    {order.address.street}, Nº {order.address.number || "S/N"}
                  </p>
                  {order.address.district && <p>Bairro: {order.address.district}</p>}
                  {order.address.complement && <p>Compl: {order.address.complement}</p>}
                  {order.address.reference && (
                    <p className="font-black bg-gray-100 p-0.5 rounded mt-0.5">
                      REF: {order.address.reference}
                    </p>
                  )}
                  {(order.location_url || order.locationUrl) && (
                    <p className="text-[10px] font-bold text-gray-700 mt-0.5">[X] GPS ANEXADO AO PEDIDO</p>
                  )}
                </div>
              ) : (
                <p className="font-bold text-[10px] mt-1 text-gray-800">
                  * CLIENTE RETIRA NO LOCAL / BALCÃO *
                </p>
              )}
            </div>

            {/* Itens */}
            <div className="text-[11px] border-b border-dashed border-gray-400 pb-2 mb-2">
              <div className="flex justify-between font-black pb-1 mb-1 border-b border-gray-300">
                <span>ITEM / QTD</span>
                <span>VALOR</span>
              </div>
              <div className="space-y-1.5">
                {items.map((it, idx) => {
                  const qty = Number(it.quantity) || 1;
                  const prodName = it.product?.name || (it as any).name || "Produto";
                  const unitPrice = Number(it.product?.price ?? (it as any).price ?? 0);
                  const itemTotal = unitPrice * qty;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>
                          {qty}x {prodName}
                        </span>
                        <span>{formatPrice(itemTotal, config)}</span>
                      </div>
                      {Array.isArray(it.selectedOptions) && it.selectedOptions.length > 0 && (
                        <div className="pl-2 text-[10px] text-gray-700">
                          {it.selectedOptions.map((opt, oIdx) => {
                            const oName = typeof opt === "string" ? opt : opt.name;
                            const oPrice = typeof opt === "object" && opt.price ? Number(opt.price) * qty : 0;
                            return (
                              <div key={oIdx} className="flex justify-between">
                                <span>+ {oName}</span>
                                {oPrice > 0 && <span>{formatPrice(oPrice, config)}</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {it.notes && (
                        <p className="pl-2 text-[10px] text-gray-600 italic">
                          Obs: {it.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financeiro */}
            <div className="text-[11px] border-b border-dashed border-gray-400 pb-2 mb-2 space-y-1">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatPrice(subtotal, config)}</span>
              </div>
              {!isPickup && (
                <div className="flex justify-between">
                  <span>TAXA ENTREGA:</span>
                  <span>{formatPrice(deliveryFee, config)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t-2 border-black pt-1 mt-1">
                <span>TOTAL:</span>
                <span>{formatPrice(total, config)}</span>
              </div>
            </div>

            {/* Pagamento */}
            <div className="text-[11px] border-b border-dashed border-gray-400 pb-2 mb-2">
              <p className="font-black">FORMA DE PAGAMENTO:</p>
              <p className="font-bold text-[11px]">
                {order.paymentMethod === "pix"
                  ? `PIX (PAGAMENTO INSTANTÂNEO)`
                  : order.paymentMethod === "card"
                  ? `CARTÃO NA ENTREGA (${order.cardType === "credit" ? "CRÉDITO" : "DÉBITO"})`
                  : order.paymentMethod === "cash"
                  ? `DINHEIRO NA ENTREGA`
                  : order.paymentMethod}
              </p>
              {order.paymentMethod === "cash" && order.changeFor && (
                <p className="text-[10px] font-bold text-gray-700">Troco para: R$ {order.changeFor}</p>
              )}
            </div>

            {/* Rodapé */}
            <div className="text-center text-[10px] pt-1">
              <p className="font-bold">OBRIGADO PELA PREFERÊNCIA!</p>
              <p className="text-[9px] text-gray-500">TOP FOOD DELIVERY</p>
            </div>
          </div>
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2.5">
          {/* Botão de Impressão Nativa (Principal) */}
          <button
            type="button"
            id="btn-print-receipt-native"
            onClick={handlePrintNative}
            disabled={isPrintingNative}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 py-3 px-4 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            <span>{isPrintingNative ? "Abrindo Impressora..." : "Imprimir (Nativo / USB)"}</span>
          </button>

          {/* Botão Bluetooth Direto (ESC/POS) */}
          <button
            type="button"
            id="btn-print-receipt-bluetooth"
            onClick={handlePrintBluetooth}
            disabled={isPrintingBluetooth}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 px-3.5 text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer disabled:opacity-60"
            title="Conectar diretamente a impressora térmica Bluetooth portátil via Web Bluetooth API (ESC/POS)"
          >
            <Bluetooth className="h-4 w-4 text-blue-200" />
            <span>{isPrintingBluetooth ? "Enviando..." : "Bluetooth Direto"}</span>
          </button>

          {/* Botão Copiar Texto do Cupom */}
          <button
            type="button"
            id="btn-copy-receipt-text"
            onClick={handleCopyText}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-3 px-3.5 text-xs font-bold text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
            title="Copiar texto monoespaçado do cupom para colar no WhatsApp ou app RawBT"
          >
            {copiedText ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copiedText ? "Copiado!" : "Copiar Texto"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
