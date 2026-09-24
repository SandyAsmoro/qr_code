import QRCode from 'qrcode'

export const generateQRCode = async (data: string): Promise<string> => {
  try {
    const qrImage = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    return qrImage
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

export const downloadQRCode = (qrDataUrl: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = qrDataUrl
  link.download = `${fileName}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}