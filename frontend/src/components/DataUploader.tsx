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
        <Card className="border-accent">
            <CardHeader className="text-accent border-accent">Admin Zone: Data Ingestion</CardHeader>
            <CardContent className="space-y-4">
                {/* CONFIG CONTROLS */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase opacity-50 mb-1">Season</label>
                        <input
                            className="w-full border-2 border-slate-200 px-2 py-1 text-xs"
                            value={config.season}
                            onChange={e => setConfig({ ...config, season: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase opacity-50 mb-1">League Code</label>
                        <input
                            className="w-full border-2 border-slate-200 px-2 py-1 text-xs"
                            value={config.league}
                            onChange={e => setConfig({ ...config, league: e.target.value })}
                        />
                    </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 p-8 text-center bg-gray-50 rounded-lg">
                    <input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:border-0
                            file:text-sm file:font-semibold
                            file:bg-accent file:text-white
                            hover:file:bg-accent/90"
                    />
                </div>

                {preview.length > 0 && (
                    <div className="bg-slate-100 p-4 text-xs font-mono overflow-x-auto">
                        <p className="font-bold mb-2">Preview ({stats.total} rows detected)</p>
                        <table className="w-full text-left">
                            <thead>
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
                        <div className="bg-slate-100 p-3 mb-3 text-xs">
                            <p className="font-bold mb-2">📊 Current Data in DB:</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {dbStats.map(s => (
                                    <div key={s.league} className="bg-white p-2 border border-gray-200">
                                        <span className="font-bold">{s.league}</span>: {s.count} matches
                                        <br />
                                        <span className="text-gray-500">Latest: {s.latestDate}</span>
                                    </div>
                                ))}
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
