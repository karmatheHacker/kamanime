import os from 'os'
import fs from 'fs'
import path from 'path'
import encUrls from '../../utils.js'

const baseUrl = encUrls.pahe

// Middleware to read cookies from cookies.json and attach the base URL and cookies to the request object
async function cookieMiddleware(req, res, next) {
  const zenshinPathDocuments = path.join(os.homedir(), 'Documents', 'Zenshin')
  const cookiesPath = path.join(zenshinPathDocuments, 'cookies.json')

  req.baseUrl = baseUrl

  try {
    const data = await fs.promises.readFile(cookiesPath, 'utf8')
    const cookieString = JSON.parse(data)
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ')
    req.cookiesString = cookieString
  } catch {
    // cookies.json missing — continue without cookies (some routes may still work)
    req.cookiesString = ''
    console.warn('cookies.json not found — AnimePahe requests will proceed without cookies')
  }

  next()
}

export default cookieMiddleware
