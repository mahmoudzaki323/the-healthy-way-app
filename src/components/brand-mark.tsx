import { Leaf } from "lucide-react"

import { cn } from "@/lib/utils"

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Leaf className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="brand-serif text-xl font-semibold text-primary">
            The Healthy Way
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Wellness Coaching
          </p>
        </div>
      )}
    </div>
  )
}

export function FoodAccent({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "food-band relative overflow-hidden border-b",
        "before:absolute before:left-10 before:top-4 before:size-20 before:rounded-full before:bg-amber-300/30",
        "after:absolute after:right-16 after:top-5 after:size-16 after:rounded-full after:bg-blue-900/10",
        className
      )}
      aria-hidden="true"
    />
  )
}
