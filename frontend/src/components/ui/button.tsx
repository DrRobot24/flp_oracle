import { cn } from "@/lib/utils"
import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg px-6 py-2.5 font-bold uppercase tracking-widest transition-all duration-300",
                    "active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                    "text-xs border",

                    /* Variants */
                    variant === "primary" && "bg-primary/90 text-white border-primary/20 hover:bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40",
                    variant === "secondary" && "bg-secondary/90 text-white border-secondary/20 hover:bg-secondary shadow-lg shadow-secondary/20 hover:shadow-secondary/40",
                    variant === "outline" && "bg-white/5 text-white border-white/10 hover:bg-white/10 backdrop-blur-sm",

                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"
