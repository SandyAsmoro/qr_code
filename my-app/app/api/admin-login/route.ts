import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Sementara
    console.log('Password dari input:', JSON.stringify(password))
    console.log('Password dari env:', JSON.stringify(process.env.ADMIN_PASSWORD))
    console.log('Match?', password === process.env.ADMIN_PASSWORD)
    // sementara

    if (password === process.env.ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true })
      response.cookies.set('admin_session', process.env.ADMIN_PASSWORD!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8, // 8 jam
        path: '/',
      })
      return response
    }

    return NextResponse.json(
      { success: false, error: 'Password salah' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}