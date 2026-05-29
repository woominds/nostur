import type { DetailedHTMLProps, HTMLAttributes } from "react";

export {};

declare global {
  interface Window {
    nostur: {
      clearCache: (partitionName: string) => Promise<boolean>;
      openExternal: (url: string) => Promise<boolean>;

      notify: (payload: {
        title: string;
        body: string;
        conversationId?: string;
        messageId?: string;
      }) => Promise<boolean>;

      onNewTabFromMain: (callback: (payload: { url: string }) => void) => () => void;

      onOpenConversationFromNotification: (
        callback: (payload: { conversationId: string }) => void
      ) => () => void;
    };
  }

  type NosturWebview = HTMLElement & {
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    reloadIgnoringCache: () => void;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    executeJavaScript: (code: string) => Promise<unknown>;
  };

  type NosturDidNavigateEvent = Event & {
    url: string;
  };

  type NosturDidNavigateInPageEvent = Event & {
    url: string;
  };

  type NosturPageTitleUpdatedEvent = Event & {
    title: string;
  };

  type NosturPageFaviconUpdatedEvent = Event & {
    favicons?: string[];
  };

  type NosturNewWindowEvent = Event & {
    url: string;
    preventDefault: () => void;
  };
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
        webpreferences?: string;
        className?: string;
        "data-tab-id"?: string;
      };
    }
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
        webpreferences?: string;
        className?: string;
        "data-tab-id"?: string;
      };
    }
  }
}