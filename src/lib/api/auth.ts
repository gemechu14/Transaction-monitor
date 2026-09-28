import { authFetch } from "@/lib/api/auth-client";
import type {
  AdminUser,
  AdminUsersParams,
  CreateUserPayload,
  LoginUser,
  SessionUser,
  UpdateUserPayload,
} from "@/types/auth";

export function login(identifier: string, password: string): Promise<{ success: true; user: LoginUser }> {
  return authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export function getMe(): Promise<{ user: SessionUser }> {
  return authFetch("/api/auth/me");
}

export function logout(): Promise<{ success: true }> {
  return authFetch("/api/auth/logout", { method: "POST" });
}

export function listUsers(params: AdminUsersParams = {}): Promise<{ users: AdminUser[] }> {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.role) search.set("role", params.role);
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return authFetch(`/api/admin/users${query ? `?${query}` : ""}`);
}

export function getUser(id: string): Promise<{ user: AdminUser }> {
  return authFetch(`/api/admin/users/${id}`);
}

export function createUser(payload: CreateUserPayload): Promise<{ user: AdminUser }> {
  return authFetch("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<{ user: AdminUser }> {
  return authFetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: string): Promise<{ user: AdminUser }> {
  return authFetch(`/api/admin/users/${id}`, { method: "DELETE" });
}
