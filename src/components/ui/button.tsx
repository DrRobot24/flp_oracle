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
                    "inline-flex items-center justify-center border-2 border-brutal-border px-6 py-3 font-bold uppercase tracking-widest transition-all",
                    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                    "disabled:opacity-50 disabled:pointer-events-none",

                    /* Variants */
                    variant === "primary" && "bg-primary text-white shadow-brutal hover:bg-blue-700 hover:shadow-glow",
                    variant === "secondary" && "bg-secondary text-white shadow-brutal hover:bg-emerald-700",
                    variant === "outline" && "bg-white text-foreground shadow-brutal hover:bg-slate-100",

                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"
