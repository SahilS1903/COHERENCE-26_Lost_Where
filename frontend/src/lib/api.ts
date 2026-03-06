const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options;
  const token = localStorage.getItem("auth_token");

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = new URL(`${API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    });
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("auth_token");
    window.location.href = "/";
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new Error(data?.error || response.statusText || "An error occurred");
  }

  return data;
}

export const api = {
  auth: {
    login: (data: any) => fetchApi("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    register: (data: any) => fetchApi("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  },
  workflows: {
    list: () => fetchApi("/workflows"),
    get: (id: string) => fetchApi(`/workflows/${id}`),
    create: (data: any) => fetchApi("/workflows", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => fetchApi(`/workflows/${id}`, { method: "DELETE" }),
    activate: (id: string) => fetchApi(`/workflows/${id}/activate`, { method: "PATCH" }),
    deactivate: (id: string) => fetchApi(`/workflows/${id}/deactivate`, { method: "PATCH" }),
  },
  nodes: {
    list: (workflowId: string) => fetchApi(`/workflows/${workflowId}/nodes`),
    create: (workflowId: string, data: any) => fetchApi(`/workflows/${workflowId}/nodes`, { method: "POST", body: JSON.stringify(data) }),
    update: (workflowId: string, id: string, data: any) => fetchApi(`/workflows/${workflowId}/nodes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (workflowId: string, id: string) => fetchApi(`/workflows/${workflowId}/nodes/${id}`, { method: "DELETE" }),
  },
  edges: {
    list: (workflowId: string) => fetchApi(`/workflows/${workflowId}/edges`),
    create: (workflowId: string, data: any) => fetchApi(`/workflows/${workflowId}/edges`, { method: "POST", body: JSON.stringify(data) }),
    remove: (workflowId: string, id: string) => fetchApi(`/workflows/${workflowId}/edges/${id}`, { method: "DELETE" }),
  },
  leads: {
    import: (workflowId: string, data: any) => fetchApi(`/workflows/${workflowId}/leads/import`, { method: "POST", body: JSON.stringify(data) }),
    list: (workflowId: string, params?: any) => fetchApi(`/workflows/${workflowId}/leads`, { params }),
    get: (id: string) => fetchApi(`/leads/${id}`),
    updateStatus: (id: string, status: string) => fetchApi(`/leads/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    history: (id: string) => fetchApi(`/leads/${id}/history`),
  },
  outbox: {
    list: (params?: any) => fetchApi("/outbox", { params }),
  },
  dashboard: {
    stats: () => fetchApi("/dashboard"),
  },
  user: {
    getSmtpConfig: () => fetchApi("/user/smtp-config"),
    updateSmtpConfig: (data: any) => fetchApi("/user/smtp-config", { method: "PUT", body: JSON.stringify(data) }),
    deleteSmtpConfig: () => fetchApi("/user/smtp-config", { method: "DELETE" }),
    testSmtpConfig: (to?: string) => fetchApi("/user/smtp-config/test", { method: "POST", body: JSON.stringify(to ? { to } : {}) }),
  },
};
