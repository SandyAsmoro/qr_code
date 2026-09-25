import * as XLSX from 'xlsx'

export const exportToExcel = (data: any[], fileName: string = 'data-peserta') => {
  const formattedData = data.map((item, index) => ({
    No: index + 1,
    'Nama Lengkap': item.nama_lengkap,
    Umur: item.umur,
    'Jenis Kelamin': item.jenis_kelamin,
    Daerah: item.daerah || '-',
    Desa: item.desa || '-',
    Kelompok: item.kelompok || '-',
    Dapukan: item.dapukan || '-',
    'Tinggi Badan (cm)': item.tinggi_badan || '-',
    'Berat Badan (kg)': item.berat_badan || '-',
    'Jumlah Saudara': item.jumlah_saudara || '-',
    'Anak ke': item.anak_ke || '-',
    Hobi: item.hobi || '-',
    Status: item.status || '-',
    'Pendidikan Terakhir': item.pendidikan_terakhir || '-',
    Pekerjaan: item.pekerjaan || '-',
    'Tanggal Daftar': new Date(item.created_at).toLocaleString('id-ID'),
    'Status Presensi': item.attendance_count > 0 ? 'Hadir' : 'Belum Hadir',
  }))

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Peserta')

  // Auto-width kolom
  const colWidths = Object.keys(formattedData[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }))
  worksheet['!cols'] = colWidths

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `${fileName}-${timestamp}.xlsx`)
}

export const exportToCSV = (data: any[], fileName: string = 'data-peserta') => {
  const formattedData = data.map((item, index) => ({
    No: index + 1,
    'Nama Lengkap': item.nama_lengkap,
    Umur: item.umur,
    'Jenis Kelamin': item.jenis_kelamin,
    Daerah: item.daerah || '-',
    Desa: item.desa || '-',
    Kelompok: item.kelompok || '-',
    Status: item.status || '-',
    'Pendidikan Terakhir': item.pendidikan_terakhir || '-',
    Pekerjaan: item.pekerjaan || '-',
    'Tanggal Daftar': new Date(item.created_at).toLocaleString('id-ID'),
    'Status Presensi': item.attendance_count > 0 ? 'Hadir' : 'Belum Hadir',
  }))

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const csv = XLSX.utils.sheet_to_csv(worksheet)

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().split('T')[0]

  link.href = URL.createObjectURL(blob)
  link.download = `${fileName}-${timestamp}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}