// lib/exportWithPhotos.ts
//
// Export data peserta + foto formal dalam satu file ZIP:
//
//   data-peserta-foto-YYYY-MM-DD.zip
//   ├── data-peserta.xlsx      (kolom "Nama File Foto" mengacu ke folder foto/)
//   └── foto/
//       ├── P-0001-Budi Santoso.webp
//       └── ...

import * as XLSX from 'xlsx'
import { createZip, type ZipFile } from '@/lib/downloadCard'

export type ExportParticipant = {
  participant_code: string
  created_at: string
  nama_lengkap: string
  umur?: number | null
  jenis_kelamin?: string | null
  daerah?: string | null
  desa?: string | null
  kelompok?: string | null
  dapukan?: string | null
  tinggi_badan?: number | null
  berat_badan?: number | null
  jumlah_saudara?: number | null
  anak_ke?: number | null
  hobi?: string | null
  status?: string | null
  pendidikan_terakhir?: string | null
  pekerjaan?: string | null
  email?: string | null
  foto_formal_url?: string | null
  attendance_count?: number
}

export type PhotoExportResult = {
  total: number
  photosDownloaded: number
  photosMissing: number // peserta tanpa URL foto
  photosFailed: string[] // nama peserta yang fotonya gagal diunduh
}

type ProgressCallback = (current: number, total: number) => void

const CONCURRENCY = 5
const FETCH_TIMEOUT_MS = 15000

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

const sanitizeFileName = (name: string): string =>
  name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'peserta'

const makeUniqueName = (name: string, used: Set<string>): string => {
  let candidate = name
  let counter = 2

  while (used.has(candidate.toLowerCase())) {
    candidate = `${name}-${counter++}`
  }

  used.add(candidate.toLowerCase())
  return candidate
}

const fetchPhoto = async (
  url: string
): Promise<{ data: Uint8Array; extension: string }> => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const fromMime = EXTENSION_BY_MIME[blob.type]
    const fromUrl = url.split('?')[0].split('.').pop()?.toLowerCase()
    const extension =
      fromMime ?? (fromUrl && /^[a-z0-9]{2,4}$/.test(fromUrl) ? fromUrl : 'webp')

    return { data: new Uint8Array(await blob.arrayBuffer()), extension }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const buildSheetRows = (
  participants: ExportParticipant[],
  photoFileNames: (string | null)[]
) =>
  participants.map((item, index) => ({
    No: index + 1,
    'Kode Peserta': item.participant_code,
    'Nama Lengkap': item.nama_lengkap,
    Email: item.email || '-',
    Umur: item.umur ?? '-',
    'Jenis Kelamin': item.jenis_kelamin || '-',
    Daerah: item.daerah || '-',
    Desa: item.desa || '-',
    Kelompok: item.kelompok || '-',
    Dapukan: item.dapukan || '-',
    'Tinggi Badan (cm)': item.tinggi_badan ?? '-',
    'Berat Badan (kg)': item.berat_badan ?? '-',
    'Jumlah Saudara': item.jumlah_saudara ?? '-',
    'Anak ke': item.anak_ke ?? '-',
    Hobi: item.hobi || '-',
    Status: item.status || '-',
    'Pendidikan Terakhir': item.pendidikan_terakhir || '-',
    Pekerjaan: item.pekerjaan || '-',
    'Tanggal Daftar': new Date(item.created_at).toLocaleString('id-ID'),
    'Status Presensi': (item.attendance_count ?? 0) > 0 ? 'Hadir' : 'Belum Hadir',
    'Nama File Foto': photoFileNames[index]
      ? `foto/${photoFileNames[index]}`
      : 'Tidak ada foto',
  }))

const buildExcelBytes = (rows: ReturnType<typeof buildSheetRows>): Uint8Array => {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Peserta')

  worksheet['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }))

  return new Uint8Array(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }))
}

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Beri waktu browser memulai unduhan sebelum URL dicabut
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/**
 * Unduh data peserta (Excel) beserta foto formalnya dalam satu ZIP.
 * Foto yang gagal diunduh tidak menggagalkan seluruh proses; hasilnya
 * dilaporkan lewat return value supaya bisa ditampilkan ke pengguna.
 */
export const exportParticipantsWithPhotos = async (
  participants: ExportParticipant[],
  onProgress?: ProgressCallback
): Promise<PhotoExportResult> => {
  if (participants.length === 0) {
    throw new Error('Tidak ada data peserta untuk diunduh.')
  }

  const total = participants.length
  const usedNames = new Set<string>()
  const photoFileNames: (string | null)[] = new Array(total).fill(null)
  const photoFiles: ZipFile[] = []
  const failed: string[] = []
  let missing = 0
  let done = 0

  // Nama dasar dibuat lebih dulu (berurutan) supaya penamaan unik deterministik
  const baseNames = participants.map((p) =>
    makeUniqueName(
      sanitizeFileName(`${p.participant_code}-${p.nama_lengkap}`),
      usedNames
    )
  )

  let cursor = 0

  const worker = async () => {
    while (cursor < total) {
      const index = cursor++
      const participant = participants[index]

      if (!participant.foto_formal_url) {
        missing++
      } else {
        try {
          const { data, extension } = await fetchPhoto(participant.foto_formal_url)
          const fileName = `${baseNames[index]}.${extension}`

          photoFileNames[index] = fileName
          photoFiles.push({ name: `foto/${fileName}`, data })
        } catch (error) {
          console.warn(`Gagal mengunduh foto ${participant.nama_lengkap}:`, error)
          failed.push(participant.nama_lengkap)
        }
      }

      done++
      onProgress?.(done, total)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker())
  )

  const excelBytes = buildExcelBytes(buildSheetRows(participants, photoFileNames))

  const zipBlob = createZip([
    { name: 'data-peserta.xlsx', data: excelBytes },
    ...photoFiles.sort((a, b) => a.name.localeCompare(b.name)),
  ])

  const date = new Date().toISOString().split('T')[0]
  triggerDownload(zipBlob, `data-peserta-foto-${date}.zip`)

  return {
    total,
    photosDownloaded: photoFiles.length,
    photosMissing: missing,
    photosFailed: failed,
  }
}
