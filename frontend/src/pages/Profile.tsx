import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { User, Settings, Shield, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export function Profile() {
    const { user, signOut, isAdmin } = useAuth()

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter uppercase">My Profile</h1>
                    <p className="text-slate-400 text-sm">Manage your account and preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* USER INFO */}
                    <Card className="md:col-span-5 glass-panel border-0">
                        <CardHeader className="border-b border-white/5 text-center pb-6">
                            <div className="w-24 h-24 bg-gradient-to-tr from-primary to-accent rounded-full mx-auto mb-4 flex items-center justify-center text-white shadow-neon">
                                <User size={48} />
                            </div>
                            <h2 className="text-xl font-black text-white truncate">{user?.email}</h2>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                {isAdmin && (
                                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30 font-bold uppercase">
                                        Administrator
                                    </span>
                                )}
                                <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded border border-white/10 font-bold uppercase">
                                    Silver Tier
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <Button
                                variant="outline"
                                className="w-full border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                                onClick={() => signOut()}
                            >
                                <LogOut className="mr-2 h-4 w-4" /> Log Out
                            </Button>
                        </CardContent>
                    </Card>

                    {/* SETTINGS */}
                    <Card className="md:col-span-7 glass-panel border-0">
                        <CardHeader className="border-b border-white/5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Settings className="h-4 w-4 text-slate-400" /> Account Settings
                            </h3>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Notifications</label>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-sm text-white">Daily Oracle Digest</span>
                                    <div className="w-10 h-5 bg-primary/40 rounded-full relative">
                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Security</label>
                                <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Shield className="h-4 w-4 text-emerald-400" />
                                        <span className="text-sm text-white">Change Password</span>
                                    </div>
                                    <span className="text-xs text-slate-500">➔</span>
                                </button>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] text-slate-500 text-center uppercase tracking-tighter">
                                    Member since January 2026 • User ID: {user?.id.substring(0, 8)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    )
}
