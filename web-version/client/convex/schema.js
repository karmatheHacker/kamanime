import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // User preferences (replaces localStorage)
  preferences: defineTable({
    key: v.string(),
    value: v.any()
  }).index('by_key', ['key']),

  // Analytics — page views
  pageViews: defineTable({
    path: v.string(),
    sessionId: v.string(),
    timestamp: v.number()
  }).index('by_timestamp', ['timestamp']),

  // Watch progress per anime
  watchProgress: defineTable({
    animeId: v.number(),
    episodeNumber: v.number(),
    progress: v.float64(),
    lastWatched: v.number()
  }).index('by_anime', ['animeId']),

  // Active torrents — synced from Express/WebTorrent every 2s
  torrents: defineTable({
    magnet: v.string(),
    name: v.optional(v.string()),
    length: v.optional(v.number()),
    downloaded: v.optional(v.number()),
    uploaded: v.optional(v.number()),
    downloadSpeed: v.optional(v.number()),
    uploadSpeed: v.optional(v.number()),
    progress: v.optional(v.number()),
    done: v.optional(v.boolean()),
    updatedAt: v.number()
  }).index('by_magnet', ['magnet']),

  // Global WebTorrent client speeds (singleton)
  clientStats: defineTable({
    downloadSpeed: v.number(),
    uploadSpeed: v.number()
  }),

  // AniList users who have signed in
  users: defineTable({
    anilistId: v.number(),
    name: v.string(),
    avatar: v.optional(v.string()),
    publicKey: v.optional(v.string()),
    firstSeen: v.number(),
    lastSeen: v.number()
  }).index('by_anilist_id', ['anilistId']),

  // Global chat messages
  globalMessages: defineTable({
    senderId: v.number(),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    content: v.string(),
    timestamp: v.number()
  }).index('by_timestamp', ['timestamp']),

  // Direct messages between users
  directMessages: defineTable({
    senderId: v.number(),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    receiverId: v.number(),
    content: v.string(),
    storageId: v.optional(v.id('_storage')),
    timestamp: v.number()
  }).index('by_sender', ['senderId'])
    .index('by_receiver', ['receiverId']),

  // Chat rooms
  chatRooms: defineTable({
    name: v.string(),
    createdBy: v.number(),
    createdByName: v.string(),
    isPrivate: v.optional(v.boolean()),
    createdAt: v.number()
  }),

  // Chat room members
  chatRoomMembers: defineTable({
    roomId: v.id('chatRooms'),
    userId: v.number(),
    userName: v.string(),
    userAvatar: v.optional(v.string())
  }).index('by_room', ['roomId'])
    .index('by_user', ['userId'])
    .index('by_room_user', ['roomId', 'userId']),

  // Friend requests
  friendRequests: defineTable({
    fromId: v.number(),
    fromName: v.string(),
    fromAvatar: v.optional(v.string()),
    toId: v.number(),
    toName: v.string(),
    toAvatar: v.optional(v.string()),
    status: v.string(), // 'pending' | 'accepted' | 'rejected'
    timestamp: v.number()
  }).index('by_from', ['fromId'])
    .index('by_to', ['toId'])
    .index('by_from_to', ['fromId', 'toId']),

  // Blocked users
  blockedUsers: defineTable({
    blockerId: v.number(),
    blockedId: v.number(),
    timestamp: v.number()
  }).index('by_blocker', ['blockerId'])
    .index('by_blocker_blocked', ['blockerId', 'blockedId']),

  // Read receipts — tracks last-read timestamp per user per context
  readReceipts: defineTable({
    userId: v.number(),
    contextType: v.string(), // 'room' | 'dm'
    contextId: v.string(),   // roomId string or partnerId string
    lastReadAt: v.number()
  }).index('by_user', ['userId'])
    .index('by_user_context', ['userId', 'contextType', 'contextId']),

  // Chat room messages
  chatRoomMessages: defineTable({
    roomId: v.id('chatRooms'),
    senderId: v.number(),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    content: v.string(),
    storageId: v.optional(v.id('_storage')),
    timestamp: v.number()
  }).index('by_room', ['roomId']),

  // Room bans — users removed by owner cannot rejoin until explicitly re-added
  roomBans: defineTable({
    roomId: v.id('chatRooms'),
    userId: v.number(),
    userName: v.string(),
    userAvatar: v.optional(v.string())
  }).index('by_room', ['roomId'])
    .index('by_room_user', ['roomId', 'userId']),

  // E2E encrypted room keys — one entry per (room, user)
  roomEncryptedKeys: defineTable({
    roomId: v.id('chatRooms'),
    userId: v.number(),
    encryptedKey: v.string()  // ECIES-encrypted AES room key
  }).index('by_room_user', ['roomId', 'userId'])
})
