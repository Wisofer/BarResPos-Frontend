import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Eye, EyeOff, Lock, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { SessionLoader } from "../components/SessionLoader";
import { APP_NAME } from "../config/brand.js";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, sessionLoading, login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (!loading && user) navigate(location.state?.from?.pathname || "/app", { replace: true });
  }, [user, loading, navigate, location.state?.from?.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from?.pathname || "/app", { replace: true });
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("fetch") || msg.includes("Failed") || msg.includes("Connection") || msg.includes("Network")) {
        setError("No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.");
      } else {
        setError(msg || "Usuario o contraseña incorrectos.");
      }
    }
  };

  if (sessionLoading) return <SessionLoader message="Iniciando sesión..." />;
  if (loading) return <SessionLoader message="Verificando sesión..." />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary-100 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-100 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-6 p-4 md:p-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden h-[640px] rounded-3xl border border-slate-200 bg-white p-9 shadow-sm lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <img src="/assets/images/nandofood.png" alt={`${APP_NAME} logo`} className="h-10 w-10 object-contain" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-slate-800">{APP_NAME}</p>
              <p className="text-sm text-slate-500">Control operativo de bar y restaurante</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="max-w-md text-4xl font-semibold leading-tight text-slate-800">
              Sistema limpio para operar rápido y sin confusión.
            </p>
            <p className="max-w-md text-base text-slate-500">
              Gestiona mesas, cocina, pedidos y caja desde una sola interfaz clara.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mesas</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Operación ágil</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cocina</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Seguimiento KDS</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Caja</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Cobro C$ / USD</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-9">
          <div className="mb-5 flex justify-center">
            <img
              src="/assets/images/nandofood.png"
              alt={`${APP_NAME} logo`}
              className="h-24 w-auto object-contain"
            />
          </div>
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold text-slate-800">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-slate-500">Accede al panel administrativo</p>
          </div>

          {import.meta.env.VITE_STATIC_MODE === "true" && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <Sparkles className="h-4 w-4" />
              Modo estatico activo: puedes entrar con cualquier usuario y contraseña.
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Usuario</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="ej. administrador"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Contrasena</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? "Ocultar contrasena" : "Ver contrasena"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Entrar al sistema
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} {APP_NAME}</p>
          <p className="mt-2 text-center text-xs text-slate-500">
            Desarrollado por{" "}
            <a
              href="https://www.cowib.es"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary-600 hover:underline"
            >
              COWIB
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
