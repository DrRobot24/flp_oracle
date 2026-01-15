import { ReactNode } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { AdSpace } from "@/components/ads/AdSpace"

interface MainLayoutProps {
    children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    const { user, signOut } = useAuth()

    return (
        <div className="min-h-screen flex flex-col">
            {/* STICKY HEADER */}
            <header className="sticky top-0 z-50 w-full border-b border-glass-border bg-glass-gradient backdrop-blur-xl">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black tracking-tighter text-white">
                            FLP<span className="text-gradient-primary">.PRO</span>
                        </h1>
                        <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/60 border border-white/10 uppercase tracking-widest">
                            Oracle Engine
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 hidden sm:inline-block">
                            {user?.email}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => signOut()}
                            className="glass-button border-white/10 hover:bg-white/10 text-xs h-8 text-white"
                        >
                            Log Out
                        </Button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT GRID */}
            <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
                {/* Top Leaderboard Ad */}
                <div className="w-full flex justify-center mb-8">
                    <AdSpace type="leaderboard" className="w-full max-w-[728px]" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-9 space-y-8">
                        {children}
                    </div>

                    {/* Right Sidebar (Ads & Promos) - Hidden on mobile, visible on desktop */}
                    <aside className="hidden lg:col-span-3 lg:flex flex-col gap-6">
                        <div className="sticky top-24 space-y-6">
                            <AdSpace type="skyscraper" />

                            {/* Mini Promo / CTA */}
                            <div className="glass-panel p-4 text-center">
                                <h3 className="text-sm font-bold text-white mb-2">Upgrade to Premium</h3>
                                <p className="text-xs text-slate-400 mb-4">Get ad-free predictions and advanced API access.</p>
                                <button className="w-full py-2 rounded bg-gradient-to-r from-primary to-accent text-white text-xs font-bold hover:opacity-90 transition-opacity">
                                    Go Pro
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <footer className="py-8 text-center text-xs text-slate-600">
                <p>&copy; 2026 FLP Oracle. All rights reserved.</p>
            </footer>
        </div>
    )
}
