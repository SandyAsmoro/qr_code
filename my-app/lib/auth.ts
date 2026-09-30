import { NextRequest, NextResponse } from 'next/server'

export type AppRole = 'admin' | 'panitia'

type SessionPayload = {
  role: AppRole
  exp: number
}

const COOKIE_NAME = 'app_session'

const SESSION_MAX_AGE = 60 * 60 * 8 // 8 jam

function base64UrlEncode(value: string) {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value: string) {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (value.length % 4)) % 4)

  return atob(padded)
}

async function sign(value: string) {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    throw new Error(
      'SESSION_SECRET belum dikonfigurasi.'
    )
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign', 'verify']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value)
  )

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(signature)
    )
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function verify(
  value: string,
  signature: string
) {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    return false
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  )

  const signatureBytes = Uint8Array.from(
    atob(
      signature.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat(
          (4 - (signature.length % 4)) % 4
        )
    ),
    (c) => c.charCodeAt(0)
  )

  return crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    new TextEncoder().encode(value)
  )
}

export async function createSessionToken(
  role: AppRole
) {
  const payload: SessionPayload = {
    role,
    exp:
      Math.floor(Date.now() / 1000) +
      SESSION_MAX_AGE,
  }

  const encoded = base64UrlEncode(
    JSON.stringify(payload)
  )

  const signature = await sign(encoded)

  return `${encoded}.${signature}`
}

export async function getSession(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token =
    request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const [encoded, signature] = token.split('.')

  if (!encoded || !signature) {
    return null
  }

  try {
    const valid = await verify(
      encoded,
      signature
    )

    if (!valid) {
      return null
    }

    const payload = JSON.parse(
      base64UrlDecode(encoded)
    ) as SessionPayload

    /*
     * Pastikan role benar-benar salah satu role
     * yang dikenal aplikasi.
     */
    if (
      payload.role !== 'admin' &&
      payload.role !== 'panitia'
    ) {
      return null
    }

    /*
     * Pastikan expiration valid.
     */
    if (
      !Number.isFinite(payload.exp) ||
      payload.exp <=
        Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export async function requireRole(
  request: NextRequest,
  role: AppRole
) {
  const session = await getSession(request)

  if (!session) {
    return null
  }

  if (session.role !== role) {
    return null
  }

  return session
}

export function setSessionCookie(
  response: NextResponse,
  token: string
) {
  response.cookies.set(
    COOKIE_NAME,
    token,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV === 'production',

      sameSite: 'lax',

      maxAge: SESSION_MAX_AGE,

      path: '/',
    }
  )
}

export function clearSessionCookie(
  response: NextResponse
) {
  response.cookies.set(
    COOKIE_NAME,
    '',
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV === 'production',

      sameSite: 'lax',

      maxAge: 0,

      path: '/',
    }
  )

  /*
   * Hapus cookie lama dari versi sebelumnya.
   */
  response.cookies.delete(
    'admin_session'
  )
}