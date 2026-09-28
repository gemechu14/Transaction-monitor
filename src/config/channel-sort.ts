export type ChannelSortOption = "latency" | "volume" | "value" | "success" | "name";

export const SORT_ITEMS: Record<ChannelSortOption, string> = {
  latency: "Rank by latency",
  volume: "Rank by volume",
  value: "Rank by value",
  success: "Rank by success",
  name: "Alphabetical",
};
