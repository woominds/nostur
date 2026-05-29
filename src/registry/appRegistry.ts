export type AppCategory = "travel" | "work" | "ai" | "web" | "crm";

export type RegisteredApp = {
  id: string;
  name: string;
  url: string;
  homeUrl: string;
  partition: string;
  color: string;
  category: AppCategory;
};

export const appRegistry: RegisteredApp[] = [
  {
    id: "experts",
    name: "Experts",
    url: "https://experts.almundo.com.ar/login/?appName=experts&redirectURL=https:%2F%2Fexperts.almundo.com.ar%2Fportal",
    homeUrl: "https://experts.almundo.com.ar/portal",
    partition: "persist:experts",
    color: "#ff7a1a",
    category: "travel"
  },
  {
    id: "abaco",
    name: "Ábaco",
    url: "https://abaco.almundo.com/",
    homeUrl: "https://abaco.almundo.com/",
    partition: "persist:abaco",
    color: "#ff9b4a",
    category: "travel"
  },
  {
    id: "krooze",
    name: "Krooze",
    url: "https://www.krooze.com.ar/",
    homeUrl: "https://www.krooze.com.ar/",
    partition: "persist:krooze",
    color: "#38bdf8",
    category: "travel"
  },
  {
    id: "liveconnect",
    name: "Live Connect",
    url: "https://liveconnect.chat/",
    homeUrl: "https://liveconnect.chat/",
    partition: "persist:liveconnect",
    color: "#22c55e",
    category: "work"
  },
  {
    id: "aivo",
    name: "Aivo",
    url: "https://my.aivo.co/login",
    homeUrl: "https://my.aivo.co/login",
    partition: "persist:aivo",
    color: "#a855f7",
    category: "work"
  },
  {
    id: "amadeus",
    name: "Amadeus",
    url: "https://www.sellingplatformconnect.amadeus.com/login/",
    homeUrl: "https://www.sellingplatformconnect.amadeus.com/login/",
    partition: "persist:amadeus",
    color: "#2563eb",
    category: "travel"
  },
  {
    id: "sabre",
    name: "Sabre",
    url: "https://srw.sabre.com/",
    homeUrl: "https://srw.sabre.com/",
    partition: "persist:sabre",
    color: "#ef4444",
    category: "travel"
  },
  {
    id: "office",
    name: "Microsoft 365",
    url: "https://m365.cloud.microsoft/",
    homeUrl: "https://m365.cloud.microsoft/",
    partition: "persist:office",
    color: "#f97316",
    category: "work"
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    homeUrl: "https://chatgpt.com/",
    partition: "persist:chatgpt",
    color: "#10b981",
    category: "ai"
  },

  {
    id: "livenos",
    name: "LiveNos",
    url: "internal://livenos",
    homeUrl: "internal://livenos",
    partition: "persist:internal",
    color: "#10b981",
    category: "crm"
  },
  {
    id: "oportunidades",
    name: "Oportunidades",
    url: "internal://oportunidades",
    homeUrl: "internal://oportunidades",
    partition: "persist:internal",
    color: "#0ea5e9",
    category: "crm"
  },
  {
    id: "cande",
    name: "Cande",
    url: "internal://cande",
    homeUrl: "internal://cande",
    partition: "persist:internal",
    color: "#0f766e",
    category: "ai"
  },
  {
    id: "nia",
    name: "NIA",
    url: "internal://nia",
    homeUrl: "internal://nia",
    partition: "persist:internal",
    color: "#7c3aed",
    category: "ai"
  },
  {
    id: "control-ia",
    name: "Control IA",
    url: "internal://control-ia",
    homeUrl: "internal://control-ia",
    partition: "persist:internal",
    color: "#d946ef",
    category: "crm"
  },

  {
    id: "contactos",
    name: "Contactos",
    url: "internal://contactos",
    homeUrl: "internal://contactos",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "clientes",
    name: "Clientes",
    url: "internal://clientes",
    homeUrl: "internal://clientes",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "presupuestos-v2",
    name: "Presupuestos",
    url: "internal://presupuestos-v2",
    homeUrl: "internal://presupuestos-v2",
    partition: "persist:internal",
    color: "#4f7c90",
    category: "crm"
  },
  {
    id: "carritos",
    name: "Carritos",
    url: "internal://carritos",
    homeUrl: "internal://carritos",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "files",
    name: "Files",
    url: "internal://files",
    homeUrl: "internal://files",
    partition: "persist:internal",
    color: "#38bdf8",
    category: "crm"
  },
  {
    id: "ctas-ctes",
    name: "Ctas Ctes",
    url: "internal://ctas-ctes",
    homeUrl: "internal://ctas-ctes",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "control-ventas",
    name: "Control de ventas",
    url: "internal://control-ventas",
    homeUrl: "internal://control-ventas",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "pagos-operadores",
    name: "Pagos a operadores",
    url: "internal://pagos-operadores",
    homeUrl: "internal://pagos-operadores",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "riesgos",
    name: "Riesgos",
    url: "internal://riesgos",
    homeUrl: "internal://riesgos",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "caja",
    name: "Caja",
    url: "internal://caja",
    homeUrl: "internal://caja",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "facturas-cobrar",
    name: "Facturas a cobrar",
    url: "internal://facturas-cobrar",
    homeUrl: "internal://facturas-cobrar",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "facturas-pagar",
    name: "Facturas a pagar",
    url: "internal://facturas-pagar",
    homeUrl: "internal://facturas-pagar",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "cashflow",
    name: "Cashflow",
    url: "internal://cashflow",
    homeUrl: "internal://cashflow",
    partition: "persist:internal",
    color: "#0ea5e9",
    category: "crm"
  },
  {
    id: "metas",
    name: "Metas",
    url: "internal://metas",
    homeUrl: "internal://metas",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "comisiones",
    name: "Comisiones",
    url: "internal://comisiones",
    homeUrl: "internal://comisiones",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "pendientes",
    name: "Pendientes",
    url: "internal://pendientes",
    homeUrl: "internal://pendientes",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "links-utiles",
    name: "Links útiles",
    url: "internal://links-utiles",
    homeUrl: "internal://links-utiles",
    partition: "persist:internal",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "calendario-pax",
    name: "Calendario Pax",
    url: "internal://calendario-pax",
    homeUrl: "internal://calendario-pax",
    partition: "persist:internal",
    color: "#2563eb",
    category: "crm"
  },
  {
    id: "horarios",
    name: "Horarios",
    url: "internal://horarios",
    homeUrl: "internal://horarios",
    partition: "persist:internal",
    color: "#7c3aed",
    category: "crm"
  },
  {
    id: "documentos",
    name: "Documentos",
    url: "internal://documentos",
    homeUrl: "internal://documentos",
    partition: "persist:internal",
    color: "#64748b",
    category: "crm"
  },
  {
    id: "colaborativo",
    name: "Colaborativo",
    url: "internal://colaborativo",
    homeUrl: "internal://colaborativo",
    partition: "persist:internal",
    color: "#2563eb",
    category: "crm"
  },
  {
    id: "tablero-control",
    name: "Tablero de Control",
    url: "internal://tablero-control",
    homeUrl: "internal://tablero-control",
    partition: "persist:internal",
    color: "#4f7c90",
    category: "crm"
  },
 
  {
    id: "importador-catalogos",
    name: "Importador Catálogos",
    url: "internal://importador-catalogos",
    homeUrl: "internal://importador-catalogos",
    partition: "persist:internal",
    color: "#0ea5e9",
    category: "crm"
  },

  {
    id: "crm",
    name: "CRM NOSSIX",
    url: "https://gestion.nossix.com.ar/",
    homeUrl: "https://gestion.nossix.com.ar/",
    partition: "persist:crm",
    color: "#ff7a1a",
    category: "crm"
  },
  {
    id: "web",
    name: "Web",
    url: "https://www.google.com/",
    homeUrl: "https://www.google.com/",
    partition: "persist:web",
    color: "#64748b",
    category: "web"
  }
];

export function getAppById(appId: string): RegisteredApp {
  if (appId === "presupuestos") {
    return getAppById("presupuestos-v2");
  }

  return appRegistry.find((app) => app.id === appId) || appRegistry[appRegistry.length - 1];
}

export function findAppByUrl(url: string): RegisteredApp {
  if (url === "nostur://home") {
    return getAppById("web");
  }

  if (url.startsWith("internal://")) {
    if (url === "internal://presupuestos") {
      return getAppById("presupuestos-v2");
    }

    return appRegistry.find((app) => app.url === url || app.homeUrl === url) || getAppById("web");
  }

  const found = appRegistry.find((app) => {
    try {
      const appHost = new URL(app.homeUrl).hostname.replace("www.", "");
      const urlHost = new URL(url).hostname.replace("www.", "");

      return urlHost.includes(appHost) || appHost.includes(urlHost);
    } catch {
      return false;
    }
  });

  return found || getAppById("web");
}
