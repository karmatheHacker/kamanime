import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const torrentFields = {
  magnet: v.string(),
  name: v.optional(v.string()),
  length: v.optional(v.number()),
  downloaded: v.optional(v.number()),
  uploaded: v.optional(v.number()),
  downloadSpeed: v.optional(v.number()),
  uploadSpeed: v.optional(v.number()),
  progress: v.optional(v.number()),
  done: v.optional(v.boolean())
}

// Called by Express every 2 seconds to push full WebTorrent state
export const syncAll = mutation({
  args: {
    clientDownloadSpeed: v.number(),
    clientUploadSpeed: v.number(),
    torrents: v.array(v.object(torrentFields))
  },
  handler: async (ctx, { clientDownloadSpeed, clientUploadSpeed, torrents }) => {
    // Upsert client stats
    const stats = await ctx.db.query('clientStats').first()
    if (stats) {
      await ctx.db.patch(stats._id, { downloadSpeed: clientDownloadSpeed, uploadSpeed: clientUploadSpeed })
    } else {
      await ctx.db.insert('clientStats', { downloadSpeed: clientDownloadSpeed, uploadSpeed: clientUploadSpeed })
    }

    // Sync torrents: upsert active, delete removed
    const existing = await ctx.db.query('torrents').collect()
    const existingMap = new Map(existing.map((t) => [t.magnet, t._id]))

    for (const torrent of torrents) {
      const id = existingMap.get(torrent.magnet)
      if (id) {
        await ctx.db.patch(id, { ...torrent, updatedAt: Date.now() })
        existingMap.delete(torrent.magnet)
      } else {
        await ctx.db.insert('torrents', { ...torrent, updatedAt: Date.now() })
      }
    }

    // Remove torrents no longer in WebTorrent
    for (const [, id] of existingMap) {
      await ctx.db.delete(id)
    }
  }
})

// React reads this — reactive, updates automatically
export const getAll = query({
  handler: async (ctx) => {
    const torrents = await ctx.db.query('torrents').collect()
    const clientStats = await ctx.db.query('clientStats').first()
    return {
      torrents,
      clientDownloadSpeed: clientStats?.downloadSpeed ?? 0,
      clientUploadSpeed: clientStats?.uploadSpeed ?? 0
    }
  }
})

// Called when a torrent is removed
export const remove = mutation({
  args: { magnet: v.string() },
  handler: async (ctx, { magnet }) => {
    const doc = await ctx.db.query('torrents').withIndex('by_magnet', (q) => q.eq('magnet', magnet)).first()
    if (doc) await ctx.db.delete(doc._id)
  }
})
