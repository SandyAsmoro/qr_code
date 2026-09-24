import QRScanner from '@/app/components/QRScanner'

export default function ScanAttendancePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 py-8">
      <div className="container mx-auto">
        <QRScanner mode="attendance" />
      </div>
    </main>
  )
}