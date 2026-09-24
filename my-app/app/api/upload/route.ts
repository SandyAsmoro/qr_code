// import { NextRequest, NextResponse } from 'next/server'
// import { uploadToGoogleDrive } from '@/lib/googleDrive'
// import { optimizePhotoForCard } from '@/lib/imageOptimizer'

// export async function POST(request: NextRequest) {
//   try {
//     const formData = await request.formData()
//     const file = formData.get('file') as File

//     if (!file) {
//       return NextResponse.json(
//         { error: 'No file provided' },
//         { status: 400 }
//       )
//     }

//     if (file.size > 10 * 1024 * 1024) {
//       return NextResponse.json(
//         { error: 'File size exceeds 10MB limit' },
//         { status: 400 }
//       )
//     }

//     if (!file.type.startsWith('image/')) {
//       return NextResponse.json(
//         { error: 'File must be an image' },
//         { status: 400 }
//       )
//     }

//     console.log(`📸 Processing image: ${file.name}`)

//     const originalBuffer = Buffer.from(await file.arrayBuffer())

//     let optimizedBuffer: Buffer
//     try {
//       optimizedBuffer = await optimizePhotoForCard(originalBuffer)
//       console.log(
//         `✅ Image optimized: ${originalBuffer.length} → ${optimizedBuffer.length} bytes`
//       )
//     } catch (optimizeError) {
//       console.error('Optimization failed, using original:', optimizeError)
//       optimizedBuffer = originalBuffer
//     }

//     const timestamp = Date.now()
//     const random = Math.random().toString(36).substring(2, 8)
//     const fileName = `participant_${timestamp}_${random}.webp`

//     const publicUrl = await uploadToGoogleDrive(
//       optimizedBuffer,
//       fileName,
//       'image/webp'
//     )

//     if (!publicUrl) {
//       throw new Error('Failed to get public URL from Google Drive')
//     }

//     console.log(`✅ Uploaded to Google Drive: ${publicUrl}`)

//     return NextResponse.json({
//       success: true,
//       url: publicUrl,
//       fileName: fileName,
//       format: 'webp',
//       originalSize: originalBuffer.length,
//       optimizedSize: optimizedBuffer.length,
//       compressionRatio: Math.round(
//         (1 - optimizedBuffer.length / originalBuffer.length) * 100
//       ),
//     })
//   } catch (error) {
//     console.error('Upload error:', error)
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : 'Upload failed' },
//       { status: 500 }
//     )
//   }
// }



import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { optimizePhotoForCard } from '@/lib/imageOptimizer'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    console.log(`📸 Processing image: ${file.name}`)

    const originalBuffer = Buffer.from(await file.arrayBuffer())

    let optimizedBuffer: Buffer
    try {
      optimizedBuffer = await optimizePhotoForCard(originalBuffer)
      console.log(`✅ Image optimized: ${originalBuffer.length} → ${optimizedBuffer.length}`)
    } catch {
      optimizedBuffer = originalBuffer
    }

    // Generate filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const fileName = `participant_${timestamp}_${random}.webp`

    // Upload ke Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('participant-photos')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('participant-photos')
      .getPublicUrl(fileName)

    const publicUrl = publicUrlData.publicUrl

    console.log(`✅ Uploaded to Supabase: ${publicUrl}`)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      format: 'webp',
      originalSize: originalBuffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: Math.round(
        (1 - optimizedBuffer.length / originalBuffer.length) * 100
      ),
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}