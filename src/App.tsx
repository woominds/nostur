import { useEffect } from "react";
import { Shell } from "./components/Shell";
import { LoginScreen } from "./components/LoginScreen";
import { useBrowserStore } from "./store/browserStore";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const createTab = useBrowserStore((state) => state.createTab);

  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const unsubscribe = window.nostur?.onNewTabFromMain?.(({ url }) => {
      createTab({
        url,
        activate: true
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [createTab]);

  if (!initialized || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#eef1f6] text-[#1f2937]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-nostur-orange text-xl font-black text-black shadow-md">
            N
          </div>
          <div className="text-sm font-black">Cargando NOSTUR...</div>
          <div className="mt-1 text-xs text-[#64748b]">Verificando sesión</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return <Shell />;
}