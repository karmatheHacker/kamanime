import os from 'os'
import path from 'path'
import fs from 'fs'
import { mkdirp } from 'mkdirp'

const zenshinDir = path.join(os.homedir(), 'Documents', 'Zenshin')
const settingsPath = path.join(zenshinDir, 'settings.json')
const defaultDownloadsDir = path.join(os.homedir(), 'Downloads', 'ZenshinDownloads')

mkdirp.sync(zenshinDir)

export default class Settings {
  constructor() {
    this.defaultSettings = {
      uploadLimit: -1,
      downloadLimit: -1,
      downloadsFolderPath: defaultDownloadsDir,
      backendPort: 64621,
      broadcastDiscordRpc: false,
      extensionUrls: {},
      adminPassword: 'admin'
    }
    this.settings = this.loadSettings()
  }

  loadSettings() {
    if (!fs.existsSync(settingsPath)) {
      this.settings = this.defaultSettings
      this.saveSettings()
      return this.defaultSettings
    }
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      return this.defaultSettings
    }
  }

  saveSettings() {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2))
    } catch (err) {
      console.error('Error saving settings:', err)
    }
  }

  get(key) { return this.settings[key] }
  set(key, value) { this.settings[key] = value; this.saveSettings() }
  getSettings() { return this.settings }
  getDefaultSettings() { return this.defaultSettings }
}
