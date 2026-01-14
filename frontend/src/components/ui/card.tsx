import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    variant?: "default" | "dark"
}

export function Card({ className, variant = "default", children, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "border-2 border-brutal-border p-6 shadow-brutal transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm",
                variant === "default" && "bg-surface",
                variant === "dark" && "bg-slate-900 text-white border-slate-900",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("mb-4 font-bold uppercase tracking-wider text-lg border-b-2 border-brutal-border pb-2", className)} {...props}>{children}</div>
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("", className)} {...props}>{children}</div>
}
