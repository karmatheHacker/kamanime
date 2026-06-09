// DiscordRPC is not available in the web version
// This is a no-op stub for compatibility
class DiscordRPC {
  constructor(clientId) {
    this.clientId = clientId
  }

  initialize() {
    console.warn('Discord RPC is not supported in web mode')
  }

  setActivity(activityDetails) {
    console.warn('Discord RPC is not supported in web mode')
  }

  disconnect() {
    console.warn('Discord RPC is not supported in web mode')
  }
}

export default DiscordRPC
