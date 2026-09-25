import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
})

export async function sendQRCodeEmail(
  to: string,
  namaLengkap: string,
  qrCodeDataUrl: string
) {
  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Registrasi Berhasil ✓</h2>
      <p>Halo <strong>${namaLengkap}</strong>,</p>
      <p>Terima kasih telah mendaftar. Berikut adalah QR Code Anda yang akan digunakan untuk presensi kehadiran.</p>
      <div style="text-align: center; margin: 24px 0;">
        <img src="cid:qrcode" alt="QR Code" style="width: 250px; height: 250px; border: 4px solid #eee;" />
      </div>
      <p style="font-size: 13px; color: #666;">
        Simpan email ini atau download QR Code, lalu tunjukkan saat acara berlangsung untuk keperluan presensi.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'Panitia'}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `QR Code Registrasi - ${namaLengkap}`,
    html,
    attachments: [
      {
        filename: `qr-${namaLengkap}.png`,
        content: buffer,
        cid: 'qrcode',
      },
    ],
  })
}