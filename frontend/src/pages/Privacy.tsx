import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react'

export function Privacy() {
    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                        Privacy <span className="text-primary">&</span> Cookie Policy
                    </h1>
                    <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">
                        Last Updated: January 2026
                    </p>
                </div>

                <div className="space-y-6">
                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5">
                            <Lock size={20} className="text-primary" />
                            <h3 className="text-lg font-bold text-white">1. Information We Collect</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                We collect information that you provide directly to us, such as when you create an account,
                                save a prediction, or communicate with us. This may include your email address,
                                username, and preferences. We also automatically collect certain technical information
                                when you visit our site, including your IP address and browser type.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5">
                            <Eye size={20} className="text-secondary" />
                            <h3 className="text-lg font-bold text-white">2. Use of Information</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                We use the information we collect to:
                                <br /><br />
                                • Provide, maintain, and improve our services.
                                <br />
                                • Personalize your experience and save your forecasting history.
                                <br />
                                • Communicate with you about technical updates or security alerts.
                                <br />
                                • Analyze site usage and optimize our Oracle Engine.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5">
                            <FileText size={20} className="text-accent" />
                            <h3 className="text-lg font-bold text-white">3. Cookies and Tracking</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                We use cookies and similar tracking technologies to track activity on our service and
                                hold certain information. This helps us provide a seamless login experience and
                                understand which parts of our site are most useful to you.
                                <br /><br />
                                <strong>Google AdSense:</strong> We use Google AdSense to serve advertisements.
                                Google may use cookies to serve ads based on a user's prior visits to our website
                                or other websites. You may opt out of personalized advertising by visiting
                                <a href="https://www.google.com/settings/ads" target="_blank" className="text-primary hover:underline ml-1">Ads Settings</a>.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5">
                            <ShieldCheck size={20} className="text-emerald-400" />
                            <h3 className="text-lg font-bold text-white">4. Data Security</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                The security of your data is important to us, but remember that no method of
                                transmission over the Internet is 100% secure. While we strive to use
                                commercially acceptable means to protect your personal information,
                                we cannot guarantee its absolute security.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-slate-500 text-xs">
                        If you have any questions about this Privacy Policy, please contact us at:
                        <span className="text-slate-300 ml-1">support@flp-oracle.com</span>
                    </p>
                </div>
            </div>
        </MainLayout>
    )
}
