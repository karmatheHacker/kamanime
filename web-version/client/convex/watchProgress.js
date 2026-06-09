import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const get = query({
  args: { animeId: v.number() },
  handler: async (ctx, { animeId }) => {
    return await ctx.db
      .query('watchProgress')
      .withIndex('by_anime', (q) => q.eq('animeId', animeId))
      .first()
  }
})

export const set = mutation({
  args: { animeId: v.number(), episodeNumber: v.number(), progress: v.float64() },
  handler: async (ctx, { animeId, episodeNumber, progress }) => {
    const existing = await ctx.db
      .query('watchProgress')
      .withIndex('by_anime', (q) => q.eq('animeId', animeId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { episodeNumber, progress, lastWatched: Date.now() })
    } else {
      await ctx.db.insert('watchProgress', { animeId, episodeNumber, progress, lastWatched: Date.now() })
    }
  }
})

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query('watchProgress').collect()
  }
})
