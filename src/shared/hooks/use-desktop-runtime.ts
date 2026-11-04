"use client";

import { useSyncExternalStore } from "react";
import { isDesktopRuntime } from "@/shared/lib/desktop/bridge";

const subscribe = () => () => {};
const serverSnapshot = () => false;

export function useDesktopRuntime() {
  return useSyncExternalStore(subscribe, isDesktopRuntime, serverSnapshot);
}
