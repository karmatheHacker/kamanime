import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { isTruthyWithZero } from '../lib/utils'
import serverApi from '../lib/api'

const ZenshinContext = createContext()

export function useZenshinContext() {
  const context = useContext(ZenshinContext)
  if (context === undefined) {
    throw new Error('useZenshinContext must be used within a ZenshinProvider')
  }
  return context
}

const DEFAULTS = {
  glow: true,
  vlcPath: '"C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"',
  autoUpdateAnilistEpisode: true,
  scrollOpacity: false,
  hideHero: false,
  checkForUpdates: true,
  hoverCard: true,
  smoothScroll: true
}

export default function ZenshinProvider({ children }) {
  // ── Convex: user preferences ───────────────────────────
  const prefs = useQuery(api.preferences.getAll)
  const setPref = useMutation(api.preferences.set)

  const get = (key) => (prefs && prefs[key] !== undefined ? prefs[key] : DEFAULTS[key])

  const glow = get('glow')
  const vlcPath = get('vlcPath')
  const autoUpdateAnilistEpisode = get('autoUpdateAnilistEpisode')
  const scrollOpacity = get('scrollOpacity')
  const hideHero = get('hideHero')
  const checkForUpdates = get('checkForUpdates')
  const hoverCard = get('hoverCard')
  const smoothScroll = get('smoothScroll')

  const setGlow = (v) => setPref({ key: 'glow', value: v })
  const setVlcPath = (v) => setPref({ key: 'vlcPath', value: v })
  const setAutoUpdateAnilistEpisode = (v) => setPref({ key: 'autoUpdateAnilistEpisode', value: v })
  const setScrollOpacity = (v) => setPref({ key: 'scrollOpacity', value: v })
  const setHideHero = (v) => setPref({ key: 'hideHero', value: v })
  const setCheckForUpdates = (v) => setPref({ key: 'checkForUpdates', value: v })
  const setHoverCard = (v) => setPref({ key: 'hoverCard', value: v })
  const setSmoothScroll = (v) => setPref({ key: 'smoothScroll', value: v })

  // ── Chat panel open state ──────────────────────────────
  const [chatOpen, setChatOpen] = useState(false)

  // ── AniList user (kept in memory) ─────────────────────
  const [userId, setUserId] = useState('')

  // ── Unread notifications ───────────────────────────────
  const unreadNotifications = useQuery(
    api.notifications.getUnread,
    userId ? { userId: parseInt(userId) } : 'skip'
  )

  // ── Server settings (port, torrent limits, etc.) ──────
  const [backendPort, setBackendPort] = useState(64621)
  // serverUrl is the resolved base URL for all Express API calls.
  // In production it comes from VITE_SERVER_URL; locally it tracks backendPort.
  const [serverUrl, setServerUrl] = useState(
    import.meta.env.VITE_SERVER_URL || 'http://localhost:64621'
  )
  const [broadcastDiscordRpc, setBroadcastDiscordRpc] = useState(false)
  const [uploadLimit, setUploadLimit] = useState(-1)
  const [downloadLimit, setDownloadLimit] = useState(-1)
  const [settings, setSettings] = useState({})

  useEffect(() => {
    async function loadServerSettings() {
      try {
        const s = await serverApi.getSettingsJson()
        if (s.backendPort) {
          setBackendPort(s.backendPort)
          // Only update serverUrl from port if no production URL is set
          if (!import.meta.env.VITE_SERVER_URL) {
            setServerUrl(`http://localhost:${s.backendPort}`)
          }
        }
        if (s.broadcastDiscordRpc) setBroadcastDiscordRpc(s.broadcastDiscordRpc)
        if (isTruthyWithZero(s.uploadLimit) && s.uploadLimit !== -1)
          setUploadLimit(parseInt(s.uploadLimit) / 1024)
        if (isTruthyWithZero(s.downloadLimit) && s.downloadLimit !== -1)
          setDownloadLimit(parseInt(s.downloadLimit) / 1024)
        setSettings(s)
      } catch {
        console.warn('Could not load server settings')
      }
    }
    loadServerSettings()
  }, [])

  return (
    <ZenshinContext.Provider
      value={{
        chatOpen, setChatOpen,
        unreadNotifications,
        glow, setGlow,
        vlcPath, setVlcPath,
        autoUpdateAnilistEpisode, setAutoUpdateAnilistEpisode,
        scrollOpacity, setScrollOpacity,
        hideHero, setHideHero,
        userId, setUserId,
        checkForUpdates, setCheckForUpdates,
        backendPort, setBackendPort,
        serverUrl,
        broadcastDiscordRpc, setBroadcastDiscordRpc,
        hoverCard, setHoverCard,
        settings, setSettings,
        smoothScroll, setSmoothScroll,
        uploadLimit, setUploadLimit,
        downloadLimit, setDownloadLimit
      }}
    >
      {children}
    </ZenshinContext.Provider>
  )
}
