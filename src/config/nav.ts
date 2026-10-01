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
    description: "Health of every channel routed through the WSO2 API gateway",
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
    description: "Compare two channels, or one channel across two periods",
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
    description: "Manage who can access the workspace and what they can do",
    adminOnly: true,
  },
];
