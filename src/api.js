const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_BASE_URL = configuredBaseUrl.includes("vinodbalakumar.com") ? "" : configuredBaseUrl;

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
  const body = new URLSearchParams({ username, password });
  return request("/auth/login", { method: "POST", body });
}

export async function fetchMe() {
  return request("/api/v1/users/me");
}

export async function fetchVehicle() {
  return request("/api/tesla/vehicles");
}

export async function fetchStatus() {
  return request("/api/tesla/status");
}

export async function sendCommand(path, query) {
  const suffix = query ? `?${new URLSearchParams(query).toString()}` : "";
  return request(`${path}${suffix}`, { method: "POST" });
}
