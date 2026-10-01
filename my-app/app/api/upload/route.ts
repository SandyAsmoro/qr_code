import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { optimizePhotoForCard } from '@/lib/imageOptimizer'

const MAX_FILE_SIZE_MB = 2
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    // Pastikan benar-benar berupa File (bukan string / null)
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Foto wajib diunggah' },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File foto kosong' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran foto maksimal ${MAX_FILE_SIZE_MB}MB` },
        { status: 413 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format foto harus JPG, PNG, atau WEBP' },
        { status: 400 }
      )
    }

    console.log(`📸 Processing image: ${file.name}`)

    const originalBuffer = Buffer.from(await file.arrayBuffer())

    // Optimasi sekaligus berfungsi sebagai validasi isi file.
    // file.type berasal dari client dan bisa dipalsukan, jadi kalau
    // gambar gagal diproses, tolak file-nya (jangan di-upload apa adanya).
    let optimizedBuffer: Buffer
    try {
      optimizedBuffer = await optimizePhotoForCard(originalBuffer)
      console.log(
        `✅ Image optimized: ${originalBuffer.length} → ${optimizedBuffer.length}`
      )
    } catch (optimizeError) {
      console.error('Image optimization error:', optimizeError)
      return NextResponse.json(
        { error: 'File bukan gambar yang valid atau rusak' },
        { status: 400 }
      )
    }

    // Generate filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const fileName = `participant_${timestamp}_${random}.webp`

    // Upload ke Supabase Storage
    const { error: uploadError } = await supabase.storage
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
      fileName,
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