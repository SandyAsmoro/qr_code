import sharp from 'sharp'

export interface OptimizeOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
}

const DEFAULT_OPTIONS: OptimizeOptions = {
  width: 800,
  height: 1000,
  quality: 85,
  format: 'webp',
}

export const optimizeImage = async (
  buffer: Buffer,
  options: OptimizeOptions = {}
): Promise<Buffer> => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  try {
    let pipeline = sharp(buffer)

    if (mergedOptions.width && mergedOptions.height) {
      pipeline = pipeline.resize(mergedOptions.width, mergedOptions.height, {
        fit: 'cover',
        position: 'center',
      })
    }

    pipeline = pipeline.withMetadata(false)

    if (mergedOptions.format === 'webp') {
      pipeline = pipeline.webp({ quality: mergedOptions.quality })
    } else if (mergedOptions.format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality: mergedOptions.quality })
    }

    const optimizedBuffer = await pipeline.toBuffer()
    return optimizedBuffer
  } catch (error) {
    console.error('Error optimizing image:', error)
    throw error
  }
}

export const optimizePhotoForCard = async (
  buffer: Buffer
): Promise<Buffer> => {
  return optimizeImage(buffer, {
    width: 600,
    height: 800,
    quality: 85,
    format: 'webp',
  })
}

export const getFileExtension = (format: string): string => {
  switch (format) {
    case 'webp':
      return 'webp'
    case 'jpeg':
      return 'jpg'
    case 'png':
      return 'png'
    default:
      return 'webp'
  }
}

export const getMimeType = (format: string): string => {
  switch (format) {
    case 'webp':
      return 'image/webp'
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    default:
      return 'image/webp'
  }
}