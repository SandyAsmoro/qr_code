import { Loader2 } from 'lucide-react'

export default function Spinner({ label = 'Memuat...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}