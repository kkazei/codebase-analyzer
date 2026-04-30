import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error?.response?.data;
    const message = extractApiErrorMessage(payload) ?? error?.message ?? "Request failed.";
    return Promise.reject(new Error(message));
  }
);

function extractApiErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const message = "msg" in item ? (item as { msg?: unknown }).msg : null;
          return typeof message === "string" && message.trim() ? message : null;
        })
        .filter((message): message is string => Boolean(message));

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  }

  if ("error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  if ("message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return null;
}
