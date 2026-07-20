import "server-only";

import type { NextRequest } from "next/server";

import {
  appwriteApiKey,
  appwriteEndpoint,
  appwriteProjectId,
} from "@/shared/lib/appwrite/env";

export class AppwriteRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppwriteRequestError";
    this.status = status;
  }
}

type AppwriteFetchOptions = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  sessionSecret?: string | null;
  useAdminKey?: boolean;
  request?: NextRequest;
  searchParams?: Record<string, string | number | boolean | Array<string>>;
  errorMessage?: string;
};

export async function appwriteFetch<T = unknown>(
  options: AppwriteFetchOptions,
): Promise<T> {
  if (!appwriteEndpoint || !appwriteProjectId) {
    throw new Error("Appwrite endpoint or project ID is missing.");
  }

  if (options.useAdminKey && !appwriteApiKey) {
    throw new Error("Appwrite API key is missing.");
  }

  const url = new URL(`${appwriteEndpoint.replace(/\/$/, "")}${options.path}`);

  if (options.searchParams) {
    for (const [key, rawValue] of Object.entries(options.searchParams)) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      values.forEach((value) => {
        url.searchParams.append(key, String(value));
      });
    }
  }

  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Appwrite-Project": appwriteProjectId,
    "X-Appwrite-Response-Format": "1.8.0",
  });

  if (options.useAdminKey && appwriteApiKey) {
    headers.set("X-Appwrite-Key", appwriteApiKey);
  }

  if (options.sessionSecret) {
    headers.set("X-Appwrite-Session", options.sessionSecret);
  }

  const userAgent = options.request?.headers.get("user-agent");

  if (userAgent) {
    headers.set("X-Forwarded-User-Agent", userAgent);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = (await safeJson<{ message?: string }>(response)) ?? {};
    const fallback = options.errorMessage ?? `Appwrite request failed with status ${response.status}.`;
    throw new AppwriteRequestError(
      response.status,
      errorPayload.message || fallback,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
