import { ReactNode } from "react"
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { LogOut, User, LayoutDashboard, History, Trophy } from 'lucide-react'
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
                        <Link to="/" className="flex items-center gap-2 group">
                            <img src="/magotto-logo.png" alt="MAGOTTO" className="h-10 w-10 rounded-lg" />
                            <div className="text-xl font-black italic tracking-tighter text-white group-hover:text-primary transition-colors">
                                MAGOTTO
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <nav className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        <NavLink
                            to="/"
                            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-primary text-white shadow-neon' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutDashboard size={14} /> Dashboard
                        </NavLink>
                        <NavLink
                            to="/predictions"
                            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-primary text-white shadow-neon' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <History size={14} /> Predictions
                        </NavLink>
                        <NavLink
                            to="/leaderboard"
                            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-primary text-white shadow-neon' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Trophy size={14} /> Leaderboard
                        </NavLink>
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Logged as</span>
                            <span className="text-xs font-medium text-slate-200">{user?.email}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link to="/profile">
                                <Button variant="outline" className="h-9 w-9 p-0 rounded-full border-white/10 hover:bg-white/5">
                                    <User size={16} className="text-slate-300" />
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                className="h-9 px-3 text-[10px] font-bold uppercase tracking-widest border-white/10 hover:bg-white/5 text-rose-400"
                                onClick={() => signOut()}
                            >
                                <LogOut className="mr-2 h-3.5 w-3.5" /> Log Out
                            </Button>
                        </div>
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

            <footer className="py-12 border-t border-white/5 mt-auto">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/magotto-logo.png" alt="MAGOTTO" className="h-8 w-8 rounded opacity-50" />
                        <div className="text-lg font-black italic tracking-tighter text-slate-400">
                            MAGOTTO
                        </div>
                    </div>

                    <nav className="flex gap-8">
                        <Link to="/about" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">About</Link>
                        <Link to="/privacy" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Privacy</Link>
                        <Link to="/terms" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Terms</Link>
                        <Link to="/contact" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Contact</Link>
                    </nav>

                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">&copy; 2026 MAGOTTO. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
