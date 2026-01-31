import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already accepted cookies
        const consent = localStorage.getItem('cookie-consent')
        if (!consent) {
            setIsVisible(true)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted')
        setIsVisible(false)
    }

    const handleDecline = () => {
        // Technically strict GDPR requires blocking cookies here, 
        // for now we just save the preference.
        localStorage.setItem('cookie-consent', 'declined')
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
            <div className="max-w-6xl mx-auto glass-panel border border-white/10 rounded-xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl bg-black/80">
                <div className="space-y-2 text-center md:text-left">
                    <h4 className="text-white font-bold text-lg">We use cookies 🍪</h4>
                    <p className="text-slate-400 text-sm max-w-2xl">
                        We use cookies to improve your experience and deliver personalized content.
                        By using our services, you agree to our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and
                        <a href="/terms" className="text-primary hover:underline ml-1">Terms of Service</a>.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={handleDecline}>
                        Decline
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 text-white min-w-[120px]" onClick={handleAccept}>
                        Accept All
                    </Button>
                </div>
            </div>
        </div>
    )
}
