'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Download,
  LogOut,
  Wrench,
  Eye,
  Trash2,
  User,
  Inbox,
  FilterX,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { exportToExcel, exportToCSV } from '@/lib/exportData'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type Participant = {
  id: string
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
  attendance_count?: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterDesa, setFilterDesa] = useState('')
  const [filterKelompok, setFilterKelompok] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'hadir' | 'belum'>('all')

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchParticipants()
  }, [])

  const fetchParticipants = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false })

      if (participantsError) throw participantsError

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('participant_id')

      if (attendanceError) throw attendanceError

      const attendanceCountMap: Record<string, number> = {}
      attendanceData?.forEach((a) => {
        attendanceCountMap[a.participant_id] = (attendanceCountMap[a.participant_id] || 0) + 1
      })

      const merged = (participantsData || []).map((p) => ({
        ...p,
        attendance_count: attendanceCountMap[p.id] || 0,
      }))

      setParticipants(merged)
    } catch (error) {
      console.error('Error fetching participants:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin-logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('participants').delete().eq('id', deleteTarget.id)
      if (error) throw error

      setParticipants((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      setSelectedParticipant(null)
    } catch (error) {
      console.error('Error deleting participant:', error)
    } finally {
      setDeleting(false)
    }
  }

  const resetFilters = () => {
    setSearchQuery('')
    setFilterDesa('')
    setFilterKelompok('')
    setFilterStatus('all')
  }

  const uniqueDesa = useMemo(
    () => Array.from(new Set(participants.map((p) => p.desa).filter(Boolean))),
    [participants]
  )
  const uniqueKelompok = useMemo(
    () => Array.from(new Set(participants.map((p) => p.kelompok).filter(Boolean))),
    [participants]
  )

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.pekerjaan?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchDesa = filterDesa === '' || p.desa === filterDesa
      const matchKelompok = filterKelompok === '' || p.kelompok === filterKelompok

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'hadir' && (p.attendance_count || 0) > 0) ||
        (filterStatus === 'belum' && (p.attendance_count || 0) === 0)

      return matchSearch && matchDesa && matchKelompok && matchStatus
    })
  }, [participants, searchQuery, filterDesa, filterKelompok, filterStatus])

  const stats = useMemo(() => {
    const total = participants.length
    const hadir = participants.filter((p) => (p.attendance_count || 0) > 0).length
    return { total, hadir, belum: total - hadir }
  }, [participants])

  const statCards = [
    { label: 'Total Peserta', value: stats.total, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Sudah Hadir', value: stats.hadir, icon: UserCheck, color: 'text-green-600 bg-green-50' },
    { label: 'Belum Hadir', value: stats.belum, icon: UserX, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">Kelola data peserta & presensi</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<Wrench className="h-4 w-4" />}
              onClick={() => router.push('/admin/form-builder')}
            >
              Form Builder
            </Button>
            <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
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
              icon={<Inbox className="h-10 w-10" />}
              title="Terjadi Kesalahan"
              description="Data peserta gagal dimuat. Silakan coba lagi."
              action={<Button onClick={fetchParticipants}>Coba Lagi</Button>}
            />
          </Card>
        )}

        {!loading && !loadError && (
          <>
            {/* Statistics */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {statCards.map((stat) => (
                <Card key={stat.label} className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-1">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      placeholder="Cari nama / pekerjaan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <Select value={filterDesa} onChange={(e) => setFilterDesa(e.target.value)}>
                  <option value="">Semua Desa</option>
                  {uniqueDesa.map((desa) => (
                    <option key={desa} value={desa}>
                      {desa}
                    </option>
                  ))}
                </Select>

                <Select value={filterKelompok} onChange={(e) => setFilterKelompok(e.target.value)}>
                  <option value="">Semua Kelompok</option>
                  {uniqueKelompok.map((kelompok) => (
                    <option key={kelompok} value={kelompok}>
                      {kelompok}
                    </option>
                  ))}
                </Select>

                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'hadir' | 'belum')}
                >
                  <option value="all">Semua Status</option>
                  <option value="hadir">Sudah Hadir</option>
                  <option value="belum">Belum Hadir</option>
                </Select>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Menampilkan <strong>{filteredParticipants.length}</strong> dari{' '}
                  <strong>{participants.length}</strong> peserta
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download className="h-4 w-4" />}
                    onClick={() => exportToExcel(filteredParticipants, 'data-peserta')}
                  >
                    Export Excel
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download className="h-4 w-4" />}
                    onClick={() => exportToCSV(filteredParticipants, 'data-peserta')}
                  >
                    Export CSV
                  </Button>
                </div>
              </div>
            </Card>

            {/* Table / Empty States */}
            {participants.length === 0 ? (
              <Card>
                <EmptyState title="Belum Ada Data" description="Belum ada peserta yang terdaftar." />
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
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left font-semibold text-gray-700">Foto</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Nama</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Umur</th>
                      <th className="p-3 text-left font-semibold text-gray-700">JK</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Desa</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Kelompok</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Presensi</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Tanggal</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((p) => (
                      <tr key={p.id} className="border-t border-gray-200 transition-colors hover:bg-gray-50">
                        <td className="p-3">
                          {p.foto_formal_url ? (
                            <div className="relative h-11 w-9 overflow-hidden rounded-lg bg-gray-100">
                              <Image
                                src={p.foto_formal_url}
                                alt={`Foto ${p.nama_lengkap}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-11 w-9 items-center justify-center rounded-lg bg-gray-100">
                              <User className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-gray-900">{p.nama_lengkap}</td>
                        <td className="p-3 text-gray-600">{p.umur}</td>
                        <td className="p-3 text-gray-600">{p.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                        <td className="p-3 text-gray-600">{p.desa || '-'}</td>
                        <td className="p-3 text-gray-600">{p.kelompok || '-'}</td>
                        <td className="p-3">
                          {(p.attendance_count || 0) > 0 ? (
                            <Badge variant="success">Hadir</Badge>
                          ) : (
                            <Badge variant="warning">Belum Hadir</Badge>
                          )}
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {new Date(p.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedParticipant(p)}
                              aria-label={`Lihat detail ${p.nama_lengkap}`}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-purple-50 hover:text-purple-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              aria-label={`Hapus ${p.nama_lengkap}`}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        title="Detail Peserta"
      >
        {selectedParticipant && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex justify-center sm:col-span-1">
              {selectedParticipant.foto_formal_url ? (
                <div className="relative aspect-[4/5] w-28 overflow-hidden rounded-xl bg-gray-100 sm:w-full">
                  <Image
                    src={selectedParticipant.foto_formal_url}
                    alt={`Foto formal ${selectedParticipant.nama_lengkap}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/5] w-28 items-center justify-center rounded-xl bg-gray-100 sm:w-full">
                  <User className="h-8 w-8 text-gray-300" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm sm:col-span-2">
              <p><span className="text-gray-500">Nama:</span> <span className="font-medium text-gray-900">{selectedParticipant.nama_lengkap}</span></p>
              <p><span className="text-gray-500">Umur:</span> {selectedParticipant.umur} tahun</p>
              <p><span className="text-gray-500">Jenis Kelamin:</span> {selectedParticipant.jenis_kelamin}</p>
              <p><span className="text-gray-500">Daerah:</span> {selectedParticipant.daerah || '-'}</p>
              <p><span className="text-gray-500">Desa:</span> {selectedParticipant.desa || '-'}</p>
              <p><span className="text-gray-500">Kelompok:</span> {selectedParticipant.kelompok || '-'}</p>
              <p><span className="text-gray-500">Dapukan:</span> {selectedParticipant.dapukan || '-'}</p>
              <p><span className="text-gray-500">TB/BB:</span> {selectedParticipant.tinggi_badan || '-'} cm / {selectedParticipant.berat_badan || '-'} kg</p>
              <p><span className="text-gray-500">Jumlah Saudara:</span> {selectedParticipant.jumlah_saudara || '-'}</p>
              <p><span className="text-gray-500">Anak ke:</span> {selectedParticipant.anak_ke || '-'}</p>
              <p><span className="text-gray-500">Pendidikan:</span> {selectedParticipant.pendidikan_terakhir || '-'}</p>
              <p><span className="text-gray-500">Pekerjaan:</span> {selectedParticipant.pekerjaan || '-'}</p>
              <p><span className="text-gray-500">Status:</span> {selectedParticipant.status || '-'}</p>
              <p><span className="text-gray-500">Hobi:</span> {selectedParticipant.hobi || '-'}</p>
              <p className="pt-2">
                <span className="text-gray-500">Jumlah Scan Presensi:</span>{' '}
                <Badge variant="info">{selectedParticipant.attendance_count || 0}x</Badge>
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Data Peserta?"
        description={`Data "${deleteTarget?.nama_lengkap}" akan dihapus permanen dan tidak dapat dikembalikan.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}