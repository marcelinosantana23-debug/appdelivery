import { useState } from "react";
import { ArrowLeft, Lock, Mail, Eye, EyeOff, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { SUPER_ADMIN_CREDENTIALS } from "@/config/store";

interface SuperAdminLoginProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export function SuperAdminLogin({ onBack, onSuccess }: SuperAdminLoginProps) {
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || "E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      if (res.role !== "super_admin") {
        setError(
          "Acesso restrito: esta conta não possui privilégios de Super Admin. Use a Área do Lojista para acessar sua lanchonete."
        );
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

  const fillCredentials = () => {
    setEmail(SUPER_ADMIN_CREDENTIALS.email);
    setPassword(SUPER_ADMIN_CREDENTIALS.password);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-4">
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background: `radial-gradient(circle at 50% 20%, #d97706 0%, transparent 60%), radial-gradient(circle at 80% 80%, #b91c1c 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-md">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a vitrine
        </button>

        <div className="rounded-3xl border border-amber-500/30 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md text-slate-100">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-white shadow-lg shadow-amber-500/20 border border-amber-400/40">
              <Shield className="h-7 w-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400 border border-amber-500/30 mb-2">
              <Lock className="h-3 w-3" />
              Área Restrita • Plataforma Global
            </div>
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              Painel Super Admin
            </h1>
            <p className="mt-1.5 text-xs text-slate-400">
              Autenticação obrigatória para acessar o painel de controle e gerenciamento de todas as lanchonetes.
            </p>
          </div>

          {/* Demo Quick Fill */}
          <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Acesso Rápido de Demonstração
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono">superadmin@plataforma.com</span>
            </div>
            <button
              type="button"
              onClick={fillCredentials}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 active:scale-[0.98]"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
              Preencher Credenciais Super Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                E-mail do Super Admin
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@plataforma.com"
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

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Verificando permissões..." : "Entrar no Painel Super Admin"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Sessão protegida por token de autenticação e criptografia no Cloudflare D1
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
