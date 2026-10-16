"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type QueryState<T> = { key: string; data: T | null; isLoading: boolean; error: string | null };
type KeyedQueryOptions<T> = {
  key: string | null;
  enabled: boolean;
  load: (signal: AbortSignal) => Promise<T>;
  formatError: (error: unknown) => string;
  initial?: { key: string; data: T } | null;
};

/** One query result, isolated by account and parameters. Initial data seeds this instance only once. */
export function useKeyedQuery<T>({ key, enabled, load, formatError, initial }: KeyedQueryOptions<T>) {
  const [state, setState] = useState<QueryState<T> | null>(() =>
    initial ? { ...initial, isLoading: false, error: null } : null,
  );
  const cached = useRef(state);
  const activeKey = useRef<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    // An operation started under an older query must not refresh the current screen.
    if (!enabled || !key || activeKey.current !== key) return false;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const isCurrent = () => !controller.signal.aborted && activeKey.current === key;
    try {
      const data = await load(controller.signal);
      if (!isCurrent()) return false;
      const next = { key, data, isLoading: false, error: null };
      cached.current = next;
      setState(next);
      return true;
    } catch (error) {
      if (!isCurrent()) return false;
      const next = {
        key,
        data: cached.current?.key === key ? cached.current.data : null,
        isLoading: false,
        error: formatError(error),
      };
      cached.current = next;
      setState(next);
      return false;
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [enabled, key, load, formatError]);

  useEffect(() => {
    activeKey.current = enabled ? key : null;
    if (enabled && key && cached.current?.key !== key) void execute();
    return () => {
      activeKey.current = null;
      activeRequest.current?.abort();
    };
  }, [enabled, key, execute]);

  const reload = useCallback(() => {
    if (!enabled || !key || activeKey.current !== key) return Promise.resolve(false);
    setState((current) => ({
      key,
      data: current?.key === key ? current.data : null,
      isLoading: true,
      error: null,
    }));
    return execute();
  }, [enabled, key, execute]);

  const current = state?.key === key ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    isLoading: Boolean(key && (!current || current.isLoading)),
    reload,
  };
}
