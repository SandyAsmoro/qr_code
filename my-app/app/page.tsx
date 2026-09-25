import Link from 'next/link'
import RegistrationForm from './components/RegistrationForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">
            📱 Sistem Registrasi & Presensi
          </h1>
          <p className="text-gray-600">Dengan QR Code Scanner</p>
        </div>

        <RegistrationForm />

        <div className="text-center mt-8 space-y-2">
          <Link href="/scan-card" className="text-blue-600 hover:underline block text-lg">
            → Scan Peserta (Panitia)
          </Link>
          <Link href="/scan-attendance" className="text-blue-600 hover:underline block text-lg">
            → Scan Presensi (Admin)
          </Link>
          <Link href="/admin" className="text-gray-500 hover:underline block text-sm mt-4">
            → Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}