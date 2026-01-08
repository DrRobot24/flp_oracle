import { useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

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
    const [stats, setStats] = useState({ total: 0, imported: 0 })
    const [preview, setPreview] = useState<MatchRow[]>([])

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
                    date: convertDate(row.Date), // Helper needed for DD/MM/YY vs YYYY-MM-DD
                    home_team: row.HomeTeam,
                    away_team: row.AwayTeam,
                    home_goals: parseInt(row.FTHG),
                    away_goals: parseInt(row.FTAG),
                    season: '2024-2025', // Hardcoded for this beta
                    league: 'PL'         // Hardcoded
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
            </CardContent>
        </Card>
    )
}
