window.__ModuleLoader__.load({
  id: '@douglarek/dsh-statistics',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React

    const SNAPSHOT_URL = '/api/statistics/snapshot'
    /** Snapshot payload version this panel was built against; the Host stamps its own. */
    const SNAPSHOT_API = 2
    const NS = 'dsh-statistics'
    const PANEL_ID = 'statistics'
    const BUCKETS = ['input', 'output', 'cacheRead', 'cacheWrite']
    const EMPTY_SNAPSHOT = Object.freeze({ active: 'en', locales: Object.freeze([]), revision: 0 })

    const EN = {
      'panel.title': 'Statistics',
      'panel.refresh': 'Refresh',
      'panel.autoRefresh': 'Auto refresh',
      'panel.updated': 'Updated {time}',
      'panel.staleHost': 'The Host half is still an older build (payload v{host}, this panel needs v{want}); restart DSH to load the new code.',
      'panel.empty': 'No conversation logs with token usage were found yet.',
      'panel.loading': 'Reading conversation logs…',
      'panel.failed': 'Could not read the statistics: {message}',
      'panel.retry': 'Retry',
      'panel.range': 'Range',
      'panel.rangeAll': 'All',
      'panel.rangeDays': 'Last {days} days',
      'panel.source': 'Source: {source} · {sessions} logs scanned',
      'panel.rangeLabel': 'Range',
      'range.d7': '7d',
      'range.d30': '30d',
      'range.d90': '90d',
      'range.all': 'All',
      'kpi.tokens': 'Total tokens',
      'kpi.tokensHint': '{input} input · {output} output · {cache} cache read{write}',
      'kpi.tokensWriteHint': ' · {write} cache write',
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
      'timeline.title': 'Usage timeline',
      'timeline.empty': 'No usage in this range.',
      'timeline.legendInput': 'Input',
      'timeline.legendOutput': 'Output',
      'timeline.legendCache': 'Cache read',
      'timeline.legendCacheWrite': 'Cache write',
      'metrics.cacheHit': 'Cache hit rate',
      'timeline.daySummary': '{tokens} tokens · {cost} · {sessions} conversations · {turns} turns',
      'timeline.tipTotal': 'Total',
      'timeline.peak': 'Peak {date} · {tokens}',
      'timeline.sessions': '{count} conversations',
      'timeline.legendCost': 'Cost',
      'timeline.legendRequests': 'Requests',
      'timeline.totalRequests': 'Total requests',
      'timeline.perMillion': 'Per 1M tokens',
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
      'card.turns': 'Turns',
      'card.turnsValue': '{turns} turns · {steps} steps',
      'card.all': 'All',
      'card.search': 'Search title, workspace, or model',
      'card.open': 'Open this session',
      'card.composition': 'Token composition',
      'card.sortRecent': 'Recent',
      'card.sortTokens': 'Tokens',
      'card.sortCost': 'Cost',
      'unit.tokens': 'tokens',
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
      'panel.staleHost': '宿主插件仍是旧版本（数据 v{host}，面板需要 v{want}）：重启 DSH 后新数据才会出现。',
      'panel.empty': '尚未找到带词元用量的会话日志。',
      'panel.loading': '正在读取会话日志…',
      'panel.failed': '无法读取统计数据：{message}',
      'panel.retry': '重试',
      'panel.range': '范围',
      'panel.rangeAll': '全部',
      'panel.rangeDays': '近 {days} 天',
      'panel.source': '数据源：{source} · 已扫描 {sessions} 份日志',
      'panel.rangeLabel': '范围',
      'range.d7': '7 天',
      'range.d30': '30 天',
      'range.d90': '90 天',
      'range.all': '全部',
      'kpi.tokens': '词元总量',
      'kpi.tokensHint': '输入 {input} · 输出 {output} · 缓存读取 {cache}{write}',
      'kpi.tokensWriteHint': ' · 缓存写入 {write}',
      'kpi.conversations': '会话数',
      'kpi.conversationsHint': '{turns} 轮 · {steps} 步 · {tools} 次工具调用',
      'kpi.cost': '预估费用',
      'kpi.costHint': '{total} 个会话中有 {priced} 个匹配到费率',
      'kpi.budget': '预算',
      'kpi.budgetHint': '本{period}已用 {spent} / {budget}',
      'kpi.budgetProjection': '预计 {label} 累计 {amount}',
      'kpi.budgetOver': '超出预算 {amount}',
      'kpi.budgetIdle': '本{period}暂无花费',
      'kpi.periodMonth': '月',
      'kpi.periodWeek': '周',
      'kpi.periodDay': '日',
      'kpi.periodAll': '周期',
      'timeline.title': '用量时间线',
      'timeline.empty': '该范围内没有用量。',
      'timeline.legendInput': '输入',
      'timeline.legendOutput': '输出',
      'timeline.legendCache': '缓存读取',
      'timeline.legendCacheWrite': '缓存写入',
      'metrics.cacheHit': '缓存命中率',
      'timeline.daySummary': '{tokens} 词元 · {cost} · {sessions} 个会话 · {turns} 轮',
      'timeline.tipTotal': '合计',
      'timeline.peak': '峰值 {date} · {tokens}',
      'timeline.sessions': '{count} 个会话',
      'timeline.legendCost': '成本',
      'timeline.legendRequests': '请求数',
      'timeline.totalRequests': '总请求数',
      'timeline.perMillion': '每 1M 词元',
      'cpu.title': 'CPU 活动',
      'cpu.process': 'Harness 进程',
      'cpu.system': '系统',
      'cpu.load': '1 分钟负载',
      'cpu.cores': '{count} 核',
      'cpu.memory': '内存',
      'cpu.uptime': '已采样 {duration}',
      'cpu.average': '平均 {value}',
      'cpu.peak': '峰值 {value}',
      'cpu.active': '当前 {count} 个会话在运行',
      'cpu.idle': '当前没有会话在运行',
      'cpu.ofCore': '单核占用',
      'cpu.noSample': '—',
      'models.title': '模型',
      'models.empty': '没有记录到模型用量。',
      'models.fallback': '回退费率',
      'card.turns': '轮次',
      'card.turnsValue': '{turns} 轮 {steps} 步',
      'card.all': '全部',
      'card.search': '搜索标题 / 工作区 / 模型',
      'card.open': '打开该会话',
      'card.composition': '词元构成',
      'card.sortRecent': '最近',
      'card.sortTokens': '词元',
      'card.sortCost': '费用',
      'unit.tokens': '词元',
      'table.title': '会话',
      'table.empty': '该范围内没有会话。',
      'table.conversation': '会话',
      'table.lastActive': '最近活动',
      'table.tokens': '词元',
      'table.cost': '费用',
      'table.cpu': 'CPU',
      'table.share': '占比',
      'table.untitled': '未命名会话',
      'table.subagent': '子代理',
      'table.unpriced': '回退费率',
    }

    const CSS = `
.dshstat-shell{position:relative;height:100%;min-height:0;display:flex;min-width:0}
.dshstat-root{box-sizing:border-box;height:100%;max-height:100%;min-height:0;flex:1 1 auto;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.45;--dshstat-blue:var(--dsw-static-blue-500,#3b82f6);--dshstat-indigo:var(--dsw-static-deepseek-500,#4176e6);--dshstat-green:var(--dsw-static-green-500,#22c55e);--dshstat-amber:var(--dsw-static-amber-500,#f59e0b);--dshstat-red:var(--dsw-static-red-500,#ef4444);--dshstat-cache:var(--dsw-static-amber-600,#dd8629);--dshstat-cachewrite:var(--dsw-static-amber-500,#f59e0b);--dshstat-cost:#14b8a6;--dshstat-request:#8b5cf6;--dshstat-track:color-mix(in srgb,var(--dsw-alias-label-secondary) 16%,transparent)}
.dshstat-root::-webkit-scrollbar{width:0;height:0}
.dshstat-handle{position:absolute;top:0;bottom:0;width:20px;display:flex;align-items:center;justify-content:center;cursor:col-resize;touch-action:none;z-index:5}
.dshstat-handle::before{content:'';width:2px;height:132px;border-radius:2px;background:transparent;transition:background .15s ease,height .15s ease}
.dshstat-handle:hover::before,.dshstat-handle:active::before{background:var(--dsw-static-neutral-300,#d4d4d4);height:150px}
.dshstat-inner{max-width:960px;margin:0 auto;padding:28px clamp(24px,4vw,48px) 48px;display:flex;flex-direction:column;gap:18px}
.dshstat-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dshstat-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.dshstat-meta{margin-top:6px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.dshstat-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.dshstat-btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;transition:border-color .12s ease,background .12s ease}
.dshstat-btn:hover{border-color:var(--dsw-alias-border-l2)}
.dshstat-btn[data-on="true"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dshstat-seg{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.dshstat-seg button{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 10px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1;cursor:pointer}
.dshstat-seg button+button{border-left:1px solid var(--dsw-alias-border-l1)}
.dshstat-seg button[data-on="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.dshstat-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px;min-width:0}
.dshstat-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:12px}
.dshstat-scroll{overflow-y:auto;padding-right:2px}
.dshstat-scroll::-webkit-scrollbar{width:6px}
.dshstat-scroll::-webkit-scrollbar-track{background:transparent}
.dshstat-scroll::-webkit-scrollbar-thumb{background:transparent;border-radius:99px}
.dshstat-scroll:hover::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2)}
.dshstat-scroll:hover::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-secondary)}
.dshstat-scard{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base);padding:12px 14px;display:flex;flex-direction:column;gap:9px;min-width:0;cursor:pointer;transition:border-color .12s ease,background .12s ease}
.dshstat-scard:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}
.dshstat-scard:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dshstat-scard-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0}
.dshstat-scard-head b{font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dshstat-scard-when{flex:none;text-align:right;font-size:10.5px;line-height:1.4;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;display:flex;flex-direction:column}
.dshstat-pills{display:flex;gap:6px;flex-wrap:wrap;min-width:0}
.dshstat-pill{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:99px;background:var(--dshstat-track);color:var(--dsw-alias-label-secondary);font-size:10.5px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshstat-scard-body{display:flex;align-items:center;gap:14px;min-width:0}
.dshstat-donut{position:relative;flex:none}
.dshstat-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-variant-numeric:tabular-nums}
.dshstat-donut-center b{font-size:10.5px;font-weight:600;letter-spacing:-0.02em}
.dshstat-donut-center span{font-size:9.5px;color:var(--dsw-alias-label-secondary)}
.dshstat-metrics{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 12px;font-size:11.5px;min-width:0;flex:1 1 auto}
.dshstat-metrics span{color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshstat-metrics b{justify-self:end;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.dshstat-scard-foot{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:10.5px;color:var(--dsw-alias-label-secondary);border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px;font-variant-numeric:tabular-nums}
.dshstat-scard-foot b{color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-sessionhead{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.dshstat-titlegroup{display:flex;align-items:center;gap:8px;flex:none;min-width:0}
.dshstat-titlegroup em{font-style:normal;color:var(--dsw-alias-label-secondary);font-size:11.5px;font-variant-numeric:tabular-nums}
.dshstat-search{flex:1 1 240px;min-width:160px;height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.dshstat-search::placeholder{color:var(--dsw-alias-label-secondary)}
.dshstat-search:focus{outline:none;border-color:var(--dsw-alias-border-l2)}
.dshstat-filterpills{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.dshstat-filterpills button{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:99px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;max-width:180px;overflow:hidden;white-space:nowrap}
.dshstat-filterpills button[data-on="true"]{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-filterpills em{font-style:normal;opacity:.65;font-variant-numeric:tabular-nums}
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
.dshstat-legend{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:11.5px;flex-wrap:wrap}
.dshstat-legend>span{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:99px;border:1px solid var(--dsw-alias-border-l1);white-space:nowrap}
.dshstat-dot{width:8px;height:8px;border-radius:2px;display:inline-block;margin-right:5px;vertical-align:middle}
.dshstat-plot{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;grid-template-rows:168px auto;grid-template-areas:'l c rq cs' '. a . .';column-gap:0}
.dshstat-scale{grid-area:l;position:relative;flex:none;min-width:40px;height:100%;color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:1;font-variant-numeric:tabular-nums}
.dshstat-scale span{position:absolute;right:10px;white-space:nowrap}
.dshstat-chart{grid-area:c;min-width:0;display:flex;align-items:stretch;gap:0;position:relative;border-bottom:1px solid var(--dsw-alias-border-l2);border-top:1px solid var(--dsw-alias-border-l1)}
.dshstat-overlay{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:2}
.dshstat-costline{fill:none;stroke:var(--dshstat-cost);stroke-width:2;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.dshstat-requestline{fill:none;stroke:var(--dshstat-request);stroke-width:1.8;stroke-dasharray:5 4;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke;opacity:.9}
.dshstat-scale-req{grid-area:rq;min-width:58px;border-left:1px solid var(--dsw-alias-border-l1)}
.dshstat-scale-cost{grid-area:cs;min-width:68px;border-left:1px solid var(--dsw-alias-border-l1)}
.dshstat-scale-req span,.dshstat-scale-cost span{right:auto;left:10px}
.dshstat-headtools{display:flex;align-items:center;justify-content:flex-end;gap:10px 20px;flex-wrap:wrap}
.dshstat-inline-stats{display:flex;align-items:center;gap:18px;font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dshstat-inline-stats b{margin-left:6px;color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-daytip{position:fixed;z-index:60;min-width:168px;padding:8px 10px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 28px rgba(0,0,0,.18);pointer-events:none;font-size:11.5px;line-height:1.6;font-variant-numeric:tabular-nums;white-space:nowrap}
.dshstat-daytip-head{margin-bottom:4px;font-weight:600}
.dshstat-daytip-row{display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--dsw-alias-label-secondary)}
.dshstat-daytip-total{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:5px;padding-top:5px;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}
.dshstat-gridline{position:absolute;left:0;right:0;top:50%;border-top:1px dashed var(--dsw-alias-border-l1);pointer-events:none}
.dshstat-col{flex:1 1 0;min-width:2px;display:flex;flex-direction:column;justify-content:flex-end;cursor:pointer;position:relative}
.dshstat-col::before{content:'';position:absolute;left:0;top:0;bottom:0;width:1px;background:var(--dsw-alias-border-l1);pointer-events:none}
.dshstat-chart[data-dense="true"] .dshstat-col::before{display:none}
.dshstat-col[data-on="true"]::after{content:'';position:absolute;left:50%;transform:translateX(-50%);width:min(40px,calc(100% - 6px));bottom:-5px;height:2px;border-radius:1px;background:var(--dsw-alias-brand-primary)}
.dshstat-stack{position:relative;display:flex;flex-direction:column;justify-content:flex-end;height:100%;width:calc(100% - 6px);max-width:40px;margin:0 auto;border-radius:4px 4px 0 0;overflow:hidden}
.dshstat-stack::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;transition:background .12s ease}
.dshstat-col[data-hover="true"] .dshstat-stack::after,.dshstat-col[data-on="true"] .dshstat-stack::after{background:var(--dsw-alias-interactive-bg-hover)}
.dshstat-axis{grid-area:a;display:flex;justify-content:space-between;color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:10px;font-variant-numeric:tabular-nums}
.dshstat-detail{margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1);display:flex;gap:18px;flex-wrap:wrap;font-size:12px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.dshstat-detail b{color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-split{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:12px}
.dshstat-cpu-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dshstat-spark{display:block;width:100%;height:74px;margin-top:10px}
.dshstat-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 14px;margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1)}
.dshstat-stat b{display:block;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.dshstat-stat span{font-size:11px;color:var(--dsw-alias-label-secondary)}
.dshstat-cardmodels{display:flex;flex-direction:column;min-height:0}
.dshstat-cardcpu{display:flex;flex-direction:column;min-height:0}
.dshstat-cardcpu .dshstat-stats{margin-top:auto}
.dshstat-cardmodels .dshstat-models{flex:1 1 auto;min-height:0}
.dshstat-models{display:flex;flex-direction:column;gap:10px}
.dshstat-model{display:flex;flex-direction:column;gap:5px;border-radius:8px;transition:background .12s ease}
.dshstat-model[data-hover="true"]{background:var(--dsw-alias-interactive-bg-hover)}
.dshstat-model-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:12px}
.dshstat-model-id{font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshstat-model-num{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dshstat-table{display:flex;flex-direction:column}
.dshstat-thead,.dshstat-tr{display:grid;grid-template-columns:minmax(200px,2.5fr) minmax(88px,1fr) minmax(104px,1.15fr) minmax(80px,0.95fr) minmax(52px,0.6fr);gap:16px;align-items:center;padding:9px 12px;border-radius:8px}
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
.dshstat-tip{position:fixed;z-index:60;display:flex;flex-direction:column;gap:3px;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 28px rgba(0,0,0,.18);pointer-events:none;font-size:12px;line-height:1.4}
.dshstat-tip b{font-weight:600;word-break:break-word}
.dshstat-tip span{font-size:11px;color:var(--dsw-alias-label-secondary);word-break:break-all;font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace)}
.dshstat-tip-row{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dshstat-tip-row span{font-family:inherit;font-size:11.5px;word-break:normal}
.dshstat-tip-row b{color:var(--dsw-alias-label-primary);font-weight:600;font-family:inherit}
.dshstat-tip-total{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:4px;padding-top:5px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dshstat-tip-total b{color:var(--dsw-alias-label-primary);font-weight:600}
.dshstat-donut-wrap{flex:none}
.dshstat-scard-model{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.dshstat-tag{display:inline-flex;align-items:center;flex:none;height:16px;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1}
.dshstat-notice{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;color:var(--dsw-alias-label-secondary);font-size:12px;background:var(--dsw-alias-bg-layer-1)}
.dshstat-state{padding:48px 8px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px}
.dshstat-spin{display:inline-block;width:12px;height:12px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dshstat-spin .8s linear infinite;vertical-align:-2px;margin-right:7px}
@keyframes dshstat-spin{to{transform:rotate(360deg)}}
@media (max-width:900px){.dshstat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dshstat-split{grid-template-columns:minmax(0,1fr)}.dshstat-inner{padding:20px 18px 48px}.dshstat-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:720px){.dshstat-thead,.dshstat-tr{grid-template-columns:minmax(0,2.2fr) minmax(80px,1fr) minmax(96px,1.1fr) minmax(72px,0.9fr);gap:12px}.dshstat-cpu-col{display:none}}
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

    /**
     * Share of prompt tokens served from cache: cache reads over cache reads plus
     * the uncached input. Only the uncached part is billed at the input price, so
     * this is the number that explains a cheap day.
     */
    function hitRate(tokens) {
      const read = tokens?.cacheRead ?? 0
      const miss = tokens?.input ?? 0
      return read + miss > 0 ? (read / (read + miss)) * 100 : null
    }

    /**
     * Hit rate with a fixed four decimals, so a provider that reports almost
     * nothing as uncached input still shows the difference instead of a
     * misleading 100%: 99.9988%, not 100.0%.
     */
    function formatHitRate(value) {
      if (value === null) return '—'
      return `${value.toFixed(4)}%`
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
      const money = new Intl.NumberFormat(localeId, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
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
        if (abs === 0) return '$0.000'
        if (abs < 0.0005) return '<$0.001'
        return `$${money.format(value)}`
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
      const relativeFormat = new Intl.RelativeTimeFormat(localeId, { numeric: 'auto' })
      const relative = (value) => {
        if (!Number.isFinite(value)) return '—'
        const diff = Date.now() - value
        const abs = Math.abs(diff)
        if (abs < 60_000) return relativeFormat.format(0, 'minute')
        if (abs < 3_600_000) return relativeFormat.format(-Math.round(diff / 60_000), 'minute')
        if (abs < 86_400_000) return relativeFormat.format(-Math.round(diff / 3_600_000), 'hour')
        if (abs < 30 * 86_400_000) return relativeFormat.format(-Math.round(diff / 86_400_000), 'day')
        return date(value)
      }
      return { int, compact, usd, pct, duration, time, date, dayLabel, dayLong, relative }
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

    const SNAPSHOT_CACHE_KEY = 'dsh-statistics:snapshot'

    function readCachedSnapshot() {
      try {
        const raw = sessionStorage.getItem(SNAPSHOT_CACHE_KEY)
        if (!raw) return null
        const cached = JSON.parse(raw)
        return (cached?.api ?? 1) === SNAPSHOT_API ? cached : null
      } catch {
        return null
      }
    }

    function writeCachedSnapshot(value) {
      try {
        sessionStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(value))
      } catch {
        /* quota or private mode: the panel still works, it just repaints from the host */
      }
    }

    function useSnapshotData() {
      const [refreshMs, setRefreshMs] = useState(4000)
      const [state, setState] = useState(() => {
        const cached = readCachedSnapshot()
        return cached ? { status: 'ready', data: cached, error: null } : { status: 'loading', data: null, error: null }
      })
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
            writeCachedSnapshot(body)
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
        series.push(byDay.get(key) ?? { day: key, tokens: emptyBuckets(), cost: 0, sessions: 0, turns: 0, requests: 0 })
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

    function splinePath(points) {
      if (points.length === 0) return ''
      if (points.length === 1) return `M${points[0][0]},${points[0][1]}`
      const clamp = (value) => Math.max(-2, Math.min(102, value))
      let path = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`
      for (let index = 0; index < points.length - 1; index += 1) {
        const before = points[index - 1] ?? points[index]
        const from = points[index]
        const to = points[index + 1]
        const after = points[index + 2] ?? to
        const c1x = from[0] + (to[0] - before[0]) * 0.27
        const c1y = clamp(from[1] + (to[1] - before[1]) * 0.27)
        const c2x = to[0] - (after[0] - from[0]) * 0.27
        const c2y = clamp(to[1] - (after[1] - from[1]) * 0.27)
        path += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${to[0].toFixed(2)},${to[1].toFixed(2)}`
      }
      return path
    }

    function niceMax(value, steps = 4) {
      if (!Number.isFinite(value) || value <= 0) return 0
      const raw = value / steps
      const magnitude = 10 ** Math.floor(Math.log10(raw))
      const normalized = raw / magnitude
      const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude
      return step * steps
    }

    const TICKS = [0, 25, 50, 75, 100]

    function tickStyle(pct) {
      if (pct === 0) return { top: 0, transform: 'none' }
      if (pct === 100) return { top: '100%', transform: 'translateY(-100%)' }
      return { top: `${pct}%`, transform: 'translateY(-50%)' }
    }

    function Timeline({ series, t, fmt, requestsAvailable = true }) {
      const [selected, setSelected] = useState(null)
      const [hover, setHover] = useState(null)

      const metricOf = (entry) => sumBuckets(entry.tokens)
      const max = niceMax(series.reduce((value, entry) => Math.max(value, metricOf(entry)), 0))
      const costMax = niceMax(series.reduce((value, entry) => Math.max(value, entry.cost ?? 0), 0))
      const totalTokens = series.reduce((sum, entry) => sum + sumBuckets(entry.tokens), 0)
      const totalCost = series.reduce((sum, entry) => sum + (entry.cost ?? 0), 0)
      const cacheWriteTotal = series.reduce((sum, entry) => sum + (entry.tokens?.cacheWrite ?? 0), 0)
      const requestMax = niceMax(series.reduce((value, entry) => Math.max(value, entry.requests ?? 0), 0))
      const totalRequests = series.reduce((sum, entry) => sum + (entry.requests ?? 0), 0)
      const perMillion = totalTokens > 0 ? totalCost / (totalTokens / 1_000_000) : 0

      const activeIndex = selected !== null && series[selected] ? selected : series.length - 1
      const active = series[activeIndex]
      const peak = series.reduce((best, entry) => (metricOf(entry) > metricOf(best) ? entry : best), series[0] ?? null)

      const costPath = splinePath(
        series.map((entry, index) => [
          ((index + 0.5) / Math.max(series.length, 1)) * 100,
          costMax > 0 ? 100 - ((entry.cost ?? 0) / costMax) * 100 : 100,
        ]),
      )
      const requestPath =
        requestsAvailable && requestMax > 0
          ? splinePath(
              series.map((entry, index) => [
                ((index + 0.5) / Math.max(series.length, 1)) * 100,
                100 - ((entry.requests ?? 0) / requestMax) * 100,
              ]),
            )
          : null
      const hovered = hover !== null && series[hover.index] ? series[hover.index] : null

      const showDay = (event, index, entry) => {
        if (sumBuckets(entry.tokens) === 0 && (entry.requests ?? 0) === 0) {
          setHover(null)
          return
        }
        setHover({ index, x: event.clientX, y: event.clientY })
      }

      const segments = (entry) => {
        const tokens = entry.tokens ?? emptyBuckets()
        const scale = max > 0 ? 100 / max : 0
        return [
          { key: 'cacheRead', value: tokens.cacheRead * scale, color: 'var(--dshstat-cache)' },
          { key: 'cacheWrite', value: tokens.cacheWrite * scale, color: 'var(--dshstat-cachewrite)' },
          { key: 'output', value: Math.max(tokens.output * scale, tokens.output > 0 ? 1.6 : 0), color: 'var(--dshstat-green)' },
          { key: 'input', value: Math.max(tokens.input * scale, tokens.input > 0 ? 1.6 : 0), color: 'var(--dshstat-blue)' },
        ].filter((segment) => segment.value > 0)
      }

      const chip = (label, color, dashed) =>
        h(
          'span',
          null,
          h('i', {
            className: 'dshstat-dot',
            style: dashed
              ? { background: 'transparent', border: `1.5px dashed ${color}`, borderRadius: '50%', boxSizing: 'border-box', margin: '0 5px 0 0' }
              : { background: color, boxShadow: 'none' },
          }),
          label,
        )

      const tipRow = (label, value, color, format) =>
        h(
          'div',
          { className: 'dshstat-daytip-row' },
          h('span', null, h('i', { className: 'dshstat-dot', style: { background: color } }), label),
          h('b', null, (format ?? fmt.compact)(value)),
        )

      return h(
        'div',
        { className: 'dshstat-card' },
        h(
          'div',
          { className: 'dshstat-section' },
          h('h2', { className: 'dshstat-h2' }, t('timeline.title')),
          h(
            'div',
            { className: 'dshstat-headtools' },
            h(
              'div',
              { className: 'dshstat-inline-stats' },
              h('span', null, t('timeline.perMillion'), h('b', null, totalTokens > 0 ? fmt.usd(perMillion) : '—')),
              requestsAvailable ? h('span', null, t('timeline.totalRequests'), h('b', null, fmt.int(totalRequests))) : null,
            ),
            h(
              'div',
              { className: 'dshstat-legend' },
              chip(t('timeline.legendInput'), 'var(--dshstat-blue)'),
              chip(t('timeline.legendOutput'), 'var(--dshstat-green)'),
              chip(t('timeline.legendCache'), 'var(--dshstat-cache)'),
              cacheWriteTotal > 0 ? chip(t('timeline.legendCacheWrite'), 'var(--dshstat-cachewrite)') : null,
              chip(t('timeline.legendCost'), 'var(--dshstat-cost)'),
              requestsAvailable ? chip(t('timeline.legendRequests'), 'var(--dshstat-request)') : null,
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
                h(
                  'div',
                  { className: 'dshstat-scale', 'aria-hidden': 'true' },
                  TICKS.map((pct) => h('span', { key: pct, style: tickStyle(pct) }, fmt.compact((max * (100 - pct)) / 100))),
                ),
                h(
                  'div',
                  { className: 'dshstat-chart', 'data-dense': series.length > 45 ? 'true' : 'false' },
                  max > 0 ? h('div', { className: 'dshstat-gridline', style: { top: '25%' } }) : null,
                  max > 0 ? h('div', { className: 'dshstat-gridline' }) : null,
                  max > 0 ? h('div', { className: 'dshstat-gridline', style: { top: '75%' } }) : null,

                  h(
                    'svg',
                    {
                      className: 'dshstat-overlay',
                      viewBox: '0 0 100 100',
                      preserveAspectRatio: 'none',
                      'aria-hidden': true,
                    },
                    costPath ? h('path', { className: 'dshstat-costline', d: costPath }) : null,
                    requestPath ? h('path', { className: 'dshstat-requestline', d: requestPath }) : null,
                  ),
                  series.map((entry, index) =>
                    h(
                      'div',
                      {
                        key: entry.day,
                        className: 'dshstat-col',
                        'data-on': index === activeIndex,
                        'data-hover': hover !== null && hover.index === index,
                        'aria-label': t('timeline.daySummary', {
                          tokens: fmt.int(sumBuckets(entry.tokens)),
                          cost: fmt.usd(entry.cost),
                          sessions: entry.sessions ?? 0,
                          turns: entry.turns ?? 0,
                        }),
                        onMouseEnter: (event) => showDay(event, index, entry),
                        onMouseMove: (event) => showDay(event, index, entry),
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
                  hovered
                    ? h(
                        'div',
                        {
                          className: 'dshstat-daytip',
                          style: {
                            left: `${hover.x + (hover.x > window.innerWidth - 260 ? -16 : 16)}px`,
                            top: `${hover.y + (hover.y > window.innerHeight - 210 ? -16 : 16)}px`,
                            transform: `translate(${hover.x > window.innerWidth - 260 ? '-100%' : '0'}, ${hover.y > window.innerHeight - 210 ? '-100%' : '0'})`,
                          },
                        },
                        h('div', { className: 'dshstat-daytip-head' }, fmt.dayLong(hovered.day)),
                        tipRow(t('timeline.legendInput'), hovered.tokens?.input ?? 0, 'var(--dshstat-blue)'),
                        tipRow(t('timeline.legendOutput'), hovered.tokens?.output ?? 0, 'var(--dshstat-green)'),
                        tipRow(t('timeline.legendCache'), hovered.tokens?.cacheRead ?? 0, 'var(--dshstat-cache)'),
                        (hovered.tokens?.cacheWrite ?? 0) > 0
                          ? tipRow(t('timeline.legendCacheWrite'), hovered.tokens.cacheWrite, 'var(--dshstat-cachewrite)')
                          : null,
                        tipRow(t('timeline.legendCost'), hovered.cost ?? 0, 'var(--dshstat-cost)', fmt.usd),
                        requestsAvailable ? tipRow(t('timeline.legendRequests'), hovered.requests ?? 0, 'var(--dshstat-request)') : null,
                        h(
                          'div',
                          { className: 'dshstat-daytip-total' },
                          h('span', null, t('timeline.tipTotal')),
                          h('b', null, fmt.compact(sumBuckets(hovered.tokens))),
                        ),
                      )
                    : null,
                ),
                requestsAvailable
                  ? h(
                      'div',
                      { className: 'dshstat-scale dshstat-scale-req', 'aria-hidden': 'true' },
                      TICKS.map((pct) => h('span', { key: pct, style: tickStyle(pct) }, fmt.compact((requestMax * (100 - pct)) / 100))),
                    )
                  : null,
                h(
                  'div',
                  { className: 'dshstat-scale dshstat-scale-cost', 'aria-hidden': 'true' },
                  TICKS.map((pct) => h('span', { key: pct, style: tickStyle(pct) }, fmt.usd((costMax * (100 - pct)) / 100))),
                ),
                h(
                  'div',
                  { className: 'dshstat-axis' },
                  h('span', null, fmt.dayLabel(series[0].day)),
                  peak ? h('span', null, t('timeline.peak', { date: fmt.dayLabel(peak.day), tokens: fmt.compact(metricOf(peak)) })) : h('span'),
                  h('span', null, fmt.dayLabel(series[series.length - 1].day)),
                ),
              ),
              active
                ? h(
                    'div',
                    { className: 'dshstat-detail' },
                    h('span', null, h('b', null, fmt.dayLong(active.day))),
                    h('span', null, fmt.int(sumBuckets(active.tokens)), ' ', t('unit.tokens')),
                    h('span', null, t('timeline.legendInput'), ' ', h('b', null, fmt.compact(active.tokens?.input ?? 0))),
                    h('span', null, t('timeline.legendOutput'), ' ', h('b', null, fmt.compact(active.tokens?.output ?? 0))),
                    h('span', null, t('timeline.legendCache'), ' ', h('b', null, fmt.compact(active.tokens?.cacheRead ?? 0))),
                    (active.tokens?.cacheWrite ?? 0) > 0
                      ? h('span', null, t('timeline.legendCacheWrite'), ' ', h('b', null, fmt.compact(active.tokens.cacheWrite)))
                      : null,
                    h('span', null, t('metrics.cacheHit'), ' ', h('b', null, formatHitRate(hitRate(active.tokens)))),
                    h('span', null, t('timeline.legendCost'), ' ', h('b', null, fmt.usd(active.cost))),
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
        { className: 'dshstat-card dshstat-cardcpu' },
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
      const [sort, setSort] = useState('cost')
      const [tip, setTip] = useState(null)
      const listRef = useRef(null)
      const [viewport, setViewport] = useState(0)
      const metric = sort === 'tokens' ? (model) => sumBuckets(model.tokens) : (model) => model.cost
      const ordered = useMemo(
        () => [...models].sort((left, right) => metric(right) - metric(left) || right.cost - left.cost),
        [models, sort],
      )
      const max = ordered.reduce((value, model) => Math.max(value, metric(model)), 0)
      const hovered = tip === null ? null : models.find((model) => model.id === tip.id) ?? null
      const show = (event, model) => {
        const nearRight = event.clientX > window.innerWidth - 280
        const nearBottom = event.clientY > window.innerHeight - 220
        setTip({ id: model.id, x: event.clientX + (nearRight ? -14 : 14), y: event.clientY + (nearBottom ? -14 : 14), flipX: nearRight, flipY: nearBottom })
      }
      useEffect(() => {
        const node = listRef.current
        if (!node) return
        const measure = () => {
          const rows = [...node.children].slice(0, MODELS_VISIBLE)
          if (rows.length === 0) {
            setViewport(0)
            return
          }
          const gap = parseFloat(getComputedStyle(node).rowGap) || 0
          const height = rows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0) + gap * (rows.length - 1)
          setViewport(Math.ceil(height))
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        return () => observer.disconnect()
      }, [models.length, sort])

      const tipRow = (label, value, color) =>
        h(
          'div',
          { className: 'dshstat-daytip-row' },
          h('span', null, h('i', { className: 'dshstat-dot', style: { background: color } }), label),
          h('b', null, fmt.compact(value)),
        )
      return h(
        'div',
        { className: 'dshstat-card dshstat-cardmodels' },
        h(
          'div',
          { className: 'dshstat-section' },
          h(
            'div',
            { className: 'dshstat-titlegroup' },
            h('h2', { className: 'dshstat-h2' }, t('models.title')),
            h('em', null, models.length),
          ),
          models.length > 1
            ? h(
                'div',
                { className: 'dshstat-seg', role: 'group' },
                h('button', { 'data-on': sort === 'tokens', onClick: () => setSort('tokens') }, t('card.sortTokens')),
                h('button', { 'data-on': sort === 'cost', onClick: () => setSort('cost') }, t('card.sortCost')),
              )
            : null,
        ),
        models.length === 0
          ? h('div', { className: 'dshstat-hint' }, t('models.empty'))
          : h(
              'div',
              { className: 'dshstat-models dshstat-scroll', ref: listRef, style: viewport > 0 ? { maxHeight: `${viewport}px` } : undefined },
              ordered.map((model) =>
                h(
                  'div',
                  {
                    key: model.id,
                    className: 'dshstat-model',
                    'data-hover': tip !== null && tip.id === model.id ? 'true' : 'false',
                    onMouseEnter: (event) => show(event, model),
                    onMouseMove: (event) => show(event, model),
                    onMouseLeave: () => setTip(null),
                  },
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
                        width: `${max > 0 ? Math.max(2, (metric(model) / max) * 100) : 0}%`,
                        background: model.explicit === false ? 'var(--dshstat-amber)' : undefined,
                      },
                    }),
                  ),
                  h(
                    'div',
                    { className: 'dshstat-model-row' },
                    h('span', { className: 'dshstat-model-num' }, fmt.compact(sumBuckets(model.tokens)), ' ', t('unit.tokens')),
                    model.explicit === false
                      ? h('span', { className: 'dshstat-tag' }, t('models.fallback'))
                      : h('span'),
                  ),
                ),
              ),
            ),
        hovered
          ? h(
              'div',
              {
                className: 'dshstat-daytip',
                style: {
                  left: `${tip.x}px`,
                  top: `${tip.y}px`,
                  transform: `translate(${tip.flipX ? '-100%' : '0'}, ${tip.flipY ? '-100%' : '0'})`,
                },
              },
              h('div', { className: 'dshstat-daytip-head' }, hovered.id),
              tipRow(t('timeline.legendInput'), hovered.tokens?.input ?? 0, 'var(--dshstat-blue)'),
              tipRow(t('timeline.legendOutput'), hovered.tokens?.output ?? 0, 'var(--dshstat-green)'),
              tipRow(t('timeline.legendCache'), hovered.tokens?.cacheRead ?? 0, 'var(--dshstat-cache)'),
              (hovered.tokens?.cacheWrite ?? 0) > 0
                ? tipRow(t('timeline.legendCacheWrite'), hovered.tokens.cacheWrite, 'var(--dshstat-cachewrite)')
                : null,
              h(
                'div',
                { className: 'dshstat-daytip-total' },
                h('span', null, t('metrics.cacheHit')),
                h('b', null, formatHitRate(hitRate(hovered.tokens))),
              ),
            )
          : null,
      )
    }

    /** Rows of session cards kept in view; the rest scroll. */
    const SESSION_ROWS = 4
    /** Model rows kept in view; the rest scroll. */
    const MODELS_VISIBLE = 4
    /** Card width the grid keeps; keep in sync with .dshstat-cards in the CSS. */
    const CARD_MIN = 272
    const CARD_GAP = 12
    const DEFAULT_CONTENT_WIDTH = 960
    const MIN_CONTENT_WIDTH = 680
    const MAX_CONTENT_WIDTH = 2400
    const CONTENT_GUTTER = 56
    const CONTENT_WIDTH_KEY = 'dsh-statistics:content-width'

    const GLOB_CACHE = new Map()

    function globToRegExp(pattern) {
      let compiled = GLOB_CACHE.get(pattern)
      if (compiled === undefined) {
        compiled = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
        GLOB_CACHE.set(pattern, compiled)
      }
      return compiled
    }

    function makeRateLookup(card, fallback) {
      const rules = (Array.isArray(card) ? card : []).map((rule) => ({ ...rule, compiled: globToRegExp(rule.match) }))
      const fallbackRate = fallback ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
      return (id) => {
        const model = id.includes('/') ? id.slice(id.indexOf('/') + 1) : id
        for (const rule of rules) if (rule.compiled.test(id) || rule.compiled.test(model)) return rule
        return fallbackRate
      }
    }

    /** What each token bucket cost this session, in the snapshot's currency. */
    function costPartsOf(row, lookup) {
      const parts = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
      for (const model of row.models ?? []) {
        const rate = lookup(model.id)
        parts.input += ((model.tokens?.input ?? 0) * (rate.input ?? 0)) / 1_000_000
        parts.output += ((model.tokens?.output ?? 0) * (rate.output ?? 0)) / 1_000_000
        parts.cacheRead += ((model.tokens?.cacheRead ?? 0) * (rate.cacheRead ?? 0)) / 1_000_000
        parts.cacheWrite += ((model.tokens?.cacheWrite ?? 0) * (rate.cacheWrite ?? 0)) / 1_000_000
      }
      return parts
    }

    function Donut({ parts, center, share, fmt, size = 68 }) {
      const sum = parts.reduce((total, part) => total + part.value, 0)
      const radius = 27
      const circumference = 2 * Math.PI * radius
      let offset = 0
      return h(
        'div',
        { className: 'dshstat-donut', style: { width: `${size}px`, height: `${size}px` } },
        h(
          'svg',
          { viewBox: '0 0 68 68', width: size, height: size, 'aria-hidden': true },
          h('circle', { cx: 34, cy: 34, r: radius, fill: 'none', stroke: 'var(--dshstat-track)', strokeWidth: 7 }),
          sum > 0
            ? parts.map((part) => {
                const length = (part.value / sum) * circumference
                const arc = h('circle', {
                  key: part.key,
                  cx: 34,
                  cy: 34,
                  r: radius,
                  fill: 'none',
                  stroke: part.color,
                  strokeWidth: 7,
                  strokeDasharray: `${length} ${circumference - length}`,
                  strokeDashoffset: -offset,
                  transform: 'rotate(-90 34 34)',
                })
                offset += length
                return arc
              })
            : null,
        ),
        h('div', { className: 'dshstat-donut-center' }, h('b', null, center), h('span', null, fmt.pct((share ?? 0) * 100))),
      )
    }

    function SessionCard({ row, share, lookup, t, fmt, onTitleHover, onOpen }) {
      const parts = costPartsOf(row, lookup)
      const cpu = row.cpu && row.cpu.cpuMs > 0 ? fmt.duration(row.cpu.cpuMs) : t('cpu.noSample')
      const metric = (label, value) => [h('span', { key: `${label}-l` }, label), h('b', { key: `${label}-v` }, value)]
      return h(
        'article',
        {
          className: 'dshstat-scard',
          role: 'button',
          tabIndex: 0,
          title: t('card.open'),
          onClick: () => onOpen?.(row.sessionId),
          onKeyDown: (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            onOpen?.(row.sessionId)
          },
        },
        h(
          'div',
          { className: 'dshstat-scard-head' },
          h(
            'b',
            {
              onMouseEnter: (event) => onTitleHover(event, row),
              onMouseLeave: () => onTitleHover(null),
            },
            row.title ?? t('table.untitled'),
          ),
          h('div', { className: 'dshstat-scard-when' }, h('span', null, fmt.relative(row.lastAt)), h('span', null, row.lastAt ? fmt.date(row.lastAt) : '—')),
        ),
        h(
          'div',
          { className: 'dshstat-pills' },
          row.workspace ? h('span', { className: 'dshstat-pill', title: row.cwd ?? row.workspace }, row.workspace) : null,
          row.origin === 'subagent' ? h('span', { className: 'dshstat-pill' }, t('table.subagent')) : null,
          row.priced === false ? h('span', { className: 'dshstat-pill' }, t('table.unpriced')) : null,
        ),
        h(
          'div',
          { className: 'dshstat-scard-body' },
          h(
            'div',
            {
              className: 'dshstat-donut-wrap',
              onMouseEnter: (event) =>
                onTitleHover(event, {
                  title: t('card.composition'),
                  rows: [
                    [t('timeline.legendInput'), fmt.compact(row.tokens.input), 'var(--dshstat-blue)'],
                    [t('timeline.legendOutput'), fmt.compact(row.tokens.output), 'var(--dshstat-green)'],
                    [t('timeline.legendCache'), fmt.compact(row.tokens.cacheRead), 'var(--dshstat-cache)'],
                    ...((row.tokens?.cacheWrite ?? 0) > 0
                      ? [[t('timeline.legendCacheWrite'), fmt.compact(row.tokens.cacheWrite), 'var(--dshstat-cachewrite)']]
                      : []),
                  ],
                  footer: [t('kpi.tokens'), fmt.compact(row.totalTokens)],
                }),
              onMouseLeave: () => onTitleHover(null),
            },
            h(Donut, {
              parts: [
              { key: 'input', value: parts.input, color: 'var(--dshstat-blue)' },
              { key: 'output', value: parts.output, color: 'var(--dshstat-green)' },
              { key: 'cacheRead', value: parts.cacheRead, color: 'var(--dshstat-cache)' },
              { key: 'cacheWrite', value: parts.cacheWrite, color: 'var(--dshstat-cachewrite)' },
            ],
              center: fmt.usd(row.cost),
              share,
              fmt,
            }),
          ),
          h(
            'div',
            { className: 'dshstat-metrics' },
            metric(t('card.turns'), t('card.turnsValue', { turns: fmt.int(row.turns), steps: fmt.int(row.steps) })),
            metric(t('kpi.tokens'), fmt.compact(row.totalTokens)),
            metric(t('kpi.cost'), fmt.usd(row.cost)),
            metric(t('table.cpu'), cpu),
          ),
        ),
        h(
          'div',
          { className: 'dshstat-scard-foot' },
          h(
            'span',
            {
              className: 'dshstat-scard-model',
              onMouseEnter: (event) => onTitleHover(event, { title: row.model ?? t('cpu.noSample') }),
              onMouseLeave: () => onTitleHover(null),
            },
            row.model ?? t('cpu.noSample'),
          ),
        ),
      )
    }

    function ConversationGrid({ rows, rangeCost, rates, onOpen, t, fmt }) {
      const lookup = useMemo(() => makeRateLookup(rates?.card, rates?.fallback), [rates?.card, rates?.fallback])
      const [sort, setSort] = useState('recent')
      const [workspace, setWorkspace] = useState(null)
      const [query, setQuery] = useState('')
      const [tip, setTip] = useState(null)

      const workspaces = useMemo(() => {
        const counts = new Map()
        for (const row of rows) {
          const name = row.workspace ?? ''
          if (name.length === 0) continue
          counts.set(name, (counts.get(name) ?? 0) + 1)
        }
        return [...counts.entries()].sort((left, right) => right[1] - left[1])
      }, [rows])

      const visible = useMemo(() => {
        const needle = query.trim().toLowerCase()
        const list = rows.filter((row) => {
          if (workspace !== null && (row.workspace ?? '') !== workspace) return false
          if (needle.length === 0) return true
          const haystack = [row.title, row.workspace, row.cwd, row.model].filter(Boolean).join(' ').toLowerCase()
          return haystack.includes(needle)
        })
        const value =
          sort === 'tokens' ? (row) => row.totalTokens : sort === 'cost' ? (row) => row.cost : (row) => row.lastAt ?? 0
        return [...list].sort((left, right) => value(right) - value(left))
      }, [rows, sort, workspace, query])

      // How many cards actually fit: the CSS auto-fill decides it, but a row that
      // ends half empty (7 + 5 of twelve) reads as a mistake, so measure the track
      // count and even the cards out across the rows.
      const gridRef = useRef(null)
      const [fitColumns, setFitColumns] = useState(0)
      const [viewportRows, setViewportRows] = useState(0)
      useEffect(() => {
        const node = gridRef.current
        if (!node) return
        const measure = () => {
          const width = node.clientWidth
          if (width > 0) setFitColumns(Math.max(1, Math.floor((width + CARD_GAP) / (CARD_MIN + CARD_GAP))))
          const origin = node.getBoundingClientRect().top
          const rows = new Map()
          for (const card of node.children) {
            const rect = card.getBoundingClientRect()
            const top = Math.round(rect.top - origin)
            rows.set(top, Math.max(rows.get(top) ?? 0, rect.height))
          }
          const heights = [...rows.entries()].sort((left, right) => left[0] - right[0]).slice(0, SESSION_ROWS).map(([, height]) => height)
          if (heights.length === 0) {
            setViewportRows(0)
            return
          }
          setViewportRows(Math.round(heights.reduce((sum, height) => sum + height, 0) + (heights.length - 1) * CARD_GAP))
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        return () => observer.disconnect()
      }, [visible])

      const columns = useMemo(() => {
        if (fitColumns < 2) return 0
        const count = visible.length
        if (count === 0) return fitColumns
        const spread = count > fitColumns ? Math.ceil(count / Math.ceil(count / fitColumns)) : Math.max(count, Math.ceil(fitColumns / 2))
        return Math.min(fitColumns, spread)
      }, [fitColumns, visible.length])

      const onTitleHover = (event, rowOrContent) => {
        if (event === null) {
          setTip(null)
          return
        }
        const target = event.currentTarget
        const ready = rowOrContent !== null && rowOrContent !== undefined && Array.isArray(rowOrContent.rows)
        if (!ready && target.scrollWidth <= target.clientWidth) return
        const rect = target.getBoundingClientRect()
        const width = Math.min(560, Math.max(240, window.innerWidth - 48))
        const content = ready ? rowOrContent : { title: rowOrContent.title ?? t('table.untitled'), cwd: rowOrContent.cwd }
        setTip({
          ...content,
          left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)),
          top: rect.bottom + 6,
          width,
        })
      }

      if (rows.length === 0) {
        return h('div', { className: 'dshstat-card' }, h('div', { className: 'dshstat-state' }, t('table.empty')))
      }

      return h(
        'div',
        { className: 'dshstat-card' },
        h(
          'div',
          { className: 'dshstat-sessionhead' },
          h(
            'div',
            { className: 'dshstat-titlegroup' },
            h('h2', { className: 'dshstat-h2' }, t('table.title')),
            h('em', null, rows.length),
          ),
          h('input', {
            className: 'dshstat-search',
            type: 'search',
            value: query,
            placeholder: t('card.search'),
            'aria-label': t('card.search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          h(
            'div',
            { className: 'dshstat-seg', role: 'group' },
            h('button', { 'data-on': sort === 'recent', onClick: () => setSort('recent') }, t('card.sortRecent')),
            h('button', { 'data-on': sort === 'tokens', onClick: () => setSort('tokens') }, t('card.sortTokens')),
            h('button', { 'data-on': sort === 'cost', onClick: () => setSort('cost') }, t('card.sortCost')),
          ),
        ),
        h(
          'div',
          { className: 'dshstat-filterpills' },
          h(
            'button',
            { 'data-on': workspace === null, onClick: () => setWorkspace(null) },
            t('card.all'),
            h('em', null, rows.length),
          ),
          workspaces.map(([name, count]) =>
            h(
              'button',
              { key: name, 'data-on': workspace === name, onClick: () => setWorkspace(workspace === name ? null : name) },
              name,
              h('em', null, count),
            ),
          ),
        ),
        h(
          'div',
          {
            className: 'dshstat-cards dshstat-scroll',
            ref: gridRef,
            style: {
              ...(columns > 0 ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : null),
              ...(viewportRows > 0 ? { maxHeight: `${viewportRows}px` } : null),
            },
          },
          visible.map((row) =>
            h(SessionCard, {
              key: row.sessionId,
              row,
              share: rangeCost > 0 ? row.cost / rangeCost : 0,
              lookup,
              t,
              fmt,
              onTitleHover,
              onOpen,
            }),
          ),
        ),
        tip
          ? h(
              'div',
              { className: 'dshstat-tip', style: { left: `${tip.left}px`, top: `${tip.top}px`, maxWidth: `${tip.width}px` } },
              h('b', null, tip.title),
              tip.cwd ? h('span', null, tip.cwd) : null,
              (tip.rows ?? []).map(([label, value, color]) =>
                h(
                  'div',
                  { key: label, className: 'dshstat-tip-row' },
                  h('span', null, color ? h('i', { className: 'dshstat-dot', style: { background: color } }) : null, label),
                  h('b', null, value),
                ),
              ),
              tip.footer
                ? h('div', { className: 'dshstat-tip-total' }, h('span', null, tip.footer[0]), h('b', null, tip.footer[1]))
                : null,
            )
          : null,
      )
    }

    function Panel({ locale, fallbackLocale, openSession }) {
      const { t, fmt } = useLocaleFace(locale, fallbackLocale)
      const { status, data, error, refresh, auto, setAuto } = useSnapshotData()
      const [rangeDays, setRangeDays] = useState(0)
      const [contentWidth, setContentWidth] = useState(() => {
        try {
          const saved = Number(localStorage.getItem(CONTENT_WIDTH_KEY))
          if (Number.isFinite(saved) && saved >= MIN_CONTENT_WIDTH) return Math.min(MAX_CONTENT_WIDTH, saved)
        } catch {
          /* storage may be unavailable; the default width still applies */
        }
        return DEFAULT_CONTENT_WIDTH
      })

      useEffect(() => {
        try {
          localStorage.setItem(CONTENT_WIDTH_KEY, String(contentWidth))
        } catch {
          /* a refused write only costs the preference */
        }
      }, [contentWidth])

      const startResize = (side) => (event) => {
        event.preventDefault()
        const startX = event.clientX
        const startWidth = contentWidth
        const move = (moveEvent) => {
          const delta = moveEvent.clientX - startX
          const next = Math.round(side === 'right' ? startWidth + delta * 2 : startWidth - delta * 2)
          setContentWidth(Math.max(MIN_CONTENT_WIDTH, Math.min(MAX_CONTENT_WIDTH, next)))
        }
        const stop = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', stop)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
        }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', stop)
      }

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
      const hostApi = data?.api ?? 1
      const staleHost = Boolean(data) && hostApi !== SNAPSHOT_API

      return h(
        'div',
        { className: 'dshstat-shell' },
        h(
          'div',
          { className: 'dshstat-root' },
          h(StyleTag),
          h(
            'div',
            { className: 'dshstat-inner', style: { maxWidth: `min(${contentWidth}px, calc(100% - ${CONTENT_GUTTER}px))` } },
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

          staleHost
            ? h('div', { className: 'dshstat-notice' }, t('panel.staleHost', { host: hostApi, want: SNAPSHOT_API }))
            : null,

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
                write: (totals.cacheWrite ?? 0) > 0 ? t('kpi.tokensWriteHint', { write: fmt.compact(totals.cacheWrite) }) : '',
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
          h(Timeline, { series, t, fmt, requestsAvailable: !staleHost, key: `timeline-${rangeDays}` }),

          h(
            'div',
            { className: 'dshstat-split' },
            h(CpuCard, { cpu: data?.cpu, t, fmt }),
            h(ModelsCard, { models: view?.models ?? [], t, fmt }),
          ),

          h(ConversationGrid, {
            rows: view?.rows ?? [],
            rangeCost: view?.totals.cost ?? 0,
            rates: { card: data?.config?.rateCard, fallback: data?.config?.fallbackRate },
            onOpen: openSession,
            t,
            fmt,
          }),
          ),
        ),
        h('div', {
          className: 'dshstat-handle',
          'data-side': 'left',
          role: 'separator',
          'aria-orientation': 'vertical',
          style: { left: `calc((100% - min(${contentWidth}px, calc(100% - ${CONTENT_GUTTER}px))) / 2 - 10px)` },
          onPointerDown: startResize('left'),
        }),
        h('div', {
          className: 'dshstat-handle',
          'data-side': 'right',
          role: 'separator',
          'aria-orientation': 'vertical',
          style: { right: `calc((100% - min(${contentWidth}px, calc(100% - ${CONTENT_GUTTER}px))) / 2 - 10px)` },
          onPointerDown: startResize('right'),
        }),
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

        const openSession = (sessionId) => {
          const workspace = ctx.get('uiWorkspace')
          if (workspace && typeof workspace.openSession === 'function') workspace.openSession(sessionId)
        }

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            { name: 'main', key: PANEL_ID },
            () => h(Panel, { locale, fallbackLocale, openSession }),
          ),
        )
      },
    }
  },
})
