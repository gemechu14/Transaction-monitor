import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/layout/auth-gate";
import { PeriodProvider } from "@/components/providers/period-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <PeriodProvider>
        <AppShell>{children}</AppShell>
      </PeriodProvider>
    </AuthGate>
  );
}
