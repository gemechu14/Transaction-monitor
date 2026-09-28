import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AUTH_ME_QUERY_KEY } from "@/hooks/use-auth";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/api/auth";
import type { AdminUsersParams, CreateUserPayload, UpdateUserPayload } from "@/types/auth";

const ADMIN_USERS_QUERY_KEY = "admin-users";

export function useAdminUsers(params: AdminUsersParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [ADMIN_USERS_QUERY_KEY, params],
    queryFn: () => listUsers(params),
    enabled: options.enabled ?? true,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
      // Refreshes the acting admin's own session view when they edit their own role/status.
      queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
    },
  });
}
