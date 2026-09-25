'use client'

import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { generateQRCode, downloadQRCode } from '@/lib/qrcode'
import { generateQRCodeData } from '@/lib/encryption'

type FormData = {
  nama_lengkap: string
  email: string
  umur: number | ''
  jenis_kelamin: string
  daerah: string
  desa: string
  tinggi_badan: number | ''
  berat_badan: number | ''
  jumlah_saudara: number | ''
  anak_ke: number | ''
  kelompok: string
  hobi: string
  dapukan: string
  status: string
  pendidikan_terakhir: string
  pekerjaan: string
}

type UploadStatus = {
  loading: boolean
  progress: number
  message: string
  originalSize?: number
  optimizedSize?: number
  compressionRatio?: number
}

const PENDIDIKAN_OPTIONS = ['SD', 'SMP', 'SMA', 'D1', 'D2', 'D3', 'S1', 'S2', 'S3']
const STATUS_OPTIONS = ['Belum Menikah', 'Menikah', 'Cerai']
const JENIS_KELAMIN_OPTIONS = ['Laki-laki', 'Perempuan']

export default function RegistrationForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    loading: false,
    progress: 0,
    message: '',
  })

  const [formData, setFormData] = useState<FormData>({
    nama_lengkap: '',
    email: '',
    umur: '',
    jenis_kelamin: '',
    daerah: '',
    desa: '',
    tinggi_badan: '',
    berat_badan: '',
    jumlah_saudara: '',
    anak_ke: '',
    kelompok: '',
    hobi: '',
    dapukan: '',
    status: '',
    pendidikan_terakhir: '',
    pekerjaan: '',
  })

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [submittedData, setSubmittedData] = useState<any>(null)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  const sendEmailNotification = async (
    email: string,
    nama: string,
    qrCodeDataUrl: string
  ) => {
    setEmailStatus('sending')
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nama_lengkap: nama, qrCodeDataUrl }),
      })

      if (!response.ok) throw new Error('Gagal kirim email')
      setEmailStatus('sent')
    } catch (error) {
      console.error('Error sending email:', error)
      setEmailStatus('failed')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? '' :
               ['umur', 'tinggi_badan', 'berat_badan', 'jumlah_saudara', 'anak_ke'].includes(name)
                 ? value === '' ? '' : Number(value)
                 : value,
    }))
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran foto tidak boleh lebih dari 10MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar')
        return
      }

      setFotoFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setFotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadFoto = async (file: File): Promise<string | null> => {
    try {
      setUploadStatus({
        loading: true,
        progress: 0,
        message: '📤 Menyiapkan foto...',
      })

      const formData = new FormData()
      formData.append('file', file)

      setUploadStatus(prev => ({
        ...prev,
        progress: 30,
        message: '🔄 Mengompresi foto...',
      }))

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()

      setUploadStatus(prev => ({
        ...prev,
        progress: 100,
        message: '✅ Foto berhasil dioptimasi & diupload!',
        originalSize: data.originalSize,
        optimizedSize: data.optimizedSize,
        compressionRatio: data.compressionRatio,
      }))

      setTimeout(() => {
        setUploadStatus({
          loading: false,
          progress: 0,
          message: '',
        })
      }, 2000)

      return data.url
    } catch (error) {
      console.error('Error uploading foto:', error)
      setUploadStatus({
        loading: false,
        progress: 0,
        message: `❌ Gagal upload foto: ${error}`,
      })
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nama_lengkap || !formData.email || !formData.umur || !formData.jenis_kelamin) {
      alert('Nama, Email, Umur, dan Jenis Kelamin harus diisi')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      alert('Format email tidak valid')
      return
    }

    if (!fotoFile) {
      alert('Foto formal harus diunggah')
      return
    }

    setLoading(true)

    try {
      const fotoUrl = await uploadFoto(fotoFile)
      if (!fotoUrl) throw new Error('Foto gagal diupload')

      const { data, error } = await supabase
        .from('participants')
        .insert([
          {
            nama_lengkap: formData.nama_lengkap,
            email: formData.email,
            umur: formData.umur,
            jenis_kelamin: formData.jenis_kelamin,
            daerah: formData.daerah,
            desa: formData.desa,
            foto_formal_url: fotoUrl,
            tinggi_badan: formData.tinggi_badan,
            berat_badan: formData.berat_badan,
            jumlah_saudara: formData.jumlah_saudara,
            anak_ke: formData.anak_ke,
            kelompok: formData.kelompok,
            hobi: formData.hobi,
            dapukan: formData.dapukan,
            status: formData.status,
            pendidikan_terakhir: formData.pendidikan_terakhir,
            pekerjaan: formData.pekerjaan,
            qr_code_data: '',
          },
        ])
        .select('*')
        .single()

      if (error) throw error

      const newParticipantId = data.id
      setParticipantId(newParticipantId)

      const qrData = generateQRCodeData(newParticipantId)
      const qrImage = await generateQRCode(qrData)

      const { error: updateError } = await supabase
        .from('participants')
        .update({
          qr_code_data: qrData,
          qr_code_url: qrImage,
        })
        .eq('id', newParticipantId)

      if (updateError) throw updateError

      setQrCode(qrImage)
      setSubmittedData(data)
      setSubmitted(true)

      // Kirim email notifikasi (tidak memblokir tampilan sukses)
      sendEmailNotification(formData.email, formData.nama_lengkap, qrImage)
    } catch (error) {
      console.error('Error:', error)
      alert('Gagal menyimpan data. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setEmailStatus('idle')
    setFormData({
      nama_lengkap: '',
      email: '',
      umur: '',
      jenis_kelamin: '',
      daerah: '',
      desa: '',
      tinggi_badan: '',
      berat_badan: '',
      jumlah_saudara: '',
      anak_ke: '',
      kelompok: '',
      hobi: '',
      dapukan: '',
      status: '',
      pendidikan_terakhir: '',
      pekerjaan: '',
    })
    setQrCode(null)
    setFotoFile(null)
    setFotoPreview(null)
    setParticipantId(null)
  }

  if (submitted && qrCode && participantId && submittedData) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-green-600">✓ Registrasi Berhasil!</h2>
          <p className="text-gray-600 mt-2">Data Anda telah tersimpan</p>
        </div>

        <div className="bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg p-6 mb-6 border-2 border-blue-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex justify-center">
              {submittedData.foto_formal_url && (
                <div className="relative w-40 h-48">
                  <Image
                    src={submittedData.foto_formal_url}
                    alt={submittedData.nama_lengkap}
                    fill
                    className="object-cover rounded-lg border-2 border-gray-300"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase">Nama</p>
                  <p className="font-bold text-lg">{submittedData.nama_lengkap}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase">Umur</p>
                  <p className="font-bold">{submittedData.umur} tahun</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase">Jenis Kelamin</p>
                  <p className="font-semibold">{submittedData.jenis_kelamin}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase">Daerah</p>
                  <p className="font-semibold">{submittedData.daerah || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase">Desa</p>
                  <p className="font-semibold">{submittedData.desa || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase">Kelompok</p>
                  <p className="font-semibold">{submittedData.kelompok || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase">TB/BB</p>
                  <p className="font-semibold">
                    {submittedData.tinggi_badan || '-'} cm / {submittedData.berat_badan || '-'} kg
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase">Anak ke</p>
                  <p className="font-semibold">{submittedData.anak_ke || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-xs uppercase">Pendidikan</p>
                  <p className="font-semibold">{submittedData.pendidikan_terakhir || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase">Status</p>
                  <p className="font-semibold">{submittedData.status || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-600 text-xs uppercase">Hobi</p>
                <p className="font-semibold">{submittedData.hobi || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 p-6 bg-gray-100 rounded-lg flex flex-col items-center">
          <p className="text-sm text-gray-600 mb-3">Scan untuk melihat data peserta:</p>
          <img src={qrCode} alt="QR Code" className="w-64 h-64 border-4 border-white" />
        </div>

        {/* Status Email */}
        <div className="mb-6 p-4 rounded-lg border text-sm">
          {emailStatus === 'sending' && (
            <p className="text-blue-600">📧 Mengirim QR Code ke {submittedData.email}...</p>
          )}
          {emailStatus === 'sent' && (
            <p className="text-green-600">
              ✅ QR Code berhasil dikirim ke <strong>{submittedData.email}</strong>
            </p>
          )}
          {emailStatus === 'failed' && (
            <div className="flex items-center justify-between">
              <p className="text-red-600">❌ Gagal mengirim email</p>
              <button
                type="button"
                onClick={() =>
                  sendEmailNotification(submittedData.email, submittedData.nama_lengkap, qrCode)
                }
                className="text-blue-600 hover:underline font-semibold"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => downloadQRCode(qrCode, `qr-${submittedData.nama_lengkap}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            📥 Download QR Code
          </button>

          <button
            onClick={handleReset}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
          >
            Daftar Peserta Baru
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-2">Formulir Registrasi Peserta</h1>
      <p className="text-gray-600 mb-6">Isi semua data dengan lengkap dan benar</p>

      <div className="mb-8 pb-6 border-b">
        <h2 className="text-xl font-bold text-blue-600 mb-4">📋 Data Personal</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nama_lengkap"
              value={formData.nama_lengkap}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Achmad Rifki"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: nama@email.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              QR Code akan dikirim ke email ini
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Umur <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="umur"
              value={formData.umur}
              onChange={handleChange}
              required
              min="1"
              max="150"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: 25"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Jenis Kelamin <span className="text-red-500">*</span>
            </label>
            <select
              name="jenis_kelamin"
              value={formData.jenis_kelamin}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Pilih --</option>
              {JENIS_KELAMIN_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Pilih --</option>
              {STATUS_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-8 pb-6 border-b">
        <h2 className="text-xl font-bold text-blue-600 mb-4">📍 Lokasi</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Daerah</label>
            <input
              type="text"
              name="daerah"
              value={formData.daerah}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Kecamatan Semen"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Desa</label>
            <input
              type="text"
              name="desa"
              value={formData.desa}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Desa Semen"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Kelompok</label>
            <input
              type="text"
              name="kelompok"
              value={formData.kelompok}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Kelompok A"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Dapukan</label>
            <input
              type="text"
              name="dapukan"
              value={formData.dapukan}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Dapukan 1"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 pb-6 border-b">
        <h2 className="text-xl font-bold text-blue-600 mb-4">⚖️ Informasi Fisik</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Tinggi Badan (cm)</label>
            <input
              type="number"
              name="tinggi_badan"
              value={formData.tinggi_badan}
              onChange={handleChange}
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: 175"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Berat Badan (kg)</label>
            <input
              type="number"
              name="berat_badan"
              value={formData.berat_badan}
              onChange={handleChange}
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: 70"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 pb-6 border-b">
        <h2 className="text-xl font-bold text-blue-600 mb-4">👨‍👩‍👧‍👦 Informasi Keluarga</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Jumlah Saudara</label>
            <input
              type="number"
              name="jumlah_saudara"
              value={formData.jumlah_saudara}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: 3"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Anak ke</label>
            <input
              type="number"
              name="anak_ke"
              value={formData.anak_ke}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: 1"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 pb-6 border-b">
        <h2 className="text-xl font-bold text-blue-600 mb-4">🎓 Pendidikan & Pekerjaan</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Pendidikan Terakhir</label>
            <select
              name="pendidikan_terakhir"
              value={formData.pendidikan_terakhir}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Pilih --</option>
              {PENDIDIKAN_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Pekerjaan</label>
            <input
              type="text"
              name="pekerjaan"
              value={formData.pekerjaan}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Karyawan Swasta"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 pb-6 border-b">
        <h2 className="text-xl font-bold text-blue-600 mb-4">🎨 Hobi & Foto</h2>

        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">Hobi</label>
          <textarea
            name="hobi"
            value={formData.hobi}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Contoh: Membaca buku, Bermain sepak bola"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">
            Foto Formal <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            {fotoPreview ? (
              <div className="space-y-4">
                <div className="relative w-40 h-48 mx-auto">
                  <Image
                    src={fotoPreview}
                    alt="Preview"
                    fill
                    className="object-cover rounded-lg border-2 border-gray-300"
                  />
                </div>
                <p className="text-center text-sm text-gray-600">
                  {fotoFile?.name} ({(fotoFile!.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-500 mb-4">
                <p className="text-2xl">📷</p>
                <p>Belum ada foto</p>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              disabled={uploadStatus.loading}
              className="w-full disabled:opacity-50 cursor-pointer"
            />

            <p className="text-xs text-gray-600 mt-2">
              Foto akan dikonversi ke format WEBP (optimal untuk web).
              Max 10MB. Format didukung: JPG, PNG, WEBP, dll
            </p>
          </div>

          {uploadStatus.message && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-700 mb-2">
                {uploadStatus.message}
              </p>

              {uploadStatus.progress > 0 && (
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${uploadStatus.progress}%` }}
                  />
                </div>
              )}

              {uploadStatus.originalSize && uploadStatus.optimizedSize && (
                <div className="mt-3 space-y-1 text-xs text-gray-700">
                  <p>
                    <strong>Original:</strong>{' '}
                    {(uploadStatus.originalSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p>
                    <strong>Optimized:</strong>{' '}
                    {(uploadStatus.optimizedSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-green-600">
                    <strong>Kompresi:</strong> {uploadStatus.compressionRatio}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || uploadStatus.loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition text-lg"
      >
        {loading || uploadStatus.loading ? '⏳ Memproses...' : '✓ Submit Registrasi'}
      </button>
    </form>
  )
}