import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const recordVisit = mutation({
  args: { path: v.string(), sessionId: v.string() },
  handler: async (ctx, { path, sessionId }) => {
    await ctx.db.insert('pageViews', { path, sessionId, timestamp: Date.now() })
  }
})

export const getStats = query({
  handler: async (ctx) => {
    const allViews = await ctx.db.query('pageViews').collect()
    const now = Date.now()
    const fiveMin = now - 5 * 60 * 1000
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    const uniqueSessions = new Set(allViews.map((v) => v.sessionId))
    const activeSessions = new Set(
      allViews.filter((v) => v.timestamp > fiveMin).map((v) => v.sessionId)
    )
    const todayViews = allViews.filter((v) => v.timestamp > todayStart)
    const todayUnique = new Set(todayViews.map((v) => v.sessionId))

    // Daily stats — last 30 days
    const dailyStats = {}
    for (const view of allViews.filter((v) => v.timestamp > thirtyDaysAgo)) {
      const date = new Date(view.timestamp).toISOString().split('T')[0]
      if (!dailyStats[date]) dailyStats[date] = { pageViews: 0, uniqueSessions: new Set() }
      dailyStats[date].pageViews++
      dailyStats[date].uniqueSessions.add(view.sessionId)
    }
    const dailyStatsClean = Object.fromEntries(
      Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, v]) => [d, { pageViews: v.pageViews, uniqueVisitors: v.uniqueSessions.size }])
    )

    const recentActivity = [...allViews]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100)
      .map((v) => ({
        path: v.path,
        sessionId: v.sessionId.slice(0, 8),
        timestamp: new Date(v.timestamp).toISOString()
      }))

    return {
      totalPageViews: allViews.length,
      totalUniqueVisitors: uniqueSessions.size,
      activeNow: activeSessions.size,
      todayPageViews: todayViews.length,
      todayUniqueVisitors: todayUnique.size,
      recentActivity,
      dailyStats: dailyStatsClean
    }
  }
})
