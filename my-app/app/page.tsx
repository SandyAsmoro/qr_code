import Link from 'next/link'
import { QrCode } from 'lucide-react'
import RegistrationForm from './components/RegistrationForm'

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

        <div className="mt-8 text-center">
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
            Admin Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}