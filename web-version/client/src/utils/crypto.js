/**
 * E2E Encryption Utilities
 * Uses Web Crypto API (ECDH P-256 for key exchange, AES-GCM for messages)
 *
 * DMs: ECDH-derived AES-GCM shared key (both parties derive same key)
 * Private rooms: ECIES per-message encryption for room key distribution, AES-GCM for messages
 */

const PRIV_KEY = 'e2e_priv'
const PUB_KEY = 'e2e_pub'

// ─── Key pair management ───────────────────────────────────────────────────────

export async function getOrCreateKeyPair() {
  const storedPriv = localStorage.getItem(PRIV_KEY)
  const storedPub = localStorage.getItem(PUB_KEY)

  if (storedPriv && storedPub) {
    return { privateKeyJwk: JSON.parse(storedPriv), publicKeyJwk: JSON.parse(storedPub) }
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

  localStorage.setItem(PRIV_KEY, JSON.stringify(privateKeyJwk))
  localStorage.setItem(PUB_KEY, JSON.stringify(publicKeyJwk))

  return { privateKeyJwk, publicKeyJwk }
}

export function getPublicKeyJwk() {
  const stored = localStorage.getItem(PUB_KEY)
  return stored ? JSON.parse(stored) : null
}

export function getPrivateKeyJwk() {
  const stored = localStorage.getItem(PRIV_KEY)
  return stored ? JSON.parse(stored) : null
}

// ─── ECDH shared key derivation ───────────────────────────────────────────────

export async function deriveSharedKey(myPrivJwk, theirPubJwk) {
  const myPrivKey = await crypto.subtle.importKey(
    'jwk',
    myPrivJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  )

  const theirPubKey = await crypto.subtle.importKey(
    'jwk',
    theirPubJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPubKey },
    myPrivKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─── AES-GCM encrypt / decrypt ────────────────────────────────────────────────

export async function encryptAES(plaintext, aesKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded)
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptAES(encryptedB64, aesKey) {
  try {
    const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0))
    if (combined.length <= 12) return '[encrypted]' // too short to be valid ciphertext
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch {
    return '[encrypted]'
  }
}

// ─── Room key helpers ──────────────────────────────────────────────────────────

export async function generateRoomKeyB64() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const raw = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
}

export async function importRoomKey(b64) {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

// ─── ECIES (Ephemeral ECDH + AES-GCM) ─────────────────────────────────────────

export async function encryptECIES(plaintext, recipientPubJwk) {
  // Generate ephemeral key pair
  const ephemeralPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  const recipientPubKey = await crypto.subtle.importKey(
    'jwk',
    recipientPubJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared AES key from ephemeral private + recipient public
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPubKey },
    ephemeralPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded)

  const ephemeralPubJwk = await crypto.subtle.exportKey('jwk', ephemeralPair.publicKey)

  return JSON.stringify({
    ephemeralPub: btoa(JSON.stringify(ephemeralPubJwk)),
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  })
}

export async function decryptECIES(encryptedJson, myPrivJwk) {
  try {
    const { ephemeralPub, iv: ivB64, ct } = JSON.parse(encryptedJson)

    const ephemeralPubJwk = JSON.parse(atob(ephemeralPub))

    const ephemeralPubKey = await crypto.subtle.importKey(
      'jwk',
      ephemeralPubJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    )

    const myPrivKey = await crypto.subtle.importKey(
      'jwk',
      myPrivJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey', 'deriveBits']
    )

    const sharedKey = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: ephemeralPubKey },
      myPrivKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )

    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ct), c => c.charCodeAt(0))
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch {
    return '[encrypted]'
  }
}
