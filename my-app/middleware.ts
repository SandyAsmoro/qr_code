import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip proteksi untuk halaman login itu sendiri
  if (path === '/admin/login') {
    return NextResponse.next()
  }

  if (path.startsWith('/admin')) {
    const session = request.cookies.get('admin_session')

    // Sementara
    console.log('Cookie session:', session?.value)
    console.log('Env password:', process.env.ADMIN_PASSWORD)
    console.log('Match?', session?.value === process.env.ADMIN_PASSWORD)
    // sementara

    if (!session || session.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}