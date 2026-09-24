'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'
import { parseQRCodeData } from '@/lib/encryption'

type ScanMode = 'display' | 'attendance'

export default function QRScanner({ mode }: { mode: ScanMode }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [scannedData, setScannedData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [attendanceSuccess, setAttendanceSuccess] = useState(false)

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-scanner',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )

    const onScanSuccess = async (decodedText: string) => {
      const participantId = parseQRCodeData(decodedText)

      if (!participantId) {
        alert('QR Code tidak valid')
        return
      }

      setLoading(true)

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
            .insert([
              {
                participant_id: participantId,
                status: 'present',
              },
            ])

          if (attendanceError) throw attendanceError
          setAttendanceSuccess(true)
        }

        setScannedData(data)
        scanner.clear()
      } catch (error) {
        console.error('Error:', error)
        alert('Data tidak ditemukan')
      } finally {
        setLoading(false)
      }
    }

    scanner.render(onScanSuccess, (error) => {
      console.log(error)
    })

    scannerRef.current = scanner

    return () => {
      scanner.clear()
    }
  }, [mode])

  if (scannedData) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg shadow-xl p-6 mb-6 border-2 border-blue-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex justify-center">
              {scannedData.foto_formal_url && (
                <div className="relative w-40 h-48">
                  <Image
                    src={scannedData.foto_formal_url}
                    alt={scannedData.nama_lengkap}
                    fill
                    className="object-cover rounded-lg border-4 border-white shadow-lg"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-3">
              <div>
                <p className="text-gray-600 text-xs uppercase font-semibold">Nama</p>
                <p className="text-2xl font-bold text-gray-800">
                  {scannedData.nama_lengkap}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase font-semibold">Umur</p>
                  <p className="text-lg font-bold">{scannedData.umur} tahun</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase font-semibold">
                    Jenis Kelamin
                  </p>
                  <p className="text-lg font-bold">{scannedData.jenis_kelamin}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase font-semibold">Daerah</p>
                  <p className="font-semibold">{scannedData.daerah || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase font-semibold">Desa</p>
                  <p className="font-semibold">{scannedData.desa || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase font-semibold">
                    TB/BB
                  </p>
                  <p className="font-semibold">
                    {scannedData.tinggi_badan || '-'} cm / {scannedData.berat_badan || '-'} kg
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase font-semibold">
                    Anak ke
                  </p>
                  <p className="font-semibold">{scannedData.anak_ke || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase font-semibold">
                    Pendidikan
                  </p>
                  <p className="font-semibold">{scannedData.pendidikan_terakhir || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase font-semibold">
                    Pekerjaan
                  </p>
                  <p className="font-semibold">{scannedData.pekerjaan || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-600 text-xs uppercase font-semibold">Hobi</p>
                <p className="font-semibold text-sm">{scannedData.hobi || '-'}</p>
              </div>
            </div>
          </div>

          {attendanceSuccess && (
            <div className="mt-6 bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded-lg font-bold text-center">
              ✓ Presensi Berhasil Dicatat!
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setScannedData(null)
            setAttendanceSuccess(false)
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
        >
          Scan QR Code Lain
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">
        {mode === 'display' ? '📱 Scan Peserta' : '✓ Scan Presensi'}
      </h1>
      <div id="qr-scanner" style={{ width: '100%' }}></div>
      {loading && (
        <p className="text-center mt-4 text-lg font-semibold">
          ⏳ Loading data...
        </p>
      )}
    </div>
  )
}