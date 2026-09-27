import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import QRScanner from '@/app/components/QRScanner'
import Button from '@/components/ui/Button'

export default function ScanAttendancePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 py-8">
      <div className="container mx-auto">
        {/* Back to Dashboard Button */}
        <div className="mb-6 flex justify-center">
          <Link href="/admin">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>

        <QRScanner mode="attendance" />
      </div>
    </main>
  )
}