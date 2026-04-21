export async function readJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    const bodyText = await res.text();
    const normalized = bodyText.slice(0, 600).replace(/\s+/g, " ").trim();
    const looksLikeHtml = normalized.toLowerCase().includes("<!doctype html") || normalized.toLowerCase().includes("<html");
    const looksLikeVite =
      normalized.includes("/@react-refresh") ||
      normalized.includes("window.$RefreshReg$") ||
      normalized.includes("vite") ||
      normalized.includes("Vite");

    if (looksLikeHtml && looksLikeVite) {
      const urlHint = res.url ? ` (${res.url})` : "";
      throw new Error(
        `Expected JSON but received HTML (${res.status})${urlHint}. ` +
          `This usually means the request hit the Vite SPA server instead of the API. ` +
          `Fix: run the backend dev server (recommended: \`npm run dev\`) and open the app on that same origin (default: http://localhost:3000). ` +
          `If you run Vite separately, proxy \`/api\` to the backend.`
      );
    }

    const snippet = normalized.slice(0, 180);
    throw new Error(`Expected JSON but received ${contentType || "unknown"} (${res.status}). ${snippet}`);
  }

  return (await res.json()) as T;
}
