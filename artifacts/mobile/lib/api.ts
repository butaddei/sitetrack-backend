import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "sitetrack_jwt_token";

const PRODUCTION_API_URL = "https://sitetrack-backend.onrender.com/api";

// Timeout per request attempt. During a Render cold start the server can take
// 30–50 s to wake up; we prefer to fail fast and let the caller decide whether
// to retry rather than blocking the UI indefinitely.
const REQUEST_TIMEOUT_MS = 12_000;

export function getApiUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  return PRODUCTION_API_URL;
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function storeToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  _retryCount?: number;
  /** Override the per-request timeout (ms). Pass 0 to disable. */
  timeoutMs?: number;
}

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, _retryCount = 0, timeoutMs = REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${path}`;

  const headers = new Headers(fetchOptions.headers ?? {});
  if (!headers.has("content-type") && fetchOptions.body) {
    headers.set("content-type", "application/json");
  }

  if (!skipAuth) {
    const token = await getStoredToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  // Per-request AbortController so we can enforce a timeout
  const controller = new AbortController();
  const timer =
    timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    console.error(`[apiFetch] ${isTimeout ? "Timeout" : "Network error"}: ${url}`, err);
    if (_retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
      return apiFetch<T>(path, { ...options, _retryCount: _retryCount + 1 });
    }
    throw new ApiError(
      isTimeout
        ? "Servidor demorou para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua conexão.",
      0
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    let errorMessage = `Erro na requisição: ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.error ?? data.message ?? errorMessage;
    } catch {}
    console.error(`[apiFetch] HTTP ${response.status}: ${url}`);
    throw new ApiError(errorMessage, response.status);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}
