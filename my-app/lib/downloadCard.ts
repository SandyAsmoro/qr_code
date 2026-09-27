import { toPng } from 'html-to-image'

/**
 * Ukuran cetak kartu ID: 8,2 cm x 10,5 cm pada resolusi 300 DPI
 * (standar resolusi cetak berkualitas tinggi).
 */
const CARD_WIDTH_CM = 8.2
const CARD_HEIGHT_CM = 10.5
const PRINT_DPI = 300
const CM_TO_INCH = 1 / 2.54

const CARD_WIDTH_PX = Math.round(CARD_WIDTH_CM * CM_TO_INCH * PRINT_DPI) // 969px
const CARD_HEIGHT_PX = Math.round(CARD_HEIGHT_CM * CM_TO_INCH * PRINT_DPI) // 1240px
const PIXELS_PER_METER = Math.round(PRINT_DPI / 0.0254) // 11811 (dipakai untuk metadata DPI PNG)

/**
 * Mengambil screenshot sebuah elemen kartu ID dan mengunduhnya sebagai PNG
 * dengan ukuran pasti 8,2 cm x 10,5 cm @300 DPI (969 x 1240 px), lengkap
 * dengan metadata DPI agar saat dicetak "actual size" hasilnya presisi.
 */
export const downloadCardAsImage = async (
  element: HTMLElement,
  fileName: string
): Promise<void> => {
  const rect = element.getBoundingClientRect()
  const scale = CARD_WIDTH_PX / rect.width
  const scaledWidth = Math.round(rect.width * scale)
  const scaledHeight = Math.round(rect.height * scale)

  // Catatan: sengaja TIDAK memakai opsi `pixelRatio` bawaan html-to-image.
  // Pada elemen yang punya `margin: auto` (kartu ini di-center dengan
  // mx-auto), pixelRatio besar membuat html-to-image salah menghitung
  // posisi hasil render sehingga sebagian kartu bergeser/terpotong.
  // Solusinya: set width/height target secara eksplisit, lalu perbesar
  // elemen aslinya dengan CSS transform (transform-origin top-left) agar
  // hasilnya presisi mengisi kanvas dari titik (0,0).
  const rawDataUrl = await toPng(element, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    width: scaledWidth,
    height: scaledHeight,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
    },
  })

  // Pastikan hasil akhir presisi 969 x 1240 px (rapikan selisih pembulatan)
  const exactSizedDataUrl = await resizeToExact(rawDataUrl, CARD_WIDTH_PX, CARD_HEIGHT_PX)

  // Sisipkan metadata DPI (chunk pHYs) supaya software cetak/editor gambar
  // membaca ukuran fisik kartu sebagai 8,2 cm x 10,5 cm, bukan hanya piksel.
  const finalDataUrl = injectPrintDpi(exactSizedDataUrl, PIXELS_PER_METER, PIXELS_PER_METER)

  const link = document.createElement('a')
  link.href = finalDataUrl
  link.download = `${fileName}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const resizeToExact = (dataUrl: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context tidak tersedia'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Menyisipkan PNG chunk "pHYs" (physical pixel dimensions) tepat setelah
 * chunk IHDR, sesuai spesifikasi format PNG. unit=1 berarti meter, sehingga
 * DPI = pixelsPerUnit * 0.0254.
 */
const injectPrintDpi = (pngDataUrl: string, ppmX: number, ppmY: number): string => {
  const [header, base64] = pngDataUrl.split(',')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  // 8 byte signature PNG + 25 byte chunk IHDR (4 len + 4 type + 13 data + 4 crc)
  const ihdrEnd = 8 + 25

  const physData = new Uint8Array(9)
  const physView = new DataView(physData.buffer)
  physView.setUint32(0, ppmX)
  physView.setUint32(4, ppmY)
  physData[8] = 1 // unit specifier: meter

  const physChunk = buildPngChunk('pHYs', physData)

  const result = new Uint8Array(bytes.length + physChunk.length)
  result.set(bytes.subarray(0, ihdrEnd), 0)
  result.set(physChunk, ihdrEnd)
  result.set(bytes.subarray(ihdrEnd), ihdrEnd + physChunk.length)

  let binaryStr = ''
  result.forEach((b) => (binaryStr += String.fromCharCode(b)))
  return `${header},${btoa(binaryStr)}`
}

const buildPngChunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBytes = new TextEncoder().encode(type)
  const length = data.length
  const chunk = new Uint8Array(4 + 4 + length + 4)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, length)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  const crcInput = chunk.slice(4, 8 + length)
  view.setUint32(8 + length, crc32(crcInput) >>> 0)
  return chunk
}

const crc32 = (buf: Uint8Array): number => {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}