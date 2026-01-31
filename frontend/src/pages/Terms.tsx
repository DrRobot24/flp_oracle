import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Scale, Users, AlertOctagon, Gavel } from 'lucide-react'

export function Terms() {
    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                        Terms <span className="text-primary">&</span> Conditions
                    </h1>
                    <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">
                        Last Updated: January 2026
                    </p>
                </div>

                <div className="space-y-6">
                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5">
                            <Scale size={20} className="text-primary" />
                            <h3 className="text-lg font-bold text-white">1. Acceptance of Terms</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                By accessing or using the MAGOTTO platform, you agree to be bound by these Terms and Conditions
                                and all applicable laws and regulations. If you do not agree with any of these terms,
                                you are prohibited from using or accessing this site.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5">
                            <Users size={20} className="text-secondary" />
                            <h3 className="text-lg font-bold text-white">2. User Conduct</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                You agree to use the service only for lawful purposes. You are prohibited from posting or transmitting
                                to or from this site any unlawful, threatening, libelous, defamatory, obscene, pornographic, or other
                                material that would violate any law.
                                <br /><br />
                                Accounts found to be engaging in abusive behavior or spam will be suspended immediately.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5">
                            <AlertOctagon size={20} className="text-accent" />
                            <h3 className="text-lg font-bold text-white">3. Disclaimer</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                The materials on MAGOTTO are provided "as is". MAGOTTO makes no warranties, expressed or implied,
                                and hereby disclaims and negates all other warranties, including without limitation, implied warranties
                                or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual
                                property or other violation of rights.
                                <br /><br />
                                <strong>Betting Warning:</strong> The predictions provided are for informational purposes only. We are not responsible
                                for any financial losses incurred through betting activities. Please gamble responsibly.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5">
                            <Gavel size={20} className="text-emerald-400" />
                            <h3 className="text-lg font-bold text-white">4. Governing Law</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                These terms and conditions are governed by and construed in accordance with the laws of Italy
                                and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-slate-500 text-xs">
                        If you have any questions about these Terms, please contact us at:
                        <span className="text-slate-300 ml-1">support@magotto.app</span>
                    </p>
                </div>
            </div>
        </MainLayout>
    )
}
