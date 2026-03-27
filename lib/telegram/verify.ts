import crypto from 'crypto'

/**
 * Verifies a Telegram Mini App initData string using HMAC-SHA256.
 *
 * Algorithm:
 * 1. Parse initData as URLSearchParams
 * 2. Extract and remove the `hash` field
 * 3. Sort remaining key=value pairs alphabetically and join with \n
 * 4. Create secret key: HMAC-SHA256("WebAppData", botToken)
 * 5. Compute expected hash: HMAC-SHA256(dataCheckString, secretKey)
 * 6. Compare hashes in constant time
 * 7. Verify auth_date is within 1 hour
 *
 * @param initData  Raw initData string from Telegram
 * @param botToken  Telegram bot token (from BotFather)
 * @returns         true if the data is authentic and fresh
 */
export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false

  let params: URLSearchParams
  try {
    params = new URLSearchParams(initData)
  } catch {
    return false
  }

  const hash = params.get('hash')
  if (!hash) return false

  // Remove hash before building the check string
  params.delete('hash')

  // Sort params alphabetically and build the data check string
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  // Derive the secret key using "WebAppData" as HMAC key
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()

  // Compute expected hash
  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  const hashBuffer = Buffer.from(hash, 'hex')
  const expectedBuffer = Buffer.from(expectedHash, 'hex')

  if (hashBuffer.length !== expectedBuffer.length) return false

  try {
    if (!crypto.timingSafeEqual(hashBuffer, expectedBuffer)) return false
  } catch {
    return false
  }

  // Verify auth_date is not older than 1 hour (3600 seconds)
  const authDate = parseInt(params.get('auth_date') ?? '0', 10)
  if (isNaN(authDate) || authDate === 0) return false

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate
  if (ageSeconds > 3600) return false

  return true
}

/**
 * Extracts the user object from a verified initData string.
 * Returns null if parsing fails or user field is absent.
 */
export function extractTelegramUser(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')
    if (!userStr) return null
    return JSON.parse(userStr) as TelegramUser
  } catch {
    return null
  }
}

export interface TelegramUser {
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}
