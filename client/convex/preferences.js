import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getAll = query({
  handler: async (ctx) => {
    const docs = await ctx.db.query('preferences').collect()
    return Object.fromEntries(docs.map((d) => [d.key, d.value]))
  }
})

export const set = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query('preferences')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { value })
    } else {
      await ctx.db.insert('preferences', { key, value })
    }
  }
})
