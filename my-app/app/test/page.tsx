'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [statuses, setStatuses] = useState({
    supabase: 'Testing...',
    googleDrive: 'N/A',
  })

  useEffect(() => {
    const test = async () => {
      try {
        // Test Supabase
        const { data, error } = await supabase
          .from('participants')
          .select('count', { count: 'exact', head: true })

        if (error) throw error

        setStatuses(prev => ({
          ...prev,
          supabase: '✅ Supabase Connected!',
        }))
      } catch (error) {
        setStatuses(prev => ({
          ...prev,
          supabase: `❌ ${error}`,
        }))
      }
    }

    test()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6">🔧 System Status</h1>
        <div className="space-y-4 text-left">
          <div className="p-4 bg-gray-50 rounded">
            <p className="font-bold">Database (Supabase):</p>
            <p className="text-green-600 text-lg">{statuses.supabase}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <p className="font-bold">Storage (Google Drive):</p>
            <p className="text-blue-600 text-lg">
              Setup lewat .env.local
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}