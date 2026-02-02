import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database, Calendar } from 'lucide-react'

interface DataSourceStats {
    total: number
    yearSpan: { first: number; last: number }
}

export function DataSourceInfo() {
    const [stats, setStats] = useState<DataSourceStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        try {
            // Use Supabase count for instant stats (no data transfer)
            const { count, error } = await supabase
                .from('matches')
                .select('*', { count: 'exact', head: true })

            if (error) {
                console.error('Error fetching count:', error)
                setLoading(false)
                return
            }

            setStats({
                total: count || 0,
                yearSpan: { first: 2003, last: 2026 }
            })
        } catch (err) {
            console.error('Error loading stats:', err)
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/30 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-700 rounded"></div>
                    <div className="h-6 bg-slate-700 rounded w-24"></div>
                </div>
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/30 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Database className="text-primary" size={24} />
                    <div>
                        <div className="text-2xl font-black text-white">{stats.total.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">partite analizzate</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="text-green-400" size={24} />
                    <div>
                        <div className="text-2xl font-black text-white">{stats.yearSpan.last - stats.yearSpan.first + 1}</div>
                        <div className="text-xs text-slate-400">anni di dati</div>
                    </div>
                </div>
                <div className="text-xs text-slate-500">
                    Fonte: <a href="https://www.football-data.co.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">football-data.co.uk</a>
                </div>
            </div>
        </div>
    )
}
