import { ShieldAlert } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AnomaliesPage() {
  return (
    <PlaceholderPage
      icon={ShieldAlert}
      title="Anomalies"
      description="Detected outliers and suspicious activity across channels."
    />
  );
}
