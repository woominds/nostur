import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, SyntheticEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Home,
  KeyRound,
  RefreshCcw,
  RotateCw,
  Search,
  Star,
  Trash2,
  X
} from "lucide-react";
import { useBrowserStore, type BrowserTab } from "../store/browserStore";
import { getDomainFromUrl, normalizeUrl } from "../utils/url";
import { FavoriteModal } from "./FavoriteModal";
import { supabase } from "../lib/supabase";

type SupabaseCredential = {
  id: string;
  service_key: string;
  username: string | null;
  password_encrypted: string | null;
  autofill_enabled: boolean;
  auto_submit_enabled: boolean;
};

type ToastState = {
  type: "success" | "error" | "info";
  message: string;
};

type AutofillResult = {
  userOk?: boolean;
  passOk?: boolean;
  userFound?: boolean;
  passFound?: boolean;
  submitted?: boolean;
};

function resolveCredentialServiceKey(activeTab: BrowserTab): string {
  const appId = String(activeTab.appId || "").toLowerCase();
  const url = String(activeTab.url || "").toLowerCase();
  const title = String(activeTab.title || "").toLowerCase();

  if (
    appId === "abaco" ||
    title.includes("ábaco") ||
    title.includes("abaco") ||
    url.includes("abaco.almundo.com") ||
    url.includes("appname=abaco") ||
    url.includes("appname%3dabaco") ||
    url.includes("redirecturl=https:%2f%2fabaco.almundo.com") ||
    url.includes("redirecturl=https%3a%2f%2fabaco.almundo.com")
  ) {
    return "abaco";
  }

  if (
    appId === "experts" ||
    title.includes("experts") ||
    url.includes("experts.almundo.com") ||
    url.includes("appname=experts") ||
    url.includes("appname%3dexperts")
  ) {
    return "experts";
  }

  if (
    appId === "krooze" ||
    title.includes("krooze") ||
    url.includes("krooze.com.ar")
  ) {
    return "krooze";
  }

  if (
    appId === "aivo" ||
    title.includes("aivo") ||
    url.includes("aivo.co")
  ) {
    return "aivo";
  }

  if (
    appId === "liveconnect" ||
    title.includes("live connect") ||
    url.includes("liveconnect")
  ) {
    return "liveconnect";
  }

  return activeTab.appId;
}

function getCredentialLabel(serviceKey: string): string {
  if (serviceKey === "abaco") return "Ábaco";
  if (serviceKey === "experts") return "Experts";
  if (serviceKey === "krooze") return "Krooze";
  if (serviceKey === "liveconnect") return "Live Connect";
  if (serviceKey === "aivo") return "Aivo";

  return serviceKey;
}

function isMicrosoft365HistoryEnabled(activeTab?: BrowserTab | null): boolean {
  if (!activeTab) return false;
  if (activeTab.url === "nostur://home") return false;
  if (activeTab.url.startsWith("internal://")) return false;

  const appId = String(activeTab.appId || "").toLowerCase();
  const title = String(activeTab.title || "").toLowerCase();
  const url = String(activeTab.url || "").toLowerCase();

  return (
    appId === "microsoft365" ||
    appId === "microsoft-365" ||
    appId === "m365" ||
    appId === "office365" ||
    appId === "office-365" ||
    appId === "office" ||
    title.includes("microsoft 365") ||
    title.includes("microsoft365") ||
    title.includes("office 365") ||
    title.includes("office365") ||
    url.includes("office.com") ||
    url.includes("microsoft.com") ||
    url.includes("microsoftonline.com") ||
    url.includes("office365.com") ||
    url.includes("sharepoint.com") ||
    url.includes("outlook.office") ||
    url.includes("live.com")
  );
}

export function TopBar() {
  const tabs = useBrowserStore((state) => state.tabs);
  const activeTabId = useBrowserStore((state) => state.activeTabId);
  const addressHistory = useBrowserStore((state) => state.addressHistory);
  const navigateActiveTab = useBrowserStore((state) => state.navigateActiveTab);
  const goHomeActiveTab = useBrowserStore((state) => state.goHomeActiveTab);
  const isFavoriteUrl = useBrowserStore((state) => state.isFavoriteUrl);
  const removeFavoriteByUrl = useBrowserStore((state) => state.removeFavoriteByUrl);
  const clearAddressHistory = useBrowserStore((state) => state.clearAddressHistory);
  const getCredentialForApp = useBrowserStore((state) => state.getCredentialForApp);

  const addressWrapperRef = useRef<HTMLDivElement | null>(null);

  const [addressValue, setAddressValue] = useState("");
  const [favoriteModalOpen, setFavoriteModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [highlightedHistoryIndex, setHighlightedHistoryIndex] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [autofillLoading, setAutofillLoading] = useState(false);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId),
    [tabs, activeTabId]
  );

  const displayUrl = activeTab?.url === "nostur://home" ? "" : activeTab?.url || "";
  const isCurrentFavorite = activeTab ? isFavoriteUrl(activeTab.url) : false;
  const historyEnabled = isMicrosoft365HistoryEnabled(activeTab);

  const filteredHistory = useMemo(() => {
    if (!historyEnabled) return [];

    const query = addressValue.trim().toLowerCase();

    if (!query) {
      return addressHistory.slice(0, 8);
    }

    return addressHistory
      .filter((item) => {
        return (
          item.url.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query) ||
          getDomainFromUrl(item.url).toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [addressHistory, addressValue, historyEnabled]);

  useEffect(() => {
    setHistoryOpen(false);
    setHighlightedHistoryIndex(0);
    setAddressValue("");
  }, [activeTabId, activeTab?.url, activeTab?.appId]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;

      if (!target) return;

      if (addressWrapperRef.current?.contains(target)) {
        return;
      }

      setHistoryOpen(false);
      setHighlightedHistoryIndex(0);
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;

      setHistoryOpen(false);
      setHighlightedHistoryIndex(0);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!historyEnabled && historyOpen) {
      setHistoryOpen(false);
      setHighlightedHistoryIndex(0);
    }
  }, [historyEnabled, historyOpen]);

  function showToast(type: ToastState["type"], message: string) {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 4200);
  }

  function getActiveWebview(): NosturWebview | null {
    if (!activeTabId) return null;

    return document.querySelector(
      `webview[data-tab-id="${activeTabId}"]`
    ) as NosturWebview | null;
  }

  function commitNavigation(value: string) {
    const finalUrl = normalizeUrl(value);

    navigateActiveTab(finalUrl);
    setAddressValue("");
    setHistoryOpen(false);
    setHighlightedHistoryIndex(0);
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedHistory = filteredHistory[highlightedHistoryIndex];

    if (historyEnabled && historyOpen && selectedHistory) {
      commitNavigation(selectedHistory.url);
      return;
    }

    commitNavigation(addressValue || displayUrl);
  }

  function handleAddressKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!historyEnabled) {
      if (event.key === "Escape") {
        setHistoryOpen(false);
        setHighlightedHistoryIndex(0);
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHistoryOpen(true);
      setHighlightedHistoryIndex((current) => {
        if (filteredHistory.length === 0) return 0;
        return Math.min(current + 1, filteredHistory.length - 1);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHistoryOpen(true);
      setHighlightedHistoryIndex((current) => {
        if (filteredHistory.length === 0) return 0;
        return Math.max(current - 1, 0);
      });
      return;
    }

    if (event.key === "Escape") {
      setHistoryOpen(false);
      setHighlightedHistoryIndex(0);
    }
  }

  function handleAddressFocus() {
    if (!historyEnabled) {
      setHistoryOpen(false);
      setHighlightedHistoryIndex(0);
      return;
    }

    setHistoryOpen(true);
  }

  function handleAddressChange(value: string) {
    setAddressValue(value);
    setHighlightedHistoryIndex(0);

    if (historyEnabled) {
      setHistoryOpen(true);
    } else {
      setHistoryOpen(false);
    }
  }

  function handleFavoriteClick() {
    if (!activeTab || activeTab.url === "nostur://home") return;

    setHistoryOpen(false);

    if (isCurrentFavorite) {
      removeFavoriteByUrl(activeTab.url);
      return;
    }

    setFavoriteModalOpen(true);
  }

  async function getSupabaseCredential(serviceKey: string): Promise<SupabaseCredential | null> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;

    let query = supabase
      .from("user_credentials")
      .select("id, service_key, username, password_encrypted, autofill_enabled, auto_submit_enabled")
      .eq("service_key", serviceKey)
      .eq("autofill_enabled", true);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    return (data || null) as SupabaseCredential | null;
  }

  async function runAutofillScript(
    webview: NosturWebview,
    username: string,
    password: string,
    autoSubmit: boolean
  ): Promise<AutofillResult> {
    const result = await webview.executeJavaScript(`
      (() => {
        const username = ${JSON.stringify(username)};
        const password = ${JSON.stringify(password)};
        const autoSubmit = ${JSON.stringify(autoSubmit)};

        const visible = (el) => {
          if (!el) return false;

          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();

          return style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0 &&
            !el.disabled &&
            !el.readOnly;
        };

        const setValue = (input, value) => {
          if (!input) return false;

          input.focus();

          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;

          if (nativeSetter) {
            nativeSetter.call(input, value);
          } else {
            input.value = value;
          }

          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          input.blur();

          return true;
        };

        const getInputs = (root = document) => {
          return Array.from(root.querySelectorAll("input")).filter(visible);
        };

        const getButtons = (root = document) => {
          return Array.from(root.querySelectorAll("button,input[type='submit'],input[type='button']"))
            .filter(visible);
        };

        const findUserInput = (inputs) => {
          const byAutocomplete = inputs.find((input) =>
            /username|email/i.test(input.autocomplete || "")
          );

          if (byAutocomplete) return byAutocomplete;

          return (
            inputs.find((input) => /email|e-mail|mail|user|usuario|login|account|cuenta/i.test(input.name || "")) ||
            inputs.find((input) => /email|e-mail|mail|user|usuario|login|account|cuenta/i.test(input.id || "")) ||
            inputs.find((input) => /email|e-mail|mail|user|usuario|login|account|cuenta/i.test(input.placeholder || "")) ||
            inputs.find((input) => /email|e-mail|mail|user|usuario|login|account|cuenta/i.test(input.getAttribute("aria-label") || "")) ||
            inputs.find((input) => input.type === "email") ||
            inputs.find((input) => input.type === "text") ||
            inputs.find((input) => !input.type || input.type === "")
          );
        };

        const findPassInput = (inputs) => {
          const byAutocomplete = inputs.find((input) =>
            /current-password|password/i.test(input.autocomplete || "")
          );

          if (byAutocomplete) return byAutocomplete;

          return (
            inputs.find((input) => input.type === "password") ||
            inputs.find((input) => /pass|password|clave|contraseña|senha/i.test(input.name || "")) ||
            inputs.find((input) => /pass|password|clave|contraseña|senha/i.test(input.id || "")) ||
            inputs.find((input) => /pass|password|clave|contraseña|senha/i.test(input.placeholder || "")) ||
            inputs.find((input) => /pass|password|clave|contraseña|senha/i.test(input.getAttribute("aria-label") || ""))
          );
        };

        const fillRoot = (root = document) => {
          const inputs = getInputs(root);
          const userInput = findUserInput(inputs);
          const passInput = findPassInput(inputs);

          const userOk = setValue(userInput, username);
          const passOk = setValue(passInput, password);

          return {
            userOk,
            passOk,
            userFound: Boolean(userInput),
            passFound: Boolean(passInput)
          };
        };

        let result = fillRoot(document);

        if ((!result.userOk || !result.passOk) && document.querySelectorAll("iframe").length > 0) {
          const frames = Array.from(document.querySelectorAll("iframe"));

          for (const frame of frames) {
            try {
              const frameDocument = frame.contentDocument || frame.contentWindow?.document;

              if (!frameDocument) continue;

              const frameResult = fillRoot(frameDocument);

              result = {
                userOk: result.userOk || frameResult.userOk,
                passOk: result.passOk || frameResult.passOk,
                userFound: result.userFound || frameResult.userFound,
                passFound: result.passFound || frameResult.passFound
              };
            } catch {
              // Iframe cross-origin. No se puede acceder.
            }
          }
        }

        if (autoSubmit && result.userOk && result.passOk) {
          const buttons = getButtons(document);

          const submitButton =
            buttons.find((button) =>
              /ingresar|entrar|login|sign in|acceder|continuar|submit/i.test(
                button.innerText || button.value || ""
              )
            ) ||
            buttons.find((button) => String(button.type || "").toLowerCase() === "submit");

          if (submitButton) {
            submitButton.click();
            return {
              ...result,
              submitted: true
            };
          }
        }

        return {
          ...result,
          submitted: false
        };
      })();
    `);

    return (result || {}) as AutofillResult;
  }

  async function handleAutofill() {
    if (!activeTab || activeTab.url === "nostur://home") return;

    setHistoryOpen(false);
    setAutofillLoading(true);

    try {
      const serviceKey = resolveCredentialServiceKey(activeTab);
      const serviceLabel = getCredentialLabel(serviceKey);

      let username = "";
      let password = "";
      let autoSubmit = false;

      const supabaseCredential = await getSupabaseCredential(serviceKey);

      if (supabaseCredential) {
        username = supabaseCredential.username || "";
        password = supabaseCredential.password_encrypted || "";
        autoSubmit = Boolean(supabaseCredential.auto_submit_enabled);
      } else {
        const localCredential = getCredentialForApp(serviceKey) || getCredentialForApp(activeTab.appId);

        if (localCredential) {
          username = localCredential.username || "";
          password = localCredential.password || "";
          autoSubmit = false;
        }
      }

      if (!username || !password) {
        showToast(
          "error",
          `No encontré credenciales activas para ${serviceLabel}. Revisá Configuración > Credenciales.`
        );
        setAutofillLoading(false);
        return;
      }

      const webview = getActiveWebview();

      if (!webview) {
        showToast("error", "No encontré la ventana activa para completar las credenciales.");
        setAutofillLoading(false);
        return;
      }

      let result: AutofillResult = {};

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        result = await runAutofillScript(webview, username, password, autoSubmit);

        if (result.userOk && result.passOk) {
          break;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 450));
      }

      if (result.userOk && result.passOk) {
        showToast(
          "success",
          autoSubmit
            ? `Credenciales de ${serviceLabel} completadas y enviadas.`
            : `Credenciales de ${serviceLabel} completadas.`
        );
      } else if (result.userOk || result.passOk) {
        showToast(
          "info",
          `Completé una parte de ${serviceLabel}. Puede que el sitio tenga campos internos especiales.`
        );
      } else {
        showToast(
          "error",
          `No pude detectar los campos de usuario y contraseña en ${serviceLabel}. Esperá que cargue completo y probá de nuevo.`
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo ejecutar el autofill.";

      showToast("error", message);
    } finally {
      setAutofillLoading(false);
    }
  }

  async function handleClearCache() {
    if (!activeTab) return;

    setHistoryOpen(false);

    await window.nostur.clearCache(activeTab.partition);

    const webview = getActiveWebview();
    webview?.reloadIgnoringCache();
  }

  async function handleCopyUrl() {
    if (!activeTab) return;

    setHistoryOpen(false);

    await navigator.clipboard.writeText(activeTab.url);
    showToast("success", "URL copiada.");
  }

  async function handleOpenExternal() {
    if (!activeTab) return;

    setHistoryOpen(false);

    await window.nostur.openExternal(activeTab.url);
  }

  return (
    <>
      <div className="relative flex h-[44px] shrink-0 items-center gap-1.5 border-b border-black/10 bg-[#f8fafc] px-2">
        <div className="flex items-center gap-0.5">
          <button
            disabled={!activeTab?.canGoBack}
            onClick={() => {
              setHistoryOpen(false);
              getActiveWebview()?.goBack();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#e8edf5] hover:text-[#1f2937] disabled:opacity-30"
            title="Atrás"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
          </button>

          <button
            disabled={!activeTab?.canGoForward}
            onClick={() => {
              setHistoryOpen(false);
              getActiveWebview()?.goForward();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#e8edf5] hover:text-[#1f2937] disabled:opacity-30"
            title="Adelante"
          >
            <ArrowRight size={16} strokeWidth={1.8} />
          </button>

          <button
            onClick={() => {
              setHistoryOpen(false);
              getActiveWebview()?.reload();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#e8edf5] hover:text-[#1f2937]"
            title="Reload"
          >
            <RotateCw size={15} strokeWidth={1.8} />
          </button>

          <button
            onClick={() => {
              setHistoryOpen(false);
              getActiveWebview()?.reloadIgnoringCache();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#e8edf5] hover:text-[#1f2937]"
            title="Hard reload"
          >
            <RefreshCcw size={15} strokeWidth={1.8} />
          </button>

          <button
            onClick={() => {
              setHistoryOpen(false);
              goHomeActiveTab();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#e8edf5] hover:text-[#1f2937]"
            title="Home de la app"
          >
            <Home size={15} strokeWidth={1.8} />
          </button>
        </div>

        <div ref={addressWrapperRef} className="relative min-w-0 flex-1">
          <form
            onSubmit={handleSubmit}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-black/10 bg-[#eef2f7] px-3 shadow-inner"
          >
            <Search size={15} className="shrink-0 text-[#64748b]" strokeWidth={1.8} />

            <input
              value={addressValue}
              onFocus={handleAddressFocus}
              onChange={(event) => handleAddressChange(event.target.value)}
              onKeyDown={handleAddressKeyDown}
              placeholder={displayUrl || "Buscar o escribir dirección web"}
              className="h-full min-w-0 flex-1 bg-transparent text-xs font-medium text-[#1f2937] outline-none placeholder:text-[#64748b]"
            />
          </form>

          {historyEnabled && historyOpen && filteredHistory.length > 0 ? (
            <div className="absolute left-0 right-0 top-[42px] z-50 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-black/10 px-3 py-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                  <Clock size={12} strokeWidth={1.8} />
                  Historial Microsoft 365
                </span>

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    clearAddressHistory();
                    setHistoryOpen(false);
                    setHighlightedHistoryIndex(0);
                  }}
                  className="rounded-lg px-2 py-1 text-[10px] font-bold text-[#64748b] hover:bg-[#eef2f7] hover:text-[#1f2937]"
                >
                  Limpiar
                </button>
              </div>

              <div className="max-h-[300px] overflow-auto p-1.5">
                {filteredHistory.map((item, index) => {
                  const highlighted = index === highlightedHistoryIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setHighlightedHistoryIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => commitNavigation(item.url)}
                      className={[
                        "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition",
                        highlighted
                          ? "bg-nostur-orange text-black"
                          : "text-[#1f2937] hover:bg-[#eef2f7]"
                      ].join(" ")}
                    >
                      {item.faviconUrl ? (
                        <img src={item.faviconUrl} className="h-4 w-4 shrink-0 rounded" alt="" />
                      ) : (
                        <Clock size={14} className="shrink-0" strokeWidth={1.8} />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold">{item.title}</div>
                        <div
                          className={[
                            "truncate text-[10px]",
                            highlighted ? "text-black/65" : "text-[#64748b]"
                          ].join(" ")}
                        >
                          {item.url}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <button
          onClick={handleAutofill}
          disabled={!activeTab || activeTab.url === "nostur://home" || autofillLoading}
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-30",
            autofillLoading
              ? "bg-nostur-orange/20 text-nostur-orange"
              : "text-[#64748b] hover:bg-[#e8edf5] hover:text-[#1f2937]"
          ].join(" ")}
          title="Autofill credenciales"
        >
          <KeyRound size={15} strokeWidth={1.8} />
        </button>

        <button
          onClick={handleFavoriteClick}
          disabled={!activeTab || activeTab.url === "nostur://home"}
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-30",
            isCurrentFavorite
              ? "bg-nostur-orange text-black hover:bg-nostur-orangeSoft"
              : "text-[#64748b] hover:bg-[#e8edf5] hover:text-[#1f2937]"
          ].join(" ")}
          title={isCurrentFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Star size={16} strokeWidth={1.8} fill={isCurrentFavorite ? "currentColor" : "none"} />
        </button>

        <button
          onClick={handleCopyUrl}
          disabled={!activeTab || activeTab.url === "nostur://home"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#e8edf5] hover:text-[#1f2937] disabled:opacity-30"
          title="Copiar URL"
        >
          <Copy size={15} strokeWidth={1.8} />
        </button>

        <button
          onClick={handleOpenExternal}
          disabled={!activeTab || activeTab.url === "nostur://home"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#e8edf5] hover:text-[#1f2937] disabled:opacity-30"
          title="Abrir externo"
        >
          <ExternalLink size={15} strokeWidth={1.8} />
        </button>

        <button
          onClick={handleClearCache}
          disabled={!activeTab}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-red-100 hover:text-red-600 disabled:opacity-30"
          title="Limpiar caché de esta app"
        >
          <Trash2 size={15} strokeWidth={1.8} />
        </button>

        {toast ? (
          <div className="absolute right-3 top-[52px] z-[999] w-[360px] rounded-2xl border border-black/10 bg-white p-3 text-xs shadow-2xl">
            <div className="flex items-start gap-2">
              <div
                className={[
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl",
                  toast.type === "success"
                    ? "bg-green-100 text-green-700"
                    : toast.type === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                ].join(" ")}
              >
                {toast.type === "success" ? (
                  <CheckCircle2 size={14} />
                ) : toast.type === "error" ? (
                  <AlertTriangle size={14} />
                ) : (
                  <KeyRound size={14} />
                )}
              </div>

              <div className="min-w-0 flex-1 pt-1 font-bold text-[#334155]">{toast.message}</div>

              <button
                type="button"
                onClick={() => setToast(null)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {favoriteModalOpen && activeTab && (
        <FavoriteModal
          url={activeTab.url}
          defaultName={activeTab.title}
          appId={activeTab.appId}
          faviconUrl={activeTab.faviconUrl}
          onClose={() => setFavoriteModalOpen(false)}
        />
      )}
    </>
  );
}