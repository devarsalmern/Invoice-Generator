const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const apiBase = rawApiUrl ? rawApiUrl.replace(/\/+$/, "").replace(/^(?!https?:\/\/)/, "https://") : "";

export async function payrollSlipFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("payrollpro_token");
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}
