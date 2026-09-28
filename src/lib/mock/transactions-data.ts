import type { ChannelId } from "@/config/channels";
import type { TransactionStatus } from "@/config/status";
import { type DateRange } from "@/lib/date";
import { CHANNEL_PROFILES, resolveMockRange, type ChannelProfile } from "@/lib/mock/overview-data";
import { seededRandom } from "@/lib/mock/rng";
import type { PaginatedResponse, Transaction, TransactionListParams } from "@/types/api";

/** Deterministic pool of individual transaction records standing in for a real paginated API. */

const COUNTERPARTIES = [
  "Cooperative Bank of Oromia",
  "Commercial Bank of Ethiopia",
  "Zemen Bank",
  "Wegagen Bank",
  "Awash Bank",
  "Dashen Bank",
  "Bank of Abyssinia",
  "Nib International Bank",
  "Utility Biller — EEU",
  "Utility Biller — Ethio Telecom",
  "Merchant Aggregator 118",
  "Merchant Aggregator 204",
  "Retail POS Network",
  "Government Payments Portal",
];

const POOL_SIZE = 900;

function pickWeighted<T>(rand: () => number, items: { item: T; weight: number }[]): T {
  const total = items.reduce((acc, i) => acc + i.weight, 0);
  let roll = rand() * total;
  for (const { item, weight } of items) {
    roll -= weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1].item;
}

function generateTransactionPool(range: DateRange, channel?: ChannelId): Transaction[] {
  const profiles: ChannelProfile[] = channel
    ? CHANNEL_PROFILES.filter((p) => p.channel === channel)
    : CHANNEL_PROFILES;
  const channelWeights = profiles.map((profile) => ({ item: profile, weight: profile.shareWeight }));

  const fromMs = Date.parse(`${range.from}T00:00:00.000Z`);
  const toMs = Date.parse(`${range.to}T23:59:59.999Z`);
  const spanMs = Math.max(1, toMs - fromMs);

  const pool: Transaction[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const rand = seededRandom(range.from, range.to, channel ?? "all", i);
    const profile = pickWeighted(rand, channelWeights);

    const createdAt = new Date(fromMs + Math.floor(rand() * spanMs)).toISOString();
    const direction = rand() < profile.incomingRatio ? "in" : "out";

    const failRate = 1 - profile.baseSuccessRate;
    const pendingRate = 0.006;
    const reversedRate = 0.01;
    const statusRoll = rand();
    let status: TransactionStatus;
    if (statusRoll < failRate) status = "failed";
    else if (statusRoll < failRate + pendingRate) status = "pending";
    else if (statusRoll < failRate + pendingRate + reversedRate) status = "reversed";
    else status = "success";

    const amount = Math.round(profile.avgValue * (0.2 + rand() * 1.8) * 100) / 100;
    const latencyMs = Math.max(40, Math.round(profile.avgLatencyMs * (0.5 + rand())));
    const counterparty = COUNTERPARTIES[Math.floor(rand() * COUNTERPARTIES.length)];
    const suffix = Math.floor(rand() * 60466176)
      .toString(36)
      .toUpperCase()
      .padStart(5, "0");

    pool.push({
      id: `TXN-${suffix}`,
      reference: `REF-${(100000 + i).toString()}`,
      channel: profile.channel,
      direction,
      amount,
      currency: "ETB",
      status,
      counterparty,
      createdAt,
      latencyMs,
    });
  }

  return pool.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function queryMockTransactions(params: TransactionListParams): PaginatedResponse<Transaction> {
  const range = resolveMockRange(params);
  const pool = generateTransactionPool(range, params.channel);

  let filtered = pool;
  if (params.status) filtered = filtered.filter((t) => t.status === params.status);
  if (params.direction && params.direction !== "both") {
    filtered = filtered.filter((t) => t.direction === params.direction);
  }
  if (params.minAmount !== undefined) filtered = filtered.filter((t) => t.amount >= params.minAmount!);
  if (params.maxAmount !== undefined) filtered = filtered.filter((t) => t.amount <= params.maxAmount!);
  if (params.search) {
    const query = params.search.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(query) ||
          t.reference.toLowerCase().includes(query) ||
          t.counterparty.toLowerCase().includes(query),
      );
    }
  }

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 12;
  const total = filtered.length;
  const start = (page - 1) * pageSize;

  return {
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total,
  };
}
