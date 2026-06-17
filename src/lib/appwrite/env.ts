export const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
export const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const appwriteApiKey = process.env.APPWRITE_API_KEY;
export const appwriteDatabaseId = process.env.APPWRITE_DATABASE_ID;
export const appwriteTasksTableId = process.env.APPWRITE_TASKS_TABLE_ID;
export const appwriteSessionCookieName =
  process.env.APPWRITE_SESSION_COOKIE_NAME || "taskflow-session";
const vercelPublicHost =
  process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
export const publicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (vercelPublicHost ? `https://${vercelPublicHost}` : undefined);

export const hasAppwritePublicEnv = Boolean(
  appwriteEndpoint && appwriteProjectId,
);

export const hasAppwriteAuthEnv = Boolean(
  hasAppwritePublicEnv && appwriteApiKey,
);

export const hasAppwriteDatabaseEnv = Boolean(
  hasAppwriteAuthEnv && appwriteDatabaseId && appwriteTasksTableId,
);

export const hasAppwriteEnv = hasAppwritePublicEnv;

type PublicSiteUrlRequest = {
  headers?: {
    get(name: string): string | null;
  };
  url?: string;
};

export function getPublicSiteUrl(path = "", request?: PublicSiteUrlRequest) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const requestOrigin = getRequestOrigin(request);

  if (
    publicSiteUrl &&
    (!isLocalUrl(publicSiteUrl) || !requestOrigin || isLocalUrl(requestOrigin))
  ) {
    return `${publicSiteUrl.replace(/\/$/, "")}${normalizedPath}`;
  }

  if (requestOrigin) {
    return `${requestOrigin.replace(/\/$/, "")}${normalizedPath}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalizedPath}`;
  }

  return normalizedPath;
}

function getRequestOrigin(request?: PublicSiteUrlRequest) {
  const forwardedHost = getFirstHeaderValue(request?.headers?.get("x-forwarded-host"));
  const host = forwardedHost || getFirstHeaderValue(request?.headers?.get("host"));

  if (host) {
    const forwardedProto = getFirstHeaderValue(request?.headers?.get("x-forwarded-proto"));
    const protocol =
      forwardedProto || (isLocalHost(host) ? "http" : "https");

    return `${protocol}://${host}`;
  }

  if (!request?.url) {
    return undefined;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return undefined;
  }
}

function getFirstHeaderValue(value?: string | null) {
  return value?.split(",")[0]?.trim() || undefined;
}

function isLocalUrl(value: string) {
  try {
    return isLocalHost(new URL(value).hostname);
  } catch {
    return false;
  }
}

function isLocalHost(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
