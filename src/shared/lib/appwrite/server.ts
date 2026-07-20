import "server-only";

import type { NextRequest } from "next/server";

import type { AuthSession, AuthUser } from "@/features/auth/types/auth.types";
import type { Profile } from "@/features/auth/types/profile.types";
import { hasAppwriteAuthEnv } from "@/shared/lib/appwrite/env";
import { appwriteFetch } from "@/shared/lib/appwrite/request";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";

export { AppwriteRequestError } from "@/shared/lib/appwrite/request";

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

type AppwriteUsersListResponse = {
  total?: number;
  users?: AppwriteAccountResponse[];
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
  const session = await appwriteFetch<AppwriteSessionResponse>({
    path: "/account/sessions/email",
    method: "POST",
    useAdminKey: true,
    request: input.request,
    body: {
      email: input.email,
      password: input.password,
    },
  });

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
  const account = await appwriteFetch<AppwriteAccountResponse>({
    path: "/account",
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
  return appwriteFetch({
    path: "/account/sessions/current",
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

  await appwriteFetch({
    path: "/account/name",
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

  const updated = await appwriteFetch<AppwriteAccountResponse>({
    path: "/account/prefs",
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
  return appwriteFetch<AppwriteAccountResponse>({
    path: "/account",
    sessionSecret,
    request,
  });
}

export async function getPublicAccountStatusByEmail(email: string, request?: NextRequest) {
  if (!hasAppwriteAuthEnv) {
    return "unknown" as const;
  }

  try {
    const result = await appwriteFetch<AppwriteUsersListResponse>({
      path: "/users",
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
