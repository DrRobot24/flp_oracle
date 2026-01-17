import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { syncAllLeagues, getSyncStats, LEAGUES, SyncResult } from '@/lib/dataSync'

interface MatchRow {
    Date: string
    HomeTeam: string
    AwayTeam: string
    FTHG: string // Full Time Home Goals
    FTAG: string // Full Time Away Goals
    // Add other fields if needed from specific CSV format
}

export function DataUploader() {
    const { isAdmin } = useAuth()
    const [uploading, setUploading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [syncProgress, setSyncProgress] = useState('')
    const [syncResults, setSyncResults] = useState<SyncResult[]>([])
    const [dbStats, setDbStats] = useState<{ league: string; count: number; latestDate: string }[]>([])
    const [stats, setStats] = useState({ total: 0, imported: 0 })
    const [preview, setPreview] = useState<MatchRow[]>([])
    const [config, setConfig] = useState({ season: '2025-2026', league: 'PL' })

    // Load DB stats on mount
    useEffect(() => {
        if (isAdmin) {
            getSyncStats().then(setDbStats)
        }
    }, [isAdmin])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as MatchRow[]
                setPreview(rows.slice(0, 5)) // Show first 5
                setStats({ ...stats, total: rows.length })
            }
        })
    }

    const handleUpload = async () => {
        const fileInput = document.getElementById('csv-file') as HTMLInputElement
        const file = fileInput?.files?.[0]
        if (!file) return

        setUploading(true)

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as any[]
                let count = 0

                // Batch insert could be optimized, but taking simple approach first
                const formattedData = rows.map(row => ({
                    date: convertDate(row.Date),
                    home_team: row.HomeTeam,
                    away_team: row.AwayTeam,
                    home_goals: parseInt(row.FTHG),
                    away_goals: parseInt(row.FTAG),
                    season: config.season,
                    league: config.league
                })).filter(r => r.home_team && r.away_team && !isNaN(r.home_goals))

                const { error } = await supabase
                    .from('matches')
                    .insert(formattedData)

                if (error) {
                    console.error("Upload error", error)
                    alert("Error uploading: " + error.message)
                } else {
                    count = formattedData.length
                    alert(`Successfully imported ${count} matches!`)
                }

                setStats({ total: rows.length, imported: count })
                setUploading(false)
            }
        })
    }

    // Helper to handle standard football-data.co.uk date format (DD/MM/YYYY)
    const convertDate = (dateStr: string) => {
        if (!dateStr) return null;
        // If already YYYY-MM-DD
        if (dateStr.includes('-')) return dateStr;

        // If DD/MM/YYYY
        const parts = dateStr.split('/')
        if (parts.length === 3) {
            // return YYYY-MM-DD
            return `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        return dateStr
    }

    if (!isAdmin) return null // Hidden for normal users

    return (
        <Card className="glass-panel border-0">
            <CardHeader className="text-white font-black border-b border-white/5 py-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    ADMIN ZONE: DATA INGESTION
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* CONFIG CONTROLS */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest">Season</label>
                        <input
                            className="glass-input w-full px-3 py-2"
                            value={config.season}
                            onChange={e => setConfig({ ...config, season: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest">League Code</label>
                        <input
                            className="glass-input w-full px-3 py-2"
                            value={config.league}
                            onChange={e => setConfig({ ...config, league: e.target.value })}
                        />
                    </div>
                </div>

                <div className="border-2 border-dashed border-white/10 p-8 text-center bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-300">
                    <input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-lg file:border-0
                            file:text-xs file:font-bold file:uppercase file:tracking-widest
                            file:bg-accent/80 file:text-white
                            hover:file:bg-accent transition-all"
                    />
                </div>

                {preview.length > 0 && (
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl text-[10px] font-mono overflow-x-auto">
                        <p className="font-bold text-slate-300 mb-2 uppercase tracking-tight">Preview ({stats.total} rows detected)</p>
                        <table className="w-full text-left text-slate-400">
                            <thead className="text-slate-500">
                                <tr>
                                    <th>Date</th>
                                    <th>Home</th>
                                    <th>Away</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i} className="border-b border-gray-300">
                                        <td>{row.Date}</td>
                                        <td>{row.HomeTeam}</td>
                                        <td>{row.AwayTeam}</td>
                                        <td>{row.FTHG}-{row.FTAG}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Button
                    onClick={handleUpload}
                    disabled={uploading || stats.total === 0}
                    variant="primary"
                    className="w-full"
                >
                    {uploading ? "Importing Data..." : "📚 Upload Historical Data"}
                </Button>

                {/* SYNC FROM SOURCE SECTION */}
                <div className="border-t-2 border-brutal-border pt-4 mt-4">
                    <h3 className="font-bold uppercase text-xs tracking-widest mb-3">⚡ Auto-Sync from football-data.co.uk</h3>

                    {/* Current DB Stats */}
                    {dbStats.length > 0 && (
                        <div className="bg-black/20 border border-white/5 p-4 rounded-xl mb-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">📊 Database Overview</p>
                            {/* Sync Status Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                {[
                                    { id: 'SA', name: 'Serie A', flag: 'it' },
                                    { id: 'PL', name: 'Premier League', flag: 'gb' },
                                    { id: 'LL', name: 'La Liga', flag: 'es' },
                                    { id: 'BL', name: 'Bundesliga', flag: 'de' },
                                    { id: 'L1', name: 'Ligue 1', flag: 'fr' }
                                ].map(lg => {
                                    const lgStats = dbStats.find(s => s.league === lg.id)
                                    return (
                                        <div key={lg.id} className="glass-panel border-white/5 p-3 rounded-lg flex items-center justify-between group hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-4 overflow-hidden rounded-sm shadow-sm grayscale group-hover:grayscale-0 transition-all border border-white/10">
                                                    <img
                                                        src={`https://flagcdn.com/${lg.flag}.svg`}
                                                        alt={lg.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-tighter">
                                                        {lg.id}
                                                    </div>
                                                    <div className="text-[8px] text-slate-500 uppercase tracking-widest leading-none">
                                                        {lgStats ? `Latest: ${lgStats.latestDate}` : 'No data'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                                                {lgStats?.count || 0}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sync Progress */}
                    {syncProgress && (
                        <div className="bg-blue-50 border border-blue-200 p-3 mb-3 text-sm">
                            🔄 {syncProgress}
                        </div>
                    )}

                    {/* Sync Results */}
                    {syncResults.length > 0 && (
                        <div className="bg-slate-100 p-3 mb-3 text-xs">
                            <p className="font-bold mb-2">Sync Results:</p>
                            {syncResults.map(r => (
                                <div key={r.league} className={`p-1 ${r.success ? 'text-green-700' : 'text-red-600'}`}>
                                    {r.success ? '✅' : '❌'} {r.league}: {r.matchesImported} matches
                                    {r.error && <span className="text-red-500"> - {r.error}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    <Button
                        onClick={async () => {
                            setSyncing(true)
                            setSyncProgress('Starting sync...')
                            setSyncResults([])

                            const results = await syncAllLeagues((msg) => setSyncProgress(msg))

                            setSyncResults(results)
                            setSyncProgress('')
                            setSyncing(false)

                            // Refresh stats
                            const newStats = await getSyncStats()
                            setDbStats(newStats)
                        }}
                        disabled={syncing}
                        variant="outline"
                        className="w-full border-2 border-accent text-accent hover:bg-accent hover:text-white"
                    >
                        {syncing ? "🔄 Syncing..." : "🌐 Sync All 5 Leagues (2025-2026)"}
                    </Button>

                    <p className="text-xs text-gray-500 mt-2">
                        Leagues: {LEAGUES.map(l => l.name).join(', ')}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
