import QRScanner from '@/app/components/QRScanner'

export default function ScanCardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-8">
      <div className="container mx-auto">
        <QRScanner mode="display" />
      </div>
    </main>
  )
}