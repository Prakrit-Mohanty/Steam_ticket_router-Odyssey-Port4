const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let accessToken = localStorage.getItem("accessToken") || null;
let refreshToken = localStorage.getItem("refreshToken") || null;
let currentRole = localStorage.getItem("role") || null;

function setTokens({ access_token, refresh_token, role }) {
  accessToken = access_token;
  refreshToken = refresh_token;
  currentRole = role;
  localStorage.setItem("accessToken", access_token);
  localStorage.setItem("refreshToken", refresh_token);
  localStorage.setItem("role", role);
}

function clearTokens() {
  accessToken = null;
  refreshToken = null;
  currentRole = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
}

export function isLoggedIn() {
  return !!accessToken;
}

export function getRole() {
  return currentRole;
}

async function handle(res) {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || `Request failed with ${res.status}`);
  }
  return body;
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await handle(res);
  setTokens(data);
  return data;
}

export async function register(username, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await handle(res);
  setTokens(data);
  return data;
}

export function logout() {
  if (refreshToken) {
    fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {});
  }
  clearTokens();
}

async function tryRefresh() {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data);
    return true;
  } catch {
    return false;
  }
}

async function authFetch(path, options = {}) {
  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      clearTokens();
      throw new Error("Session expired - please log in again.");
    }
  }

  return handle(res);
}

export async function classifyOne(text) {
  return authFetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function draftReply(text, category, priority) {
  return authFetch("/api/draft-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, category, priority }),
  });
}

export async function listTickets() {
  return authFetch("/api/tickets");
}

export async function getTicket(id) {
  return authFetch(`/api/tickets/${id}`);
}

export async function createTicket(text) {
  return authFetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}