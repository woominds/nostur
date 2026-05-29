import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appRegistry, findAppByUrl, getAppById } from "../registry/appRegistry";
import { normalizeUrl } from "../utils/url";

export type BrowserTabGroup = "home" | "crm" | "apps";

export type BrowserTab = {
  id: string;
  appId: string;
  title: string;
  url: string;
  partition: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  faviconUrl?: string;
};

export type Favorite = {
  id: string;
  name: string;
  url: string;
  appId: string;
  faviconUrl?: string;
};

export type AddressHistoryItem = {
  id: string;
  title: string;
  url: string;
  appId: string;
  faviconUrl?: string;
  lastVisitedAt: number;
};

export type StoredCredential = {
  id: string;
  appId: string;
  label: string;
  username: string;
  password: string;
  notes?: string;
  updatedAt: number;
};

type HomeViewMode = "apps" | "favorites" | "settings";

type BrowserState = {
  tabs: BrowserTab[];
  activeTabId: string | null;
  favorites: Favorite[];
  addressHistory: AddressHistoryItem[];
  credentials: StoredCredential[];
  homeViewMode: HomeViewMode;
  openTabGroups: Record<BrowserTabGroup, boolean>;

  createTab: (input: {
    appId?: string;
    url?: string;
    title?: string;
    activate?: boolean;
  }) => string;

  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  duplicateTab: (tabId: string) => void;
  updateTab: (tabId: string, patch: Partial<BrowserTab>) => void;
  navigateActiveTab: (url: string) => void;
  goHomeActiveTab: () => void;

  toggleTabGroup: (group: BrowserTabGroup) => void;
  setTabGroupOpen: (group: BrowserTabGroup, open: boolean) => void;
  getTabGroup: (tab: BrowserTab) => BrowserTabGroup;
  moveTab: (tabId: string, targetTabId: string) => void;

  addFavorite: (input: {
    name: string;
    url: string;
    appId?: string;
    faviconUrl?: string;
  }) => void;

  removeFavorite: (favoriteId: string) => void;
  removeFavoriteByUrl: (url: string) => void;
  isFavoriteUrl: (url: string) => boolean;

  addAddressHistory: (input: {
    title?: string;
    url: string;
    appId?: string;
    faviconUrl?: string;
  }) => void;

  clearAddressHistory: () => void;
  setHomeViewMode: (mode: HomeViewMode) => void;

  upsertCredential: (input: {
    id?: string;
    appId: string;
    label: string;
    username: string;
    password: string;
    notes?: string;
  }) => void;

  removeCredential: (credentialId: string) => void;
  getCredentialForApp: (appId: string) => StoredCredential | undefined;
};

const HOME_URL = "nostur://home";

const MICROSOFT_HISTORY_APP_IDS = new Set([
  "microsoft365",
  "microsoft-365",
  "m365",
  "office365",
  "office-365",
  "office"
]);

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isInternalUrl(url: string): boolean {
  return url === HOME_URL || url.startsWith("internal://");
}

function normalizeBrowserUrl(url: string): string {
  if (isInternalUrl(url)) {
    return url;
  }

  return normalizeUrl(url);
}

function createFaviconUrl(url: string): string | undefined {
  if (isInternalUrl(url)) {
    return undefined;
  }

  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch {
    return undefined;
  }
}

function normalizeForCompare(url: string): string {
  if (isInternalUrl(url)) {
    return url;
  }

  try {
    const parsed = new URL(normalizeUrl(url));
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function shouldStoreUrl(url: string): boolean {
  if (!url) return false;
  if (isInternalUrl(url)) return false;
  if (url.startsWith("about:")) return false;
  if (url.startsWith("data:")) return false;
  if (url.startsWith("blob:")) return false;

  return url.startsWith("http://") || url.startsWith("https://");
}

function getSafeAppById(appId: string | undefined) {
  if (!appId) return undefined;

  try {
    return getAppById(appId);
  } catch {
    return undefined;
  }
}

function getSafeAppByUrl(url: string) {
  try {
    return findAppByUrl(url);
  } catch {
    return undefined;
  }
}

function isMicrosoft365Url(url: string): boolean {
  if (!shouldStoreUrl(url)) return false;

  try {
    const hostname = new URL(normalizeUrl(url)).hostname.toLowerCase();

    return (
      hostname.includes("office.com") ||
      hostname.includes("microsoft.com") ||
      hostname.includes("microsoftonline.com") ||
      hostname.includes("live.com") ||
      hostname.includes("sharepoint.com") ||
      hostname.includes("outlook.office") ||
      hostname.includes("office365.com")
    );
  } catch {
    return false;
  }
}

function isMicrosoft365App(appId?: string, url?: string): boolean {
  const app = getSafeAppById(appId) || (url ? getSafeAppByUrl(url) : undefined);

  if (!app) {
    return url ? isMicrosoft365Url(url) : false;
  }

  const appIdNormalized = String(app.id || "").toLowerCase();
  const appNameNormalized = String(app.name || "").toLowerCase();
  const appUrl = String(app.url || app.homeUrl || url || "");

  return (
    MICROSOFT_HISTORY_APP_IDS.has(appIdNormalized) ||
    appNameNormalized.includes("microsoft 365") ||
    appNameNormalized.includes("microsoft365") ||
    appNameNormalized.includes("office 365") ||
    appNameNormalized.includes("office365") ||
    isMicrosoft365Url(appUrl) ||
    Boolean(url && isMicrosoft365Url(url))
  );
}

function shouldStoreAddressHistory(input: { url: string; appId?: string }): boolean {
  if (!shouldStoreUrl(input.url)) return false;

  return isMicrosoft365App(input.appId, input.url);
}

function isHomeTab(tab: BrowserTab): boolean {
  return tab.url === HOME_URL;
}

function getVisualGroupForTab(tab: BrowserTab): BrowserTabGroup {
  if (isHomeTab(tab)) return "home";

  if (tab.url.startsWith("internal://")) {
    return "crm";
  }

  const app = getAppById(tab.appId);

  if (app.category === "crm" && app.url.startsWith("internal://")) {
    return "crm";
  }

  return "apps";
}

function getHomeTab(): BrowserTab {
  const app = getAppById("web");

  return {
    id: "tab_home_fixed",
    appId: "web",
    title: "Inicio",
    url: HOME_URL,
    partition: app.partition,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    faviconUrl: undefined
  };
}

function normalizeTabs(tabs: BrowserTab[] | undefined): BrowserTab[] {
  const source = tabs || [];
  const withoutDuplicatedHomes = source.filter((tab) => tab.url !== HOME_URL && tab.id !== "tab_home_fixed");
  const seen = new Set<string>();
  const cleanTabs: BrowserTab[] = [];

  cleanTabs.push(getHomeTab());

  withoutDuplicatedHomes.forEach((tab) => {
    const key = `${tab.appId}|${normalizeForCompare(tab.url)}`;

    if (seen.has(key)) return;

    seen.add(key);
    cleanTabs.push(tab);
  });

  return cleanTabs;
}

function findExistingTab(tabs: BrowserTab[], appId: string, url: string): BrowserTab | undefined {
  const normalizedTarget = normalizeForCompare(url);

  return tabs.find((tab) => {
    if (tab.appId !== appId) return false;
    return normalizeForCompare(tab.url) === normalizedTarget;
  });
}

function getNextActiveTabIdAfterClose(
  tabs: BrowserTab[],
  activeTabId: string | null,
  closedTabId: string
): string | null {
  if (activeTabId !== closedTabId) {
    return activeTabId;
  }

  const closedTab = tabs.find((tab) => tab.id === closedTabId);

  if (!closedTab) {
    return tabs[0]?.id || null;
  }

  const closedGroup = getVisualGroupForTab(closedTab);
  const groupTabs = tabs.filter((tab) => getVisualGroupForTab(tab) === closedGroup && tab.id !== closedTabId);

  if (groupTabs.length > 0) {
    return groupTabs[groupTabs.length - 1].id;
  }

  return tabs.find((tab) => tab.url === HOME_URL)?.id || tabs[0]?.id || null;
}

function isLegacyAppFavorite(favorite: Favorite): boolean {
  return appRegistry.some((app) => {
    return (
      favorite.id === `fav_${app.id}` &&
      normalizeForCompare(favorite.url) === normalizeForCompare(app.homeUrl)
    );
  });
}

function cleanFavorites(favorites: Favorite[] | undefined): Favorite[] {
  if (!favorites) return [];

  const seen = new Set<string>();

  return favorites
    .filter((favorite) => !isLegacyAppFavorite(favorite))
    .filter((favorite) => {
      const key = normalizeForCompare(favorite.url);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function cleanAddressHistory(history: AddressHistoryItem[] | undefined): AddressHistoryItem[] {
  if (!history) return [];

  const seen = new Set<string>();

  return history
    .filter((item) => shouldStoreAddressHistory({ url: item.url, appId: item.appId }))
    .filter((item) => {
      const key = normalizeForCompare(item.url);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
    .slice(0, 50);
}

function cleanCredentials(credentials: StoredCredential[] | undefined): StoredCredential[] {
  if (!credentials) return [];

  const seen = new Set<string>();

  return credentials
    .filter((credential) => credential.appId && credential.username)
    .filter((credential) => {
      const key = credential.id;

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

export const useBrowserStore = create<BrowserState>()(
  persist(
    (set, get) => ({
      tabs: [getHomeTab()],
      activeTabId: "tab_home_fixed",
      favorites: [],
      addressHistory: [],
      credentials: [],
      homeViewMode: "apps",
      openTabGroups: {
        home: true,
        crm: true,
        apps: true
      },

      createTab: ({ appId, url, title, activate = true }) => {
        const selectedApp = getAppById(appId || "web");
        const rawUrl = url || selectedApp.url;
        const finalUrl = normalizeBrowserUrl(rawUrl);

        if (finalUrl === HOME_URL) {
          const homeTab = get().tabs.find((tab) => tab.url === HOME_URL) || getHomeTab();

          set((state) => ({
            tabs: normalizeTabs(state.tabs),
            activeTabId: activate ? homeTab.id : state.activeTabId,
            addressHistory: cleanAddressHistory(state.addressHistory)
          }));

          return homeTab.id;
        }

        const app = appId ? getAppById(appId) : findAppByUrl(finalUrl);
        const currentTabs = normalizeTabs(get().tabs);
        const existingTab = findExistingTab(currentTabs, app.id, finalUrl);

        if (existingTab) {
          if (activate) {
            const group = getVisualGroupForTab(existingTab);

            set((state) => ({
              tabs: currentTabs,
              activeTabId: existingTab.id,
              addressHistory: cleanAddressHistory(state.addressHistory),
              openTabGroups: {
                ...state.openTabGroups,
                [group]: true
              }
            }));
          }

          return existingTab.id;
        }

        const tab: BrowserTab = {
          id: createId("tab"),
          appId: app.id,
          title: title || app.name,
          url: finalUrl,
          partition: app.partition,
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          faviconUrl: createFaviconUrl(finalUrl)
        };

        const group = getVisualGroupForTab(tab);

        set((state) => ({
          tabs: normalizeTabs([...state.tabs, tab]),
          activeTabId: activate ? tab.id : state.activeTabId,
          addressHistory: cleanAddressHistory(state.addressHistory),
          openTabGroups: {
            ...state.openTabGroups,
            [group]: true
          }
        }));

        if (shouldStoreAddressHistory({ url: finalUrl, appId: app.id })) {
          get().addAddressHistory({
            title: title || app.name,
            url: finalUrl,
            appId: app.id,
            faviconUrl: createFaviconUrl(finalUrl)
          });
        }

        return tab.id;
      },

      closeTab: (tabId) => {
        const tabs = normalizeTabs(get().tabs);

        const tabToClose = tabs.find((tab) => tab.id === tabId);

        if (!tabToClose) return;

        if (isHomeTab(tabToClose)) {
          set((state) => ({
            tabs,
            activeTabId: "tab_home_fixed",
            addressHistory: cleanAddressHistory(state.addressHistory)
          }));

          return;
        }

        const filtered = normalizeTabs(tabs.filter((tab) => tab.id !== tabId));
        const nextActiveTabId = getNextActiveTabIdAfterClose(tabs, get().activeTabId, tabId);

        set((state) => ({
          tabs: filtered,
          activeTabId: nextActiveTabId,
          addressHistory: cleanAddressHistory(state.addressHistory)
        }));
      },

      activateTab: (tabId) => {
        const tab = get().tabs.find((item) => item.id === tabId);

        if (!tab) return;

        const group = getVisualGroupForTab(tab);

        set((state) => ({
          activeTabId: tabId,
          addressHistory: cleanAddressHistory(state.addressHistory),
          openTabGroups: {
            ...state.openTabGroups,
            [group]: true
          }
        }));
      },

      duplicateTab: (tabId) => {
        const tab = get().tabs.find((item) => item.id === tabId);

        if (!tab || isHomeTab(tab)) return;

        get().createTab({
          appId: tab.appId,
          url: tab.url,
          title: tab.title,
          activate: true
        });
      },

      updateTab: (tabId, patch) => {
        set((state) => {
          const updatedTabs = normalizeTabs(
            state.tabs.map((tab) => {
              if (tab.id !== tabId) return tab;

              if (isHomeTab(tab)) {
                return {
                  ...tab,
                  title: "Inicio",
                  url: HOME_URL,
                  appId: "web",
                  faviconUrl: undefined,
                  canGoBack: false,
                  canGoForward: false,
                  isLoading: false
                };
              }

              const nextUrl = patch.url ? normalizeBrowserUrl(patch.url) : tab.url;
              const nextApp = patch.appId ? getAppById(patch.appId) : findAppByUrl(nextUrl);

              return {
                ...tab,
                ...patch,
                url: nextUrl,
                appId: patch.appId || nextApp.id,
                partition: patch.partition || nextApp.partition,
                faviconUrl: patch.faviconUrl ?? createFaviconUrl(nextUrl)
              };
            })
          );

          return {
            tabs: updatedTabs,
            addressHistory: cleanAddressHistory(state.addressHistory)
          };
        });

        const updatedTab = get().tabs.find((tab) => tab.id === tabId);

        if (updatedTab && shouldStoreAddressHistory({ url: updatedTab.url, appId: updatedTab.appId })) {
          get().addAddressHistory({
            title: updatedTab.title,
            url: updatedTab.url,
            appId: updatedTab.appId,
            faviconUrl: updatedTab.faviconUrl
          });
        }
      },

      navigateActiveTab: (url) => {
        const { activeTabId } = get();

        const finalUrl = normalizeBrowserUrl(url);

        if (finalUrl === HOME_URL) {
          get().createTab({
            appId: "web",
            url: HOME_URL,
            title: "Inicio",
            activate: true
          });

          return;
        }

        if (!activeTabId) {
          get().createTab({ url: finalUrl, activate: true });
          return;
        }

        const activeTab = get().tabs.find((tab) => tab.id === activeTabId);

        if (!activeTab || isHomeTab(activeTab)) {
          get().createTab({ url: finalUrl, activate: true });
          return;
        }

        const app = findAppByUrl(finalUrl);
        const existingTab = findExistingTab(get().tabs, app.id, finalUrl);

        if (existingTab && existingTab.id !== activeTabId) {
          get().activateTab(existingTab.id);
          return;
        }

        get().updateTab(activeTabId, {
          url: finalUrl,
          appId: app.id,
          partition: app.partition,
          title: app.name,
          faviconUrl: createFaviconUrl(finalUrl),
          canGoBack: false,
          canGoForward: false
        });
      },

      goHomeActiveTab: () => {
        const { activeTabId, tabs } = get();

        if (!activeTabId) return;

        const tab = tabs.find((item) => item.id === activeTabId);

        if (!tab) return;

        if (isHomeTab(tab)) {
          get().setHomeViewMode("apps");
          return;
        }

        const app = getAppById(tab.appId);

        get().updateTab(activeTabId, {
          url: app.homeUrl,
          title: app.name,
          faviconUrl: createFaviconUrl(app.homeUrl),
          canGoBack: false,
          canGoForward: false
        });
      },

      toggleTabGroup: (group) => {
        if (group === "home") return;

        set((state) => ({
          openTabGroups: {
            ...state.openTabGroups,
            [group]: !state.openTabGroups[group]
          }
        }));
      },

      setTabGroupOpen: (group, open) => {
        set((state) => ({
          openTabGroups: {
            ...state.openTabGroups,
            [group]: open
          }
        }));
      },

      getTabGroup: (tab) => {
        return getVisualGroupForTab(tab);
      },

      moveTab: (tabId, targetTabId) => {
        const tabs = normalizeTabs(get().tabs);
        const fromIndex = tabs.findIndex((tab) => tab.id === tabId);
        const toIndex = tabs.findIndex((tab) => tab.id === targetTabId);

        if (fromIndex < 0 || toIndex < 0) return;

        const movingTab = tabs[fromIndex];
        const targetTab = tabs[toIndex];

        if (isHomeTab(movingTab) || isHomeTab(targetTab)) return;

        const movingGroup = getVisualGroupForTab(movingTab);
        const targetGroup = getVisualGroupForTab(targetTab);

        if (movingGroup !== targetGroup) return;

        const nextTabs = [...tabs];
        nextTabs.splice(fromIndex, 1);

        const nextTargetIndex = nextTabs.findIndex((tab) => tab.id === targetTabId);
        nextTabs.splice(nextTargetIndex, 0, movingTab);

        set((state) => ({
          tabs: normalizeTabs(nextTabs),
          addressHistory: cleanAddressHistory(state.addressHistory)
        }));
      },

      addFavorite: ({ name, url, appId, faviconUrl }) => {
        const finalUrl = normalizeBrowserUrl(url);
        const normalizedFinalUrl = normalizeForCompare(finalUrl);
        const app = appId ? getAppById(appId) : findAppByUrl(finalUrl);

        const favorite: Favorite = {
          id: createId("fav"),
          name: name.trim() || app.name,
          url: finalUrl,
          appId: app.id,
          faviconUrl: faviconUrl || createFaviconUrl(finalUrl)
        };

        set((state) => {
          const cleaned = cleanFavorites(state.favorites);

          const alreadyExists = cleaned.some(
            (item) => normalizeForCompare(item.url) === normalizedFinalUrl
          );

          if (alreadyExists) {
            return {
              favorites: cleaned.map((item) => {
                if (normalizeForCompare(item.url) !== normalizedFinalUrl) return item;

                return {
                  ...item,
                  name: favorite.name,
                  appId: favorite.appId,
                  faviconUrl: favorite.faviconUrl
                };
              })
            };
          }

          return {
            favorites: [...cleaned, favorite]
          };
        });
      },

      removeFavorite: (favoriteId) => {
        set((state) => ({
          favorites: cleanFavorites(state.favorites).filter(
            (favorite) => favorite.id !== favoriteId
          )
        }));
      },

      removeFavoriteByUrl: (url) => {
        const normalizedUrl = normalizeForCompare(url);

        set((state) => ({
          favorites: cleanFavorites(state.favorites).filter(
            (favorite) => normalizeForCompare(favorite.url) !== normalizedUrl
          )
        }));
      },

      isFavoriteUrl: (url) => {
        if (!url || isInternalUrl(url)) return false;

        const normalizedUrl = normalizeForCompare(url);

        return cleanFavorites(get().favorites).some(
          (favorite) => normalizeForCompare(favorite.url) === normalizedUrl
        );
      },

      addAddressHistory: ({ title, url, appId, faviconUrl }) => {
        const finalUrl = normalizeBrowserUrl(url);

        if (!shouldStoreAddressHistory({ url: finalUrl, appId })) {
          set((state) => ({
            addressHistory: cleanAddressHistory(state.addressHistory)
          }));

          return;
        }

        const normalizedFinalUrl = normalizeForCompare(finalUrl);
        const app = appId ? getAppById(appId) : findAppByUrl(finalUrl);

        const historyItem: AddressHistoryItem = {
          id: createId("history"),
          title: title?.trim() || app.name,
          url: finalUrl,
          appId: app.id,
          faviconUrl: faviconUrl || createFaviconUrl(finalUrl),
          lastVisitedAt: Date.now()
        };

        set((state) => {
          const withoutCurrent = cleanAddressHistory(state.addressHistory).filter(
            (item) => normalizeForCompare(item.url) !== normalizedFinalUrl
          );

          return {
            addressHistory: [historyItem, ...withoutCurrent].slice(0, 50)
          };
        });
      },

      clearAddressHistory: () => {
        set({ addressHistory: [] });
      },

      setHomeViewMode: (mode) => {
        set({ homeViewMode: mode });

        const homeTab = get().tabs.find((tab) => tab.url === HOME_URL);

        if (homeTab) {
          set({ activeTabId: homeTab.id });
        }
      },

      upsertCredential: ({ id, appId, label, username, password, notes }) => {
        const credentialId = id || createId("cred");

        const app = getAppById(appId);

        const credential: StoredCredential = {
          id: credentialId,
          appId,
          label: label.trim() || app.name,
          username: username.trim(),
          password,
          notes: notes?.trim(),
          updatedAt: Date.now()
        };

        set((state) => {
          const cleaned = cleanCredentials(state.credentials);
          const exists = cleaned.some((item) => item.id === credentialId);

          if (exists) {
            return {
              credentials: cleaned.map((item) =>
                item.id === credentialId ? credential : item
              )
            };
          }

          return {
            credentials: [...cleaned, credential]
          };
        });
      },

      removeCredential: (credentialId) => {
        set((state) => ({
          credentials: cleanCredentials(state.credentials).filter(
            (credential) => credential.id !== credentialId
          )
        }));
      },

      getCredentialForApp: (appId) => {
        return cleanCredentials(get().credentials).find(
          (credential) => credential.appId === appId
        );
      }
    }),
    {
      name: "nostur-browser-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: cleanFavorites(state.favorites),
        addressHistory: cleanAddressHistory(state.addressHistory),
        credentials: cleanCredentials(state.credentials),
        homeViewMode: state.homeViewMode
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<BrowserState> | undefined;

        return {
          ...currentState,
          tabs: [getHomeTab()],
          activeTabId: "tab_home_fixed",
          favorites: cleanFavorites(persisted?.favorites),
          addressHistory: cleanAddressHistory(persisted?.addressHistory),
          credentials: cleanCredentials(persisted?.credentials),
          homeViewMode: persisted?.homeViewMode || "apps",
          openTabGroups: {
            home: true,
            crm: true,
            apps: true
          }
        };
      }
    }
  )
);