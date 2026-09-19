import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Phone,
  MapPin,
  Compass,
  ShoppingBag,
  Calendar,
  MessageCircle,
  RefreshCw,
  Award,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatPrice } from "@/utils/order";
import type { Customer } from "@/types";

export function AdminCustomers() {
  const { currentTenant, config } = useStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const tenantIdentifier = currentTenant?.slug || config?.slug || "marcelino";

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tenants/${tenantIdentifier}/customers`);
      if (res.ok) {
        const data = await res.json();
        if (data.customers) {
          setCustomers(data.customers);
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar clientes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantIdentifier]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = customers.filter((c) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.replace(/\D/g, "").includes(term) ||
      (c.district && c.district.toLowerCase().includes(term))
    );
  });

  const totalSpentAll = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
  const totalOrdersAll = customers.reduce((acc, c) => acc + (c.totalOrders || 1), 0);

  return (
    <div className="mx-auto w-full max-w-5xl p-3 sm:p-4 space-y-4 sm:space-y-5 flex flex-col max-w-full overflow-x-hidden">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Base de Clientes Cadastrados
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Clientes registrados automaticamente no primeiro pedido com retenção de endereço e contato.
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Clientes</span>
          <p className="mt-1 text-2xl font-bold text-gray-900">{customers.length}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Auto-cadastrados via pedidos</span>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedidos Concluídos</span>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalOrdersAll}</p>
          <span className="text-[11px] text-blue-600 font-medium">Pedidos vinculados aos clientes</span>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Faturamento Clientes</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatPrice(totalSpentAll, config)}</p>
          <span className="text-[11px] text-gray-400">Total gerado pela base</span>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou bairro..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary shadow-sm"
        />
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando clientes cadastrados...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400 rounded-2xl bg-white border border-gray-200">
          <Users className="h-12 w-12 stroke-[1.2]" />
          <p className="font-semibold text-gray-600">Nenhum cliente encontrado</p>
          <p className="text-xs text-gray-400">
            {search ? "Tente outro termo de busca." : "Assim que um pedido for recebido, o cliente aparecerá aqui."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer) => {
            const cleanPhone = customer.phone.replace(/\D/g, "");
            return (
              <div
                key={customer.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 transition"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                      {customer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-gray-900 text-sm">{customer.name}</h2>
                        {customer.totalOrders > 1 && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <Award className="h-3 w-3" />
                            Recorrente ({customer.totalOrders} pedidos)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/55${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-green-700 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <a
                      href={`tel:${cleanPhone}`}
                      className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      <span>Ligar</span>
                    </a>
                  </div>
                </div>

                {/* Details grid */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
                  {/* Address */}
                  <div className="space-y-1">
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-red-500" />
                      Endereço de Entrega Cadastrado:
                    </span>
                    {customer.street ? (
                      <div className="pl-4.5 space-y-0.5">
                        <p className="font-medium text-gray-800">
                          {customer.street}, Nº {customer.number} — {customer.district}
                        </p>
                        {customer.complement && (
                          <p className="text-gray-500">Complemento: {customer.complement}</p>
                        )}
                        {customer.reference && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800 text-[11px] font-medium">
                            <Compass className="h-3 w-3 text-amber-600" />
                            <span>Ponto de Ref: {customer.reference}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="pl-4.5 text-gray-400 italic">Endereço ainda não registrado</p>
                    )}
                  </div>

                  {/* Stats & History */}
                  <div className="space-y-1 sm:border-l sm:border-gray-100 sm:pl-3">
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                      <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                      Histórico de Consumo:
                    </span>
                    <div className="pl-4.5 space-y-0.5">
                      <p>
                        Total de Pedidos: <strong className="font-bold text-gray-800">{customer.totalOrders}</strong>
                      </p>
                      <p>
                        Gasto Total:{" "}
                        <strong className="font-bold text-emerald-600">
                          {formatPrice(customer.totalSpent || 0, config)}
                        </strong>
                      </p>
                      {customer.lastOrderAt && (
                        <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                          <Calendar className="h-3 w-3" />
                          Último pedido em: {new Date(customer.lastOrderAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
