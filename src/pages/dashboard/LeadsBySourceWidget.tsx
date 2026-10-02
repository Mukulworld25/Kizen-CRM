import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ArrowUpRight, Award, BarChart2, PieChart as PieIcon, Sparkles } from 'lucide-react'

interface LeadsBySourceWidgetProps {
  dateRange?: { start?: string; end?: string }
}

interface RawSourceItem {
  name: string
  value: number
}

interface ProcessedSourceItem {
  rawName: string
  label: string
  value: number
  percentage: number
  color: string
}

const SOURCE_COLORS: Record<string, string> = {
  website: '#3B82F6',       // Electric Blue
  meta_ads: '#EC4899',      // Pink / Meta
  google_ads: '#F59E0B',    // Amber / Google Gold
  whatsapp: '#10B981',      // Emerald Green
  walk_in: '#8B5CF6',       // Purple
  referral: '#06B6D4',      // Teal / Cyan
  instagram: '#E1306C',     // Instagram Rose
  facebook: '#1877F2',      // Facebook Blue
  college_visit: '#6366F1', // Indigo
  other: '#64748B',         // Slate Gray
}

const FALLBACK_PALETTE = [
  '#3B82F6', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6',
  '#06B6D4', '#6366F1', '#E1306C', '#14B8A6', '#F97316', '#64748B'
]

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  whatsapp: 'WhatsApp',
  walk_in: 'Walk-in',
  referral: 'Referral',
  instagram: 'Instagram',
  facebook: 'Facebook',
  college_visit: 'College Visit',
  other: 'Other / Direct',
}

function formatSourceName(raw: string): string {
  if (!raw) return 'Unknown'
  const normalized = raw.toLowerCase().trim()
  if (SOURCE_LABELS[normalized]) return SOURCE_LABELS[normalized]
  return raw
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getSourceColor(raw: string, index: number): string {
  const normalized = raw.toLowerCase().trim()
  if (SOURCE_COLORS[normalized]) return SOURCE_COLORS[normalized]
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]
}

export function LeadsBySourceWidget({ dateRange }: LeadsBySourceWidgetProps) {
  const navigate = useNavigate()
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut')

  // Call the existing get_lead_source_counts RPC
  const { data: rawSources = [], isLoading } = useQuery<RawSourceItem[]>({
    queryKey: ['dashboard-lead-source-counts', dateRange?.start, dateRange?.end],
    queryFn: async (): Promise<RawSourceItem[]> => {
      const { data, error } = await supabase.rpc('get_lead_source_counts', {
        p_start: dateRange?.start || null,
        p_end: dateRange?.end || null,
      })
      if (error) {
        console.error('get_lead_source_counts error:', error)
        return []
      }
      return (data ?? []).map((r: any) => ({
        name: String(r.name || 'other'),
        value: Number(r.value || 0),
      }))
    },
  })

  // Format data with friendly labels, colors, and percentages
  const { processedData, totalCount } = useMemo(() => {
    const total = rawSources.reduce((sum: number, item: RawSourceItem) => sum + item.value, 0)
    const items: ProcessedSourceItem[] = rawSources.map((item: RawSourceItem, idx: number) => ({
      rawName: item.name,
      label: formatSourceName(item.name),
      value: item.value,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      color: getSourceColor(item.name, idx),
    }))
    return { processedData: items, totalCount: total }
  }, [rawSources])

  const handleSourceClick = (sourceName: string) => {
    if (!sourceName) return
    navigate(`/leads?source=${encodeURIComponent(sourceName)}`)
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-card-in h-full flex flex-col" style={{ animationDelay: '320ms' }}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(245, 166, 35, 0.1)', color: 'var(--kizen-gold)' }}>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Leads by Source</h2>
              {totalCount > 0 && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {totalCount.toLocaleString()} leads
                </span>
              )}
            </div>
            <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
              Acquisition channels &middot; Click segment to filter
            </p>
          </div>
        </div>

        {/* Donut vs Bar View Switcher */}
        {totalCount > 0 && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`p-1.5 rounded-md text-xs transition-all flex items-center gap-1 ${
                chartType === 'donut'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Donut Chart View"
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md text-xs transition-all flex items-center gap-1 ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Bar Chart View"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 flex-1 animate-pulse space-y-3">
            <div className="w-28 h-28 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-amber-500 animate-spin" />
            <span className="text-xs text-slate-400">Loading acquisition sources...</span>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
            <Award style={{ width: 32, height: 32, color: 'var(--muted-foreground)', opacity: 0.3 }} />
            <p className="text-sm mt-3 font-semibold" style={{ color: 'var(--muted-foreground)' }}>No Leads in this Period</p>
            <p className="text-xs mt-1 max-w-[220px]" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
              No acquisition data matches the selected date filter. Try selecting 'Till Date' to see all-time source breakdown.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Area */}
            <div className="relative w-full h-[185px]">
              {chartType === 'donut' ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processedData}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                        onClick={(entry: any) => {
                          if (entry && entry.rawName) {
                            handleSourceClick(entry.rawName)
                          }
                        }}
                        cursor="pointer"
                      >
                        {processedData.map((entry: ProcessedSourceItem, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="cursor-pointer hover:opacity-85 transition-opacity"
                            onClick={() => handleSourceClick(entry.rawName)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          background: 'var(--popover)',
                          border: '1px solid var(--border)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                          fontSize: '11px',
                        }}
                        formatter={(val: any, _name: any, item: any) => [
                          `${Number(val).toLocaleString()} leads (${item.payload.percentage}%)`,
                          item.payload.label,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center donut label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-black font-mono tracking-tight" style={{ color: 'var(--foreground)' }}>
                      {totalCount.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Total
                    </span>
                  </div>
                </>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={processedData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#7A90B0' }} />
                    <YAxis
                      dataKey="label"
                      type="category"
                      width={80}
                      tick={{ fontSize: 10, fill: '#7A90B0' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                      }}
                      formatter={(val: any, _name: any, item: any) => [
                        `${Number(val).toLocaleString()} leads (${item.payload.percentage}%)`,
                        item.payload.label,
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 6, 6, 0]}
                      cursor="pointer"
                      onClick={(entry: any) => {
                        if (entry && entry.rawName) {
                          handleSourceClick(entry.rawName)
                        }
                      }}
                    >
                      {processedData.map((entry: ProcessedSourceItem, index: number) => (
                        <Cell
                          key={`bar-cell-${index}`}
                          fill={entry.color}
                          className="cursor-pointer hover:opacity-85 transition-opacity"
                          onClick={() => handleSourceClick(entry.rawName)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Clickable Breakdown List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              {processedData.map((item: ProcessedSourceItem) => (
                <div
                  key={item.rawName}
                  onClick={() => handleSourceClick(item.rawName)}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer transition-all hover:scale-[1.01] group border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80"
                  title={`Click to filter leads by ${item.label}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium tabular-nums w-8 text-right">
                      {item.percentage}%
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
