type JsonRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  cache?: RequestCache;
};

export async function requestJson<T = unknown>(input: RequestInfo | URL, options: JsonRequestOptions = {}): Promise<T> {
  const response = await fetch(input, {
    method: options.method ?? "GET",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.cache ? { cache: options.cache } : {}),
  });
  return readJsonResponse<T>(response);
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "请求失败，请稍后再试。");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
