import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Only returns public rooms + private rooms the user is a member of
export const list = query({
  args: { userId: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = args.userId ?? null
    const rooms = await ctx.db.query('chatRooms').order('desc').take(50)
    // Fetch all member lists in parallel instead of sequentially
    const allMembers = await Promise.all(
      rooms.map(room =>
        ctx.db.query('chatRoomMembers').withIndex('by_room', q => q.eq('roomId', room._id)).collect()
      )
    )
    const visible = []
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i]
      const members = allMembers[i]
      if (!room.isPrivate) {
        visible.push({ ...room, memberCount: members.length })
      } else if (userId) {
        const isMember = members.some(m => m.userId === userId)
        if (isMember) visible.push({ ...room, memberCount: members.length })
      }
    }
    return visible
  }
})

export const myRoomIds = query({
  args: { userId: v.number() },
  handler: async (ctx, { userId }) => {
    const memberships = await ctx.db.query('chatRoomMembers')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()
    return memberships.map(m => m.roomId)
  }
})

export const create = mutation({
  args: {
    name: v.string(),
    userId: v.number(),
    userName: v.string(),
    userAvatar: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    invitedFriends: v.optional(v.array(v.object({
      id: v.number(),
      name: v.string(),
      avatar: v.optional(v.string())
    })))
  },
  handler: async (ctx, { name, userId, userName, userAvatar, isPrivate, invitedFriends }) => {
    const priv = isPrivate ?? false
    const roomId = await ctx.db.insert('chatRooms', {
      name, createdBy: userId, createdByName: userName, isPrivate: priv, createdAt: Date.now()
    })
    // Creator auto-joins
    await ctx.db.insert('chatRoomMembers', { roomId, userId, userName, userAvatar })
    // Pre-add invited friends for private rooms
    if (priv && invitedFriends?.length) {
      for (const f of invitedFriends) {
        await ctx.db.insert('chatRoomMembers', { roomId, userId: f.id, userName: f.name, userAvatar: f.avatar })
      }
    }
    return roomId
  }
})

export const invite = mutation({
  args: {
    roomId: v.id('chatRooms'),
    userId: v.number(),
    userName: v.string(),
    userAvatar: v.optional(v.string())
  },
  handler: async (ctx, { roomId, userId, userName, userAvatar }) => {
    const existing = await ctx.db.query('chatRoomMembers')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', userId))
      .first()
    if (!existing) {
      await ctx.db.insert('chatRoomMembers', { roomId, userId, userName, userAvatar })
    }
  }
})

export const join = mutation({
  args: {
    roomId: v.id('chatRooms'),
    userId: v.number(),
    userName: v.string(),
    userAvatar: v.optional(v.string())
  },
  handler: async (ctx, { roomId, userId, userName, userAvatar }) => {
    const ban = await ctx.db.query('roomBans')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', userId))
      .first()
    if (ban) return // banned — cannot rejoin
    const existing = await ctx.db.query('chatRoomMembers')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', userId))
      .first()
    if (!existing) {
      await ctx.db.insert('chatRoomMembers', { roomId, userId, userName, userAvatar })
    }
  }
})

export const leave = mutation({
  args: { roomId: v.id('chatRooms'), userId: v.number() },
  handler: async (ctx, { roomId, userId }) => {
    const member = await ctx.db.query('chatRoomMembers')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', userId))
      .first()
    if (member) await ctx.db.delete(member._id)
  }
})

export const deleteRoom = mutation({
  args: { roomId: v.id('chatRooms'), userId: v.number() },
  handler: async (ctx, { roomId, userId }) => {
    const room = await ctx.db.get(roomId)
    if (!room || room.createdBy !== userId) return
    // Fetch all related records in parallel
    const [members, messages, keys, bans] = await Promise.all([
      ctx.db.query('chatRoomMembers').withIndex('by_room', q => q.eq('roomId', roomId)).collect(),
      ctx.db.query('chatRoomMessages').withIndex('by_room', q => q.eq('roomId', roomId)).collect(),
      ctx.db.query('roomEncryptedKeys').withIndex('by_room_user', q => q.eq('roomId', roomId)).collect(),
      ctx.db.query('roomBans').withIndex('by_room', q => q.eq('roomId', roomId)).collect()
    ])
    // Delete all records in parallel across all collections
    await Promise.all([
      ...members.map(m => ctx.db.delete(m._id)),
      ...messages.map(m => ctx.db.delete(m._id)),
      ...keys.map(k => ctx.db.delete(k._id)),
      ...bans.map(b => ctx.db.delete(b._id))
    ])
    await ctx.db.delete(roomId)
  }
})

export const removeUser = mutation({
  args: { roomId: v.id('chatRooms'), ownerId: v.number(), targetUserId: v.number() },
  handler: async (ctx, { roomId, ownerId, targetUserId }) => {
    const room = await ctx.db.get(roomId)
    if (!room || room.createdBy !== ownerId) return
    const member = await ctx.db.query('chatRoomMembers')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', targetUserId))
      .first()
    if (member) {
      // Add to ban list so they cannot rejoin
      const existingBan = await ctx.db.query('roomBans')
        .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', targetUserId))
        .first()
      if (!existingBan) {
        await ctx.db.insert('roomBans', {
          roomId, userId: targetUserId,
          userName: member.userName, userAvatar: member.userAvatar
        })
      }
      await ctx.db.delete(member._id)
    }
  }
})

export const getBanned = query({
  args: { roomId: v.id('chatRooms') },
  handler: async (ctx, { roomId }) => {
    return await ctx.db.query('roomBans')
      .withIndex('by_room', q => q.eq('roomId', roomId))
      .collect()
  }
})

export const unbanUser = mutation({
  args: { roomId: v.id('chatRooms'), ownerId: v.number(), targetUserId: v.number() },
  handler: async (ctx, { roomId, ownerId, targetUserId }) => {
    const room = await ctx.db.get(roomId)
    if (!room || room.createdBy !== ownerId) return
    const ban = await ctx.db.query('roomBans')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', targetUserId))
      .first()
    if (ban) await ctx.db.delete(ban._id)
  }
})

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  }
})

export const sendMessage = mutation({
  args: {
    roomId: v.id('chatRooms'),
    senderId: v.number(),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    content: v.string(),
    storageId: v.optional(v.id('_storage'))
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('chatRoomMessages', { ...args, timestamp: Date.now() })
  }
})

export const listMessages = query({
  args: { roomId: v.id('chatRooms') },
  handler: async (ctx, { roomId }) => {
    const messages = await ctx.db.query('chatRoomMessages')
      .withIndex('by_room', q => q.eq('roomId', roomId))
      .order('asc')
      .take(100)
    return await Promise.all(messages.map(async (msg) => {
      if (msg.storageId) {
        const imageUrl = await ctx.storage.getUrl(msg.storageId)
        return { ...msg, imageUrl }
      }
      return msg
    }))
  }
})

export const getMembers = query({
  args: { roomId: v.id('chatRooms') },
  handler: async (ctx, { roomId }) => {
    return await ctx.db.query('chatRoomMembers')
      .withIndex('by_room', q => q.eq('roomId', roomId))
      .collect()
  }
})

// Sets the public room key slot (userId: 0) only if it doesn't exist yet.
// Returns the key that is actually stored (existing or newly created).
export const initPublicRoomKey = mutation({
  args: { roomId: v.id('chatRooms'), encryptedKey: v.string() },
  handler: async (ctx, { roomId, encryptedKey }) => {
    const existing = await ctx.db.query('roomEncryptedKeys')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', 0))
      .first()
    if (existing) return existing.encryptedKey
    await ctx.db.insert('roomEncryptedKeys', { roomId, userId: 0, encryptedKey })
    return encryptedKey
  }
})

export const storeEncryptedKey = mutation({
  args: {
    roomId: v.id('chatRooms'),
    userId: v.number(),
    encryptedKey: v.string()
  },
  handler: async (ctx, { roomId, userId, encryptedKey }) => {
    const existing = await ctx.db.query('roomEncryptedKeys')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', userId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { encryptedKey })
    } else {
      await ctx.db.insert('roomEncryptedKeys', { roomId, userId, encryptedKey })
    }
  }
})

export const getEncryptedKey = query({
  args: { roomId: v.id('chatRooms'), userId: v.number() },
  handler: async (ctx, { roomId, userId }) => {
    const entry = await ctx.db.query('roomEncryptedKeys')
      .withIndex('by_room_user', q => q.eq('roomId', roomId).eq('userId', userId))
      .first()
    return entry?.encryptedKey ?? null
  }
})
