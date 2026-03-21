import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const block = mutation({
  args: { blockerId: v.number(), blockedId: v.number() },
  handler: async (ctx, { blockerId, blockedId }) => {
    const existing = await ctx.db.query('blockedUsers')
      .withIndex('by_blocker_blocked', q => q.eq('blockerId', blockerId).eq('blockedId', blockedId))
      .first()
    if (!existing) {
      await ctx.db.insert('blockedUsers', { blockerId, blockedId, timestamp: Date.now() })
    }
  }
})

export const unblock = mutation({
  args: { blockerId: v.number(), blockedId: v.number() },
  handler: async (ctx, { blockerId, blockedId }) => {
    const existing = await ctx.db.query('blockedUsers')
      .withIndex('by_blocker_blocked', q => q.eq('blockerId', blockerId).eq('blockedId', blockedId))
      .first()
    if (existing) await ctx.db.delete(existing._id)
  }
})

// All users blocked by blockerId
export const getBlocked = query({
  args: { blockerId: v.number() },
  handler: async (ctx, { blockerId }) => {
    const rows = await ctx.db.query('blockedUsers')
      .withIndex('by_blocker', q => q.eq('blockerId', blockerId))
      .collect()
    return rows.map(r => r.blockedId)
  }
})

// Check if blockerId has blocked blockedId
export const isBlocked = query({
  args: { blockerId: v.number(), blockedId: v.number() },
  handler: async (ctx, { blockerId, blockedId }) => {
    const row = await ctx.db.query('blockedUsers')
      .withIndex('by_blocker_blocked', q => q.eq('blockerId', blockerId).eq('blockedId', blockedId))
      .first()
    return !!row
  }
})
