import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { ShieldCheck, Target, TrendingUp } from 'lucide-react'

export function About() {
    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white">
                        ABOUT <span className="text-primary">FLP ORACLE</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        The ultimate statistical engine for football forecasting, combining Poisson distribution with Fourier analysis and Geometric modeling.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Target size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Our Mission</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                FLP Oracle was born from the need to transform raw football data into actionable insights.
                                We don't believe in "luck"—we believe in trajectories, momentum, and statistical probability.
                                Our mission is to provide bettors and enthusiasts with the most advanced analytical tools
                                available on the market.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                <TrendingUp size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">The Engine</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Our "Oracle Engine" utilizes a multi-layered approach:
                                <br /><br />
                                • <strong>Poisson Distribution</strong> for goal probability.
                                <br />
                                • <strong>Fourier Transform</strong> to detect form cycles and team fatigue.
                                <br />
                                • <strong>Phase Space Modeling</strong> to visualize match dynamics as physical trajectories.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="glass-panel border-0 p-8 text-center space-y-4">
                    <div className="inline-flex p-3 rounded-full bg-white/5 border border-white/10 text-slate-300 mb-2">
                        <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Responsible Analytics</h3>
                    <p className="text-slate-400 text-sm max-w-xl mx-auto">
                        While our engine provides high-accuracy statistical models, football is inherently unpredictable.
                        FLP Oracle is an educational and analytical tool. We encourage all users to use these
                        insights responsibly and never as a guarantee of financial gain.
                    </p>
                </Card>

                <div className="text-center pt-8">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">
                        Developed by FLP Tech Lab &copy; 2026
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
