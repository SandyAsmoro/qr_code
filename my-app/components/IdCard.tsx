'use client'

/* eslint-disable @next/next/no-img-element --
   Sengaja memakai <img> biasa (bukan next/image): kartu ini di-render ke PNG
   oleh html2canvas, termasuk saat berada di luar layar pada bulk download.
   next/image me-lazy-load gambar yang tidak terlihat sehingga load-nya tidak
   pernah selesai dan hasil download bisa kosong. */

import { forwardRef } from 'react'
import { resolveRegionTheme } from '@/lib/idCardTheme'

interface IdCardProps {
  nama: string
  participantCode: string
  qrCodeUrl: string
  daerah?: string | null
}

/**
 * Design token ID Card.
 * Ubah tampilan dari sini saja; layout sama untuk semua daerah.
 *
 * Posisi vertikal (persen dari tinggi kartu, 82 : 105):
 *   ~22%  awal blok nama (di bawah ornamen atas)
 *   ~38%  awal QR Code
 *   ~79%  akhir QR Code
 *   ~87%  akhir ID peserta
 */
const ID_CARD_DESIGN = {
  // Warna dan font inline (bukan class Tailwind) supaya hasil export PNG
  // tidak bergantung pada fungsi warna CSS modern (oklab/color-mix).
  textColor: '#111827',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  radius: 16,
  outline: '0 0 0 1px rgba(0, 0, 0, 0.1)',

  layout: {
    topOffset: '22%', // ruang kosong di atas nama (ornamen atas)
    nameHeight: '16%', // tinggi tetap → posisi QR tidak bergeser
    nameSafeX: '6%', // safe area kiri/kanan
    nameWidth: '90%',
    qrGap: '2.5%',
    idGap: '3.5%',
  },

  name: {
    fontWeight: 800,
    lineHeight: 1.1,
    // Nama panjang dikecilkan bertahap agar tetap max. 2–3 baris, bukan 1 baris.
    sizes: [
      { maxLength: 26, fontSize: 28 },
      { maxLength: 34, fontSize: 24 },
      { maxLength: Infinity, fontSize: 20 },
    ],
  },

  participantId: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '0.08em',
  },

  qr: {
    width: '50%', // persegi, dan proporsional terhadap lebar kartu
    padding: '2.4%', // ≈ 8px pada lebar 328px → quiet zone
    radius: 8,
    shadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
} as const

const getNameFontSize = (nama: string): number => {
  const length = nama.trim().length
  const tier = ID_CARD_DESIGN.name.sizes.find((size) => length <= size.maxLength)

  return tier ? tier.fontSize : ID_CARD_DESIGN.name.sizes[0].fontSize
}

const IdCard = forwardRef<HTMLDivElement, IdCardProps>(
  ({ nama, participantCode, qrCodeUrl, daerah }, ref) => {
    const theme = resolveRegionTheme(daerah)
    const { layout, name, participantId, qr } = ID_CARD_DESIGN

    return (
      <div
        ref={ref}
        data-id-card="true"
        // Ukuran cetak: 8,2 × 10,5 cm (tinggi otomatis dari aspect ratio 82/105)
        className="relative mx-auto aspect-[82/105] w-full max-w-[328px] overflow-hidden bg-white print:w-[8.2cm] print:max-w-[8.2cm]"
        style={{
          borderRadius: ID_CARD_DESIGN.radius,
          boxShadow: ID_CARD_DESIGN.outline,
          fontFamily: ID_CARD_DESIGN.fontFamily,
          color: ID_CARD_DESIGN.textColor,
        }}
      >
        {/* Layer 1: Background (aset gambar, dekoratif) */}
        <img
          src={theme.background}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="eager"
          decoding="sync"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Layer 2: Konten */}
        <div className="relative z-10 flex h-full w-full flex-col items-center">
          <div className="shrink-0" style={{ height: layout.topOffset }} aria-hidden="true" />

          {/* Nama Lengkap */}
          <div
            className="flex shrink-0 items-center justify-center"
            style={{
              height: layout.nameHeight,
              width: '100%',
              paddingLeft: layout.nameSafeX,
              paddingRight: layout.nameSafeX,
            }}
          >
            <p
              className="text-balance text-center uppercase"
              style={{
                width: layout.nameWidth,
                margin: 0,
                fontSize: getNameFontSize(nama),
                fontWeight: name.fontWeight,
                lineHeight: name.lineHeight,
                overflowWrap: 'anywhere',
              }}
            >
              {nama}
            </p>
          </div>

          {/* QR Code */}
          <div
            className="flex shrink-0 items-center justify-center bg-white"
            style={{
              width: qr.width,
              aspectRatio: '1 / 1',
              marginTop: layout.qrGap,
              padding: qr.padding,
              borderRadius: qr.radius,
              boxShadow: qr.shadow,
            }}
          >
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR Code peserta ${nama}`}
                crossOrigin="anonymous"
                draggable={false}
                className="block h-full w-full object-contain"
              />
            ) : (
              <span className="text-center text-xs" style={{ color: '#6b7280' }}>
                QR tidak tersedia
              </span>
            )}
          </div>

          {/* ID Peserta */}
          <p
            className="shrink-0 text-center"
            style={{
              margin: 0,
              marginTop: layout.idGap,
              fontSize: participantId.fontSize,
              fontWeight: participantId.fontWeight,
              letterSpacing: participantId.letterSpacing,
              lineHeight: 1.1,
            }}
          >
            {participantCode}
          </p>
        </div>
      </div>
    )
  }
)

IdCard.displayName = 'IdCard'

export default IdCard