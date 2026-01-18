import { useEffect } from "react"
import { cn } from "@/lib/utils"

interface AdSpaceProps {
    type: 'leaderboard' | 'skyscraper' | 'rectangle'
    className?: string
    // Google AdSense Props
    adClient?: string // e.g., "ca-pub-XXXXXXXXXXXXXXXX"
    adSlot?: string   // e.g., "1234567890"
    testMode?: boolean // Force placeholder even if IDs are present
}

export function AdSpace({ type, className, adClient = "ca-pub-2061271910544675", adSlot, testMode = false }: AdSpaceProps) {
    const sizeMap = {
        leaderboard: { w: '728px', h: '90px', label: 'Leaderboard (728x90)' },
        skyscraper: { w: '300px', h: '600px', label: 'Skyscraper (300x600)' },
        rectangle: { w: '300px', h: '250px', label: 'Medium Rectangle (300x250)' },
    }

    const { w, h, label } = sizeMap[type]

    // Initialize Ads if we have credentials
    useEffect(() => {
        if (adClient && adSlot && !testMode) {
            try {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (err) {
                console.error('AdSense error:', err);
            }
        }
    }, [adClient, adSlot, testMode]);

    const showRealAd = adClient && adSlot && !testMode;

    return (
        <div
            className={cn(
                "relative flex items-center justify-center overflow-hidden rounded-lg transition-all",
                // Only add placeholder styles if NOT showing a real ad
                !showRealAd && "border-2 border-dashed border-white/10 bg-black/20 backdrop-blur-sm hover:bg-black/30",
                className
            )}
            style={{
                width: '100%',
                maxWidth: type === 'leaderboard' ? '100%' : w,
                height: h,
                minHeight: h
            }}
        >
            {showRealAd ? (
                // --- REAL GOOGLE OR AFFILIATE AD ---
                <div className="w-full h-full flex justify-center items-center bg-white/5">
                    {/* Replace this comment with your Affiliate Image/Link if not using AdSense */}

                    <ins className="adsbygoogle"
                        style={{ display: 'block', width: '100%', height: '100%' }}
                        data-ad-client={adClient}
                        data-ad-slot={adSlot}
                        data-ad-format="auto"
                        data-full-width-responsive="true"
                    />
                </div>
            ) : (
                // --- PLACEHOLDER (What you see now) ---
                <>
                    <div className="flex flex-col items-center gap-2 text-white/20">
                        <span className="text-xs uppercase font-bold tracking-widest">Ad Space</span>
                        <span className="text-[10px] font-mono">{label}</span>
                    </div>

                    <div className="absolute top-0 left-0 h-2 w-2 border-t border-l border-white/20" />
                    <div className="absolute top-0 right-0 h-2 w-2 border-t border-r border-white/20" />
                    <div className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-white/20" />
                    <div className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-white/20" />
                </>
            )}
        </div>
    )
}
