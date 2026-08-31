export async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("[fetch] Failed to parse JSON response.", {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: raw.slice(0, 300),
      error,
    });

    const fallbackMessage = raw.trim().startsWith("<!DOCTYPE html>")
      ? "Received HTML instead of JSON. The request may have been redirected or crashed on the server."
      : raw.trim() || `Request failed with status ${response.status}.`;

    throw new Error(fallbackMessage);
  }
}
