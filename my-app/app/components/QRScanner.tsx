'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ScanLine,
  CheckCircle2,
  RotateCcw,
  Printer,
  User,
  MapPin,
  Ruler,
  GraduationCap,
  Briefcase,
  Heart,
} from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'
import { parseQRCodeData } from '@/lib/encryption'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

type ScanMode = 'display' | 'attendance'

type ScannedParticipant = {
  id: string
  nama_lengkap: string
  umur: number
  jenis_kelamin: string
  daerah: string
  desa: string
  foto_formal_url: string
  tinggi_badan: number
  berat_badan: number
  anak_ke: number
  kelompok: string
  dapukan: string
  status: string
  pendidikan_terakhir: string
  pekerjaan: string
  hobi: string
  qr_code_url: string
}

const modeConfig: Record<ScanMode, { title: string; subtitle: string }> = {
  display: {
    title: 'Scan Peserta',
    subtitle: 'Arahkan kamera ke QR Code untuk menampilkan data peserta',
  },
  attendance: {
    title: 'Scan Presensi',
    subtitle: 'Arahkan kamera ke QR Code untuk mencatat kehadiran',
  },
}

export default function QRScanner({ mode }: { mode: ScanMode }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [scannedData, setScannedData] = useState<ScannedParticipant | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [attendanceSuccess, setAttendanceSuccess] = useState(false)

  const handleScanSuccess = async (decodedText: string) => {
    const participantId = parseQRCodeData(decodedText)

    if (!participantId) {
      setScanError('QR Code tidak valid')
      return
    }

    setLoading(true)
    setScanError(null)

    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', participantId)
        .single()

      if (error) throw error

      if (mode === 'attendance') {
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert([{ participant_id: participantId, status: 'present' }])

        if (attendanceError) throw attendanceError
        setAttendanceSuccess(true)
      }

      setScannedData(data)
      scannerRef.current?.clear()
    } catch (error) {
      console.error('Scan error:', error)
      setScanError('Data peserta tidak ditemukan')
    } finally {
      setLoading(false)
    }
  }

  const startScanner = () => {
    const scanner = new Html5QrcodeScanner(
      'qr-scanner',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )
    scanner.render(handleScanSuccess, () => {
      // Ignore per-frame "no QR found" callbacks — expected while scanning
    })
    scannerRef.current = scanner
  }

  useEffect(() => {
    startScanner()
    return () => {
      scannerRef.current?.clear().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleScanAgain = () => {
    setScannedData(null)
    setAttendanceSuccess(false)
    setScanError(null)
    startScanner()
  }

  const detailItems = scannedData
    ? [
        { icon: MapPin, label: 'Daerah', value: scannedData.daerah || '-' },
        { icon: MapPin, label: 'Desa', value: scannedData.desa || '-' },
        {
          icon: Ruler,
          label: 'TB / BB',
          value: `${scannedData.tinggi_badan || '-'} cm / ${scannedData.berat_badan || '-'} kg`,
        },
        { icon: GraduationCap, label: 'Pendidikan', value: scannedData.pendidikan_terakhir || '-' },
        { icon: Briefcase, label: 'Pekerjaan', value: scannedData.pekerjaan || '-' },
        { icon: Heart, label: 'Hobi', value: scannedData.hobi || '-' },
      ]
    : []

  // ---------- RESULT STATE ----------
  if (scannedData) {
    return (
      <div className="mx-auto max-w-2xl">
        {/* Konten yang HANYA tampil di layar (tersembunyi saat print) */}
        <div className="print:hidden">
          {attendanceSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Presensi berhasil dicatat
            </div>
          )}

          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex justify-center sm:col-span-1">
                {scannedData.foto_formal_url ? (
                  <div className="relative aspect-[4/5] w-32 overflow-hidden rounded-xl bg-gray-100 sm:w-full">
                    <Image
                      src={scannedData.foto_formal_url}
                      alt={`Foto formal ${scannedData.nama_lengkap}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] w-32 items-center justify-center rounded-xl bg-gray-100 sm:w-full">
                    <User className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>

              <div className="space-y-4 sm:col-span-2">
                <div>
                  <p className="text-xs uppercase text-gray-500">Nama</p>
                  <p className="text-xl font-bold text-gray-900">{scannedData.nama_lengkap}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="info">{scannedData.umur} tahun</Badge>
                    <Badge variant="info">{scannedData.jenis_kelamin}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {detailItems.map((item) => (
                    <div key={item.label} className="flex items-start gap-2">
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="text-xs uppercase text-gray-500">{item.label}</p>
                        <p className="text-sm text-gray-700">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            {mode === 'display' && (
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                icon={<Printer className="h-4 w-4" />}
                onClick={() => window.print()}
              >
                Cetak Kartu ID
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={handleScanAgain}
            >
              Scan QR Code Lain
            </Button>
          </div>
        </div>

        {/* Kartu ID — HANYA tampil saat print, tersembunyi di layar */}
        <div className="hidden print:flex print:h-[130mm] print:w-[90mm] print:flex-col print:overflow-hidden print:bg-white print:text-black">
          <div className="bg-purple-600 px-3 py-2 text-center text-white">
            <p className="text-[9px] font-semibold uppercase tracking-wide">Kartu Peserta</p>
          </div>

          <div className="flex flex-1 flex-col items-center px-3 pt-3">
            {scannedData.foto_formal_url && (
              <div className="relative h-[45mm] w-[35mm] overflow-hidden rounded-md border border-gray-300">
                <Image
                  src={scannedData.foto_formal_url}
                  alt={`Foto formal ${scannedData.nama_lengkap}`}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <p className="mt-2 text-center text-[13px] font-bold leading-tight">
              {scannedData.nama_lengkap}
            </p>
            <p className="text-center text-[9px] text-gray-600">
              {scannedData.umur} tahun · {scannedData.jenis_kelamin}
            </p>

            <div className="mt-2 w-full space-y-1 border-t border-gray-200 pt-2 text-[8.5px] leading-tight">
              <div className="flex justify-between">
                <span className="text-gray-500">Desa</span>
                <span className="font-medium">{scannedData.desa || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kelompok</span>
                <span className="font-medium">{scannedData.kelompok || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dapukan</span>
                <span className="font-medium">{scannedData.dapukan || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium">{scannedData.status || '-'}</span>
              </div>
            </div>

            {scannedData.qr_code_url && (
              <div className="relative mt-2 h-[18mm] w-[18mm]">
                <Image
                  src={scannedData.qr_code_url}
                  alt="QR Code peserta"
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </div>

          <div className="bg-gray-100 px-3 py-1 text-center text-[7px] text-gray-500">
            ID: {scannedData.id.slice(0, 8).toUpperCase()}
          </div>
        </div>
      </div>
    )
  }

  // ---------- SCANNER STATE ----------
  const config = modeConfig[mode]

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
          <ScanLine className="h-6 w-6 text-purple-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{config.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{config.subtitle}</p>
      </div>

      {scanError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
          {scanError}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div id="qr-scanner" className="w-full" />
      </Card>

      {loading && (
        <div className="mt-4">
          <Spinner label="Memuat data peserta..." />
        </div>
      )}
    </div>
  )
}