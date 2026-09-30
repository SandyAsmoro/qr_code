'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ScanLine,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  Download,
  IdCard as IdCardIcon,
  User,
  MapPin,
  Ruler,
  GraduationCap,
  Briefcase,
  Heart,
  Users2,
} from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'
import { parseQRCodeData } from '@/lib/encryption'
import { downloadCardAsImage } from '@/lib/downloadCard'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import IdCard from '@/components/IdCard'

type ScanMode = 'display' | 'attendance'

type ScannedParticipant = {
  id: string
  participant_code: string
  nama_lengkap: string
  umur: number
  jenis_kelamin: string
  daerah: string
  desa: string
  foto_formal_url: string
  tinggi_badan: number
  berat_badan: number
  anak_ke: number | null
  jumlah_saudara: number | null
  kelompok: string
  dapukan: string
  status: string
  pendidikan_terakhir: string
  pekerjaan: string
  hobi: string
  qr_code_url?: string | null
}

type AttendanceStatus = 'success' | 'duplicate' | null

const MODE_CONFIG: Record<ScanMode, { helper: string; icon: typeof ScanLine }> = {
  display: {
    helper: 'Data peserta akan tampil otomatis setelah QR Code terbaca.',
    icon: ScanLine,
  },
  attendance: {
    helper: 'Kehadiran peserta akan dicatat otomatis setelah QR Code terbaca.',
    icon: ClipboardCheck,
  },
}

/**
 * Gabungan "anak ke" dan "jumlah saudara" dalam satu teks.
 *
 * `jumlah_saudara` di form pendaftaran TIDAK termasuk peserta sendiri,
 * jadi total bersaudara = jumlah_saudara + 1.
 * Contoh: jumlah_saudara 3, anak_ke 2 → "Anak ke-2 dari 4 bersaudara".
 */
const formatKeluarga = (anakKe?: number | null, jumlahSaudara?: number | null): string => {
  const hasAnakKe = typeof anakKe === 'number' && anakKe > 0
  const totalBersaudara =
    typeof jumlahSaudara === 'number' && jumlahSaudara >= 0 ? jumlahSaudara + 1 : null

  if (hasAnakKe && totalBersaudara) return `Anak ke-${anakKe} dari ${totalBersaudara} bersaudara`
  if (hasAnakKe) return `Anak ke-${anakKe}`
  if (totalBersaudara) return `${totalBersaudara} bersaudara`
  return '-'
}

// Jeda sebelum scanner menerima frame berikutnya setelah gagal,
// supaya QR yang sama tidak memicu error berulang 10x per detik.
const SCAN_ERROR_COOLDOWN_MS = 2000

export default function QRScanner({ mode }: { mode: ScanMode }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const isProcessingRef = useRef(false)
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idCardRef = useRef<HTMLDivElement>(null)

  const [scannedData, setScannedData] = useState<ScannedParticipant | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(null)
  const [showCardPreview, setShowCardPreview] = useState(false)
  const [downloadingCard, setDownloadingCard] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const handleScanSuccess = async (decodedText: string) => {
    // Cegah frame kamera berikutnya memicu proses ganda untuk QR yang sama
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    let succeeded = false

    try {
      const participantId = parseQRCodeData(decodedText)

      if (!participantId) {
        setScanError('QR Code tidak valid.')
        return
      }

      setLoading(true)
      setScanError(null)

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

        if (attendanceError) {
          // Kode 23505 = pelanggaran unique constraint → peserta sudah pernah presensi
          if (attendanceError.code === '23505') {
            setAttendanceStatus('duplicate')
          } else {
            console.error('Attendance error:', attendanceError)
            setScanError('Gagal mencatat presensi. Silakan coba lagi.')
            return
          }
        } else {
          setAttendanceStatus('success')
        }
      }

      setScannedData(data)
      succeeded = true
      scannerRef.current?.clear().catch((err) => console.warn('Warning clearing scanner:', err))
    } catch (error) {
      console.error('Scan error:', error)
      setScanError('Data peserta tidak ditemukan.')
    } finally {
      setLoading(false)

      // Jika sukses, kunci dilepas oleh handleScanAgain.
      // Jika gagal, beri jeda singkat sebelum menerima scan berikutnya.
      if (!succeeded) {
        cooldownRef.current = setTimeout(() => {
          isProcessingRef.current = false
        }, SCAN_ERROR_COOLDOWN_MS)
      }
    }
  }

  const startScanner = () => {
    // Safety check: jika ada scanner lama yang masih aktif, clear dulu
    if (scannerRef.current) {
      try {
        scannerRef.current.clear()
      } catch (err) {
        console.warn('Warning clearing old scanner:', err)
      }
    }

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
      if (cooldownRef.current) clearTimeout(cooldownRef.current)

      // Cleanup scanner ketika component unmount atau mode berubah
      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .catch((err) => console.error('Cleanup error:', err))
          .finally(() => {
            scannerRef.current = null
          })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleScanAgain = async () => {
    // Clear scanner lama SEBELUM reset state untuk mencegah konflik instance
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear()
      } catch (err) {
        console.error('Error clearing scanner:', err)
      }
      scannerRef.current = null
    }

    if (cooldownRef.current) clearTimeout(cooldownRef.current)

    setScannedData(null)
    setAttendanceStatus(null)
    setScanError(null)
    setShowCardPreview(false)
    setCardError(null)
    isProcessingRef.current = false

    // Tunda sampai React selesai re-render "SCANNER STATE" (div #qr-scanner
    // baru muncul di DOM setelah scannedData jadi null). Kalau startScanner()
    // dipanggil langsung di sini, html5-qrcode akan mencari elemen yang belum
    // ada di DOM dan melempar error.
    setTimeout(startScanner, 100)
  }

  const handleDownloadCard = async () => {
    if (!idCardRef.current || !scannedData) return

    setDownloadingCard(true)
    setCardError(null)

    try {
      await downloadCardAsImage(idCardRef.current, `kartu-peserta-${scannedData.participant_code}`)
    } catch (error) {
      console.error('Gagal mengunduh kartu:', error)
      setCardError('Gagal mengunduh kartu peserta. Silakan coba lagi.')
    } finally {
      setDownloadingCard(false)
    }
  }

  const handlePrintCard = () => {
    // Tutup modal dulu supaya overlay tidak ikut tercetak
    setShowCardPreview(false)
    setTimeout(() => window.print(), 100)
  }

  // ---------- RESULT STATE ----------
  if (scannedData) {
    const hasQr = Boolean(scannedData.qr_code_url)

    const detailItems = [
      { icon: MapPin, label: 'Daerah', value: scannedData.daerah || '-' },
      { icon: MapPin, label: 'Desa', value: scannedData.desa || '-' },
      { icon: Users2, label: 'Kelompok', value: scannedData.kelompok || '-' },
      { icon: Users2, label: 'Dapukan', value: scannedData.dapukan || '-' },
      { icon: Users2, label: 'Status', value: scannedData.status || '-' },
      { icon: GraduationCap, label: 'Pendidikan', value: scannedData.pendidikan_terakhir || '-' },
      { icon: Briefcase, label: 'Pekerjaan', value: scannedData.pekerjaan || '-' },
      { icon: Heart, label: 'Hobi', value: scannedData.hobi || '-' },
      {
        icon: Ruler,
        label: 'Tinggi / Berat',
        value: `${scannedData.tinggi_badan ?? '-'} cm / ${scannedData.berat_badan ?? '-'} kg`,
      },
      {
        icon: Users2,
        label: 'Anak Ke / Saudara',
        value: formatKeluarga(scannedData.anak_ke, scannedData.jumlah_saudara),
      },
    ]

    return (
      <div className="mx-auto w-full max-w-2xl">
        {/* Tampil di layar saja (tersembunyi saat print) */}
        <div className="space-y-4 print:hidden">
          {attendanceStatus === 'success' && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-700">Presensi berhasil dicatat</p>
                <p className="mt-0.5 text-sm text-green-700">
                  {scannedData.nama_lengkap} tercatat hadir.
                </p>
              </div>
            </div>
          )}

          {attendanceStatus === 'duplicate' && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-orange-700">
                  Peserta sudah melakukan presensi
                </p>
                <p className="mt-0.5 text-sm text-orange-700">
                  Presensi untuk {scannedData.nama_lengkap} sudah tercatat sebelumnya.
                </p>
              </div>
            </div>
          )}

          {/* Data peserta */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              {scannedData.foto_formal_url ? (
                <div className="relative aspect-[4/6] w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-28">
                  <Image
                    src={scannedData.foto_formal_url}
                    alt={`Foto formal ${scannedData.nama_lengkap}`}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/6] w-24 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:w-28">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}

              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  {scannedData.nama_lengkap}
                </h2>
                <p className="mt-1 font-mono text-sm font-semibold text-purple-600">
                  {scannedData.participant_code}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="info">{scannedData.umur} tahun</Badge>
                  <Badge variant="info">{scannedData.jenis_kelamin}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-200 pt-5 sm:grid-cols-2">
              {detailItems.map((item) => (
                <div key={item.label} className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="text-xs text-gray-500">{item.label}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Aksi kartu ID (hanya mode scan peserta) */}
          {mode === 'display' && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  variant="secondary"
                  icon={<IdCardIcon className="h-4 w-4" />}
                  disabled={!hasQr}
                  onClick={() => setShowCardPreview(true)}
                >
                  Tampilkan Kartu ID
                </Button>
                <Button
                  variant="secondary"
                  icon={<Printer className="h-4 w-4" />}
                  disabled={!hasQr}
                  onClick={handlePrintCard}
                >
                  Cetak Kartu ID
                </Button>
              </div>
              {!hasQr && (
                <p className="text-xs text-gray-500">
                  QR Code peserta ini belum tersedia, sehingga kartu ID belum dapat ditampilkan.
                </p>
              )}
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={handleScanAgain}
          >
            Scan QR Code Lain
          </Button>
        </div>

        {/* Kartu ID — hanya tampil saat print. Warna latar dipaksa ikut tercetak. */}
        {hasQr && (
          <div className="hidden print:flex print:justify-center [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
            <IdCard
              nama={scannedData.nama_lengkap}
              participantCode={scannedData.participant_code}
              qrCodeUrl={scannedData.qr_code_url ?? ''}
              daerah={scannedData.daerah || undefined}
            />
          </div>
        )}

        {/* Preview Kartu ID */}
        <Modal
          isOpen={showCardPreview}
          onClose={() => setShowCardPreview(false)}
          title="Preview Kartu ID"
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <IdCard
                ref={idCardRef}
                nama={scannedData.nama_lengkap}
                participantCode={scannedData.participant_code}
                qrCodeUrl={scannedData.qr_code_url ?? ''}
                daerah={scannedData.daerah || undefined}
              />
            </div>

            {cardError && (
              <p role="alert" className="text-xs text-red-600">
                {cardError}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                className="flex-1"
                icon={<Download className="h-4 w-4" />}
                loading={downloadingCard}
                onClick={handleDownloadCard}
              >
                Download Kartu
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                icon={<Printer className="h-4 w-4" />}
                disabled={downloadingCard}
                onClick={handlePrintCard}
              >
                Cetak
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ---------- SCANNER STATE ----------
  const config = MODE_CONFIG[mode]
  const ModeIcon = config.icon

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      {scanError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-700">{scanError}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <ModeIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pindai QR Code</h2>
            <p className="text-sm text-gray-600">{config.helper}</p>
          </div>
        </div>

        <div id="qr-scanner" className="w-full" />
      </section>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <Spinner label="Memuat data peserta..." />
        </div>
      )}
    </div>
  )
}