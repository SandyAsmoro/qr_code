'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import IdCard from '@/components/IdCard'
import { downloadCardsAsZip } from '@/lib/downloadCard'
import Button from '@/components/ui/Button'

export type BulkParticipant = {
  id: string
  participant_code: string
  nama_lengkap: string
  qr_code_url?: string | null
  daerah?: string | null
}

interface BulkIdCardDownloadProps {
  participants: BulkParticipant[]
}

export default function BulkIdCardDownload({
  participants,
}: BulkIdCardDownloadProps) {
  // Hanya peserta yang sudah punya QR Code
  const participantsWithQr = useMemo(
    () => participants.filter((p) => Boolean(p.qr_code_url)),
    [participants]
  )

  const cardsContainerRef = useRef<HTMLDivElement>(null)

  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [totalProgress, setTotalProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  // Reset error kalau daftar peserta berubah
  useEffect(() => {
    setErrorMessage('')
  }, [participants])

  const handleBulkDownload = async () => {
    if (downloading) return

    if (participantsWithQr.length === 0) {
      setErrorMessage('Tidak ada peserta yang memiliki QR Code.')
      return
    }

    const container = cardsContainerRef.current

    if (!container) {
      setErrorMessage('Container kartu belum siap.')
      return
    }

    setDownloading(true)
    setProgress(0)
    setTotalProgress(participantsWithQr.length)
    setErrorMessage('')

    try {
      // 1. Tunggu React/browser selesai render
      await waitForRender()

      // 2. Tunggu semua gambar QR selesai dimuat
      await waitForImages(container)

      // 3. Ambil semua elemen kartu
      const cardElements = Array.from(
        container.querySelectorAll<HTMLElement>('[data-bulk-id-card="true"]')
      )

      if (cardElements.length !== participantsWithQr.length) {
        throw new Error(
          `Jumlah kartu yang dirender tidak sesuai. ` +
            `Ditemukan ${cardElements.length} dari ${participantsWithQr.length} kartu.`
        )
      }

      // 4. Siapkan data untuk ZIP
      const cards = participantsWithQr.map((participant, index) => ({
        element: cardElements[index],
        fileName: sanitizeFileName(
          `${participant.participant_code}-${participant.nama_lengkap}`
        ),
      }))

      // 5. Generate & download ZIP
      await downloadCardsAsZip(
        cards,
        `id-card-peserta-${formatDateForFileName(new Date())}`,
        (current, total) => {
          setProgress(current)
          setTotalProgress(total)
        }
      )
    } catch (error) {
      console.error('Gagal bulk download kartu:', error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal membuat ZIP kartu peserta.'
      )
    } finally {
      setDownloading(false)
    }
  }

  const buttonLabel = downloading
    ? `Membuat Kartu ${progress}/${totalProgress}`
    : `Download ${participantsWithQr.length} Kartu`

  return (
    <>
      {/* Tombol */}
      <Button
        variant="secondary"
        size="sm"
        icon={
          downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )
        }
        disabled={downloading || participantsWithQr.length === 0}
        onClick={handleBulkDownload}
      >
        {buttonLabel}
      </Button>

      {/* Error */}
      {errorMessage && (
        <p className="mt-2 w-full text-xs text-red-600">{errorMessage}</p>
      )}

      {/* Kartu offscreen (sumber render untuk html2canvas) */}
      <div
        ref={cardsContainerRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-100000px',
          top: 0,
          width: '320px',
          pointerEvents: 'none',
          opacity: 1,
        }}
      >
        {participantsWithQr.map((participant) => (
          <div
            key={participant.id}
            data-bulk-id-card="true"
            style={{ width: '320px', marginBottom: '20px' }}
          >
            <IdCard
              nama={participant.nama_lengkap}
              participantCode={participant.participant_code}
              qrCodeUrl={participant.qr_code_url || ''}
              daerah={participant.daerah || undefined}
            />
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * Tunggu React/browser selesai melakukan render.
 */
const waitForRender = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })

/**
 * Tunggu semua gambar di dalam container selesai dimuat.
 * Setiap gambar diberi batas waktu supaya proses tidak menggantung
 * kalau ada gambar yang tidak pernah selesai (load/error tidak terpanggil).
 */
const IMAGE_TIMEOUT_MS = 10000

const waitForImages = async (container: HTMLElement): Promise<void> => {
  const images = Array.from(container.querySelectorAll('img'))

  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve()

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
 * Bersihkan karakter yang tidak aman untuk nama file di dalam ZIP
 * (mis. / \ : * ? " < > |), rapikan spasi berlebih, dan batasi panjangnya.
 */
const sanitizeFileName = (name: string): string => {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)

  return cleaned || 'kartu-peserta'
}

/**
 * Format tanggal untuk nama ZIP. Contoh: 2026-09-30
 */
const formatDateForFileName = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}