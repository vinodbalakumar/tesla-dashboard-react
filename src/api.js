const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof URLSearchParams ? {} : { "Content-Type": "application/json" }),
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

export async function fetchUser(username) {
  return request(`/auth/users/${encodeURIComponent(username)}`);
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
