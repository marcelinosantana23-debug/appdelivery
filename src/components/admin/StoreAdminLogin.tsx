import { useState } from "react";
import { ArrowLeft, Lock, Mail, Eye, EyeOff, Store, Shield, AlertCircle, AlertTriangle } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName } from "@/utils/storeFormat";
import { GlobalReloadButton } from "@/components/common/GlobalReloadButton";

interface StoreAdminLoginProps {
  onBack: () => void;
  onSuccess?: () => void;
  onGoToSuperAdmin?: () => void;
}

export function StoreAdminLogin({ onBack, onSuccess, onGoToSuperAdmin }: StoreAdminLoginProps) {
  const { login, config } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuperAdminBlocked, setIsSuperAdminBlocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSuperAdminBlocked(false);
    setLoading(true);

    try {
      // Passa portal 'store' para que o backend e o context validem RBAC estritamente
      const res = await login(email, password, "store");

      if (!res.success) {
        if (
          res.isSuperAdminAttempt ||
          res.role === "super_admin" ||
          res.error?.includes("SUPER_ADMIN") ||
          res.error?.includes("super-admin")
        ) {
          setIsSuperAdminBlocked(true);
          setError(
            "Acesso negado: Administradores da plataforma (SUPER_ADMIN) devem acessar exclusivamente pelo portal /super-admin."
          );
        } else {
          setError(res.error || "E-mail ou senha incorretos.");
        }
        setLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro de conexão ao autenticar.";
      setError(msg);
      setLoading(false);
    }
  };

  const handleNavigateSuperAdmin = () => {
    if (onGoToSuperAdmin) {
      onGoToSuperAdmin();
    } else if (typeof window !== "undefined") {
      window.history.pushState({ view: "superadmin" }, "", "/super-admin");
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-4">
      {/* Dynamic store gradient background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 30% 20%, var(--color-primary) 0%, transparent 50%), radial-gradient(circle at 70% 80%, var(--color-primary-light) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o cardápio
          </button>
          <GlobalReloadButton variant="dark" />
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md text-slate-100">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-3xl shadow-lg shadow-red-900/30">
              <StoreLogo logo={config.logo} name={config.name} className="h-full w-full object-cover" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-300 border border-slate-700 mb-2">
              <Store className="h-3 w-3 text-amber-400" />
              Painel do Lojista • {getSafeDisplayName(config.name, "Lanchonete")}
            </div>
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              Acesso da Lanchonete
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Entre com as credenciais da sua loja para gerenciar cardápio, pedidos e configurações.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                E-mail do Administrador da Loja
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (isSuperAdminBlocked) setIsSuperAdminBlocked(false);
                  }}
                  placeholder="admin@sualoja.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Alerta Destacado de RBAC: Barrando usuário SUPER_ADMIN */}
            {isSuperAdminBlocked && (
              <div className="rounded-2xl border border-amber-500/60 bg-amber-950/80 p-4 text-xs text-amber-200 animate-fade-in shadow-lg space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <span>Acesso Recusado: Perfil SUPER_ADMIN</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  A tela de login da lanchonete recusa e barra usuários com role <strong>SUPER_ADMIN</strong>.
                  O Super Administrador deve logar exclusivamente pela rota <strong>/super-admin</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleNavigateSuperAdmin}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 px-4 font-bold text-slate-950 shadow-md hover:bg-amber-400 transition active:scale-[0.98]"
                >
                  <Shield className="h-4 w-4" />
                  <span>Acessar Login Super Admin (/super-admin)</span>
                </button>
              </div>
            )}

            {!isSuperAdminBlocked && error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
              <span>Acesso Demo: <strong className="text-slate-200">admin@marcelino.com</strong></span>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@marcelino.com");
                  setPassword("123456");
                }}
                className="text-amber-400 hover:text-amber-300 font-bold underline ml-2"
              >
                Preencher
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-red-600 to-amber-600 py-3 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Entrar no Painel da Loja"}
            </button>
          </form>

          <div className="mt-5 border-t border-slate-800/80 pt-4 text-center">
            <button
              type="button"
              onClick={handleNavigateSuperAdmin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>É o administrador da plataforma? Acessar /super-admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
