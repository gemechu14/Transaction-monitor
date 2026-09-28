export type TransactionStatus = "success" | "failed" | "pending" | "reversed";

export interface StatusConfig {
  id: TransactionStatus;
  label: string;
  /** Tailwind classes pointing at the `status-*` theme tokens. */
  badgeClassName: string;
  dotClassName: string;
}

export const STATUS_CONFIG: Record<TransactionStatus, StatusConfig> = {
  success: {
    id: "success",
    label: "Success",
    badgeClassName: "bg-status-success/10 text-status-success",
    dotClassName: "bg-status-success",
  },
  failed: {
    id: "failed",
    label: "Failed",
    badgeClassName: "bg-status-failed/10 text-status-failed",
    dotClassName: "bg-status-failed",
  },
  pending: {
    id: "pending",
    label: "Pending",
    badgeClassName: "bg-status-pending/10 text-status-pending",
    dotClassName: "bg-status-pending",
  },
  reversed: {
    id: "reversed",
    label: "Reversed",
    badgeClassName: "bg-status-reversed/10 text-status-reversed",
    dotClassName: "bg-status-reversed",
  },
};

export const STATUS_LIST: StatusConfig[] = Object.values(STATUS_CONFIG);
