const DISPLAY_MODE_STANDALONE = "(display-mode: standalone)";

function getWindow() {
  return typeof window === "undefined" ? null : window;
}

type WindowWithRuntimes = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
  __TAURI__?: unknown;
};

export function isCapacitorRuntime(): boolean {
  const runtimeWindow = getWindow() as WindowWithRuntimes | null;

  return runtimeWindow?.Capacitor?.isNativePlatform?.() ?? false;
}

export function isTauriRuntime(): boolean {
  const runtimeWindow = getWindow() as WindowWithRuntimes | null;

  return Boolean(runtimeWindow?.__TAURI__);
}

export function isStandalonePwa(): boolean {
  const runtimeWindow = getWindow();

  if (!runtimeWindow) {
    return false;
  }

  const standaloneMatch = runtimeWindow.matchMedia?.(DISPLAY_MODE_STANDALONE).matches ?? false;
  const runtimeNavigator = navigator as Navigator & { standalone?: boolean };
  const navigatorStandalone = runtimeNavigator.standalone === true;

  return standaloneMatch || navigatorStandalone;
}

export type RuntimePlatform = "web" | "pwa" | "capacitor" | "tauri";

export function getRuntimePlatform(): RuntimePlatform {
  if (isTauriRuntime()) {
    return "tauri";
  }

  if (isCapacitorRuntime()) {
    return "capacitor";
  }

  if (isStandalonePwa()) {
    return "pwa";
  }

  return "web";
}
