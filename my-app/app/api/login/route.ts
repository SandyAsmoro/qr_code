import { NextRequest, NextResponse } from 'next/server'
import {
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const password =
      typeof body?.password === 'string'
        ? body.password
        : ''

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password wajib diisi.',
        },
        {
          status: 400,
        }
      )
    }

    let role: 'admin' | 'panitia' | null = null

    /*
     * Password Admin
     */
    if (
      process.env.ADMIN_PASSWORD &&
      password === process.env.ADMIN_PASSWORD
    ) {
      role = 'admin'
    }

    /*
     * Password Panitia
     *
     * Hanya diperiksa apabila bukan password Admin.
     */
    else if (
      process.env.PANITIA_PASSWORD &&
      password === process.env.PANITIA_PASSWORD
    ) {
      role = 'panitia'
    }

    /*
     * Password tidak cocok.
     */
    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password salah.',
        },
        {
          status: 401,
        }
      )
    }

    /*
     * Buat session berdasarkan role.
     *
     * Role disimpan di session yang ditandatangani server,
     * bukan dipercayakan kepada browser.
     */
    const token = await createSessionToken(role)

    const response = NextResponse.json({
      success: true,
      role,
      redirectTo:
        role === 'admin'
          ? '/admin'
          : '/panitia/dashboard',
    })

    setSessionCookie(response, token)

    return response
  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan pada server.',
      },
      {
        status: 500,
      }
    )
  }
}