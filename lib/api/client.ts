/**
 * Shared HTTP client utilities for API calls
 */

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
      console.error(`❌ [HTTP] Request failed: ${url} - ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ [HTTP] Request error: ${url}`, error);
    return null;
  }
}
