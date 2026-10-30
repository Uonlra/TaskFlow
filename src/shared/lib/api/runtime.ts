const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";

export const apiBaseUrl = configuredApiBaseUrl.replace(/\/$/, "");

export function resolveApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!apiBaseUrl) return input;

  if (typeof input === "string" && input.startsWith("/")) {
    return `${apiBaseUrl}${input}`;
  }

  if (input instanceof URL && input.pathname.startsWith("/")) {
    return `${apiBaseUrl}${input.pathname}${input.search}${input.hash}`;
  }

  if (typeof Request !== "undefined" && input instanceof Request && input.url.startsWith("/")) {
    return `${apiBaseUrl}${input.url}`;
  }

  return input;
}

export function isRemoteApiRuntime() {
  return Boolean(apiBaseUrl);
}
