'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import ParticipantDataCard, {
  DATA_CARD_WIDTH,
  type DataCardParticipant,
} from '@/components/ParticipantDataCard'
import Button from '@/components/ui/Button'
import { downloadCardsAsZip } from '@/lib/downloadCard'

export type BulkDataCardParticipant = DataCardParticipant & { id: string }

interface BulkDataCardDownloadProps {
  participants: BulkDataCardParticipant[]
}

const sanitizeFileName = (name: string): string =>
  name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'kartu-data-peserta'

const formatDateForFileName = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const waitForRender = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

export default function BulkDataCardDownload({
  participants,
}: BulkDataCardDownloadProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // Reset pesan error kalau daftar peserta berubah (mis. filter diganti)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorMessage('')
  }, [participants])

  const handleDownload = async () => {
    if (downloading) return

    const container = containerRef.current

    if (participants.length === 0 || !container) {
      setErrorMessage('Tidak ada peserta untuk dibuatkan kartu.')
      return
    }

    setDownloading(true)
    setProgress(0)
    setTotal(participants.length)
    setErrorMessage('')

    try {
      await waitForRender()

      const elements = Array.from(
        container.querySelectorAll<HTMLElement>('[data-bulk-data-card="true"]')
      )

      if (elements.length !== participants.length) {
        throw new Error(
          `Jumlah kartu yang dirender tidak sesuai. ` +
            `Ditemukan ${elements.length} dari ${participants.length} kartu.`
        )
      }

      // downloadCardsAsZip menunggu gambar tiap kartu (foto) selesai dimuat
      // dan memberi nama unik jika ada nama file kembar.
      await downloadCardsAsZip(
        participants.map((participant, index) => ({
          element: elements[index],
          fileName: sanitizeFileName(
            `${participant.participant_code}-${participant.nama_lengkap}`
          ),
        })),
        `kartu-data-peserta-${formatDateForFileName(new Date())}`,
        (current, all) => {
          setProgress(current)
          setTotal(all)
        }
      )
    } catch (error) {
      console.error('Gagal bulk download kartu data:', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal membuat ZIP kartu data peserta.'
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
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
        disabled={downloading || participants.length === 0}
        onClick={handleDownload}
      >
        {downloading
          ? `Membuat Kartu ${progress}/${total}`
          : `Download ${participants.length} Kartu Data`}
      </Button>

      {errorMessage && (
        <p className="mt-2 w-full text-xs text-red-600">{errorMessage}</p>
      )}

      {/* Kartu offscreen (sumber render untuk html2canvas) */}
      <div
        ref={containerRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-100000px',
          top: 0,
          width: DATA_CARD_WIDTH,
          pointerEvents: 'none',
        }}
      >
        {participants.map((participant) => (
          <div
            key={participant.id}
            data-bulk-data-card="true"
            style={{ width: DATA_CARD_WIDTH, marginBottom: 20 }}
          >
            <ParticipantDataCard participant={participant} />
          </div>
        ))}
      </div>
    </>
  )
}
