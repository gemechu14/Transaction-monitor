"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";

import { SITE_CONFIG } from "@/config/site";
import { useLogin, useMe } from "@/hooks";
import { AuthApiError } from "@/lib/api/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const meQuery = useMe();
  const loginMutation = useLogin();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Already have a valid session (e.g. followed a bookmark) — skip the form.
  useEffect(() => {
    if (meQuery.data?.user) {
      router.replace("/overview");
    }
  }, [meQuery.data, router]);

  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) return;
    const timer = setTimeout(() => setRetryAfter((seconds) => (seconds ? seconds - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Enter your username and password to continue.");
      setNotice(null);
      return;
    }

    setError(null);
    setNotice(null);

    try {
      await loginMutation.mutateAsync({ identifier: identifier.trim(), password });
      router.push("/overview");
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.status === 503) {
          // AD outage — transient, not a credentials problem, don't scare the user.
          setNotice(err.message);
        } else if (err.status === 429) {
          setError(err.message);
          setRetryAfter(err.retryAfterSeconds ?? 60);
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  const isLocked = retryAfter !== null && retryAfter > 0;
  const isSubmitting = loginMutation.isPending;
  const identifierInvalid = Boolean(error) && !identifier.trim();
  const passwordInvalid = Boolean(error) && !password;

  return (
    <div className="login-scope flex min-h-svh flex-col items-center justify-center bg-[var(--l-bg)] px-6 py-12 font-sans">
      <div className="w-full max-w-[440px]">
        <div className="rounded-[20px] border border-[var(--l-line)] bg-[var(--l-surface)] px-[22px] pt-[30px] pb-[22px] shadow-[var(--l-card-shadow)] min-[620px]:px-10 min-[620px]:pt-10 min-[620px]:pb-[30px]">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-[72px] items-center justify-center rounded-[18px] border border-[var(--l-line)] bg-[var(--l-surface)]">
              <svg
                aria-hidden
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F26B1D"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M3.5 12h4l1.75-3.5 3 7 2-5 1.25 1.5h5" />
              </svg>
            </span>
            <h1 className="mt-5 text-[26px] leading-tight font-bold tracking-[-0.02em] text-[var(--l-text)]">
              {SITE_CONFIG.name}
            </h1>
            <p className="mt-1.5 mb-7 text-[15px] text-[var(--l-muted)]">Sign in to the operations workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-[18px]" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-[10px] bg-[var(--l-bad-soft)] px-3 py-2.5 text-[13px] text-[var(--l-bad)]"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-[10px] border border-status-pending/30 bg-status-pending/10 px-3 py-2.5 text-[13px] text-[var(--l-text-2)]"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-pending" />
                <span>{notice}</span>
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="mb-[7px] block text-[13px] font-semibold text-[var(--l-text-2)]">
                Username or email
              </label>
              <input
                id="identifier"
                autoComplete="username"
                spellCheck={false}
                autoFocus
                placeholder="name@coopbankoromiasc.com"
                className="login-input"
                aria-invalid={identifierInvalid || undefined}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-[7px] block text-[13px] font-semibold text-[var(--l-text-2)]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="login-input pr-12"
                  aria-invalid={passwordInvalid || undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className={`absolute top-1/2 right-[5px] flex size-9 -translate-y-1/2 items-center justify-center rounded-[9px] bg-transparent outline-none transition-colors hover:bg-[var(--l-surface-2)] focus-visible:ring-[3px] focus-visible:ring-[var(--l-primary-soft)] ${
                    showPassword ? "text-[var(--l-primary-strong)]" : "text-[var(--l-muted)]"
                  }`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--l-primary)] text-[15px] font-bold text-white outline-none transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-[var(--l-primary-soft)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100"
              disabled={isSubmitting || isLocked}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : isLocked ? (
                `Try again in ${retryAfter}s`
              ) : (
                "Sign in"
              )}
            </button>

            <p className="border-t border-[var(--l-line-soft)] pt-[18px] text-center text-[13px] text-[var(--l-muted)]">
              Not seeing your account? Ask an administrator to pre-approve your email before signing in.
            </p>
          </form>
        </div>

        <div className="mt-7 space-y-1 text-center text-xs text-[var(--l-muted)]">
          <p>
            Powered by <span className="font-semibold text-[var(--l-primary-strong)]">DX Valley</span>
          </p>
          <p>&copy; {new Date().getFullYear()} Cooperative Bank of Oromia. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
