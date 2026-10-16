import { getTursoClient } from '../../../../lib/clients/turso'
import type { AppContext } from '../../../../lib/utils/types'

/**
 * GET /api/stats/public
 * Returns real, live database metrics for public transparency.
 * Supports optional ?breakdown=daily query param.
 */
export const GET = async (c: AppContext) => {
  try {
    const db = getTursoClient()
    const url = new URL(c.req.url)
    const includeBreakdown = url.searchParams.get('breakdown') === 'daily'

    const [jobRes, analyticsRes, dailyRes, topJobsRes] = await Promise.all([
      db.execute(`
        SELECT 
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete_jobs,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
          SUM(CASE WHEN status NOT IN ('complete', 'failed') THEN 1 ELSE 0 END) as pending_jobs,
          COALESCE(SUM(page_count), 0) as total_pages,
          COALESCE(SUM(zip_size_bytes), 0) as total_bytes
        FROM jobs
      `),
      db.execute(`
        SELECT 
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(*) as total_events,
          SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END) as total_pageviews,
          (
            SELECT COUNT(*) FROM (
              SELECT session_id FROM analytics_events GROUP BY session_id HAVING COUNT(DISTINCT DATE(created_at / 1000, 'unixepoch')) > 1
            )
          ) as returning_visitors
        FROM analytics_events
      `),
      db.execute(`
        SELECT 
          DATE(created_at / 1000, 'unixepoch') as day,
          COUNT(DISTINCT session_id) as visitors,
          COUNT(*) as events,
          SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END) as views
        FROM analytics_events
        WHERE created_at > 0
        GROUP BY day
        ORDER BY day ASC
      `),
      db.execute(`
        SELECT 
          product_name,
          page_count,
          zip_size_bytes
        FROM jobs 
        WHERE status = 'complete' 
        ORDER BY page_count DESC 
        LIMIT 6
      `),
    ])

    const j = (jobRes.rows[0] || {}) as Record<string, unknown>
    const a = (analyticsRes.rows[0] || {}) as Record<string, unknown>

    const days = dailyRes.rows as unknown as Array<{
      day: string
      visitors: number
      events: number
      views: number
    }>
    const visitorList = days.map((d) => Number(d.visitors || 0)).sort((x, y) => x - y)
    const viewList = days.map((d) => Number(d.views || 0)).sort((x, y) => x - y)
    const totalDays = days.length || 1

    const sumDailyVisitors = visitorList.reduce((acc, curr) => acc + curr, 0)
    const avgDailyVisitors = Number((sumDailyVisitors / totalDays).toFixed(1))
    const midIdx = Math.floor(visitorList.length / 2)
    const medianDailyVisitors =
      visitorList.length % 2 === 0
        ? Number(((visitorList[midIdx - 1] + visitorList[midIdx]) / 2).toFixed(1))
        : visitorList[midIdx] || 0

    const sumDailyViews = viewList.reduce((acc, curr) => acc + curr, 0)
    const avgDailyViews = Number((sumDailyViews / totalDays).toFixed(1))
    const medianDailyViews =
      viewList.length % 2 === 0
        ? Number(((viewList[midIdx - 1] + viewList[midIdx]) / 2).toFixed(1))
        : viewList[midIdx] || 0

    const topJobs = topJobsRes.rows.map((r: unknown) => {
      const row = r as Record<string, unknown>
      const bytes = Number(row.zip_size_bytes || 0)
      const mb = (bytes / (1024 * 1024)).toFixed(1)
      return {
        product_name: String(row.product_name || 'Unknown'),
        page_count: Number(row.page_count || 0),
        size_mb: `${mb} MB`,
      }
    })

    const totalBytes = Number(j.total_bytes || 0)
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1)

    return c.json({
      ok: true,
      data: {
        total_jobs: Number(j.total_jobs || 0),
        complete_jobs: Number(j.complete_jobs || 0),
        failed_jobs: Number(j.failed_jobs || 0),
        pending_jobs: Number(j.pending_jobs || 0),
        total_pages: Number(j.total_pages || 0),
        total_size_mb: `${totalMb} MB`,
        total_sessions: Number(a.total_sessions || 0),
        total_pageviews: Number(a.total_pageviews || 0),
        total_events: Number(a.total_events || 0),
        returning_visitors: Number(a.returning_visitors || 0),
        active_days_tracked: totalDays,
        daily_metrics: {
          average_visitors: avgDailyVisitors,
          median_visitors: medianDailyVisitors,
          average_pageviews: avgDailyViews,
          median_pageviews: medianDailyViews,
          min_visitors: visitorList[0] || 0,
          max_visitors: visitorList[visitorList.length - 1] || 0,
        },
        top_crawls: topJobs,
        ...(includeBreakdown ? { daily_breakdown: days } : {}),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database query failed'
    return c.json({ ok: false, error: message }, 500)
  }
}
