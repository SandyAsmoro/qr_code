import { google } from 'googleapis'
import { Readable } from 'stream'

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_DRIVE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
})

const drive = google.drive({ version: 'v3', auth })

export const uploadToGoogleDrive = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<string | null> => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

    const stream = Readable.from(fileBuffer)

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    }

    const media = {
      mimeType: mimeType,
      body: stream,
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    })

    const fileId = response.data.id

    await drive.permissions.create({
      fileId: fileId!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })

    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`

    return publicUrl
  } catch (error) {
    console.error('Error uploading to Google Drive:', error)
    throw error
  }
}

export const extractFileIdFromUrl = (url: string): string | null => {
  const match = url.match(/id=([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}