"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10 dark:bg-[#020618]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(600px circle at 50% -10%, color-mix(in oklch, var(--primary) 12%, transparent), transparent)",
        }}
      />

      <div className="w-full max-w-md">
        <Card>
          <CardContent className="space-y-8 px-8 py-4">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-card ring-1 ring-foreground/10">
                <Image src="/wso2-mark.png" alt="" width={185} height={185} className="size-12" />
              </span>
              <div className="space-y-1.5">
                <p className="text-2xl font-bold text-foreground">{SITE_CONFIG.name}</p>
                <p className="text-base text-muted-foreground">Sign in to the operations workspace</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2.5">
                <label htmlFor="identifier" className="text-base font-medium text-foreground">
                  Username or email
                </label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  placeholder="Enter your username or email"
                  className="h-10 text-base"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>

              <div className="space-y-2.5">
                <label htmlFor="password" className="text-base font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-10 pr-11 text-base"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              {notice && (
                <div className="flex items-start gap-2 rounded-lg border border-status-pending/30 bg-status-pending/10 px-3 py-2 text-sm text-status-pending">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm font-medium text-status-failed">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="default"
                className="h-11 w-full bg-[#00ADEF] text-base font-semibold text-white hover:bg-[#00ADEF]/90"
                disabled={isSubmitting || isLocked}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Signing in…
                  </>
                ) : isLocked ? (
                  `Try again in ${retryAfter}s`
                ) : (
                  "Sign in"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Not seeing your account? Ask an administrator to pre-approve your email before signing
                in.
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-1 text-center text-xs text-muted-foreground">
          <p>
            Powered by <span className="font-semibold text-primary">DX Valley</span>
          </p>
          <p>&copy; {new Date().getFullYear()} Cooperative Bank of Oromia. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
