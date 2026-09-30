import type { Metadata } from 'next'
import PageContainer from '@/components/layout/PageContainer'
import QRScanner from '@/app/components/QRScanner'

export const metadata: Metadata = {
  title: 'Scan Peserta',
}

export default function ScanCardPage() {
  return (
    <PageContainer
      title="Scan Peserta"
      description="Arahkan kamera ke QR Code untuk menampilkan data peserta."
      backHref="/admin"
    >
      <QRScanner mode="display" />
    </PageContainer>
  )
}