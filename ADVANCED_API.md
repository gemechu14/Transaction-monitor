# WSO2 `allAdvanced` API

Per-source transaction totals for a date range, in a single call. The Overview page uses it for its live KPIs (total value, total volume, average transaction value) and its source dropdown.

For login, session, CORS and the rest of the TM backend, see [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md).

## WSO2 endpoint

```
GET {{baseUrl}}/wso2Dashboard/allAdvanced?startDate={{startDate}}&endDate={{endDate}}&source=all
```

| Param | Format |
|---|---|
| `startDate` | `YYYY-MM-DD`, inclusive |
| `endDate` | `YYYY-MM-DD`, inclusive, on or after `startDate` |
| `source` | always `all`. The response always lists every source. |

`{{baseUrl}}` is WSO2 Micro Integrator. **Never call it from the browser**, the same rule as the other dashboard endpoints. The TM backend makes the call server-side.

## How the frontend reaches it

```
Browser ──► /api/dashboard/all-advanced (TM backend, session cookie) ──► WSO2 /wso2Dashboard/allAdvanced
```

- The frontend calls `GET /api/dashboard/all-advanced?startDate=&endDate=&source=all` with `credentials: "include"`.
- In local dev, `next.config.ts` passes `/api/dashboard/*` through to `AUTH_BACKEND_URL`, so the browser only ever sees same-origin requests.
- The path is one constant, `ALL_ADVANCED_PATH` in `src/lib/api/dashboard.ts`. Change it there if the backend mounts the route somewhere else.
- The TM backend exposes this route (`src/app/api/dashboard/all-advanced/route.ts`) as of 2026-10-15. It requires a logged-in session, checks the dates (400 if missing, invalid or reversed), and returns WSO2's `data` map with counts as integers and amounts rounded to 2 decimals.

## Response

```json
{
  "success": true,
  "message": "Total transactions fetched successfully",
  "data": {
    "tas":                { "totalTransactions": 0.0,     "totalAmount": 0.0 },
    "ips_incoming":       { "totalTransactions": 39188.0, "totalAmount": 3.7877018583E8 },
    "ips_push":           { "totalTransactions": 1486.0,  "totalAmount": 4.116722225E7 },
    "coopapp":            { "totalTransactions": 15.0,    "totalAmount": 37241.0 },
    "jica":               { "totalTransactions": 28.0,    "totalAmount": 348484.53 },
    "eeu":                { "totalTransactions": 1251.0,  "totalAmount": 1.348717507E7 },
    "souflle":            { "totalTransactions": 9.0,     "totalAmount": 7658749.9 },
    "hajj":               { "totalTransactions": 0.0,     "totalAmount": 0.0 },
    "telebirrToBank":     { "totalTransactions": 25793.0, "totalAmount": 3.0065337381E8 },
    "bankToTelebirr":     { "totalTransactions": 3133.0,  "totalAmount": 2.4371591114E8 },
    "coopremitOtherBank": { "totalTransactions": 0.0,     "totalAmount": 0.0 },
    "terapayOtherBank":   { "totalTransactions": 200.0,   "totalAmount": 6591962.59 }
  }
}
```

- Amounts are in ETB. Numbers come back as floats, some in exponent form (`3.7877018583E8`). `JSON.parse` reads them as normal numbers.
- On failure the backend uses its standard envelope, `{ "success": false, "message": "...", "error": { "code": <status>, "details": "..." } }`. Show `error.details` to the user.

### Sources

| Key | Label in the UI |
|---|---|
| `tas` | TAS |
| `ips_incoming` | IPS Incoming |
| `ips_push` | IPS Push |
| `coopapp` | CoopApp |
| `jica` | JICA |
| `eeu` | EEU |
| `souflle` | Souflle |
| `hajj` | Hajj |
| `telebirrToBank` | Telebirr to Bank |
| `bankToTelebirr` | Bank to Telebirr |
| `coopremitOtherBank` | CoopRemit Other Bank |
| `terapayOtherBank` | Terapay Other Bank |

The last four exist only in `allAdvanced`, not in `/api/dashboard/total-transaction`. To add a source, add it to `src/config/wso2-sources.ts`. The type, the dropdown and the "All sources" sum all read from that file.

## How the Overview page uses it

- **One request per period.** The data is fetched once for the selected date range. Choosing a source in the dropdown picks that source from data already loaded (`pickSourceTotals` in `src/lib/overview.ts`), with no new request. "All sources" adds every source together on the client.
- **Polling.** It refreshes every 30 s (`DEFAULT_POLL_INTERVAL_MS`). Background refreshes keep the current numbers on screen.
- **Skeletons.** When the period changes, the three live KPI cards, Channel performance and Distribution by channel show a skeleton until the new data arrives, each the same height as its loaded state. The export button is disabled meanwhile.
- **Errors.** The three live cards show "—" with "Unavailable: <reason>".
- **Channel performance card.** Ranks all 12 sources by Value (default), Volume or Avg ticket, picked from a "Rank by" dropdown, using the same response. The source chosen in the page dropdown is highlighted. Its Success and Failure options and its CSV download are commented out in `channel-performance-card.tsx`, because this API has no success or failure figures.
- **Distribution by channel card (admins only).** A donut of each source's share of transaction count, from the same response. It names the top 5 sources and adds the rest into one "Others" row and slice, which shows how many sources it holds (hover for their names). Clicking a slice or row sets the page's source dropdown, which also updates the KPIs and Channel performance. Click it again to go back to "All sources".
- **Value by source card (admins only).** Replaces the Transaction status card, which is commented out because this API has no success, failed, reversed or pending figures. Shows the largest source's share of total amount, a bar split by amount across the top 3 sources plus Others, and a tile for each with its share and ETB amount.
- **Not from this API.** The Success rate, Failed / reversed and Average latency KPIs still come from sample data. Gateway latency, Top failing channels and Anomaly flags are commented out.

## How the Channels page uses it

- **Same request as the Overview.** It uses the same hook and cache. Opening Channels for a period the Overview already loaded shows those figures straight away, with no skeleton. They're re-fetched in the background if they're over 15 s old.
- **Source dropdown.** Defaults to "All sources", with the 12 WSO2 sources.
- **All sources view.** Shows the top 5 sources ranked by the "Rank by" dropdown: value (default for every role), transactions or avg ticket. "Rank by success rate" and "Rank by latency" are commented out in `LIVE_RANK_ITEMS` (`src/lib/channels.ts`) until the API returns those figures.
- **Single source view.** Shows Total value (with its share of all value), Transactions (with a per-day figure), Share of total and Avg ticket (against the all-sources average), plus rank chips by value, transactions and avg ticket. The Success rate and Avg latency cards are commented out.
- **Day-by-day table.** Still sample data, fixed on all platforms. A separate API for it is coming.

## How the Comparison page uses it

- **Channel vs channel.** Both sides come from one `allAdvanced` call for the selected period (the same cache as the Overview and Channels pages). The defaults are IPS Incoming vs Telebirr to Bank. Both lists hold the 12 WSO2 sources. "Share of the business" compares each side with the sum of all sources.
- **Period over period.** One call per period, so two calls, each with every source in it. The Channel field defaults to "All sources". Period choices are real calendar periods ending yesterday: the last 30 days, the last 8 full Mon – Sun weeks, or the last 6 full months. Today, this week and this month are left out because they're still partial. The defaults are the last two complete periods. The logic is `buildLivePeriodOptions` in `src/lib/comparison.ts`.
- **Errors.** A one-line notice above the cards gives the reason, and the cards show "No data".
- **Skeletons.** Every card keeps its real layout while loading, with shimmer lines in place of the figures. Head-to-head, Share of amount and Bottom line are exactly the same height loading and loaded. Key insights is close, since its text wraps differently depending on the numbers.

## Known gaps

- **Failures look like zero.** Unlike `total-transaction?source=all`, which marks each source `ok: false` and lists `failedSources`, this response has no per-source status. A `0` could mean no transactions or a failed WSO2 lookup. The backend can't tell either, because WSO2 itself sends `0`: for example, `tas` is always `0` here while `total-transaction?source=tas` fails. A per-source status has to come from the WSO2 team.
- **No per-day breakdown.** Only totals, so the daily chart can't use this API. The "Daily transactions" chart on the Overview page is **commented out** in `src/app/(dashboard)/overview/page.tsx` until the backend adds a per-day endpoint. Calling `allAdvanced` once per day was ruled out: up to 366 calls per period, repeated every 30 s. Proposed shape, one call per period:

  ```
  GET /api/dashboard/daily?startDate=2026-10-01&endDate=2026-10-12
  ```
  ```json
  {
    "success": true,
    "data": [
      {
        "date": "2026-10-01",
        "tas":          { "totalTransactions": 0,    "totalAmount": 0 },
        "ips_incoming": { "totalTransactions": 3120, "totalAmount": 30123456.7 }
      }
    ]
  }
  ```

  To bring the chart back, uncomment the `DailyTransactionsCard` import, the `chartSubtitle` lines and the JSX, and add `channelName` and `formatRangeLabel` back to the `@/lib/overview` import. Each spot is marked with a comment.

## Code map

| File | Role |
|---|---|
| `src/config/wso2-sources.ts` | Source keys and labels |
| `src/types/api.ts` | `AllAdvancedParams`, `AllAdvancedTotals`, `SourceTotals` |
| `src/lib/api/dashboard.ts` | `getAllAdvanced`, `ALL_ADVANCED_PATH` |
| `src/hooks/use-all-advanced.ts` | React Query hook with polling |
| `src/lib/overview.ts` | `pickSourceTotals`, `applyLiveTotals`, `LIVE_KPI_IDS` |
| `src/components/overview/overview-kpi-grid.tsx` | Per-card skeleton (`loadingIds`) |
| `src/components/overview/channel-performance-card.tsx` | Per-source ranking (`sourceRows` in `src/lib/overview.ts`) |
| `src/components/overview/distribution-card.tsx` | Per-source share donut (top 5 + Others) |
| `src/components/overview/value-mix-card.tsx` | Share of amount by source (top 3 + Others) |
| `src/components/channels/channel-cards.tsx` | Channels page cards (`computeSourceStats`, `sourceRanks` in `src/lib/channels.ts`) |
| `src/app/(dashboard)/comparison/page.tsx` | Comparison page (`buildLivePeriodOptions`, `liveFigures` in `src/lib/comparison.ts`) |
| `src/components/ui/shimmer-line.tsx` | Shared loading line and ring that match real text height |
| `src/app/(dashboard)/overview/page.tsx` | Wires it all together |
