import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const upsert = mutation({
  args: { anilistId: v.number(), name: v.string(), avatar: v.optional(v.string()) },
  handler: async (ctx, { anilistId, name, avatar }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_anilist_id', (q) => q.eq('anilistId', anilistId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { name, avatar, lastSeen: Date.now() })
    } else {
      await ctx.db.insert('users', { anilistId, name, avatar, firstSeen: Date.now(), lastSeen: Date.now() })
    }
  }
})

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('users').order('desc').collect()
  }
})

export const updatePublicKey = mutation({
  args: { anilistId: v.number(), publicKey: v.string() },
  handler: async (ctx, { anilistId, publicKey }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_anilist_id', (q) => q.eq('anilistId', anilistId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { publicKey })
    }
  }
})

export const getPublicKey = query({
  args: { anilistId: v.number() },
  handler: async (ctx, { anilistId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_anilist_id', (q) => q.eq('anilistId', anilistId))
      .first()
    return user?.publicKey ?? null
  }
})

export const getPublicKeys = query({
  args: { anilistIds: v.array(v.number()) },
  handler: async (ctx, { anilistIds }) => {
    const result = {}
    for (const id of anilistIds) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_anilist_id', (q) => q.eq('anilistId', id))
        .first()
      if (user?.publicKey) {
        result[id] = user.publicKey
      }
    }
    return result
  }
})
