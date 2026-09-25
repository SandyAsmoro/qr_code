'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { exportToExcel, exportToCSV } from '@/lib/exportData'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDesa, setFilterDesa] = useState('')
  const [filterKelompok, setFilterKelompok] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'hadir' | 'belum'>('all')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  useEffect(() => {
    fetchParticipants()
  }, [])

  const fetchParticipants = async () => {
    setLoading(true)
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
      alert('Gagal memuat data peserta')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin-logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Yakin ingin menghapus data "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
      return
    }

    try {
      const { error } = await supabase.from('participants').delete().eq('id', id)
      if (error) throw error

      setParticipants((prev) => prev.filter((p) => p.id !== id))
      setSelectedParticipant(null)
    } catch (error) {
      console.error('Error deleting participant:', error)
      alert('Gagal menghapus data')
    }
  }

  // Unique values untuk filter dropdown
  const uniqueDesa = useMemo(
    () => Array.from(new Set(participants.map((p) => p.desa).filter(Boolean))),
    [participants]
  )
  const uniqueKelompok = useMemo(
    () => Array.from(new Set(participants.map((p) => p.kelompok).filter(Boolean))),
    [participants]
  )

  // Filtered data
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
    const lakiLaki = participants.filter((p) => p.jenis_kelamin === 'Laki-laki').length
    const perempuan = participants.filter((p) => p.jenis_kelamin === 'Perempuan').length

    return { total, hadir, belum: total - hadir, lakiLaki, perempuan }
  }, [participants])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold">⏳ Memuat data peserta...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📊 Admin Dashboard</h1>
          <p className="text-gray-600">Kelola data peserta & presensi</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          🚪 Logout
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-gray-500 text-xs uppercase">Total Peserta</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-gray-500 text-xs uppercase">Sudah Hadir</p>
          <p className="text-2xl font-bold text-green-600">{stats.hadir}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <p className="text-gray-500 text-xs uppercase">Belum Hadir</p>
          <p className="text-2xl font-bold text-orange-600">{stats.belum}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
          <p className="text-gray-500 text-xs uppercase">Laki-laki</p>
          <p className="text-2xl font-bold">{stats.lakiLaki}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-pink-500">
          <p className="text-gray-500 text-xs uppercase">Perempuan</p>
          <p className="text-2xl font-bold">{stats.perempuan}</p>
        </div>
      </div>

      {/* Filters & Export */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
          <input
            type="text"
            placeholder="🔍 Cari nama / pekerjaan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg md:col-span-2"
          />

          <select
            value={filterDesa}
            onChange={(e) => setFilterDesa(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Semua Desa</option>
            {uniqueDesa.map((desa) => (
              <option key={desa} value={desa}>
                {desa}
              </option>
            ))}
          </select>

          <select
            value={filterKelompok}
            onChange={(e) => setFilterKelompok(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Semua Kelompok</option>
            {uniqueKelompok.map((kelompok) => (
              <option key={kelompok} value={kelompok}>
                {kelompok}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Semua Status</option>
            <option value="hadir">Sudah Hadir</option>
            <option value="belum">Belum Hadir</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <p className="text-sm text-gray-600">
            Menampilkan <strong>{filteredParticipants.length}</strong> dari{' '}
            <strong>{participants.length}</strong> peserta
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => exportToExcel(filteredParticipants, 'data-peserta')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              📥 Export Excel
            </button>
            <button
              onClick={() => exportToCSV(filteredParticipants, 'data-peserta')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Foto</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Umur</th>
              <th className="p-3">JK</th>
              <th className="p-3">Desa</th>
              <th className="p-3">Kelompok</th>
              <th className="p-3">Status Presensi</th>
              <th className="p-3">Tanggal Daftar</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  Tidak ada data yang cocok
                </td>
              </tr>
            ) : (
              filteredParticipants.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    {p.foto_formal_url ? (
                      <div className="relative w-10 h-12">
                        <Image
                          src={p.foto_formal_url}
                          alt={p.nama_lengkap}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-12 bg-gray-200 rounded flex items-center justify-center text-xs">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-semibold">{p.nama_lengkap}</td>
                  <td className="p-3">{p.umur}</td>
                  <td className="p-3">{p.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                  <td className="p-3">{p.desa || '-'}</td>
                  <td className="p-3">{p.kelompok || '-'}</td>
                  <td className="p-3">
                    {(p.attendance_count || 0) > 0 ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                        ✓ Hadir
                      </span>
                    ) : (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                        Belum Hadir
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedParticipant(p)}
                        className="text-blue-600 hover:underline text-xs font-semibold"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.nama_lengkap)}
                        className="text-red-600 hover:underline text-xs font-semibold"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedParticipant && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedParticipant(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detail Peserta</h2>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="text-gray-500 hover:text-gray-800 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex justify-center">
                {selectedParticipant.foto_formal_url && (
                  <div className="relative w-32 h-40">
                    <Image
                      src={selectedParticipant.foto_formal_url}
                      alt={selectedParticipant.nama_lengkap}
                      fill
                      className="object-cover rounded-lg border-2 border-gray-300"
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-2 text-sm">
                <p>
                  <strong>Nama:</strong> {selectedParticipant.nama_lengkap}
                </p>
                <p>
                  <strong>Umur:</strong> {selectedParticipant.umur} tahun
                </p>
                <p>
                  <strong>Jenis Kelamin:</strong> {selectedParticipant.jenis_kelamin}
                </p>
                <p>
                  <strong>Daerah:</strong> {selectedParticipant.daerah || '-'}
                </p>
                <p>
                  <strong>Desa:</strong> {selectedParticipant.desa || '-'}
                </p>
                <p>
                  <strong>Kelompok:</strong> {selectedParticipant.kelompok || '-'}
                </p>
                <p>
                  <strong>Dapukan:</strong> {selectedParticipant.dapukan || '-'}
                </p>
                <p>
                  <strong>TB/BB:</strong> {selectedParticipant.tinggi_badan || '-'} cm /{' '}
                  {selectedParticipant.berat_badan || '-'} kg
                </p>
                <p>
                  <strong>Jumlah Saudara:</strong> {selectedParticipant.jumlah_saudara || '-'}
                </p>
                <p>
                  <strong>Anak ke:</strong> {selectedParticipant.anak_ke || '-'}
                </p>
                <p>
                  <strong>Pendidikan:</strong> {selectedParticipant.pendidikan_terakhir || '-'}
                </p>
                <p>
                  <strong>Pekerjaan:</strong> {selectedParticipant.pekerjaan || '-'}
                </p>
                <p>
                  <strong>Status:</strong> {selectedParticipant.status || '-'}
                </p>
                <p>
                  <strong>Hobi:</strong> {selectedParticipant.hobi || '-'}
                </p>
                <p>
                  <strong>Jumlah Scan Presensi:</strong>{' '}
                  {selectedParticipant.attendance_count || 0}x
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}