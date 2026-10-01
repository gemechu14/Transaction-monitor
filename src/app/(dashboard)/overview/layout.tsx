import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview · WSO2 Transaction Ops",
};

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
