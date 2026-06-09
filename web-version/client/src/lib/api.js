// Web version API shim - replaces Electron IPC window.api
// In production, VITE_SERVER_URL points to the hosted backend (e.g. Render).
// When running locally, falls back to localhost:64621.
const BACKEND_PORT = 64621
const BASE_URL = import.meta.env.VITE_SERVER_URL || `http://localhost:${BACKEND_PORT}`

const api = {
  // Settings
  getSettingsJson: async () => {
    try {
      const res = await fetch(`${BASE_URL}/settings`)
      return res.json()
    } catch (err) {
      console.error('Failed to fetch settings from backend:', err)
      return {
        uploadLimit: -1,
        downloadLimit: -1,
        downloadsFolderPath: '',
        backendPort: BACKEND_PORT,
        broadcastDiscordRpc: false,
        extensionUrls: {}
      }
    }
  },
  saveToSettings: async (key, value) => {
    try {
      await fetch(`${BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
    } catch (err) {
      console.error('Failed to save settings to backend:', err)
    }
  },
  changeBackendPort: async (port) => {
    await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'backendPort', value: port })
    })
  },
  changeDownloadsFolder: async () => {
    // Not possible in browser - return current settings
    const res = await fetch(`${BASE_URL}/settings`)
    return res.json()
  },

  // OAuth - open in browser tab
  oauth: (url) => {
    window.open(url, '_blank')
  },

  // Window controls - no-ops in browser
  minimize: () => {},
  maximize: () => {},
  close: () => {},
  windowReload: () => window.location.reload(),

  // Discord RPC - no-op in web
  setDiscordRpc: () => {},
  broadcastDiscordRpc: async (value) => {
    await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'broadcastDiscordRpc', value })
    })
  },

  // VLC - not available in browser
  openVlc: () => {
    console.warn('VLC not available in web version')
  },

  // AnimePahe cookie webview - not available in browser
  openAnimePahe: () => {
    alert('Please visit animePahe in your browser and set cookies manually via the Settings page.')
  },

  // Open folder - not available in browser
  openFolder: () => {
    console.warn('Cannot open folder from browser')
  },

  // Deep links - no-op
  receiveDeeplink: () => {}
}

export default api
