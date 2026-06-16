export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/** ngrok free tier shows an interstitial — this header skips it for API calls */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (API_BASE.includes("ngrok")) {
    headers.set("ngrok-skip-browser-warning", "true");
  }
  return fetch(input, { ...init, headers });
}
