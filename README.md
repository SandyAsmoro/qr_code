# qr_code
Project generate QR Code berdasarkan data yang diisikan melalui form custom

Bisa. Untuk tampilan yang Anda inginkan, saya sarankan foto dibuat **lebih besar tetapi tetap proporsional**, terutama karena foto peserta berbentuk portrait.

Ada dua bagian yang perlu diubah:

1. **Foto pada View Detail Peserta** di Dashboard Admin & Panitia.
2. **Foto pada hasil Scan Peserta** untuk Admin & Panitia.

Saya sarankan menggunakan rasio **4:5**, misalnya **192 × 240 px**.

---

# 1. Foto pada View Detail Dashboard

Di:

```text
app/admin/dashboard-component.tsx
```

Cari bagian foto yang sebelumnya seperti:

```tsx
<div className="relative h-40 w-28 overflow-hidden rounded-2xl ...">
```

atau versi yang kita buat sebelumnya:

```tsx
<div className="relative h-40 w-28 overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-gray-200 sm:h-48 sm:w-32">
```

### Ubah menjadi:

```tsx
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
```

Ukuran:

```text
width  = 192px
height = 240px
```

Jadi kira-kira:

```text
┌────────────────────┐
│                    │
│                    │
│       FOTO         │
│                    │
│                    │
│                    │
│                    │
└────────────────────┘
       192 × 240
```

Ini jauh lebih besar daripada sebelumnya.

---

# 2. Foto pada Scan Peserta

Di:

```text
app/components/QRScanner.tsx
```

Cari:

```tsx
<div className="relative h-44 w-32 overflow-hidden rounded-2xl ...">
```

Ubah menjadi:

```tsx
<div className="relative h-60 w-48 overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-gray-200">
  {scannedData.foto_formal_url ? (
    <Image
      src={scannedData.foto_formal_url}
      alt={`Foto formal ${scannedData.nama_lengkap}`}
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
```

Dengan begitu **View Detail** dan **Scan Peserta** mempunyai ukuran foto yang sama.

---

# 3. Cara Anda mengatur ukuran sendiri

Ini bagian yang paling penting.

Tailwind menggunakan:

```text
w-...
h-...
```

untuk mengatur **width** dan **height**.

Contohnya:

```tsx
className="relative h-60 w-48 ..."
```

berarti:

```text
h-60 = tinggi 240px
w-48 = lebar 192px
```

Karena Tailwind menggunakan kelipatan skala tertentu.

### Beberapa ukuran yang bisa Anda coba

| Class       |        Ukuran |
| ----------- | ------------: |
| `w-28 h-40` |     112 × 160 |
| `w-32 h-44` |     128 × 176 |
| `w-40 h-52` |     160 × 208 |
| `w-48 h-60` | **192 × 240** |
| `w-52 h-64` |     208 × 256 |
| `w-56 h-72` |     224 × 288 |
| `w-64 h-80` |     256 × 320 |

Untuk foto portrait, saya menyarankan:

### Sedang

```tsx
h-52 w-40
```

### Besar

```tsx
h-60 w-48
```

### Sangat besar

```tsx
h-72 w-56
```

### Ekstra besar

```tsx
h-80 w-64
```

---

# 4. Kalau ingin ukuran bebas dalam pixel

Anda juga **tidak harus menggunakan ukuran Tailwind bawaan**.

Misalnya ingin tepat:

**220 × 275 px**

gunakan:

```tsx
<div className="relative h-[275px] w-[220px] ...">
```

Atau:

**250 × 312 px**

```tsx
<div className="relative h-[312px] w-[250px] ...">
```

Atau misalnya:

**300 × 375 px**

```tsx
<div className="relative h-[375px] w-[300px] ...">
```

Format ini sangat berguna kalau Anda ingin mengatur ukuran secara presisi.

---

# 5. Jangan lupa `object-cover`

Bagian ini:

```tsx
className="object-cover"
```

menentukan bagaimana foto memenuhi kotak.

### `object-cover`

```tsx
className="object-cover"
```

Foto akan memenuhi seluruh area:

```text
┌──────────────┐
│   ┌──────┐   │
│   │ FOTO │   │
│   │      │   │
│   │      │   │
│   └──────┘   │
└──────────────┘
```

Tetapi sebagian foto bisa terpotong jika rasio foto asli berbeda.

---

### Kalau tidak ingin foto terpotong

Gunakan:

```tsx
className="object-contain"
```

Hasilnya seluruh foto akan terlihat, tetapi mungkin ada ruang kosong:

```text
┌──────────────┐
│              │
│   ┌──────┐   │
│   │ FOTO │   │
│   │      │   │
│   └──────┘   │
│              │
└──────────────┘
```

Untuk foto formal peserta, saya tetap menyarankan:

```tsx
object-cover
```

karena tampilannya lebih rapi.

---

# 6. Kalau ingin foto semakin besar secara responsif

Untuk **desktop** bisa dibuat lebih besar, sedangkan di HP sedikit lebih kecil:

```tsx
<div className="
  relative
  h-52 w-40
  sm:h-60 sm:w-48
  lg:h-72 lg:w-56
  overflow-hidden
  rounded-2xl
  bg-gray-100
  shadow-sm
  ring-1
  ring-gray-200
">
```

Artinya:

```text
HP kecil
↓
160 × 208

Tablet
↓
192 × 240

Desktop
↓
224 × 288
```

Ini menurut saya lebih bagus untuk modal **Detail Peserta**, karena kalau foto terlalu besar di HP, informasi detail di bawahnya akan terdorong terlalu jauh.

---

# 7. Ukuran nama dan ID juga bisa Anda atur

Karena sekarang foto diperbesar, saya juga menyarankan nama sedikit diperbesar.

### Nama

Dari:

```tsx
text-xl
```

menjadi:

```tsx
text-2xl
```

Contoh:

```tsx
<h3 className="mt-4 text-2xl font-bold leading-tight text-gray-900">
  {selectedParticipant.nama_lengkap}
</h3>
```

Untuk scan:

```tsx
<h2 className="mt-4 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
  {scannedData.nama_lengkap}
</h2>
```

### ID

```tsx
<p className="mt-1 font-mono text-base font-semibold tracking-wide text-purple-600">
  {selectedParticipant.participant_code}
</p>
```

---

## Rekomendasi saya untuk desain final

Untuk **View Detail Dashboard**:

```tsx
<div className="
  relative
  h-60 w-48
  overflow-hidden
  rounded-2xl
  bg-gray-100
  shadow-sm
  ring-1
  ring-gray-200
">
```

Untuk **Scan Peserta**:

```tsx
<div className="
  relative
  h-60 w-48
  overflow-hidden
  rounded-2xl
  bg-gray-100
  shadow-sm
  ring-1
  ring-gray-200
">
```

Dengan:

```tsx
className="object-cover"
```

Sehingga keduanya konsisten:

**Foto → Nama → ID → Attendance → Informasi peserta**

dan seluruh bagian identitas utama tetap **centered** seperti yang Anda minta.
