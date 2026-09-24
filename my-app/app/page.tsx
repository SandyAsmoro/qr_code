'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('any_table')
          .select('count', { count: 'exact', head: true })
        
        if (error) throw error
        setStatus('✅ Koneksi Supabase berhasil!')
      } catch (error) {
        setStatus(`❌ Error: ${error}`)
      }
    }

    testConnection()
  }, [])

  return (
    <main className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">{status}</h1>
    </main>
  )
}