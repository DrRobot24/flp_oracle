import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { NewsItem, getMatchNews } from '../lib/news'

interface NewsPanelProps {
    homeTeam: string
    awayTeam: string
}

export function NewsPanel({ homeTeam, awayTeam }: NewsPanelProps) {
    const [news, setNews] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        async function loadNews() {
            if (!homeTeam && !awayTeam) {
                setNews([])
                return
            }

            setLoading(true)
            try {
                const items = await getMatchNews(homeTeam, awayTeam, 8)
                setNews(items)
            } catch (err) {
                console.error('Failed to load news:', err)
            }
            setLoading(false)
        }

        loadNews()
    }, [homeTeam, awayTeam])

    if (!homeTeam && !awayTeam) {
        return null
    }

    return (
        <Card className="mt-6">
            <CardHeader className="flex flex-row items-center gap-2">
                <span className="text-xl">📰</span>
                <span>Latest News</span>
                {loading && <span className="text-sm text-gray-400 ml-auto">Loading...</span>}
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto space-y-3">
                {news.length === 0 && !loading && (
                    <p className="text-gray-500 text-sm italic">
                        No relevant news found. Try selecting different teams.
                    </p>
                )}

                {news.map((item, idx) => (
                    <a
                        key={idx}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 hover:bg-gray-100 border-l-4 border-primary transition-colors"
                    >
                        <div className="font-medium text-sm line-clamp-2">{item.title}</div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{item.source}</span>
                            <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                        </div>
                    </a>
                ))}
            </CardContent>
        </Card>
    )
}
