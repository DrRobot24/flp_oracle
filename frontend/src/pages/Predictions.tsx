import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { TrendingUp, Award, Clock } from 'lucide-react'
import { MyPredictionsScore } from '@/components/MyPredictionsScore'

export function Predictions() {
    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                        <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter uppercase">My Predictions</h1>
                        <p className="text-slate-400 text-sm">Track your accuracy and points across all leagues.</p>
                    </div>
                    <MyPredictionsScore />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="glass-panel border-0">
                        <CardHeader className="pb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="h-3 w-3 text-emerald-400" /> Win Rate
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-white">0%</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase">Based on 0 settled bets</div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="pb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Award className="h-3 w-3 text-primary" /> Total Points
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-white">0.00</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase">Net profit/loss</div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="pb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-3 w-3 text-amber-400" /> Pending
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-white">0</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase">Active predictions</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="glass-panel border-0 min-h-[400px]">
                    <CardHeader className="border-b border-white/5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">History</h3>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-20 text-slate-500 text-sm italic">
                        Your prediction history will appear here once matches are settled.
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
