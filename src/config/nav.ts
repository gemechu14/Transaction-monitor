import {
  GitCompareArrows,
  LayoutDashboard,
  Network,
  // Receipt, // unused while Transactions is commented out below
  // Scale, // unused while Reconciliation is commented out below
  // ShieldAlert, // unused while Anomalies is commented out below
  // FileBarChart, // unused while Reports is commented out below
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Hidden from the sidebar for non-admin users. */
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    href: "/overview",
    icon: LayoutDashboard,
    description: "Consolidated health of every channel routed throug the WSO2 API gateway",
  },
  {
    title: "Channels",
    href: "/channels",
    icon: Network,
    description: "Per-channel throughput, reliability and gateway response times",
  },
  {
    title: "Comparison",
    href: "/comparison",
    icon: GitCompareArrows,
    description: "Compare a platform's own periods, or pit two platforms head-to-head.",
  },
  // {
  //   title: "Transactions",
  //   href: "/transactions",
  //   icon: Receipt,
  //   description: "Searchable, paginated log of individual transactions.",
  // },
  // {
  //   title: "Reconciliation",
  //   href: "/reconciliation",
  //   icon: Scale,
  //   description: "Inflow against outflow per channel, with exception and reversal exposure",
  // },
  // {
  //   title: "Anomalies",
  //   href: "/anomalies",
  //   icon: ShieldAlert,
  //   description: "Detected outliers and suspicious activity across channels.",
  // },
  // {
  //   title: "Reports",
  //   href: "/reports",
  //   icon: FileBarChart,
  //   description: "Scheduled and on-demand exports for stakeholders.",
  // },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Alert thresholds, notification channels and workspace preferences.",
    adminOnly: true,
  },
];
