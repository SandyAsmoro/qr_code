'use client'

/* eslint-disable @next/next/no-img-element --
   Sengaja memakai <img> biasa (bukan next/image), alasannya sama dengan IdCard:
   kartu ini di-render ke PNG oleh html2canvas, termasuk saat berada di luar
   layar pada bulk download, dan next/image me-lazy-load gambar tak terlihat. */

import { forwardRef, useState } from 'react'
import { User } from 'lucide-react'
import { resolveRegionTheme } from '@/lib/idCardTheme'

export type DataCardParticipant = {
  participant_code: string
  nama_lengkap: string
  umur?: number | null
  jenis_kelamin?: string | null
  daerah?: string | null
  desa?: string | null
  kelompok?: string | null
  dapukan?: string | null
  status?: string | null
  pendidikan_terakhir?: string | null
  pekerjaan?: string | null
  hobi?: string | null
  tinggi_badan?: number | null
  berat_badan?: number | null
  jumlah_saudara?: number | null
  anak_ke?: number | null
  foto_formal_url?: string | null
}

interface ParticipantDataCardProps {
  participant: DataCardParticipant
}

/** Lebar tetap (px) supaya hasil PNG sama di semua perangkat. */
export const DATA_CARD_WIDTH = 360

// Warna dan font inline (bukan class Tailwind) supaya export PNG tidak
// bergantung pada fungsi warna CSS modern (oklab/color-mix), seperti IdCard.
const DESIGN = {
  textColor: '#111827',
  mutedColor: '#6b7280',
  lineColor: '#e5e7eb',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  radius: 16,
  photo: { width: 112, height: 150, radius: 12 },
  nameSizes: [
    { maxLength: 24, fontSize: 20 },
    { maxLength: 32, fontSize: 17 },
    { maxLength: Infinity, fontSize: 15 },
  ],
} as const

const getNameFontSize = (nama: string): number => {
  const length = nama.trim().length
  const tier = DESIGN.nameSizes.find((size) => length <= size.maxLength)
  return tier ? tier.fontSize : DESIGN.nameSizes[0].fontSize
}

const text = (value?: string | number | null): string => {
  if (value === null || value === undefined) return '-'
  const trimmed = String(value).trim()
  return trimmed === '' ? '-' : trimmed
}

// Gabungkan dua nilai (mis. tinggi / berat); kalau keduanya kosong cukup "-".
const pair = (
  a: string | number | null | undefined,
  unitA: string,
  b: string | number | null | undefined,
  unitB: string
): string => {
  const left = text(a)
  const right = text(b)
  if (left === '-' && right === '-') return '-'
  return `${left}${left === '-' ? '' : unitA} / ${right}${right === '-' ? '' : unitB}`
}

const ParticipantDataCard = forwardRef<HTMLDivElement, ParticipantDataCardProps>(
  ({ participant: p }, ref) => {
    const theme = resolveRegionTheme(p.daerah)
    const [photoFailed, setPhotoFailed] = useState(false)
    const showPhoto = Boolean(p.foto_formal_url) && !photoFailed

    const identityLine = [
      p.jenis_kelamin?.trim(),
      p.umur !== null && p.umur !== undefined ? `${p.umur} tahun` : '',
    ]
      .filter(Boolean)
      .join(' · ')

    const details: { label: string; value: string }[] = [
      { label: 'Desa', value: text(p.desa) },
      { label: 'Kelompok', value: text(p.kelompok) },
      { label: 'Dapukan', value: text(p.dapukan) },
      { label: 'Status', value: text(p.status) },
      { label: 'Pendidikan', value: text(p.pendidikan_terakhir) },
      { label: 'Pekerjaan', value: text(p.pekerjaan) },
      {
        label: 'Tinggi / Berat',
        value: pair(p.tinggi_badan, ' cm', p.berat_badan, ' kg'),
      },
      {
        label: 'Anak ke / Saudara',
        value: pair(p.anak_ke, '', p.jumlah_saudara, ''),
      },
      { label: 'Hobi', value: text(p.hobi) },
    ]

    return (
      <div
        ref={ref}
        data-data-card="true"
        className="relative mx-auto overflow-hidden bg-white"
        style={{
          width: DATA_CARD_WIDTH,
          borderRadius: DESIGN.radius,
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
          fontFamily: DESIGN.fontFamily,
          color: DESIGN.textColor,
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: theme.accent,
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>
            DATA PESERTA
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.08em' }}>
            {p.participant_code}
          </span>
        </div>

        {/* Foto + identitas */}
        <div style={{ display: 'flex', gap: 14, padding: '16px 16px 12px' }}>
          <div
            style={{
              width: DESIGN.photo.width,
              height: DESIGN.photo.height,
              flexShrink: 0,
              overflow: 'hidden',
              borderRadius: DESIGN.photo.radius,
              backgroundColor: '#f3f4f6',
              boxShadow: `0 0 0 1px ${DESIGN.lineColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPhoto ? (
              <img
                src={p.foto_formal_url as string}
                alt={`Foto ${p.nama_lengkap}`}
                crossOrigin="anonymous"
                draggable={false}
                loading="eager"
                onError={() => setPhotoFailed(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                }}
              />
            ) : (
              <User size={48} color="#9ca3af" aria-label="Foto tidak tersedia" />
            )}
          </div>

          <div
            style={{
              minWidth: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: getNameFontSize(p.nama_lengkap),
                fontWeight: 800,
                lineHeight: 1.15,
                textTransform: 'uppercase',
                overflowWrap: 'anywhere',
              }}
            >
              {p.nama_lengkap}
            </p>

            {identityLine && (
              <p style={{ margin: 0, fontSize: 12, color: DESIGN.mutedColor }}>
                {identityLine}
              </p>
            )}

            {p.daerah?.trim() && (
              <span
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: theme.accentSoft,
                  color: theme.accent,
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 999,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {p.daerah.trim()}
              </span>
            )}
          </div>
        </div>

        {/* Detail */}
        <div
          style={{
            margin: '0 16px',
            borderTop: `1px solid ${DESIGN.lineColor}`,
            padding: '12px 0 16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px 14px',
          }}
        >
          {details.map((item) => (
            <div key={item.label} style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: theme.accent,
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  overflowWrap: 'anywhere',
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Garis aksen bawah */}
        <div style={{ height: 6, backgroundColor: theme.accent }} />
      </div>
    )
  }
)

ParticipantDataCard.displayName = 'ParticipantDataCard'

export default ParticipantDataCard
