import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const sendRequest = mutation({
  args: {
    fromId: v.number(),
    fromName: v.string(),
    fromAvatar: v.optional(v.string()),
    toId: v.number(),
    toName: v.string(),
    toAvatar: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Check if a request already exists in either direction
    const existing = await ctx.db.query('friendRequests')
      .withIndex('by_from_to', q => q.eq('fromId', args.fromId).eq('toId', args.toId))
      .first()
    const reverse = await ctx.db.query('friendRequests')
      .withIndex('by_from_to', q => q.eq('fromId', args.toId).eq('toId', args.fromId))
      .first()
    if (existing || reverse) return null
    return await ctx.db.insert('friendRequests', { ...args, status: 'pending', timestamp: Date.now() })
  }
})

export const acceptRequest = mutation({
  args: { requestId: v.id('friendRequests') },
  handler: async (ctx, { requestId }) => {
    await ctx.db.patch(requestId, { status: 'accepted' })
  }
})

export const rejectRequest = mutation({
  args: { requestId: v.id('friendRequests') },
  handler: async (ctx, { requestId }) => {
    await ctx.db.patch(requestId, { status: 'rejected' })
  }
})

// Incoming pending requests for a user
export const getIncoming = query({
  args: { userId: v.number() },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query('friendRequests')
      .withIndex('by_to', q => q.eq('toId', userId))
      .filter(q => q.eq(q.field('status'), 'pending'))
      .order('desc')
      .collect()
  }
})

// Get relationship status between two users
// returns: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'rejected'
export const getStatus = query({
  args: { myId: v.number(), theirId: v.number() },
  handler: async (ctx, { myId, theirId }) => {
    const sent = await ctx.db.query('friendRequests')
      .withIndex('by_from_to', q => q.eq('fromId', myId).eq('toId', theirId))
      .first()
    if (sent) {
      if (sent.status === 'accepted') return { status: 'friends', requestId: sent._id }
      if (sent.status === 'pending') return { status: 'pending_sent', requestId: sent._id }
      return { status: 'none', requestId: null }
    }
    const received = await ctx.db.query('friendRequests')
      .withIndex('by_from_to', q => q.eq('fromId', theirId).eq('toId', myId))
      .first()
    if (received) {
      if (received.status === 'accepted') return { status: 'friends', requestId: received._id }
      if (received.status === 'pending') return { status: 'pending_received', requestId: received._id }
      return { status: 'none', requestId: null }
    }
    return { status: 'none', requestId: null }
  }
})

// All accepted friends for a user
export const getFriends = query({
  args: { userId: v.number() },
  handler: async (ctx, { userId }) => {
    const sent = await ctx.db.query('friendRequests')
      .withIndex('by_from', q => q.eq('fromId', userId))
      .filter(q => q.eq(q.field('status'), 'accepted'))
      .collect()
    const received = await ctx.db.query('friendRequests')
      .withIndex('by_to', q => q.eq('toId', userId))
      .filter(q => q.eq(q.field('status'), 'accepted'))
      .collect()
    return [
      ...sent.map(r => ({ requestId: r._id, id: r.toId, name: r.toName, avatar: r.toAvatar })),
      ...received.map(r => ({ requestId: r._id, id: r.fromId, name: r.fromName, avatar: r.fromAvatar }))
    ]
  }
})

// Remove a friend (delete the accepted request)
export const unfriend = mutation({
  args: { requestId: v.id('friendRequests') },
  handler: async (ctx, { requestId }) => {
    await ctx.db.delete(requestId)
  }
})
