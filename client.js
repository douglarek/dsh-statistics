window.__ModuleLoader__.load({
  id: '@douglarek/dsh-statistics',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState, useSyncExternalStore } = React

    const SNAPSHOT_URL = '/api/statistics/snapshot'
    const NS = 'dsh-statistics'
    const PANEL_ID = 'statistics'
    const BUCKETS = ['input', 'output', 'cacheRead', 'cacheWrite']
    const EMPTY_SNAPSHOT = Object.freeze({ active: 'en', locales: Object.freeze([]), revision: 0 })

    const EN = {
      'panel.title': 'Statistics',
      'panel.refresh': 'Refresh',
      'panel.autoRefresh': 'Auto refresh',
      'panel.updated': 'Updated {time}',
      'panel.empty': 'No conversation logs with token usage were found yet.',
      'panel.loading': 'Reading conversation logs…',
      'panel.failed': 'Could not read the statistics: {message}',
      'panel.retry': 'Retry',
      'panel.range': 'Range',
      'panel.rangeAll': 'All',
      'panel.rangeDays': 'Last {days} days',
      'panel.source': 'Source: {source} · {sessions} logs scanned',
      'panel.rangeLabel': 'Range',
      'range.d1': 'Today',
      'range.d7': '7d',
      'range.d30': '30d',
      'range.d90': '90d',
      'range.all': 'All',
      'kpi.tokens': 'Total tokens',
      'kpi.tokensHint': '{input} input · {output} output · {cache} cache read',
      'kpi.conversations': 'Conversations',
      'kpi.conversationsHint': '{turns} turns · {steps} steps · {tools} tool calls',
      'kpi.cost': 'Estimated cost',
      'kpi.costHint': '{priced} of {total} conversations matched a rate',
      'kpi.budget': 'Budget',
      'kpi.budgetHint': '{spent} of {budget} used this {period}',
      'kpi.budgetProjection': 'Projected {amount} by {label}',
      'kpi.budgetOver': 'Over budget by {amount}',
      'kpi.budgetIdle': 'No spend recorded in this {period}',
      'kpi.periodMonth': 'month',
      'kpi.periodWeek': 'week',
      'kpi.periodDay': 'day',
      'kpi.periodAll': 'period',
      'timeline.title': 'Token usage timeline',
      'timeline.empty': 'No usage in this range.',
      'timeline.legendInput': 'Input',
      'timeline.legendOutput': 'Output',
      'timeline.legendCache': 'Cache read',
      'timeline.modeTotal': 'All',
      'timeline.modeBillable': 'Input + output',
      'timeline.daySummary': '{tokens} tokens · {cost} · {sessions} conversations · {turns} turns',
      'timeline.tipTotal': 'Total',
      'timeline.peak': 'Peak {date} · {tokens}',
      'timeline.sessions': '{count} conversations',
      'cpu.title': 'CPU activity',
      'cpu.process': 'Harness process',
      'cpu.system': 'System',
      'cpu.load': 'Load 1m',
      'cpu.cores': '{count} cores',
      'cpu.memory': 'Memory',
      'cpu.uptime': 'Sampling for {duration}',
      'cpu.average': 'Average {value}',
      'cpu.peak': 'Peak {value}',
      'cpu.active': '{count} running now',
      'cpu.idle': 'No conversation running',
      'cpu.ofCore': 'of one core',
      'cpu.noSample': '—',
      'models.title': 'Models',
      'models.empty': 'No model usage recorded.',
      'models.fallback': 'fallback rate',
      'table.title': 'Conversations',
      'table.empty': 'No conversations in this range.',
      'table.conversation': 'Conversation',
      'table.lastActive': 'Last active',
      'table.tokens': 'Tokens',
      'table.cost': 'Cost',
      'table.cpu': 'CPU',
      'table.share': 'Share',
      'table.untitled': 'Untitled conversation',
      'table.subagent': 'Subagent',
      'table.unpriced': 'Fallback rate',
    }

    const ZH = {
      'panel.title': '统计',
      'panel.refresh': '刷新',
      'panel.autoRefresh': '自动刷新',
      'panel.updated': '更新于 {time}',
      'panel.empty': '尚未找到带 token 用量的对话日志。',
      'panel.loading': '正在读取对话日志…',
      'panel.failed': '无法读取统计数据：{message}',
      'panel.retry': '重试',
      'panel.range': '范围',
      'panel.rangeAll': '全部',
      'panel.rangeDays': '近 {days} 天',
      'panel.source': '数据源：{source} · 已扫描 {sessions} 份日志',
      'panel.rangeLabel': '范围',
      'range.d1': '今天',
      'range.d7': '7 天',
      'range.d30': '30 天',
      'range.d90': '90 天',
      'range.all': '全部',
      'kpi.tokens': 'Token 总量',
      'kpi.tokensHint': '输入 {input} · 输出 {output} · 缓存读取 {cache}',
      'kpi.conversations': '对话数',
      'kpi.conversationsHint': '{turns} 轮 · {steps} 步 · {tools} 次工具调用',
      'kpi.cost': '预估费用',
      'kpi.costHint': '{total} 个对话中有 {priced} 个匹配到费率',
      'kpi.budget': '预算',
      'kpi.budgetHint': '本{period}已用 {spent} / {budget}',
      'kpi.budgetProjection': '预计 {label} 累计 {amount}',
      'kpi.budgetOver': '超出预算 {amount}',
      'kpi.budgetIdle': '本{period}暂无花费',
      'kpi.periodMonth': '月',
      'kpi.periodWeek': '周',
      'kpi.periodDay': '日',
      'kpi.periodAll': '周期',
      'timeline.title': 'Token 用量时间线',
      'timeline.empty': '该范围内没有用量。',
      'timeline.legendInput': '输入',
      'timeline.legendOutput': '输出',
      'timeline.legendCache': '缓存读取',
      'timeline.modeTotal': '全部',
      'timeline.modeBillable': '输入 + 输出',
      'timeline.daySummary': '{tokens} tokens · {cost} · {sessions} 个对话 · {turns} 轮',
      'timeline.tipTotal': '合计',
      'timeline.peak': '峰值 {date} · {tokens}',
      'timeline.sessions': '{count} 个对话',
      'cpu.title': 'CPU 活动',
      'cpu.process': 'Harness 进程',
      'cpu.system': '系统',
      'cpu.load': '1 分钟负载',
      'cpu.cores': '{count} 核',
      'cpu.memory': '内存',
      'cpu.uptime': '已采样 {duration}',
      'cpu.average': '平均 {value}',
      'cpu.peak': '峰值 {value}',
      'cpu.active': '当前 {count} 个对话在运行',
      'cpu.idle': '当前没有对话在运行',
      'cpu.ofCore': '单核占用',
      'cpu.noSample': '—',
      'models.title': '模型',
      'models.empty': '没有记录到模型用量。',
      'models.fallback': '回退费率',
      'table.title': '对话',
      'table.empty': '该范围内没有对话。',
      'table.conversation': '对话',
      'table.lastActive': '最近活动',
      'table.tokens': 'Token',
      'table.cost': '费用',
      'table.cpu': 'CPU',
      'table.share': '占比',
      'table.untitled': '未命名对话',
      'table.subagent': '子代理',
      'table.unpriced': '回退费率',
    }

    const CSS = `
.dshstat-root{box-sizing:border-box;height:100%;min-height:0;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.45;--dshstat-blue:var(--dsw-static-blue-500,#3b82f6);--dshstat-indigo:var(--dsw-static-deepseek-500,#4176e6);--dshstat-green:var(--dsw-static-green-500,#22c55e);--dshstat-amber:var(--dsw-static-amber-500,#f59e0b);--dshstat-red:var(--dsw-static-red-500,#ef4444);--dshstat-cache:color-mix(in srgb,var(--dsw-static-blue-500,#3b82f6) 45%,transparent);--dshstat-track:color-mix(in srgb,var(--dsw-alias-label-secondary) 16%,transparent)}
.dshstat-inner{max-width:1160px;margin:0 auto;padding:28px clamp(24px,4vw,48px) 48px;display:flex;flex-direction:column;gap:18px}
.dshstat-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dshstat-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.dshstat-meta{margin-top:6px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.dshstat-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.dshstat-btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;transition:border-color .12s ease,background .12s ease}
.dshstat-btn:hover{border-color:var(--dsw-alias-border-l2)}
.dshstat-btn[data-on="true"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dshstat-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.dshstat-seg button{height:28px;padding:0 10px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dshstat-seg button+button{border-left:1px solid var(--dsw-alias-border-l1)}
.dshstat-seg button[data-on="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.dshstat-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px;min-width:0}
.dshstat-kpi-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dshstat-chip{display:inline-flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:7px;flex:none}
.dshstat-label{font-size:11.5px;color:var(--dsw-alias-label-secondary);letter-spacing:.02em}
.dshstat-value{margin-top:6px;font-size:25px;font-weight:600;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshstat-hint{margin-top:5px;font-size:11.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dshstat-bar{height:6px;border-radius:99px;background:var(--dshstat-track);overflow:hidden;margin-top:10px}
.dshstat-bar span{display:block;height:100%;border-radius:99px;background:var(--dshstat-blue);transition:width .25s ease,background .2s ease}
.dshstat-bar span[data-state="ok"]{background:var(--dshstat-green)}
.dshstat-bar span[data-state="warn"]{background:var(--dshstat-amber)}
.dshstat-bar span[data-state="over"]{background:var(--dshstat-red)}

.dshstat-section{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.dshstat-h2{margin:0;font-size:13.5px;font-weight:600}
.dshstat-legend{display:flex;align-items:center;gap:12px;color:var(--dsw-alias-label-secondary);font-size:11.5px;flex-wrap:wrap}
.dshstat-dot{width:8px;height:8px;border-radius:2px;display:inline-block;margin-right:5px;vertical-align:middle}
.dshstat-plot{display:flex;align-items:stretch;gap:10px;height:168px}
.dshstat-scale{flex:none;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;min-width:38px;color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:1;font-variant-numeric:tabular-nums}
.dshstat-chart{flex:1 1 0;min-width:0;display:flex;align-items:stretch;gap:2px;position:relative;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshstat-gridline{position:absolute;left:0;right:0;top:50%;border-top:1px dashed var(--dsw-alias-border-l1);pointer-events:none}
.dshstat-col{flex:1 1 0;min-width:2px;display:flex;flex-direction:column;justify-content:flex-end;cursor:pointer;position:relative}
.dshstat-col[data-on="true"]::after{content:'';position:absolute;left:50%;transform:translateX(-50%);width:min(40px,100%);bottom:-5px;height:2px;border-radius:1px;background:var(--dsw-alias-brand-primary)}
.dshstat-stack{position:relative;display:flex;flex-direction:column;justify-content:flex-end;height:100%;width:100%;max-width:40px;margin:0 auto;border-radius:4px 4px 0 0;overflow:hidden}
.dshstat-stack::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;transition:background .12s ease}
.dshstat-col[data-hover="true"] .dshstat-stack::after,.dshstat-col[data-on="true"] .dshstat-stack::after{background:var(--dsw-alias-interactive-bg-hover)}
.dshstat-axis{display:flex;justify-content:space-between;color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:14px;font-variant-numeric:tabular-nums}
.dshstat-tip{position:absolute;z-index:3;min-width:152px;padding:8px 10px;border-radius:9px;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);box-shadow:0 8px 24px #0000001f,0 1px 2px #00000014;pointer-events:none;font-size:11.5px;line-height:1.65;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dshstat-tip-head{margin-bottom:3px;font-weight:600}
.dshstat-tip-row{display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--dsw-alias-label-secondary)}
.dshstat-tip-row b{color:var(--dsw-alias-label-primary);font-weight:500}
.dshstat-tip-total{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:5px;padding-top:5px;border-top:1px solid var(--dsw-alias-border-l1)}
.dshstat-detail{margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1);display:flex;gap:18px;flex-wrap:wrap;font-size:12px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.dshstat-detail b{color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-split{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:12px}
.dshstat-cpu-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dshstat-spark{display:block;width:100%;height:74px;margin-top:10px}
.dshstat-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 14px;margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1)}
.dshstat-stat b{display:block;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.dshstat-stat span{font-size:11px;color:var(--dsw-alias-label-secondary)}
.dshstat-models{display:flex;flex-direction:column;gap:10px}
.dshstat-model{display:flex;flex-direction:column;gap:5px}
.dshstat-model-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:12px}
.dshstat-model-id{font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshstat-model-num{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dshstat-table{display:flex;flex-direction:column}
.dshstat-thead,.dshstat-tr{display:grid;grid-template-columns:minmax(0,1fr) 96px 96px 88px 64px;gap:16px;align-items:center;padding:9px 12px;border-radius:8px}
.dshstat-thead{color:var(--dsw-alias-label-secondary);font-size:11.5px;border-bottom:1px solid var(--dsw-alias-border-l1);border-radius:0}
.dshstat-th{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left;display:inline-flex;align-items:center;gap:4px}
.dshstat-th[data-num="true"]{flex-direction:row-reverse;justify-content:flex-start;width:100%;text-align:right}
.dshstat-th[data-on="true"]{color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-tr:hover{background:var(--dsw-alias-bg-layer-2)}
.dshstat-tr+.dshstat-tr{border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 55%,transparent)}
.dshstat-name{min-width:0}
.dshstat-name-line{display:flex;align-items:center;gap:6px;min-width:0}
.dshstat-name-line b{min-width:0;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshstat-name-sub{display:block;font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.dshstat-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.dshstat-tok{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.dshstat-tokbar{width:100%;height:4px;border-radius:99px;background:var(--dshstat-track);overflow:hidden}
.dshstat-tokbar span{display:block;height:100%;background:linear-gradient(90deg,var(--dshstat-blue),var(--dshstat-indigo));border-radius:99px}
.dshstat-tag{display:inline-flex;align-items:center;flex:none;height:16px;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1}
.dshstat-notice{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;color:var(--dsw-alias-label-secondary);font-size:12px;background:var(--dsw-alias-bg-layer-1)}
.dshstat-state{padding:48px 8px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px}
.dshstat-spin{display:inline-block;width:12px;height:12px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dshstat-spin .8s linear infinite;vertical-align:-2px;margin-right:7px}
@keyframes dshstat-spin{to{transform:rotate(360deg)}}
@media (max-width:1040px){.dshstat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dshstat-split{grid-template-columns:minmax(0,1fr)}.dshstat-inner{padding:20px 18px 48px}.dshstat-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:720px){.dshstat-thead,.dshstat-tr{grid-template-columns:minmax(0,1fr) 84px 96px 78px;gap:12px}.dshstat-cpu-col{display:none}}
`

    function emptyBuckets() {
      return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
    }

    function addInto(target, source) {
      for (const bucket of BUCKETS) target[bucket] += source?.[bucket] ?? 0
    }

    function sumBuckets(tokens) {
      return BUCKETS.reduce((sum, bucket) => sum + (tokens?.[bucket] ?? 0), 0)
    }

    function dayKeyOf(time) {
      const date = new Date(time)
      return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
    }

    function dayTime(day) {
      return new Date(`${day}T00:00:00`).getTime()
    }

    function todayStart(now) {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    }

    function cutoffOf(rangeDays) {
      if (!rangeDays) return null
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (rangeDays - 1))
      return date.getTime()
    }

    function trimNumber(value) {
      const fixed = value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2)
      return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
    }

    function createFormat(localeId) {
      const number = new Intl.NumberFormat(localeId)
      const int = (value) => (Number.isFinite(value) ? number.format(Math.round(value)) : '—')
      const compact = (value) => {
        if (!Number.isFinite(value)) return '—'
        const abs = Math.abs(value)
        if (abs >= 1e12) return `${trimNumber(value / 1e12)}T`
        if (abs >= 1e9) return `${trimNumber(value / 1e9)}B`
        if (abs >= 1e6) return `${trimNumber(value / 1e6)}M`
        if (abs >= 1e4) return `${trimNumber(value / 1e3)}K`
        return int(value)
      }
      const usd = (value) => {
        if (!Number.isFinite(value)) return '—'
        const abs = Math.abs(value)
        if (abs === 0) return '$0.00'
        if (abs < 0.005) return '<$0.01'
        if (abs < 1) return `$${value.toFixed(3)}`
        if (abs < 100) return `$${value.toFixed(2)}`
        return `$${int(value)}`
      }
      const pct = (value) => (Number.isFinite(value) ? `${value < 10 ? value.toFixed(1) : Math.round(value)}%` : '—')
      const duration = (ms) => {
        if (!Number.isFinite(ms) || ms <= 0) return '0s'
        const seconds = Math.round(ms / 1000)
        if (seconds < 60) return `${seconds}s`
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return seconds % 60 ? `${minutes}m ${seconds % 60}s` : `${minutes}m`
        const hours = Math.floor(minutes / 60)
        return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`
      }
      const time = (value) =>
        Number.isFinite(value)
          ? new Date(value).toLocaleTimeString(localeId, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '—'
      const date = (value) =>
        Number.isFinite(value) ? new Date(value).toLocaleDateString(localeId, { month: 'short', day: 'numeric' }) : '—'
      const dayLabel = (day) =>
        new Date(dayTime(day)).toLocaleDateString(localeId, { month: 'numeric', day: 'numeric' })
      const dayLong = (day) =>
        new Date(dayTime(day)).toLocaleDateString(localeId, { month: 'short', day: 'numeric', year: 'numeric' })
      return { int, compact, usd, pct, duration, time, date, dayLabel, dayLong }
    }

    function makeTranslate(locale, dicts) {
      const bound = locale && typeof locale.bind === 'function' ? locale.bind(NS) : null
      if (bound) {
        return (key, params) => {
          const text = bound(key, params)
          return text === key ? fill(key, params, dicts) : text
        }
      }
      return (key, params) => fill(key, params, dicts)
    }

    function fill(key, params, dicts) {
      const template = dicts.en[key] ?? key
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
    }

    function useLocaleFace(locale, fallbackLocale) {
      const subscribe = useCallback((onChange) => (locale ? locale.subscribe(onChange) : () => {}), [locale])
      const getSnapshot = useCallback(() => (locale ? locale.getSnapshot() : EMPTY_SNAPSHOT), [locale])
      const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
      const active = snapshot?.active ?? fallbackLocale ?? 'en'
      const t = useMemo(() => makeTranslate(locale, { en: EN }), [locale, active])
      const fmt = useMemo(() => createFormat(active.startsWith('zh') ? 'zh-CN' : active), [active])
      return { t, fmt, active }
    }

    function useSnapshotData() {
      const [refreshMs, setRefreshMs] = useState(4000)
      const [state, setState] = useState({ status: 'loading', data: null, error: null })
      const [nonce, setNonce] = useState(0)
      const [auto, setAuto] = useState(true)

      useEffect(() => {
        let alive = true
        let timer = null
        let controller = null

        const schedule = () => {
          if (!alive || !auto) return
          timer = setTimeout(() => {
            if (typeof document !== 'undefined' && document.hidden) {
              schedule()
              return
            }
            void load()
          }, refreshMs)
        }

        const load = async () => {
          controller = new AbortController()
          try {
            const response = await fetch(SNAPSHOT_URL, { cache: 'no-store', signal: controller.signal })
            const body = await response.json().catch(() => null)
            if (!alive) return
            if (!response.ok || body?.error) {
              throw new Error(body?.error ?? `HTTP ${response.status}`)
            }
            if (typeof body?.config?.refreshMs === 'number') setRefreshMs(body.config.refreshMs)
            setState({ status: 'ready', data: body, error: null })
          } catch (error) {
            if (!alive || error?.name === 'AbortError') return
            setState((previous) => ({
              status: previous.data ? 'ready' : 'failed',
              data: previous.data,
              error: error instanceof Error ? error.message : String(error),
            }))
          } finally {
            schedule()
          }
        }

        void load()
        return () => {
          alive = false
          if (timer) clearTimeout(timer)
          controller?.abort()
        }
      }, [refreshMs, auto, nonce])

      const refresh = useCallback(() => setNonce((value) => value + 1), [])
      return { ...state, refresh, auto, setAuto }
    }

    function aggregate(data, rangeDays) {
      const cutoff = cutoffOf(rangeDays)
      const totals = emptyBuckets()
      const models = new Map()
      const rows = []
      let cost = 0
      let turns = 0
      let steps = 0
      let toolCalls = 0

      for (const row of data.rows ?? []) {
        const rowTokens = emptyBuckets()
        let rowCost = 0
        let rowTurns = 0
        let rowSteps = 0
        let rowTools = 0
        let inRange = false
        for (const day of row.days ?? []) {
          if (cutoff !== null && dayTime(day.day) < cutoff) continue
          inRange = true
          addInto(rowTokens, day.tokens)
          rowCost += day.cost ?? 0
          rowTurns += day.turns ?? 0
          rowSteps += day.steps ?? 0
          rowTools += day.toolCalls ?? 0
          for (const model of day.models ?? []) {
            let bucket = models.get(model.id)
            if (!bucket) {
              bucket = { id: model.id, tokens: emptyBuckets(), cost: 0, explicit: model.explicit !== false }
              models.set(model.id, bucket)
            }
            addInto(bucket.tokens, model.tokens)
            bucket.cost += model.cost ?? 0
            bucket.explicit = bucket.explicit && model.explicit !== false
          }
        }
        if (!inRange) continue
        addInto(totals, rowTokens)
        cost += rowCost
        turns += rowTurns
        steps += rowSteps
        toolCalls += rowTools
        rows.push({
          ...row,
          tokens: rowTokens,
          totalTokens: sumBuckets(rowTokens),
          cost: rowCost,
          turns: rowTurns,
          steps: rowSteps,
          toolCalls: rowTools,
        })
      }

      rows.sort((left, right) => right.totalTokens - left.totalTokens)
      return {
        totals: { ...totals, tokens: sumBuckets(totals), cost, turns, steps, toolCalls },
        rows,
        models: [...models.values()].sort((left, right) => right.cost - left.cost),
        conversations: rows.filter((row) => row.totalTokens > 0).length,
      }
    }

    function buildSeries(days, rangeDays, now) {
      const cutoff = cutoffOf(rangeDays)
      const byDay = new Map((days ?? []).map((entry) => [entry.day, entry]))
      const end = todayStart(now)
      let start = null
      if (cutoff !== null) start = cutoff
      else if (days && days.length > 0) start = Math.min(dayTime(days[0].day), end)
      if (start === null) return []
      const span = Math.round((end - start) / 86_400_000) + 1
      if (span > 400) start = end - 399 * 86_400_000
      const series = []
      for (let time = start; time <= end; time += 86_400_000) {
        const key = dayKeyOf(time)
        series.push(byDay.get(key) ?? { day: key, tokens: emptyBuckets(), cost: 0, sessions: 0, turns: 0 })
      }
      return series
    }

    function StyleTag() {
      return h('style', { 'data-dsh-statistics': '' }, CSS)
    }

    function Glyph({ kind }) {
      const stroke = { stroke: 'currentColor', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
      const shapes = {
        tokens: [
          h('rect', { key: 'a', x: 3, y: 8.5, width: 3, height: 7, rx: 1, fill: 'currentColor', opacity: 0.55 }),
          h('rect', { key: 'b', x: 8, y: 5.5, width: 3, height: 10, rx: 1, fill: 'currentColor', opacity: 0.78 }),
          h('rect', { key: 'c', x: 13, y: 2.8, width: 3, height: 12.7, rx: 1, fill: 'currentColor' }),
        ],
        conversations: [
          h('path', {
            key: 'a',
            d: 'M3.4 7.2a3.2 3.2 0 0 1 3.2-3.2h7.8a3.2 3.2 0 0 1 3.2 3.2v4.6a3.2 3.2 0 0 1-3.2 3.2H9.2l-2.6 2.6v-2.6a3.2 3.2 0 0 1-3.2-3.2z',
            ...stroke,
          }),
        ],
        cost: [
          h('path', { key: 'a', d: 'M3 15.4 8 10l3.4 2.9L18.6 5.4', ...stroke }),
          h('path', { key: 'b', d: 'M14.4 5.4h4.2v4.2', ...stroke }),
        ],
        budget: [
          h('circle', { key: 'a', cx: 10.5, cy: 10.5, r: 7, ...stroke, opacity: 0.45 }),
          h('path', { key: 'b', d: 'M10.5 10.5 15 6.6', ...stroke }),
          h('circle', { key: 'c', cx: 10.5, cy: 10.5, r: 1.5, fill: 'currentColor' }),
        ],
      }
      return h('svg', { width: 14, height: 14, viewBox: '0 0 21 21', 'aria-hidden': true, style: { display: 'block' } }, shapes[kind] ?? shapes.tokens)
    }

    function Kpi({ label, value, hint, accent, glyph, children }) {
      return h(
        'div',
        { className: 'dshstat-card' },
        h(
          'div',
          { className: 'dshstat-kpi-head' },
          h('div', { className: 'dshstat-label' }, label),
          h(
            'span',
            {
              className: 'dshstat-chip',
              style: { color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` },
            },
            h(Glyph, { kind: glyph }),
          ),
        ),
        h('div', { className: 'dshstat-value' }, value),
        hint ? h('div', { className: 'dshstat-hint' }, hint) : null,
        children,
      )
    }

    function BudgetCard({ budget, t, fmt }) {
      const ratio = budget.usd > 0 ? budget.spent / budget.usd : 0
      const state = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok'
      const accent = state === 'over' ? 'var(--dshstat-red)' : state === 'warn' ? 'var(--dshstat-amber)' : 'var(--dshstat-green)'
      const periodLabel = t(`kpi.period${budget.period.charAt(0).toUpperCase()}${budget.period.slice(1)}`)
      const hint = t('kpi.budgetHint', {
        spent: fmt.usd(budget.spent),
        budget: fmt.usd(budget.usd),
        period: periodLabel,
      })
      const projection =
        budget.period === 'all' || !budget.end
          ? null
          : t('kpi.budgetProjection', { amount: fmt.usd(budget.projected), label: fmt.date(budget.end - 1) })
      return h(
        'div',
        { className: 'dshstat-card' },
        h(
          'div',
          { className: 'dshstat-kpi-head' },
          h('div', { className: 'dshstat-label' }, t('kpi.budget')),
          h(
            'span',
            { className: 'dshstat-chip', style: { color: accent, background: 'color-mix(in srgb, ' + accent + ' 14%, transparent)' } },
            h(Glyph, { kind: 'budget' }),
          ),
        ),
        h('div', { className: 'dshstat-value' }, fmt.pct(ratio * 100)),
        h('div', { className: 'dshstat-hint' }, hint),
        h(
          'div',
          { className: 'dshstat-bar' },
          h('span', { 'data-state': state, style: { width: `${Math.min(100, Math.max(1.5, ratio * 100))}%` } }),
        ),
        projection
          ? h(
              'div',
              { className: 'dshstat-hint', style: { marginTop: '6px' } },
              budget.spent > budget.usd
                ? t('kpi.budgetOver', { amount: fmt.usd(budget.spent - budget.usd) })
                : projection,
            )
          : null,
      )
    }

    function Timeline({ series, mode, setMode, t, fmt }) {
      const [selected, setSelected] = useState(null)
      const [hover, setHover] = useState(null)

      const peakOf = (entry) =>
        mode === 'billable' ? (entry.tokens?.input ?? 0) + (entry.tokens?.output ?? 0) : sumBuckets(entry.tokens)
      const max = series.reduce((value, entry) => Math.max(value, peakOf(entry)), 0)
      const activeIndex = selected !== null && series[selected] ? selected : series.length - 1
      const active = series[activeIndex]
      const peak = series.reduce((best, entry) => (peakOf(entry) > peakOf(best) ? entry : best), series[0] ?? null)

      const tip = hover !== null && series[hover] ? series[hover] : null
      const tipRatio = tip ? Math.min(peakOf(tip) / (max || 1), 1) : 0
      const tipAbove = tipRatio <= 0.35
      const tipRow = (label, value, color) =>
        h(
          'div',
          { className: 'dshstat-tip-row' },
          h('span', null, h('i', { className: 'dshstat-dot', style: { background: color } }), label),
          h('b', null, fmt.compact(value)),
        )

      const segments = (entry) => {
        const tokens = entry.tokens ?? emptyBuckets()
        const cache = mode === 'billable' ? 0 : tokens.cacheRead
        const output = tokens.output
        const input = tokens.input
        const scale = max > 0 ? 100 / max : 0
        return [
          { key: 'cacheRead', value: cache * scale, color: 'var(--dshstat-cache)' },
          { key: 'output', value: Math.max(output * scale, output > 0 ? 1.6 : 0), color: 'var(--dshstat-green)' },
          { key: 'input', value: Math.max(input * scale, input > 0 ? 1.6 : 0), color: 'var(--dshstat-blue)' },
        ].filter((segment) => segment.value > 0)
      }

      return h(
        'div',
        { className: 'dshstat-card' },
        h(
          'div',
          { className: 'dshstat-section' },
          h('h2', { className: 'dshstat-h2' }, t('timeline.title')),
          h(
            'div',
            { className: 'dshstat-legend' },
            h(
              'div',
              { className: 'dshstat-seg', role: 'group' },
              h(
                'button',
                { 'data-on': mode === 'total', onClick: () => setMode('total') },
                t('timeline.modeTotal'),
              ),
              h(
                'button',
                { 'data-on': mode === 'billable', onClick: () => setMode('billable') },
                t('timeline.modeBillable'),
              ),
            ),
            h(
              'span',
              null,
              h('i', { className: 'dshstat-dot', style: { background: 'var(--dshstat-blue)' } }),
              t('timeline.legendInput'),
            ),
            h(
              'span',
              null,
              h('i', { className: 'dshstat-dot', style: { background: 'var(--dshstat-green)' } }),
              t('timeline.legendOutput'),
            ),
            mode === 'billable'
              ? null
              : h(
                  'span',
                  null,
                  h('i', { className: 'dshstat-dot', style: { background: 'var(--dshstat-cache)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--dshstat-blue) 45%, transparent)' } }),
                  t('timeline.legendCache'),
                ),
          ),
        ),
        series.length === 0
          ? h('div', { className: 'dshstat-state' }, t('timeline.empty'))
          : h(
              'div',
              null,
              h(
                'div',
                { className: 'dshstat-plot' },
                max > 0
                  ? h(
                      'div',
                      { className: 'dshstat-scale', 'aria-hidden': 'true' },
                      h('span', null, fmt.compact(max)),
                      h('span', null, fmt.compact(max / 2)),
                      h('span', null, '0'),
                    )
                  : null,
                h(
                  'div',
                  { className: 'dshstat-chart' },
                  h('div', { key: 'grid', className: 'dshstat-gridline' }),
                  series.map((entry, index) =>
                    h(
                      'div',
                      {
                        key: entry.day,
                        className: 'dshstat-col',
                        'data-on': index === activeIndex,
                        'data-hover': index === hover,
                        'aria-label': t('timeline.daySummary', {
                          tokens: fmt.int(sumBuckets(entry.tokens)),
                          cost: fmt.usd(entry.cost),
                          sessions: entry.sessions ?? 0,
                          turns: entry.turns ?? 0,
                        }),
                        onMouseEnter: () => setHover(index),
                        onMouseLeave: () => setHover(null),
                        onClick: () => setSelected(index),
                      },
                      h(
                        'div',
                        { className: 'dshstat-stack' },
                        segments(entry).map((segment) =>
                          h('div', { key: segment.key, style: { height: `${segment.value}%`, background: segment.color } }),
                        ),
                      ),
                    ),
                  ),
                  tip
                    ? h(
                        'div',
                        {
                          className: 'dshstat-tip',
                          style: {
                            left: `clamp(88px, ${((hover + 0.5) / series.length) * 100}%, calc(100% - 88px))`,
                            top: `${(1 - tipRatio) * 100}%`,
                            transform: `translate(-50%, ${tipAbove ? 'calc(-100% - 10px)' : '10px'})`,
                          },
                        },
                        h('div', { className: 'dshstat-tip-head' }, fmt.dayLong(tip.day)),
                        tipRow(t('timeline.legendInput'), tip.tokens?.input ?? 0, 'var(--dshstat-blue)'),
                        tipRow(t('timeline.legendOutput'), tip.tokens?.output ?? 0, 'var(--dshstat-green)'),
                        tipRow(t('timeline.legendCache'), tip.tokens?.cacheRead ?? 0, 'var(--dshstat-cache)'),
                        h(
                          'div',
                          { className: 'dshstat-tip-total' },
                          h('span', null, t('timeline.tipTotal'), ' ', h('b', null, fmt.compact(sumBuckets(tip.tokens)))),
                          h('b', null, fmt.usd(tip.cost)),
                        ),
                      )
                    : null,
                ),
              ),
              h(
                'div',
                { className: 'dshstat-axis' },
                h('span', null, fmt.dayLabel(series[0].day)),
                peak ? h('span', null, t('timeline.peak', { date: fmt.dayLabel(peak.day), tokens: fmt.compact(peakOf(peak)) })) : h('span'),
                h('span', null, fmt.dayLabel(series[series.length - 1].day)),
              ),
              active
                ? h(
                    'div',
                    { className: 'dshstat-detail' },
                    h('span', null, h('b', null, fmt.dayLong(active.day))),
                    h('span', null, fmt.int(sumBuckets(active.tokens)), ' tokens'),
                    h('span', null, t('timeline.legendInput'), ' ', h('b', null, fmt.compact(active.tokens?.input ?? 0))),
                    h('span', null, t('timeline.legendOutput'), ' ', h('b', null, fmt.compact(active.tokens?.output ?? 0))),
                    h('span', null, t('timeline.legendCache'), ' ', h('b', null, fmt.compact(active.tokens?.cacheRead ?? 0))),
                    h('span', null, h('b', null, fmt.usd(active.cost))),
                    h('span', null, t('timeline.sessions', { count: fmt.int(active.sessions ?? 0) })),
                  )
                : null,
            ),
      )
    }

    function CpuCard({ cpu, t, fmt }) {
      const samples = cpu?.samples ?? []
      const width = 320
      const height = 74
      const max = Math.max(20, ...samples.map((sample) => Math.max(sample.p, sample.s)))
      const point = (index, value) => {
        const x = samples.length <= 1 ? 0 : (index / (samples.length - 1)) * width
        const y = height - (Math.min(value, max) / max) * height
        return `${x.toFixed(2)},${y.toFixed(2)}`
      }
      const line = (key) => samples.map((sample, index) => point(index, sample[key])).join(' ')
      const processLine = line('p')
      const systemLine = line('s')
      const area = samples.length > 0 ? `M0,${height} L${processLine.replace(/ /g, ' L')} L${width},${height} Z` : ''
      const running = cpu?.active?.length ?? cpu?.running?.length ?? 0
      const uptime = cpu ? cpu.updatedAt - cpu.startedAt : 0

      return h(
        'div',
        { className: 'dshstat-card' },
        h(
          'div',
          { className: 'dshstat-section', style: { marginBottom: '4px' } },
          h('h2', { className: 'dshstat-h2' }, t('cpu.title')),
          h(
            'div',
            { className: 'dshstat-legend' },
            h('span', null, running > 0 ? t('cpu.active', { count: running }) : t('cpu.idle')),
          ),
        ),
        h(
          'div',
          { className: 'dshstat-cpu-top' },
          h(
            'div',
            null,
            h('div', { className: 'dshstat-label' }, t('cpu.process')),
            h('div', { className: 'dshstat-value' }, cpu ? `${cpu.processPct.toFixed(1)}%` : '—'),
            h('div', { className: 'dshstat-hint' }, t('cpu.ofCore')),
          ),
          h(
            'div',
            { style: { textAlign: 'right' } },
            h('div', { className: 'dshstat-hint' }, t('cpu.uptime', { duration: fmt.duration(uptime) })),
            h('div', { className: 'dshstat-hint' }, t('cpu.average', { value: `${(cpu?.averagePct ?? 0).toFixed(1)}%` })),
            h('div', { className: 'dshstat-hint' }, t('cpu.peak', { value: `${(cpu?.peakPct ?? 0).toFixed(1)}%` })),
          ),
        ),
        h(
          'svg',
          { className: 'dshstat-spark', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', 'aria-hidden': true },
          h('line', {
            x1: 0,
            y1: height / 2,
            x2: width,
            y2: height / 2,
            stroke: 'var(--dsw-alias-border-l1)',
            strokeDasharray: '3 4',
            strokeWidth: 1,
          }),
          area ? h('path', { d: area, fill: 'var(--dshstat-blue)', opacity: 0.18 }) : null,
          systemLine
            ? h('polyline', {
                points: systemLine,
                fill: 'none',
                stroke: 'var(--dshstat-amber)',
                strokeWidth: 1.3,
                strokeDasharray: '4 3',
                strokeLinejoin: 'round',
                opacity: 0.85,
              })
            : null,
          processLine
            ? h('polyline', {
                points: processLine,
                fill: 'none',
                stroke: 'var(--dshstat-blue)',
                strokeWidth: 1.9,
                strokeLinejoin: 'round',
                strokeLinecap: 'round',
              })
            : null,
        ),
        h(
          'div',
          { className: 'dshstat-stats' },
          h('div', { className: 'dshstat-stat' }, h('b', null, cpu ? fmt.pct(cpu.systemPct) : '—'), h('span', null, t('cpu.system'))),
          h('div', { className: 'dshstat-stat' }, h('b', null, cpu ? cpu.load1.toFixed(2) : '—'), h('span', null, t('cpu.load'))),
          h('div', { className: 'dshstat-stat' }, h('b', null, cpu ? `${cpu.cores}` : '—'), h('span', null, t('cpu.cores', { count: cpu?.cores ?? 0 }))),
          h('div', { className: 'dshstat-stat' }, h('b', null, cpu ? `${cpu.rssMb.toFixed(0)} MB` : '—'), h('span', null, t('cpu.memory'))),
        ),
      )
    }

    function ModelsCard({ models, t, fmt }) {
      const max = models.reduce((value, model) => Math.max(value, model.cost), 0)
      return h(
        'div',
        { className: 'dshstat-card' },
        h('div', { className: 'dshstat-section' }, h('h2', { className: 'dshstat-h2' }, t('models.title'))),
        models.length === 0
          ? h('div', { className: 'dshstat-hint' }, t('models.empty'))
          : h(
              'div',
              { className: 'dshstat-models' },
              models.map((model) =>
                h(
                  'div',
                  { key: model.id, className: 'dshstat-model' },
                  h(
                    'div',
                    { className: 'dshstat-model-row' },
                    h('span', { className: 'dshstat-model-id', title: model.id }, model.id),
                    h('span', { className: 'dshstat-model-num' }, fmt.usd(model.cost)),
                  ),
                  h(
                    'div',
                    { className: 'dshstat-bar', style: { marginTop: 0 } },
                    h('span', {
                      style: {
                        width: `${max > 0 ? Math.max(2, (model.cost / max) * 100) : 0}%`,
                        background: model.explicit === false ? 'var(--dshstat-amber)' : undefined,
                      },
                    }),
                  ),
                  h(
                    'div',
                    { className: 'dshstat-model-row' },
                    h('span', { className: 'dshstat-model-num' }, fmt.compact(sumBuckets(model.tokens)), ' tokens'),
                    model.explicit === false
                      ? h('span', { className: 'dshstat-tag' }, t('models.fallback'))
                      : h('span'),
                  ),
                ),
              ),
            ),
      )
    }

    function ConversationTable({ rows, t, fmt }) {
      const [sort, setSort] = useState({ key: 'lastAt', dir: 'desc' })
      const maxTokens = rows.reduce((value, row) => Math.max(value, row.totalTokens), 0)
      const sorted = useMemo(() => {
        const factor = sort.dir === 'asc' ? 1 : -1
        const value = (row) => {
          if (sort.key === 'title') return (row.title ?? '').toLowerCase()
          if (sort.key === 'lastAt') return row.lastAt ?? 0
          if (sort.key === 'cpu') return row.cpu?.cpuMs ?? -1
          if (sort.key === 'cost') return row.cost
          return row.totalTokens
        }
        return [...rows].sort((left, right) => {
          const a = value(left)
          const b = value(right)
          if (typeof a === 'string' || typeof b === 'string') return factor * String(a).localeCompare(String(b))
          return factor * (a - b)
        })
      }, [rows, sort])

      const header = (key, label, numeric) =>
        h(
          'button',
          {
            className: 'dshstat-th',
            'data-on': sort.key === key,
            'data-num': numeric ? 'true' : 'false',
            onClick: () => setSort((previous) => ({ key, dir: previous.key === key && previous.dir === 'desc' ? 'asc' : 'desc' })),
          },
          label,
          sort.key === key ? h('span', null, sort.dir === 'desc' ? '↓' : '↑') : null,
        )

      if (rows.length === 0) {
        return h('div', { className: 'dshstat-card' }, h('div', { className: 'dshstat-state' }, t('table.empty')))
      }

      return h(
        'div',
        { className: 'dshstat-card' },
        h(
          'div',
          { className: 'dshstat-section' },
          h('h2', { className: 'dshstat-h2' }, t('table.title')),
          h('div', { className: 'dshstat-legend' }, `${rows.length}`),
        ),
        h(
          'div',
          { className: 'dshstat-table' },
          h(
            'div',
            { className: 'dshstat-thead' },
            h('div', null, header('title', t('table.conversation'), false)),
            h('div', null, header('lastAt', t('table.lastActive'), true)),
            h('div', null, header('totalTokens', t('table.tokens'), true)),
            h('div', null, header('cost', t('table.cost'), true)),
            h('div', { className: 'dshstat-cpu-col' }, header('cpu', t('table.cpu'), true)),
          ),
          sorted.map((row) =>
            h(
              'div',
              { key: row.sessionId, className: 'dshstat-tr' },
              h(
                'div',
                { className: 'dshstat-name', title: row.cwd ?? row.sessionId },
                h(
                  'div',
                  { className: 'dshstat-name-line' },
                  h('b', null, row.title ?? t('table.untitled')),
                  row.origin === 'subagent' ? h('span', { className: 'dshstat-tag' }, t('table.subagent')) : null,
                  row.priced === false ? h('span', { className: 'dshstat-tag' }, t('table.unpriced')) : null,
                ),
                h(
                  'span',
                  { className: 'dshstat-name-sub' },
                  [row.workspace, row.model].filter(Boolean).join(' · ') || row.sessionId,
                ),
              ),
              h('div', { className: 'dshstat-num' }, row.lastAt ? fmt.date(row.lastAt) : '—'),
              h(
                'div',
                { className: 'dshstat-tok' },
                h('span', { className: 'dshstat-num' }, fmt.compact(row.totalTokens)),
                h(
                  'div',
                  { className: 'dshstat-tokbar' },
                  h('span', { style: { width: `${maxTokens > 0 ? Math.max(2, (row.totalTokens / maxTokens) * 100) : 0}%` } }),
                ),
              ),
              h('div', { className: 'dshstat-num' }, fmt.usd(row.cost)),
              h(
                'div',
                { className: 'dshstat-num dshstat-cpu-col' },
                row.cpu && row.cpu.cpuMs > 0
                  ? h('span', { title: `${fmt.duration(row.cpu.cpuMs)} · ${fmt.pct(row.cpu.util)}` }, fmt.duration(row.cpu.cpuMs))
                  : h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('cpu.noSample')),
              ),
            ),
          ),
        ),
      )
    }

    function Panel({ locale, fallbackLocale }) {
      const { t, fmt } = useLocaleFace(locale, fallbackLocale)
      const { status, data, error, refresh, auto, setAuto } = useSnapshotData()
      const [rangeDays, setRangeDays] = useState(0)
      const [mode, setMode] = useState('billable')

      const view = useMemo(() => (data ? aggregate(data, rangeDays) : null), [data, rangeDays])
      const series = useMemo(() => (data ? buildSeries(data.days, rangeDays, Date.now()) : []), [data, rangeDays])

      if (status === 'loading' && !data) {
        return h('div', { className: 'dshstat-root' }, h(StyleTag), h('div', { className: 'dshstat-state' }, h('span', { className: 'dshstat-spin' }), t('panel.loading')))
      }
      if (status === 'failed' && !data) {
        return h(
          'div',
          { className: 'dshstat-root' },
          h(StyleTag),
          h(
            'div',
            { className: 'dshstat-state' },
            h('div', null, t('panel.failed', { message: error ?? 'unknown error' })),
            h('div', { style: { marginTop: '12px' } }, h('button', { className: 'dshstat-btn', onClick: refresh }, t('panel.retry'))),
          ),
        )
      }

      const budget = data?.budget ?? null

      const totals = view?.totals ?? { input: 0, output: 0, cacheRead: 0, tokens: 0, cost: 0, turns: 0, steps: 0, toolCalls: 0 }
      const hasWarnings = (data?.warnings ?? []).length > 0

      return h(
        'div',
        { className: 'dshstat-root' },
        h(StyleTag),
        h(
          'div',
          { className: 'dshstat-inner' },
          h(
            'header',
            { className: 'dshstat-head' },
            h(
              'div',
              null,
              h('h1', { className: 'dshstat-title' }, t('panel.title')),
              h(
                'div',
                { className: 'dshstat-meta' },
                data
                  ? `${t('panel.updated', { time: fmt.time(data.generatedAt) })} · ${t('panel.source', {
                      source: data.source,
                      sessions: data.sessions,
                    })}`
                  : '',
                error ? ` · ${error}` : '',
              ),
            ),
            h(
              'div',
              { className: 'dshstat-tools' },
              h(
                'div',
                { className: 'dshstat-seg', role: 'group', 'aria-label': t('panel.rangeLabel') },
                [
                  [1, t('range.d1')],
                  [7, t('range.d7')],
                  [30, t('range.d30')],
                  [90, t('range.d90')],
                  [0, t('range.all')],
                ].map(([value, label]) =>
                  h('button', { key: value, 'data-on': rangeDays === value, onClick: () => setRangeDays(value) }, label),
                ),
              ),
              h('button', { className: 'dshstat-btn', 'data-on': auto, onClick: () => setAuto(!auto) }, t('panel.autoRefresh')),
              h('button', { className: 'dshstat-btn', onClick: refresh, disabled: status === 'loading' }, t('panel.refresh')),
            ),
          ),

          hasWarnings
            ? h('div', { className: 'dshstat-notice' }, data.warnings.join(' · '))
            : null,

          h(
            'div',
            { className: 'dshstat-grid' },
            h(Kpi, {
              label: t('kpi.tokens'),
              value: fmt.compact(totals.tokens),
              hint: t('kpi.tokensHint', {
                input: fmt.compact(totals.input),
                output: fmt.compact(totals.output),
                cache: fmt.compact(totals.cacheRead),
              }),
              accent: 'var(--dshstat-blue)',
              glyph: 'tokens',
            }),
            h(Kpi, {
              label: t('kpi.conversations'),
              value: fmt.int(view?.conversations ?? 0),
              hint: t('kpi.conversationsHint', {
                turns: fmt.int(totals.turns),
                steps: fmt.int(totals.steps),
                tools: fmt.int(totals.toolCalls),
              }),
              accent: 'var(--dshstat-indigo)',
              glyph: 'conversations',
            }),
            h(Kpi, {
              label: t('kpi.cost'),
              value: fmt.usd(totals.cost),
              hint: t('kpi.costHint', {
                priced: (view?.rows ?? []).filter((row) => row.totalTokens > 0 && row.priced).length,
                total: view?.conversations ?? 0,
              }),
              accent: 'var(--dshstat-green)',
              glyph: 'cost',
            }),
            budget ? h(BudgetCard, { budget, t, fmt }) : null,
          ),

          // A per-day chart has no temporal resolution inside a single day, so the
          // Today range shows the KPI cards, models, and conversations without it.
          rangeDays === 1 ? null : h(Timeline, { series, mode, setMode, t, fmt, key: `timeline-${rangeDays}` }),

          h(
            'div',
            { className: 'dshstat-split' },
            h(CpuCard, { cpu: data?.cpu, t, fmt }),
            h(ModelsCard, { models: view?.models ?? [], t, fmt }),
          ),

          h(ConversationTable, { rows: view?.rows ?? [], t, fmt }),
        ),
      )
    }

    function PanelIcon({ size, active }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('rect', { x: 3.2, y: 13.4, width: 3.6, height: 7.4, rx: 1, fill: 'currentColor', opacity: active ? 0.65 : 0.5 }),
        h('rect', { x: 10.2, y: 9, width: 3.6, height: 11.8, rx: 1, fill: 'currentColor', opacity: active ? 0.85 : 0.65 }),
        h('rect', { x: 17.2, y: 3.6, width: 3.6, height: 17.2, rx: 1, fill: 'currentColor' }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const locale = ctx.get('locale') ?? null
        const fallbackLocale = typeof navigator !== 'undefined' ? navigator.language : 'en'

        if (locale && typeof locale.register === 'function') {
          ctx.effect(() => locale.register(NS, 'en', EN), 'dsh-statistics: en dictionary')
          ctx.effect(() => locale.register(NS, 'zh', ZH), 'dsh-statistics: zh dictionary')
        }

        const t = makeTranslate(locale, { en: EN })

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 20,
              label: () => t('panel.title'),
            },
            PanelIcon,
          ),
        )

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            { name: 'main', key: PANEL_ID },
            () => h(Panel, { locale, fallbackLocale }),
          ),
        )
      },
    }
  },
})
