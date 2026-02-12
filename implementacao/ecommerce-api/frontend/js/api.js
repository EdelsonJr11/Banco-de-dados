import { API_BASE } from "./config.js";

export async function requestJson(path, options = {}) {
    const config = { cache: "no-store", ...options };
    const response = await fetch(`${API_BASE}${path}`, config);

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        const message = isJson
            ? body?.mensagem || `Falha HTTP ${response.status}`
            : body || `Falha HTTP ${response.status}`;
        throw new Error(message);
    }

    return body;
}
