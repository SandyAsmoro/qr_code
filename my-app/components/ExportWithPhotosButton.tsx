'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import Button from '@/components/ui/Button'
import {
  exportParticipantsWithPhotos,
  type ExportParticipant,
  type PhotoExportResult,
} from '@/lib/exportWithPhotos'

interface ExportWithPhotosButtonProps {
  participants: ExportParticipant[]
  disabled?: boolean
  onSuccess?: (result: PhotoExportResult) => void
  onError?: (message: string) => void
}

export default function ExportWithPhotosButton({
  participants,
  disabled = false,
  onSuccess,
  onError,
}: ExportWithPhotosButtonProps) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleClick = async () => {
    if (running) return

    setRunning(true)
    setProgress(0)

    try {
      const result = await exportParticipantsWithPhotos(participants, (current) =>
        setProgress(current)
      )
      onSuccess?.(result)
    } catch (error) {
      console.error('Gagal export data + foto:', error)
      onError?.(
        error instanceof Error ? error.message : 'Gagal mengunduh data beserta foto.'
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      icon={
        running ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )
      }
      disabled={disabled || running || participants.length === 0}
      onClick={handleClick}
    >
      {running
        ? `Menyiapkan ${progress}/${participants.length}`
        : 'Download Data + Foto'}
    </Button>
  )
}
