// lib/downloadCard.ts

type CardElement = HTMLElement

/**
 * Data yang dibutuhkan untuk membuat ZIP.
 */
export type CardDownloadItem = {
  element: HTMLElement
  fileName: string
}

/**
 * Struktur file ZIP sederhana.
 */
type ZipFile = {
  name: string
  data: Uint8Array
}

/**
 * Opsi render html2canvas yang dipakai bersama
 * oleh download satuan dan download ZIP.
 */
const CANVAS_OPTIONS = {
  scale: 3,
  useCORS: true,
  allowTaint: false,
  backgroundColor: '#ffffff',
  logging: false,
} as const

/**
 * Batas waktu menunggu satu gambar dimuat.
 */
const IMAGE_TIMEOUT_MS = 10000

// =====================================================
// HELPER
// =====================================================

/**
 * Mengubah Uint8Array menjadi ArrayBuffer yang kompatibel
 * dengan BlobPart pada TypeScript.
 */
const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength)

  new Uint8Array(buffer).set(bytes)

  return buffer
}

/**
 * Menunggu semua gambar di dalam element selesai dimuat.
 * Diberi timeout supaya tidak menggantung kalau ada gambar
 * yang event load/error-nya tidak pernah terpanggil.
 */
const waitForImages = async (element: HTMLElement): Promise<void> => {
  const images = Array.from(element.querySelectorAll('img'))

  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(resolve, IMAGE_TIMEOUT_MS)

        const done = () => {
          window.clearTimeout(timeoutId)
          resolve()
        }

        image.addEventListener('load', done, { once: true })
        image.addEventListener('error', done, { once: true })
      })
    })
  )
}

/**
 * Memuat html2canvas secara dinamis agar library
 * hanya dimuat di browser.
 */
// const loadHtml2Canvas = async () => {
//   return (await import('html2canvas')).default
// }

const loadHtml2Canvas = async () => {
  return (await import('html2canvas-pro')).default
}

/**
 * Mengkonversi Data URL PNG menjadi Uint8Array.
 */
const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1]

  if (!base64) {
    throw new Error('Data URL PNG tidak valid.')
  }

  const binaryString = atob(base64)

  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}

/**
 * Memberi nama unik untuk file kembar di dalam ZIP.
 *
 * Contoh: a.png, a-2.png, a-3.png
 */
const makeUniqueName = (name: string, usedNames: Set<string>): string => {
  if (!usedNames.has(name)) {
    usedNames.add(name)
    return name
  }

  let counter = 2
  let candidate = `${name}-${counter}`

  while (usedNames.has(candidate)) {
    counter++
    candidate = `${name}-${counter}`
  }

  usedNames.add(candidate)

  return candidate
}

// =====================================================
// DOWNLOAD SATU KARTU (PNG)
// =====================================================

/**
 * Mengubah HTMLElement menjadi PNG menggunakan html2canvas.
 */
export const downloadCardAsImage = async (
  element: CardElement,
  fileName: string
): Promise<void> => {
  try {
    if (!element) {
      throw new Error('Element kartu tidak ditemukan.')
    }

    await waitForImages(element)

    const html2canvas = await loadHtml2Canvas()

    const canvas = await html2canvas(element, CANVAS_OPTIONS)

    const image = canvas.toDataURL('image/png', 1.0)

    const link = document.createElement('a')

    link.href = image
    link.download = `${fileName}.png`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Gagal mengunduh kartu:', error)

    throw error
  }
}

// =====================================================
// ZIP
// =====================================================

/**
 * Membuat CRC32 untuk file ZIP.
 */
const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]

    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320
      } else {
        crc >>>= 1
      }
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Menulis UInt16 little-endian.
 */
const writeUInt16LE = (
  array: Uint8Array,
  offset: number,
  value: number
): void => {
  array[offset] = value & 0xff
  array[offset + 1] = (value >>> 8) & 0xff
}

/**
 * Menulis UInt32 little-endian.
 */
const writeUInt32LE = (
  array: Uint8Array,
  offset: number,
  value: number
): void => {
  array[offset] = value & 0xff
  array[offset + 1] = (value >>> 8) & 0xff
  array[offset + 2] = (value >>> 16) & 0xff
  array[offset + 3] = (value >>> 24) & 0xff
}

/**
 * General purpose flag bit 11 = nama file berformat UTF-8.
 */
const UTF8_FLAG = 0x0800

/**
 * Membuat ZIP sederhana (tanpa kompresi / STORE)
 * tanpa dependency tambahan.
 */
const createZip = (files: ZipFile[]): Blob => {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []

  const encoder = new TextEncoder()

  let localOffset = 0

  for (const file of files) {
    const fileNameBytes = encoder.encode(file.name)
    const fileData = file.data

    const crc = crc32(fileData)

    /*
     * Local File Header
     *
     * Signature        4 bytes
     * Version          2 bytes
     * Flags            2 bytes
     * Compression      2 bytes
     * Mod Time         2 bytes
     * Mod Date         2 bytes
     * CRC32            4 bytes
     * Compressed Size  4 bytes
     * Original Size    4 bytes
     * Filename Length  2 bytes
     * Extra Length     2 bytes
     * Filename         variable
     */

    const localHeader = new Uint8Array(30 + fileNameBytes.length)

    writeUInt32LE(localHeader, 0, 0x04034b50)
    writeUInt16LE(localHeader, 4, 20)
    writeUInt16LE(localHeader, 6, UTF8_FLAG)
    writeUInt16LE(localHeader, 8, 0)
    writeUInt16LE(localHeader, 10, 0)
    writeUInt16LE(localHeader, 12, 0)
    writeUInt32LE(localHeader, 14, crc)
    writeUInt32LE(localHeader, 18, fileData.length)
    writeUInt32LE(localHeader, 22, fileData.length)
    writeUInt16LE(localHeader, 26, fileNameBytes.length)
    writeUInt16LE(localHeader, 28, 0)

    localHeader.set(fileNameBytes, 30)

    localParts.push(localHeader)
    localParts.push(fileData)

    /*
     * Central Directory Header
     */

    const centralHeader = new Uint8Array(46 + fileNameBytes.length)

    writeUInt32LE(centralHeader, 0, 0x02014b50)
    writeUInt16LE(centralHeader, 4, 20)
    writeUInt16LE(centralHeader, 6, 20)
    writeUInt16LE(centralHeader, 8, UTF8_FLAG)
    writeUInt16LE(centralHeader, 10, 0)
    writeUInt16LE(centralHeader, 12, 0)
    writeUInt16LE(centralHeader, 14, 0)
    writeUInt32LE(centralHeader, 16, crc)
    writeUInt32LE(centralHeader, 20, fileData.length)
    writeUInt32LE(centralHeader, 24, fileData.length)
    writeUInt16LE(centralHeader, 28, fileNameBytes.length)
    writeUInt16LE(centralHeader, 30, 0)
    writeUInt16LE(centralHeader, 32, 0)
    writeUInt16LE(centralHeader, 34, 0)
    writeUInt16LE(centralHeader, 36, 0)
    writeUInt32LE(centralHeader, 38, 0)
    writeUInt32LE(centralHeader, 42, localOffset)

    centralHeader.set(fileNameBytes, 46)

    centralParts.push(centralHeader)

    localOffset += localHeader.length + fileData.length
  }

  const centralDirectorySize = centralParts.reduce(
    (total, part) => total + part.length,
    0
  )

  const centralDirectoryOffset = localOffset

  /*
   * End of Central Directory Record
   *
   * Signature                  4 bytes
   * Disk Number                2 bytes
   * Central Directory Disk     2 bytes
   * Entries on Disk            2 bytes
   * Total Entries              2 bytes
   * Central Directory Size     4 bytes
   * Central Directory Offset   4 bytes
   * Comment Length             2 bytes
   */

  const endRecord = new Uint8Array(22)

  writeUInt32LE(endRecord, 0, 0x06054b50)
  writeUInt16LE(endRecord, 4, 0)
  writeUInt16LE(endRecord, 6, 0)
  writeUInt16LE(endRecord, 8, files.length)
  writeUInt16LE(endRecord, 10, files.length)
  writeUInt32LE(endRecord, 12, centralDirectorySize)
  writeUInt32LE(endRecord, 16, centralDirectoryOffset)
  writeUInt16LE(endRecord, 20, 0)

  /*
   * Ubah setiap Uint8Array menjadi ArrayBuffer murni
   * supaya kompatibel dengan BlobPart di TypeScript versi baru.
   */

  const allParts: Uint8Array[] = [
    ...localParts,
    ...centralParts,
    endRecord,
  ]

  const blobParts: BlobPart[] = allParts.map(toArrayBuffer)

  return new Blob(blobParts, {
    type: 'application/zip',
  })
}

/**
 * Mengambil PNG dari setiap kartu kemudian memasukkannya
 * ke dalam satu file ZIP.
 *
 * @param cards        Daftar kartu (element + nama file tanpa ekstensi)
 * @param zipFileName  Nama ZIP; ekstensi .zip ditambahkan otomatis
 * @param onProgress   Dipanggil setiap satu kartu selesai diproses
 */
export const downloadCardsAsZip = async (
  cards: CardDownloadItem[],
  zipFileName = 'kartu-peserta',
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  try {
    if (!cards || cards.length === 0) {
      throw new Error('Tidak ada kartu yang dapat diunduh.')
    }

    // Import sekali saja, di luar loop
    const html2canvas = await loadHtml2Canvas()

    const files: ZipFile[] = []
    const usedNames = new Set<string>()

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]

      if (!card.element) {
        console.warn(`Element kartu tidak ditemukan: ${card.fileName}`)

        onProgress?.(i + 1, cards.length)

        continue
      }

      await waitForImages(card.element)

      const canvas = await html2canvas(card.element, CANVAS_OPTIONS)

      const imageData = dataUrlToUint8Array(
        canvas.toDataURL('image/png', 1.0)
      )

      files.push({
        name: `${makeUniqueName(card.fileName, usedNames)}.png`,
        data: imageData,
      })

      onProgress?.(i + 1, cards.length)
    }

    if (files.length === 0) {
      throw new Error('Tidak ada kartu yang berhasil dibuat.')
    }

    const zipBlob = createZip(files)

    const url = URL.createObjectURL(zipBlob)

    const link = document.createElement('a')

    link.href = url
    link.download = zipFileName.toLowerCase().endsWith('.zip')
      ? zipFileName
      : `${zipFileName}.zip`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Gagal membuat ZIP kartu peserta:', error)

    throw error
  }
}