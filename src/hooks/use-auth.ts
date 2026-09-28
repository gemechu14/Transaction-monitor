import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMe, login, logout } from "@/lib/api/auth";

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

/** Restores session state on app load. 401 means "not logged in", not an error to retry. */
export function useMe() {
  return useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      login(identifier, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
    },
  });
}
