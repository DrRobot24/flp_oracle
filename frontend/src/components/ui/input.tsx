import { cn } from "@/lib/utils"
import React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && <label className="block mb-2 font-bold uppercase text-xs tracking-widest">{label}</label>}
                <input
                    type={type}
                    className={cn(
                        "flex w-full border-2 border-brutal-border bg-white px-3 py-2 text-sm placeholder:text-gray-500",
                        "focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
            </div>
        )
    }
)
Input.displayName = "Input"
