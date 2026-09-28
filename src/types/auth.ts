export type UserRole = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "DISABLED";

/** The session user returned by `GET /api/auth/me`. */
export interface SessionUser {
  userId: string;
  email: string;
  displayName: string | null;
  givenName?: string;
  username: string | null;
  distinguishedName?: string;
  role: UserRole;
}

/** The user summary embedded in a successful `POST /api/auth/login` response. */
export interface LoginUser {
  displayName: string;
  email: string;
  username: string;
  role: UserRole;
}

/** A pre-approved user as managed via the admin endpoints. */
export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AdminUsersParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface CreateUserPayload {
  email: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  role?: UserRole;
  status?: UserStatus;
}
