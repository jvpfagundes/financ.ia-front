export const API_URL = "http://178.156.165.80:8765/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

function buildHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options: { method?: HttpMethod; body?: unknown; token?: string } = {}): Promise<T> {
  const { method = "GET", body, token } = options;
  const resp = await fetch(`${API_URL}${path}`, {
    method,
    headers: buildHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await resp.json();
  } else {
    // Attempt text fallback
    try {
      data = await resp.text();
    } catch (_) {
      data = null;
    }
  }

  if (!resp.ok) {
    const error: ApiError = new Error((data && (data.message || data.detail)) || "Erro na requisição");
    error.status = resp.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

// Auth
export async function apiLogin(params: { username: string; password: string }): Promise<{ access_token: string }>
{
  return request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: params,
  });
}

export async function apiRegister(params: {
  password: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  birth_date: string; // ISO string (YYYY-MM-DD)
  username: string;
}): Promise<{ status: string }>
{
  return request<{ status: string }>("/auth/register", {
    method: "POST",
    body: params,
  });
}

// Expenses
export async function apiGetExpensesCards(token: string): Promise<{
  status: string;
  cards_dict: { total_expenses: number; top_category: string; last_transactions: Array<unknown> };
}> {
  return request("/expenses/cards", { method: "GET", token });
}

export async function apiGetExpensesTable(token: string): Promise<{
  status: string;
  expenses_list: Array<{ expense_date: string; category_name: string; value: number }>;
}> {
  return request("/expenses/table", { method: "GET", token });
}

export async function apiGetExpensesGraphicCategory(token: string): Promise<{
  status: string;
  categories_list: Array<{ name: string; value: number; perc: number }>;
}> {
  return request("/expenses/graphic/categories", { method: "GET", token });
}

export async function apiGetExpensesGraphicDays(token: string): Promise<{
  status: string;
  days_list: Array<{ day: string; value: number }>;
}> {
  return request("/expenses/graphic/days", { method: "GET", token });
}



