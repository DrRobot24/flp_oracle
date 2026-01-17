import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Trophy, Users, Zap } from 'lucide-react'

export function Leaderboard() {
    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter uppercase">Leaderboard</h1>
                    <p className="text-slate-400 text-sm">Global competition and performance ranking.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-8">
                        <Card className="glass-panel border-0">
                            <CardHeader className="border-b border-white/5 py-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-yellow-400" /> Global Standings
                                    </h3>
                                    <span className="text-[10px] text-slate-500 font-mono">Top Oracle Agents</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5">
                                    {[1, 2, 3].map((rank) => (
                                        <div key={rank} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${rank === 1 ? 'bg-yellow-400 text-black' :
                                                    rank === 2 ? 'bg-slate-300 text-black' :
                                                        'bg-amber-600 text-white'
                                                }`}>
                                                {rank}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-white font-bold">User_{rank * 432}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Season 2025/26</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-primary font-black text-lg">+{(150 - rank * 10).toFixed(2)}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Pts</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-20 text-center text-slate-500 text-sm italic">
                                        More rankings will load as users join the competition.
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-4 space-y-6">
                        <Card className="glass-panel border-0">
                            <CardHeader className="pb-2">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" /> Stats
                                </h3>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="text-xs text-slate-400 uppercase">Total Users</span>
                                    <span className="text-white font-bold">1,240</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="text-xs text-slate-400 uppercase">Active Predictions</span>
                                    <span className="text-white font-bold">8,542</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-primary/20 to-accent/20 border-primary/20">
                            <CardContent className="pt-6">
                                <div className="text-center space-y-3">
                                    <Zap className="h-8 w-8 text-primary mx-auto animate-pulse" />
                                    <h4 className="text-white font-black uppercase text-sm italic">Unlock Pro Stats</h4>
                                    <p className="text-xs text-slate-300">Compare your model's variance with the top 1% of oracles.</p>
                                    <button className="w-full bg-primary hover:bg-primary/80 text-white text-[10px] font-black py-2 rounded uppercase tracking-widest transition-all">
                                        Upgrade to Pro
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
