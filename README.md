# dsh-statistics

A DeepSeek Harness bundle that reads every conversation log in the current
profile and reports what those conversations actually cost. It adds a
**Statistics** panel to the sidebar, beside Plugins and Schedules.

![The Statistics panel: token totals, estimated cost and budget, a daily usage
timeline, CPU activity, models, and the conversation table](docs/panel.jpg)

## What the panel shows

- **Total tokens** with the input / output / cache-read split, conversation
  count, turns, steps, and tool calls.
- **Estimated cost**, priced per conversation and per day from a configurable
  rate card, plus a **budget** card with the spend of the current period, a
  progress bar, and a projection to the end of the period.
- **Token usage timeline** — one stacked column per day, switchable between all
  tokens and input + output only, with a selectable day detail line.
- **Models** — token volume and cost per `provider/model`, flagging models that
  fell back to the catch-all rate.
- **Conversations** — a sortable table of every conversation with its tokens,
  estimated cost, and attributed CPU time, newest activity first by default.
- **CPU activity** — the host process utilization history (last few minutes),
  system utilization, load average, core count, and memory, next to live
  per-conversation CPU attribution.

Ranges: today, last 7, last 30, last 90 days, or everything (the default). The
header reports the data source and the number of logs scanned. A single day has
no temporal resolution to chart, so the timeline is left out of the today range.

## Where the numbers come from

Token usage is folded from committed `assistant/message` and
`compaction/summary` events of every stored conversation, read through
`sessionQuery` (live-preferred) or `sessionPersistence`. Nothing is sampled or
estimated on the token side: the counts are the provider's own usage records,
attributed to the model named on each message.

Cost is an estimate: tokens are multiplied by the rate card below. The budget
card compares that estimate with `budgetUsd` for the selected period.

A conversation's **last active** time is the last turn, step, message, tool
call, or compaction event — bookkeeping events (`session/end-seed`,
`permission/preset`, `sandbox/mode`, `workspace/changes`) are written whenever a
Session is opened again and must not move that date.

CPU is measured in this process: `process.cpuUsage()` deltas and `os.cpus()`
idle deltas sampled every `cpuIntervalMs`. Each interval's CPU time is split
across the conversations that were running or that produced an event within the
last 10 seconds; time with nothing active is reported as idle. Attribution starts
when the plugin loads, so the per-conversation CPU column shows `—` for
conversations it never saw running.

## Configuration

Set these on the `statistics` row of the bundle patch
(`~/.dsh/profiles/desktop/cordis.patch.yml`) to override the defaults.

| Key | Default | Meaning |
| --- | --- | --- |
| `rates` | see `cordis.patch.yml` | Rate rules matched against `provider/model` and `model`, `*` wildcards allowed. Values are USD per 1,000,000 tokens. |
| `fallbackRate` | `0.27 / 1.10 / 0.07` | Applied to models no rule matches. |
| `budgetUsd` | `20` | Budget for the current period. |
| `budgetPeriod` | `month` | `day`, `week`, `month`, or `all`. |
| `cpuIntervalMs` | `2000` | CPU sampling interval. |
| `cpuHistorySize` | `120` | Samples retained for the sparkline. |
| `refreshMs` | `4000` | Panel polling interval. |
| `statsTtlMs` | `15000` | Minimum age before the log scan is repeated. |
| `includeSubagents` | `true` | Count subagent conversations. |
| `maxSessions` | `500` | Upper bound on logs read per scan. |

## HTTP surface

One route, inside Connection's authentication fence:

```
GET /api/statistics/snapshot
```

It returns the whole panel payload — totals, budget, day series, models slot,
conversation rows with per-day buckets, and the CPU sample window — so the
browser never folds session events itself.

## Files

| File | Role |
| --- | --- |
| `index.js` | Host route, session source, scan cache, CPU sampler wiring. |
| `lib/fold.js` | Pure event folding, pricing, and aggregation. |
| `lib/cpu.js` | CPU sampler with injectable probes. |
| `client.js` | Sidebar icon and panel, plain JavaScript for the module loader. |
| `cordis.patch.yml` | Inserts the `statistics` row with the default config. |
| `locale/{en,zh}.json` | Display metadata read by Plugin Manager. |
