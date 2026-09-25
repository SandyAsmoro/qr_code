'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Camera, X, CheckCircle2, Download, RotateCcw, Mail, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { generateQRCode, downloadQRCode } from '@/lib/qrcode'
import { generateQRCodeData } from '@/lib/encryption'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

type FormDataType = {
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

const PENDIDIKAN_OPTIONS = ['SD', 'SMP', 'SMA', 'D1', 'D2', 'D3', 'S1', 'S2', 'S3']
const STATUS_OPTIONS = ['Belum Menikah', 'Duda', 'Janda']
const JENIS_KELAMIN_OPTIONS = ['Laki-laki', 'Perempuan']

const initialFormData: FormDataType = {
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
}

export default function RegistrationForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [uploadStatus, setUploadStatus] = useState<{
    loading: boolean
    message: string
  }>({ loading: false, message: '' })

  const [formData, setFormData] = useState<FormDataType>(initialFormData)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [submittedData, setSubmittedData] = useState<any>(null)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setFormData((prev) => ({
      ...prev,
      [name]:
        value === ''
          ? ''
          : ['umur', 'tinggi_badan', 'berat_badan', 'jumlah_saudara', 'anak_ke'].includes(name)
          ? Number(value)
          : value,
    }))
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((p) => ({ ...p, foto: 'Ukuran foto maksimal 10MB' }))
      return
    }
    if (!file.type.startsWith('image/')) {
      setFieldErrors((p) => ({ ...p, foto: 'File harus berupa gambar' }))
      return
    }

    setFieldErrors((p) => ({ ...p, foto: '' }))
    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setFotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeFoto = () => {
    setFotoFile(null)
    setFotoPreview(null)
  }

  const uploadFoto = async (file: File): Promise<string | null> => {
    try {
      setUploadStatus({ loading: true, message: 'Mengompresi & mengunggah foto...' })

      const fd = new FormData()
      fd.append('file', file)

      const response = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Upload gagal')
      }

      const data = await response.json()
      setUploadStatus({ loading: false, message: '' })
      return data.url
    } catch (error) {
      setUploadStatus({ loading: false, message: '' })
      setFieldErrors((p) => ({ ...p, foto: 'Gagal mengunggah foto, coba lagi' }))
      return null
    }
  }

  const sendEmailNotification = async (email: string, nama: string, qrCodeDataUrl: string) => {
    setEmailStatus('sending')
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nama_lengkap: nama, qrCodeDataUrl }),
      })
      if (!response.ok) throw new Error()
      setEmailStatus('sent')
    } catch {
      setEmailStatus('failed')
    }
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.nama_lengkap.trim()) errors.nama_lengkap = 'Nama lengkap wajib diisi'
    if (!formData.email.trim()) {
      errors.email = 'Email wajib diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format email tidak valid'
    }
    if (!formData.umur) errors.umur = 'Umur wajib diisi'
    if (!formData.jenis_kelamin) errors.jenis_kelamin = 'Jenis kelamin wajib dipilih'
    if (!fotoFile) errors.foto = 'Foto formal wajib diunggah'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)

    try {
      const fotoUrl = await uploadFoto(fotoFile!)
      if (!fotoUrl) {
        setLoading(false)
        return
      }

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

      const qrData = generateQRCodeData(data.id)
      const qrImage = await generateQRCode(qrData)

      const { error: updateError } = await supabase
        .from('participants')
        .update({ qr_code_data: qrData, qr_code_url: qrImage })
        .eq('id', data.id)

      if (updateError) throw updateError

      setQrCode(qrImage)
      setSubmittedData(data)
      setSubmitted(true)
      sendEmailNotification(formData.email, formData.nama_lengkap, qrImage)
    } catch (error) {
      console.error('Submit error:', error)
      setFieldErrors((p) => ({ ...p, submit: 'Gagal menyimpan data. Silakan coba lagi.' }))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setEmailStatus('idle')
    setFormData(initialFormData)
    setQrCode(null)
    setFotoFile(null)
    setFotoPreview(null)
    setSubmittedData(null)
    setFieldErrors({})
  }

  // ---------- SUCCESS STATE ----------
  if (submitted && qrCode && submittedData) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Registrasi Berhasil</h2>
          <p className="mt-1 text-sm text-gray-600">Data Anda telah tersimpan</p>
        </div>

        <Card className="mb-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex justify-center sm:col-span-1">
              {submittedData.foto_formal_url && (
                <div className="relative aspect-[4/5] w-32 overflow-hidden rounded-xl bg-gray-100 sm:w-full">
                  <Image
                    src={submittedData.foto_formal_url}
                    alt={`Foto formal ${submittedData.nama_lengkap}`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm sm:col-span-2">
              <div>
                <p className="text-xs uppercase text-gray-500">Nama</p>
                <p className="font-semibold text-gray-900">{submittedData.nama_lengkap}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">Umur</p>
                  <p className="text-gray-700">{submittedData.umur} tahun</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Jenis Kelamin</p>
                  <p className="text-gray-700">{submittedData.jenis_kelamin}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Desa</p>
                  <p className="text-gray-700">{submittedData.desa || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Kelompok</p>
                  <p className="text-gray-700">{submittedData.kelompok || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-4 flex flex-col items-center">
          <p className="mb-3 text-sm text-gray-600">QR Code untuk presensi:</p>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <img src={qrCode} alt="QR Code peserta" className="h-56 w-56" />
          </div>
        </Card>

        {/* Email status */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <Mail className="h-4 w-4 shrink-0 text-gray-400" />
          {emailStatus === 'sending' && (
            <span className="text-gray-600">Mengirim QR Code ke {submittedData.email}...</span>
          )}
          {emailStatus === 'sent' && (
            <span className="text-green-700">
              QR Code terkirim ke <strong>{submittedData.email}</strong>
            </span>
          )}
          {emailStatus === 'failed' && (
            <div className="flex flex-1 items-center justify-between">
              <span className="text-red-600">Gagal mengirim email</span>
              <button
                type="button"
                onClick={() =>
                  sendEmailNotification(submittedData.email, submittedData.nama_lengkap, qrCode)
                }
                className="text-xs font-semibold text-purple-600 hover:underline"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="primary"
            className="flex-1"
            icon={<Download className="h-4 w-4" />}
            onClick={() => downloadQRCode(qrCode, `qr-${submittedData.nama_lengkap}`)}
          >
            Download QR Code
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={handleReset}
          >
            Daftar Peserta Baru
          </Button>
        </div>
      </div>
    )
  }

  // ---------- FORM STATE ----------
  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
      {fieldErrors.submit && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {fieldErrors.submit}
        </div>
      )}

      {/* Data Utama */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Data Utama</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            id="nama_lengkap"
            name="nama_lengkap"
            label="Nama Lengkap"
            required
            value={formData.nama_lengkap}
            onChange={handleChange}
            error={fieldErrors.nama_lengkap}
            placeholder="Contoh: Achmad Rifki"
          />
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            required
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            helperText={!fieldErrors.email ? 'QR Code akan dikirim ke email ini' : undefined}
            placeholder="nama@email.com"
          />
          <Input
            id="umur"
            name="umur"
            type="number"
            label="Umur"
            required
            min={1}
            max={150}
            value={formData.umur}
            onChange={handleChange}
            error={fieldErrors.umur}
            placeholder="Contoh: 25"
          />
          <Select
            id="jenis_kelamin"
            name="jenis_kelamin"
            label="Jenis Kelamin"
            required
            value={formData.jenis_kelamin}
            onChange={handleChange}
            error={fieldErrors.jenis_kelamin}
          >
            <option value="">-- Pilih --</option>
            {JENIS_KELAMIN_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
          <Select
            id="status"
            name="status"
            label="Status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="">-- Pilih --</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Lokasi */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Lokasi</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            id="daerah"
            name="daerah"
            label="Daerah"
            value={formData.daerah}
            onChange={handleChange}
            placeholder="Contoh: Kecamatan Semen"
          />
          <Input
            id="desa"
            name="desa"
            label="Desa"
            value={formData.desa}
            onChange={handleChange}
            placeholder="Contoh: Desa Semen"
          />
          <Input
            id="kelompok"
            name="kelompok"
            label="Kelompok"
            value={formData.kelompok}
            onChange={handleChange}
            placeholder="Contoh: Kelompok A"
          />
          <Input
            id="dapukan"
            name="dapukan"
            label="Dapukan"
            value={formData.dapukan}
            onChange={handleChange}
            placeholder="Contoh: Dapukan 1"
          />
        </div>
      </Card>

      {/* Informasi Fisik */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Informasi Fisik</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            id="tinggi_badan"
            name="tinggi_badan"
            type="number"
            step="0.1"
            label="Tinggi Badan (cm)"
            value={formData.tinggi_badan}
            onChange={handleChange}
            placeholder="Contoh: 175"
          />
          <Input
            id="berat_badan"
            name="berat_badan"
            type="number"
            step="0.1"
            label="Berat Badan (kg)"
            value={formData.berat_badan}
            onChange={handleChange}
            placeholder="Contoh: 70"
          />
        </div>
      </Card>

      {/* Keluarga */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">
          Informasi Keluarga
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            id="jumlah_saudara"
            name="jumlah_saudara"
            type="number"
            label="Jumlah Saudara"
            value={formData.jumlah_saudara}
            onChange={handleChange}
            placeholder="Contoh: 3"
          />
          <Input
            id="anak_ke"
            name="anak_ke"
            type="number"
            label="Anak ke"
            value={formData.anak_ke}
            onChange={handleChange}
            placeholder="Contoh: 1"
          />
        </div>
      </Card>

      {/* Pendidikan & Pekerjaan */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">
          Pendidikan & Pekerjaan
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            id="pendidikan_terakhir"
            name="pendidikan_terakhir"
            label="Pendidikan Terakhir"
            value={formData.pendidikan_terakhir}
            onChange={handleChange}
          >
            <option value="">-- Pilih --</option>
            {PENDIDIKAN_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
          <Input
            id="pekerjaan"
            name="pekerjaan"
            label="Pekerjaan"
            value={formData.pekerjaan}
            onChange={handleChange}
            placeholder="Contoh: Karyawan Swasta"
          />
        </div>
      </Card>

      {/* Hobi & Foto */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Hobi & Foto</h2>

        <div className="mb-4">
          <Textarea
            id="hobi"
            name="hobi"
            label="Hobi"
            rows={3}
            value={formData.hobi}
            onChange={handleChange}
            placeholder="Contoh: Membaca buku, Bermain sepak bola"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Foto Formal <span className="text-red-500">*</span>
          </label>

          {fotoPreview ? (
            <div className="flex items-start gap-4 rounded-xl border border-gray-200 p-4">
              <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <Image src={fotoPreview} alt="Preview foto formal" fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{fotoFile?.name}</p>
                <p className="text-xs text-gray-500">
                  {((fotoFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={removeFoto}
                aria-label="Hapus foto"
                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="foto"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition hover:border-purple-400 hover:bg-purple-50/30"
            >
              <Camera className="h-6 w-6 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Upload Foto</p>
              <p className="text-xs text-gray-500">JPG, PNG, WEBP · Maksimal 10MB</p>
              <input
                id="foto"
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                disabled={uploadStatus.loading}
                className="sr-only"
              />
            </label>
          )}

          {fieldErrors.foto && <p className="mt-2 text-xs text-red-600">{fieldErrors.foto}</p>}
          {uploadStatus.loading && (
            <p className="mt-2 text-xs text-purple-600">{uploadStatus.message}</p>
          )}
        </div>
      </Card>

      <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
        {loading ? 'Memproses...' : 'Submit Registrasi'}
      </Button>
    </form>
  )
}