import "server-only";

import type { NextRequest } from "next/server";

import type { AuthSession, AuthUser } from "@/features/auth/types/auth.types";
import type { Profile } from "@/features/auth/types/profile.types";
import {
  appwriteApiKey,
  appwriteEndpoint,
  appwriteProjectId,
  hasAppwriteAuthEnv,
} from "@/lib/appwrite/env";
import { getAppwriteSessionSecret } from "@/lib/appwrite/session";

type AppwriteSessionResponse = {
  $id: string;
  expire?: string;
  secret?: string;
};

type AppwriteAccountResponse = {
  $id: string;
  name?: string;
  email?: string;
  emailVerification?: boolean;
  prefs?: Record<string, unknown>;
};

type AppwriteErrorResponse = {
  message?: string;
  type?: string;
  code?: number;
};

type AppwriteUsersListResponse = {
  total?: number;
  users?: AppwriteAccountResponse[];
};

type AppwriteRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  sessionSecret?: string | null;
  useAdminKey?: boolean;
  request?: NextRequest;
  searchParams?: Record<string, string | number | boolean | Array<string>>;
};

type AuthEnvelope = {
  user: AuthUser;
  profile: Profile;
  session: AuthSession;
};

type RegisterResult = {
  envelope: AuthEnvelope;
};

export async function getCurrentAuthEnvelope() {
  if (!hasAppwriteAuthEnv) {
    return null;
  }

  const sessionSecret = await getAppwriteSessionSecret();

  if (!sessionSecret) {
    return null;
  }

  try {
    const account = await getCurrentAccount(sessionSecret);
    return toAuthEnvelope(account, account?.email ?? "", undefined);
  } catch {
    return null;
  }
}

export async function createEmailPasswordSession(input: {
  email: string;
  password: string;
  request?: NextRequest;
}) {
  const session = await appwriteRequest<AppwriteSessionResponse>(
    "/account/sessions/email",
    {
      method: "POST",
      useAdminKey: true,
      request: input.request,
      body: {
        email: input.email,
        password: input.password,
      },
    },
  );

  if (!session.secret) {
    throw new Error("Appwrite did not return a session secret.");
  }

  const account = await getCurrentAccount(session.secret, input.request);
  const envelope = toAuthEnvelope(account, input.email, session.expire);

  return {
    secret: session.secret,
    expire: session.expire,
    envelope,
  };
}

export async function registerEmailPasswordAccount(input: {
  name: string;
  email: string;
  password: string;
  request?: NextRequest;
}) {
  const account = await appwriteRequest<AppwriteAccountResponse>("/account", {
    method: "POST",
    useAdminKey: true,
    request: input.request,
    body: {
      userId: "unique()",
      email: input.email,
      password: input.password,
      name: input.name,
    },
  });

  return {
    envelope: toAuthEnvelope(account, input.email, undefined),
  } satisfies RegisterResult;
}

export async function destroyCurrentSession(sessionSecret: string, request?: NextRequest) {
  return appwriteRequest("/account/sessions/current", {
    method: "DELETE",
    sessionSecret,
    request,
  });
}

export async function updateCurrentProfile(
  sessionSecret: string,
  values: { fullName: string; avatarUrl: string },
  request?: NextRequest,
) {
  const current = await getCurrentAccount(sessionSecret, request);

  await appwriteRequest("/account/name", {
    method: "PATCH",
    sessionSecret,
    request,
    body: {
      name: values.fullName,
    },
  });

  const mergedPrefs = {
    ...(current.prefs ?? {}),
    avatarUrl: values.avatarUrl || "",
  };

  const updated = await appwriteRequest<AppwriteAccountResponse>("/account/prefs", {
    method: "PATCH",
    sessionSecret,
    request,
    body: {
      prefs: mergedPrefs,
    },
  });

  return toProfile(updated, updated.email ?? current.email ?? "");
}

export async function getCurrentAccount(
  sessionSecret: string,
  request?: NextRequest,
) {
  return appwriteRequest<AppwriteAccountResponse>("/account", {
    sessionSecret,
    request,
  });
}

export async function getPublicAccountStatusByEmail(email: string, request?: NextRequest) {
  if (!hasAppwriteAuthEnv) {
    return "unknown" as const;
  }

  try {
    const result = await appwriteRequest<AppwriteUsersListResponse>("/users", {
      request,
      useAdminKey: true,
      searchParams: {
        search: email,
      },
    });

    const hasExactMatch = (result.users ?? []).some(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    return hasExactMatch
      ? ("registered" as const)
      : ("available" as const);
  } catch {
    return "unknown" as const;
  }
}

export function toProfile(account: AppwriteAccountResponse, fallbackEmail = ""): Profile {
  const avatarValue = account.prefs?.avatarUrl;

  return {
    id: account.$id,
    fullName: account.name ?? "",
    email: account.email ?? fallbackEmail,
    avatarUrl: typeof avatarValue === "string" && avatarValue ? avatarValue : undefined,
  };
}

export function toAuthEnvelope(
  account: AppwriteAccountResponse,
  fallbackEmail = "",
  expire?: string,
): AuthEnvelope {
  const email = account.email ?? fallbackEmail;
  const name = account.name ?? "";

  return {
    user: {
      id: account.$id,
      email,
      name,
      emailVerified: Boolean(account.emailVerification),
    },
    profile: toProfile(account, fallbackEmail),
    session: {
      expire,
    },
  };
}

export class AppwriteRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppwriteRequestError";
    this.status = status;
  }
}

async function appwriteRequest<T = unknown>(
  path: string,
  options: AppwriteRequestOptions = {},
) {
  if (!appwriteEndpoint || !appwriteProjectId) {
    throw new Error("Appwrite endpoint or project ID is missing.");
  }

  if (options.useAdminKey && !appwriteApiKey) {
    throw new Error("Appwrite API key is missing.");
  }

  const url = new URL(`${appwriteEndpoint.replace(/\/$/, "")}${path}`);

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
    const errorPayload = (await safeJson<AppwriteErrorResponse>(response)) ?? {};
    throw new AppwriteRequestError(
      response.status,
      errorPayload.message || `Appwrite request failed with status ${response.status}.`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function safeJson<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
