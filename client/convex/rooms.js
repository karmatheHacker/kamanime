import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const create = mutation({
  args: {
    hostId: v.number(),
    hostName: v.string(),
    hostAvatar: v.optional(v.string()),
    animeId: v.optional(v.number()),
    animeName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const inviteCode = generateCode()
    const roomId = await ctx.db.insert('rooms', {
      hostId: args.hostId,
      hostName: args.hostName,
      inviteCode,
      animeId: args.animeId,
      animeName: args.animeName,
      currentTime: 0,
      isPlaying: false,
      createdAt: Date.now()
    })
    await ctx.db.insert('roomMembers', {
      roomId,
      userId: args.hostId,
      userName: args.hostName,
      userAvatar: args.hostAvatar
    })
    return { roomId, inviteCode }
  }
})

export const join = mutation({
  args: {
    inviteCode: v.string(),
    userId: v.number(),
    userName: v.string(),
    userAvatar: v.optional(v.string())
  },
  handler: async (ctx, { inviteCode, userId, userName, userAvatar }) => {
    const room = await ctx.db
      .query('rooms')
      .withIndex('by_invite_code', (q) => q.eq('inviteCode', inviteCode))
      .first()
    if (!room) throw new Error('Room not found')
    const members = await ctx.db
      .query('roomMembers')
      .withIndex('by_room', (q) => q.eq('roomId', room._id))
      .collect()
    if (!members.find((m) => m.userId === userId)) {
      await ctx.db.insert('roomMembers', { roomId: room._id, userId, userName, userAvatar })
    }
    return room._id
  }
})

export const getByCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    return await ctx.db
      .query('rooms')
      .withIndex('by_invite_code', (q) => q.eq('inviteCode', inviteCode))
      .first()
  }
})

export const getMembers = query({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, { roomId }) => {
    return await ctx.db
      .query('roomMembers')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .collect()
  }
})

export const leave = mutation({
  args: { roomId: v.id('rooms'), userId: v.number() },
  handler: async (ctx, { roomId, userId }) => {
    const member = await ctx.db
      .query('roomMembers')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()
    if (member) await ctx.db.delete(member._id)
  }
})
