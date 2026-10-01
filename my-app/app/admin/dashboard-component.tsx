'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCheck,
  UserX,
  Search,
  SlidersHorizontal,
  X,
  Download,
  LogOut,
  Wrench,
  Eye,
  Trash2,
  User,
  FilterX,
  MapPin,
  Ruler,
  GraduationCap,
  Briefcase,
  Heart,
  Users2,
  ScanLine,
  ClipboardCheck,
  QrCode,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { exportToExcel, exportToCSV } from '@/lib/exportData'
import { downloadCardAsImage } from '@/lib/downloadCard'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import IdCard from '@/components/IdCard'
import BulkIdCardDownload from '@/components/BulkIdCardDownload'

type Participant = {
  id: string
  participant_code: string
  created_at: string
  nama_lengkap: string
  umur: number
  jenis_kelamin: string
  daerah: string
  desa: string
  foto_formal_url: string
  tinggi_badan: number
  berat_badan: number
  jumlah_saudara: number
  anak_ke: number
  kelompok: string
  hobi: string
  dapukan: string
  status: string
  pendidikan_terakhir: string
  pekerjaan: string
  email?: string | null
  qr_code_data?: string | null
  qr_code_url?: string | null
  attendance_count?: number
}

type AttendanceRow = {
  participant_id: string | null
}

type AttendanceFilter = '' | 'hadir' | 'belum'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const DAERAH_OPTIONS = ['Kediri Kota', 'Kediri Barat', 'Kediri Selatan 1']
const JENIS_KELAMIN_OPTIONS = ['Laki-laki', 'Perempuan']

const hasAttended = (p: Participant) => (p.attendance_count || 0) > 0

export default function DashboardComponent({ role = 'admin' }: { role?: 'admin' | 'panitia' }) {
  const router = useRouter()

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [search, setSearch] = useState('')
  const [filterDaerah, setFilterDaerah] = useState('')
  const [filterDesa, setFilterDesa] = useState('')
  const [filterKelompok, setFilterKelompok] = useState('')
  const [filterJenisKelamin, setFilterJenisKelamin] = useState('')
  const [filterAttendance, setFilterAttendance] = useState<AttendanceFilter>('')
  const [showFilters, setShowFilters] = useState(false)

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [downloadingCard, setDownloadingCard] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const idCardRef = useRef<HTMLDivElement>(null)

  // Toast otomatis hilang
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  // ---------------------------------------------------------------
  // Fetch data
  // ---------------------------------------------------------------
  const loadParticipants = useCallback(async () => {
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false })

      if (participantError) throw participantError

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('participant_id')

      // Dilempar (bukan hanya warn) supaya status presensi tidak
      // salah tampil "Belum Hadir" untuk semua peserta saat query gagal.
      if (attendanceError) throw attendanceError

      const attendanceMap = ((attendanceData || []) as AttendanceRow[]).reduce<
        Record<string, number>
      >((acc, row) => {
        if (row.participant_id) {
          acc[row.participant_id] = (acc[row.participant_id] || 0) + 1
        }
        return acc
      }, {})

      const merged = ((participantData || []) as Participant[]).map((p) => ({
        ...p,
        attendance_count: attendanceMap[p.id] || 0,
      }))

      setParticipants(merged)
    } catch (error) {
      console.error('Error fetching participants:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Dipakai tombol "Coba Lagi" & "Refresh"
  const fetchParticipants = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    void loadParticipants()
  }, [loadParticipants])

  // Load awal: state loading sudah true secara default
  useEffect(() => {
    // setState di dalam loadParticipants baru terjadi setelah await (async),
    // jadi tidak memicu cascading render; rule ini false positive untuk pola fetch awal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadParticipants()
  }, [loadParticipants])

  // ---------------------------------------------------------------
  // Filter options & filtered data
  // ---------------------------------------------------------------
  const daerahOptions = useMemo(
    () =>
      Array.from(
        new Set([...DAERAH_OPTIONS, ...participants.map((p) => p.daerah).filter(Boolean)])
      ),
    [participants]
  )

  const desaOptions = useMemo(
    () => Array.from(new Set(participants.map((p) => p.desa).filter(Boolean))).sort(),
    [participants]
  )

  const kelompokOptions = useMemo(
    () => Array.from(new Set(participants.map((p) => p.kelompok).filter(Boolean))).sort(),
    [participants]
  )

  const activeFilterCount =
    [filterDaerah, filterDesa, filterKelompok, filterJenisKelamin, filterAttendance].filter(
      Boolean
    ).length

  const hasActiveFilters = activeFilterCount > 0 || search.trim() !== ''

  const filteredParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return participants.filter((p) => {
      const matchesSearch =
        !keyword ||
        [p.nama_lengkap, p.participant_code, p.desa, p.daerah, p.kelompok, p.pekerjaan].some(
          (field) => field?.toLowerCase().includes(keyword)
        )

      const matchesDaerah = !filterDaerah || p.daerah === filterDaerah
      const matchesDesa = !filterDesa || p.desa === filterDesa
      const matchesKelompok = !filterKelompok || p.kelompok === filterKelompok
      const matchesGender = !filterJenisKelamin || p.jenis_kelamin === filterJenisKelamin
      const matchesAttendance =
        !filterAttendance ||
        (filterAttendance === 'hadir' && hasAttended(p)) ||
        (filterAttendance === 'belum' && !hasAttended(p))

      return (
        matchesSearch &&
        matchesDaerah &&
        matchesDesa &&
        matchesKelompok &&
        matchesGender &&
        matchesAttendance
      )
    })
  }, [
    participants,
    search,
    filterDaerah,
    filterDesa,
    filterKelompok,
    filterJenisKelamin,
    filterAttendance,
  ])

  const participantsWithQr = useMemo(
    () => filteredParticipants.filter((p) => Boolean(p.qr_code_url)),
    [filteredParticipants]
  )

  const stats = useMemo(() => {
    const total = participants.length
    const hadir = participants.filter(hasAttended).length
    const withQr = participants.filter((p) => Boolean(p.qr_code_url)).length
    return { total, hadir, belum: total - hadir, withQr }
  }, [participants])

  const statCards = [
    { label: 'Total Peserta', value: stats.total, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Sudah Hadir', value: stats.hadir, icon: UserCheck, color: 'text-green-600 bg-green-50' },
    { label: 'Belum Hadir', value: stats.belum, icon: UserX, color: 'text-orange-600 bg-orange-50' },
    { label: 'Memiliki QR', value: stats.withQr, icon: QrCode, color: 'text-blue-600 bg-blue-50' },
  ]

  // ---------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------
  const resetFilters = () => {
    setSearch('')
    setFilterDaerah('')
    setFilterDesa('')
    setFilterKelompok('')
    setFilterJenisKelamin('')
    setFilterAttendance('')
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      // Login admin memakai cookie (lihat middleware.ts), jadi logout
      // harus lewat API route, bukan supabase.auth.signOut().
      await fetch('/api/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      setNotice({ type: 'error', message: 'Gagal logout. Silakan coba lagi.' })
      setLoggingOut(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      const response = await fetch('/api/admin/participants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus peserta')

      setParticipants((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      if (selectedParticipant?.id === deleteTarget.id) setSelectedParticipant(null)
      setDeleteTarget(null)
      setNotice({ type: 'success', message: 'Data peserta berhasil dihapus.' })
    } catch (error) {
      console.error('Error deleting participant:', error)
      setNotice({ type: 'error', message: 'Gagal menghapus peserta. Silakan coba lagi.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleDownloadCard = async () => {
    if (!idCardRef.current || !selectedParticipant) return

    if (!selectedParticipant.qr_code_url) {
      setNotice({ type: 'error', message: 'QR Code peserta ini belum tersedia.' })
      return
    }

    setDownloadingCard(true)
    try {
      await downloadCardAsImage(
        idCardRef.current,
        `kartu-peserta-${selectedParticipant.participant_code}`
      )
    } catch (error) {
      console.error('Gagal mengunduh kartu:', error)
      setNotice({ type: 'error', message: 'Gagal mengunduh kartu peserta.' })
    } finally {
      setDownloadingCard(false)
    }
  }

  const handleExport = async (type: 'excel' | 'csv') => {
    setExporting(true)
    try {
      if (type === 'excel') {
        await exportToExcel(filteredParticipants, 'data-peserta')
      } else {
        await exportToCSV(filteredParticipants, 'data-peserta')
      }
    } catch (error) {
      console.error(`Export ${type} error:`, error)
      setNotice({
        type: 'error',
        message: `Gagal melakukan export ${type === 'excel' ? 'Excel' : 'CSV'}.`,
      })
    } finally {
      setExporting(false)
    }
  }

  // ---------------------------------------------------------------
  // Detail modal items
  // ---------------------------------------------------------------
  const detailItems = selectedParticipant
    ? [
      { icon: User, label: 'Jenis Kelamin', value: selectedParticipant.jenis_kelamin || '-' },
      { icon: Users2, label: 'Umur', value: `${selectedParticipant.umur ?? '-'} tahun` },
      { icon: MapPin, label: 'Daerah', value: selectedParticipant.daerah || '-' },
      { icon: MapPin, label: 'Desa', value: selectedParticipant.desa || '-' },
      { icon: Users2, label: 'Kelompok', value: selectedParticipant.kelompok || '-' },
      { icon: Users2, label: 'Dapukan', value: selectedParticipant.dapukan || '-' },
      { icon: Users2, label: 'Status', value: selectedParticipant.status || '-' },
      {
        icon: GraduationCap,
        label: 'Pendidikan',
        value: selectedParticipant.pendidikan_terakhir || '-',
      },
      { icon: Briefcase, label: 'Pekerjaan', value: selectedParticipant.pekerjaan || '-' },
      { icon: Heart, label: 'Hobi', value: selectedParticipant.hobi || '-' },
      {
        icon: Ruler,
        label: 'Tinggi / Berat',
        value: `${selectedParticipant.tinggi_badan ?? '-'} cm / ${selectedParticipant.berat_badan ?? '-'
          } kg`,
      },
      { icon: Users2, label: 'Jumlah Saudara', value: selectedParticipant.jumlah_saudara ?? '-' },
      { icon: User, label: 'Anak Ke', value: selectedParticipant.anak_ke ?? '-' },
    ]
    : []

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Page Header — selalu tampil supaya tombol scan & logout tetap bisa dipakai
            walaupun data sedang dimuat atau gagal dimuat */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {role === 'admin' ? 'Admin Dashboard' : 'Panitia Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{role === 'admin' ? 'Kelola data peserta, presensi & kartu ID' : 'Lihat data peserta, cari, filter, detail & scan'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<ScanLine className="h-4 w-4" />}
              onClick={() => router.push(role === 'admin' ? '/scan-card' : '/panitia/scan-card')}
            >
              Scan Peserta
            </Button>
            <Button
              variant="secondary"
              icon={<ClipboardCheck className="h-4 w-4" />}
              onClick={() => router.push(role === 'admin' ? '/scan-attendance' : '/panitia/scan-attendance')}
            >
              Scan Presensi
            </Button>
            {role === 'admin' && (
              <Button
                variant="secondary"
                icon={<Wrench className="h-4 w-4" />}
                onClick={() => router.push('/admin/form-builder')}
              >
                Form Builder
              </Button>
            )}
            <Button
              variant="secondary"
              icon={<LogOut className="h-4 w-4" />}
              loading={loggingOut}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <Card>
            <Spinner label="Memuat data peserta..." />
          </Card>
        )}

        {/* Error */}
        {!loading && loadError && (
          <Card>
            <EmptyState
              icon={<AlertTriangle className="h-10 w-10 text-red-500" />}
              title="Terjadi Kesalahan"
              description="Data peserta gagal dimuat. Silakan coba lagi."
              action={<Button onClick={fetchParticipants}>Coba Lagi</Button>}
            />
          </Card>
        )}

        {!loading && !loadError && (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <Card key={stat.label} className="flex items-center gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${stat.color}`}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Search & Filters */}
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    aria-label="Cari peserta"
                    placeholder="Cari nama, kode, desa, kelompok, pekerjaan..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 [&::-webkit-search-cancel-button]:appearance-none"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Hapus pencarian"
                      onClick={() => setSearch('')}
                      className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    icon={<SlidersHorizontal className="h-4 w-4" />}
                    aria-expanded={showFilters}
                    onClick={() => setShowFilters((v) => !v)}
                  >
                    Filter
                    {activeFilterCount > 0 && (
                      <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      variant="secondary"
                      icon={<FilterX className="h-4 w-4" />}
                      onClick={resetFilters}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-5">
                  <Select
                    id="filter-daerah"
                    label="Daerah"
                    value={filterDaerah}
                    onChange={(e) => setFilterDaerah(e.target.value)}
                  >
                    <option value="">Semua Daerah</option>
                    {daerahOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>

                  <Select
                    id="filter-desa"
                    label="Desa"
                    value={filterDesa}
                    onChange={(e) => setFilterDesa(e.target.value)}
                  >
                    <option value="">Semua Desa</option>
                    {desaOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>

                  <Select
                    id="filter-kelompok"
                    label="Kelompok"
                    value={filterKelompok}
                    onChange={(e) => setFilterKelompok(e.target.value)}
                  >
                    <option value="">Semua Kelompok</option>
                    {kelompokOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>

                  <Select
                    id="filter-jenis-kelamin"
                    label="Jenis Kelamin"
                    value={filterJenisKelamin}
                    onChange={(e) => setFilterJenisKelamin(e.target.value)}
                  >
                    <option value="">Semua Jenis Kelamin</option>
                    {JENIS_KELAMIN_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>

                  <Select
                    id="filter-kehadiran"
                    label="Kehadiran"
                    value={filterAttendance}
                    onChange={(e) => setFilterAttendance(e.target.value as AttendanceFilter)}
                  >
                    <option value="">Semua Kehadiran</option>
                    <option value="hadir">Sudah Hadir</option>
                    <option value="belum">Belum Hadir</option>
                  </Select>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Menampilkan <strong>{filteredParticipants.length}</strong> dari{' '}
                  <strong>{participants.length}</strong> peserta
                </p>

                {role === 'admin' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download className="h-4 w-4" />}
                      loading={exporting}
                      onClick={() => handleExport('excel')}
                    >
                      Export Excel
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download className="h-4 w-4" />}
                      disabled={exporting}
                      onClick={() => handleExport('csv')}
                    >
                      Export CSV
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Bulk Download Kartu ID — Admin only */}
            {role === 'admin' && <Card>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Kartu ID Peserta</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Download kartu ID untuk peserta yang sedang ditampilkan berdasarkan filter.
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {filteredParticipants.length} peserta ditampilkan · {participantsWithQr.length}{' '}
                    memiliki QR Code
                  </p>
                </div>

                {/* Penting: gunakan filteredParticipants, bukan participants */}
                <BulkIdCardDownload participants={filteredParticipants} />
              </div>
            </Card>}

            {/* Table / Empty States */}
            {participants.length === 0 ? (
              <Card>
                <EmptyState
                  title="Belum Ada Data"
                  description="Belum ada peserta yang terdaftar."
                />
              </Card>
            ) : filteredParticipants.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<FilterX className="h-10 w-10" />}
                  title="Tidak Ada Hasil"
                  description="Tidak ditemukan data yang sesuai dengan filter."
                  action={
                    <Button variant="secondary" onClick={resetFilters}>
                      Reset Filter
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
                  <h2 className="text-lg font-semibold text-gray-900">Daftar Peserta</h2>
                  <Button variant="secondary" size="sm" onClick={fetchParticipants}>
                    Refresh
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="p-3 font-semibold text-gray-700">Peserta</th>
                        <th className="p-3 font-semibold text-gray-700">Lokasi</th>
                        <th className="p-3 font-semibold text-gray-700">Kelompok</th>
                        <th className="p-3 font-semibold text-gray-700">Gender</th>
                        <th className="p-3 font-semibold text-gray-700">Kehadiran</th>
                        <th className="p-3 font-semibold text-gray-700">QR</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.map((p) => (
                        <tr
                          key={p.id}
                          className="border-t border-gray-200 transition-colors hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                                {p.foto_formal_url ? (
                                  <Image
                                    src={p.foto_formal_url}
                                    alt={`Foto ${p.nama_lengkap}`}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <User className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">{p.nama_lengkap}</p>
                                <p className="font-mono text-xs font-semibold text-purple-600">
                                  {p.participant_code}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <p className="text-gray-700">{p.daerah || '-'}</p>
                            <p className="text-xs text-gray-500">{p.desa || '-'}</p>
                          </td>

                          <td className="p-3">
                            <p className="text-gray-700">{p.kelompok || '-'}</p>
                            {p.dapukan && <p className="text-xs text-gray-500">{p.dapukan}</p>}
                          </td>

                          <td className="p-3">
                            <p className="text-gray-700">{p.jenis_kelamin || '-'}</p>
                            <p className="text-xs text-gray-500">{p.umur} tahun</p>
                          </td>

                          <td className="p-3">
                            {hasAttended(p) ? (
                              <Badge variant="success">Hadir</Badge>
                            ) : (
                              <Badge variant="warning">Belum Hadir</Badge>
                            )}
                          </td>

                          <td className="p-3">
                            {p.qr_code_url ? (
                              <Badge variant="success">Tersedia</Badge>
                            ) : (
                              <Badge variant="danger">Belum Ada</Badge>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedParticipant(p)}
                                aria-label={`Lihat detail ${p.nama_lengkap}`}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-purple-50 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {role === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(p)}
                                  aria-label={`Hapus ${p.nama_lengkap}`}
                                  className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        title="Detail Peserta"
      >
        {selectedParticipant && (
          <div className="space-y-5">
            {/* Header */}
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center">
              {/* Foto peserta */}
              <div className="relative h-60 w-48 overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-gray-200">
                {selectedParticipant.foto_formal_url ? (
                  <Image
                    src={selectedParticipant.foto_formal_url}
                    alt={`Foto formal ${selectedParticipant.nama_lengkap}`}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Nama */}
              <h3 className="mt-4 text-xl font-bold leading-tight text-gray-900">
                {selectedParticipant.nama_lengkap}
              </h3>

              {/* ID Peserta */}
              <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-purple-600">
                {selectedParticipant.participant_code}
              </p>

              {/* Attendance */}
              <div className="mt-3">
                {hasAttended(selectedParticipant) ? (
                  <Badge variant="success">
                    Sudah Hadir
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    Belum Hadir
                  </Badge>
                )}
              </div>
            </div>

            {/* Data */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

            {selectedParticipant.email && (
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Email</p>
                <p className="mt-1 break-all text-sm font-medium text-gray-900">
                  {selectedParticipant.email}
                </p>
              </div>
            )}

            {/* Jumlah scan presensi */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
              <p className="text-sm text-gray-600">Jumlah Scan Presensi</p>
              <Badge variant="info">{selectedParticipant.attendance_count || 0}x</Badge>
            </div>

            {/* QR status */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                  <QrCode className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">QR Code</p>
                  <p className="text-xs text-gray-500">
                    {selectedParticipant.qr_code_url
                      ? 'QR Code tersedia'
                      : 'QR Code belum tersedia'}
                  </p>
                </div>
              </div>
              {selectedParticipant.qr_code_url ? (
                <Badge variant="success">Tersedia</Badge>
              ) : (
                <Badge variant="danger">Belum Ada</Badge>
              )}
            </div>

            {/* ID Card preview */}
            {selectedParticipant.qr_code_url && (
              <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-sm font-medium text-gray-700">Preview Kartu ID</p>
                <IdCard
                  ref={idCardRef}
                  nama={selectedParticipant.nama_lengkap}
                  participantCode={selectedParticipant.participant_code}
                  qrCodeUrl={selectedParticipant.qr_code_url}
                  daerah={selectedParticipant.daerah}
                />
              </div>
            )}

            {/* Actions — Admin only. Panitia is read-only. */}
            {role === 'admin' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="primary"
                  className="flex-1"
                  icon={<Download className="h-4 w-4" />}
                  loading={downloadingCard}
                  disabled={!selectedParticipant.qr_code_url}
                  onClick={handleDownloadCard}
                >
                  Download Kartu ID
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setDeleteTarget(selectedParticipant)}
                >
                  Hapus
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation — Admin only */}
      {role === 'admin' && <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Data Peserta?"
        description={
          deleteTarget
            ? `Data "${deleteTarget.nama_lengkap}" akan dihapus permanen dan tidak dapat dikembalikan.`
            : ''
        }
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />}

      {/* Toast */}
      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          className="fixed inset-x-4 bottom-4 z-[60] sm:inset-x-auto sm:right-6 sm:w-96"
        >
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${notice.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
              }`}
          >
            {notice.type === 'error' ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <p className="flex-1 text-sm font-medium">{notice.message}</p>
            <button
              type="button"
              aria-label="Tutup notifikasi"
              onClick={() => setNotice(null)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}