import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/admin', '/scan-card', '/scan-attendance']

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Halaman login sendiri tidak diproteksi
  if (path === '/admin/login') {
    return NextResponse.next()
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))

  if (isProtected) {
    const session = request.cookies.get('admin_session')

    if (!session || session.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/scan-card/:path*', '/scan-attendance/:path*'],
}