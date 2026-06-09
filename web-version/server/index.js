import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import { mkdirp } from 'mkdirp'
import Settings from './settings.js'
import announce from './announce.js'
import { ConvexHttpClient } from 'convex/browser'

const CONVEX_URL = process.env.CONVEX_URL || 'https://capable-parrot-814.eu-west-1.convex.cloud'
const convex = new ConvexHttpClient(CONVEX_URL)

let chalk
import('chalk').then((m) => { chalk = m.default })

const settings = new Settings()

const us = () => {
  if ((!settings.get('uploadLimit') && settings.get('uploadLimit') !== 0) || settings.get('uploadLimit') === -1) return -1
  return settings.get('uploadLimit')
}
const ds = () => {
  if ((!settings.get('downloadLimit') && settings.get('downloadLimit') !== 0) || settings.get('downloadLimit') === -1) return -1
  return settings.get('downloadLimit')
}

let client = null
async function loadWebTorrent() {
  const { default: WebTorrent } = await import('webtorrent')
  try {
    client = new WebTorrent({ uploadLimit: us(), downloadLimit: ds() })
    console.log('WebTorrent loaded')
  } catch (err) {
    console.error('WebTorrent error:', err)
  }
}
await loadWebTorrent()

// Dynamically import animepahe router
const { animepaheRouter } = await import('./animepahe/routes/search.js')

const app = express()
app.use(cors())
app.use(express.json())

// Serve built client (for production)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.join(__dirname, '../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
}

if (settings.get('downloadsFolderPath') && !fs.existsSync(settings.get('downloadsFolderPath'))) {
  mkdirp.sync(settings.get('downloadsFolderPath'))
}

const wss = new WebSocketServer({ noServer: true })

/* -------------------- GET METADATA -------------------- */
app.get('/metadata/:magnet', async (req, res) => {
  let magnet = req.params.magnet
  let existingTorrent = await client.get(magnet)

  if (existingTorrent) {
    let files = existingTorrent.files.map((file) => ({ name: file.name, length: file.length }))
    return res.status(200).json(files)
  }

  client.torrents.forEach((torrent) => {
    console.log('Stopping:', torrent.name)
    torrent.destroy()
  })

  const torrent = client.add(magnet, {
    path: settings.get('downloadsFolderPath'),
    deselect: true,
    announce: announce
  })

  torrent.on('metadata', () => {
    const files = torrent.files.map((file) => ({ name: file.name, length: file.length }))
    torrent.files.forEach((file) => file.deselect())
    res.status(200).json(files)
  })
})

/* -------------------- STREAM FILE -------------------- */
let detailsOfEpisode = { name: '', length: 0, downloaded: 0, progress: 0, percentageWatched: 0 }

app.get('/streamfile/:magnet/:filename', async (req, res) => {
  let magnet = req.params.magnet
  let filename = req.params.filename
  let tor = await client.get(magnet)

  if (!tor) return res.status(404).send('Torrent not found')

  let file = tor.files.find((f) => f.name === filename)
  if (!file) return res.status(404).send('No file found in the torrent')

  file.select()

  let range = req.headers.range
  if (!range) return res.status(416).send('Range is required')

  let positions = range.replace(/bytes=/, '').split('-')
  let start = parseInt(positions[0], 10)
  let file_size = file.length
  let end = positions[1] ? parseInt(positions[1], 10) : file_size - 1
  let chunksize = end - start + 1

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${file_size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunksize,
    'Content-Type': 'video/x-matroska'
  })

  detailsOfEpisode.percentageWatched = (start / end) * 100

  let stream = file.createReadStream({ start, end })
  stream.pipe(res)
  stream.on('error', (err) => {
    console.error('Stream error:', err)
    if (!res.headersSent) res.status(500).send('Error streaming the video')
  })
})

/* -------------------- DESELECT -------------------- */
app.get('/deselect/:magnet/:filename', async (req, res) => {
  let tor = await client.get(req.params.magnet)
  if (!tor) return res.status(404).send('Torrent not found')
  let file = tor.files.find((f) => f.name === req.params.filename)
  if (!file) return res.status(404).send('No file found')
  file.deselect()
  res.status(200).send('File deselected successfully')
})

/* -------------------- EPISODE DETAILS -------------------- */
app.get('/detailsepisode/:magnet/:filename', async (req, res) => {
  let tor = await client.get(req.params.magnet)
  if (!tor) return res.status(404).send('Torrent not found')
  let file = tor.files.find((f) => f.name === req.params.filename)
  if (!file) return res.status(404).send('No file found')
  detailsOfEpisode = {
    name: file.name,
    length: file.length,
    downloaded: file.downloaded,
    progress: file.progress,
    percentageWatched: detailsOfEpisode.percentageWatched
  }
  res.status(200).json(detailsOfEpisode)
})

/* -------------------- DOWNLOADS INFO -------------------- */
app.get('/downloadsInfo', (req, res) => {
  let files = client.torrents.map((torrent) => ({
    name: torrent.name,
    length: torrent.length,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    downloaded: torrent.downloaded,
    uploaded: torrent.uploaded,
    progress: torrent.progress,
    done: torrent.done,
    magnet: torrent.magnetURI
  }))
  res.status(200).json(files)
})

/* -------------------- DETAILS -------------------- */
app.get('/details/:magnet', async (req, res) => {
  let tor = await client.get(req.params.magnet)
  if (!tor) return res.status(404).send('Torrent not found')
  res.status(200).json({
    name: tor.name, length: tor.length, downloaded: tor.downloaded,
    uploaded: tor.uploaded, downloadSpeed: tor.downloadSpeed,
    uploadSpeed: tor.uploadSpeed, progress: tor.progress,
    ratio: tor.ratio, numPeers: tor.numPeers
  })
})

/* -------------------- REMOVE -------------------- */
app.delete('/remove/:magnet', async (req, res) => {
  let tor = await client.get(req.params.magnet)
  if (!tor) return res.status(404).send('Torrent not found')
  const magnetURI = tor.magnetURI
  tor.destroy(async (err) => {
    if (err) return res.status(500).send('Error removing torrent')
    settings.set('currentAnime', null)
    await convex.mutation('torrents:remove', { magnet: magnetURI }).catch(() => {})
    res.status(200).send('Torrent removed successfully')
  })
})

/* -------------------- VLC (optional) -------------------- */
app.get('/stream-to-vlc', (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).send('URL is required')
  const vlcPath = settings.get('vlcPath') || '"C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"'
  exec(`${vlcPath} "${url}"`, (error) => {
    if (error) return res.status(500).send('Error launching VLC')
    res.send('VLC launched successfully')
  })
})

/* -------------------- PING -------------------- */
app.get('/ping', (req, res) => res.status(200).send('pong'))
app.get('/', (req, res) => res.redirect('http://localhost:5173'))

/* -------------------- SETTINGS -------------------- */
app.get('/settings', (req, res) => res.status(200).json(settings.getSettings()))
app.post('/settings', (req, res) => {
  const { key, value } = req.body
  settings.set(key, value)
  res.status(200).send('Setting updated')
})

/* -------------------- ANIMEPAHE -------------------- */
app.use('/animepahe', animepaheRouter)

/* -------------------- CONVEX SYNC -------------------- */
// Push WebTorrent state to Convex every 2 seconds (global, not per-connection)
setInterval(async () => {
  if (!client) return
  try {
    const torrents = client.torrents.map((t) => ({
      magnet: t.magnetURI,
      name: t.name || undefined,
      length: t.length || undefined,
      downloaded: t.downloaded || undefined,
      uploaded: t.uploaded || undefined,
      downloadSpeed: t.downloadSpeed || undefined,
      uploadSpeed: t.uploadSpeed || undefined,
      progress: t.progress || undefined,
      done: t.done || undefined
    }))
    await convex.mutation('torrents:syncAll', {
      clientDownloadSpeed: client.downloadSpeed,
      clientUploadSpeed: client.uploadSpeed,
      torrents
    })
  } catch (e) {
    // non-fatal — Convex sync failure shouldn't crash streaming
  }
}, 2000)

/* -------------------- WEBSOCKET -------------------- */
wss.on('connection', (ws) => {
  console.log('WebSocket client connected')

  const interval = setInterval(() => {
    if (!client) return
    let data = [{ clientDownloadSpeed: client.downloadSpeed, clientUploadSpeed: client.uploadSpeed }]
    const torrents = client.torrents.map((t) => ({
      name: t.name, length: t.length, downloadSpeed: t.downloadSpeed,
      uploadSpeed: t.uploadSpeed, downloaded: t.downloaded, uploaded: t.uploaded,
      progress: t.progress, done: t.done, magnet: t.magnetURI
    }))
    try { ws.send(JSON.stringify([...data, ...torrents])) } catch {}
  }, 1000)

  ws.on('close', () => {
    clearInterval(interval)
  })
})

const PORT = settings.get('backendPort') || 64621
const server = app.listen(PORT, () => {
  console.log(`Zenshin server running at http://localhost:${PORT}`)
})

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request))
  } else {
    socket.destroy()
  }
})
