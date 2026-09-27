'use client'

import { forwardRef } from 'react'

interface IdCardProps {
  nama: string
  participantCode: string
  qrCodeUrl: string
  daerah?: string
  eventLabel?: string
}

type CardTheme = {
  dark: string
  light: string
  pillBg: string
  text: string
}

/**
 * Palet warna kartu per daerah:
 * - Kediri Barat -> Merah
 * - Kediri Kota -> Biru
 * - Kediri Selatan 1 -> Hijau
 * Daerah lain / tidak dikenali jatuh ke tema biru (default).
 */
const DAERAH_THEMES: Record<string, CardTheme> = {
  'Kediri Barat': {
    dark: '#8a1c1c',
    light: '#ef5350',
    pillBg: '#fbe4e4',
    text: '#8a1c1c',
  },
  'Kediri Kota': {
    dark: '#0c3a86',
    light: '#3fa9f5',
    pillBg: '#e3f1fd',
    text: '#0c3a86',
  },
  'Kediri Selatan 1': {
    dark: '#146c2e',
    light: '#4ade80',
    pillBg: '#e2f6e9',
    text: '#146c2e',
  },
}

const DEFAULT_THEME: CardTheme = DAERAH_THEMES['Kediri Kota']

const getTheme = (daerah?: string): CardTheme =>
  (daerah && DAERAH_THEMES[daerah]) || DEFAULT_THEME

/**
 * Kartu ID peserta bergaya lanyard badge (nama, QR code, ID peserta)
 * Desain mengikuti referensi: header bergelombang dengan slot lanyard,
 * body putih berisi nama + QR + ID peserta, footer bergelombang.
 * Warna kartu menyesuaikan daerah peserta.
 */
const IdCard = forwardRef<HTMLDivElement, IdCardProps>(
  ({ nama, participantCode, qrCodeUrl, daerah, eventLabel = 'ID PESERTA' }, ref) => {
    const theme = getTheme(daerah)

    return (
      <div
        ref={ref}
        className="relative mx-auto aspect-[82/105] w-full max-w-[320px] overflow-hidden rounded-[26px] bg-white shadow-xl ring-1 ring-black/5"
      >
        {/* ===== Header wave ===== */}
        <svg
          className="absolute left-0 top-0 z-0 h-[27%] w-full"
          viewBox="0 0 400 210"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 H400 V95 C330,170 270,60 195,100 C120,140 70,45 0,100 Z"
            fill={theme.light}
          />
          <path
            d="M0,0 H400 V70 C320,155 255,45 185,85 C110,125 55,25 0,75 Z"
            fill={theme.dark}
          />
        </svg>

        {/* Lanyard slot */}
        <div className="absolute left-1/2 top-[14px] z-10 h-[18px] w-[92px] -translate-x-1/2 rounded-full bg-white" />

        {/* ===== Footer wave ===== */}
        <svg
          className="absolute bottom-0 left-0 z-0 h-[16%] w-full"
          viewBox="0 0 400 110"
          preserveAspectRatio="none"
        >
          <path
            d="M0,110 V55 C90,15 140,80 230,42 C300,12 350,58 400,32 V110 Z"
            fill={theme.dark}
          />
          <path
            d="M0,110 V78 C100,40 150,98 240,60 C310,32 360,75 400,50 V110 Z"
            fill={theme.light}
          />
          <path
            d="M0,66 C100,28 150,88 240,50 C310,22 360,68 400,44"
            stroke="#d9a441"
            strokeWidth="4"
            fill="none"
          />
        </svg>

        {/* ===== Content ===== */}
        <div className="relative z-10 flex h-full flex-col items-center px-5 pb-6 pt-[74px] text-center">
          <h3
            className="min-h-[3.2em] break-words text-[19px] font-extrabold leading-tight"
            style={{ color: theme.text }}
          >
            {nama}
          </h3>

          <div className="mt-4 flex flex-1 items-center justify-center">
            <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Code ${nama}`}
                  className="h-32 w-32 object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="h-32 w-32 animate-pulse rounded bg-gray-100" />
              )}
            </div>
          </div>

          <div
            className="mb-6 w-full rounded-2xl px-4 py-2.5"
            style={{ backgroundColor: theme.pillBg }}
          >
            <p
              className="text-[9px] font-semibold tracking-[0.25em]"
              style={{ color: theme.text }}
            >
              {eventLabel}
            </p>
            <p className="mt-0.5 text-base font-extrabold tracking-wide" style={{ color: theme.text }}>
              {participantCode}
            </p>
          </div>
        </div>
      </div>
    )
  }
)

IdCard.displayName = 'IdCard'

export default IdCard