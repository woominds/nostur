import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Home,
  Monitor,
  Plus,
  X
} from "lucide-react";
import { getAppById } from "../registry/appRegistry";
import { useBrowserStore, type BrowserTab, type BrowserTabGroup } from "../store/browserStore";

const GROUP_LABELS: Record<BrowserTabGroup, string> = {
  home: "Inicio",
  crm: "CRM",
  apps: "Aplicativos"
};

const GROUP_COLORS: Record<BrowserTabGroup, string> = {
  home: "#ff7a1a",
  crm: "#4f7c90",
  apps: "#2563eb"
};

function getTabLabel(tab: BrowserTab): string {
  if (tab.url === "nostur://home") return "Inicio";
  return tab.isLoading ? "Cargando..." : tab.title || getAppById(tab.appId).name;
}

function getTabIcon(tab: BrowserTab) {
  if (tab.url === "nostur://home") {
    return <Home size={13} strokeWidth={1.9} />;
  }

  const app = getAppById(tab.appId);
  const usesAlmundoIcon = ["experts", "abaco", "krooze"].includes(app.id);

  if (usesAlmundoIcon) {
    return <img src="/almundo-isotipo.png" alt="Almundo" className="h-3.5 w-3.5 object-contain" />;
  }

  if (tab.faviconUrl) {
    return <img src={tab.faviconUrl} alt="" className="h-3.5 w-3.5 rounded object-contain" />;
  }

  return (
    <span
      className="flex h-3.5 w-3.5 items-center justify-center rounded-md text-[8px] font-black text-white"
      style={{ backgroundColor: app.color }}
    >
      {app.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function GroupIcon({ group }: { group: BrowserTabGroup }) {
  if (group === "home") return <Home size={13} strokeWidth={1.9} />;
  if (group === "crm") return <span className="text-[10px] font-black">N</span>;

  return <Monitor size={13} strokeWidth={1.9} />;
}

export function TabsBar() {
  const tabs = useBrowserStore((state) => state.tabs);
  const activeTabId = useBrowserStore((state) => state.activeTabId);
  const activateTab = useBrowserStore((state) => state.activateTab);
  const closeTab = useBrowserStore((state) => state.closeTab);
  const createTab = useBrowserStore((state) => state.createTab);
  const openTabGroups = useBrowserStore((state) => state.openTabGroups);
  const toggleTabGroup = useBrowserStore((state) => state.toggleTabGroup);
  const getTabGroup = useBrowserStore((state) => state.getTabGroup);
  const moveTab = useBrowserStore((state) => state.moveTab);

  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  const groupedTabs = useMemo(() => {
    const groups: Record<BrowserTabGroup, BrowserTab[]> = {
      home: [],
      crm: [],
      apps: []
    };

    tabs.forEach((tab) => {
      groups[getTabGroup(tab)].push(tab);
    });

    return groups;
  }, [tabs, getTabGroup]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeGroup = activeTab ? getTabGroup(activeTab) : "home";

  function openHome() {
    createTab({
      appId: "web",
      url: "nostur://home",
      title: "Inicio",
      activate: true
    });
  }

  function openNewWebTab() {
    createTab({
      appId: "web",
      url: "https://www.google.com/",
      title: "Web",
      activate: true
    });
  }

  function handleGroupClick(group: BrowserTabGroup) {
    const groupTabs = groupedTabs[group];

    if (group === "home") {
      openHome();
      return;
    }

    if (groupTabs.length === 0) {
      return;
    }

    if (activeGroup === group) {
      toggleTabGroup(group);
      return;
    }

    const lastTab = groupTabs[groupTabs.length - 1];
    activateTab(lastTab.id);
  }

  function handleDragStart(tabId: string) {
    setDraggedTabId(tabId);
  }

  function handleDragOver(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function handleDrop(targetTabId: string) {
    if (!draggedTabId || draggedTabId === targetTabId) {
      setDraggedTabId(null);
      return;
    }

    moveTab(draggedTabId, targetTabId);
    setDraggedTabId(null);
  }

  function renderHomeTab() {
    const homeTab = groupedTabs.home[0];

    if (!homeTab) return null;

    const active = homeTab.id === activeTabId;

    return (
      <button
        key={homeTab.id}
        type="button"
        onClick={() => activateTab(homeTab.id)}
        className={[
          "nostur-no-drag flex h-[30px] shrink-0 items-center gap-1.5 rounded-t-2xl border border-b-0 px-3 text-[11px] transition",
          active
            ? "border-black/10 bg-[#f8fafc] font-black text-[#111827] shadow-sm"
            : "border-black/10 bg-[#e6ebf2] font-bold text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
        ].join(" ")}
        style={{
          boxShadow: active ? `inset 0 2px 0 ${GROUP_COLORS.home}` : undefined
        }}
      >
        <Home size={13} strokeWidth={1.9} />
        <span>Inicio</span>
      </button>
    );
  }

  function renderGroup(group: BrowserTabGroup) {
    if (group === "home") return renderHomeTab();

    const groupTabs = groupedTabs[group];

    if (groupTabs.length === 0) return null;

    const opened = openTabGroups[group];
    const activeInside = activeGroup === group;
    const color = GROUP_COLORS[group];

    return (
      <div
        key={group}
        className={[
          "nostur-no-drag flex h-[30px] shrink-0 items-center overflow-hidden rounded-t-2xl border border-b-0 transition-all duration-300 ease-out",
          opened ? "max-w-[760px]" : "max-w-[148px]",
          activeInside ? "bg-[#dde6f0] border-black/15" : "bg-[#e6ebf2] border-black/10"
        ].join(" ")}
        style={{
          boxShadow: activeInside ? `inset 0 2px 0 ${color}` : `inset 0 1px 0 ${color}`
        }}
      >
        <button
          type="button"
          onClick={() => handleGroupClick(group)}
          className="flex h-[30px] w-[148px] shrink-0 items-center gap-1.5 px-2.5 text-left transition hover:bg-white/35"
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: color }}
          >
            <GroupIcon group={group} />
          </span>

          <span className="min-w-0 flex-1 truncate text-[11px] font-black text-[#1f2937]">
            {GROUP_LABELS[group]}
          </span>

          <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-white/70 px-1 text-[9px] font-black text-[#334155]">
            {groupTabs.length}
          </span>

          {opened ? (
            <ChevronDown size={12} className="shrink-0 text-[#64748b]" />
          ) : (
            <ChevronRight size={12} className="shrink-0 text-[#64748b]" />
          )}
        </button>

        <div
          className={[
            "flex min-w-0 items-center gap-1 overflow-hidden pr-1 transition-all duration-300 ease-out",
            opened ? "w-auto opacity-100" : "w-0 opacity-0"
          ].join(" ")}
        >
          {groupTabs.map((tab) => {
            const active = tab.id === activeTabId;
            const app = getAppById(tab.appId);

            return (
              <button
                key={tab.id}
                type="button"
                draggable
                onDragStart={() => handleDragStart(tab.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(tab.id)}
                onClick={() => activateTab(tab.id)}
                className={[
                  "group/tab flex h-[25px] min-w-[126px] max-w-[185px] items-center gap-1.5 rounded-t-xl border px-2 text-left transition-all duration-200",
                  active
                    ? "border-black/10 bg-[#f8fafc] text-[#111827] shadow-sm"
                    : "border-transparent bg-transparent text-[#64748b] hover:bg-white/45 hover:text-[#111827]",
                  draggedTabId === tab.id ? "opacity-45" : "opacity-100"
                ].join(" ")}
                title={getTabLabel(tab)}
              >
                <GripVertical
                  size={10}
                  className="shrink-0 text-[#94a3b8] opacity-0 transition group-hover/tab:opacity-100"
                />

                <span className="shrink-0">{getTabIcon(tab)}</span>

                <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold">
                  {getTabLabel(tab)}
                </span>

                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full opacity-50 transition hover:bg-black/10 hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={10} strokeWidth={2} />
                </span>

                {!tab.faviconUrl && !["experts", "abaco", "krooze"].includes(app.id) ? (
                  <span
                    className="absolute hidden"
                    style={{ backgroundColor: app.color }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="nostur-drag flex h-[38px] shrink-0 items-end gap-1 border-b border-black/10 bg-[#eef1f6] pl-[72px] pr-2">
      <div className="nostur-no-drag flex min-w-0 flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden">
        {renderGroup("home")}
        {renderGroup("crm")}
        {renderGroup("apps")}
      </div>

      <button
        type="button"
        onClick={openNewWebTab}
        className="nostur-no-drag mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[#64748b] transition hover:bg-white/75 hover:text-[#111827]"
        title="Nueva pestaña web"
      >
        <Plus size={15} strokeWidth={1.9} />
      </button>
    </div>
  );
}