// Тонкая обёртка над window.Telegram.WebApp (см. index.html — SDK грузится оттуда).

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string } };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
}

export function haptic(style: "light" | "medium" | "heavy" = "light") {
  tg?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotify(type: "error" | "success" | "warning") {
  tg?.HapticFeedback?.notificationOccurred(type);
}

export function getInitData(): string {
  return tg?.initData ?? "";
}

export function isInsideTelegram(): boolean {
  return Boolean(tg && tg.initData);
}
