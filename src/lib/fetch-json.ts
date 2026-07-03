type JsonRecord = Record<string, unknown>;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetchJson<T extends JsonRecord = JsonRecord>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ response: Response; data: T }> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = (await response.text()).trim();
    const snippet = text.slice(0, 80).replace(/\s+/g, " ");

    if (response.redirected && response.url.includes("/login")) {
      throw new ApiError("Your session expired. Please sign in again.", 401);
    }

    throw new ApiError(
      snippet
        ? `Server returned an unexpected response (${response.status}): ${snippet}`
        : `Server returned an unexpected response (${response.status}).`,
      response.status,
    );
  }

  const data = (await response.json()) as T;
  return { response, data };
}
