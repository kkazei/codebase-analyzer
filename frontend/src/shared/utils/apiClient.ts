import axios from "axios";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// Use localhost only for local development. In production, an empty base URL
// keeps `/api/v1/*` on the deployed site's origin (for a same-origin proxy).
export const API_BASE_URL =
  configuredApiBaseUrl || (import.meta.env.DEV ? "http://localhost:8000" : "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error?.response?.data ?? error)
);
