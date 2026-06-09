import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const markRead = mutation({
  args: {
    userId: v.number(),
    contextType: v.string(),
    contextId: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('readReceipts')
      .withIndex('by_user_context', q =>
        q.eq('userId', args.userId).eq('contextType', args.contextType).eq('contextId', args.contextId)
      )
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { lastReadAt: Date.now() })
    } else {
      await ctx.db.insert('readReceipts', { ...args, lastReadAt: Date.now() })
    }
  }
})

// Returns unread counts keyed by roomId / partnerId, plus totals
export const getUnread = query({
  args: { userId: v.number() },
  handler: async (ctx, { userId }) => {
    // Load all read receipts for this user
    const receipts = await ctx.db.query('readReceipts')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()
    const receiptMap = new Map(receipts.map(r => [`${r.contextType}:${r.contextId}`, r.lastReadAt]))

    // ── Room unreads ──
    const memberships = await ctx.db.query('chatRoomMembers')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    const rooms = {}
    for (const m of memberships) {
      const lastRead = receiptMap.get(`room:${m.roomId}`) ?? 0
      const msgs = await ctx.db.query('chatRoomMessages')
        .withIndex('by_room', q => q.eq('roomId', m.roomId))
        .filter(q => q.and(
          q.gt(q.field('timestamp'), lastRead),
          q.neq(q.field('senderId'), userId)
        ))
        .collect()
      if (msgs.length > 0) rooms[m.roomId] = msgs.length
    }

    // ── DM unreads ──
    const received = await ctx.db.query('directMessages')
      .withIndex('by_receiver', q => q.eq('receiverId', userId))
      .order('desc')
      .take(500)

    const dms = {}
    for (const msg of received) {
      const lastRead = receiptMap.get(`dm:${msg.senderId}`) ?? 0
      if (msg.timestamp > lastRead) {
        dms[msg.senderId] = (dms[msg.senderId] || 0) + 1
      }
    }

    const totalRooms = Object.keys(rooms).length
    const totalDMs = Object.keys(dms).length

    return { rooms, dms, totalRooms, totalDMs, total: totalRooms + totalDMs }
  }
})
