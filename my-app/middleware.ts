import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { getSession } from '@/lib/auth'

const ADMIN_PREFIXES = [
  '/admin',
  '/scan-card',
  '/scan-attendance',
]

const PANITIA_PREFIXES = [
  '/panitia',
]

export async function middleware(
  request: NextRequest
) {
  const path = request.nextUrl.pathname

  /*
   * Semua login lama diarahkan ke satu halaman login.
   */
  if (
    path === '/login' ||
    path === '/admin/login' ||
    path === '/panitia/login'
  ) {
    if (path !== '/login') {
      return NextResponse.redirect(
        new URL('/login', request.url)
      )
    }

    return NextResponse.next()
  }

  const isAdminArea =
    ADMIN_PREFIXES.some(
      (prefix) =>
        path === prefix ||
        path.startsWith(`${prefix}/`)
    )

  const isPanitiaArea =
    PANITIA_PREFIXES.some(
      (prefix) =>
        path === prefix ||
        path.startsWith(`${prefix}/`)
    )

  /*
   * Bukan area yang membutuhkan autentikasi.
   */
  if (
    !isAdminArea &&
    !isPanitiaArea
  ) {
    return NextResponse.next()
  }

  /*
   * Ambil session yang sudah diverifikasi
   * signature-nya.
   */
  const session = await getSession(request)

  /*
   * Tidak login.
   */
  if (!session) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    )
  }

  /*
   * Area Admin hanya boleh Admin.
   */
  if (
    isAdminArea &&
    session.role !== 'admin'
  ) {
    return NextResponse.redirect(
      new URL(
        '/panitia/dashboard',
        request.url
      )
    )
  }

  /*
   * Area Panitia hanya boleh Panitia.
   */
  if (
    isPanitiaArea &&
    session.role !== 'panitia'
  ) {
    return NextResponse.redirect(
      new URL('/admin', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/panitia/:path*',
    '/scan-card/:path*',
    '/scan-attendance/:path*',
  ],
}