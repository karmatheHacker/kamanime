import { useState, useRef, useEffect, useMemo } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useZenshinContext } from '../utils/ContextProvider'
import { anilistAuthUrl } from '../utils/auth'
import {
  getOrCreateKeyPair,
  getPublicKeyJwk,
  getPrivateKeyJwk,
  deriveSharedKey,
  encryptAES,
  decryptAES,
  generateRoomKeyB64,
  importRoomKey,
  encryptECIES,
  decryptECIES
} from '../utils/crypto'

// ─── Timestamp formatter ──────────────────────────────────────────────────────

function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (isToday) return `${hh}:${mm}`
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[d.getMonth()]} ${d.getDate()} ${hh}:${mm}`
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 'sm' }) {
  const dim = size === 'sm' ? 'w-6 h-6 text-[8px]' : 'w-8 h-8 text-[10px]'
  return src ? (
    <img src={src} className={`${dim} rounded-full shrink-0 object-cover`} alt={name} />
  ) : (
    <div className={`${dim} rounded-full bg-[#1e1e28] shrink-0 flex items-center justify-center text-[#555]`}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

// ─── Message group renderer ───────────────────────────────────────────────────

function renderMessages(msgs, myId, onUsernameClick) {
  if (!msgs || !msgs.length) return null

  // Group consecutive messages from same sender within 5 min
  const groups = []
  let current = null

  for (const msg of msgs) {
    const isMine = msg.senderId === myId
    const sameGroup =
      current &&
      current.senderId === msg.senderId &&
      msg.timestamp - current.lastTs < 5 * 60 * 1000

    if (sameGroup) {
      current.messages.push(msg)
      current.lastTs = msg.timestamp
    } else {
      current = {
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar,
        isMine,
        messages: [msg],
        lastTs: msg.timestamp
      }
      groups.push(current)
    }
  }

  return groups.map((group, gi) => (
    <div key={gi} className={`flex flex-col ${group.isMine ? 'items-end' : 'items-start'} gap-[2px]`}>
      {group.messages.map((msg, mi) => {
        const isFirst = mi === 0
        const isLast = mi === group.messages.length - 1

        return (
          <div key={msg._id} className={`flex items-end gap-1.5 w-full ${group.isMine ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar column */}
            {!group.isMine ? (
              isFirst ? (
                <Avatar src={group.senderAvatar} name={group.senderName} />
              ) : (
                <div className="w-6 h-6 shrink-0" />
              )
            ) : null}

            {/* Bubble column */}
            <div className={`flex flex-col ${group.isMine ? 'items-end' : 'items-start'} max-w-[78%]`}>
              {/* Name label — only first in group, others' messages */}
              {isFirst && !group.isMine && (
                <button
                  onClick={() => msg.senderId !== myId && onUsernameClick({ id: msg.senderId, name: msg.senderName, avatar: msg.senderAvatar })}
                  className="text-[10px] text-[#888] hover:text-white mb-0.5 ml-0.5 transition-colors cursor-pointer"
                >
                  {group.senderName}
                </button>
              )}

              {/* Bubble */}
              <div className={`px-3 py-1.5 text-[12px] leading-relaxed break-words ${
                group.isMine
                  ? `bg-gradient-to-br from-[#6d28d9] to-[#4c1d95] text-white rounded-2xl rounded-tr-sm`
                  : `bg-[#141418] border border-[#1e1e28] text-[#ccc] rounded-2xl rounded-tl-sm`
              }`}>
                {msg.content && <span>{msg.content}</span>}
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    className="mt-1 max-w-full rounded-lg max-h-[180px] object-contain cursor-pointer"
                    onClick={() => window.open(msg.imageUrl, '_blank')}
                    alt="attachment"
                  />
                )}
              </div>

              {/* Timestamp — only after last in group */}
              {isLast && (
                <span className="text-[9px] text-[#333] mt-0.5 mx-0.5">
                  {formatTimestamp(msg.timestamp)}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  ))
}

// ─── Friend request row ───────────────────────────────────────────────────────

function FriendRequestRow({ req, label, onAccept, onReject }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#111114] last:border-0">
      <Avatar src={req.fromAvatar} name={req.fromName} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-white truncate">{req.fromName}</div>
        <div className="text-[10px] text-[#444]">{label}</div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={() => onAccept({ requestId: req._id })}
          className="w-7 h-7 flex items-center justify-center bg-green-600/80 hover:bg-green-500 text-white text-[12px] transition-colors rounded"
          title="Accept"
        >
          ✓
        </button>
        <button
          onClick={() => onReject({ requestId: req._id })}
          className="w-7 h-7 flex items-center justify-center bg-[#1c1c20] hover:bg-red-600/60 text-[#888] hover:text-white text-[12px] transition-colors rounded"
          title="Decline"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Profile card overlay ─────────────────────────────────────────────────────

function ProfileCard({ target, myId, myName, myAvatar, onClose, onOpenDM }) {
  const rel = useQuery(api.friends.getStatus, myId && target ? { myId, theirId: target.id } : 'skip')
  const blocked = useQuery(api.blocks.isBlocked, myId && target ? { blockerId: myId, blockedId: target.id } : 'skip')
  const sendRequest = useMutation(api.friends.sendRequest)
  const acceptRequest = useMutation(api.friends.acceptRequest)
  const blockUser = useMutation(api.blocks.block)
  const unblockUser = useMutation(api.blocks.unblock)

  if (!target) return null

  const handleSend = () => sendRequest({
    fromId: myId, fromName: myName, fromAvatar: myAvatar,
    toId: target.id, toName: target.name, toAvatar: target.avatar
  })

  const statusBtn = () => {
    if (!myId) return null
    if (blocked) return null // blocked users only see unblock
    if (!rel) return <span className="text-[10px] text-[#444]">Loading...</span>
    switch (rel.status) {
      case 'friends':
        return (
          <button onClick={() => { onOpenDM(target); onClose() }}
            className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] transition-colors rounded">
            Open DM
          </button>
        )
      case 'pending_sent':
        return <span className="text-[10px] text-[#555] uppercase tracking-widest">Request Sent</span>
      case 'pending_received':
        return (
          <button onClick={() => acceptRequest({ requestId: rel.requestId })}
            className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[11px] transition-colors rounded">
            Accept Request
          </button>
        )
      default:
        return (
          <button onClick={handleSend}
            className="w-full px-3 py-1.5 bg-[#1a1a22] border border-[#2a2a35] hover:border-purple-500/60 text-[#aaa] hover:text-white text-[11px] transition-colors rounded">
            + Add Friend
          </button>
        )
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 rounded" onClick={onClose}>
      <div className="bg-[#0d0d0f] border border-[#1a1a22] p-5 w-[210px] flex flex-col items-center gap-3 shadow-xl rounded-lg"
        onClick={e => e.stopPropagation()}>
        {target.avatar
          ? <img src={target.avatar} className="w-16 h-16 rounded-full object-cover ring-2 ring-[#1a1a22]" alt={target.name} />
          : <div className="w-16 h-16 rounded-full bg-[#1e1e28] flex items-center justify-center text-2xl text-[#555]">{target.name[0]?.toUpperCase()}</div>
        }
        <span className="text-[13px] text-white font-bold">{target.name}</span>

        {blocked && (
          <span className="text-[10px] text-red-400/70 uppercase tracking-widest">Blocked</span>
        )}

        <div className="w-full flex flex-col gap-2">
          {statusBtn()}
          {myId && (
            blocked ? (
              <button
                onClick={() => { unblockUser({ blockerId: myId, blockedId: target.id }); onClose() }}
                className="w-full px-3 py-1.5 bg-[#1a1a22] border border-[#2a2a35] hover:border-green-500/50 text-[#666] hover:text-green-400 text-[11px] transition-colors rounded"
              >
                Unblock
              </button>
            ) : (
              <button
                onClick={() => { blockUser({ blockerId: myId, blockedId: target.id }); onClose() }}
                className="w-full px-3 py-1.5 bg-[#1a1a22] border border-[#2a2a35] hover:border-red-500/50 text-[#555] hover:text-red-400 text-[11px] transition-colors rounded"
              >
                Block
              </button>
            )
          )}
        </div>

        <button onClick={onClose} className="text-[10px] text-[#333] hover:text-[#666] uppercase tracking-widest mt-1">
          Close
        </button>
      </div>
    </div>
  )
}

// ─── Main ChatPanel ───────────────────────────────────────────────────────────

export default function ChatPanel() {
  const [tab, setTab] = useState('rooms')
  const [friendsSubView, setFriendsSubView] = useState('list') // 'list' | 'requests'
  const [dmsSubView, setDmsSubView] = useState('conversations') // 'conversations' | 'requests'

  // Rooms
  const [activeRoom, setActiveRoom] = useState(null)
  const [roomInput, setRoomInput] = useState('')
  const [createName, setCreateName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createIsPrivate, setCreateIsPrivate] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState(new Set())
  const [showInvite, setShowInvite] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const [profileTarget, setProfileTarget] = useState(null)
  const fileInputRef = useRef(null)

  // DMs
  const [dmTarget, setDmTarget] = useState(null)
  const [dmInput, setDmInput] = useState('')
  const [pendingDmImage, setPendingDmImage] = useState(null)
  const dmFileInputRef = useRef(null)

  // Crypto state
  const [dmCryptoKey, setDmCryptoKey] = useState(null)
  const [roomCryptoKey, setRoomCryptoKey] = useState(null)
  const [decryptedRoomMsgs, setDecryptedRoomMsgs] = useState([])
  const [decryptedDmMsgs, setDecryptedDmMsgs] = useState([])

  const convex = useConvex()
  const { userId, chatOpen, unreadNotifications } = useZenshinContext()
  const myId = userId ? Number(userId) : null
  const myName = useMemo(() => localStorage.getItem('anilist_name') || 'anonuser', [])
  const myAvatar = useMemo(() => localStorage.getItem('anilist_avatar') || undefined, [])
  const isOwner = Boolean(myId && activeRoom && Number(activeRoom.createdBy) === myId)

  // Rooms queries
  const rooms = useQuery(api.chatRooms.list, { userId: myId ?? undefined })
  const myRoomIds = useQuery(api.chatRooms.myRoomIds, myId ? { userId: myId } : 'skip')
  const roomMessages = useQuery(api.chatRooms.listMessages, activeRoom ? { roomId: activeRoom._id } : 'skip')
  const roomMembers = useQuery(api.chatRooms.getMembers, activeRoom ? { roomId: activeRoom._id } : 'skip')
  const bannedUsers = useQuery(
    api.chatRooms.getBanned,
    activeRoom && isOwner ? { roomId: activeRoom._id } : 'skip'
  )

  // Room mutations
  const markRead = useMutation(api.notifications.markRead)
  const createRoom = useMutation(api.chatRooms.create)
  const joinRoom = useMutation(api.chatRooms.join)
  const leaveRoom = useMutation(api.chatRooms.leave)
  const deleteRoom = useMutation(api.chatRooms.deleteRoom)
  const removeUser = useMutation(api.chatRooms.removeUser)
  const unbanUser = useMutation(api.chatRooms.unbanUser)
  const inviteToRoom = useMutation(api.chatRooms.invite)
  const sendRoomMessage = useMutation(api.chatRooms.sendMessage)
  const generateUploadUrl = useMutation(api.chatRooms.generateUploadUrl)
  const storeEncryptedKey = useMutation(api.chatRooms.storeEncryptedKey)
  const initPublicRoomKey = useMutation(api.chatRooms.initPublicRoomKey)
  const updatePublicKey = useMutation(api.users.updatePublicKey)

  // DMs queries
  const conversations = useQuery(api.chat.getConversations, myId ? { userId: myId } : 'skip')
  const dmMessages = useQuery(
    api.chat.listDM,
    myId && dmTarget ? { userId1: myId, userId2: dmTarget.id } : 'skip'
  )
  const sendDM = useMutation(api.chat.sendDM)

  // Friends
  const incomingRequests = useQuery(api.friends.getIncoming, myId ? { userId: myId } : 'skip')
  const blockedIds = useQuery(api.blocks.getBlocked, myId ? { blockerId: myId } : 'skip')
  const blockedSet = useMemo(() => new Set(blockedIds || []), [blockedIds])
  const dmTargetBlocked = useQuery(
    api.blocks.isBlocked,
    myId && dmTarget ? { blockerId: myId, blockedId: dmTarget.id } : 'skip'
  )
  const blockUser = useMutation(api.blocks.block)
  const unblockUser = useMutation(api.blocks.unblock)
  const friends = useQuery(api.friends.getFriends, myId ? { userId: myId } : 'skip')
  const acceptRequest = useMutation(api.friends.acceptRequest)
  const rejectRequest = useMutation(api.friends.rejectRequest)
  const unfriend = useMutation(api.friends.unfriend)

  // Crypto queries
  const partnerPubKey = useQuery(
    api.users.getPublicKey,
    dmTarget ? { anilistId: dmTarget.id } : 'skip'
  )
  const encryptedRoomKey = useQuery(
    api.chatRooms.getEncryptedKey,
    activeRoom && myId ? { roomId: activeRoom._id, userId: myId } : 'skip'
  )

  // Friends public keys for private room creation
  const selectedFriendIds = Array.from(selectedFriends)
  const friendsPublicKeys = useQuery(
    api.users.getPublicKeys,
    selectedFriends.size > 0 ? { anilistIds: selectedFriendIds } : 'skip'
  )

  // Derived: filtered friend list (reused in Friends and DMs tabs)
  const visibleFriends = useMemo(
    () => (friends || []).filter(f => !blockedSet.has(f.id)),
    [friends, blockedSet]
  )
  // Derived: O(1) conversation lookup by partnerId
  const convByPartner = useMemo(
    () => new Map((conversations || []).map(c => [c.partnerId, c])),
    [conversations]
  )

  const roomEndRef = useRef(null)
  const dmEndRef = useRef(null)

  useEffect(() => { roomEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [decryptedRoomMsgs])
  useEffect(() => { dmEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [decryptedDmMsgs])

  // Revoke object URLs when pending images change or component unmounts
  useEffect(() => () => { if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl) }, [pendingImage])
  useEffect(() => () => { if (pendingDmImage) URL.revokeObjectURL(pendingDmImage.previewUrl) }, [pendingDmImage])

  // ── Key initialization ──
  useEffect(() => {
    if (!myId) return
    async function initKeys() {
      const { publicKeyJwk } = await getOrCreateKeyPair()
      await updatePublicKey({ anilistId: myId, publicKey: JSON.stringify(publicKeyJwk) }).catch(() => {})
    }
    initKeys()
  }, [myId])

  // ── DM key derivation ──
  useEffect(() => {
    if (!partnerPubKey || !myId) { setDmCryptoKey(null); return }
    async function derive() {
      const myPriv = getPrivateKeyJwk()
      if (!myPriv) return
      const key = await deriveSharedKey(myPriv, JSON.parse(partnerPubKey))
      setDmCryptoKey(key)
    }
    derive()
  }, [partnerPubKey, dmTarget?.id])

  // ── Room key loading ──
  useEffect(() => {
    if (!activeRoom) { setRoomCryptoKey(null); return }
    if (!encryptedRoomKey) { setRoomCryptoKey(null); return }
    async function loadKey() {
      const myPriv = getPrivateKeyJwk()
      if (!myPriv) return
      try {
        const keyB64 = await decryptECIES(encryptedRoomKey, myPriv)
        if (keyB64 === '[encrypted]') return
        const cryptoKey = await importRoomKey(keyB64)
        setRoomCryptoKey(cryptoKey)
      } catch {
        setRoomCryptoKey(null)
      }
    }
    loadKey()
  }, [encryptedRoomKey, activeRoom?._id])

  // ── Decrypt room messages ──
  useEffect(() => {
    if (!roomMessages) { setDecryptedRoomMsgs([]); return }
    if (!roomCryptoKey) {
      setDecryptedRoomMsgs(roomMessages)
      return
    }
    async function decrypt() {
      const decrypted = await Promise.all(roomMessages.map(async msg => {
        if (!msg.content) return msg
        const result = await decryptAES(msg.content, roomCryptoKey)
        return { ...msg, content: result === '[encrypted]' ? msg.content : result }
      }))
      setDecryptedRoomMsgs(decrypted)
    }
    decrypt()
  }, [roomMessages, roomCryptoKey, activeRoom?._id])

  // ── Decrypt DM messages ──
  useEffect(() => {
    if (!dmMessages) { setDecryptedDmMsgs([]); return }
    if (!dmCryptoKey) { setDecryptedDmMsgs(dmMessages); return }
    async function decrypt() {
      const decrypted = await Promise.all(dmMessages.map(async msg => {
        if (!msg.content) return msg
        const result = await decryptAES(msg.content, dmCryptoKey)
        return { ...msg, content: result === '[encrypted]' ? msg.content : result }
      }))
      setDecryptedDmMsgs(decrypted)
    }
    decrypt()
  }, [dmMessages, dmCryptoKey, dmTarget?.id])

  // ── Mark room as read ──
  useEffect(() => {
    if (myId && activeRoom && chatOpen) {
      markRead({ userId: myId, contextType: 'room', contextId: activeRoom._id }).catch(() => {})
    }
  }, [activeRoom?._id, roomMessages?.length, chatOpen])

  // ── Mark DM as read ──
  useEffect(() => {
    if (myId && dmTarget && chatOpen && tab === 'dms') {
      markRead({ userId: myId, contextType: 'dm', contextId: String(dmTarget.id) }).catch(() => {})
    }
  }, [dmTarget?.id, dmMessages?.length, chatOpen, tab])

  // ── Room handlers ──

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!createName.trim() || !myId) return
    const invitedFriends = createIsPrivate
      ? (friends || []).filter(f => selectedFriends.has(f.id)).map(f => ({ id: f.id, name: f.name, avatar: f.avatar }))
      : []
    const name = createName.trim()
    const roomId = await createRoom({
      name, userId: myId, userName: myName, userAvatar: myAvatar,
      isPrivate: createIsPrivate, invitedFriends
    })

    // Key distribution for all rooms
    try {
      const roomKeyB64 = await generateRoomKeyB64()
      const myPubJwk = getPublicKeyJwk()
      if (createIsPrivate) {
        // Private: encrypt for self + invited friends
        if (myPubJwk) {
          const enc = await encryptECIES(roomKeyB64, myPubJwk)
          await storeEncryptedKey({ roomId, userId: myId, encryptedKey: enc })
        }
        for (const friend of invitedFriends) {
          const pubKeyStr = friendsPublicKeys?.[friend.id]
          if (pubKeyStr) {
            const enc = await encryptECIES(roomKeyB64, JSON.parse(pubKeyStr))
            await storeEncryptedKey({ roomId, userId: friend.id, encryptedKey: enc })
          }
        }
      } else {
        // Public: store raw key in public slot (userId: 0) + personal ECIES copy for creator
        await initPublicRoomKey({ roomId, encryptedKey: roomKeyB64 })
        if (myPubJwk) {
          const enc = await encryptECIES(roomKeyB64, myPubJwk)
          await storeEncryptedKey({ roomId, userId: myId, encryptedKey: enc })
        }
      }
    } catch (err) {
      console.warn('Room key setup failed:', err)
    }

    setCreateName('')
    setCreateIsPrivate(false)
    setSelectedFriends(new Set())
    setShowCreate(false)
    setActiveRoom({ _id: roomId, name, isPrivate: createIsPrivate, createdBy: myId })
  }

  // Ensures a public room has a key set up for the current user.
  // For existing rooms without a public slot, creates one on first call.
  const ensureRoomKey = async (roomId) => {
    if (!myId) return
    try {
      const existing = await convex.query(api.chatRooms.getEncryptedKey, { roomId, userId: myId })
      if (existing) return
      const myPubJwk = getPublicKeyJwk()
      if (!myPubJwk) return
      const freshKeyB64 = await generateRoomKeyB64()
      // initPublicRoomKey only writes if slot is absent; returns the key actually in use
      const roomKeyB64 = await initPublicRoomKey({ roomId, encryptedKey: freshKeyB64 })
      const enc = await encryptECIES(roomKeyB64, myPubJwk)
      await storeEncryptedKey({ roomId, userId: myId, encryptedKey: enc })
    } catch (err) {
      console.warn('Room key setup failed:', err)
    }
  }

  const handleJoinRoom = async (room) => {
    if (!myId) return
    await joinRoom({ roomId: room._id, userId: myId, userName: myName, userAvatar: myAvatar })
    if (!room.isPrivate) await ensureRoomKey(room._id)
    setActiveRoom({ _id: room._id, name: room.name, isPrivate: room.isPrivate, createdBy: room.createdBy })
  }

  const handleEnterRoom = async (room) => {
    setActiveRoom({ _id: room._id, name: room.name, isPrivate: room.isPrivate, createdBy: room.createdBy })
    if (!room.isPrivate) ensureRoomKey(room._id)
  }

  const handleInviteFriend = async (friend) => {
    if (!activeRoom || !myId) return
    await inviteToRoom({ roomId: activeRoom._id, userId: friend.id, userName: friend.name, userAvatar: friend.avatar })
    try { await distributeRoomKey(friend.id) } catch (err) { console.warn('Key distribution failed:', err) }
  }

  const toggleFriendSelect = (id) => {
    setSelectedFriends(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleLeaveRoom = async () => {
    if (!myId || !activeRoom) return
    await leaveRoom({ roomId: activeRoom._id, userId: myId })
    setActiveRoom(null)
    setShowInvite(false)
    setShowMembers(false)
  }

  const handleDeleteRoom = async () => {
    if (!myId || !activeRoom) return
    await deleteRoom({ roomId: activeRoom._id, userId: myId })
    setActiveRoom(null)
    setShowInvite(false)
    setShowMembers(false)
  }

  const handleRemoveUser = async (targetUserId) => {
    if (!myId || !activeRoom) return
    await removeUser({ roomId: activeRoom._id, ownerId: myId, targetUserId })
  }

  const handleAddBack = async (bannedUser) => {
    if (!myId || !activeRoom) return
    await unbanUser({ roomId: activeRoom._id, ownerId: myId, targetUserId: bannedUser.userId })
    await inviteToRoom({ roomId: activeRoom._id, userId: bannedUser.userId, userName: bannedUser.userName, userAvatar: bannedUser.userAvatar })
    try { await distributeRoomKey(bannedUser.userId) } catch (err) { console.warn('Key distribution on re-add failed:', err) }
  }

  // ── Shared helpers ──

  const distributeRoomKey = async (userId) => {
    const myPriv = getPrivateKeyJwk()
    if (!myPriv || !encryptedRoomKey) return
    const roomKeyB64 = await decryptECIES(encryptedRoomKey, myPriv)
    if (roomKeyB64 === '[encrypted]') return
    const pubKeyStr = await convex.query(api.users.getPublicKey, { anilistId: userId })
    if (!pubKeyStr) return
    const enc = await encryptECIES(roomKeyB64, JSON.parse(pubKeyStr))
    await storeEncryptedKey({ roomId: activeRoom._id, userId, encryptedKey: enc })
  }

  const uploadImageToStorage = async (file) => {
    const uploadUrl = await generateUploadUrl()
    const result = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file
    })
    const { storageId } = await result.json()
    return storageId
  }

  const makeImageSelectHandler = (setter) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setter({ file, previewUrl: URL.createObjectURL(file) })
    e.target.value = ''
  }

  const clearPendingImage = () => {
    setPendingImage(null)
  }

  const handleImageSelect = makeImageSelectHandler(setPendingImage)

  const handleSendRoomMessage = async (e) => {
    e.preventDefault()
    if (!roomInput.trim() && !pendingImage) return
    if (!myId || !activeRoom) return
    let storageId
    if (pendingImage) {
      storageId = await uploadImageToStorage(pendingImage.file)
      clearPendingImage()
    }
    const content = roomCryptoKey
      ? await encryptAES(roomInput.trim(), roomCryptoKey)
      : roomInput.trim()
    await sendRoomMessage({
      roomId: activeRoom._id, senderId: myId, senderName: myName,
      senderAvatar: myAvatar, content, storageId
    })
    setRoomInput('')
  }

  // ── DM handlers ──

  const handleSendDM = async (e) => {
    e.preventDefault()
    if (!dmInput.trim() && !pendingDmImage) return
    if (!myId || !dmTarget) return
    let storageId
    if (pendingDmImage) {
      storageId = await uploadImageToStorage(pendingDmImage.file)
      setPendingDmImage(null)
    }
    const content = dmCryptoKey && dmInput.trim()
      ? await encryptAES(dmInput.trim(), dmCryptoKey)
      : dmInput.trim()
    await sendDM({
      senderId: myId, senderName: myName, senderAvatar: myAvatar,
      receiverId: dmTarget.id, content, storageId
    })
    setDmInput('')
  }

  const openDM = (user) => {
    setDmTarget({ id: user.id, name: user.name, avatar: user.avatar })
    setTab('dms')
    setDmsSubView('conversations')
  }

  const isMember = (roomId) => myRoomIds?.includes(roomId)
  const pendingCount = incomingRequests?.length || 0

  // ── Encryption status helpers ──
  const isEncryptedDM = !!dmCryptoKey
  const isEncryptedRoom = !!roomCryptoKey

  return (
    <>
      {chatOpen && (
        <div className="fixed top-11 right-0 z-[99] w-full sm:w-[380px] h-[calc(100svh-2.75rem)] sm:h-[580px] bg-[#0d0d0f] border border-[#1a1a22] flex flex-col font-space-mono shadow-2xl shadow-black/60">

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a22] shrink-0">
            <span className="text-[10px] text-[#888] uppercase tracking-widest">Community</span>
          </div>

          {/* ── Not logged in ── */}
          {!myId && (
            <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <div>
                <p className="text-[13px] text-white font-bold mb-1">Sign in to chat</p>
                <p className="text-[11px] text-[#444] leading-relaxed">Join rooms, add friends, and send messages with the community.</p>
              </div>
              <a
                href={anilistAuthUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#02a9ff]/10 border border-[#02a9ff]/30 hover:border-[#02a9ff]/70 hover:bg-[#02a9ff]/20 text-[#02a9ff] text-[12px] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.361 2.943L0 21.056h4.942l1.077-3.133H11.4l1.052 3.133H17.5L11.162 2.943H6.361zm1.07 11.06l1.832-5.199 1.8 5.199H7.43zM22.34 7.415l-3.75 13.64h-4.191l3.75-13.64H22.34z"/>
                </svg>
                Sign in with AniList
              </a>
            </div>
          )}

          {/* ── Logged in: show tabs ── */}
          {myId && (<>

          {/* Tabs */}
          <div className="flex border-b border-[#1a1a22] shrink-0 bg-[#0d0d0f]">
            {[{ id: 'rooms', label: 'Rooms' }, { id: 'friends', label: 'Friends' }, { id: 'dms', label: 'DMs' }].map(t => {
              const badge =
                t.id === 'rooms' ? unreadNotifications?.totalRooms :
                t.id === 'dms' ? (unreadNotifications?.totalDMs || 0) + pendingCount :
                t.id === 'friends' ? pendingCount : 0
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); if (t.id === 'friends') setFriendsSubView('list') }}
                  className={`relative flex-1 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
                    tab === t.id
                      ? 'text-white border-b-2 border-purple-500'
                      : 'text-[#444] hover:text-[#888]'
                  }`}
                >
                  {t.label}
                  {badge > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">{badge}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ───── ROOMS TAB ───── */}
          {tab === 'rooms' && (
            <div className="flex flex-col flex-1 min-h-0 relative">
              {/* Profile card overlay */}
              {profileTarget && (
                <ProfileCard
                  target={profileTarget}
                  myId={myId}
                  myName={myName}
                  myAvatar={myAvatar}
                  onClose={() => setProfileTarget(null)}
                  onOpenDM={openDM}
                />
              )}

              {activeRoom ? (
                <>
                  {/* Room header */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1a22] shrink-0">
                    <button
                      onClick={() => { setActiveRoom(null); setShowInvite(false); setShowMembers(false) }}
                      className="text-[#555] hover:text-[#aaa] text-sm mr-1 transition-colors"
                    >
                      ←
                    </button>
                    {activeRoom.isPrivate && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] text-white block truncate">{activeRoom.name}</span>
                      {isEncryptedRoom ? (
                        <span className="text-[9px] text-green-500/60">
                          {activeRoom.isPrivate ? '🔒 End-to-end encrypted' : '🔒 Encrypted'}
                        </span>
                      ) : activeRoom.isPrivate ? (
                        <span className="text-[9px] text-[#444]">🔒 Private</span>
                      ) : null}
                    </div>
                    <button
                      onClick={() => setShowMembers(v => !v)}
                      className={`text-[10px] shrink-0 transition-colors ${showMembers ? 'text-purple-400' : 'text-[#555] hover:text-[#aaa]'}`}
                      title="View members"
                    >
                      {roomMembers?.length || 0} members
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => setShowInvite(v => !v)}
                        className={`text-[10px] uppercase tracking-widest ml-1 transition-colors ${showInvite ? 'text-purple-400' : 'text-[#555] hover:text-[#aaa]'}`}
                        title="Add members"
                      >
                        +Add
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={handleDeleteRoom}
                        className="text-[10px] text-red-600 hover:text-red-500 ml-1 uppercase tracking-widest transition-colors"
                        title="Delete room"
                      >
                        Delete
                      </button>
                    )}
                    {myId && (
                      <button onClick={handleLeaveRoom} className="text-[10px] text-rose-500 hover:text-rose-400 ml-1 uppercase tracking-widest transition-colors">
                        Leave
                      </button>
                    )}
                  </div>

                  {/* Invite panel */}
                  {showInvite && (
                    <div className="border-b border-[#1a1a22] px-3 py-2 shrink-0 flex flex-col gap-1 max-h-[140px] overflow-y-auto bg-[#0a0a0d]">
                      <span className="text-[9px] text-[#555] uppercase tracking-widest mb-1">Add members</span>
                      {(() => {
                        const memberIds = new Set(roomMembers?.map(m => m.userId) || [])
                        const uninvited = (friends || []).filter(f => !memberIds.has(f.id))
                        if (!uninvited.length) return <p className="text-[10px] text-[#444] text-center py-1">All friends already in room</p>
                        return uninvited.map(f => (
                          <div key={f.id} className="flex items-center gap-2 py-1">
                            <Avatar src={f.avatar} name={f.name} />
                            <span className="text-[11px] text-white flex-1">{f.name}</span>
                            <button
                              onClick={() => handleInviteFriend(f)}
                              className="text-[10px] text-green-400 hover:text-green-300 uppercase tracking-widest transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        ))
                      })()}
                    </div>
                  )}

                  {/* Members panel — visible to all, remove only for owner */}
                  {showMembers && (
                    <div className="border-b border-[#1a1a22] px-3 py-2 shrink-0 flex flex-col gap-1 max-h-[160px] overflow-y-auto bg-[#0a0a0d]">
                      <span className="text-[9px] text-[#555] uppercase tracking-widest mb-1">Members · {roomMembers?.length || 0}</span>
                      {!(roomMembers?.length) && (
                        <p className="text-[10px] text-[#444] text-center py-1">No members</p>
                      )}
                      {(roomMembers || []).map(m => (
                        <div key={m.userId} className="flex items-center gap-2 py-1">
                          <Avatar src={m.userAvatar} name={m.userName} />
                          <span className="text-[11px] text-white flex-1 truncate">{m.userName}</span>
                          {Number(m.userId) === Number(activeRoom.createdBy) && (
                            <span className="text-[9px] text-purple-400 uppercase tracking-widest shrink-0">Owner</span>
                          )}
                          {isOwner && Number(m.userId) !== myId && (
                            <button
                              onClick={() => handleRemoveUser(m.userId)}
                              className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 uppercase tracking-widest transition-colors shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      {/* Banned users — owner only */}
                      {bannedUsers?.length > 0 && (
                        <>
                          <span className="text-[9px] text-[#555] uppercase tracking-widest mt-2 mb-1">Banned · {bannedUsers.length}</span>
                          {bannedUsers.map(b => (
                            <div key={b.userId} className="flex items-center gap-2 py-1 opacity-50">
                              <Avatar src={b.userAvatar} name={b.userName} />
                              <span className="text-[11px] text-[#888] flex-1 truncate">{b.userName}</span>
                              <button
                                onClick={() => handleAddBack(b)}
                                className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-500/60 uppercase tracking-widest transition-colors shrink-0"
                              >
                                Add Back
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
                    {!decryptedRoomMsgs?.length && (
                      <p className="text-[10px] text-[#444] text-center mt-8">No messages yet. Say something!</p>
                    )}
                    {renderMessages(decryptedRoomMsgs, myId, setProfileTarget)}
                    <div ref={roomEndRef} />
                  </div>

                  {/* Input area */}
                  {myId ? (
                    <div className="border-t border-[#1a1a22] shrink-0">
                      {pendingImage && (
                        <div className="relative px-3 pt-2">
                          <img src={pendingImage.previewUrl} className="max-h-[80px] rounded-lg object-contain border border-[#1a1a22]" alt="pending" />
                          <button
                            type="button"
                            onClick={clearPendingImage}
                            className="absolute top-1 right-2 w-5 h-5 bg-black/80 text-white text-[11px] rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      <form onSubmit={handleSendRoomMessage} className="p-2 flex gap-2 items-center">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-8 h-8 flex items-center justify-center text-[#555] hover:text-[#aaa] hover:border hover:border-[#1a1a22] rounded transition-colors shrink-0"
                          title="Attach image"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </button>
                        <input
                          value={roomInput}
                          onChange={e => setRoomInput(e.target.value)}
                          placeholder="Message room..."
                          className="flex-1 bg-[#0a0a0d] border-0 px-3 py-1.5 text-[12px] text-white placeholder-[#333] focus:outline-none focus:ring-1 focus:ring-purple-500/30 rounded transition-all"
                          maxLength={500}
                        />
                        <button
                          type="submit"
                          disabled={!roomInput.trim() && !pendingImage}
                          className="w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
                        >
                          ↑
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="border-t border-[#1a1a22] p-3 text-[11px] text-[#444] text-center shrink-0">Login with AniList to chat</div>
                  )}
                </>
              ) : (
                /* ── Room list ── */
                <>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a22] shrink-0">
                    <span className="text-[10px] text-[#555]">{rooms?.length || 0} rooms</span>
                    {myId && (
                      <button
                        onClick={() => setShowCreate(v => !v)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 uppercase tracking-widest transition-colors"
                      >
                        {showCreate ? 'Cancel' : '+ Create'}
                      </button>
                    )}
                  </div>

                  {showCreate && (
                    <form onSubmit={handleCreateRoom} className="border-b border-[#1a1a22] px-3 py-2 flex flex-col gap-2 shrink-0 bg-[#0a0a0d]">
                      <input
                        value={createName}
                        onChange={e => setCreateName(e.target.value)}
                        placeholder="Room name..."
                        className="w-full bg-[#0d0d0f] border border-[#1a1a22] px-2 py-1.5 text-[12px] text-white placeholder-[#333] focus:outline-none focus:border-purple-500/50 rounded transition-colors"
                        maxLength={40}
                        autoFocus
                      />
                      {/* Public / Private toggle */}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCreateIsPrivate(false)}
                          className={`flex-1 py-1 text-[10px] uppercase tracking-widest border rounded transition-colors ${
                            !createIsPrivate
                              ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                              : 'border-[#1a1a22] text-[#444] hover:text-[#888]'
                          }`}
                        >
                          🌐 Public
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateIsPrivate(true)}
                          className={`flex-1 py-1 text-[10px] uppercase tracking-widest border rounded transition-colors ${
                            createIsPrivate
                              ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                              : 'border-[#1a1a22] text-[#444] hover:text-[#888]'
                          }`}
                        >
                          🔒 Private
                        </button>
                      </div>
                      {/* Friend selector for private rooms */}
                      {createIsPrivate && (
                        <div className="flex flex-col gap-1 max-h-[110px] overflow-y-auto">
                          {!friends?.length ? (
                            <p className="text-[10px] text-[#444] text-center py-2">No friends to invite yet</p>
                          ) : friends.map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => toggleFriendSelect(f.id)}
                              className={`flex items-center gap-2 px-2 py-1.5 text-left transition-colors border rounded ${
                                selectedFriends.has(f.id)
                                  ? 'border-purple-500/60 bg-purple-500/10'
                                  : 'border-transparent hover:bg-[#0d0d0f]'
                              }`}
                            >
                              <Avatar src={f.avatar} name={f.name} />
                              <span className="text-[11px] text-white flex-1">{f.name}</span>
                              <span className={`text-[10px] ${selectedFriends.has(f.id) ? 'text-purple-400' : 'text-[#444]'}`}>
                                {selectedFriends.has(f.id) ? '✓' : '+'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={!createName.trim()}
                        className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[11px] transition-colors rounded"
                      >
                        Create Room
                      </button>
                    </form>
                  )}

                  <div className="flex-1 overflow-y-auto flex flex-col">
                    {!rooms?.length ? (
                      <p className="text-[10px] text-[#444] text-center mt-8 px-3">
                        No rooms yet.{myId ? ' Create one!' : ' Login to create one.'}
                      </p>
                    ) : rooms.map(room => {
                      const joined = isMember(room._id)
                      return (
                        <div key={room._id} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#111114] last:border-0 hover:bg-[#111114] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {room.isPrivate && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                                </svg>
                              )}
                              <span className="text-[12px] text-white truncate">{room.name}</span>
                              {unreadNotifications?.rooms?.[room._id] > 0 && (
                                <span className="shrink-0 min-w-[16px] h-[16px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                                  {unreadNotifications.rooms[room._id]}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#444]">
                              {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'} · by {room.createdByName}
                            </div>
                          </div>
                          {myId && (joined ? (
                            <button
                              onClick={() => handleEnterRoom(room)}
                              className="text-[10px] text-purple-400 hover:text-purple-300 uppercase tracking-widest shrink-0 transition-colors"
                            >
                              Enter
                            </button>
                          ) : (
                            <button
                              onClick={() => handleJoinRoom(room)}
                              className="text-[10px] text-green-400 hover:text-green-300 uppercase tracking-widest shrink-0 transition-colors"
                            >
                              Join
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ───── FRIENDS TAB ───── */}
          {tab === 'friends' && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Sub-tabs: All | Requests */}
              <div className="flex border-b border-[#1a1a22] shrink-0">
                {[{ id: 'list', label: 'All Friends' }, { id: 'requests', label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}` }].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFriendsSubView(t.id)}
                    className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
                      friendsSubView === t.id
                        ? 'text-white border-b-2 border-purple-500'
                        : 'text-[#444] hover:text-[#888]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {!myId ? (
                <p className="text-[11px] text-[#444] text-center mt-8 px-3">Login with AniList to see friends</p>
              ) : friendsSubView === 'requests' ? (
                /* ── Incoming requests ── */
                <div className="flex-1 overflow-y-auto flex flex-col">
                  {!incomingRequests?.length ? (
                    <p className="text-[11px] text-[#444] text-center mt-8">No pending requests</p>
                  ) : incomingRequests.map(req => (
                    <FriendRequestRow key={req._id} req={req} label="Friend request" onAccept={acceptRequest} onReject={rejectRequest} />
                  ))}
                </div>
              ) : (
                /* ── All friends ── */
                <div className="flex-1 overflow-y-auto flex flex-col">
                  {!visibleFriends.length ? (
                    <p className="text-[11px] text-[#444] text-center mt-8 leading-relaxed px-3">
                      No friends yet.<br />
                      <span className="text-[#333]">Click a username in a room to add them.</span>
                    </p>
                  ) : visibleFriends.map(friend => (
                    <div key={friend.id} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#111114] last:border-0 hover:bg-[#111114] transition-colors group">
                      <Avatar src={friend.avatar} name={friend.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-white truncate">{friend.name}</div>
                        <div className="text-[10px] text-[#444]">Friend</div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setDmTarget({ id: friend.id, name: friend.name, avatar: friend.avatar }); setTab('dms') }}
                          className="px-2 py-1 bg-purple-600/80 hover:bg-purple-500 text-white text-[10px] transition-colors rounded"
                          title="Message"
                        >
                          DM
                        </button>
                        <button
                          onClick={() => unfriend({ requestId: friend.requestId })}
                          className="px-2 py-1 bg-[#1c1c20] hover:bg-red-600/60 text-[#666] hover:text-white text-[10px] transition-colors rounded"
                          title="Remove friend"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───── DMs TAB ───── */}
          {tab === 'dms' && (
            <div className="flex flex-col flex-1 min-h-0">
              {dmTarget ? (
                /* ── Open DM thread ── */
                <>
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1a22] shrink-0">
                    <button onClick={() => setDmTarget(null)} className="text-[#555] hover:text-[#aaa] text-sm mr-1 transition-colors">←</button>
                    <Avatar src={dmTarget.avatar} name={dmTarget.name} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] text-white block truncate">{dmTarget.name}</span>
                      {isEncryptedDM && (
                        <span className="text-[9px] text-green-500/60">🔒 End-to-end encrypted</span>
                      )}
                    </div>
                    {myId && (
                      dmTargetBlocked ? (
                        <button
                          onClick={() => unblockUser({ blockerId: myId, blockedId: dmTarget.id })}
                          className="text-[10px] text-green-500/70 hover:text-green-400 uppercase tracking-widest shrink-0 transition-colors"
                          title="Unblock"
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => blockUser({ blockerId: myId, blockedId: dmTarget.id })}
                          className="text-[10px] text-[#444] hover:text-red-400 uppercase tracking-widest shrink-0 transition-colors"
                          title="Block user"
                        >
                          Block
                        </button>
                      )
                    )}
                  </div>

                  {dmTargetBlocked && (
                    <div className="mx-3 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400/80 text-center shrink-0">
                      You have blocked this user. Unblock to send messages.
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
                    {!decryptedDmMsgs?.length && (
                      <p className="text-[10px] text-[#444] text-center mt-8">No messages yet.</p>
                    )}
                    {renderMessages(decryptedDmMsgs, myId, () => {})}
                    <div ref={dmEndRef} />
                  </div>

                  {!dmTargetBlocked && (
                  <div className="border-t border-[#1a1a22] shrink-0">
                    {pendingDmImage && (
                      <div className="relative px-3 pt-2">
                        <img src={pendingDmImage.previewUrl} className="max-h-[80px] rounded-lg object-contain border border-[#1a1a22]" alt="pending" />
                        <button
                          type="button"
                          onClick={() => setPendingDmImage(null)}
                          className="absolute top-1 right-2 w-5 h-5 bg-black/80 text-white text-[11px] rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSendDM} className="p-2 flex gap-2 items-center">
                      <input ref={dmFileInputRef} type="file" accept="image/*" className="hidden" onChange={makeImageSelectHandler(setPendingDmImage)} />
                      <button
                        type="button"
                        onClick={() => dmFileInputRef.current?.click()}
                        className="w-8 h-8 flex items-center justify-center text-[#555] hover:text-[#aaa] hover:border hover:border-[#1a1a22] rounded transition-colors shrink-0"
                        title="Attach image"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </button>
                      <input
                        value={dmInput}
                        onChange={e => setDmInput(e.target.value)}
                        placeholder={`Message ${dmTarget.name}...`}
                        className="flex-1 bg-[#0a0a0d] border-0 px-3 py-1.5 text-[12px] text-white placeholder-[#333] focus:outline-none focus:ring-1 focus:ring-purple-500/30 rounded transition-all"
                        maxLength={500}
                      />
                      <button
                        type="submit"
                        disabled={!dmInput.trim() && !pendingDmImage}
                        className="w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
                      >
                        ↑
                      </button>
                    </form>
                  </div>
                  )}
                </>
              ) : (
                /* ── DMs list ── */
                <>
                  {/* Sub-tabs: Chats | Requests */}
                  <div className="flex border-b border-[#1a1a22] shrink-0">
                    <button
                      onClick={() => setDmsSubView('conversations')}
                      className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
                        dmsSubView === 'conversations' ? 'text-white border-b-2 border-purple-500' : 'text-[#444] hover:text-[#888]'
                      }`}
                    >
                      Chats
                    </button>
                    <button
                      onClick={() => setDmsSubView('requests')}
                      className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
                        dmsSubView === 'requests' ? 'text-white border-b-2 border-purple-500' : 'text-[#444] hover:text-[#888]'
                      }`}
                    >
                      Requests {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1 rounded-full">{pendingCount}</span>}
                    </button>
                  </div>

                  {dmsSubView === 'requests' ? (
                    /* ── Incoming requests ── */
                    <div className="flex-1 overflow-y-auto flex flex-col">
                      {!myId ? (
                        <p className="text-[11px] text-[#444] text-center mt-8">Login with AniList to use DMs</p>
                      ) : !incomingRequests?.length ? (
                        <p className="text-[11px] text-[#444] text-center mt-8">No pending requests</p>
                      ) : incomingRequests.map(req => (
                        <FriendRequestRow key={req._id} req={req} label="wants to connect" onAccept={acceptRequest} onReject={rejectRequest} />
                      ))}
                    </div>
                  ) : (
                    /* ── Chats (friends) ── */
                    <div className="flex-1 overflow-y-auto flex flex-col">
                      {!myId ? (
                        <p className="text-[11px] text-[#444] text-center mt-8">Login with AniList to use DMs</p>
                      ) : !visibleFriends.length ? (
                        <p className="text-[11px] text-[#444] text-center mt-8 leading-relaxed px-3">
                          No friends yet.<br />
                          <span className="text-[#333]">Click someone's name in a room to add them.</span>
                        </p>
                      ) : visibleFriends.map(friend => {
                        const conv = convByPartner.get(friend.id)
                        const dmUnread = unreadNotifications?.dms?.[friend.id] || 0
                        return (
                          <button
                            key={friend.id}
                            onClick={() => setDmTarget({ id: friend.id, name: friend.name, avatar: friend.avatar })}
                            className="flex items-center gap-2.5 p-2.5 hover:bg-[#111114] transition-colors text-left border-b border-[#111114] last:border-0"
                          >
                            <Avatar src={friend.avatar} name={friend.name} size="lg" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[12px] truncate ${dmUnread > 0 ? 'text-white font-bold' : 'text-white'}`}>
                                  {friend.name}
                                </span>
                                {dmUnread > 0 && (
                                  <span className="shrink-0 min-w-[16px] h-[16px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                                    {dmUnread}
                                  </span>
                                )}
                              </div>
                              <div className={`text-[10px] truncate ${dmUnread > 0 ? 'text-[#888]' : 'text-[#444]'}`}>
                                {conv?.lastMessage || 'No messages yet'}
                              </div>
                            </div>
                            {conv && (
                              <span className="text-[9px] text-[#333] shrink-0">
                                {new Date(conv.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {/* close myId guard */}
          </>)}
        </div>
      )}
    </>
  )
}
