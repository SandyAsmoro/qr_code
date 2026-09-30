// lib/idCardTheme.ts
//
// Satu-satunya tempat yang menentukan background ID Card berdasarkan daerah.
// Layout kartu SAMA untuk semua daerah, hanya background yang berbeda.
//
// Aset ada di: public/id-card/

export type RegionTheme = {
  background: string
}

export const REGION_THEMES: Record<string, RegionTheme> = {
  'Kediri Selatan 1': { background: '/id-card/background-green.webp' },
  'Kediri Barat': { background: '/id-card/background-red.webp' },
  'Kediri Kota': { background: '/id-card/background-blue.webp' },
  // 'Kediri Selatan 1': { background: '/id-card/background-green.png' },
  // 'Kediri Barat': { background: '/id-card/background-red.png' },
  // 'Kediri Kota': { background: '/id-card/background-blue.png' },
}

/**
 * Dipakai jika daerah kosong / tidak dikenali (default: biru).
 */
export const DEFAULT_REGION_THEME: RegionTheme = REGION_THEMES['Kediri Kota']

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

const NORMALIZED_THEMES: Record<string, RegionTheme> = Object.fromEntries(
  Object.entries(REGION_THEMES).map(([region, theme]) => [normalize(region), theme])
)

/**
 * Mengembalikan tema untuk daerah tertentu.
 * Toleran terhadap huruf besar/kecil dan spasi berlebih,
 * dan tidak pernah melempar error.
 */
export const resolveRegionTheme = (daerah?: string | null): RegionTheme => {
  if (!daerah) return DEFAULT_REGION_THEME

  return NORMALIZED_THEMES[normalize(daerah)] ?? DEFAULT_REGION_THEME
}