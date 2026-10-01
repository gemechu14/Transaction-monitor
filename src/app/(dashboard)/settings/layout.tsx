import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings · WSO2 Transaction Ops",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
