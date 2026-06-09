import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const sendGlobal = mutation({
  args: {
    senderId: v.number(),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    content: v.string()
  },
  handler: async (ctx, args) => {
    if (!args.content.trim()) return
    await ctx.db.insert('globalMessages', { ...args, timestamp: Date.now() })
  }
})

export const listGlobal = query({
  handler: async (ctx) => {
    const msgs = await ctx.db
      .query('globalMessages')
      .withIndex('by_timestamp')
      .order('desc')
      .take(100)
    return msgs.reverse()
  }
})

export const sendDM = mutation({
  args: {
    senderId: v.number(),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    receiverId: v.number(),
    content: v.string(),
    storageId: v.optional(v.id('_storage'))
  },
  handler: async (ctx, args) => {
    if (!args.content.trim() && !args.storageId) return
    await ctx.db.insert('directMessages', { ...args, timestamp: Date.now() })
  }
})

export const listDM = query({
  args: { userId1: v.number(), userId2: v.number() },
  handler: async (ctx, { userId1, userId2 }) => {
    const sent = await ctx.db
      .query('directMessages')
      .withIndex('by_sender', (q) => q.eq('senderId', userId1))
      .collect()
    const received = await ctx.db
      .query('directMessages')
      .withIndex('by_sender', (q) => q.eq('senderId', userId2))
      .collect()
    const messages = [
      ...sent.filter((m) => m.receiverId === userId2),
      ...received.filter((m) => m.receiverId === userId1)
    ].sort((a, b) => a.timestamp - b.timestamp)
    return await Promise.all(messages.map(async (msg) => {
      if (msg.storageId) {
        const imageUrl = await ctx.storage.getUrl(msg.storageId)
        return { ...msg, imageUrl }
      }
      return msg
    }))
  }
})

export const getConversations = query({
  args: { userId: v.number() },
  handler: async (ctx, { userId }) => {
    const sent = await ctx.db
      .query('directMessages')
      .withIndex('by_sender', (q) => q.eq('senderId', userId))
      .collect()
    const received = await ctx.db
      .query('directMessages')
      .withIndex('by_receiver', (q) => q.eq('receiverId', userId))
      .collect()

    // First pass: collect unique partners and their latest message (no DB calls)
    const latestByPartner = new Map()
    for (const msg of [...sent, ...received]) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId
      const existing = latestByPartner.get(partnerId)
      if (!existing || existing.timestamp < msg.timestamp) {
        latestByPartner.set(partnerId, { partnerId, lastMessage: msg.content, timestamp: msg.timestamp })
      }
    }

    // Batch fetch all unique partners in parallel — one query per partner, not per message
    const partnerIds = Array.from(latestByPartner.keys())
    const partnerRecords = await Promise.all(
      partnerIds.map(id =>
        ctx.db.query('users').withIndex('by_anilist_id', (q) => q.eq('anilistId', id)).first()
      )
    )
    const partnerMap = new Map(partnerIds.map((id, i) => [id, partnerRecords[i]]))

    return Array.from(latestByPartner.values())
      .map(({ partnerId, lastMessage, timestamp }) => {
        const partner = partnerMap.get(partnerId)
        return { partnerId, partnerName: partner?.name || 'Unknown', partnerAvatar: partner?.avatar, lastMessage, timestamp }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }
})
