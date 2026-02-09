/**
 * Tencent Cloud COS utility - Edge Runtime compatible
 * Uses fetch() + COS XML API with manual request signing (HMAC-SHA1 via Web Crypto API)
 */

// ---- Helpers for HMAC-SHA1 and SHA1 using Web Crypto API ----

async function hmacSha1(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? enc.encode(key) : key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  return await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha1Hex(message: string): Promise<string> {
  const enc = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-1', enc.encode(message))
  return bufferToHex(hash)
}

async function md5Hex(message: string): Promise<string> {
  // MD5 is not available in Web Crypto API, implement a simple version for CDN auth
  // Use a pure JS MD5 implementation
  return simpleMd5(message)
}

// ---- Simple MD5 implementation for CDN Type A authentication ----
function simpleMd5(input: string): string {
  const enc = new TextEncoder()
  const bytes = enc.encode(input)

  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3]
    a = ff(a, b, c, d, k[0], 7, -680876936)
    d = ff(d, a, b, c, k[1], 12, -389564586)
    c = ff(c, d, a, b, k[2], 17, 606105819)
    b = ff(b, c, d, a, k[3], 22, -1044525330)
    a = ff(a, b, c, d, k[4], 7, -176418897)
    d = ff(d, a, b, c, k[5], 12, 1200080426)
    c = ff(c, d, a, b, k[6], 17, -1473231341)
    b = ff(b, c, d, a, k[7], 22, -45705983)
    a = ff(a, b, c, d, k[8], 7, 1770035416)
    d = ff(d, a, b, c, k[9], 12, -1958414417)
    c = ff(c, d, a, b, k[10], 17, -42063)
    b = ff(b, c, d, a, k[11], 22, -1990404162)
    a = ff(a, b, c, d, k[12], 7, 1804603682)
    d = ff(d, a, b, c, k[13], 12, -40341101)
    c = ff(c, d, a, b, k[14], 17, -1502002290)
    b = ff(b, c, d, a, k[15], 22, 1236535329)
    a = gg(a, b, c, d, k[1], 5, -165796510)
    d = gg(d, a, b, c, k[6], 9, -1069501632)
    c = gg(c, d, a, b, k[11], 14, 643717713)
    b = gg(b, c, d, a, k[0], 20, -373897302)
    a = gg(a, b, c, d, k[5], 5, -701558691)
    d = gg(d, a, b, c, k[10], 9, 38016083)
    c = gg(c, d, a, b, k[15], 14, -660478335)
    b = gg(b, c, d, a, k[4], 20, -405537848)
    a = gg(a, b, c, d, k[9], 5, 568446438)
    d = gg(d, a, b, c, k[14], 9, -1019803690)
    c = gg(c, d, a, b, k[3], 14, -187363961)
    b = gg(b, c, d, a, k[8], 20, 1163531501)
    a = gg(a, b, c, d, k[13], 5, -1444681467)
    d = gg(d, a, b, c, k[2], 9, -51403784)
    c = gg(c, d, a, b, k[7], 14, 1735328473)
    b = gg(b, c, d, a, k[12], 20, -1926607734)
    a = hh(a, b, c, d, k[5], 4, -378558)
    d = hh(d, a, b, c, k[8], 11, -2022574463)
    c = hh(c, d, a, b, k[11], 16, 1839030562)
    b = hh(b, c, d, a, k[14], 23, -35309556)
    a = hh(a, b, c, d, k[1], 4, -1530992060)
    d = hh(d, a, b, c, k[4], 11, 1272893353)
    c = hh(c, d, a, b, k[7], 16, -155497632)
    b = hh(b, c, d, a, k[10], 23, -1094730640)
    a = hh(a, b, c, d, k[13], 4, 681279174)
    d = hh(d, a, b, c, k[0], 11, -358537222)
    c = hh(c, d, a, b, k[3], 16, -722521979)
    b = hh(b, c, d, a, k[6], 23, 76029189)
    a = hh(a, b, c, d, k[9], 4, -640364487)
    d = hh(d, a, b, c, k[12], 11, -421815835)
    c = hh(c, d, a, b, k[15], 16, 530742520)
    b = hh(b, c, d, a, k[2], 23, -995338651)
    a = ii(a, b, c, d, k[0], 6, -198630844)
    d = ii(d, a, b, c, k[7], 10, 1126891415)
    c = ii(c, d, a, b, k[14], 15, -1416354905)
    b = ii(b, c, d, a, k[5], 21, -57434055)
    a = ii(a, b, c, d, k[12], 6, 1700485571)
    d = ii(d, a, b, c, k[3], 10, -1894986606)
    c = ii(c, d, a, b, k[10], 15, -1051523)
    b = ii(b, c, d, a, k[1], 21, -2054922799)
    a = ii(a, b, c, d, k[8], 6, 1873313359)
    d = ii(d, a, b, c, k[15], 10, -30611744)
    c = ii(c, d, a, b, k[6], 15, -1560198380)
    b = ii(b, c, d, a, k[13], 21, 1309151649)
    a = ii(a, b, c, d, k[4], 6, -145523070)
    d = ii(d, a, b, c, k[11], 10, -1120210379)
    c = ii(c, d, a, b, k[2], 15, 718787259)
    b = ii(b, c, d, a, k[9], 21, -343485551)
    x[0] = add32(a, x[0])
    x[1] = add32(b, x[1])
    x[2] = add32(c, x[2])
    x[3] = add32(d, x[3])
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t))
    return add32((a << s) | (a >>> (32 - s)), b)
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t)
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t)
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t)
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t)
  }
  function add32(a: number, b: number) {
    return (a + b) & 0xFFFFFFFF
  }

  const n = bytes.length
  const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  let i
  for (i = 0; i < n; i++) tail[i >> 2] |= bytes[i] << ((i % 4) << 3)
  tail[i >> 2] |= 0x80 << ((i % 4) << 3)

  if (i > 55) {
    const state = [1732584193, -271733879, -1732584194, 271733878]
    md5cycle(state, tail)
    const newTail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    newTail[14] = n * 8
    md5cycle(state, newTail)
    return state.map(v => {
      let s = ''
      for (let j = 0; j < 4; j++) s += ((v >> (j * 8)) & 0xFF).toString(16).padStart(2, '0')
      return s
    }).join('')
  }

  tail[14] = n * 8
  const state = [1732584193, -271733879, -1732584194, 271733878]
  md5cycle(state, tail)
  return state.map(v => {
    let s = ''
    for (let j = 0; j < 4; j++) s += ((v >> (j * 8)) & 0xFF).toString(16).padStart(2, '0')
    return s
  }).join('')
}

// ---- COS Request Signing (COS XML API) ----

interface COSConfig {
  secretId: string
  secretKey: string
  bucket: string
  region: string
}

function getCOSConfig(): COSConfig {
  const config = useRuntimeConfig()
  return {
    secretId: config.tencentCosSecretId as string,
    secretKey: config.tencentCosSecretKey as string,
    bucket: config.tencentCosBucket as string,
    region: config.tencentCosRegion as string,
  }
}

function getCOSHost(bucket: string, region: string): string {
  return `${bucket}.cos.${region}.myqcloud.com`
}

async function generateCOSAuthorization(
  method: string,
  key: string,
  headers: Record<string, string>,
  cosConfig: COSConfig,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 600 // 10 minutes validity
  const keyTime = `${now};${expiry}`

  // Step 1: Generate SignKey
  const signKeyBuf = await hmacSha1(cosConfig.secretKey, keyTime)
  const signKey = bufferToHex(signKeyBuf)

  // Step 2: Generate HttpString and then SHA1 hash
  const httpMethod = method.toLowerCase()
  const uriPathname = key.startsWith('/') ? key : `/${key}`
  const httpParameters = '' // no query params for PUT/GET object
  const sortedHeaders: [string, string][] = Object.entries(headers)
    .map(([k, v]) => [k.toLowerCase(), v] as [string, string])
    .filter(([k]) => k === 'host' || k === 'content-type' || k === 'content-length')
    .sort((a, b) => a[0].localeCompare(b[0]))

  const headerString = sortedHeaders.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const headerList = sortedHeaders.map(([k]) => k).join(';')

  const httpString = `${httpMethod}\n${uriPathname}\n${httpParameters}\n${headerString}\n`
  const sha1HttpString = await sha1Hex(httpString)

  // Step 3: Generate StringToSign
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpString}\n`

  // Step 4: Generate Signature
  const signatureBuf = await hmacSha1(
    hexToBuffer(signKey),
    stringToSign,
  )
  const signature = bufferToHex(signatureBuf)

  return `q-sign-algorithm=sha1&q-ak=${cosConfig.secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=${headerList}&q-url-param-list=&q-signature=${signature}`
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer
}

// ---- Public API ----

/**
 * Upload content to Tencent Cloud COS
 */
export async function uploadToCOS(key: string, content: string): Promise<{ success: boolean, url: string }> {
  const cosConfig = getCOSConfig()
  const host = getCOSHost(cosConfig.bucket, cosConfig.region)
  const url = `https://${host}/${key}`

  const body = new TextEncoder().encode(content)

  const headers: Record<string, string> = {
    'Host': host,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(body.byteLength),
  }

  const authorization = await generateCOSAuthorization('PUT', key, headers, cosConfig)

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...headers,
      Authorization: authorization,
    },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[COS] Upload failed:', response.status, text)
    throw new Error(`COS upload failed: ${response.status} ${text}`)
  }

  console.log(`[COS] Uploaded: ${key}`)
  return { success: true, url }
}

/**
 * Get content from COS directly (server-side, without CDN)
 */
export async function getFromCOS(key: string): Promise<string> {
  const cosConfig = getCOSConfig()
  const host = getCOSHost(cosConfig.bucket, cosConfig.region)
  const url = `https://${host}/${key}`

  const headers: Record<string, string> = {
    Host: host,
  }

  const authorization = await generateCOSAuthorization('GET', key, headers, cosConfig)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...headers,
      Authorization: authorization,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[COS] Get failed:', response.status, text)
    throw new Error(`COS get failed: ${response.status} ${text}`)
  }

  return await response.text()
}

/**
 * Generate a CDN signed URL for client-side access (Type A authentication)
 * Format: https://cdn.domain.com/path?sign=timestamp-rand-uid-md5hash
 * md5hash = MD5(URI-Timestamp-rand-uid-PrivateKey)
 */
export function generateCDNSignedUrl(key: string): string {
  const config = useRuntimeConfig()
  const cdnDomain = (config.public.tencentCdnDomain as string).replace(/\/$/, '')
  const authKey = config.tencentCdnAuthKey as string
  const ttl = parseInt(config.tencentCdnAuthTtl as string) || 3600

  const timestamp = Math.floor(Date.now() / 1000) + ttl
  const rand = Math.random().toString(36).substring(2, 10)
  const uid = '0'
  const uri = key.startsWith('/') ? key : `/${key}`

  const signStr = `${uri}-${timestamp}-${rand}-${uid}-${authKey}`
  const md5hash = simpleMd5(signStr)

  return `${cdnDomain}${uri}?sign=${timestamp}-${rand}-${uid}-${md5hash}`
}

/**
 * Generate COS key for daily note
 * Includes record ID to prevent collisions when multiple notes exist for the same date
 */
export function getDailyNoteCOSKey(userId: string, noteDate: string, recordId: string): string {
  return `dida-master/${userId}/daily-notes/${noteDate}_${recordId}.json`
}

/**
 * Generate COS key for weekly report
 * Includes record ID to prevent collisions
 */
export function getWeeklyReportCOSKey(userId: string, periodStart: string, periodEnd: string, recordId: string): string {
  return `dida-master/${userId}/weekly-reports/${periodStart}_${periodEnd}_${recordId}.json`
}
