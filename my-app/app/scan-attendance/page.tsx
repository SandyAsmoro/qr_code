import type { Metadata } from 'next'
import PageContainer from '@/components/layout/PageContainer'
import QRScanner from '@/app/components/QRScanner'

export const metadata: Metadata = {
  title: 'Scan Presensi',
}

export default function ScanAttendancePage() {
  return (
    <PageContainer
      title="Scan Presensi"
      description="Arahkan kamera ke QR Code untuk mencatat kehadiran peserta."
      backHref="/admin"
    >
      <QRScanner mode="attendance" />
    </PageContainer>
  )
}