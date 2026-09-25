import { NextRequest, NextResponse } from 'next/server'
import { sendQRCodeEmail } from '@/lib/sendEmail'

export async function POST(request: NextRequest) {
  try {
    const { email, nama_lengkap, qrCodeDataUrl } = await request.json()

    if (!email || !nama_lengkap || !qrCodeDataUrl) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    await sendQRCodeEmail(email, nama_lengkap, qrCodeDataUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal mengirim email' },
      { status: 500 }
    )
  }
}