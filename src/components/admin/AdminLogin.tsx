import { useState } from "react";
import { ArrowLeft, Lock, Mail, Eye, EyeOff, ChefHat } from "lucide-react";
import { useStore } from "@/context/StoreContext";

interface AdminLoginProps {
  onBack: () => void;
}

export function AdminLogin({ onBack }: AdminLoginProps) {
  const { login, config } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login(email, password);
    if (!success) {
      setError("E-mail ou senha incorretos. Tente novamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 p-4">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 30% 20%, var(--color-primary) 0%, transparent 50%), radial-gradient(circle at 70% 80%, var(--color-primary-light) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a loja
        </button>

        <div className="rounded-3xl bg-white p-7 shadow-2xl animate-scale-in">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">
              {config.logo}
            </div>
            <h1 className="text-xl font-bold text-gray-800">Painel Administrativo</h1>
            <p className="mt-1 text-sm text-gray-400">{config.name}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@loja.com"
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-primary"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-10 text-sm text-gray-800 outline-none transition focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3.5 font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-primary-dark"
            >
              Entrar no painel
            </button>
          </form>

          <div className="mt-5 rounded-lg bg-gray-50 px-4 py-3 text-center text-xs text-gray-400">
            <p>Demo: admin@loja.com / 123456</p>
          </div>
        </div>
      </div>
    </div>
  );
}
