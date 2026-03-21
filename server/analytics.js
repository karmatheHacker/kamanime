import fs from 'fs'
import path from 'path'
import os from 'os'
import { mkdirp } from 'mkdirp'

const dataDir = path.join(os.homedir(), 'Documents', 'Zenshin')
const analyticsPath = path.join(dataDir, 'analytics.json')

mkdirp.sync(dataDir)

export default class Analytics {
  constructor() {
    this.data = this.load()
  }

  load() {
    if (!fs.existsSync(analyticsPath)) {
      const initial = { totalPageViews: 0, uniqueIps: [], recentActivity: [], dailyStats: {} }
      fs.writeFileSync(analyticsPath, JSON.stringify(initial, null, 2))
      return initial
    }
    try {
      return JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'))
    } catch {
      return { totalPageViews: 0, uniqueIps: [], recentActivity: [], dailyStats: {} }
    }
  }

  save() {
    try {
      fs.writeFileSync(analyticsPath, JSON.stringify(this.data, null, 2))
    } catch (e) {
      console.error('Analytics save error:', e)
    }
  }

  record(ip, pagePath, userAgent) {
    const now = new Date()
    const dateKey = now.toISOString().split('T')[0]

    this.data.totalPageViews++

    if (!this.data.uniqueIps.includes(ip)) {
      this.data.uniqueIps.push(ip)
    }

    if (!this.data.dailyStats[dateKey]) {
      this.data.dailyStats[dateKey] = { pageViews: 0, uniqueIps: [] }
    }
    this.data.dailyStats[dateKey].pageViews++
    if (!this.data.dailyStats[dateKey].uniqueIps.includes(ip)) {
      this.data.dailyStats[dateKey].uniqueIps.push(ip)
    }

    this.data.recentActivity.unshift({
      ip,
      path: pagePath,
      timestamp: now.toISOString(),
      userAgent: (userAgent || '').substring(0, 120)
    })
    if (this.data.recentActivity.length > 500) {
      this.data.recentActivity = this.data.recentActivity.slice(0, 500)
    }

    // Prune daily stats older than 90 days
    const cutoff = new Date(now - 90 * 24 * 60 * 60 * 1000)
    for (const date of Object.keys(this.data.dailyStats)) {
      if (new Date(date) < cutoff) delete this.data.dailyStats[date]
    }

    this.save()
  }

  getStats() {
    const now = new Date()
    const fiveMin = new Date(now - 5 * 60 * 1000)
    const todayKey = now.toISOString().split('T')[0]

    const activeIps = new Set(
      this.data.recentActivity
        .filter((a) => new Date(a.timestamp) > fiveMin)
        .map((a) => a.ip)
    )

    const todayStats = this.data.dailyStats[todayKey] || { pageViews: 0, uniqueIps: [] }

    const last30Days = Object.entries(this.data.dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)

    return {
      totalPageViews: this.data.totalPageViews,
      totalUniqueVisitors: this.data.uniqueIps.length,
      activeNow: activeIps.size,
      todayPageViews: todayStats.pageViews,
      todayUniqueVisitors: todayStats.uniqueIps.length,
      recentActivity: this.data.recentActivity.slice(0, 100),
      dailyStats: Object.fromEntries(last30Days)
    }
  }
}
