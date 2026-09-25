import Link from 'next/link'
import { QrCode, ScanLine, LayoutDashboard } from 'lucide-react'
import RegistrationForm from './components/RegistrationForm'
import Card from '@/components/ui/Card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
            <QrCode className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Sistem Registrasi & Presensi
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Isi form registrasi untuk mendapatkan QR Code presensi Anda
          </p>
        </div>

        <RegistrationForm />

        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/scan-card">
            <Card className="flex items-center gap-3 transition-colors hover:border-purple-300 hover:bg-purple-50/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <ScanLine className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Scan Peserta</p>
                <p className="text-xs text-gray-500">Untuk panitia</p>
              </div>
            </Card>
          </Link>

          <Link href="/scan-attendance">
            <Card className="flex items-center gap-3 transition-colors hover:border-purple-300 hover:bg-purple-50/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <LayoutDashboard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Scan Presensi</p>
                <p className="text-xs text-gray-500">Untuk admin</p>
              </div>
            </Card>
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
            Admin Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}