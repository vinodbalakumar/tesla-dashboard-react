const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_BASE_URL = configuredBaseUrl.includes("vinodbalakumar.com") ? "" : configuredBaseUrl;
export const TESLA_API_PATH = "/tesla-dashboard-services/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("teslaToken") || localStorage.getItem("sharityAccessToken");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof URLSearchParams ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function login(username, password) {
  const response = await request("/authorization-server/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: username, password }),
  });
  return response?.accessToken || response?.token || response;
}

export async function fetchMe() {
  return request("/authorization-server/api/v1/users/me");
}

export async function fetchVehicle() {
  return request(`${TESLA_API_PATH}/vehicles`);
}

export async function fetchStatus() {
  return request(`${TESLA_API_PATH}/status`);
}

export async function sendCommand(path, query) {
  const suffix = query ? `?${new URLSearchParams(query).toString()}` : "";
  return request(`${path}${suffix}`, { method: "POST" });
}
