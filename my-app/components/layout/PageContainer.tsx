import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageContainerProps {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}

/**
 * Kerangka halaman standar (sama dengan dashboard):
 * bg-gray-50 + container max-w-7xl + page header.
 *
 * Header diberi `print:hidden` supaya tidak ikut tercetak,
 * sedangkan children (mis. kartu ID untuk print) tetap bisa dicetak.
 */
export default function PageContainer({
  title,
  description,
  backHref,
  backLabel = 'Kembali ke Dashboard',
  children,
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {title}
            </h1>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>

          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          )}
        </div>

        {children}
      </main>
    </div>
  )
}