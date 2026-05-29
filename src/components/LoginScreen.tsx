import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    await signIn(email, password);
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_24%_18%,rgba(255,122,26,0.18),transparent_30%),radial-gradient(circle_at_76%_16%,rgba(90,120,190,0.20),transparent_32%),linear-gradient(135deg,#eef1f6,#dfe5ee_48%,#eef1f6)] px-6 text-[#1f2937]">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_390px]">
        <section className="hidden flex-col justify-center lg:flex">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-nostur-orange text-2xl font-black text-black shadow-lg">
            N
          </div>

          <h1 className="max-w-xl text-4xl font-black tracking-tight text-[#111827]">
            NOSTUR Browser Base
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-[#64748b]">
            Navegador operativo de trabajo para NOSSIX Travel. Acceso centralizado a aplicativos,
            sesiones persistentes, favoritos, credenciales y entorno controlado.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-wider text-[#475569]">
                Apps
              </div>
              <div className="mt-1 text-[11px] text-[#64748b]">Experts, Ábaco, Aivo, CRM</div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-wider text-[#475569]">
                Tabs
              </div>
              <div className="mt-1 text-[11px] text-[#64748b]">Agrupadas por aplicativo</div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-wider text-[#475569]">
                Seguridad
              </div>
              <div className="mt-1 text-[11px] text-[#64748b]">Login Supabase Auth</div>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-black/10 bg-white/85 p-6 shadow-2xl backdrop-blur"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-nostur-orange text-xl font-black text-black shadow-md lg:hidden">
              N
            </div>

            <h2 className="text-xl font-black text-[#111827]">Ingresar a NOSTUR</h2>
            <p className="mt-1 text-xs text-[#64748b]">
              Usá tu usuario autorizado de NOSSIX.
            </p>
          </div>

          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#64748b]">
            Email
          </label>

          <div className="mb-4 flex h-11 items-center gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] px-3 focus-within:border-nostur-orange">
            <Mail size={16} strokeWidth={1.8} className="text-[#64748b]" />

            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError();
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
              placeholder="usuario@nossix.com.ar"
              type="email"
              autoComplete="email"
            />
          </div>

          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#64748b]">
            Contraseña
          </label>

          <div className="mb-4 flex h-11 items-center gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] px-3 focus-within:border-nostur-orange">
            <LockKeyhole size={16} strokeWidth={1.8} className="text-[#64748b]" />

            <input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
              title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? (
                <EyeOff size={16} strokeWidth={1.8} />
              ) : (
                <Eye size={16} strokeWidth={1.8} />
              )}
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="flex h-11 w-full items-center justify-center rounded-2xl bg-nostur-orange text-sm font-black text-black shadow-md transition hover:bg-nostur-orangeSoft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="mt-4 text-center text-[11px] text-[#64748b]">
            Acceso privado. La gestión de usuarios se realiza desde Supabase Auth.
          </p>
        </form>
      </div>
    </div>
  );
}