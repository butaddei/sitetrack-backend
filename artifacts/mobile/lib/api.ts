import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "sitetrack_jwt_token";

const PRODUCTION_API_URL = "https://workspace--butaddei.replit.app/api";

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
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, _retryCount = 0, ...fetchOptions } = options;
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

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOptions, headers });
  } catch {
    if (_retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
      return apiFetch<T>(path, { ...options, _retryCount: _retryCount + 1 });
    }
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      0
    );
  }

  if (!response.ok) {
    let errorMessage = `Erro na requisição: ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.error ?? data.message ?? errorMessage;
    } catch {}
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
