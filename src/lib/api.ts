export const API_URL = "https://fintrack.myaddr.io/api";

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

function toQuery(params?: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
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
export async function apiGetExpensesCards(token: string, params?: { dat_start?: string; dat_end?: string }): Promise<{
  status: string;
  cards_dict: { total_expenses: number; top_category: string; last_transactions: Array<unknown> };
}> {
  const q = toQuery({ dat_start: params?.dat_start, dat_end: params?.dat_end });
  return request(`/expenses/cards${q}`, { method: "GET", token });
}

export async function apiGetExpensesTable(token: string, params?: { dat_start?: string; dat_end?: string }): Promise<{
  status: string | boolean;
  expenses_list: Array<{ expense_date: string; category_name: string; value: number; description?: string; id?: number | string; ID?: number | string }>;
}> {
  const q = toQuery({ dat_start: params?.dat_start, dat_end: params?.dat_end });
  return request(`/expenses/table${q}`, { method: "GET", token });
}

export async function apiGetExpensesGraphicCategory(token: string, params?: { dat_start?: string; dat_end?: string }): Promise<{
  status: string;
  categories_list: Array<{ name: string; value: number; perc: number }>;
}> {
  const q = toQuery({ dat_start: params?.dat_start, dat_end: params?.dat_end });
  return request(`/expenses/graphic/categories${q}`, { method: "GET", token });
}

export async function apiGetExpensesGraphicDays(token: string, params?: { dat_start?: string; dat_end?: string }): Promise<{
  status: string;
  days_list: Array<{ day: string; value: number }>;
}> {
  const q = toQuery({ dat_start: params?.dat_start, dat_end: params?.dat_end });
  return request(`/expenses/graphic/days${q}`, { method: "GET", token });
}

export type ExpenseCategory = { id: number; name: string };

export async function apiGetExpenseCategories(token: string): Promise<{
  status: string | boolean;
  categories_list: ExpenseCategory[];
}> {
  return request(`/expenses/categories`, { method: "GET", token });
}

export async function apiCreateExpense(
  token: string,
  body: { amount: number; category_id: number | string; date: string; time: string; description?: string }
): Promise<{ status: boolean | string; id?: number | string; ID?: number | string }> {
  return request(`/expenses/`, { method: "POST", token, body });
}

export async function apiDeleteExpense(
  token: string,
  payload: { id: number | string } | { ID: number | string } | { expense_id: number | string }
): Promise<{ status: boolean | string }> {
  return request(`/expenses/`, { method: "DELETE", token, body: payload });
}

