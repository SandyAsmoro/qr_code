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
 * Tema warna berdasarkan daerah peserta.
 */
const DAERAH_THEMES: Record<string, CardTheme> = {
  'Kediri Barat': {
    dark: '#8A1C1C',
    light: '#EF5350',
    pillBg: '#FBE4E4',
    text: '#8A1C1C',
  },

  'Kediri Kota': {
    dark: '#0C3A86',
    light: '#3FA9F5',
    pillBg: '#E3F1FD',
    text: '#0C3A86',
  },

  'Kediri Selatan 1': {
    dark: '#146C2E',
    light: '#4ADE80',
    pillBg: '#E2F6E9',
    text: '#146C2E',
  },
}

const DEFAULT_THEME: CardTheme = DAERAH_THEMES['Kediri Kota']

const getTheme = (daerah?: string): CardTheme =>
  (daerah && DAERAH_THEMES[daerah]) || DEFAULT_THEME

const IdCard = forwardRef<HTMLDivElement, IdCardProps>(
  (
    {
      nama,
      participantCode,
      qrCodeUrl,
      daerah,
      eventLabel = 'ID PESERTA',
    },
    ref
  ) => {
    const theme = getTheme(daerah)

    return (
      <div
        ref={ref}
        className="
          relative mx-auto
          aspect-[82/105]
          w-full max-w-[320px]
          overflow-hidden
          rounded-[20px]
          bg-white
          shadow-xl
          ring-1 ring-black/10
        "
        style={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* =====================================================
            HEADER
        ====================================================== */}
        <svg
          className="absolute left-0 top-0 z-0 h-[21%] w-full"
          viewBox="0 0 400 165"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Light wave */}
          <path
            d="
              M0,0
              H400
              V92
              C340,138 282,72 218,91
              C150,112 95,46 0,94
              Z
            "
            fill={theme.light}
          />

          {/* Dark wave */}
          <path
            d="
              M0,0
              H400
              V68
              C330,118 275,54 210,75
              C140,98 88,28 0,72
              Z
            "
            fill={theme.dark}
          />
        </svg>

        {/* Lanyard slot */}
        {/* <div
          className="
            absolute
            left-1/2
            top-[14px]
            z-20
            h-[17px]
            w-[82px]
            -translate-x-1/2
            rounded-full
            bg-white
            shadow-[0_1px_3px_rgba(0,0,0,0.08)]
          "
        /> */}

        {/* =====================================================
            FOOTER WAVE
        ====================================================== */}
        <svg
          className="absolute bottom-0 left-0 z-0 h-[13%] w-full"
          viewBox="0 0 400 105"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Dark base */}
          <path
            d="
              M0,105
              V57
              C90,28 145,73 225,48
              C300,24 350,61 400,39
              V105
              Z
            "
            fill={theme.dark}
          />

          {/* Gold accent */}
          <path
            d="
              M0,66
              C92,39 148,80 230,55
              C300,34 352,70 400,47
            "
            stroke="#D9A441"
            strokeWidth="4"
            fill="none"
          />

          {/* Light footer */}
          <path
            d="
              M0,105
              V79
              C98,53 151,91 238,67
              C310,47 360,78 400,56
              V105
              Z
            "
            fill={theme.light}
          />
        </svg>

        {/* =====================================================
            CONTENT
        ====================================================== */}
        <div
          className="
            relative
            z-10
            flex
            h-full
            flex-col
            items-center
            px-[18px]
            pt-[78px]
            pb-[52px]
            text-center
          "
        >
          {/* Nama */}
          <div className="flex min-h-[46px] w-full items-center justify-center">
            <h3
              className="
                max-w-[92%]
                break-words
                text-[42px]
                capitalize
                font-extrabold
                leading-[1.12]
                tracking-[-0.02em]
              "
              style={{
                color: theme.text,
              }}
            >
              {nama}
            </h3>
          </div>

          {/* QR CODE */}
          <div className="mt-[15px]">
            <div
              className="
                rounded-[18px]
                border
                border-gray-200
                bg-white
                p-[9px]
                shadow-[0_4px_14px_rgba(0,0,0,0.08)]
              "
            >
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Code ${nama}`}
                  className="
                    block
                    h-[136px]
                    w-[136px]
                    object-contain
                  "
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  className="
                    h-[136px]
                    w-[136px]
                    animate-pulse
                    rounded-lg
                    bg-gray-100
                  "
                />
              )}
            </div>
          </div>

          {/* ID PESERTA */}
          <div
            className="
              mt-[15px]
              w-full
              rounded-[17px]
              px-[14px]
              py-[9px]
            "
            style={{
              backgroundColor: theme.pillBg,
            }}
          >
            <p
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-[0.28em]
              "
              style={{
                color: theme.text,
              }}
            >
              {eventLabel}
            </p>

            <p
              className="
                mt-[2px]
                text-[18px]
                font-black
                leading-none
                tracking-[0.04em]
              "
              style={{
                color: theme.text,
              }}
            >
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