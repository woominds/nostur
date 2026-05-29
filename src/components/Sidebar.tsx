import {
  HomeIcon,
  LogOut,
  PencilLine,
  Settings,
  Star
} from "lucide-react";
import type { ReactNode } from "react";
import { useBrowserStore } from "../store/browserStore";
import { useAuthStore } from "../store/authStore";
import { getAppById } from "../registry/appRegistry";

type HomeMode = "apps" | "favorites" | "settings";

type SidebarButtonProps = {
  label: string;
  icon: ReactNode;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
};

function ChatGptLogo({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 41 41"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="currentColor"
        d="M37.53 16.87a9.95 9.95 0 0 0-.85-8.19 10.08 10.08 0 0 0-10.83-4.81A9.99 9.99 0 0 0 18.29.5a10.06 10.06 0 0 0-9.61 7.12A9.99 9.99 0 0 0 1.9 12.44a10.08 10.08 0 0 0 1.24 11.8 9.95 9.95 0 0 0 .85 8.19 10.08 10.08 0 0 0 10.83 4.81 9.99 9.99 0 0 0 7.56 3.37 10.06 10.06 0 0 0 9.61-7.12 9.99 9.99 0 0 0 6.78-4.82 10.08 10.08 0 0 0-1.24-11.8Zm-15.15 21.1a7.44 7.44 0 0 1-4.77-1.72l.23-.13 7.92-4.57a1.31 1.31 0 0 0 .66-1.14V19.24l3.35 1.94c.03.01.05.04.05.07v9.25a7.47 7.47 0 0 1-7.44 7.47Zm-16.1-6.86a7.42 7.42 0 0 1-.89-5l.23.14 7.93 4.57a1.31 1.31 0 0 0 1.31 0l9.68-5.59v3.87a.09.09 0 0 1-.04.07l-8.01 4.62a7.47 7.47 0 0 1-10.21-2.68ZM4.18 13.75a7.44 7.44 0 0 1 3.88-3.29v9.41c0 .47.25.91.66 1.14l9.68 5.59-3.35 1.93a.09.09 0 0 1-.08 0l-8.01-4.62a7.47 7.47 0 0 1-2.78-10.16Zm28.1 6.24-9.68-5.59 3.35-1.93a.09.09 0 0 1 .08 0l8.01 4.62a7.47 7.47 0 0 1-1.1 13.45v-9.41c0-.47-.25-.91-.66-1.14Zm3.43-5.08-.23-.14-7.93-4.57a1.31 1.31 0 0 0-1.31 0l-9.68 5.59v-3.87c0-.03.02-.06.04-.07l8.01-4.62a7.47 7.47 0 0 1 11.1 7.68Zm-21.12 6.86-3.35-1.94a.09.09 0 0 1-.05-.07v-9.25a7.47 7.47 0 0 1 12.21-5.75l-.23.13-7.92 4.57a1.31 1.31 0 0 0-.66 1.14v11.17Zm1.96-3.73 4.31-2.49 4.31 2.49v4.98l-4.31 2.49-4.31-2.49v-4.98Z"
      />
    </svg>
  );
}

function SidebarButton({ label, icon, active = false, danger = false, onClick }: SidebarButtonProps) {
  return (
    <div className="group relative flex h-9 w-9 items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={[
          "relative flex h-9 w-9 items-center justify-center rounded-2xl transition",
          active
            ? "bg-[#e8edf5] text-[#172033] shadow-sm"
            : danger
              ? "text-[#64748b] hover:bg-red-100 hover:text-red-600"
              : "text-[#64748b] hover:bg-[#e8edf5] hover:text-[#172033]"
        ].join(" ")}
      >
        {active ? (
          <span className="absolute -left-[9px] top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-nostur-orange" />
        ) : null}

        {icon}
      </button>

      <div className="pointer-events-none absolute left-[44px] top-1/2 z-[9999] -translate-y-1/2 translate-x-1 opacity-0 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100">
        <div className="whitespace-nowrap rounded-xl border border-black/10 bg-[#172033] px-3 py-2 text-[11px] font-semibold text-white shadow-xl">
          {label}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const createTab = useBrowserStore((state) => state.createTab);
  const setHomeViewMode = useBrowserStore((state) => state.setHomeViewMode);
  const tabs = useBrowserStore((state) => state.tabs);
  const activeTabId = useBrowserStore((state) => state.activeTabId);
  const homeViewMode = useBrowserStore((state) => state.homeViewMode);
  const signOut = useAuthStore((state) => state.signOut);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeUrl = activeTab?.url || "nostur://home";

  function openHome(mode: HomeMode) {
    setHomeViewMode(mode);

    createTab({
      appId: "web",
      url: "nostur://home",
      title: mode === "favorites" ? "Favoritos" : mode === "settings" ? "Configuración" : "Inicio",
      activate: true
    });
  }

  function openInternal(appId: string) {
    const app = getAppById(appId);

    createTab({
      appId: app.id,
      url: app.url,
      title: app.name,
      activate: true
    });
  }

  function openExternal(appId: string) {
    const app = getAppById(appId);

    createTab({
      appId: app.id,
      url: app.url,
      title: app.name,
      activate: true
    });
  }

  const isHomeActive = activeUrl === "nostur://home" && homeViewMode === "apps";
  const isFavoritesActive = activeUrl === "nostur://home" && homeViewMode === "favorites";
  const isSettingsActive = activeUrl === "nostur://home" && homeViewMode === "settings";
  const isConfigIAsActive = activeUrl === "internal://configuracion-ias";
  const isChatGptActive = activeTab?.appId === "chatgpt" || activeUrl.includes("chatgpt.com");

  return (
    <aside className="nostur-no-drag flex h-full w-[52px] shrink-0 flex-col items-center border-r border-black/10 bg-[#f8fafc] pb-4 pt-[52px]">
      <button
        type="button"
        onClick={() => openHome("apps")}
        aria-label="NOSTUR"
        className="mb-5 flex h-9 w-9 items-center justify-center rounded-2xl bg-nostur-orange text-sm font-black text-white shadow-sm transition hover:scale-[1.03]"
      >
        N
      </button>

      <div className="flex flex-1 flex-col items-center gap-2.5">
        <SidebarButton
          label="Inicio"
          active={isHomeActive}
          onClick={() => openHome("apps")}
          icon={<HomeIcon size={17} strokeWidth={1.8} />}
        />

        <SidebarButton
          label="Favoritos"
          active={isFavoritesActive}
          onClick={() => openHome("favorites")}
          icon={<Star size={17} strokeWidth={1.8} />}
        />

        <SidebarButton
          label="Config. IAs"
          active={isConfigIAsActive}
          onClick={() => openInternal("configuracion-ias")}
          icon={<PencilLine size={17} strokeWidth={1.8} />}
        />

        <SidebarButton
          label="ChatGPT"
          active={isChatGptActive}
          onClick={() => openExternal("chatgpt")}
          icon={<ChatGptLogo size={18} />}
        />
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <SidebarButton
          label="Configuración"
          active={isSettingsActive}
          onClick={() => openHome("settings")}
          icon={<Settings size={17} strokeWidth={1.8} />}
        />

        <SidebarButton
          label="Cerrar sesión"
          danger
          onClick={signOut}
          icon={<LogOut size={17} strokeWidth={1.8} />}
        />
      </div>
    </aside>
  );
}