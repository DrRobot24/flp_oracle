import { MainLayout } from "@/components/layout/MainLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, MapPin, Send } from 'lucide-react'
import { Button } from "@/components/ui/button"

export function Contact() {
    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                        Contact <span className="text-primary">Us</span>
                    </h1>
                    <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">
                        We'd love to hear from you
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Information Column */}
                    <div className="space-y-6">
                        <Card className="glass-panel border-0 h-full">
                            <CardContent className="p-8 space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">
                                        Get in Touch
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        Have a question about our predictions? Want to report a bug?
                                        Or just want to say hello? Fill out the form or reach direct via email.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                            <Mail size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">Email</h4>
                                            <p className="text-slate-400 text-sm">support@magotto.app</p>
                                            <p className="text-slate-400 text-sm">info@magotto.app</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-secondary/10 rounded-lg text-secondary">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">Headquarters</h4>
                                            <p className="text-slate-400 text-sm">MAGOTTO HQ</p>
                                            <p className="text-slate-400 text-sm">Milan, Italy</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Form Column */}
                    <div>
                        <Card className="glass-panel border-0">
                            <CardContent className="p-8">
                                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Name</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors"
                                            placeholder="Your name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Email</label>
                                        <input
                                            type="email"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors"
                                            placeholder="your@email.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Message</label>
                                        <textarea
                                            rows={5}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors resize-none"
                                            placeholder="How can we help?"
                                        ></textarea>
                                    </div>

                                    <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6">
                                        <Send className="mr-2 h-4 w-4" /> Send Message
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
