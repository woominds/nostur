import { useEffect, useRef } from "react";
import { findAppByUrl } from "../registry/appRegistry";
import { useBrowserStore } from "../store/browserStore";
import { getFaviconUrl } from "../utils/url";

export function WebviewArea() {
  const tabs = useBrowserStore((state) => state.tabs);
  const activeTabId = useBrowserStore((state) => state.activeTabId);
  const updateTab = useBrowserStore((state) => state.updateTab);
  const createTab = useBrowserStore((state) => state.createTab);

  const webviewRefs = useRef<Record<string, NosturWebview | null>>({});

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    for (const tab of tabs) {
      if (tab.url === "nostur://home") continue;

      const webview = webviewRefs.current[tab.id];
      if (!webview) continue;

      const forceResize = () => {
        webview.style.position = "absolute";
        webview.style.inset = "0";
        webview.style.width = "100%";
        webview.style.height = "100%";
        webview.style.minWidth = "100%";
        webview.style.minHeight = "100%";
        webview.style.display = "flex";
      };

      const handleDidAttach = () => {
        forceResize();
      };

      const handleDomReady = () => {
        forceResize();
      };

      const handleDidStartLoading = () => {
        forceResize();
        updateTab(tab.id, { isLoading: true });
      };

      const handleDidStopLoading = () => {
        forceResize();

        updateTab(tab.id, {
          isLoading: false,
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward()
        });
      };

      const handleDidNavigate = (event: Event) => {
        const navigationEvent = event as NosturDidNavigateEvent;
        const app = findAppByUrl(navigationEvent.url);

        forceResize();

        updateTab(tab.id, {
          url: navigationEvent.url,
          appId: app.id,
          partition: app.partition,
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward(),
          faviconUrl: getFaviconUrl(navigationEvent.url)
        });
      };

      const handleDidNavigateInPage = (event: Event) => {
        const navigationEvent = event as NosturDidNavigateInPageEvent;
        const app = findAppByUrl(navigationEvent.url);

        forceResize();

        updateTab(tab.id, {
          url: navigationEvent.url,
          appId: app.id,
          partition: app.partition,
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward(),
          faviconUrl: getFaviconUrl(navigationEvent.url)
        });
      };

      const handlePageTitleUpdated = (event: Event) => {
        const titleEvent = event as NosturPageTitleUpdatedEvent;

        updateTab(tab.id, {
          title: titleEvent.title || tab.title
        });
      };

      const handlePageFaviconUpdated = (event: Event) => {
        const faviconEvent = event as NosturPageFaviconUpdatedEvent;
        const favicon = faviconEvent.favicons?.[0];

        if (favicon) {
          updateTab(tab.id, {
            faviconUrl: favicon
          });
        }
      };

      const handleNewWindow = (event: Event) => {
        const newWindowEvent = event as NosturNewWindowEvent;
        newWindowEvent.preventDefault();

        if (!newWindowEvent.url || newWindowEvent.url === "about:blank") return;

        const app = findAppByUrl(newWindowEvent.url);

        createTab({
          appId: app.id,
          url: newWindowEvent.url,
          title: app.name,
          activate: true
        });
      };

      webview.addEventListener("did-attach", handleDidAttach);
      webview.addEventListener("dom-ready", handleDomReady);
      webview.addEventListener("did-start-loading", handleDidStartLoading);
      webview.addEventListener("did-stop-loading", handleDidStopLoading);
      webview.addEventListener("did-navigate", handleDidNavigate);
      webview.addEventListener("did-navigate-in-page", handleDidNavigateInPage);
      webview.addEventListener("page-title-updated", handlePageTitleUpdated);
      webview.addEventListener("page-favicon-updated", handlePageFaviconUpdated);
      webview.addEventListener("new-window", handleNewWindow);

      forceResize();

      cleanups.push(() => {
        webview.removeEventListener("did-attach", handleDidAttach);
        webview.removeEventListener("dom-ready", handleDomReady);
        webview.removeEventListener("did-start-loading", handleDidStartLoading);
        webview.removeEventListener("did-stop-loading", handleDidStopLoading);
        webview.removeEventListener("did-navigate", handleDidNavigate);
        webview.removeEventListener("did-navigate-in-page", handleDidNavigateInPage);
        webview.removeEventListener("page-title-updated", handlePageTitleUpdated);
        webview.removeEventListener("page-favicon-updated", handlePageFaviconUpdated);
        webview.removeEventListener("new-window", handleNewWindow);
      });
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [tabs, updateTab, createTab]);

  useEffect(() => {
    const activeWebview = activeTabId ? webviewRefs.current[activeTabId] : null;

    if (!activeWebview) return;

    activeWebview.style.position = "absolute";
    activeWebview.style.inset = "0";
    activeWebview.style.width = "100%";
    activeWebview.style.height = "100%";
    activeWebview.style.minWidth = "100%";
    activeWebview.style.minHeight = "100%";
    activeWebview.style.display = "flex";
    activeWebview.style.visibility = "visible";
    activeWebview.style.opacity = "1";
  }, [activeTabId, tabs.length]);

  return (
    <div className="relative h-full min-h-0 w-full min-w-0 overflow-hidden bg-white">
      {tabs
        .filter((tab) => tab.url !== "nostur://home")
        .map((tab) => {
          const active = tab.id === activeTabId;

          return (
            <webview
              key={tab.id}
              ref={(element) => {
                webviewRefs.current[tab.id] = element as NosturWebview | null;
              }}
              data-tab-id={tab.id}
              src={tab.url}
              partition={tab.partition}
              allowpopups="true"
              webpreferences="contextIsolation=yes, nodeIntegration=no, javascript=yes, plugins=yes"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                minWidth: "100%",
                minHeight: "100%",
                display: "flex",
                border: 0,
                background: "#ffffff",
                visibility: active ? "visible" : "hidden",
                opacity: active ? 1 : 0,
                pointerEvents: active ? "auto" : "none",
                zIndex: active ? 2 : 1
              }}
            />
          );
        })}
    </div>
  );
}