export const generateQRCodeData = (participantId: string): string => {
  return `${process.env.NEXT_PUBLIC_APP_NAME}:${participantId}`
}

export const parseQRCodeData = (qrData: string): string | null => {
  const prefix = `${process.env.NEXT_PUBLIC_APP_NAME}:`
  if (qrData.startsWith(prefix)) {
    return qrData.substring(prefix.length)
  }
  return null
}